import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, Repository, FindOptionsWhere, ObjectLiteral } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { BusinessException, BusinessErrorCode } from '../exceptions/business.exception';
import { EventBusService, EventType, EventPriority } from '../events/event-bus.service';

export interface StateTransition<S extends string> {
  from: S | S[];
  to: S;
  guard?: (entity: any, context?: any) => boolean | Promise<boolean>;
  before?: (entity: any, context?: any) => void | Promise<void>;
  after?: (entity: any, context?: any) => void | Promise<void>;
}

export interface StateMachineConfig<S extends string> {
  initialState: S;
  states: S[];
  transitions: StateTransition<S>[];
  finalStates?: S[];
}

export interface StateChangeResult<T, S extends string> {
  entity: T;
  previousState: S;
  newState: S;
  transition: string;
}

@Injectable()
export abstract class StatefulEntityService<
  T extends BaseEntity & ObjectLiteral & { status: string },
  S extends string = string,
> {
  protected abstract readonly logger: Logger;
  protected abstract readonly entityName: string;
  protected abstract readonly stateMachineConfig: StateMachineConfig<S>;
  protected abstract readonly eventBus?: EventBusService;

  constructor(
    protected readonly dataSource: DataSource,
    protected readonly repository: Repository<T>,
  ) {}

  async transition(
    entityId: string,
    targetState: S,
    context?: any,
  ): Promise<StateChangeResult<T, S>> {
    const entity = await this.repository.findOne({
      where: { id: entityId, isDeleted: false } as FindOptionsWhere<T>,
    });

    if (!entity) {
      throw new BusinessException(
        BusinessErrorCode.RESOURCE_NOT_FOUND,
        `${this.entityName} not found with id: ${entityId}`,
      );
    }

    const currentState = entity.status as S;
    
    if (!this.canTransition(currentState, targetState)) {
      throw new BadRequestException(
        `Cannot transition ${this.entityName} from ${currentState} to ${targetState}`,
      );
    }

    const transition = this.findTransition(currentState, targetState);
    
    if (!transition) {
      throw new BadRequestException(
        `No valid transition from ${currentState} to ${targetState}`,
      );
    }

    if (transition.guard) {
      const canProceed = await transition.guard(entity, context);
      if (!canProceed) {
        throw new BadRequestException(
          `Transition guard rejected the transition from ${currentState} to ${targetState}`,
        );
      }
    }

    if (transition.before) {
      await transition.before(entity, context);
    }

    const previousState = currentState;
    entity.status = targetState as any;
    const updatedEntity = await this.repository.save(entity);

    if (transition.after) {
      await transition.after(updatedEntity, context);
    }

    this.emitStateChangeEvent(updatedEntity, previousState, targetState);

    return {
      entity: updatedEntity,
      previousState,
      newState: targetState,
      transition: `${previousState}->${targetState}`,
    };
  }

  canTransition(from: S, to: S): boolean {
    if (!this.stateMachineConfig.states.includes(to)) {
      return false;
    }

    const transition = this.findTransition(from, to);
    return !!transition;
  }

  getValidTransitions(currentState: S): S[] {
    const validTransitions: S[] = [];

    for (const transition of this.stateMachineConfig.transitions) {
      const fromStates = Array.isArray(transition.from) ? transition.from : [transition.from];
      
      if (fromStates.includes(currentState)) {
        validTransitions.push(transition.to);
      }
    }

    return validTransitions;
  }

  isFinalState(state: S): boolean {
    return this.stateMachineConfig.finalStates?.includes(state) || false;
  }

  async getEntitiesByState(state: S, options?: { limit?: number; offset?: number }): Promise<T[]> {
    return this.repository.find({
      where: { status: state, isDeleted: false } as unknown as FindOptionsWhere<T>,
      order: { createdAt: 'DESC' as any },
      take: options?.limit,
      skip: options?.offset,
    });
  }

  async countByState(state: S): Promise<number> {
    return this.repository.count({
      where: { status: state, isDeleted: false } as unknown as FindOptionsWhere<T>,
    });
  }

  async getStateStatistics(): Promise<Record<S, number>> {
    const stats: Record<string, number> = {};

    for (const state of this.stateMachineConfig.states) {
      stats[state] = await this.countByState(state);
    }

    return stats as Record<S, number>;
  }

  private findTransition(from: S, to: S): StateTransition<S> | undefined {
    return this.stateMachineConfig.transitions.find(transition => {
      const fromStates = Array.isArray(transition.from) ? transition.from : [transition.from];
      return fromStates.includes(from) && transition.to === to;
    });
  }

  private emitStateChangeEvent(entity: T, previousState: S, newState: S): void {
    if (this.eventBus) {
      this.eventBus.publish(
        `${this.entityName.toLowerCase()}.state_changed` as EventType,
        {
          entityId: entity.id,
          previousState,
          newState,
          entity,
        },
        {
          priority: EventPriority.MEDIUM,
          source: this.entityName,
        },
      );
    }

    this.logger.log(
      `${this.entityName} ${entity.id} state changed: ${previousState} -> ${newState}`,
    );
  }
}

export function defineStateMachine<S extends string>(
  config: StateMachineConfig<S>,
): StateMachineConfig<S> {
  return config;
}
