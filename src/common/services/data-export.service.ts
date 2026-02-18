import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'xml';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  sheetName?: string;
  fields?: ExportField[];
  includeHeaders?: boolean;
  dateFormat?: string;
  encoding?: string;
  delimiter?: string;
}

export interface ExportField {
  name: string;
  label: string;
  transform?: (value: any, row: any) => any;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  path: string;
  size: number;
  rowCount: number;
  downloadUrl?: string;
}

export interface ExportProgress {
  total: number;
  processed: number;
  percentage: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);
  private readonly exportDir: string;
  private readonly exports = new Map<string, ExportProgress>();

  constructor(private readonly configService: ConfigService) {
    this.exportDir = this.configService.get('EXPORT_DIR', './uploads/exports');
    this.ensureExportDir();
  }

  async export<T extends Record<string, any>>(
    data: T[],
    options: ExportOptions,
  ): Promise<ExportResult> {
    const filename = options.filename || `export_${Date.now()}`;
    const rowCount = data.length;

    this.logger.debug(`Starting export: ${filename}, format: ${options.format}, rows: ${rowCount}`);

    switch (options.format) {
      case 'csv':
        return this.exportToCsv(data, filename, options);
      case 'json':
        return this.exportToJson(data, filename, options);
      case 'xml':
        return this.exportToXml(data, filename, options);
      case 'xlsx':
        return this.exportToXlsx(data, filename, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  async exportStream<T extends Record<string, any>>(
    dataStream: AsyncIterable<T>,
    options: ExportOptions,
    exportId: string,
  ): Promise<ExportResult> {
    const filename = options.filename || `export_${exportId}`;
    const filePath = path.join(this.exportDir, `${filename}.${options.format}`);

    this.exports.set(exportId, {
      total: 0,
      processed: 0,
      percentage: 0,
      status: 'processing',
    });

    let rowCount = 0;
    const chunks: T[] = [];
    const batchSize = 1000;

    try {
      for await (const row of dataStream) {
        chunks.push(row);
        rowCount++;

        if (chunks.length >= batchSize) {
          await this.processBatch(chunks, filePath, options, rowCount === batchSize);
          chunks.length = 0;
        }

        this.updateProgress(exportId, rowCount);
      }

      if (chunks.length > 0) {
        await this.processBatch(chunks, filePath, options, rowCount <= batchSize);
      }

      const stats = await fs.stat(filePath);

      this.exports.set(exportId, {
        total: rowCount,
        processed: rowCount,
        percentage: 100,
        status: 'completed',
      });

      return {
        success: true,
        filename: `${filename}.${options.format}`,
        path: filePath,
        size: stats.size,
        rowCount,
        downloadUrl: `/exports/download/${filename}.${options.format}`,
      };
    } catch (error: any) {
      this.exports.set(exportId, {
        total: rowCount,
        processed: rowCount,
        percentage: 0,
        status: 'failed',
        error: error.message,
      });

      throw error;
    }
  }

  getExportProgress(exportId: string): ExportProgress | undefined {
    return this.exports.get(exportId);
  }

  async getExportFile(filename: string): Promise<Buffer> {
    const filePath = path.join(this.exportDir, filename);
    return fs.readFile(filePath);
  }

  async deleteExportFile(filename: string): Promise<boolean> {
    try {
      const filePath = path.join(this.exportDir, filename);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async cleanupOldExports(maxAgeHours: number = 24): Promise<number> {
    const files = await fs.readdir(this.exportDir);
    const now = Date.now();
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(this.exportDir, file);
      const stats = await fs.stat(filePath);
      const ageHours = (now - stats.mtimeMs) / (1000 * 60 * 60);

      if (ageHours > maxAgeHours) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    }

    this.logger.log(`Cleaned up ${deletedCount} old export files`);
    return deletedCount;
  }

  private async exportToCsv<T extends Record<string, any>>(
    data: T[],
    filename: string,
    options: ExportOptions,
  ): Promise<ExportResult> {
    const filePath = path.join(this.exportDir, `${filename}.csv`);

    const fields = options.fields || this.inferFields(data);
    const headers = fields.map((f) => f.label).join(options.delimiter || ',') + '\n';

    const transformedData = data.map((row) =>
      fields.map((f) => this.escapeCsvField(this.getFieldValue(row, f))).join(options.delimiter || ',')
    );

    const csvContent = headers + transformedData.join('\n');
    await fs.writeFile(filePath, csvContent, { encoding: (options.encoding || 'utf-8') as BufferEncoding });

    const stats = await fs.stat(filePath);

    return {
      success: true,
      filename: `${filename}.csv`,
      path: filePath,
      size: stats.size,
      rowCount: data.length,
      downloadUrl: `/exports/download/${filename}.csv`,
    };
  }

  private async exportToJson<T extends Record<string, any>>(
    data: T[],
    filename: string,
    options: ExportOptions,
  ): Promise<ExportResult> {
    const filePath = path.join(this.exportDir, `${filename}.json`);

    const fields = options.fields;
    const transformedData = fields
      ? data.map((row) => this.transformRow(row, fields))
      : data;

    const jsonContent = JSON.stringify(transformedData, null, 2);
    await fs.writeFile(filePath, jsonContent, { encoding: (options.encoding || 'utf-8') as BufferEncoding });

    const stats = await fs.stat(filePath);

    return {
      success: true,
      filename: `${filename}.json`,
      path: filePath,
      size: stats.size,
      rowCount: data.length,
      downloadUrl: `/exports/download/${filename}.json`,
    };
  }

  private async exportToXml<T extends Record<string, any>>(
    data: T[],
    filename: string,
    options: ExportOptions,
  ): Promise<ExportResult> {
    const filePath = path.join(this.exportDir, `${filename}.xml`);

    const fields = options.fields || this.inferFields(data);
    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<records>\n';

    for (const row of data) {
      xmlContent += '  <record>\n';
      for (const field of fields) {
        const value = this.getFieldValue(row, field);
        const escapedValue = this.escapeXml(String(value ?? ''));
        xmlContent += `    <${field.name}>${escapedValue}</${field.name}>\n`;
      }
      xmlContent += '  </record>\n';
    }

    xmlContent += '</records>';

    await fs.writeFile(filePath, xmlContent, { encoding: (options.encoding || 'utf-8') as BufferEncoding });

    const stats = await fs.stat(filePath);

    return {
      success: true,
      filename: `${filename}.xml`,
      path: filePath,
      size: stats.size,
      rowCount: data.length,
      downloadUrl: `/exports/download/${filename}.xml`,
    };
  }

  private async exportToXlsx<T extends Record<string, any>>(
    data: T[],
    filename: string,
    options: ExportOptions,
  ): Promise<ExportResult> {
    const filePath = path.join(this.exportDir, `${filename}.xlsx`);

    const fields = options.fields || this.inferFields(data);
    const headers = fields.map((f) => f.label);
    const rows = data.map((row) => fields.map((f) => this.getFieldValue(row, f)));

    const xlsxContent = this.generateSimpleXlsx(headers, rows);
    await fs.writeFile(filePath, xlsxContent);

    const stats = await fs.stat(filePath);

    return {
      success: true,
      filename: `${filename}.xlsx`,
      path: filePath,
      size: stats.size,
      rowCount: data.length,
      downloadUrl: `/exports/download/${filename}.xlsx`,
    };
  }

  private async processBatch<T extends Record<string, any>>(
    batch: T[],
    filePath: string,
    options: ExportOptions,
    isFirstBatch: boolean,
  ): Promise<void> {
    const fields = options.fields || this.inferFields(batch);

    if (options.format === 'csv') {
      const content = isFirstBatch
        ? fields.map((f) => f.label).join(options.delimiter || ',') + '\n'
        : '';

      const rows = batch.map((row) =>
        fields.map((f) => this.escapeCsvField(this.getFieldValue(row, f))).join(options.delimiter || ',')
      );

      await fs.appendFile(filePath, content + rows.join('\n') + '\n');
    } else if (options.format === 'json') {
      const jsonContent = isFirstBatch
        ? JSON.stringify(batch, null, 2)
        : ',' + JSON.stringify(batch, null, 2).slice(1, -1);

      await fs.appendFile(filePath, jsonContent);
    }
  }

  private updateProgress(exportId: string, processed: number): void {
    const progress = this.exports.get(exportId);
    if (progress) {
      progress.processed = processed;
      progress.percentage = progress.total > 0 ? Math.round((processed / progress.total) * 100) : 0;
    }
  }

  private inferFields<T extends Record<string, any>>(data: T[]): ExportField[] {
    if (data.length === 0) return [];

    const firstRow = data[0];
    return Object.keys(firstRow).map((key) => ({
      name: key,
      label: this.formatLabel(key),
    }));
  }

  private formatLabel(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase())
      .trim();
  }

  private transformRow<T extends Record<string, any>>(
    row: T,
    fields: ExportField[],
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const field of fields) {
      result[field.name] = this.getFieldValue(row, field);
    }

    return result;
  }

  private getFieldValue<T extends Record<string, any>>(
    row: T,
    field: ExportField,
  ): any {
    const value = row[field.name];

    if (field.transform) {
      return field.transform(value, row);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
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

  private escapeCsvField(value: any): string {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private generateSimpleXlsx(headers: string[], rows: any[][]): Buffer {
    const worksheetStart =
      '<?xml version="1.0" encoding="UTF-8"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n<sheetData>\n';

    let content = worksheetStart;

    content += '<row r="1">';
    headers.forEach((header, index) => {
      content += `<c r="${String.fromCharCode(65 + index)}1" t="inlineStr"><is><t>${this.escapeXml(header)}</t></is></c>`;
    });
    content += '</row>\n';

    rows.forEach((row, rowIndex) => {
      content += `<row r="${rowIndex + 2}">`;
      row.forEach((cell, cellIndex) => {
        const cellValue = this.escapeXml(String(cell ?? ''));
        content += `<c r="${String.fromCharCode(65 + cellIndex)}${rowIndex + 2}" t="inlineStr"><is><t>${cellValue}</t></is></c>`;
      });
      content += '</row>\n';
    });

    content += '</sheetData>\n</worksheet>';

    return Buffer.from(content);
  }

  private async ensureExportDir(): Promise<void> {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create export directory:', error);
    }
  }
}
