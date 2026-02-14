import { Injectable, Scope, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRequestId } from '../middleware/request-tracing.middleware';

export interface LogEntry {
  timestamp: string;
  level: string;
  context: string;
  message: string;
  requestId?: string;
  trace?: string;
  data?: Record<string, any>;
}

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerService {
  private context?: string;
  private readonly logLevel: string;
  private readonly sensitiveFields = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'authorization',
    'creditCard',
    'ssn',
    'privateKey',
  ];

  private readonly levelPriority: Record<string, number> = {
    verbose: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
  };

  constructor(private readonly configService: ConfigService) {
    this.logLevel = this.configService.get('LOG_LEVEL', 'info');
  }

  setContext(context: string): void {
    this.context = context;
  }

  log(message: string, context?: string): void {
    this.printLog('info', message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.printLog('error', message, context, trace);
  }

  warn(message: string, context?: string): void {
    this.printLog('warn', message, context);
  }

  debug(message: string, context?: string): void {
    this.printLog('debug', message, context);
  }

  verbose(message: string, context?: string): void {
    this.printLog('verbose', message, context);
  }

  info(message: string, context?: string): void {
    this.printLog('info', message, context);
  }

  private printLog(
    level: string,
    message: string,
    context?: string,
    trace?: string,
    data?: Record<string, any>,
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const ctx = context || this.context || 'Application';
    const requestId = getRequestId();

    const logEntry: LogEntry = {
      timestamp,
      level: level.toUpperCase(),
      context: ctx,
      message,
    };

    if (requestId) {
      logEntry.requestId = requestId;
    }

    if (trace) {
      logEntry.trace = this.formatTrace(trace);
    }

    if (data) {
      logEntry.data = this.sanitize(data);
    }

    const output = JSON.stringify(logEntry);

    switch (level) {
      case 'error':
        process.stderr.write(`${output}\n`);
        break;
      default:
        process.stdout.write(`${output}\n`);
    }
  }

  private shouldLog(level: string): boolean {
    const currentLevelPriority = this.levelPriority[this.logLevel.toLowerCase()] ?? 2;
    const messageLevelPriority = this.levelPriority[level.toLowerCase()] ?? 2;
    return messageLevelPriority >= currentLevelPriority;
  }

  private formatTrace(trace: string): string {
    const lines = trace.split('\n');
    if (lines.length <= 5) {
      return trace;
    }
    return lines.slice(0, 5).join('\n') + '\n...';
  }

  sanitize(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.sensitiveFields.some(field =>
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        sanitized[key] = '******';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  withData(data: Record<string, any>): this {
    return new Proxy(this, {
      get: (target, prop) => {
        if (typeof target[prop as keyof AppLogger] === 'function') {
          return (...args: any[]) => {
            const [message, context] = args;
            target.printLog(
              prop === 'log' ? 'info' : prop.toString(),
              message,
              context,
              undefined,
              data,
            );
          };
        }
        return target[prop as keyof AppLogger];
      },
    }) as any;
  }

  logWithContext(
    message: string,
    data: Record<string, any>,
    level: string = 'info',
  ): void {
    this.printLog(level, message, this.context, undefined, data);
  }

  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    ip?: string,
    userId?: string,
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.printLog(level, `HTTP ${method} ${url}`, this.context, undefined, {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      ip: ip || 'unknown',
      userId: userId || 'anonymous',
    });
  }

  logError(message: string, error: Error, data?: Record<string, any>): void {
    this.printLog('error', message, this.context, error.stack, data);
  }

  logPerformance(operation: string, duration: number, data?: Record<string, any>): void {
    const level = duration > 1000 ? 'warn' : 'debug';
    this.printLog(level, `Performance: ${operation}`, this.context, undefined, {
      operation,
      duration: `${duration}ms`,
      ...data,
    });
  }

  logBusinessEvent(event: string, data: Record<string, any>): void {
    this.printLog('info', `Business Event: ${event}`, this.context, undefined, {
      event,
      ...data,
    });
  }
}
