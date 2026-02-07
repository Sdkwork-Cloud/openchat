
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ChatSession, Message } from '../modules/chat/services/ChatService'; // Import from Module Service
import { ChatService } from '../modules/chat/services/ChatService';

interface ChatStoreContextType {
  sessions: ChatSession[];
  totalUnreadCount: number;
  getSession: (sessionId: string) => ChatSession | undefined;
  createSession: (agentId: string) => Promise<string>; 
  addMessage: (sessionId: string, message: Partial<Message>) => Promise<void>;
  updateMessageContent: (sessionId: string, messageId: string, content: string, isStreaming: boolean) => void;
  deleteSession: (sessionId: string) => Promise<void>;
  togglePin: (sessionId: string) => Promise<void>;
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
        // ChatService auto-initializes via its constructor/base class lazy loading
        await refreshSessions();
        setIsReady(true);
    };
    init();
  }, [refreshSessions]);

  const getSession = useCallback((sessionId: string) => {
    return sessions.find(s => s.id === sessionId);
  }, [sessions]);

  const createSession = useCallback(async (agentId: string) => {
    const res = await ChatService.createSession(agentId);
    await refreshSessions();
    return res.data?.id || '';
  }, [refreshSessions]);

  const addMessage = useCallback(async (sessionId: string, message: Partial<Message>) => {
    await ChatService.addMessage(sessionId, message);
    await refreshSessions();
  }, [refreshSessions]);

  const updateMessageContent = useCallback((sessionId: string, messageId: string, content: string, isStreaming: boolean) => {
    // Optimistic UI Update for high-frequency streaming
    setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
            return {
                ...s,
                lastMessageContent: content, // Update preview in real time
                messages: s.messages.map(m => m.id === messageId ? { ...m, content, isStreaming } : m)
            };
        }
        return s;
    }));
    
    // Async Service Update (Throttled persistence handled in Service)
    ChatService.updateMessage(sessionId, messageId, content, isStreaming);
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    await ChatService.deleteById(sessionId);
    await refreshSessions();
  }, [refreshSessions]);

  const togglePin = useCallback(async (sessionId: string) => {
    await ChatService.togglePin(sessionId);
    await refreshSessions();
  }, [refreshSessions]);

  const clearSessionMessages = useCallback(async (sessionId: string) => {
    await ChatService.clearHistory(sessionId);
    await refreshSessions();
  }, [refreshSessions]);

  const clearStore = useCallback(async () => {
      await ChatService.clearAll();
      await refreshSessions();
      window.location.reload();
  }, [refreshSessions]);

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
        updateMessageContent, 
        deleteSession, 
        togglePin,
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
