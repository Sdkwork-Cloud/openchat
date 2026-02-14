import { Logger } from '@nestjs/common';

export class RtcLogger {
  private static instance: RtcLogger;
  private readonly logger = new Logger('RTC');

  static getInstance(): RtcLogger {
    if (!RtcLogger.instance) {
      RtcLogger.instance = new RtcLogger();
    }
    return RtcLogger.instance;
  }

  log(provider: string, operation: string, data?: Record<string, any>): void {
    const message = data 
      ? `${provider} RTC: ${operation} - ${JSON.stringify(data)}`
      : `${provider} RTC: ${operation}`;
    this.logger.log(message);
  }

  debug(provider: string, operation: string, data?: Record<string, any>): void {
    const message = data 
      ? `${provider} RTC: ${operation} - ${JSON.stringify(data)}`
      : `${provider} RTC: ${operation}`;
    this.logger.debug(message);
  }

  warn(provider: string, operation: string, data?: Record<string, any>): void {
    const message = data 
      ? `${provider} RTC: ${operation} - ${JSON.stringify(data)}`
      : `${provider} RTC: ${operation}`;
    this.logger.warn(message);
  }

  error(provider: string, operation: string, error?: Error, data?: Record<string, any>): void {
    const message = data 
      ? `${provider} RTC: ${operation} - ${JSON.stringify(data)}`
      : `${provider} RTC: ${operation}`;
    this.logger.error(message, error?.stack);
  }
}

export const rtcLogger = RtcLogger.getInstance();
