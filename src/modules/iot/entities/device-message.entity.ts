/**
 * 设备消息实体
 * 用于存储IoT设备消息
 */

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DeviceEntity } from './device.entity';

export enum DeviceMessageType {
  COMMAND = 'command',  // 命令消息
  STATUS = 'status',    // 状态消息
  EVENT = 'event',      // 事件消息
  ERROR = 'error',      // 错误消息
}

export enum DeviceMessageDirection {
  TO_DEVICE = 'to_device',    // 发送到设备
  FROM_DEVICE = 'from_device', // 来自设备
}

@Entity('device_messages')
export class DeviceMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  deviceId: string; // 设备ID

  @ManyToOne(() => DeviceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deviceId', referencedColumnName: 'deviceId' })
  device: DeviceEntity;

  @Column({ type: 'enum', enum: DeviceMessageType, default: DeviceMessageType.EVENT })
  type: DeviceMessageType; // 消息类型

  @Column({ type: 'enum', enum: DeviceMessageDirection, default: DeviceMessageDirection.FROM_DEVICE })
  direction: DeviceMessageDirection; // 消息方向

  @Column({ type: 'json', nullable: false })
  payload: any; // 消息内容

  @Column({ type: 'varchar', length: 255, nullable: true })
  topic: string; // 消息主题

  @Column({ type: 'boolean', default: false })
  processed: boolean; // 消息是否已处理

  @Column({ type: 'varchar', length: 255, nullable: true })
  error: string; // 处理错误信息

  @CreateDateColumn()
  createdAt: Date;
}
