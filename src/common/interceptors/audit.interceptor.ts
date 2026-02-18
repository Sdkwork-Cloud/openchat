import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import { AuditLogService, AuditLogData } from '../services/audit-log.service';
import { AuditAction, AuditResult } from '../entities/audit-log.entity';
import { Request } from 'express';

export interface AuditConfig {
  action: AuditAction;
  entityType?: string;
  getEntityId?: (args: any) => string | undefined;
  getOldValue?: (args: any) => Record<string, any> | undefined;
  getNewValue?: (result: any) => Record<string, any> | undefined;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditConfig = this.getAuditConfig(context);
    if (!auditConfig) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const userId = (request as any).user?.id;
    const ip = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];
    const requestId = request.headers['x-request-id'] as string;

    const args = context.getArgs();
    const entityId = auditConfig.getEntityId?.(args);
    const oldValue = auditConfig.getOldValue?.(args);

    return next.handle().pipe(
      tap((result) => {
        const newValue = auditConfig.getNewValue?.(result);
        
        this.auditLogService.logAsync({
          userId,
          action: auditConfig.action,
          entityType: auditConfig.entityType,
          entityId,
          oldValue,
          newValue,
          ip,
          userAgent,
          requestId,
          result: AuditResult.SUCCESS,
        });
      }),
      catchError((error) => {
        this.auditLogService.logAsync({
          userId,
          action: auditConfig.action,
          entityType: auditConfig.entityType,
          entityId,
          oldValue,
          ip,
          userAgent,
          requestId,
          result: AuditResult.FAILURE,
          errorMessage: error.message,
        });
        throw error;
      }),
    );
  }

  private getAuditConfig(context: ExecutionContext): AuditConfig | null {
    const handler = context.getHandler();
    const auditMetadata = Reflect.getMetadata('audit:config', handler);
    return auditMetadata;
  }
}

import { SetMetadata } from '@nestjs/common';

export const AUDIT_CONFIG_KEY = 'audit:config';

export function Audit(config: AuditConfig): MethodDecorator {
  return SetMetadata(AUDIT_CONFIG_KEY, config);
}

export function AuditCreate(entityType: string, getEntityId?: (args: any) => string): MethodDecorator {
  return Audit({
    action: AuditAction.CREATE,
    entityType,
    getEntityId,
    getNewValue: (result) => result,
  });
}

export function AuditUpdate(
  entityType: string,
  getEntityId: (args: any) => string,
  getOldValue?: (args: any) => Record<string, any>,
): MethodDecorator {
  return Audit({
    action: AuditAction.UPDATE,
    entityType,
    getEntityId,
    getOldValue,
    getNewValue: (result) => result,
  });
}

export function AuditDelete(
  entityType: string,
  getEntityId: (args: any) => string,
  getOldValue?: (args: any) => Record<string, any>,
): MethodDecorator {
  return Audit({
    action: AuditAction.DELETE,
    entityType,
    getEntityId,
    getOldValue,
  });
}
