/**
 * 增强型 ID 生成器服务
 * 
 * 提供多种 ID 生成策略：Snowflake、UUID、ULID、NanoID 等
 * 支持分布式 ID 生成、ID 格式化、ID 解析等功能
 * 
 * @framework
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';

/**
 * ID 生成策略
 */
export type IdStrategy = 'snowflake' | 'uuid' | 'uuidv4' | 'uuidv7' | 'ulid' | 'nanoid' | 'ksuid' | 'cuid' | 'increment';

/**
 * ID 生成选项
 */
export interface IdGeneratorOptions {
  /** ID 策略 */
  strategy?: IdStrategy;
  /** ID 前缀 */
  prefix?: string;
  /** ID 长度（针对 nanoid 等） */
  length?: number;
  /** 是否可排序 */
  sortable?: boolean;
  /** 是否 URL 安全 */
  urlSafe?: boolean;
  /** 数据中心 ID（Snowflake） */
  datacenterId?: number;
  /** 工作机器 ID（Snowflake） */
  workerId?: number;
}

/**
 * 生成的 ID 对象
 */
export interface GeneratedId {
  /** ID 字符串 */
  id: string;
  /** ID 数字形式（如果适用） */
  idNum?: bigint;
  /** 生成时间戳 */
  timestamp: number;
  /** ID 策略 */
  strategy: IdStrategy;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * Snowflake ID 生成器配置
 */
interface SnowflakeConfig {
  datacenterId: number;
  workerId: number;
  sequence: number;
  lastTimestamp: number;
  sequenceBits: number;
  workerBits: number;
  datacenterBits: number;
  timestampBits: number;
  maxSequence: number;
  workerShift: number;
  datacenterShift: number;
  timestampShift: number;
}

/**
 * 增强型 ID 生成器服务
 */
@Injectable()
export class IdGeneratorService implements OnModuleInit {
  private readonly logger = new Logger(IdGeneratorService.name);
  private readonly defaultStrategy: IdStrategy;
  private readonly defaultOptions: Required<IdGeneratorOptions>;
  private snowflakeConfig: SnowflakeConfig | null = null;
  private incrementCounter: number = 0;
  private readonly incrementPrefix: string;

  constructor(private readonly configService: ConfigService) {
    this.defaultStrategy = (this.configService.get<IdStrategy>('ID_GENERATOR_STRATEGY', 'snowflake'));
    
    this.defaultOptions = {
      strategy: this.defaultStrategy,
      prefix: this.configService.get<string>('ID_GENERATOR_PREFIX', ''),
      length: this.configService.get<number>('ID_GENERATOR_LENGTH', 21),
      sortable: this.configService.get<boolean>('ID_GENERATOR_SORTABLE', true),
      urlSafe: this.configService.get<boolean>('ID_GENERATOR_URL_SAFE', true),
      datacenterId: this.configService.get<number>('ID_GENERATOR_DATACENTER_ID', 1),
      workerId: this.configService.get<number>('ID_GENERATOR_WORKER_ID', 1),
    };

    this.incrementPrefix = this.configService.get<string>('ID_GENERATOR_INCREMENT_PREFIX', 'id');
  }

  onModuleInit() {
    if (this.defaultStrategy === 'snowflake') {
      this.initializeSnowflake();
    }
    this.logger.log(`IdGeneratorService initialized with strategy: ${this.defaultStrategy}`);
  }

  /**
   * 生成 ID（默认策略）
   */
  generate(options?: IdGeneratorOptions): string {
    return this.generateId(options).id;
  }

  /**
   * 生成 ID 对象
   */
  generateId(options?: IdGeneratorOptions): GeneratedId {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const strategy = options?.strategy || this.defaultStrategy;
    const timestamp = Date.now();

    let id: string;
    let idNum: bigint | undefined;
    let metadata: Record<string, any> | undefined;

    switch (strategy) {
      case 'snowflake':
        const snowflakeResult = this.generateSnowflake();
        id = snowflakeResult.id;
        idNum = snowflakeResult.idNum;
        metadata = snowflakeResult.metadata;
        break;
      case 'uuid':
      case 'uuidv4':
        id = this.generateUUID();
        break;
      case 'uuidv7':
        id = this.generateUUIDv7();
        break;
      case 'ulid':
        id = this.generateULID();
        break;
      case 'nanoid':
        id = this.generateNanoID(mergedOptions.length);
        break;
      case 'ksuid':
        id = this.generateKSUID();
        break;
      case 'cuid':
        id = this.generateCUID();
        break;
      case 'increment':
        id = this.generateIncrement();
        break;
      default:
        id = this.generateSnowflake().id;
    }

    // 添加前缀
    if (mergedOptions.prefix) {
      id = `${mergedOptions.prefix}_${id}`;
    }

    return {
      id,
      idNum,
      timestamp,
      strategy,
      metadata,
    };
  }

  /**
   * 批量生成 ID
   */
  generateBatch(count: number, options?: IdGeneratorOptions): string[] {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(this.generate(options));
    }
    return ids;
  }

  /**
   * 生成 Snowflake ID
   */
  generateSnowflake(): { id: string; idNum: bigint; metadata: Record<string, any> } {
    if (!this.snowflakeConfig) {
      this.initializeSnowflake();
    }

    const config = this.snowflakeConfig!;
    let timestamp = Date.now();

    // 等待时间递增
    if (timestamp < config.lastTimestamp) {
      throw new Error('Clock moved backwards. Refusing to generate ID.');
    }

    if (timestamp === config.lastTimestamp) {
      config.sequence = (config.sequence + 1) & config.maxSequence;
      if (config.sequence === 0) {
        // 序列溢出，等待下一毫秒
        timestamp = this.waitNextMillis(config.lastTimestamp);
      }
    } else {
      config.sequence = 0;
    }

    config.lastTimestamp = timestamp;

    const idNum =
      ((BigInt(timestamp) - BigInt(this.getEpoch())) << BigInt(config.timestampShift)) |
      (BigInt(config.datacenterId) << BigInt(config.datacenterShift)) |
      (BigInt(config.workerId) << BigInt(config.workerShift)) |
      BigInt(config.sequence);

    return {
      id: idNum.toString(),
      idNum,
      metadata: {
        timestamp,
        datacenterId: config.datacenterId,
        workerId: config.workerId,
        sequence: config.sequence,
      },
    };
  }

  /**
   * 生成 UUID v4
   */
  generateUUID(): string {
    return randomBytes(16).toString('hex').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
  }

  /**
   * 生成 UUID v7（时间排序）
   */
  generateUUIDv7(): string {
    const timestamp = Date.now();
    const random = randomBytes(10);
    
    const timeBytes = Buffer.alloc(6);
    timeBytes.writeUIntBE(timestamp, 0, 6);
    
    const uuid = Buffer.concat([timeBytes, random]);
    
    // 设置版本号为 7
    uuid[6] = (uuid[6] & 0x0f) | 0x70;
    // 设置 variant
    uuid[8] = (uuid[8] & 0x3f) | 0x80;
    
    return uuid.toString('hex').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
  }

  /**
   * 生成 ULID
   */
  generateULID(): string {
    const timestamp = Date.now();
    const random = randomBytes(10);
    
    const timePart = this.encodeTime(timestamp, 10);
    const randomPart = this.encodeRandom(random);
    
    return timePart + randomPart;
  }

  /**
   * 生成 NanoID
   */
  generateNanoID(size: number = 21): string {
    const alphabet = 'ModuleSymbhasOwnPr0123456789ABCDEFGHNRVfgctiUvz_KqYTJkLxpZXIjQW';
    const bytes = randomBytes(size);
    let id = '';
    
    for (let i = 0; i < size; i++) {
      id += alphabet[bytes[i] % alphabet.length];
    }
    
    return id;
  }

  /**
   * 生成 KSUID（K-Sortable Unique ID）
   */
  generateKSUID(): string {
    const epoch = 1400000000; // 2014-05-13
    const timestamp = Math.floor(Date.now() / 1000) - epoch;
    const payload = randomBytes(16);
    
    const timeBytes = Buffer.alloc(4);
    timeBytes.writeUInt32BE(timestamp, 0);
    
    const ksuid = Buffer.concat([timeBytes, payload]);
    return this.encodeBase62(ksuid);
  }

  /**
   * 生成 CUID
   */
  generateCUID(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(4).toString('hex');
    const counter = (this.incrementCounter++).toString(36);
    const fingerprint = this.getFingerprint();
    
    return `c${timestamp}${random}${counter}${fingerprint}`;
  }

  /**
   * 生成自增 ID
   */
  generateIncrement(): string {
    const timestamp = Date.now().toString(36);
    const counter = (this.incrementCounter++).toString(36).padStart(6, '0');
    return `${this.incrementPrefix}_${timestamp}_${counter}`;
  }

  /**
   * 解析 Snowflake ID
   */
  parseSnowflake(id: string): {
    timestamp: number;
    datacenterId: number;
    workerId: number;
    sequence: number;
  } | null {
    try {
      const idNum = BigInt(id);
      const config = this.snowflakeConfig!;
      const epoch = this.getEpoch();
      
      const timestamp = Number((idNum >> BigInt(config.timestampShift)) + BigInt(epoch));
      const datacenterId = Number((idNum >> BigInt(config.datacenterShift)) & BigInt(31));
      const workerId = Number((idNum >> BigInt(config.workerShift)) & BigInt(31));
      const sequence = Number(idNum & BigInt(4095));
      
      return { timestamp, datacenterId, workerId, sequence };
    } catch {
      return null;
    }
  }

  /**
   * 从 ID 提取时间戳
   */
  extractTimestamp(id: string, strategy?: IdStrategy): number | null {
    switch (strategy || this.defaultStrategy) {
      case 'snowflake':
        const parsed = this.parseSnowflake(id);
        return parsed?.timestamp || null;
      case 'uuidv7':
      case 'ulid':
      case 'ksuid':
        // 这些 ID 的前缀是时间戳
        try {
          if (strategy === 'ulid') {
            return this.decodeTime(id.substring(0, 10));
          }
          if (strategy === 'ksuid') {
            const timeBytes = Buffer.from(id.substring(0, 8), 'base64');
            return timeBytes.readUInt32BE(0) * 1000;
          }
        } catch {
          return null;
        }
        return null;
      default:
        return null;
    }
  }

  /**
   * 验证 ID 格式
   */
  validateId(id: string, strategy?: IdStrategy): boolean {
    const actualStrategy = strategy || this.defaultStrategy;
    
    switch (actualStrategy) {
      case 'snowflake':
        return /^\d+$/.test(id) && id.length > 0;
      case 'uuid':
      case 'uuidv4':
        return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      case 'uuidv7':
        return /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      case 'ulid':
        return /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(id);
      case 'nanoid':
        return /^[A-Za-z0-9_-]+$/.test(id);
      case 'ksuid':
        return /^[A-Za-z0-9]{27}$/.test(id);
      case 'cuid':
        return /^c[A-Za-z0-9]+$/.test(id);
      default:
        return id.length > 0;
    }
  }

  /**
   * 初始化 Snowflake 配置
   */
  private initializeSnowflake(): void {
    const workerId = this.defaultOptions.workerId & 1023;
    const datacenterId = this.defaultOptions.datacenterId & 31;
    
    this.snowflakeConfig = {
      datacenterId,
      workerId,
      sequence: 0,
      lastTimestamp: -1,
      sequenceBits: 12,
      workerBits: 10,
      datacenterBits: 5,
      timestampBits: 41,
      maxSequence: 4095, // 2^12 - 1
      workerShift: 12,
      datacenterShift: 17, // 12 + 5
      timestampShift: 22, // 12 + 5 + 5
    };
    
    this.logger.log(`Snowflake initialized with workerId=${workerId}, datacenterId=${datacenterId}`);
  }

  /**
   * 等待下一毫秒
   */
  private waitNextMillis(lastTimestamp: number): number {
    let timestamp = Date.now();
    while (timestamp <= lastTimestamp) {
      timestamp = Date.now();
    }
    return timestamp;
  }

  /**
   * 获取纪元时间
   */
  private getEpoch(): number {
    return 1288834974657; // Twitter Snowflake epoch
  }

  /**
   * 编码时间（ULID）
   */
  private encodeTime(timestamp: number, size: number): string {
    const base32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    let encoded = '';
    let remaining = timestamp;
    
    for (let i = 0; i < size; i++) {
      encoded = base32[remaining % 32] + encoded;
      remaining = Math.floor(remaining / 32);
    }
    
    return encoded;
  }

  /**
   * 解码时间（ULID）
   */
  private decodeTime(encoded: string): number {
    const base32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    let timestamp = 0;
    
    for (let i = 0; i < encoded.length; i++) {
      timestamp = timestamp * 32 + base32.indexOf(encoded[i].toUpperCase());
    }
    
    return timestamp;
  }

  /**
   * 编码随机数（ULID）
   */
  private encodeRandom(random: Buffer): string {
    const base32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    let encoded = '';
    
    for (let i = 0; i < random.length; i++) {
      const byte = random[i];
      encoded += base32[(byte >> 3) & 31];
      if (i < random.length - 1 || (byte & 7) > 0) {
        encoded += base32[byte & 7];
      }
    }
    
    return encoded;
  }

  /**
   * Base62 编码
   */
  private encodeBase62(buffer: Buffer): string {
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const base = BigInt(62);
    
    let num = BigInt('0x' + buffer.toString('hex'));
    let encoded = '';
    
    while (num > 0n) {
      const remainder = num % base;
      num = num / base;
      encoded = alphabet[Number(remainder)] + encoded;
    }
    
    return encoded.padStart(27, '0');
  }

  /**
   * 生成指纹（CUID）
   */
  private getFingerprint(): string {
    const pid = process.pid || 0;
    const hostname = process.env.HOSTNAME || 'localhost';
    const hash = createHash('sha256');
    hash.update(`${pid}${hostname}${Date.now()}`);
    return hash.digest('hex').substring(0, 4);
  }
}

/**
 * ID 生成装饰器
 */
export function GenerateId(options?: IdGeneratorOptions) {
  return function (target: any, propertyKey: string) {
    const privateKey = `_${propertyKey}`;
    
    Object.defineProperty(target, propertyKey, {
      get() {
        return this[privateKey];
      },
      set(value: string | undefined) {
        if (!value) {
          const idGenerator = (this as any).idGenerator as IdGeneratorService;
          if (idGenerator) {
            this[privateKey] = idGenerator.generate(options);
            return;
          }
        }
        this[privateKey] = value;
      },
    });
  };
}
