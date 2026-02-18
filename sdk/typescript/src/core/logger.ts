export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export interface LoggerConfig {
  level?: LogLevel;
  prefix?: string;
  timestamp?: boolean;
  colorize?: boolean;
  customHandler?: (level: LogLevel, message: string, ...args: any[]) => void;
}

export class Logger {
  private level: LogLevel;
  private prefix: string;
  private timestamp: boolean;
  private colorize: boolean;
  private customHandler?: (level: LogLevel, message: string, ...args: any[]) => void;

  constructor(config: LoggerConfig = {}) {
    this.level = config.level ?? LogLevel.WARN;
    this.prefix = config.prefix ?? '[OpenChat]';
    this.timestamp = config.timestamp ?? true;
    this.colorize = config.colorize ?? true;
    this.customHandler = config.customHandler;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  private formatMessage(level: string, message: string): string {
    const parts: string[] = [];
    
    if (this.timestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }
    
    parts.push(this.prefix);
    parts.push(`[${level}]`);
    parts.push(message);
    
    return parts.join(' ');
  }

  private getLevelColor(level: LogLevel): string {
    const colors: Record<number, string> = {
      [LogLevel.DEBUG]: '\x1b[36m',
      [LogLevel.INFO]: '\x1b[32m',
      [LogLevel.WARN]: '\x1b[33m',
      [LogLevel.ERROR]: '\x1b[31m',
    };
    return colors[level] ?? '';
  }

  private resetColor(): string {
    return '\x1b[0m';
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const formatted = this.formatMessage('DEBUG', message);
    
    if (this.customHandler) {
      this.customHandler(LogLevel.DEBUG, message, ...args);
    } else if (typeof console !== 'undefined') {
      if (this.colorize) {
        console.debug(`${this.getLevelColor(LogLevel.DEBUG)}${formatted}${this.resetColor()}`, ...args);
      } else {
        console.debug(formatted, ...args);
      }
    }
  }

  info(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const formatted = this.formatMessage('INFO', message);
    
    if (this.customHandler) {
      this.customHandler(LogLevel.INFO, message, ...args);
    } else if (typeof console !== 'undefined') {
      if (this.colorize) {
        console.info(`${this.getLevelColor(LogLevel.INFO)}${formatted}${this.resetColor()}`, ...args);
      } else {
        console.info(formatted, ...args);
      }
    }
  }

  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const formatted = this.formatMessage('WARN', message);
    
    if (this.customHandler) {
      this.customHandler(LogLevel.WARN, message, ...args);
    } else if (typeof console !== 'undefined') {
      if (this.colorize) {
        console.warn(`${this.getLevelColor(LogLevel.WARN)}${formatted}${this.resetColor()}`, ...args);
      } else {
        console.warn(formatted, ...args);
      }
    }
  }

  error(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const formatted = this.formatMessage('ERROR', message);
    
    if (this.customHandler) {
      this.customHandler(LogLevel.ERROR, message, ...args);
    } else if (typeof console !== 'undefined') {
      if (this.colorize) {
        console.error(`${this.getLevelColor(LogLevel.ERROR)}${formatted}${this.resetColor()}`, ...args);
      } else {
        console.error(formatted, ...args);
      }
    }
  }

  group(label: string): void {
    if (typeof console !== 'undefined' && console.group) {
      console.group(`${this.prefix} ${label}`);
    }
  }

  groupEnd(): void {
    if (typeof console !== 'undefined' && console.groupEnd) {
      console.groupEnd();
    }
  }

  time(label: string): void {
    if (typeof console !== 'undefined' && console.time) {
      console.time(`${this.prefix} ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (typeof console !== 'undefined' && console.timeEnd) {
      console.timeEnd(`${this.prefix} ${label}`);
    }
  }

  table(data: any): void {
    if (typeof console !== 'undefined' && console.table) {
      console.table(data);
    }
  }

  child(childPrefix: string): Logger {
    return new Logger({
      level: this.level,
      prefix: `${this.prefix}:${childPrefix}`,
      timestamp: this.timestamp,
      colorize: this.colorize,
      customHandler: this.customHandler,
    });
  }
}

let globalLogger: Logger | null = null;

export function createLogger(config?: LoggerConfig): Logger {
  return new Logger(config);
}

export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}

export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}
