import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export type ImportFormat = 'csv' | 'json' | 'jsonl' | 'xml' | 'yaml';

export interface ImportOptions {
  format: ImportFormat;
  fields?: string[];
  fieldMapping?: Record<string, string>;
  delimiter?: string;
  hasHeaders?: boolean;
  skipRows?: number;
  maxRows?: number;
  batchSize?: number;
  validate?: (row: any) => boolean | string;
  transform?: (row: any) => any;
  onProgress?: (progress: ImportProgress) => void;
  onError?: (error: ImportError, row: any) => void;
}

export interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  message: string;
  data?: any;
}

export interface ImportProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  percentage: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  currentBatch: number;
}

export interface ImportJob {
  id: string;
  filepath: string;
  options: ImportOptions;
  progress: ImportProgress;
  result?: ImportResult;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
}

@Injectable()
export class ImportService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImportService.name);
  private readonly jobs = new Map<string, ImportJob>();
  private importDir: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.importDir = this.configService.get<string>('IMPORT_DIR', './imports');
    this.ensureDirectory(this.importDir);
    this.logger.log('ImportService initialized');
  }

  onModuleDestroy() {
    for (const job of this.jobs.values()) {
      if (job.status === 'processing') {
        job.status = 'cancelled';
      }
    }
  }

  async import<T = any>(
    filepath: string,
    options: ImportOptions,
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const result: ImportResult = {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: [],
    };

    const content = await fs.promises.readFile(filepath, 'utf8');
    let records: any[] = [];

    switch (options.format) {
      case 'csv':
        records = await this.parseCsv(content, options);
        break;
      case 'json':
        records = this.parseJson(content);
        break;
      case 'jsonl':
        records = this.parseJsonl(content);
        break;
      case 'xml':
        records = this.parseXml(content, options);
        break;
      case 'yaml':
        records = this.parseYaml(content);
        break;
      default:
        throw new Error(`Unsupported import format: ${options.format}`);
    }

    if (options.skipRows && options.skipRows > 0) {
      records = records.slice(options.skipRows);
    }

    if (options.maxRows && options.maxRows > 0) {
      records = records.slice(0, options.maxRows);
    }

    result.total = records.length;

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 1;

      try {
        let processedRow = row;

        if (options.fieldMapping) {
          processedRow = this.mapFields(processedRow, options.fieldMapping);
        }

        if (options.fields && options.fields.length > 0) {
          processedRow = this.pickFields(processedRow, options.fields);
        }

        if (options.validate) {
          const validationResult = options.validate(processedRow);
          if (validationResult !== true) {
            result.failed++;
            result.errors.push({
              row: rowNum,
              message: typeof validationResult === 'string' ? validationResult : 'Validation failed',
              data: row,
            });
            continue;
          }
        }

        if (options.transform) {
          processedRow = options.transform(processedRow);
        }

        result.successful++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          message: error.message,
          data: row,
        });

        if (options.onError) {
          options.onError(result.errors[result.errors.length - 1], row);
        }
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  async importStream<T = any>(
    filepath: string,
    options: ImportOptions,
    processor: (batch: T[]) => Promise<void>,
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const result: ImportResult = {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: [],
    };

    const batchSize = options.batchSize || 100;
    let currentBatch: T[] = [];
    let rowNum = 0;

    const processBatch = async () => {
      if (currentBatch.length === 0) return;

      try {
        await processor(currentBatch);
        result.successful += currentBatch.length;
      } catch (error: any) {
        result.failed += currentBatch.length;
        for (let i = 0; i < currentBatch.length; i++) {
          result.errors.push({
            row: rowNum - currentBatch.length + i + 1,
            message: error.message,
            data: currentBatch[i],
          });
        }
      }

      currentBatch = [];
    };

    switch (options.format) {
      case 'csv':
        await this.streamCsv(filepath, options, async (row) => {
          rowNum++;
          result.total++;

          if (options.skipRows && rowNum <= options.skipRows) {
            result.skipped++;
            return;
          }

          if (options.maxRows && result.successful + result.failed >= options.maxRows) {
            return;
          }

          let processedRow = row;

          if (options.fieldMapping) {
            processedRow = this.mapFields(processedRow, options.fieldMapping);
          }

          if (options.validate) {
            const validationResult = options.validate(processedRow);
            if (validationResult !== true) {
              result.failed++;
              result.errors.push({
                row: rowNum,
                message: typeof validationResult === 'string' ? validationResult : 'Validation failed',
                data: row,
              });
              return;
            }
          }

          if (options.transform) {
            processedRow = options.transform(processedRow);
          }

          currentBatch.push(processedRow as T);

          if (currentBatch.length >= batchSize) {
            await processBatch();
          }
        });
        break;

      case 'jsonl':
        await this.streamJsonl(filepath, options, async (row: any) => {
          rowNum++;
          result.total++;

          if (options.skipRows && rowNum <= options.skipRows) {
            result.skipped++;
            return;
          }

          if (options.maxRows && result.successful + result.failed >= options.maxRows) {
            return;
          }

          let processedRow = row;

          if (options.fieldMapping) {
            processedRow = this.mapFields(processedRow, options.fieldMapping);
          }

          if (options.validate) {
            const validationResult = options.validate(processedRow);
            if (validationResult !== true) {
              result.failed++;
              result.errors.push({
                row: rowNum,
                message: typeof validationResult === 'string' ? validationResult : 'Validation failed',
                data: row,
              });
              return;
            }
          }

          if (options.transform) {
            processedRow = options.transform(processedRow);
          }

          currentBatch.push(processedRow as T);

          if (currentBatch.length >= batchSize) {
            await processBatch();
          }
        });
        break;

      default:
        return this.import(filepath, options);
    }

    await processBatch();

    result.duration = Date.now() - startTime;
    return result;
  }

  createJob(filepath: string, options: ImportOptions): string {
    const jobId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job: ImportJob = {
      id: jobId,
      filepath,
      options,
      progress: {
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        percentage: 0,
        status: 'pending',
        currentBatch: 0,
      },
      status: 'pending',
    };

    this.jobs.set(jobId, job);
    return jobId;
  }

  getJob(jobId: string): ImportJob | undefined {
    return this.jobs.get(jobId);
  }

  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'processing') {
      job.status = 'cancelled';
      return true;
    }
    return false;
  }

  async cleanupOldFiles(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    const files = await fs.promises.readdir(this.importDir);
    const now = Date.now();
    let cleaned = 0;

    for (const file of files) {
      const filepath = path.join(this.importDir, file);
      const stats = await fs.promises.stat(filepath);

      if (now - stats.mtimeMs > maxAgeMs) {
        await fs.promises.unlink(filepath);
        cleaned++;
      }
    }

    return cleaned;
  }

  private async parseCsv(content: string, options: ImportOptions): Promise<any[]> {
    const delimiter = options.delimiter || ',';
    const hasHeaders = options.hasHeaders !== false;
    const lines = content.split(/\r?\n/).filter(line => line.trim());

    if (lines.length === 0) return [];

    let headers: string[] = [];
    let startIndex = 0;

    if (hasHeaders) {
      headers = this.parseCsvLine(lines[0], delimiter);
      startIndex = 1;
    } else if (options.fields) {
      headers = options.fields;
    } else {
      const firstLineFields = this.parseCsvLine(lines[0], delimiter);
      headers = firstLineFields.map((_, i) => `field_${i}`);
    }

    const records: any[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i], delimiter);
      const record: any = {};

      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = values[j] || null;
      }

      records.push(record);
    }

    return records;
  }

  private parseCsvLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === delimiter) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
    }

    result.push(current.trim());
    return result;
  }

  private parseJson(content: string): any[] {
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [data];
  }

  private parseJsonl(content: string): any[] {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    return lines.map(line => JSON.parse(line));
  }

  private parseXml(content: string, options: ImportOptions): any[] {
    const records: any[] = [];
    const recordTag = 'record';

    const recordRegex = new RegExp(`<${recordTag}[^>]*>([\\s\\S]*?)<\\/${recordTag}>`, 'gi');
    let match;

    while ((match = recordRegex.exec(content)) !== null) {
      const recordContent = match[1];
      const record: any = {};

      const fieldRegex = /<(\w+)>([\s\S]*?)<\/\1>/g;
      let fieldMatch;

      while ((fieldMatch = fieldRegex.exec(recordContent)) !== null) {
        const fieldName = fieldMatch[1];
        const fieldValue = this.unescapeXml(fieldMatch[2].trim());
        record[fieldName] = fieldValue;
      }

      records.push(record);
    }

    return records;
  }

  private parseYaml(content: string): any[] {
    const lines = content.split(/\r?\n/);
    const records: any[] = [];
    let currentRecord: any = {};
    let currentIndent = 0;

    for (const line of lines) {
      if (line.trim().startsWith('-')) {
        if (Object.keys(currentRecord).length > 0) {
          records.push(currentRecord);
        }
        currentRecord = {};
        currentIndent = line.search(/\S/);

        const content = line.replace(/^-\s*/, '');
        if (content.includes(':')) {
          const [key, value] = content.split(':').map(s => s.trim());
          currentRecord[key] = value;
        }
      } else if (line.includes(':')) {
        const indent = line.search(/\S/);
        const [key, value] = line.split(':').map(s => s.trim());

        if (indent > currentIndent) {
          currentRecord[key] = value;
        }
      }
    }

    if (Object.keys(currentRecord).length > 0) {
      records.push(currentRecord);
    }

    return records;
  }

  private async streamCsv(
    filepath: string,
    options: ImportOptions,
    onRow: (row: any) => Promise<void>,
  ): Promise<void> {
    const fileStream = fs.createReadStream(filepath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const delimiter = options.delimiter || ',';
    const hasHeaders = options.hasHeaders !== false;
    let headers: string[] = [];
    let lineNum = 0;

    for await (const line of rl) {
      if (!line.trim()) continue;

      if (lineNum === 0 && hasHeaders) {
        headers = this.parseCsvLine(line, delimiter);
        lineNum++;
        continue;
      }

      if (lineNum === 0 && !hasHeaders && options.fields) {
        headers = options.fields;
      } else if (lineNum === 0 && !hasHeaders) {
        const firstLineFields = this.parseCsvLine(line, delimiter);
        headers = firstLineFields.map((_, i) => `field_${i}`);
      }

      const values = this.parseCsvLine(line, delimiter);
      const record: any = {};

      for (let i = 0; i < headers.length; i++) {
        record[headers[i]] = values[i] || null;
      }

      await onRow(record);
      lineNum++;
    }
  }

  private async streamJsonl(
    filepath: string,
    options: ImportOptions,
    onRow: (row: any) => Promise<void>,
  ): Promise<void> {
    const fileStream = fs.createReadStream(filepath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;

      try {
        const record = JSON.parse(line);
        await onRow(record);
      } catch (error) {
        this.logger.error(`Failed to parse JSON line: ${line}`, error);
      }
    }
  }

  private mapFields(record: any, mapping: Record<string, string>): any {
    const result: any = {};

    for (const [sourceField, targetField] of Object.entries(mapping)) {
      if (sourceField in record) {
        result[targetField] = record[sourceField];
      }
    }

    return result;
  }

  private pickFields(record: any, fields: string[]): any {
    const result: any = {};

    for (const field of fields) {
      if (field in record) {
        result[field] = record[field];
      }
    }

    return result;
  }

  private unescapeXml(value: string): string {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}
