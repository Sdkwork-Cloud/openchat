/**
 * Agent 聊天组件
 *
 * 职责：提供智能体对话界面，支持流式响应
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Agent, AgentSession, AgentMessage } from '../entities/agent.entity';
import { agentService } from '../services/agent.service';

interface AgentChatProps {
  agent: Agent;
  session?: AgentSession;
  onSessionCreated?: (session: AgentSession) => void;
}

export const AgentChat: React.FC<AgentChatProps> = ({
  agent,
  session: initialSession,
  onSessionCreated,
}) => {
  const [session, setSession] = useState<AgentSession | undefined>(initialSession);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  useEffect(() => {
    if (session) {
      loadMessages();
    }
  }, [session]);

  const loadMessages = async () => {
    if (!session) return;
    try {
      const msgs = await agentService.getMessages(session.id, 50);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    setError(null);
    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    try {
      let currentSession = session;

      if (!currentSession) {
        currentSession = await agentService.createSession(agent.id, {
          title: userMessage.slice(0, 50),
        });
        setSession(currentSession);
        onSessionCreated?.(currentSession);
      }

      const tempUserMessage: AgentMessage = {
        id: `temp-${Date.now()}`,
        sessionId: currentSession.id,
        content: userMessage,
        role: 'user',
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempUserMessage]);
      setStreamingContent('');

      await agentService.streamMessage(
        currentSession.id,
        { content: userMessage },
        (chunk) => {
          setStreamingContent(chunk.content || '');
        },
        () => {
          setStreamingContent((prev) => {
            const assistantMessage: AgentMessage = {
              id: `msg-${Date.now()}`,
              sessionId: currentSession!.id,
              content: prev,
              role: 'assistant',
              createdAt: new Date().toISOString(),
            };
            setMessages((prevMsgs) => [...prevMsgs, assistantMessage]);
            return '';
          });
          setLoading(false);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        }
      );
    } catch (err: any) {
      setError(err.message || '发送消息失败');
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'chatting':
        return 'bg-blue-100 text-blue-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const config = agent.config as any;
  const welcomeMessage = config?.welcomeMessage || '开始与智能体对话吧';

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      <div className="flex-shrink-0 p-4 border-b border-[var(--border-color)] flex items-center gap-4 bg-[var(--bg-secondary)]">
        <div className="w-10 h-10 text-2xl flex items-center justify-center bg-[var(--bg-tertiary)] rounded-xl">
          {agent.avatar || '🤖'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-[var(--text-primary)]">{agent.name}</h3>
          <p className="text-xs text-[var(--text-muted)] truncate">
            {agent.description?.slice(0, 50)}
            {agent.description && agent.description.length > 50 ? '...' : ''}
          </p>
        </div>
        <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(agent.status)}`}>
          {agent.status}
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {messages.length === 0 && !streamingContent && (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
            <div className="w-20 h-20 text-5xl mb-6 flex items-center justify-center bg-[var(--bg-tertiary)] rounded-2xl">
              {agent.avatar || '🤖'}
            </div>
            <p className="text-lg font-medium text-[var(--text-primary)] mb-2">{agent.name}</p>
            <p className="text-sm text-center max-w-md">{welcomeMessage}</p>
            {config?.exampleQuestions && config.exampleQuestions.length > 0 && (
              <div className="mt-6 space-y-2">
                {config.exampleQuestions.slice(0, 3).map((q: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    className="block w-full text-left px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-xl text-sm text-[var(--text-secondary)] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div
              key={message.id}
              className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isUser ? 'bg-[var(--ai-primary)]' : 'bg-[var(--bg-tertiary)]'
                }`}
              >
                {isUser ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                ) : (
                  <span className="text-lg">{agent.avatar || '🤖'}</span>
                )}
              </div>
              <div
                className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                  isUser
                    ? 'bg-[var(--ai-primary)] text-white rounded-tr-sm'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-tl-sm border border-[var(--border-color)]'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              </div>
            </div>
          );
        })}

        {streamingContent && (
          <div className="flex gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
              <span className="text-lg">{agent.avatar || '🤖'}</span>
            </div>
            <div className="max-w-[70%] px-4 py-3 rounded-2xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-tl-sm border border-[var(--border-color)]">
              <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
            </div>
          </div>
        )}

        {loading && !streamingContent && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
              <span className="text-lg">{agent.avatar || '🤖'}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-tertiary)] rounded-2xl border border-[var(--border-color)]">
              <div className="w-2 h-2 bg-[var(--ai-primary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-[var(--ai-primary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-[var(--ai-primary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="mx-4 mb-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex-shrink-0 p-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            disabled={loading}
            rows={1}
            className="flex-1 px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] focus:ring-2 focus:ring-[var(--ai-primary)]/20 resize-none transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-5 py-3 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentChat;
