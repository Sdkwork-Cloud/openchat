import { Injectable, Logger } from '@nestjs/common';

export type MappingRule<S, T> = {
  sourceKey: keyof S;
  targetKey: keyof T;
  transform?: (value: any, source: S) => any;
  condition?: (source: S) => boolean;
  defaultValue?: any;
};

export interface MapperConfig<S, T> {
  rules: MappingRule<S, T>[];
  beforeMap?: (source: S) => S | Promise<S>;
  afterMap?: (target: T, source: S) => T | Promise<T>;
  ignoreNull?: boolean;
  ignoreUndefined?: boolean;
}

export interface MapperOptions {
  ignoreNull?: boolean;
  ignoreUndefined?: boolean;
  excludeFields?: string[];
  includeFields?: string[];
}

@Injectable()
export abstract class BaseMapper<S extends Record<string, any>, T extends Record<string, any>> {
  protected readonly logger: Logger;
  protected readonly config: MapperConfig<S, T>;

  constructor(config?: Partial<MapperConfig<S, T>>) {
    this.logger = new Logger(this.constructor.name);
    this.config = {
      rules: config?.rules || [],
      beforeMap: config?.beforeMap,
      afterMap: config?.afterMap,
      ignoreNull: config?.ignoreNull ?? true,
      ignoreUndefined: config?.ignoreUndefined ?? true,
    };
  }

  abstract map(source: S, options?: MapperOptions): T;

  mapMany(sources: S[], options?: MapperOptions): T[] {
    return sources.map((source) => this.map(source, options));
  }

  mapPartial(source: Partial<S>, options?: MapperOptions): Partial<T> {
    return this.map(source as S, options) as Partial<T>;
  }

  reverseMap(target: T, options?: MapperOptions): S {
    const result: any = {};

    for (const rule of this.config.rules) {
      if (options?.excludeFields?.includes(rule.targetKey as string)) {
        continue;
      }

      const targetValue = (target as any)[rule.targetKey];

      if (targetValue === null && this.config.ignoreNull) continue;
      if (targetValue === undefined && this.config.ignoreUndefined) continue;

      if (rule.transform) {
        result[rule.sourceKey] = rule.transform(targetValue, target as unknown as S);
      } else {
        result[rule.sourceKey] = targetValue;
      }
    }

    return result;
  }

  protected applyRules(source: S, target: any, options?: MapperOptions): any {
    for (const rule of this.config.rules) {
      if (options?.excludeFields?.includes(rule.targetKey as string)) {
        continue;
      }

      if (options?.includeFields && !options.includeFields.includes(rule.targetKey as string)) {
        continue;
      }

      if (rule.condition && !rule.condition(source)) {
        continue;
      }

      let value = (source as any)[rule.sourceKey];

      if (value === null && this.config.ignoreNull) continue;
      if (value === undefined && this.config.ignoreUndefined) continue;

      if (value === undefined && rule.defaultValue !== undefined) {
        value = rule.defaultValue;
      }

      if (rule.transform) {
        value = rule.transform(value, source);
      }

      target[rule.targetKey] = value;
    }

    return target;
  }

  protected async applyBeforeMap(source: S): Promise<S> {
    if (this.config.beforeMap) {
      return await this.config.beforeMap(source);
    }
    return source;
  }

  protected async applyAfterMap(target: T, source: S): Promise<T> {
    if (this.config.afterMap) {
      return await this.config.afterMap(target, source);
    }
    return target;
  }
}

export function createMapper<S extends Record<string, any>, T extends Record<string, any>>(
  config: MapperConfig<S, T>,
): new () => BaseMapper<S, T> {
  return class extends BaseMapper<S, T> {
    constructor() {
      super(config);
    }

    map(source: S, options?: MapperOptions): T {
      const target: any = {};
      this.applyRules(source, target, options);
      return target;
    }
  };
}

export function autoMap<S extends Record<string, any>, T extends Record<string, any>>(
  source: S,
  options?: MapperOptions,
): T {
  const target: any = {};

  for (const [key, value] of Object.entries(source)) {
    if (options?.excludeFields?.includes(key)) {
      continue;
    }

    if (options?.includeFields && !options.includeFields.includes(key)) {
      continue;
    }

    if (value === null && options?.ignoreNull !== false) continue;
    if (value === undefined && options?.ignoreUndefined !== false) continue;

    target[key] = value;
  }

  return target;
}

@Injectable()
export class ObjectMapper {
  private readonly logger = new Logger(ObjectMapper.name);
  private readonly mappers = new Map<string, BaseMapper<any, any>>();

  register(name: string, mapper: BaseMapper<any, any>): void {
    this.mappers.set(name, mapper);
    this.logger.debug(`Mapper registered: ${name}`);
  }

  get<S extends Record<string, any>, T extends Record<string, any>>(
    name: string,
  ): BaseMapper<S, T> | undefined {
    return this.mappers.get(name);
  }

  map<S extends Record<string, any>, T extends Record<string, any>>(
    name: string,
    source: S,
    options?: MapperOptions,
  ): T {
    const mapper = this.mappers.get(name);
    if (!mapper) {
      throw new Error(`Mapper not found: ${name}`);
    }
    return mapper.map(source, options);
  }

  mapMany<S extends Record<string, any>, T extends Record<string, any>>(
    name: string,
    sources: S[],
    options?: MapperOptions,
  ): T[] {
    const mapper = this.mappers.get(name);
    if (!mapper) {
      throw new Error(`Mapper not found: ${name}`);
    }
    return mapper.mapMany(sources, options);
  }
}

export interface MappingProfile {
  sourceType: string;
  targetType: string;
  mappings: Array<{
    source: string;
    target: string;
    transform?: string;
  }>;
}

export function createMappingRules<S extends Record<string, any>, T extends Record<string, any>>(
  profile: MappingProfile,
): MappingRule<S, T>[] {
  return profile.mappings.map((m) => ({
    sourceKey: m.source as keyof S,
    targetKey: m.target as keyof T,
    transform: m.transform ? new Function('value', 'source', `return ${m.transform}`) as any : undefined,
  }));
}
