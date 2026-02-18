import {
  Injectable,
  Logger,
  SetMetadata,
  applyDecorators,
  UseInterceptors,
} from '@nestjs/common';
import { BaseEntity } from '../base.entity';

export interface AuditLogConfig {
  action: string;
  resource: string;
  includeChanges?: boolean;
  includePreviousValues?: boolean;
  sensitiveFields?: string[];
}

export const AUDIT_LOG_KEY = 'audit:log';
export const AUDIT_ACTION_KEY = 'audit:action';
export const AUDIT_RESOURCE_KEY = 'audit:resource';
export const AUDIT_SENSITIVE_FIELDS_KEY = 'audit:sensitive';

export function AuditLog(config: AuditLogConfig): MethodDecorator {
  return applyDecorators(
    SetMetadata(AUDIT_LOG_KEY, true),
    SetMetadata(AUDIT_ACTION_KEY, config.action),
    SetMetadata(AUDIT_RESOURCE_KEY, config.resource),
    SetMetadata(AUDIT_SENSITIVE_FIELDS_KEY, config.sensitiveFields || []),
  );
}

export function AuditCreate(resource: string): MethodDecorator {
  return AuditLog({ action: 'create', resource, includeChanges: true });
}

export function AuditUpdate(resource: string, sensitiveFields?: string[]): MethodDecorator {
  return AuditLog({ 
    action: 'update', 
    resource, 
    includeChanges: true, 
    includePreviousValues: true,
    sensitiveFields,
  });
}

export function AuditDelete(resource: string): MethodDecorator {
  return AuditLog({ action: 'delete', resource, includePreviousValues: true });
}

export function AuditRead(resource: string): MethodDecorator {
  return AuditLog({ action: 'read', resource });
}

@Injectable()
export abstract class AuditableService<T extends BaseEntity> {
  protected abstract readonly logger: Logger;
  protected abstract readonly entityName: string;

  protected sanitizeEntity(entity: T, sensitiveFields: string[] = []): Partial<T> {
    const sanitized: Partial<T> = { ...entity };
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        (sanitized as any)[field] = '***REDACTED***';
      }
    }
    
    return sanitized;
  }

  protected extractChanges(
    previous: Partial<T>,
    current: Partial<T>,
    sensitiveFields: string[] = [],
  ): { before: Partial<T>; after: Partial<T> } {
    const changes: { before: Partial<T>; after: Partial<T> } = {
      before: {},
      after: {},
    };

    const allKeys = new Set([
      ...Object.keys(previous),
      ...Object.keys(current),
    ]);

    for (const key of allKeys) {
      const prevValue = (previous as any)[key];
      const currValue = (current as any)[key];

      if (JSON.stringify(prevValue) !== JSON.stringify(currValue)) {
        if (sensitiveFields.includes(key)) {
          changes.before[key as keyof T] = '***REDACTED***' as any;
          changes.after[key as keyof T] = '***REDACTED***' as any;
        } else {
          changes.before[key as keyof T] = prevValue;
          changes.after[key as keyof T] = currValue;
        }
      }
    }

    return changes;
  }

  protected createAuditEntry(
    action: string,
    entityId: string,
    userId: string,
    changes?: { before: Partial<T>; after: Partial<T> },
    metadata?: Record<string, any>,
  ) {
    return {
      action,
      resource: this.entityName,
      resourceId: entityId,
      userId,
      timestamp: new Date(),
      changes: changes ? {
        before: changes.before,
        after: changes.after,
      } : undefined,
      metadata,
    };
  }
}
