/**
 * Agent 详情页面
 *
 * 展示 Agent 详细信息，支持开始对话和管理记忆
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Agent, AgentSession } from '../entities/agent.entity';
import { agentService } from '../services/agent.service';
import { AgentChat } from '../components/AgentChat';
import { MemoryPanel } from '../components/MemoryPanel';

export function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [session, setSession] = useState<AgentSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'memory' | 'config'>('chat');

  useEffect(() => {
    if (id) {
      loadAgentData(id);
    }
  }, [id]);

  const loadAgentData = async (agentId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const agentData = await agentService.getAgent(agentId);
      setAgent(agentData);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!agent) return;
    try {
      const newSession = await agentService.createSession(agent.id, {
        title: `与 ${agent.name} 的对话`,
      });
      setSession(newSession);
      setActiveTab('chat');
    } catch (err: any) {
      setError(err.message || '创建会话失败');
    }
  };

  const handleSessionCreated = (newSession: AgentSession) => {
    setSession(newSession);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-700';
      case 'chatting':
        return 'bg-blue-100 text-blue-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--ai-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <svg className="w-16 h-16 text-[var(--text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Agent 不存在</h2>
        <p className="text-[var(--text-muted)] mb-4">该智能体可能已被删除或下架</p>
        <button
          onClick={() => navigate('/agents')}
          className="px-4 py-2 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] text-white rounded-lg transition-colors"
        >
          返回市场
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      <div className="flex-shrink-0 px-6 py-4 border-b border-[var(--border-color)]">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/agents')}
            className="mr-4 p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="w-12 h-12 text-3xl flex items-center justify-center bg-[var(--bg-tertiary)] rounded-xl mr-4">
            {agent.avatar || '🤖'}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">{agent.name}</h1>
            <p className="text-sm text-[var(--text-muted)]">{agent.description || '暂无描述'}</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(agent.status)}`}>
              {agent.status}
            </span>
            <button
              onClick={handleStartChat}
              className="px-4 py-2 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] text-white rounded-lg transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              新对话
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex-shrink-0 border-b border-[var(--border-color)] px-6">
        <div className="flex">
          {[
            { key: 'chat', label: '对话', icon: '💬' },
            { key: 'memory', label: '记忆管理', icon: '🧠' },
            { key: 'config', label: '配置', icon: '⚙️' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[var(--ai-primary)] text-[var(--ai-primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <AgentChat
            agent={agent}
            session={session || undefined}
            onSessionCreated={handleSessionCreated}
          />
        )}

        {activeTab === 'memory' && (
          <MemoryPanel agentId={agent.id} />
        )}

        {activeTab === 'config' && (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="p-6 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">基本信息</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-[var(--text-muted)]">名称</label>
                    <p className="text-[var(--text-primary)]">{agent.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-[var(--text-muted)]">类型</label>
                    <p className="text-[var(--text-primary)]">{agent.type}</p>
                  </div>
                  <div>
                    <label className="text-sm text-[var(--text-muted)]">状态</label>
                    <p className="text-[var(--text-primary)]">{agent.status}</p>
                  </div>
                  <div>
                    <label className="text-sm text-[var(--text-muted)]">公开</label>
                    <p className="text-[var(--text-primary)]">{agent.isPublic ? '是' : '否'}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">模型配置</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-[var(--text-muted)]">模型</label>
                    <p className="text-[var(--text-primary)]">{agent.config?.model || '默认'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-[var(--text-muted)]">温度</label>
                    <p className="text-[var(--text-primary)]">{agent.config?.temperature ?? 0.7}</p>
                  </div>
                  <div>
                    <label className="text-sm text-[var(--text-muted)]">最大 Tokens</label>
                    <p className="text-[var(--text-primary)]">{agent.config?.maxTokens ?? 4096}</p>
                  </div>
                  {agent.config?.llm && (
                    <div>
                      <label className="text-sm text-[var(--text-muted)]">LLM 提供商</label>
                      <p className="text-[var(--text-primary)]">{agent.config.llm.provider}</p>
                    </div>
                  )}
                </div>
              </div>

              {agent.config?.systemPrompt && (
                <div className="p-6 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">系统提示词</h3>
                  <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap bg-[var(--bg-tertiary)] p-4 rounded-xl">
                    {agent.config.systemPrompt}
                  </pre>
                </div>
              )}

              {agent.capabilities && agent.capabilities.length > 0 && (
                <div className="p-6 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">能力</h3>
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities.map((cap) => (
                      <span
                        key={cap.name}
                        className={`px-3 py-1.5 text-sm rounded-lg ${
                          cap.enabled
                            ? 'bg-[var(--ai-primary-soft)] text-[var(--ai-primary)]'
                            : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                        }`}
                      >
                        {cap.name}
                        {cap.type !== 'custom' && ` (${cap.type})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentDetailPage;
