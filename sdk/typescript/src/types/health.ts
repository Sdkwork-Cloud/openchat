export interface BasicHealthCheck {
  status: 'ok' | 'error';
  timestamp: string;
}

export interface ServiceStatus {
  status: string;
  responseTime: number;
  details?: any;
}

export interface QueueServiceStatus {
  status: string;
  enabled: boolean;
  details?: any;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    queue?: QueueServiceStatus;
    imProvider?: ServiceStatus;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    rss: number;
    external: number;
  };
  eventLoop: {
    lag: number;
    status: string;
  };
}

export interface ReadyCheck {
  status: 'ready' | 'not_ready';
  checks: {
    database: string;
    redis: string;
  };
}

export interface LiveCheck {
  status: 'alive';
  timestamp: string;
}
