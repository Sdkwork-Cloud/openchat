import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DeviceEntity } from './device.entity';

export enum DeviceMessageType {
  COMMAND = 'command',
  STATUS = 'status',
  EVENT = 'event',
  ERROR = 'error',
}

export enum DeviceMessageDirection {
  TO_DEVICE = 'to_device',
  FROM_DEVICE = 'from_device',
}

@Entity('device_messages')
export class DeviceMessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: false, name: 'device_id' })
  deviceId: string;

  @ManyToOne(() => DeviceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id', referencedColumnName: 'deviceId' })
  device: DeviceEntity;

  @Column({ type: 'enum', enum: DeviceMessageType, default: DeviceMessageType.EVENT })
  type: DeviceMessageType;

  @Column({ type: 'enum', enum: DeviceMessageDirection, default: DeviceMessageDirection.FROM_DEVICE })
  direction: DeviceMessageDirection;

  @Column({ type: 'json', nullable: false })
  payload: any;

  @Column({ type: 'varchar', length: 255, nullable: true })
  topic: string;

  @Column({ type: 'boolean', default: false })
  processed: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  error: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
