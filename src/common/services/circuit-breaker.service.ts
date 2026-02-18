import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  resetTimeout?: number;
  volumeThreshold?: number;
  errorFilter?: (error: Error) => boolean;
  onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;
  onFallback?: (error: Error) => any;
}

export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  rejects: number;
  timeouts: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  lastStateChangeTime: number;
  totalRequests: number;
  failureRate: number;
}

export interface CircuitBreakerInstance {
  name: string;
  options: Required<CircuitBreakerOptions>;
  stats: CircuitStats;
  execute<T>(fn: () => Promise<T>): Promise<T>;
  executeWithFallback<T>(fn: () => Promise<T>, fallback: (error: Error) => T | Promise<T>): Promise<T>;
  isOpen(): boolean;
  isClosed(): boolean;
  isHalfOpen(): boolean;
  open(): void;
  close(): void;
  halfOpen(): void;
  reset(): void;
  getStats(): CircuitStats;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitBreakerInstance>();
  private readonly defaultOptions: Required<CircuitBreakerOptions> = {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 30000,
    resetTimeout: 60000,
    volumeThreshold: 10,
    errorFilter: () => true,
    onStateChange: () => {},
    onFallback: () => null,
  };

  constructor(private readonly configService: ConfigService) {}

  create(name: string, options?: CircuitBreakerOptions): CircuitBreakerInstance {
    if (this.circuits.has(name)) {
      return this.circuits.get(name)!;
    }

    const mergedOptions: Required<CircuitBreakerOptions> = {
      ...this.defaultOptions,
      ...options,
    };

    const circuit = this.createCircuit(name, mergedOptions);
    this.circuits.set(name, circuit);

    this.logger.log(`Circuit breaker '${name}' created`);
    return circuit;
  }

  get(name: string): CircuitBreakerInstance | undefined {
    return this.circuits.get(name);
  }

  getOrCreate(name: string, options?: CircuitBreakerOptions): CircuitBreakerInstance {
    return this.get(name) || this.create(name, options);
  }

  remove(name: string): boolean {
    return this.circuits.delete(name);
  }

  getAllStats(): Record<string, CircuitStats> {
    const result: Record<string, CircuitStats> = {};
    for (const [name, circuit] of this.circuits) {
      result[name] = circuit.getStats();
    }
    return result;
  }

  resetAll(): void {
    for (const circuit of this.circuits.values()) {
      circuit.reset();
    }
  }

  private createCircuit(name: string, options: Required<CircuitBreakerOptions>): CircuitBreakerInstance {
    let state: CircuitState = 'closed';
    let failures = 0;
    let successes = 0;
    let rejects = 0;
    let timeouts = 0;
    let lastFailureTime: number | null = null;
    let lastSuccessTime: number | null = null;
    let lastStateChangeTime = Date.now();
    let totalRequests = 0;
    let halfOpenSuccesses = 0;
    let openTimer: NodeJS.Timeout | null = null;

    const stats: CircuitStats = {
      get state() { return state; },
      get failures() { return failures; },
      get successes() { return successes; },
      get rejects() { return rejects; },
      get timeouts() { return timeouts; },
      get lastFailureTime() { return lastFailureTime; },
      get lastSuccessTime() { return lastSuccessTime; },
      get lastStateChangeTime() { return lastStateChangeTime; },
      get totalRequests() { return totalRequests; },
      get failureRate() {
        return totalRequests > 0 ? (failures / totalRequests) * 100 : 0;
      },
    };

    const setState = (newState: CircuitState) => {
      const oldState = state;
      if (oldState === newState) return;

      state = newState;
      lastStateChangeTime = Date.now();

      this.logger.warn(`Circuit breaker '${name}' state changed: ${oldState} -> ${newState}`);
      options.onStateChange(oldState, newState);

      if (state === 'open') {
        if (openTimer) clearTimeout(openTimer);
        openTimer = setTimeout(() => {
          halfOpen();
        }, options.resetTimeout);
      }
    };

    const open = () => {
      setState('open');
    };

    const close = () => {
      failures = 0;
      successes = 0;
      halfOpenSuccesses = 0;
      setState('closed');
    };

    const halfOpen = () => {
      halfOpenSuccesses = 0;
      setState('half-open');
    };

    const recordFailure = (error: Error) => {
      failures++;
      lastFailureTime = Date.now();

      if (state === 'half-open') {
        open();
      } else if (state === 'closed') {
        if (totalRequests >= options.volumeThreshold && failures >= options.failureThreshold) {
          open();
        }
      }
    };

    const recordSuccess = () => {
      successes++;
      lastSuccessTime = Date.now();

      if (state === 'half-open') {
        halfOpenSuccesses++;
        if (halfOpenSuccesses >= options.successThreshold) {
          close();
        }
      }
    };

    const recordReject = () => {
      rejects++;
    };

    const recordTimeout = () => {
      timeouts++;
    };

    const execute = async <T>(fn: () => Promise<T>): Promise<T> => {
      totalRequests++;

      if (state === 'open') {
        recordReject();
        throw new Error(`Circuit breaker '${name}' is open`);
      }

      try {
        const result = await (options.timeout
          ? Promise.race([
              fn(),
              new Promise<never>((_, reject) =>
                setTimeout(() => {
                  recordTimeout();
                  reject(new Error(`Circuit breaker '${name}' timeout`));
                }, options.timeout),
              ),
            ])
          : fn());

        recordSuccess();
        return result;
      } catch (error: any) {
        if (options.errorFilter(error)) {
          recordFailure(error);
        }
        throw error;
      }
    };

    const executeWithFallback = async <T>(
      fn: () => Promise<T>,
      fallback: (error: Error) => T | Promise<T>,
    ): Promise<T> => {
      try {
        return await execute(fn);
      } catch (error: any) {
        if (state === 'open' || state === 'half-open') {
          return fallback(error);
        }
        throw error;
      }
    };

    const reset = () => {
      failures = 0;
      successes = 0;
      rejects = 0;
      timeouts = 0;
      halfOpenSuccesses = 0;
      lastFailureTime = null;
      lastSuccessTime = null;
      totalRequests = 0;
      if (openTimer) {
        clearTimeout(openTimer);
        openTimer = null;
      }
      close();
    };

    return {
      name,
      options,
      stats,
      execute,
      executeWithFallback,
      isOpen: () => state === 'open',
      isClosed: () => state === 'closed',
      isHalfOpen: () => state === 'half-open',
      open,
      close,
      halfOpen,
      reset,
      getStats: () => ({ ...stats }),
    };
  }

  async executeWithCircuit<T>(
    circuitName: string,
    fn: () => Promise<T>,
    options?: CircuitBreakerOptions,
  ): Promise<T> {
    const circuit = this.getOrCreate(circuitName, options);
    return circuit.execute(fn);
  }

  async executeWithFallback<T>(
    circuitName: string,
    fn: () => Promise<T>,
    fallback: (error: Error) => T | Promise<T>,
    options?: CircuitBreakerOptions,
  ): Promise<T> {
    const circuit = this.getOrCreate(circuitName, options);
    return circuit.executeWithFallback(fn, fallback);
  }
}

export function CircuitBreaker(name: string, options?: CircuitBreakerOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const circuitBreakerService = new CircuitBreakerService({} as any);

    descriptor.value = async function (...args: any[]) {
      const service = (this as any).circuitBreakerService as CircuitBreakerService;
      if (!service) {
        return originalMethod.apply(this, args);
      }

      const circuit = service.getOrCreate(name, options);
      return circuit.execute(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}
