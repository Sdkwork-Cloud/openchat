import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type State<T extends string> = T;
export type Event<E extends string> = E;

export interface StateTransitionConfig<S extends string, E extends string> {
  from: S | S[];
  to: S;
  event: E;
  guard?: (context: any) => boolean | Promise<boolean>;
  before?: (context: any) => void | Promise<void>;
  after?: (context: any) => void | Promise<void>;
  onTransition?: (from: S, to: S, event: E, context: any) => void | Promise<void>;
}

export interface StateMachineConfig<S extends string, E extends string> {
  initialState: S;
  finalStates?: S[];
  transitions: StateTransitionConfig<S, E>[];
  onStateChange?: (from: S, to: S, event: E, context: any) => void | Promise<void>;
  onError?: (error: Error, context: any) => void | Promise<void>;
}

export interface StateMachineInstance<S extends string, E extends string> {
  id: string;
  currentState: S;
  previousState?: S;
  history: Array<{
    from: S;
    to: S;
    event: E;
    timestamp: Date;
    context?: any;
  }>;
}

export interface TransitionResult<S extends string> {
  success: boolean;
  from: S;
  to: S;
  error?: string;
}

@Injectable()
export class StateMachineService<S extends string, E extends string> implements OnModuleInit {
  private readonly logger = new Logger(StateMachineService.name);
  private readonly machines = new Map<string, StateMachineConfig<S, E>>();
  private readonly instances = new Map<string, StateMachineInstance<S, E>>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('StateMachineService initialized');
  }

  registerMachine(name: string, config: StateMachineConfig<S, E>): void {
    this.machines.set(name, config);
    this.logger.debug(`State machine registered: ${name}`);
  }

  createInstance(machineName: string, instanceId: string, initialState?: S): StateMachineInstance<S, E> {
    const config = this.machines.get(machineName);
    if (!config) {
      throw new Error(`State machine not found: ${machineName}`);
    }

    const instance: StateMachineInstance<S, E> = {
      id: instanceId,
      currentState: initialState || config.initialState,
      history: [],
    };

    this.instances.set(`${machineName}:${instanceId}`, instance);
    return instance;
  }

  getInstance(machineName: string, instanceId: string): StateMachineInstance<S, E> | undefined {
    return this.instances.get(`${machineName}:${instanceId}`);
  }

  removeInstance(machineName: string, instanceId: string): boolean {
    return this.instances.delete(`${machineName}:${instanceId}`);
  }

  async transition(
    machineName: string,
    instanceId: string,
    event: E,
    context?: any,
  ): Promise<TransitionResult<S>> {
    const config = this.machines.get(machineName);
    if (!config) {
      throw new Error(`State machine not found: ${machineName}`);
    }

    const instanceKey = `${machineName}:${instanceId}`;
    const instance = this.instances.get(instanceKey);

    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    const currentState = instance.currentState;
    const transition = this.findTransition(config, currentState, event);

    if (!transition) {
      return {
        success: false,
        from: currentState,
        to: currentState,
        error: `No transition found for event ${event} from state ${currentState}`,
      };
    }

    try {
      if (transition.guard) {
        const canTransition = await transition.guard(context);
        if (!canTransition) {
          return {
            success: false,
            from: currentState,
            to: currentState,
            error: 'Transition guard rejected',
          };
        }
      }

      if (transition.before) {
        await transition.before(context);
      }

      const previousState = instance.currentState;
      instance.currentState = transition.to;
      instance.previousState = previousState;

      instance.history.push({
        from: previousState,
        to: transition.to,
        event,
        timestamp: new Date(),
        context,
      });

      if (transition.onTransition) {
        await transition.onTransition(previousState, transition.to, event, context);
      }

      if (config.onStateChange) {
        await config.onStateChange(previousState, transition.to, event, context);
      }

      if (transition.after) {
        await transition.after(context);
      }

      this.logger.debug(
        `State transition: ${machineName}:${instanceId} ${previousState} -> ${transition.to} via ${event}`,
      );

      return {
        success: true,
        from: previousState,
        to: transition.to,
      };
    } catch (error: any) {
      this.logger.error(`State transition failed: ${error.message}`);

      if (config.onError) {
        await config.onError(error, context);
      }

      return {
        success: false,
        from: currentState,
        to: currentState,
        error: error.message,
      };
    }
  }

  canTransition(
    machineName: string,
    instanceId: string,
    event: E,
  ): boolean {
    const config = this.machines.get(machineName);
    if (!config) return false;

    const instance = this.instances.get(`${machineName}:${instanceId}`);
    if (!instance) return false;

    return !!this.findTransition(config, instance.currentState, event);
  }

  getAvailableEvents(machineName: string, instanceId: string): E[] {
    const config = this.machines.get(machineName);
    if (!config) return [];

    const instance = this.instances.get(`${machineName}:${instanceId}`);
    if (!instance) return [];

    return config.transitions
      .filter((t) => this.matchesState(t.from, instance.currentState))
      .map((t) => t.event);
  }

  isFinalState(machineName: string, instanceId: string): boolean {
    const config = this.machines.get(machineName);
    if (!config || !config.finalStates) return false;

    const instance = this.instances.get(`${machineName}:${instanceId}`);
    if (!instance) return false;

    return config.finalStates.includes(instance.currentState);
  }

  getState(machineName: string, instanceId: string): S | undefined {
    const instance = this.instances.get(`${machineName}:${instanceId}`);
    return instance?.currentState;
  }

  getHistory(machineName: string, instanceId: string): StateMachineInstance<S, E>['history'] {
    const instance = this.instances.get(`${machineName}:${instanceId}`);
    return instance?.history || [];
  }

  private findTransition(
    config: StateMachineConfig<S, E>,
    currentState: S,
    event: E,
  ): StateTransitionConfig<S, E> | undefined {
    return config.transitions.find(
      (t) => t.event === event && this.matchesState(t.from, currentState),
    );
  }

  private matchesState(from: S | S[], currentState: S): boolean {
    if (Array.isArray(from)) {
      return from.includes(currentState);
    }
    return from === currentState;
  }
}

export function createStateMachine<S extends string, E extends string>(
  config: StateMachineConfig<S, E>,
): ClassDecorator {
  return function (target: any) {
    target.prototype._stateMachineConfig = config;
  };
}

export const FriendRequestStates = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export const FriendRequestEvents = {
  ACCEPT: 'accept',
  REJECT: 'reject',
  CANCEL: 'cancel',
} as const;

export const MessageStates = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
  RECALLED: 'recalled',
} as const;

export const MessageEvents = {
  SEND: 'send',
  DELIVER: 'deliver',
  READ: 'read',
  FAIL: 'fail',
  RECALL: 'recall',
  RETRY: 'retry',
} as const;

export const GroupInvitationStates = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export const GroupInvitationEvents = {
  ACCEPT: 'accept',
  REJECT: 'reject',
  CANCEL: 'cancel',
} as const;

@Injectable()
export class CommonStateMachines implements OnModuleInit {
  constructor(private readonly stateMachineService: StateMachineService<any, any>) {}

  onModuleInit() {
    this.registerFriendRequestStateMachine();
    this.registerMessageStateMachine();
    this.registerGroupInvitationStateMachine();
  }

  private registerFriendRequestStateMachine(): void {
    this.stateMachineService.registerMachine('friendRequest', {
      initialState: FriendRequestStates.PENDING,
      finalStates: [FriendRequestStates.ACCEPTED, FriendRequestStates.REJECTED, FriendRequestStates.CANCELLED],
      transitions: [
        {
          from: FriendRequestStates.PENDING,
          to: FriendRequestStates.ACCEPTED,
          event: FriendRequestEvents.ACCEPT,
        },
        {
          from: FriendRequestStates.PENDING,
          to: FriendRequestStates.REJECTED,
          event: FriendRequestEvents.REJECT,
        },
        {
          from: FriendRequestStates.PENDING,
          to: FriendRequestStates.CANCELLED,
          event: FriendRequestEvents.CANCEL,
        },
      ],
    });
  }

  private registerMessageStateMachine(): void {
    this.stateMachineService.registerMachine('message', {
      initialState: MessageStates.SENDING,
      finalStates: [MessageStates.FAILED, MessageStates.RECALLED],
      transitions: [
        {
          from: MessageStates.SENDING,
          to: MessageStates.SENT,
          event: MessageEvents.SEND,
        },
        {
          from: MessageStates.SENDING,
          to: MessageStates.FAILED,
          event: MessageEvents.FAIL,
        },
        {
          from: [MessageStates.SENT, MessageStates.DELIVERED, MessageStates.READ],
          to: MessageStates.RECALLED,
          event: MessageEvents.RECALL,
        },
        {
          from: MessageStates.SENT,
          to: MessageStates.DELIVERED,
          event: MessageEvents.DELIVER,
        },
        {
          from: [MessageStates.SENT, MessageStates.DELIVERED],
          to: MessageStates.READ,
          event: MessageEvents.READ,
        },
        {
          from: MessageStates.FAILED,
          to: MessageStates.SENDING,
          event: MessageEvents.RETRY,
        },
      ],
    });
  }

  private registerGroupInvitationStateMachine(): void {
    this.stateMachineService.registerMachine('groupInvitation', {
      initialState: GroupInvitationStates.PENDING,
      finalStates: [GroupInvitationStates.ACCEPTED, GroupInvitationStates.REJECTED, GroupInvitationStates.CANCELLED],
      transitions: [
        {
          from: GroupInvitationStates.PENDING,
          to: GroupInvitationStates.ACCEPTED,
          event: GroupInvitationEvents.ACCEPT,
        },
        {
          from: GroupInvitationStates.PENDING,
          to: GroupInvitationStates.REJECTED,
          event: GroupInvitationEvents.REJECT,
        },
        {
          from: GroupInvitationStates.PENDING,
          to: GroupInvitationStates.CANCELLED,
          event: GroupInvitationEvents.CANCEL,
        },
      ],
    });
  }
}
