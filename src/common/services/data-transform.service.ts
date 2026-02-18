import { Injectable, Logger } from '@nestjs/common';

export type DataFormat = 'json' | 'xml' | 'csv' | 'yaml' | 'toml' | 'querystring';

export interface TransformOptions {
  preserveNull?: boolean;
  preserveUndefined?: boolean;
  dateFormat?: string;
  numberFormat?: string;
  excludeFields?: string[];
  includeFields?: string[];
  renameFields?: Record<string, string>;
  transformFields?: Record<string, (value: any) => any>;
}

export interface FlattenOptions {
  separator?: string;
  maxDepth?: number;
  preserveArrays?: boolean;
}

export interface DiffResult {
  added: Record<string, any>;
  removed: Record<string, any>;
  changed: Record<string, { old: any; new: any }>;
  unchanged: string[];
}

@Injectable()
export class DataTransformService {
  private readonly logger = new Logger(DataTransformService.name);

  transform<T = any>(
    data: any,
    options?: TransformOptions,
  ): T {
    if (!data || typeof data !== 'object') {
      return data;
    }

    let result = this.deepClone(data);

    if (options?.excludeFields) {
      result = this.excludeFields(result, options.excludeFields);
    }

    if (options?.includeFields) {
      result = this.includeFields(result, options.includeFields);
    }

    if (options?.renameFields) {
      result = this.renameFields(result, options.renameFields);
    }

    if (options?.transformFields) {
      result = this.transformFields(result, options.transformFields);
    }

    if (!options?.preserveNull) {
      result = this.removeNulls(result);
    }

    if (!options?.preserveUndefined) {
      result = this.removeUndefined(result);
    }

    return result;
  }

  flatten(
    data: Record<string, any>,
    options?: FlattenOptions,
  ): Record<string, any> {
    const separator = options?.separator || '.';
    const maxDepth = options?.maxDepth || Infinity;
    const preserveArrays = options?.preserveArrays ?? true;

    return this.flattenObject(data, separator, maxDepth, preserveArrays, 0);
  }

  unflatten(
    data: Record<string, any>,
    separator: string = '.',
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      const parts = key.split(separator);
      let current = result;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part];
      }

      current[parts[parts.length - 1]] = value;
    }

    return result;
  }

  diff(
    oldData: Record<string, any>,
    newData: Record<string, any>,
  ): DiffResult {
    const added: Record<string, any> = {};
    const removed: Record<string, any> = {};
    const changed: Record<string, { old: any; new: any }> = {};
    const unchanged: string[] = [];

    const allKeys = new Set([
      ...Object.keys(oldData),
      ...Object.keys(newData),
    ]);

    for (const key of allKeys) {
      const oldValue = oldData[key];
      const newValue = newData[key];

      if (!(key in oldData)) {
        added[key] = newValue;
      } else if (!(key in newData)) {
        removed[key] = oldValue;
      } else if (this.isEqual(oldValue, newValue)) {
        unchanged.push(key);
      } else {
        changed[key] = { old: oldValue, new: newValue };
      }
    }

    return { added, removed, changed, unchanged };
  }

  deepClone<T>(data: T): T {
    if (data === null || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.deepClone(item)) as any;
    }

    if (data instanceof Date) {
      return new Date(data.getTime()) as any;
    }

    if (data instanceof Buffer) {
      return Buffer.from(data) as any;
    }

    const cloned: any = {};
    for (const [key, value] of Object.entries(data)) {
      cloned[key] = this.deepClone(value);
    }

    return cloned;
  }

  deepMerge<T extends Record<string, any>>(
    target: T,
    ...sources: Partial<T>[]
  ): T {
    if (!sources.length) return target;

    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) {
            Object.assign(target, { [key]: {} });
          }
          this.deepMerge(target[key] as Record<string, any>, source[key] as Record<string, any>);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this.deepMerge(target, ...sources);
  }

  pick<T extends Record<string, any>, K extends keyof T>(
    data: T,
    keys: K[],
  ): Pick<T, K> {
    const result: any = {};

    for (const key of keys) {
      if (key in data) {
        result[key] = data[key];
      }
    }

    return result;
  }

  omit<T extends Record<string, any>, K extends keyof T>(
    data: T,
    keys: K[],
  ): Omit<T, K> {
    const result: any = {};
    const keySet = new Set(keys);

    for (const [key, value] of Object.entries(data)) {
      if (!keySet.has(key as K)) {
        result[key] = value;
      }
    }

    return result;
  }

  get(
    data: Record<string, any>,
    path: string,
    defaultValue?: any,
  ): any {
    const keys = path.split('.');
    let result = data;

    for (const key of keys) {
      if (result === null || result === undefined) {
        return defaultValue;
      }

      if (Array.isArray(result)) {
        const index = parseInt(key, 10);
        if (isNaN(index)) {
          return defaultValue;
        }
        result = result[index];
      } else {
        result = result[key];
      }
    }

    return result !== undefined ? result : defaultValue;
  }

  set(
    data: Record<string, any>,
    path: string,
    value: any,
  ): Record<string, any> {
    const keys = path.split('.');
    let current = data;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];

      if (!(key in current)) {
        current[key] = {};
      }

      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    return data;
  }

  toCamelCase(data: Record<string, any>): Record<string, any> {
    return this.transformKeys(data, (key) => this.toCamelCaseString(key));
  }

  toSnakeCase(data: Record<string, any>): Record<string, any> {
    return this.transformKeys(data, (key) => this.toSnakeCaseString(key));
  }

  toPascalCase(data: Record<string, any>): Record<string, any> {
    return this.transformKeys(data, (key) => this.toPascalCaseString(key));
  }

  toKebabCase(data: Record<string, any>): Record<string, any> {
    return this.transformKeys(data, (key) => this.toKebabCaseString(key));
  }

  toArray<T>(data: Record<string, T>): Array<{ key: string; value: T }> {
    return Object.entries(data).map(([key, value]) => ({ key, value }));
  }

  fromArray<T>(data: Array<{ key: string; value: T }>): Record<string, T> {
    const result: Record<string, T> = {};

    for (const { key, value } of data) {
      result[key] = value;
    }

    return result;
  }

  groupBy<T>(
    data: T[],
    keyFn: (item: T) => string,
  ): Record<string, T[]> {
    const result: Record<string, T[]> = {};

    for (const item of data) {
      const key = keyFn(item);

      if (!result[key]) {
        result[key] = [];
      }

      result[key].push(item);
    }

    return result;
  }

  sortBy<T>(
    data: T[],
    keyFn: (item: T) => any,
    order: 'asc' | 'desc' = 'asc',
  ): T[] {
    const sorted = [...data].sort((a, b) => {
      const aVal = keyFn(a);
      const bVal = keyFn(b);

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }

  uniqueBy<T>(
    data: T[],
    keyFn: (item: T) => any,
  ): T[] {
    const seen = new Set();
    const result: T[] = [];

    for (const item of data) {
      const key = keyFn(item);

      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }

    return result;
  }

  private flattenObject(
    obj: Record<string, any>,
    separator: string,
    maxDepth: number,
    preserveArrays: boolean,
    currentDepth: number,
    prefix: string = '',
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}${separator}${key}` : key;

      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        currentDepth < maxDepth
      ) {
        Object.assign(
          result,
          this.flattenObject(value, separator, maxDepth, preserveArrays, currentDepth + 1, newKey),
        );
      } else if (Array.isArray(value) && !preserveArrays && currentDepth < maxDepth) {
        value.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            Object.assign(
              result,
              this.flattenObject(
                item,
                separator,
                maxDepth,
                preserveArrays,
                currentDepth + 1,
                `${newKey}${separator}${index}`,
              ),
            );
          } else {
            result[`${newKey}${separator}${index}`] = item;
          }
        });
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }

  private excludeFields(
    data: any,
    fields: string[],
  ): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.excludeFields(item, fields));
    }

    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const result: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (!fields.includes(key)) {
        result[key] = this.excludeFields(value, fields);
      }
    }

    return result;
  }

  private includeFields(
    data: any,
    fields: string[],
  ): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.includeFields(item, fields));
    }

    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const result: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (fields.includes(key)) {
        result[key] = this.includeFields(value, fields);
      }
    }

    return result;
  }

  private renameFields(
    data: any,
    renames: Record<string, string>,
  ): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.renameFields(item, renames));
    }

    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const result: any = {};

    for (const [key, value] of Object.entries(data)) {
      const newKey = renames[key] || key;
      result[newKey] = this.renameFields(value, renames);
    }

    return result;
  }

  private transformFields(
    data: any,
    transformers: Record<string, (value: any) => any>,
  ): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.transformFields(item, transformers));
    }

    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const result: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (transformers[key]) {
        result[key] = transformers[key](value);
      } else {
        result[key] = this.transformFields(value, transformers);
      }
    }

    return result;
  }

  private removeNulls(data: any): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.removeNulls(item)).filter((item) => item !== null);
    }

    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const result: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (value !== null) {
        result[key] = this.removeNulls(value);
      }
    }

    return result;
  }

  private removeUndefined(data: any): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.removeUndefined(item)).filter((item) => item !== undefined);
    }

    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const result: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        result[key] = this.removeUndefined(value);
      }
    }

    return result;
  }

  private isObject(value: any): value is Record<string, any> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private isEqual(a: any, b: any): boolean {
    if (a === b) return true;

    if (typeof a !== typeof b) return false;

    if (typeof a !== 'object' || a === null || b === null) {
      return a === b;
    }

    if (Array.isArray(a) !== Array.isArray(b)) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!this.isEqual(a[key], b[key])) return false;
    }

    return true;
  }

  private transformKeys(
    data: any,
    transformer: (key: string) => string,
  ): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.transformKeys(item, transformer));
    }

    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const result: any = {};

    for (const [key, value] of Object.entries(data)) {
      result[transformer(key)] = this.transformKeys(value, transformer);
    }

    return result;
  }

  private toCamelCaseString(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, (c) => c.toLowerCase());
  }

  private toSnakeCaseString(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[-\s]/g, '_')
      .toLowerCase();
  }

  private toPascalCaseString(str: string): string {
    const camel = this.toCamelCaseString(str);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  }

  private toKebabCaseString(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[_\s]/g, '-')
      .toLowerCase();
  }
}
