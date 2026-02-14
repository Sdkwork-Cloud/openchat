import { Injectable, Logger } from '@nestjs/common';
import { MemoryManagerService } from './memory-manager.service';
import { MemoryEntry, MemoryQuery, MemorySearchResult, SessionMessage } from './memory.interface';
import { MemoryType, MemorySource } from './memory.entity';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(private memoryManager: MemoryManagerService) {}

  async add(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<MemoryEntry> {
    return this.memoryManager.store(entry);
  }

  async get(id: string): Promise<MemoryEntry | null> {
    return this.memoryManager.retrieve(id);
  }

  async search(query: string, limit: number = 10): Promise<MemorySearchResult[]> {
    return this.memoryManager.fullTextSearch(query, '', limit);
  }

  async delete(id: string): Promise<boolean> {
    return this.memoryManager.delete(id);
  }

  async clear(agentId?: string, sessionId?: string): Promise<void> {
    if (agentId) {
      return this.memoryManager.clear(agentId, sessionId);
    }
  }

  async getRecentMessages(
    agentId: string,
    sessionId?: string,
    limit: number = 10,
  ): Promise<SessionMessage[]> {
    const results = await this.memoryManager.search({
      agentId,
      sessionId,
      type: 'episodic',
      limit,
    });

    return results.map(r => ({
      id: r.memory.id,
      role: (r.memory.metadata?.role as any) || 'user',
      content: r.memory.content,
      timestamp: r.memory.timestamp,
    }));
  }

  async storeMessage(
    agentId: string,
    sessionId: string,
    message: { role: string; content: string },
  ): Promise<MemoryEntry> {
    return this.memoryManager.storeMessage(
      agentId,
      sessionId,
      message as any,
    );
  }

  async getConversationHistory(
    agentId: string,
    sessionId: string,
    maxTokens: number = 4000,
  ): Promise<{ role: string; content: string }[]> {
    const context = await this.memoryManager.getConversationHistory(
      agentId,
      sessionId,
      maxTokens,
    );

    return context.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));
  }

  async summarizeHistory(
    agentId: string,
    sessionId: string,
  ): Promise<string> {
    const result = await this.memoryManager.summarizeSession(agentId, sessionId);
    return result.summary;
  }
}
