import {
  Entity,
  Column,
  Index,
  CreateDateColumn,
  PrimaryColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  READ = 'READ',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
}

export enum AuditResult {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

@Entity('system_audit_logs')
@Index('idx_audit_logs_user_action', ['userId', 'action'])
@Index('idx_audit_logs_entity', ['entityType', 'entityId'])
@Index('idx_audit_logs_created', ['createdAt'])
export class AuditLogEntity {
  @PrimaryColumn({ type: 'bigint' })
  id: string;

  @ApiProperty({ description: 'User ID who performed the action' })
  @Column({ type: 'varchar', length: 36, nullable: true })
  userId?: string;

  @ApiProperty({ description: 'Action type', enum: AuditAction })
  @Column({
    type: 'enum',
    enum: AuditAction,
    nullable: false,
  })
  action: AuditAction;

  @ApiProperty({ description: 'Entity type' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  entityType?: string;

  @ApiProperty({ description: 'Entity ID' })
  @Column({ type: 'varchar', length: 36, nullable: true })
  entityId?: string;

  @ApiProperty({ description: 'Action result', enum: AuditResult })
  @Column({
    type: 'enum',
    enum: AuditResult,
    default: AuditResult.SUCCESS,
  })
  result: AuditResult;

  @ApiProperty({ description: 'Old value before change' })
  @Column({ type: 'jsonb', nullable: true })
  oldValue?: Record<string, any>;

  @ApiProperty({ description: 'New value after change' })
  @Column({ type: 'jsonb', nullable: true })
  newValue?: Record<string, any>;

  @ApiProperty({ description: 'IP address' })
  @Column({ type: 'varchar', length: 45, nullable: true })
  ip?: string;

  @ApiProperty({ description: 'User agent' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent?: string;

  @ApiProperty({ description: 'Request ID' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  requestId?: string;

  @ApiProperty({ description: 'Error message if failed' })
  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @ApiProperty({ description: 'Additional metadata' })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Created at' })
  @CreateDateColumn()
  createdAt: Date;
}
