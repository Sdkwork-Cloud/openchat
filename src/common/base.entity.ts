import { PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

class SnowflakeIdGenerator {
  private static instance: SnowflakeIdGenerator;
  private static readonly WORKER_ID_BITS = 5n;
  private static readonly DATACENTER_ID_BITS = 5n;
  private static readonly SEQUENCE_BITS = 12n;
  private static readonly MAX_WORKER_ID = (1n << SnowflakeIdGenerator.WORKER_ID_BITS) - 1n;
  private static readonly MAX_DATACENTER_ID = (1n << SnowflakeIdGenerator.DATACENTER_ID_BITS) - 1n;
  private static readonly SEQUENCE_MASK = (1n << SnowflakeIdGenerator.SEQUENCE_BITS) - 1n;
  private static readonly WORKER_ID_SHIFT = SnowflakeIdGenerator.SEQUENCE_BITS;
  private static readonly DATACENTER_ID_SHIFT =
    SnowflakeIdGenerator.SEQUENCE_BITS + SnowflakeIdGenerator.WORKER_ID_BITS;
  private static readonly TIMESTAMP_LEFT_SHIFT =
    SnowflakeIdGenerator.SEQUENCE_BITS
    + SnowflakeIdGenerator.WORKER_ID_BITS
    + SnowflakeIdGenerator.DATACENTER_ID_BITS;

  private readonly epoch = 1609459200000n;
  private readonly workerId: bigint;
  private readonly datacenterId: bigint;
  private sequence = 0n;
  private lastTimestamp = -1n;

  private constructor(workerId: bigint = 1n, datacenterId: bigint = 1n) {
    if (workerId < 0n || workerId > SnowflakeIdGenerator.MAX_WORKER_ID) {
      throw new Error(
        `Snowflake workerId must be 0~${SnowflakeIdGenerator.MAX_WORKER_ID.toString()}`,
      );
    }
    if (datacenterId < 0n || datacenterId > SnowflakeIdGenerator.MAX_DATACENTER_ID) {
      throw new Error(
        `Snowflake datacenterId must be 0~${SnowflakeIdGenerator.MAX_DATACENTER_ID.toString()}`,
      );
    }
    this.workerId = workerId;
    this.datacenterId = datacenterId;
  }

  public static getInstance(): SnowflakeIdGenerator {
    if (!SnowflakeIdGenerator.instance) {
      SnowflakeIdGenerator.instance = new SnowflakeIdGenerator(
        SnowflakeIdGenerator.readNodeId(
          'SNOWFLAKE_WORKER_ID',
          1n,
          SnowflakeIdGenerator.MAX_WORKER_ID,
        ),
        SnowflakeIdGenerator.readNodeId(
          'SNOWFLAKE_DATACENTER_ID',
          1n,
          SnowflakeIdGenerator.MAX_DATACENTER_ID,
        ),
      );
    }
    return SnowflakeIdGenerator.instance;
  }

  private static readNodeId(name: string, defaultValue: bigint, max: bigint): bigint {
    const raw = process.env[name];
    if (!raw || raw.trim().length === 0) {
      return defaultValue;
    }
    const normalized = raw.trim();
    if (!/^\d+$/.test(normalized)) {
      throw new Error(`${name} must be an integer in 0~${max.toString()}`);
    }
    const parsed = BigInt(normalized);
    if (parsed < 0n || parsed > max) {
      throw new Error(`${name} must be in 0~${max.toString()}`);
    }
    return parsed;
  }

  public generate(): string {
    let timestamp = BigInt(Date.now());

    if (timestamp < this.lastTimestamp) {
      throw new Error('Clock moved backwards. Refusing to generate id.');
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & SnowflakeIdGenerator.SEQUENCE_MASK;
      if (this.sequence === 0n) {
        timestamp = this.waitNextMillis(this.lastTimestamp);
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    const id =
      ((timestamp - this.epoch) << SnowflakeIdGenerator.TIMESTAMP_LEFT_SHIFT)
      | (this.datacenterId << SnowflakeIdGenerator.DATACENTER_ID_SHIFT)
      | (this.workerId << SnowflakeIdGenerator.WORKER_ID_SHIFT)
      | this.sequence;
    return id.toString();
  }

  private waitNextMillis(lastTimestamp: bigint): bigint {
    let timestamp = BigInt(Date.now());
    while (timestamp <= lastTimestamp) {
      timestamp = BigInt(Date.now());
    }
    return timestamp;
  }
}

export abstract class BaseEntity {
  @PrimaryColumn({ 
    type: 'bigint', 
    nullable: false, 
    transformer: {
      to: (value: string) => value,
      from: (value: unknown): string => {
        if (typeof value === 'string') {
          return value;
        }
        if (typeof value === 'number' || typeof value === 'bigint') {
          return value.toString();
        }
        if (value === null || value === undefined) {
          return '';
        }
        return String(value);
      },
    }
  })
  id: string;

  @Column({ 
    type: 'varchar', 
    length: 36, 
    unique: true, 
    nullable: false 
  })
  uuid: string;

  @Column({ 
    type: 'boolean', 
    default: false,
    name: 'is_deleted'
  })
  isDeleted: boolean;

  @CreateDateColumn({ 
    name: 'created_at' 
  })
  createdAt: Date;

  @UpdateDateColumn({ 
    name: 'updated_at' 
  })
  updatedAt: Date;

  constructor() {
    this.id = SnowflakeIdGenerator.getInstance().generate();
    this.uuid = uuidv4();
  }

  setUUID(uuid: string): void {
    if (!this.uuid) {
      this.uuid = uuid;
    }
  }
}
