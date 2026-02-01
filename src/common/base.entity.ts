import { PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

// 雪花算法生成器
class SnowflakeIdGenerator {
  private static instance: SnowflakeIdGenerator;
  private epoch = 1609459200000; // 2021-01-01 00:00:00 UTC
  private workerId: number;
  private datacenterId: number;
  private sequence = 0;
  private lastTimestamp = -1;

  private constructor(workerId: number = 1, datacenterId: number = 1) {
    this.workerId = workerId;
    this.datacenterId = datacenterId;
  }

  public static getInstance(): SnowflakeIdGenerator {
    if (!SnowflakeIdGenerator.instance) {
      SnowflakeIdGenerator.instance = new SnowflakeIdGenerator();
    }
    return SnowflakeIdGenerator.instance;
  }

  public generate(): number {
    let timestamp = Date.now();

    if (timestamp < this.lastTimestamp) {
      throw new Error('Clock moved backwards. Refusing to generate id.');
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & 4095;
      if (this.sequence === 0) {
        timestamp = this.waitNextMillis(this.lastTimestamp);
      }
    } else {
      this.sequence = 0;
    }

    this.lastTimestamp = timestamp;

    return ((timestamp - this.epoch) << 22) |
           (this.datacenterId << 17) |
           (this.workerId << 12) |
           this.sequence;
  }

  private waitNextMillis(lastTimestamp: number): number {
    let timestamp = Date.now();
    while (timestamp <= lastTimestamp) {
      timestamp = Date.now();
    }
    return timestamp;
  }
}

// 基础实体类
export abstract class BaseEntity {
  @PrimaryColumn({ type: 'bigint', nullable: false, transformer: {
    to: (value: string) => value,
    from: (value: any) => value.toString()
  } })
  id: string;

  @Column({ type: 'varchar', length: 36, unique: true, nullable: false })
  uuid: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  constructor() {
    // 生成雪花ID并转换为字符串
    this.id = SnowflakeIdGenerator.getInstance().generate().toString();
    // 生成UUID
    this.uuid = uuidv4();
  }

  // 确保uuid不可变
  setUUID(uuid: string): void {
    if (!this.uuid) {
      this.uuid = uuid;
    }
  }
}
