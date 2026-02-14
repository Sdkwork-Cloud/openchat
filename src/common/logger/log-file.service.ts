import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface LogFileConfig {
  enabled: boolean;
  directory: string;
  maxSize: string;
  maxFiles: number;
  compress: boolean;
}

@Injectable()
export class LogFileService implements OnModuleInit {
  private readonly logger = new Logger(LogFileService.name);
  private readonly config: LogFileConfig;
  private logStream: fs.WriteStream | null = null;
  private errorStream: fs.WriteStream | null = null;
  private currentLogDate: string = '';

  constructor(private readonly configService: ConfigService) {
    this.config = {
      enabled: this.configService.get('LOG_FILE_ENABLED', 'false') === 'true',
      directory: this.configService.get('LOG_FILE_DIR', './logs'),
      maxSize: this.configService.get('LOG_FILE_MAX_SIZE', '10m'),
      maxFiles: parseInt(this.configService.get('LOG_FILE_MAX_FILES', '7'), 10),
      compress: this.configService.get('LOG_FILE_COMPRESS', 'true') === 'true',
    };
  }

  async onModuleInit(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.debug('File logging is disabled');
      return;
    }

    try {
      await this.ensureLogDirectory();
      await this.initializeLogStreams();
      this.logger.log(`File logging initialized: ${this.config.directory}`);
    } catch (error) {
      this.logger.error('Failed to initialize file logging:', error);
    }
  }

  private async ensureLogDirectory(): Promise<void> {
    if (!fs.existsSync(this.config.directory)) {
      fs.mkdirSync(this.config.directory, { recursive: true });
    }
  }

  private async initializeLogStreams(): Promise<void> {
    const today = this.getLogDate();
    this.currentLogDate = today;

    const logFile = path.join(this.config.directory, `app-${today}.log`);
    const errorFile = path.join(this.config.directory, `error-${today}.log`);

    this.logStream = fs.createWriteStream(logFile, { flags: 'a' });
    this.errorStream = fs.createWriteStream(errorFile, { flags: 'a' });
  }

  private getLogDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  writeLog(entry: string, level: string): void {
    if (!this.config.enabled) {
      return;
    }

    const today = this.getLogDate();
    if (today !== this.currentLogDate) {
      this.rotateLogs();
    }

    const stream = level === 'ERROR' ? this.errorStream : this.logStream;
    if (stream) {
      stream.write(entry + '\n');
    }
  }

  private rotateLogs(): void {
    if (this.logStream) {
      this.logStream.end();
    }
    if (this.errorStream) {
      this.errorStream.end();
    }

    this.initializeLogStreams();
    this.currentLogDate = this.getLogDate();

    this.cleanOldLogs();
  }

  private cleanOldLogs(): void {
    const files = fs.readdirSync(this.config.directory);
    const logFiles = files
      .filter(f => f.endsWith('.log'))
      .map(f => ({
        name: f,
        path: path.join(this.config.directory, f),
        time: fs.statSync(path.join(this.config.directory, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    if (logFiles.length > this.config.maxFiles * 2) {
      const filesToDelete = logFiles.slice(this.config.maxFiles * 2);
      for (const file of filesToDelete) {
        try {
          fs.unlinkSync(file.path);
          this.logger.debug(`Deleted old log file: ${file.name}`);
        } catch (error) {
          this.logger.error(`Failed to delete log file ${file.name}:`, error);
        }
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.logStream) {
      this.logStream.end();
    }
    if (this.errorStream) {
      this.errorStream.end();
    }
  }
}
