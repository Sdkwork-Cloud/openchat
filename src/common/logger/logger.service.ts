import { Injectable, Scope, LoggerService, ConsoleLogger } from '@nestjs/common';
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

export interface ErrorLogEntry {
  timestamp: string;
  level: 'ERROR';
  module: string;
  errorType: string;
  errorCode?: string | number;
  message: string;
  stack?: string;
  requestId?: string;
  details?: Record<string, any>;
}

export interface SuccessLogEntry {
  timestamp: string;
  level: 'SUCCESS';
  module: string;
  message: string;
  duration?: number;
  details?: Record<string, any>;
}

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerService {
  private context?: string;
  private readonly logLevel: string;
  private readonly logFormat: string;
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
    success: 2,
  };

  constructor(private readonly configService: ConfigService) {
    this.logLevel = this.configService.get('LOG_LEVEL', 'info');
    this.logFormat = this.configService.get('LOG_FORMAT', 'pretty');
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

  success(message: string, context?: string, details?: Record<string, any>): void {
    this.printSuccess(message, context, details);
  }

  moduleError(
    module: string,
    errorType: string,
    message: string,
    options?: {
      errorCode?: string | number;
      error?: Error;
      details?: Record<string, any>;
    }
  ): void {
    this.printModuleError(module, errorType, message, options);
  }

  moduleSuccess(
    module: string,
    message: string,
    options?: {
      duration?: number;
      details?: Record<string, any>;
    }
  ): void {
    this.printModuleSuccess(module, message, options);
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

    if (this.logFormat === 'json') {
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

      if (level === 'error') {
        process.stderr.write(`${output}\n`);
      } else {
        process.stdout.write(`${output}\n`);
      }
    } else {
      this.printPrettyLog(level, timestamp, ctx, message, trace, data);
    }
  }

  private printPrettyLog(
    level: string,
    timestamp: string,
    context: string,
    message: string,
    trace?: string,
    data?: Record<string, any>,
  ): void {
    const levelColors: Record<string, string> = {
      error: '\x1b[31m',
      warn: '\x1b[33m',
      info: '\x1b[32m',
      debug: '\x1b[36m',
      verbose: '\x1b[90m',
    };

    const reset = '\x1b[0m';
    const color = levelColors[level] || '\x1b[37m';
    const levelUpper = level.toUpperCase().padEnd(7);

    const time = timestamp.replace('T', ' ').replace(/\.\d+Z$/, '');

    let output = `${color}[Nest] ${levelUpper}${reset} ${time} `;
    output += `\x1b[1m[${context}]\x1b[0m ${message}`;

    if (data && Object.keys(data).length > 0) {
      output += `\n  Data: ${JSON.stringify(this.sanitize(data))}`;
    }

    if (trace) {
      output += `\n  Stack: ${this.formatTrace(trace)}`;
    }

    if (level === 'error') {
      process.stderr.write(`${output}\n`);
    } else {
      process.stdout.write(`${output}\n`);
    }
  }

  private printSuccess(
    message: string,
    context?: string,
    details?: Record<string, any>,
  ): void {
    const timestamp = new Date().toISOString();
    const ctx = context || this.context || 'Application';

    if (this.logFormat === 'json') {
      const entry: SuccessLogEntry = {
        timestamp,
        level: 'SUCCESS',
        module: ctx,
        message,
        details,
      };
      process.stdout.write(`${JSON.stringify(entry)}\n`);
    } else {
      const time = timestamp.replace('T', ' ').replace(/\.\d+Z$/, '');
      const green = '\x1b[32m';
      const reset = '\x1b[0m';
      const bold = '\x1b[1m';

      let output = `${green}[Nest] SUCCESS${reset} ${time} `;
      output += `${bold}[${ctx}]${reset} ${green}✓${reset} ${message}`;

      if (details && Object.keys(details).length > 0) {
        output += `\n  Details: ${JSON.stringify(details)}`;
      }

      process.stdout.write(`${output}\n`);
    }
  }

  private printModuleError(
    module: string,
    errorType: string,
    message: string,
    options?: {
      errorCode?: string | number;
      error?: Error;
      details?: Record<string, any>;
    }
  ): void {
    const timestamp = new Date().toISOString();

    if (this.logFormat === 'json') {
      const entry: ErrorLogEntry = {
        timestamp,
        level: 'ERROR',
        module,
        errorType,
        message,
        errorCode: options?.errorCode,
        stack: options?.error?.stack,
        details: options?.details,
      };
      process.stderr.write(`${JSON.stringify(entry)}\n`);
    } else {
      const time = timestamp.replace('T', ' ').replace(/\.\d+Z$/, '');
      const red = '\x1b[31m';
      const reset = '\x1b[0m';
      const bold = '\x1b[1m';
      const yellow = '\x1b[33m';

      let output = `\n${red}╔═══════════════════════════════════════════════════════════════╗${reset}`;
      output += `\n${red}║${reset} ${bold}ERROR${reset} - ${time}`;
      output += `\n${red}╠═══════════════════════════════════════════════════════════════╣${reset}`;
      output += `\n${red}║${reset} ${yellow}Module:${reset}     ${module}`;
      output += `\n${red}║${reset} ${yellow}Error Type:${reset} ${errorType}`;
      
      if (options?.errorCode) {
        output += `\n${red}║${reset} ${yellow}Error Code:${reset} ${options.errorCode}`;
      }
      
      output += `\n${red}║${reset} ${yellow}Message:${reset}    ${message}`;

      if (options?.details && Object.keys(options.details).length > 0) {
        output += `\n${red}║${reset} ${yellow}Details:${reset}    ${JSON.stringify(options.details)}`;
      }

      if (options?.error?.stack) {
        const stackLines = options.error.stack.split('\n').slice(0, 3);
        output += `\n${red}║${reset} ${yellow}Stack:${reset}`;
        for (const line of stackLines) {
          output += `\n${red}║${reset}   ${line.trim()}`;
        }
      }

      output += `\n${red}╚═══════════════════════════════════════════════════════════════╝${reset}\n`;

      process.stderr.write(output);
    }
  }

  private printModuleSuccess(
    module: string,
    message: string,
    options?: {
      duration?: number;
      details?: Record<string, any>;
    }
  ): void {
    const timestamp = new Date().toISOString();

    if (this.logFormat === 'json') {
      const entry: SuccessLogEntry = {
        timestamp,
        level: 'SUCCESS',
        module,
        message,
        duration: options?.duration,
        details: options?.details,
      };
      process.stdout.write(`${JSON.stringify(entry)}\n`);
    } else {
      const time = timestamp.replace('T', ' ').replace(/\.\d+Z$/, '');
      const green = '\x1b[32m';
      const reset = '\x1b[0m';
      const bold = '\x1b[1m';
      const cyan = '\x1b[36m';

      let output = `\n${green}┌───────────────────────────────────────────────────────────────┐${reset}`;
      output += `\n${green}│${reset} ${bold}SUCCESS${reset} - ${time}`;
      output += `\n${green}├───────────────────────────────────────────────────────────────┤${reset}`;
      output += `\n${green}│${reset} ${cyan}Module:${reset}   ${module}`;
      output += `\n${green}│${reset} ${cyan}Message:${reset}  ${message}`;
      
      if (options?.duration) {
        output += `\n${green}│${reset} ${cyan}Duration:${reset} ${options.duration}ms`;
      }

      if (options?.details && Object.keys(options.details).length > 0) {
        output += `\n${green}│${reset} ${cyan}Details:${reset}  ${JSON.stringify(options.details)}`;
      }

      output += `\n${green}└───────────────────────────────────────────────────────────────┘${reset}\n`;

      process.stdout.write(output);
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
