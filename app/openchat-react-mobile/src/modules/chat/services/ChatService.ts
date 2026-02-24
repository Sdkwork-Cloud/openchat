
import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { Result } from '../../../core/types';
import { AGENT_REGISTRY, DEFAULT_AGENT_ID, getAgent } from '../../../services/agentRegistry';
import { Message, ChatSession } from '../types';

class ChatServiceImpl extends AbstractStorageService<ChatSession> {
  protected STORAGE_KEY = 'sys_chat_sessions_v4';

  protected async onInitialize() {
      // Logic inside onInitialize should not call loadData() to avoid re-triggering ensureInitialized.
      // this.cache is guaranteed to be available (at least as an empty array) when this hook is called.
      const list = this.cache || [];
      
      if (list.length === 0) {
          const agent = AGENT_REGISTRY[DEFAULT_AGENT_ID];
          const now = Date.now();
          const initialMsg: Message = {
              id: 'msg_init',
              sessionId: 'session_default',
              role: 'model',
              content: agent.initialMessage,
              createTime: now,
              updateTime: now,
              status: 'sent'
          };
          const defaultSession: ChatSession = {
              id: 'session_default',
              type: 'agent',
              agentId: DEFAULT_AGENT_ID,
              lastMessageContent: agent.initialMessage,
              lastMessageTime: now,
              unreadCount: 1,
              isPinned: true,
              messages: [initialMsg],
              createTime: now,
              updateTime: now,
              sessionConfig: { showAvatar: false } 
          };
          
          list.push(defaultSession);
          this.cache = list;
          // Commit ensures the seed is persisted to storage
          await this.commit();
      }
  }

  async getSessionList(): Promise<Result<ChatSession[]>> {
      const { data } = await this.findAll({
          sort: { field: 'lastMessageTime', order: 'desc' }
      });
      const sorted = (data?.content || []).sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return 0;
      });
      return { success: true, data: sorted };
  }

  async createSession(agentId: string): Promise<Result<ChatSession>> {
      const list = await this.loadData();
      const existing = list.find(s => s.type === 'agent' && s.agentId === agentId);
      if (existing) return { success: true, data: existing };

      const agent = getAgent(agentId);
      const now = Date.now();
      const newSession: ChatSession = {
          id: crypto.randomUUID(),
          type: 'agent',
          agentId: agent.id,
          lastMessageContent: agent.initialMessage,
          lastMessageTime: now,
          unreadCount: 0,
          isPinned: false,
          createTime: now,
          updateTime: now,
          messages: [{
              id: crypto.randomUUID(),
              sessionId: '', 
              role: 'model',
              content: agent.initialMessage,
              createTime: now,
              updateTime: now,
              status: 'sent'
          }]
      };
      newSession.messages[0].sessionId = newSession.id;
      return await this.save(newSession);
  }

  async addMessage(sessionId: string, messageData: Partial<Message>): Promise<Result<ChatSession>> {
      const { data: session } = await this.findById(sessionId);
      if (!session) return { success: false, message: 'Session not found' };

      const now = Date.now();
      const newMessage: Message = {
          id: messageData.id || crypto.randomUUID(),
          sessionId,
          role: messageData.role || 'user',
          content: messageData.content || '',
          createTime: now,
          updateTime: now,
          status: messageData.status || 'sent',
          ...messageData
      };
      if (!session.messages) session.messages = [];
      session.messages.push(newMessage);
      session.lastMessageContent = newMessage.content;
      session.lastMessageTime = now;
      session.updateTime = now;
      return await this.save(session);
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

  async togglePin(sessionId: string): Promise<Result<void>> {
      const { data: session } = await this.findById(sessionId);
      if (session) {
          session.isPinned = !session.isPinned;
          await this.save(session);
          return { success: true };
      }
      return { success: false };
  }

  async deleteMessages(sessionId: string, messageIds: string[]): Promise<Result<void>> {
      const { data: session } = await this.findById(sessionId);
      if (session) {
          session.messages = session.messages.filter(m => !messageIds.includes(m.id));
          session.lastMessageContent = session.messages.length > 0 ? session.messages[session.messages.length - 1].content : '';
          await this.save(session);
          return { success: true };
      }
      return { success: false, message: 'Session not found' };
  }

  async updateMessage(sessionId: string, messageId: string, updates: Partial<Message>): Promise<Result<void>> {
      const { data: session } = await this.findById(sessionId);
      if (session) {
          const index = session.messages.findIndex(m => m.id === messageId);
          if (index > -1) {
              session.messages[index] = { ...session.messages[index], ...updates };
              if (index === session.messages.length - 1 && updates.content) session.lastMessageContent = updates.content;
              await this.save(session);
              return { success: true };
          }
      }
      return { success: false };
  }

  async recallMessage(sessionId: string, messageId: string): Promise<Result<void>> {
      const { data: session } = await this.findById(sessionId);
      if (session) {
          const index = session.messages.findIndex(m => m.id === messageId);
          if (index > -1) {
              session.messages[index] = { ...session.messages[index], role: 'system', content: '你撤回了一条消息', status: 'sent' } as Message;
              if (index === session.messages.length - 1) session.lastMessageContent = '你撤回了一条消息';
              await this.save(session);
              return { success: true };
          }
      }
      return { success: false };
  }

  async updateSessionConfig(sessionId: string, config: { showAvatar?: boolean, backgroundImage?: string }): Promise<Result<void>> {
      const { data: session } = await this.findById(sessionId);
      if (session) {
          session.sessionConfig = { ...session.sessionConfig, ...config } as any;
          await this.save(session);
          return { success: true };
      }
      return { success: false };
  }

    async markAsRead(sessionId: string): Promise<Result<void>> {
        return this.setUnreadCount(sessionId, 0);
    }

    async setUnreadCount(sessionId: string, count: number): Promise<Result<void>> {
        const { data: session } = await this.findById(sessionId);
        if (session) {
            session.unreadCount = count;
            await this.save(session);
            return { success: true };
        }
        return { success: false };
    }

  async toggleMute(sessionId: string): Promise<Result<void>> {
      const { data: session } = await this.findById(sessionId);
      if (session) {
          session.isMuted = !session.isMuted;
          await this.save(session);
          return { success: true };
      }
      return { success: false };
  }

  async clearAll(): Promise<Result<void>> {
      this.cache = [];
      await this.commit();
      return { success: true };
  }

  async addMembers(sessionId: string, memberIds: string[]): Promise<Result<void>> {
      const { data: session } = await this.findById(sessionId);
      if (session) {
          session.memberIds = [...(session.memberIds || []), ...memberIds];
          await this.save(session);
          return { success: true };
      }
      return { success: false };
  }

  async updateGroupInfo(sessionId: string, info: { groupName?: string, groupAnnouncement?: string }): Promise<Result<void>> {
      const { data: session } = await this.findById(sessionId);
      if (session) {
          if (info.groupName) session.groupName = info.groupName;
          if (info.groupAnnouncement) session.groupAnnouncement = info.groupAnnouncement;
          await this.save(session);
          return { success: true };
      }
      return { success: false };
  }

  async createGroupSession(groupName: string, memberIds: string[]): Promise<Result<ChatSession>> {
      const now = Date.now();
      const newSession: ChatSession = {
          id: crypto.randomUUID(),
          type: 'group',
          agentId: DEFAULT_AGENT_ID,
          groupName,
          memberIds,
          lastMessageContent: '你创建了群聊',
          lastMessageTime: now,
          unreadCount: 0,
          isPinned: false,
          createTime: now,
          updateTime: now,
          messages: [{
              id: crypto.randomUUID(),
              sessionId: '', 
              role: 'system',
              content: '你创建了群聊',
              createTime: now,
              updateTime: now,
              status: 'sent'
          }]
      };
      newSession.messages[0].sessionId = newSession.id;
      return await this.save(newSession);
  }
}

export const ChatService = new ChatServiceImpl();
