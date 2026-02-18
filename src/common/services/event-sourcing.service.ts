import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Event<T = any> {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  payload: T;
  metadata: Record<string, any>;
  timestamp: number;
  correlationId?: string;
  causationId?: string;
}

export interface Aggregate {
  id: string;
  type: string;
  version: number;
}

export interface EventHandler<T = any> {
  (event: Event<T>): Promise<void> | void;
}

export interface EventStoreOptions {
  snapshotInterval?: number;
  maxEventsPerAggregate?: number;
  eventRetentionDays?: number;
  enableSnapshots?: boolean;
}

export interface Snapshot<T = any> {
  aggregateId: string;
  aggregateType: string;
  version: number;
  state: T;
  timestamp: number;
}

export interface EventQuery {
  aggregateId?: string;
  aggregateType?: string;
  eventType?: string | string[];
  fromVersion?: number;
  toVersion?: number;
  fromTimestamp?: number;
  toTimestamp?: number;
  correlationId?: string;
  limit?: number;
  offset?: number;
}

export interface EventSourcingStats {
  totalEvents: number;
  totalAggregates: number;
  totalSnapshots: number;
  eventsByType: Record<string, number>;
  eventsByAggregateType: Record<string, number>;
}

@Injectable()
export class EventSourcingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventSourcingService.name);
  private readonly eventStores = new Map<string, {
    events: Event[];
    snapshots: Map<string, Snapshot>;
    handlers: Map<string, EventHandler[]>;
    options: Required<EventStoreOptions>;
    stats: {
      totalEvents: number;
      eventsByType: Record<string, number>;
      eventsByAggregateType: Record<string, number>;
    };
  }>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('EventSourcingService initialized');
  }

  onModuleDestroy() {
    this.eventStores.clear();
  }

  createStore(name: string, options?: EventStoreOptions): void {
    if (this.eventStores.has(name)) {
      throw new Error(`Event store '${name}' already exists`);
    }

    const defaultOptions: Required<EventStoreOptions> = {
      snapshotInterval: options?.snapshotInterval ?? 100,
      maxEventsPerAggregate: options?.maxEventsPerAggregate ?? 10000,
      eventRetentionDays: options?.eventRetentionDays ?? 365,
      enableSnapshots: options?.enableSnapshots ?? true,
    };

    this.eventStores.set(name, {
      events: [],
      snapshots: new Map(),
      handlers: new Map(),
      options: defaultOptions,
      stats: {
        totalEvents: 0,
        eventsByType: {},
        eventsByAggregateType: {},
      },
    });

    this.logger.log(`Event store '${name}' created`);
  }

  append<T = any>(
    storeName: string,
    aggregateId: string,
    aggregateType: string,
    eventType: string,
    payload: T,
    metadata?: Record<string, any>,
    options?: { correlationId?: string; causationId?: string },
  ): Event<T> {
    const store = this.eventStores.get(storeName);
    if (!store) {
      throw new Error(`Event store '${storeName}' not found`);
    }

    const aggregateEvents = store.events.filter(
      e => e.aggregateId === aggregateId,
    );

    const version = aggregateEvents.length > 0
      ? Math.max(...aggregateEvents.map(e => e.version)) + 1
      : 1;

    const event: Event<T> = {
      id: this.generateEventId(),
      type: eventType,
      aggregateId,
      aggregateType,
      version,
      payload,
      metadata: metadata || {},
      timestamp: Date.now(),
      correlationId: options?.correlationId,
      causationId: options?.causationId,
    };

    store.events.push(event);
    store.stats.totalEvents++;
    store.stats.eventsByType[eventType] = (store.stats.eventsByType[eventType] || 0) + 1;
    store.stats.eventsByAggregateType[aggregateType] = (store.stats.eventsByAggregateType[aggregateType] || 0) + 1;

    this.executeHandlers(store, event);

    if (store.options.enableSnapshots && version % store.options.snapshotInterval === 0) {
      this.logger.debug(`Snapshot threshold reached for aggregate ${aggregateId}`);
    }

    return event;
  }

  appendBatch<T = any>(
    storeName: string,
    events: Array<{
      aggregateId: string;
      aggregateType: string;
      eventType: string;
      payload: T;
      metadata?: Record<string, any>;
    }>,
    correlationId?: string,
  ): Event<T>[] {
    const results: Event<T>[] = [];
    let causationId: string | undefined;

    for (const eventDef of events) {
      const event = this.append<T>(
        storeName,
        eventDef.aggregateId,
        eventDef.aggregateType,
        eventDef.eventType,
        eventDef.payload,
        eventDef.metadata,
        { correlationId, causationId },
      );
      causationId = event.id;
      results.push(event);
    }

    return results;
  }

  getEvents(storeName: string, query: EventQuery): Event[] {
    const store = this.eventStores.get(storeName);
    if (!store) {
      throw new Error(`Event store '${storeName}' not found`);
    }

    let events = [...store.events];

    if (query.aggregateId) {
      events = events.filter(e => e.aggregateId === query.aggregateId);
    }

    if (query.aggregateType) {
      events = events.filter(e => e.aggregateType === query.aggregateType);
    }

    if (query.eventType) {
      const types = Array.isArray(query.eventType) ? query.eventType : [query.eventType];
      events = events.filter(e => types.includes(e.type));
    }

    if (query.fromVersion !== undefined) {
      events = events.filter(e => e.version >= query.fromVersion!);
    }

    if (query.toVersion !== undefined) {
      events = events.filter(e => e.version <= query.toVersion!);
    }

    if (query.fromTimestamp !== undefined) {
      events = events.filter(e => e.timestamp >= query.fromTimestamp!);
    }

    if (query.toTimestamp !== undefined) {
      events = events.filter(e => e.timestamp <= query.toTimestamp!);
    }

    if (query.correlationId) {
      events = events.filter(e => e.correlationId === query.correlationId);
    }

    events.sort((a, b) => a.timestamp - b.timestamp);

    if (query.offset !== undefined) {
      events = events.slice(query.offset);
    }

    if (query.limit !== undefined) {
      events = events.slice(0, query.limit);
    }

    return events;
  }

  getAggregateEvents(storeName: string, aggregateId: string, fromVersion?: number): Event[] {
    return this.getEvents(storeName, { aggregateId, fromVersion });
  }

  getEvent(storeName: string, eventId: string): Event | undefined {
    const store = this.eventStores.get(storeName);
    if (!store) return undefined;

    return store.events.find(e => e.id === eventId);
  }

  createSnapshot<T = any>(
    storeName: string,
    aggregateId: string,
    aggregateType: string,
    state: T,
    version: number,
  ): Snapshot<T> {
    const store = this.eventStores.get(storeName);
    if (!store) {
      throw new Error(`Event store '${storeName}' not found`);
    }

    const snapshot: Snapshot<T> = {
      aggregateId,
      aggregateType,
      version,
      state,
      timestamp: Date.now(),
    };

    store.snapshots.set(aggregateId, snapshot);

    return snapshot;
  }

  getSnapshot<T = any>(storeName: string, aggregateId: string): Snapshot<T> | undefined {
    const store = this.eventStores.get(storeName);
    if (!store) return undefined;

    return store.snapshots.get(aggregateId) as Snapshot<T> | undefined;
  }

  replay<T = any>(
    storeName: string,
    aggregateId: string,
    initialState: T,
    applier: (state: T, event: Event) => T,
    fromVersion?: number,
  ): T {
    const events = this.getAggregateEvents(storeName, aggregateId, fromVersion);

    return events.reduce((state, event) => applier(state, event), initialState);
  }

  replayFromSnapshot<T = any>(
    storeName: string,
    aggregateId: string,
    applier: (state: T, event: Event) => T,
  ): T | undefined {
    const snapshot = this.getSnapshot<T>(storeName, aggregateId);
    if (!snapshot) return undefined;

    const events = this.getAggregateEvents(storeName, aggregateId, snapshot.version + 1);

    return events.reduce((state, event) => applier(state, event), snapshot.state);
  }

  subscribe<T = any>(
    storeName: string,
    eventType: string,
    handler: EventHandler<T>,
  ): () => void {
    const store = this.eventStores.get(storeName);
    if (!store) {
      throw new Error(`Event store '${storeName}' not found`);
    }

    if (!store.handlers.has(eventType)) {
      store.handlers.set(eventType, []);
    }

    store.handlers.get(eventType)!.push(handler);

    return () => {
      const handlers = store.handlers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  subscribeAll(
    storeName: string,
    handler: EventHandler,
  ): () => void {
    return this.subscribe(storeName, '*', handler);
  }

  getStats(storeName: string): EventSourcingStats {
    const store = this.eventStores.get(storeName);
    if (!store) {
      throw new Error(`Event store '${storeName}' not found`);
    }

    const aggregates = new Set(store.events.map(e => e.aggregateId));

    return {
      totalEvents: store.stats.totalEvents,
      totalAggregates: aggregates.size,
      totalSnapshots: store.snapshots.size,
      eventsByType: { ...store.stats.eventsByType },
      eventsByAggregateType: { ...store.stats.eventsByAggregateType },
    };
  }

  deleteAggregate(storeName: string, aggregateId: string): number {
    const store = this.eventStores.get(storeName);
    if (!store) return 0;

    const initialLength = store.events.length;
    store.events = store.events.filter(e => e.aggregateId !== aggregateId);
    store.snapshots.delete(aggregateId);

    return initialLength - store.events.length;
  }

  compact(storeName: string, beforeTimestamp?: number): number {
    const store = this.eventStores.get(storeName);
    if (!store) return 0;

    const threshold = beforeTimestamp || Date.now() - store.options.eventRetentionDays * 24 * 60 * 60 * 1000;
    const initialLength = store.events.length;

    const aggregatesWithSnapshots = new Set(
      Array.from(store.snapshots.values())
        .filter(s => s.timestamp < threshold)
        .map(s => s.aggregateId)
    );

    store.events = store.events.filter(e =>
      e.timestamp >= threshold || !aggregatesWithSnapshots.has(e.aggregateId) || e.version > (store.snapshots.get(e.aggregateId)?.version || 0)
    );

    return initialLength - store.events.length;
  }

  private executeHandlers(store: {
    handlers: Map<string, EventHandler[]>;
  }, event: Event): void {
    const handlers = store.handlers.get(event.type) || [];
    const wildcardHandlers = store.handlers.get('*') || [];

    for (const handler of [...handlers, ...wildcardHandlers]) {
      try {
        const result = handler(event);
        if (result instanceof Promise) {
          result.catch(err => this.logger.error(`Handler error for event ${event.id}`, err));
        }
      } catch (error) {
        this.logger.error(`Handler error for event ${event.id}`, error);
      }
    }
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
