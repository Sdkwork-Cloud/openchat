/**
 * 设备实体
 * 用于存储IoT设备信息
 */

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';

export enum DeviceType {
  XIAOZHI = 'xiaozhi',  // 开源小智设备
  OTHER = 'other',      // 其他IoT设备
}

export enum DeviceStatus {
  ONLINE = 'online',     // 在线
  OFFLINE = 'offline',   // 离线
  UNKNOWN = 'unknown',   // 未知
}

@Entity('devices')
export class DeviceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  deviceId: string; // 设备唯一标识

  @Column({ type: 'enum', enum: DeviceType, default: DeviceType.OTHER })
  type: DeviceType; // 设备类型

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string; // 设备名称

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string; // 设备描述

  @Column({ type: 'enum', enum: DeviceStatus, default: DeviceStatus.OFFLINE })
  status: DeviceStatus; // 设备状态

  @Column({ type: 'varchar', length: 255, nullable: true })
  ipAddress: string; // 设备IP地址

  @Column({ type: 'varchar', length: 100, nullable: true })
  macAddress: string; // 设备MAC地址

  @Column({ type: 'json', nullable: true })
  metadata: any; // 设备元数据

  @Column({ type: 'uuid', nullable: true })
  userId: string; // 关联的用户ID

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
