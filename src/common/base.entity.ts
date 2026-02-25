import { PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

class SnowflakeIdGenerator {
  private static instance: SnowflakeIdGenerator;
  private epoch = 1609459200000;
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

export abstract class BaseEntity {
  @PrimaryColumn({ 
    type: 'bigint', 
    nullable: false, 
    transformer: {
      to: (value: string) => value,
      from: (value: any) => value.toString()
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
    this.id = SnowflakeIdGenerator.getInstance().generate().toString();
    this.uuid = uuidv4();
  }

  setUUID(uuid: string): void {
    if (!this.uuid) {
      this.uuid = uuid;
    }
  }
}
