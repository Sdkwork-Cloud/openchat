import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity, AuditAction, AuditResult } from '../entities/audit-log.entity';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLogData {
  userId?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  result?: AuditResult;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  private readonly snowflakeId: bigint;

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {
    this.snowflakeId = BigInt(Date.now() << 22);
  }

  async log(data: AuditLogData): Promise<AuditLogEntity> {
    try {
      const entity = this.auditLogRepository.create({
        id: this.generateId(),
        ...data,
        result: data.result || AuditResult.SUCCESS,
      });
      return this.auditLogRepository.save(entity);
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
      throw error;
    }
  }

  async logAsync(data: AuditLogData): Promise<void> {
    this.log(data).catch(error => {
      this.logger.error('Failed to create audit log (async)', error);
    });
  }

  async logCreate(
    userId: string,
    entityType: string,
    entityId: string,
    newValue: Record<string, any>,
    context?: { ip?: string; userAgent?: string; requestId?: string },
  ): Promise<AuditLogEntity> {
    return this.log({
      userId,
      action: AuditAction.CREATE,
      entityType,
      entityId,
      newValue,
      ...context,
    });
  }

  async logUpdate(
    userId: string,
    entityType: string,
    entityId: string,
    oldValue: Record<string, any>,
    newValue: Record<string, any>,
    context?: { ip?: string; userAgent?: string; requestId?: string },
  ): Promise<AuditLogEntity> {
    return this.log({
      userId,
      action: AuditAction.UPDATE,
      entityType,
      entityId,
      oldValue,
      newValue,
      ...context,
    });
  }

  async logDelete(
    userId: string,
    entityType: string,
    entityId: string,
    oldValue: Record<string, any>,
    context?: { ip?: string; userAgent?: string; requestId?: string },
  ): Promise<AuditLogEntity> {
    return this.log({
      userId,
      action: AuditAction.DELETE,
      entityType,
      entityId,
      oldValue,
      ...context,
    });
  }

  async logLogin(
    userId: string,
    ip?: string,
    userAgent?: string,
    result: AuditResult = AuditResult.SUCCESS,
    errorMessage?: string,
  ): Promise<AuditLogEntity> {
    return this.log({
      userId,
      action: AuditAction.LOGIN,
      ip,
      userAgent,
      result,
      errorMessage,
    });
  }

  async logLogout(userId: string, ip?: string): Promise<AuditLogEntity> {
    return this.log({
      userId,
      action: AuditAction.LOGOUT,
      ip,
    });
  }

  async logError(
    action: AuditAction,
    errorMessage: string,
    data?: Partial<AuditLogData>,
  ): Promise<AuditLogEntity> {
    return this.log({
      action,
      result: AuditResult.FAILURE,
      errorMessage,
      ...data,
    });
  }

  async findByUser(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<[AuditLogEntity[], number]> {
    return this.auditLogRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  async findByEntity(
    entityType: string,
    entityId: string,
  ): Promise<AuditLogEntity[]> {
    return this.auditLogRepository.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  private generateId(): string {
    return (this.snowflakeId + BigInt(Math.floor(Math.random() * 4096))).toString();
  }
}
