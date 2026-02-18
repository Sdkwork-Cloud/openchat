import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository, FindOptionsWhere, DeepPartial, ObjectLiteral } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { EventBusService, EventType, EventPriority } from '../events/event-bus.service';

export interface DomainEvent {
  type: string;
  aggregateId: string;
  aggregateType: string;
  payload: any;
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface EventPublishOptions {
  priority?: EventPriority;
  delay?: number;
  correlationId?: string;
  causationId?: string;
}

@Injectable()
export abstract class EventPublishingService<T extends BaseEntity & ObjectLiteral> {
  protected abstract readonly logger: Logger;
  protected abstract readonly entityName: string;
  protected abstract readonly eventBus: EventBusService;

  protected emitDomainEvent(
    eventType: string,
    aggregateId: string,
    payload: any,
    options?: EventPublishOptions,
  ): void {
    const event: DomainEvent = {
      type: eventType,
      aggregateId,
      aggregateType: this.entityName,
      payload,
      metadata: {
        correlationId: options?.correlationId,
        causationId: options?.causationId,
      },
      timestamp: Date.now(),
    };

    this.eventBus.publish(
      eventType as EventType,
      {
        ...event.payload,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
      },
      {
        priority: options?.priority || EventPriority.MEDIUM,
        source: this.entityName,
        correlationId: event.metadata?.correlationId,
      },
    );

    this.logger.debug(`Emitted domain event: ${eventType} for ${this.entityName}:${aggregateId}`);
  }

  protected emitCreatedEvent(entity: T, options?: EventPublishOptions): void {
    this.emitDomainEvent(
      `${this.entityName.toLowerCase()}.created`,
      entity.id,
      { entity },
      options,
    );
  }

  protected emitUpdatedEvent(
    entity: T,
    changes: Partial<T>,
    previousValues?: Partial<T>,
    options?: EventPublishOptions,
  ): void {
    this.emitDomainEvent(
      `${this.entityName.toLowerCase()}.updated`,
      entity.id,
      { entity, changes, previousValues },
      options,
    );
  }

  protected emitDeletedEvent(entity: T, options?: EventPublishOptions): void {
    this.emitDomainEvent(
      `${this.entityName.toLowerCase()}.deleted`,
      entity.id,
      { entity },
      options,
    );
  }

  protected emitStatusChangedEvent(
    entity: T,
    previousStatus: string,
    newStatus: string,
    options?: EventPublishOptions,
  ): void {
    this.emitDomainEvent(
      `${this.entityName.toLowerCase()}.status_changed`,
      entity.id,
      { entity, previousStatus, newStatus },
      options,
    );
  }

  protected emitErrorEvent(
    operation: string,
    error: Error,
    context?: Record<string, any>,
    options?: EventPublishOptions,
  ): void {
    this.emitDomainEvent(
      `${this.entityName.toLowerCase()}.error`,
      context?.aggregateId || 'unknown',
      { operation, error: error.message, stack: error.stack, context },
      { priority: EventPriority.HIGH, ...options },
    );
  }
}
