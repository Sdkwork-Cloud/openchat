import { Injectable, Logger } from '@nestjs/common';
import { Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AgentEvent, AgentEventType } from './agent.interface';

@Injectable()
export class AgentEventService {
  private readonly logger = new Logger(AgentEventService.name);
  private eventSubject = new Subject<AgentEvent>();
  private eventHistory: AgentEvent[] = [];
  private maxHistorySize = 1000;

  emit(event: AgentEvent): void {
    this.eventSubject.next(event);
    this.eventHistory.push(event);
    
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
    
    this.logger.debug(`Agent event emitted: ${event.type}`);
  }

  subscribe(callback: (event: AgentEvent) => void): Subscription {
    return this.eventSubject.asObservable().subscribe(callback);
  }

  subscribeToAgent(agentId: string, callback: (event: AgentEvent) => void): Subscription {
    return this.eventSubject.asObservable()
      .pipe(filter((event: AgentEvent) => event.metadata.agentId === agentId))
      .subscribe(callback);
  }

  subscribeToSession(sessionId: string, callback: (event: AgentEvent) => void): Subscription {
    return this.eventSubject.asObservable()
      .pipe(filter((event: AgentEvent) => event.metadata.sessionId === sessionId))
      .subscribe(callback);
  }

  getHistory(agentId?: string, limit: number = 100): AgentEvent[] {
    let events = this.eventHistory;
    
    if (agentId) {
      events = events.filter(e => e.metadata.agentId === agentId);
    }
    
    return events.slice(-limit);
  }

  clearHistory(): void {
    this.eventHistory = [];
  }
}
