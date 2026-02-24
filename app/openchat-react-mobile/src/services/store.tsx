
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ChatSession, Message } from '../modules/chat/types';
import { ChatService } from '../modules/chat/services/ChatService';
import { AppEvents, EVENTS } from '../core/events';

interface ChatStoreContextType {
  sessions: ChatSession[];
  totalUnreadCount: number;
  getSession: (sessionId: string) => ChatSession | undefined;
  createSession: (agentId: string) => Promise<string>; 
  addMessage: (sessionId: string, message: Partial<Message>) => Promise<void>;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => void; 
  updateMessageContent: (sessionId: string, messageId: string, content: string, isStreaming: boolean) => void;
  recallMessage: (sessionId: string, messageId: string) => Promise<void>;
  updateSessionConfig: (sessionId: string, config: { showAvatar?: boolean, backgroundImage?: string }) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  togglePin: (sessionId: string) => Promise<void>;
  toggleMute: (sessionId: string) => Promise<void>; 
  markSessionRead: (sessionId: string) => Promise<void>;
  setSessionUnread: (sessionId: string, count: number) => Promise<void>;
  clearSessionMessages: (sessionId: string) => Promise<void>;
  clearStore: () => Promise<void>;
}

const ChatContext = createContext<ChatStoreContextType | null>(null);

export const ChatStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isReady, setIsReady] = useState(false);

  const refreshSessions = useCallback(async () => {
      const res = await ChatService.getSessionList();
      if (res.success && res.data) {
          setSessions([...res.data]); 
      }
  }, []);

  useEffect(() => {
    const init = async () => {
        await refreshSessions();
        setIsReady(true);
    };
    init();

    // Reactive: Listen to service changes (e.g. from background tasks, other tabs, or direct service usage)
    const unsubscribe = AppEvents.on(EVENTS.DATA_CHANGE, (payload) => {
        // If chat service updated data, refresh the list
        if (payload.key === 'sys_chat_sessions_v4') {
             // Optional: Optimize by only refreshing if ID matches or if it's a full save
             // For now, simpler to just refresh list to ensure consistency
             if (payload.action === 'save' || payload.action === 'delete') {
                 refreshSessions();
             }
        }
    });

    return () => {
        unsubscribe();
    };
  }, [refreshSessions]);

  const getSession = useCallback((sessionId: string) => {
    return sessions.find(s => s.id === sessionId);
  }, [sessions]);

  const createSession = useCallback(async (agentId: string) => {
    const res = await ChatService.createSession(agentId);
    // Refresh triggered automatically by event, but we can await here for immediate feedback if needed
    // await refreshSessions(); 
    return res.data?.id || '';
  }, []);

  const addMessage = useCallback(async (sessionId: string, message: Partial<Message>) => {
    // Optimistic Update for UI speed
    setSessions(prev => {
        const session = prev.find(s => s.id === sessionId);
        if (!session) return prev;
        
        const now = Date.now();
        const newMessage: Message = {
            id: message.id || crypto.randomUUID(),
            sessionId,
            role: message.role || 'user',
            content: message.content || '',
            isStreaming: message.isStreaming || false,
            status: message.status || 'sent',
            replyTo: message.replyTo,
            createTime: now,
            updateTime: now
        };
        
        // Clone to avoid mutation
        const updatedSession = { 
            ...session, 
            messages: [...session.messages, newMessage],
            lastMessageContent: newMessage.content,
            lastMessageTime: now,
            updateTime: now
        };
        
        // Re-sort
        const otherSessions = prev.filter(s => s.id !== sessionId);
        return [updatedSession, ...otherSessions].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.lastMessageTime - a.lastMessageTime;
        });
    });

    // Actual Persist
    await ChatService.addMessage(sessionId, message);
    // No need to call refreshSessions(), the event listener will handle consistency eventually
  }, []);

  const updateMessage = useCallback((sessionId: string, messageId: string, updates: Partial<Message>) => {
    // Optimistic Update
    setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
            return {
                ...s,
                lastMessageContent: updates.content && s.messages.findIndex(m=>m.id===messageId) === s.messages.length - 1 
                    ? updates.content 
                    : s.lastMessageContent, 
                messages: s.messages.map(m => m.id === messageId ? { ...m, ...updates } : m)
            };
        }
        return s;
    }));
    
    // Persist (This might trigger event, which triggers refresh, which is fine)
    ChatService.updateMessage(sessionId, messageId, updates);
  }, []);

  const updateMessageContent = useCallback((sessionId: string, messageId: string, content: string, isStreaming: boolean) => {
      updateMessage(sessionId, messageId, { content, isStreaming });
  }, [updateMessage]);

  const recallMessage = useCallback(async (sessionId: string, messageId: string) => {
      setSessions(prev => prev.map(s => {
          if (s.id === sessionId) {
              return {
                  ...s,
                  lastMessageContent: '你撤回了一条消息',
                  messages: s.messages.map(m => m.id === messageId ? { ...m, role: 'system', content: '你撤回了一条消息', status: 'sent' } as Message : m)
              };
          }
          return s;
      }));
      await ChatService.recallMessage(sessionId, messageId);
  }, []);

  const updateSessionConfig = useCallback(async (sessionId: string, config: { showAvatar?: boolean, backgroundImage?: string }) => {
      setSessions(prev => prev.map(s => {
          if (s.id === sessionId) {
              return { 
                  ...s, 
                  sessionConfig: { ...s.sessionConfig, ...config } 
              };
          }
          return s;
      }));
      await ChatService.updateSessionConfig(sessionId, config);
  }, []);

  const markSessionRead = useCallback(async (sessionId: string) => {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, unreadCount: 0 } : s));
      await ChatService.markAsRead(sessionId);
  }, []);

  const setSessionUnread = useCallback(async (sessionId: string, count: number) => {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, unreadCount: count } : s));
      await ChatService.setUnreadCount(sessionId, count);
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    await ChatService.deleteById(sessionId);
  }, []);

  const togglePin = useCallback(async (sessionId: string) => {
    await ChatService.togglePin(sessionId);
  }, []);

  const toggleMute = useCallback(async (sessionId: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, isMuted: !s.isMuted } : s));
    await ChatService.toggleMute(sessionId);
  }, []);

  const clearSessionMessages = useCallback(async (sessionId: string) => {
    await ChatService.clearHistory(sessionId);
  }, []);

  const clearStore = useCallback(async () => {
      await ChatService.clearAll();
      window.location.reload();
  }, []);

  const totalUnreadCount = useMemo(() => {
    return sessions.reduce((acc, session) => acc + (session.unreadCount || 0), 0);
  }, [sessions]);

  if (!isReady) return null;

  return (
    <ChatContext.Provider value={{ 
        sessions, 
        totalUnreadCount, 
        getSession, 
        createSession, 
        addMessage, 
        updateMessage,
        updateMessageContent, 
        recallMessage,
        updateSessionConfig,
        deleteSession, 
        togglePin,
        toggleMute,
        markSessionRead,
        setSessionUnread,
        clearSessionMessages,
        clearStore 
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatStore = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatStore must be used within a ChatStoreProvider');
  }
  return context;
};
