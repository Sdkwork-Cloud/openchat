
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { BaseEntity, Result, Page } from '../../../core/types';
import { AGENT_REGISTRY, DEFAULT_AGENT_ID, getAgent } from '../../../services/agentRegistry';
import { Platform } from '../../../platform';

// --- Domain Models ---
export interface Message extends BaseEntity {
  sessionId: string; // Foreign Key Concept
  role: 'user' | 'model';
  content: string;
  isStreaming?: boolean;
}

export interface ChatSession extends BaseEntity {
  agentId: string;
  lastMessageContent: string;
  lastMessageTime: number;
  unreadCount: number;
  isPinned: boolean;
  // Note: We don't store full messages array in session to keep it lightweight. 
  // We join them at runtime or load on demand.
  // BUT for this specific simplified app architecture, we will keep embedding them 
  // for performance (No need for complex join queries in LocalStorage).
  messages: Message[]; 
}

class ChatServiceImpl extends AbstractStorageService<ChatSession> {
  protected STORAGE_KEY = 'sys_chat_sessions_v2';

  constructor() {
      super();
      this.initDefaultSession();
  }

  private async initDefaultSession() {
      const list = await this.loadData();
      if (list.length === 0) {
          const agent = AGENT_REGISTRY[DEFAULT_AGENT_ID];
          const now = Date.now();
          const initialMsg: Message = {
              id: 'msg_init',
              sessionId: 'session_default',
              role: 'model',
              content: agent.initialMessage,
              createTime: now,
              updateTime: now
          };

          const defaultSession: ChatSession = {
              id: 'session_default',
              agentId: DEFAULT_AGENT_ID,
              lastMessageContent: agent.initialMessage,
              lastMessageTime: now,
              unreadCount: 1,
              isPinned: true,
              messages: [initialMsg],
              createTime: now,
              updateTime: now
          };
          
          await this.save(defaultSession);
      }
  }

  /**
   * Optimized List Query:
   * Pinned sessions first, then by lastUpdated desc
   */
  async getSessionList(): Promise<Result<ChatSession[]>> {
      const list = await this.loadData();
      
      const sorted = list.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.lastMessageTime - a.lastMessageTime;
      });

      return { success: true, data: sorted };
  }

  async createSession(agentId: string): Promise<Result<ChatSession>> {
      const list = await this.loadData();
      
      // Singleton rule: One session per agent for this app design
      const existing = list.find(s => s.agentId === agentId);
      if (existing) return { success: true, data: existing };

      const agent = getAgent(agentId);
      const now = Date.now();
      
      const newSession: ChatSession = {
          id: crypto.randomUUID(),
          agentId: agent.id,
          lastMessageContent: agent.initialMessage,
          lastMessageTime: now,
          unreadCount: 0,
          isPinned: false,
          createTime: now,
          updateTime: now,
          messages: [{
              id: crypto.randomUUID(),
              sessionId: '', // Will be set momentarily
              role: 'model',
              content: agent.initialMessage,
              createTime: now,
              updateTime: now
          }]
      };
      
      // Fix FK references
      newSession.messages[0].sessionId = newSession.id;

      return await this.save(newSession);
  }

  async addMessage(sessionId: string, messageData: Partial<Message>): Promise<Result<void>> {
      const { data: session } = await this.findById(sessionId);
      if (!session) return { success: false, message: 'Session not found' };

      const now = Date.now();
      const newMessage: Message = {
          id: messageData.id || crypto.randomUUID(),
          sessionId: sessionId,
          role: messageData.role || 'user',
          content: messageData.content || '',
          isStreaming: messageData.isStreaming || false,
          createTime: now,
          updateTime: now
      };

      session.messages.push(newMessage);
      session.lastMessageContent = newMessage.content;
      session.lastMessageTime = now;
      session.unreadCount = 0; // Reset on interaction
      session.updateTime = now;

      await this.save(session);
      return { success: true };
  }

  async updateMessage(sessionId: string, messageId: string, content: string, isStreaming: boolean): Promise<Result<void>> {
      // Optimization: Don't do full persistence for every chunk stream.
      // We update the memory cache directly for performance, persist only on finish.
      
      if (!this.cache) await this.loadData();
      
      const session = this.cache!.find(s => s.id === sessionId);
      if (!session) return { success: false };

      const msg = session.messages.find(m => m.id === messageId);
      if (msg) {
          msg.content = content;
          msg.isStreaming = isStreaming;
          msg.updateTime = Date.now();
          
          session.lastMessageContent = content; // Update preview
          
          if (!isStreaming) {
              await this.commit(); // Only persist to storage when streaming stops
          }
      }
      return { success: true };
  }

  async togglePin(sessionId: string): Promise<Result<void>> {
      const { data: session } = await this.findById(sessionId);
      if (session) {
          session.isPinned = !session.isPinned;
          await this.save(session);
          return { success: true };
      }
      return { success: false };
  }

  async clearHistory(sessionId: string): Promise<Result<void>> {
      const { data: session } = await this.findById(sessionId);
      if (session) {
          session.messages = [];
          session.lastMessageContent = '';
          await this.save(session);
          return { success: true };
      }
      return { success: false };
  }

  async clearAll(): Promise<void> {
      this.cache = [];
      await Platform.storage.remove(this.STORAGE_KEY);
  }
}

export const ChatService = new ChatServiceImpl();
