/**
 * Agent 详情页面
 *
 * 展示 Agent 详细信息，包括：
 * - Agent 基本信息
 * - 使用统计
 * - 示例问题
 * - 开始对话按钮
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Agent, AgentStats } from '../entities/agent.entity';
import { agentService } from '../services/agent.service';

/**
 * Agent 详情页面
 */
export function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadAgentData(id);
    }
  }, [id]);

  const loadAgentData = async (agentId: string) => {
    setIsLoading(true);
    try {
      const [agentData, statsData] = await Promise.all([
        agentService.getAgent(agentId),
        agentService.getAgentStats(agentId),
      ]);
      setAgent(agentData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load agent data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 添加到我的 Agent
  const handleAddAgent = async () => {
    if (!agent) return;
    try {
      await agentService.addAgent(agent.id);
      loadAgentData(agent.id);
    } catch (error) {
      console.error('Failed to add agent:', error);
    }
  };

  // 收藏 Agent
  const handleFavoriteAgent = async () => {
    if (!agent) return;
    try {
      if (agent.isFavorited) {
        await agentService.unfavoriteAgent(agent.id);
      } else {
        await agentService.favoriteAgent(agent.id);
      }
      loadAgentData(agent.id);
    } catch (error) {
      console.error('Failed to favorite agent:', error);
    }
  };

  // 开始对话
  const handleStartChat = async () => {
    if (!agent) return;
    try {
      // 创建新会话
      const conversation = await agentService.createConversation(agent.id, `与 ${agent.name} 的对话`);
      // 跳转到对话页面
      navigate(`/agents/chat/${conversation.id}`);
    } catch (error) {
      console.error('Failed to start chat:', error);
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
      {/* 头部 */}
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
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Agent 详情</h1>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* 基本信息卡片 */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 mb-6">
            <div className="flex items-start">
              {/* 头像 */}
              <div className="w-24 h-24 text-6xl mr-6">{agent.avatar}</div>

              {/* 信息 */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{agent.name}</h2>
                    <p className="text-[var(--text-secondary)] mb-4">{agent.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-[var(--text-muted)]">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {agent.creatorName}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {agent.usageCount.toLocaleString()} 人使用
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-[var(--ai-warning)]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {agent.rating.toFixed(1)} ({agent.ratingCount} 评价)
                      </span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleFavoriteAgent}
                      className={`p-3 rounded-xl transition-colors ${
                        agent.isFavorited
                          ? 'bg-[var(--ai-warning)]/10 text-[var(--ai-warning)]'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--ai-warning)]'
                      }`}
                    >
                      <svg className="w-6 h-6" fill={agent.isFavorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                    {!agent.isAdded && (
                      <button
                        onClick={handleAddAgent}
                        className="px-4 py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-xl transition-colors"
                      >
                        添加到我的
                      </button>
                    )}
                    <button
                      onClick={handleStartChat}
                      className="px-6 py-3 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] text-white font-medium rounded-xl transition-colors flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      开始对话
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 统计数据 */}
          {stats && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <StatCard
                title="总使用次数"
                value={stats.totalUsage.toLocaleString()}
                icon="📊"
              />
              <StatCard
                title="今日使用"
                value={stats.todayUsage.toLocaleString()}
                icon="📈"
              />
              <StatCard
                title="本周使用"
                value={stats.weeklyUsage.toLocaleString()}
                icon="📅"
              />
              <StatCard
                title="收藏数"
                value={stats.favoriteCount.toLocaleString()}
                icon="⭐"
              />
            </div>
          )}

          {/* 能力标签 */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">能力标签</h3>
            <div className="flex flex-wrap gap-2">
              {agent.capabilities.map((capability) => (
                <span
                  key={capability}
                  className="px-3 py-1.5 bg-[var(--ai-primary-soft)] text-[var(--ai-primary)] text-sm rounded-lg"
                >
                  {getCapabilityLabel(capability)}
                </span>
              ))}
            </div>
          </div>

          {/* 示例问题 */}
          {agent.exampleQuestions && agent.exampleQuestions.length > 0 && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">示例问题</h3>
              <div className="space-y-3">
                {agent.exampleQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      handleStartChat();
                    }}
                    className="w-full text-left px-4 py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-xl transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 统计卡片
 */
function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">{value}</div>
      <div className="text-sm text-[var(--text-muted)]">{title}</div>
    </div>
  );
}

/**
 * 获取能力标签显示名称
 */
function getCapabilityLabel(capability: string): string {
  const labels: Record<string, string> = {
    chat: '对话',
    'image-generation': '图像生成',
    'code-generation': '代码生成',
    'document-analysis': '文档分析',
    'web-search': '网络搜索',
    'data-analysis': '数据分析',
    translation: '翻译',
    summarization: '摘要生成',
  };
  return labels[capability] || capability;
}

export default AgentDetailPage;
