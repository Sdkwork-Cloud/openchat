import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ServiceStatus = 'up' | 'down' | 'starting' | 'stopping' | 'unknown';
export type HealthCheckType = 'http' | 'tcp' | 'custom';

export interface ServiceInstance {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol?: string;
  status: ServiceStatus;
  metadata?: Record<string, any>;
  tags?: string[];
  weight?: number;
  version?: string;
  registeredAt: number;
  lastHeartbeat: number;
  healthCheck?: {
    type: HealthCheckType;
    endpoint?: string;
    interval: number;
    timeout: number;
    failures: number;
    maxFailures: number;
  };
}

export interface ServiceEndpoint {
  name: string;
  path: string;
  method: string[];
  metadata?: Record<string, any>;
}

export interface ServiceDefinition {
  name: string;
  instances: Map<string, ServiceInstance>;
  endpoints?: ServiceEndpoint[];
  metadata?: Record<string, any>;
}

export interface LoadBalancerStrategy {
  name: string;
  select(instances: ServiceInstance[]): ServiceInstance | null;
}

export interface ServiceDiscoveryOptions {
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  enableHealthCheck?: boolean;
  defaultHealthCheckInterval?: number;
  defaultMaxFailures?: number;
}

export interface ServiceDiscoveryStats {
  totalServices: number;
  totalInstances: number;
  instancesByStatus: Record<ServiceStatus, number>;
  instancesByService: Record<string, number>;
  healthyInstances: number;
  unhealthyInstances: number;
}

export interface ServiceQuery {
  name?: string;
  status?: ServiceStatus;
  tags?: string[];
  version?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ServiceDiscoveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServiceDiscoveryService.name);
  private readonly services = new Map<string, ServiceDefinition>();
  private readonly loadBalancers = new Map<string, LoadBalancerStrategy>();
  private readonly options: Required<ServiceDiscoveryOptions>;
  private heartbeatTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    this.options = {
      heartbeatInterval: 30000,
      heartbeatTimeout: 90000,
      enableHealthCheck: true,
      defaultHealthCheckInterval: 15000,
      defaultMaxFailures: 3,
    };

    this.registerDefaultLoadBalancers();
  }

  onModuleInit() {
    this.startHeartbeatCheck();
    if (this.options.enableHealthCheck) {
      this.startHealthCheck();
    }
    this.logger.log('ServiceDiscoveryService initialized');
  }

  onModuleDestroy() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }

  register(instance: Omit<ServiceInstance, 'id' | 'registeredAt' | 'lastHeartbeat'> & { id?: string }): ServiceInstance {
    const instanceId = instance.id || this.generateInstanceId(instance.name);
    const now = Date.now();

    const serviceInstance: ServiceInstance = {
      ...instance,
      id: instanceId,
      registeredAt: now,
      lastHeartbeat: now,
      status: instance.status || 'up',
      weight: instance.weight || 1,
    };

    if (!this.services.has(instance.name)) {
      this.services.set(instance.name, {
        name: instance.name,
        instances: new Map(),
      });
    }

    const service = this.services.get(instance.name)!;
    service.instances.set(instanceId, serviceInstance);

    this.logger.log(`Service instance '${instance.name}' (${instanceId}) registered at ${instance.host}:${instance.port}`);

    return serviceInstance;
  }

  deregister(serviceName: string, instanceId: string): boolean {
    const service = this.services.get(serviceName);
    if (!service) return false;

    const removed = service.instances.delete(instanceId);

    if (removed) {
      this.logger.log(`Service instance '${serviceName}' (${instanceId}) deregistered`);

      if (service.instances.size === 0) {
        this.services.delete(serviceName);
      }
    }

    return removed;
  }

  heartbeat(serviceName: string, instanceId: string): boolean {
    const service = this.services.get(serviceName);
    if (!service) return false;

    const instance = service.instances.get(instanceId);
    if (!instance) return false;

    instance.lastHeartbeat = Date.now();

    if (instance.status === 'down') {
      instance.status = 'up';
      instance.healthCheck!.failures = 0;
    }

    return true;
  }

  getService(name: string): ServiceDefinition | undefined {
    return this.services.get(name);
  }

  getInstances(name: string, query?: ServiceQuery): ServiceInstance[] {
    const service = this.services.get(name);
    if (!service) return [];

    let instances = Array.from(service.instances.values());

    if (query?.status) {
      instances = instances.filter(i => i.status === query.status);
    }

    if (query?.tags && query.tags.length > 0) {
      instances = instances.filter(i =>
        i.tags && query!.tags!.some(tag => i.tags!.includes(tag))
      );
    }

    if (query?.version) {
      instances = instances.filter(i => i.version === query.version);
    }

    if (query?.metadata) {
      for (const [key, value] of Object.entries(query.metadata)) {
        instances = instances.filter(i => i.metadata?.[key] === value);
      }
    }

    return instances;
  }

  getHealthyInstances(name: string): ServiceInstance[] {
    return this.getInstances(name, { status: 'up' });
  }

  getInstance(name: string, instanceId: string): ServiceInstance | undefined {
    const service = this.services.get(name);
    if (!service) return undefined;

    return service.instances.get(instanceId);
  }

  select(name: string, strategy: string = 'round-robin'): ServiceInstance | null {
    const healthyInstances = this.getHealthyInstances(name);

    if (healthyInstances.length === 0) {
      return null;
    }

    const loadBalancer = this.loadBalancers.get(strategy);
    if (!loadBalancer) {
      this.logger.warn(`Load balancer '${strategy}' not found, using round-robin`);
      return this.loadBalancers.get('round-robin')!.select(healthyInstances);
    }

    return loadBalancer.select(healthyInstances);
  }

  selectAll(name: string, strategy: string = 'round-robin'): ServiceInstance[] {
    const healthyInstances = this.getHealthyInstances(name);

    if (healthyInstances.length === 0) {
      return [];
    }

    const loadBalancer = this.loadBalancers.get(strategy);
    if (!loadBalancer) {
      return healthyInstances;
    }

    return healthyInstances.sort(() => Math.random() - 0.5);
  }

  registerLoadBalancer(strategy: LoadBalancerStrategy): void {
    this.loadBalancers.set(strategy.name, strategy);
    this.logger.debug(`Load balancer '${strategy.name}' registered`);
  }

  updateStatus(serviceName: string, instanceId: string, status: ServiceStatus): boolean {
    const service = this.services.get(serviceName);
    if (!service) return false;

    const instance = service.instances.get(instanceId);
    if (!instance) return false;

    instance.status = status;
    return true;
  }

  updateMetadata(serviceName: string, instanceId: string, metadata: Record<string, any>): boolean {
    const service = this.services.get(serviceName);
    if (!service) return false;

    const instance = service.instances.get(instanceId);
    if (!instance) return false;

    instance.metadata = { ...instance.metadata, ...metadata };
    return true;
  }

  listServices(): string[] {
    return Array.from(this.services.keys());
  }

  listAllInstances(): ServiceInstance[] {
    const instances: ServiceInstance[] = [];
    for (const service of this.services.values()) {
      instances.push(...service.instances.values());
    }
    return instances;
  }

  getStats(): ServiceDiscoveryStats {
    const instancesByStatus: Record<ServiceStatus, number> = {
      up: 0,
      down: 0,
      starting: 0,
      stopping: 0,
      unknown: 0,
    };
    const instancesByService: Record<string, number> = {};
    let totalInstances = 0;
    let healthyInstances = 0;
    let unhealthyInstances = 0;

    for (const service of this.services.values()) {
      instancesByService[service.name] = service.instances.size;

      for (const instance of service.instances.values()) {
        totalInstances++;
        instancesByStatus[instance.status]++;

        if (instance.status === 'up') {
          healthyInstances++;
        } else {
          unhealthyInstances++;
        }
      }
    }

    return {
      totalServices: this.services.size,
      totalInstances,
      instancesByStatus,
      instancesByService,
      healthyInstances,
      unhealthyInstances,
    };
  }

  private startHeartbeatCheck(): void {
    this.heartbeatTimer = setInterval(() => {
      this.checkHeartbeats();
    }, this.options.heartbeatInterval);
  }

  private checkHeartbeats(): void {
    const now = Date.now();
    const timeout = this.options.heartbeatTimeout;

    for (const service of this.services.values()) {
      for (const instance of service.instances.values()) {
        if (instance.status === 'up' && now - instance.lastHeartbeat > timeout) {
          instance.status = 'down';
          this.logger.warn(`Service instance '${service.name}' (${instance.id}) marked as down due to heartbeat timeout`);
        }
      }
    }
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.options.defaultHealthCheckInterval);
  }

  private async performHealthChecks(): Promise<void> {
    for (const service of this.services.values()) {
      for (const instance of service.instances.values()) {
        if (!instance.healthCheck) continue;

        try {
          const isHealthy = await this.checkInstanceHealth(instance);

          if (isHealthy) {
            instance.healthCheck.failures = 0;
            if (instance.status === 'down') {
              instance.status = 'up';
              this.logger.log(`Service instance '${service.name}' (${instance.id}) is back up`);
            }
          } else {
            instance.healthCheck.failures++;
            if (instance.healthCheck.failures >= instance.healthCheck.maxFailures) {
              instance.status = 'down';
              this.logger.warn(`Service instance '${service.name}' (${instance.id}) marked as down after ${instance.healthCheck.failures} failed health checks`);
            }
          }
        } catch (error) {
          this.logger.error(`Health check error for '${service.name}' (${instance.id})`, error);
        }
      }
    }
  }

  private async checkInstanceHealth(instance: ServiceInstance): Promise<boolean> {
    if (!instance.healthCheck) return true;

    switch (instance.healthCheck.type) {
      case 'http':
        return this.httpHealthCheck(instance);
      case 'tcp':
        return this.tcpHealthCheck(instance);
      case 'custom':
        return true;
      default:
        return true;
    }
  }

  private async httpHealthCheck(instance: ServiceInstance): Promise<boolean> {
    const endpoint = instance.healthCheck!.endpoint || '/health';
    const url = `${instance.protocol || 'http'}://${instance.host}:${instance.port}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(instance.healthCheck!.timeout),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private async tcpHealthCheck(instance: ServiceInstance): Promise<boolean> {
    return new Promise(resolve => {
      const socket = new (require('net').Socket)();
      const timeout = instance.healthCheck!.timeout;

      socket.setTimeout(timeout);

      socket.connect(instance.port, instance.host, () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    });
  }

  private registerDefaultLoadBalancers(): void {
    let roundRobinIndex = 0;

    this.registerLoadBalancer({
      name: 'round-robin',
      select: (instances) => {
        if (instances.length === 0) return null;
        const instance = instances[roundRobinIndex % instances.length];
        roundRobinIndex++;
        return instance;
      },
    });

    this.registerLoadBalancer({
      name: 'random',
      select: (instances) => {
        if (instances.length === 0) return null;
        return instances[Math.floor(Math.random() * instances.length)];
      },
    });

    this.registerLoadBalancer({
      name: 'weighted',
      select: (instances) => {
        if (instances.length === 0) return null;

        const totalWeight = instances.reduce((sum, i) => sum + (i.weight || 1), 0);
        let random = Math.random() * totalWeight;

        for (const instance of instances) {
          random -= instance.weight || 1;
          if (random <= 0) {
            return instance;
          }
        }

        return instances[0];
      },
    });

    this.registerLoadBalancer({
      name: 'least-connections',
      select: (instances) => {
        if (instances.length === 0) return null;
        return instances.reduce((min, i) =>
          (i.metadata?.connections || 0) < (min.metadata?.connections || 0) ? i : min
        );
      },
    });
  }

  private generateInstanceId(serviceName: string): string {
    return `${serviceName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
