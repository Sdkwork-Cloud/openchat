import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { createWriteStream, WriteStream } from 'fs';

export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'xml' | 'yaml';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  fields?: string[];
  headers?: Record<string, string>;
  delimiter?: string;
  includeHeaders?: boolean;
  dateFormat?: string;
  nullValue?: string;
  sheetName?: string;
  batchSize?: number;
  transform?: (row: any) => any;
  filter?: (row: any) => boolean;
}

export interface ExportResult {
  filename: string;
  filepath: string;
  format: ExportFormat;
  recordsCount: number;
  fileSize: number;
  duration: number;
}

export interface ExportProgress {
  total: number;
  processed: number;
  percentage: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

@Injectable()
export class ExportService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExportService.name);
  private readonly exports = new Map<string, ExportProgress>();
  private exportDir: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.exportDir = this.configService.get<string>('EXPORT_DIR', './exports');
    this.ensureDirectory(this.exportDir);
    this.logger.log('ExportService initialized');
  }

  onModuleDestroy() {
    this.exports.clear();
  }

  async export<T>(
    data: T[] | AsyncIterable<T>,
    options: ExportOptions,
  ): Promise<ExportResult> {
    const startTime = Date.now();
    const format = options.format || 'csv';
    const filename = options.filename || `export_${Date.now()}.${format}`;
    const filepath = path.join(this.exportDir, filename);

    let recordsCount = 0;
    const dataArray: T[] = [];

    if (Array.isArray(data)) {
      dataArray.push(...data);
    } else {
      for await (const item of data) {
        dataArray.push(item);
      }
    }

    let filteredData = dataArray;
    if (options.filter) {
      filteredData = dataArray.filter(options.filter);
    }

    let processedData = filteredData;
    if (options.transform) {
      processedData = filteredData.map(options.transform);
    }

    let finalData = processedData;
    if (options.fields && options.fields.length > 0) {
      finalData = processedData.map(row => this.pickFields(row, options.fields!));
    }

    switch (format) {
      case 'csv':
        await this.exportToCsv(finalData, filepath, options);
        break;
      case 'json':
        await this.exportToJson(finalData, filepath, options);
        break;
      case 'xml':
        await this.exportToXml(finalData, filepath, options);
        break;
      case 'yaml':
        await this.exportToYaml(finalData, filepath, options);
        break;
      case 'xlsx':
        await this.exportToXlsx(finalData, filepath, options);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    recordsCount = finalData.length;
    const stats = await fs.promises.stat(filepath);
    const duration = Date.now() - startTime;

    return {
      filename,
      filepath,
      format,
      recordsCount,
      fileSize: stats.size,
      duration,
    };
  }

  async exportStream<T>(
    dataStream: AsyncIterable<T>,
    options: ExportOptions,
    exportId: string,
  ): Promise<ExportResult> {
    const startTime = Date.now();
    const format = options.format || 'csv';
    const filename = options.filename || `export_${Date.now()}.${format}`;
    const filepath = path.join(this.exportDir, filename);

    this.exports.set(exportId, {
      total: 0,
      processed: 0,
      percentage: 0,
      status: 'processing',
    });

    let recordsCount = 0;
    const batchSize = options.batchSize || 1000;
    let batch: T[] = [];

    try {
      const writeStream = createWriteStream(filepath);
      let headerWritten = false;

      for await (const item of dataStream) {
        const progress = this.exports.get(exportId)!;
        progress.total++;
      }

      for await (const item of dataStream) {
        let processedItem = item;

        if (options.filter && !options.filter(item)) {
          continue;
        }

        if (options.transform) {
          processedItem = options.transform(item);
        }

        if (options.fields && options.fields.length > 0) {
          processedItem = this.pickFields(processedItem, options.fields);
        }

        batch.push(processedItem);

        if (batch.length >= batchSize) {
          const dataToWrite = this.formatBatch(batch, format, options, !headerWritten);
          writeStream.write(dataToWrite);
          if (!headerWritten) headerWritten = true;
          batch = [];
        }

        recordsCount++;
        this.updateProgress(exportId, recordsCount);
      }

      if (batch.length > 0) {
        const dataToWrite = this.formatBatch(batch, format, options, !headerWritten);
        writeStream.write(dataToWrite);
      }

      writeStream.end();

      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      const stats = await fs.promises.stat(filepath);
      const duration = Date.now() - startTime;

      this.exports.set(exportId, {
        total: recordsCount,
        processed: recordsCount,
        percentage: 100,
        status: 'completed',
      });

      return {
        filename,
        filepath,
        format,
        recordsCount,
        fileSize: stats.size,
        duration,
      };
    } catch (error: any) {
      this.exports.set(exportId, {
        total: 0,
        processed: recordsCount,
        percentage: 0,
        status: 'failed',
        error: error.message,
      });
      throw error;
    }
  }

  getProgress(exportId: string): ExportProgress | undefined {
    return this.exports.get(exportId);
  }

  async getExportFile(filepath: string): Promise<Buffer> {
    return fs.promises.readFile(filepath);
  }

  async deleteExportFile(filepath: string): Promise<boolean> {
    try {
      await fs.promises.unlink(filepath);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete export file: ${filepath}`, error);
      return false;
    }
  }

  async cleanupOldExports(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    const files = await fs.promises.readdir(this.exportDir);
    const now = Date.now();
    let cleaned = 0;

    for (const file of files) {
      const filepath = path.join(this.exportDir, file);
      const stats = await fs.promises.stat(filepath);

      if (now - stats.mtimeMs > maxAgeMs) {
        await fs.promises.unlink(filepath);
        cleaned++;
      }
    }

    return cleaned;
  }

  private async exportToCsv(data: any[], filepath: string, options: ExportOptions): Promise<void> {
    const delimiter = options.delimiter || ',';
    const includeHeaders = options.includeHeaders !== false;
    const nullValue = options.nullValue || '';
    const headers = options.headers || {};

    const fields = options.fields || (data.length > 0 ? Object.keys(data[0]) : []);
    const headerRow = fields.map(field => headers[field] || field);

    const rows: string[] = [];

    if (includeHeaders) {
      rows.push(headerRow.map(h => this.escapeCsvField(h, delimiter)).join(delimiter));
    }

    for (const item of data) {
      const row = fields.map(field => {
        const value = item[field];
        if (value === null || value === undefined) {
          return nullValue;
        }
        if (value instanceof Date) {
          return value.toISOString();
        }
        return this.escapeCsvField(String(value), delimiter);
      });
      rows.push(row.join(delimiter));
    }

    await fs.promises.writeFile(filepath, rows.join('\n'), 'utf8');
  }

  private async exportToJson(data: any[], filepath: string, options: ExportOptions): Promise<void> {
    const jsonContent = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(filepath, jsonContent, 'utf8');
  }

  private async exportToXml(data: any[], filepath: string, options: ExportOptions): Promise<void> {
    const fields = options.fields || (data.length > 0 ? Object.keys(data[0]) : []);
    const rootName = 'records';
    const recordName = 'record';

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<${rootName}>\n`;

    for (const item of data) {
      xml += `  <${recordName}>\n`;
      for (const field of fields) {
        const value = item[field];
        xml += `    <${field}>${this.escapeXml(String(value ?? ''))}</${field}>\n`;
      }
      xml += `  </${recordName}>\n`;
    }

    xml += `</${rootName}>`;

    await fs.promises.writeFile(filepath, xml, 'utf8');
  }

  private async exportToYaml(data: any[], filepath: string, options: ExportOptions): Promise<void> {
    const yaml = this.toYaml(data, 0);
    await fs.promises.writeFile(filepath, yaml, 'utf8');
  }

  private async exportToXlsx(data: any[], filepath: string, options: ExportOptions): Promise<void> {
    const fields = options.fields || (data.length > 0 ? Object.keys(data[0]) : []);
    const headers = options.headers || {};
    const sheetName = options.sheetName || 'Sheet1';

    const xlsxContent = this.generateSimpleXlsx(data, fields, headers, sheetName);
    await fs.promises.writeFile(filepath, xlsxContent);
  }

  private formatBatch(batch: any[], format: string, options: ExportOptions, includeHeader: boolean): string {
    switch (format) {
      case 'csv':
        return this.formatCsvBatch(batch, options, includeHeader);
      case 'json':
        return batch.map(item => JSON.stringify(item)).join('\n') + '\n';
      default:
        return batch.map(item => JSON.stringify(item)).join('\n') + '\n';
    }
  }

  private formatCsvBatch(batch: any[], options: ExportOptions, includeHeader: boolean): string {
    const delimiter = options.delimiter || ',';
    const fields = options.fields || (batch.length > 0 ? Object.keys(batch[0]) : []);
    const headers = options.headers || {};

    const rows: string[] = [];

    if (includeHeader) {
      const headerRow = fields.map(field => headers[field] || field);
      rows.push(headerRow.map(h => this.escapeCsvField(h, delimiter)).join(delimiter));
    }

    for (const item of batch) {
      const row = fields.map(field => {
        const value = item[field];
        if (value === null || value === undefined) {
          return options.nullValue || '';
        }
        return this.escapeCsvField(String(value), delimiter);
      });
      rows.push(row.join(delimiter));
    }

    return rows.join('\n') + '\n';
  }

  private escapeCsvField(value: string, delimiter: string): string {
    if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private toYaml(data: any, indent: number): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item === 'object' && item !== null) {
          yaml += `${spaces}-\n${this.toYaml(item, indent + 1)}`;
        } else {
          yaml += `${spaces}- ${item}\n`;
        }
      }
    } else if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'object' && value !== null) {
          yaml += `${spaces}${key}:\n${this.toYaml(value, indent + 1)}`;
        } else {
          yaml += `${spaces}${key}: ${value}\n`;
        }
      }
    }

    return yaml;
  }

  private generateSimpleXlsx(
    data: any[],
    fields: string[],
    headers: Record<string, string>,
    sheetName: string,
  ): Buffer {
    const headerRow = fields.map(field => headers[field] || field);
    const dataRows = data.map(item => fields.map(field => String(item[field] ?? '')));

    let content = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    content += `<?mso-application progid="Excel.Sheet"?>\n`;
    content += `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">\n`;
    content += `  <Worksheet ss:Name="${sheetName}">\n`;
    content += `    <Table>\n`;

    content += `      <Row>\n`;
    for (const header of headerRow) {
      content += `        <Cell><Data ss:Type="String">${this.escapeXml(header)}</Data></Cell>\n`;
    }
    content += `      </Row>\n`;

    for (const row of dataRows) {
      content += `      <Row>\n`;
      for (const cell of row) {
        const type = !isNaN(Number(cell)) ? 'Number' : 'String';
        content += `        <Cell><Data ss:Type="${type}">${this.escapeXml(cell)}</Data></Cell>\n`;
      }
      content += `      </Row>\n`;
    }

    content += `    </Table>\n`;
    content += `  </Worksheet>\n`;
    content += `</Workbook>`;

    return Buffer.from(content, 'utf8');
  }

  private pickFields(obj: any, fields: string[]): any {
    const result: any = {};
    for (const field of fields) {
      if (field in obj) {
        result[field] = obj[field];
      }
    }
    return result;
  }

  private updateProgress(exportId: string, processed: number): void {
    const progress = this.exports.get(exportId);
    if (progress) {
      progress.processed = processed;
      progress.percentage = progress.total > 0 ? Math.round((processed / progress.total) * 100) : 0;
    }
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
