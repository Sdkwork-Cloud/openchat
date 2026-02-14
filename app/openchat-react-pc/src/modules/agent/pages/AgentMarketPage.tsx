/**
 * Agent 市场页面
 *
 * 展示所有公开的智能体，支持分类筛选和搜索
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  Agent,
  AgentCategory,
  AgentCategoryInfo,
} from '../entities/agent.entity';
import { AgentCategory as AC } from '../entities/agent.entity';
import { agentService } from '../services/agent.service';

export function AgentMarketPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [categories, setCategories] = useState<AgentCategoryInfo[]>([]);
  const [recommendedAgents, setRecommendedAgents] = useState<Agent[]>([]);
  const [activeCategory, setActiveCategory] = useState<AgentCategory>(AC.ALL);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'rating'>('popular');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCategories();
    loadAgents();
  }, []);

  useEffect(() => {
    loadAgents();
  }, [activeCategory, sortBy]);

  const loadCategories = async () => {
    const data = await agentService.getCategories();
    setCategories(data);
  };

  const loadAgents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await agentService.searchAgents(
        searchKeyword,
        activeCategory,
        undefined,
        sortBy
      );
      setAgents(data);

      if (!searchKeyword && activeCategory === AC.ALL) {
        const recommended = await agentService.getRecommendedAgents(6);
        setRecommendedAgents(recommended);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchKeyword, activeCategory, sortBy]);

  const handleSearch = useCallback(() => {
    loadAgents();
  }, [loadAgents]);

  const handleCategoryChange = (category: AgentCategory) => {
    setActiveCategory(category);
  };

  const handleSortChange = (sort: 'popular' | 'newest' | 'rating') => {
    setSortBy(sort);
  };

  const handleAgentClick = (agentId: string) => {
    navigate(`/agents/${agentId}`);
  };

  const getAgentMeta = (agent: Agent) => {
    const config = agent.config as any;
    return {
      usageCount: config?.usageCount || 0,
      rating: config?.rating || 0,
      ratingCount: config?.ratingCount || 0,
      category: config?.category || AC.ALL,
      isAdded: config?.isAdded || false,
      isFavorited: config?.isFavorited || false,
      welcomeMessage: config?.welcomeMessage || '',
      exampleQuestions: config?.exampleQuestions || [],
    };
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] w-full">
      <div className="flex-shrink-0 px-6 py-5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl bg-[var(--ai-primary)] flex items-center justify-center mr-4 shadow-[var(--shadow-md)]">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Agent 市场</h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">发现和使用各种智能助手</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索智能体..."
                className="w-72 h-11 pl-11 pr-4 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] focus:ring-2 focus:ring-[var(--ai-primary)]/20 transition-all"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--ai-primary)] transition-colors cursor-pointer"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                onClick={handleSearch}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => navigate('/agents/create')}
              className="h-11 px-5 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] text-white text-sm font-medium rounded-xl transition-all flex items-center shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              创建 Agent
            </button>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)] overflow-x-auto">
        <div className="flex items-center space-x-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={`relative px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 min-w-[80px] ${
                activeCategory === category.id
                  ? 'bg-[var(--ai-primary)] text-white shadow-[var(--shadow-md)]'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span className="mr-1.5">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-[1400px] mx-auto">
          {activeCategory === AC.ALL && !searchKeyword && recommendedAgents.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center">
                  <div className="w-1 h-5 bg-[var(--ai-primary)] rounded-full mr-3" />
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">推荐智能体</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {recommendedAgents.map((agent, index) => (
                  <RecommendedAgentCard
                    key={agent.id}
                    agent={agent}
                    meta={getAgentMeta(agent)}
                    onClick={() => handleAgentClick(agent.id)}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center">
                <div className="w-1 h-5 bg-[var(--ai-primary)] rounded-full mr-3" />
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {activeCategory === AC.ALL ? '全部智能体' : categories.find((c) => c.id === activeCategory)?.name}
                </h2>
                <span className="ml-3 px-2 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-xs rounded-full">
                  {agents.length}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-[var(--text-muted)]">排序：</span>
                <div className="flex items-center bg-[var(--bg-tertiary)] rounded-lg p-1">
                  {(['popular', 'newest', 'rating'] as const).map((sort) => (
                    <button
                      key={sort}
                      onClick={() => handleSortChange(sort)}
                      className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                        sortBy === sort
                          ? 'bg-[var(--ai-primary)] text-white shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {sort === 'popular' && '最热'}
                      {sort === 'newest' && '最新'}
                      {sort === 'rating' && '评分'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-[400px]">
                <div className="w-10 h-10 border-3 border-[var(--ai-primary)] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm text-[var(--text-muted)]">正在加载智能体...</p>
              </div>
            ) : agents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px]">
                <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-[var(--text-primary)] mb-1">暂无智能体</h3>
                <p className="text-sm text-[var(--text-muted)]">该分类下暂时没有智能体</p>
              </div>
            ) : (
              <div
                className="grid gap-5 justify-start"
                style={{ gridTemplateColumns: 'repeat(auto-fill, 280px)' }}
              >
                {agents.map((agent, index) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    meta={getAgentMeta(agent)}
                    onClick={() => handleAgentClick(agent.id)}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AgentMeta {
  usageCount: number;
  rating: number;
  ratingCount: number;
  category: AgentCategory;
  isAdded: boolean;
  isFavorited: boolean;
  welcomeMessage: string;
  exampleQuestions: string[];
}

function RecommendedAgentCard({
  agent,
  meta,
  onClick,
  index,
}: {
  agent: Agent;
  meta: AgentMeta;
  onClick: () => void;
  index: number;
}) {
  return (
    <div
      onClick={onClick}
      className="group flex flex-col items-center p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl cursor-pointer transition-all duration-300 hover:border-[var(--ai-primary)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-1"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="relative mb-4">
        <div className="w-16 h-16 text-4xl flex items-center justify-center bg-[var(--bg-tertiary)] rounded-2xl transition-transform duration-300 group-hover:scale-110">
          {agent.avatar || '🤖'}
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[var(--ai-success)] border-2 border-[var(--bg-secondary)] rounded-full" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] text-center truncate w-full mb-1">
        {agent.name}
      </h3>
      <p className="text-xs text-[var(--text-muted)] flex items-center">
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        {meta.usageCount.toLocaleString()} 人使用
      </p>
    </div>
  );
}

function AgentCard({
  agent,
  meta,
  onClick,
  index,
}: {
  agent: Agent;
  meta: AgentMeta;
  onClick: () => void;
  index: number;
}) {
  return (
    <div
      onClick={onClick}
      className="group flex flex-col p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl cursor-pointer transition-all duration-300 hover:border-[var(--ai-primary)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-1"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="flex items-start mb-4">
        <div className="w-12 h-12 text-3xl flex items-center justify-center bg-[var(--bg-tertiary)] rounded-xl mr-3 flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
          {agent.avatar || '🤖'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-[var(--text-primary)] truncate mb-0.5">{agent.name}</h3>
          <p className="text-xs text-[var(--text-muted)] truncate">{agent.type}</p>
        </div>
        <span className={`px-2 py-0.5 text-xs rounded-full ${
          agent.status === 'ready' ? 'bg-green-100 text-green-700' :
          agent.status === 'chatting' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {agent.status}
        </span>
      </div>

      <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4 flex-1 leading-relaxed">
        {agent.description || '暂无描述'}
      </p>

      {agent.capabilities && agent.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {agent.capabilities.slice(0, 3).map((cap) => (
            <span key={cap.name} className="px-2 py-0.5 bg-[var(--ai-primary-soft)] text-[var(--ai-primary)] text-[10px] font-medium rounded-md">
              {cap.name}
            </span>
          ))}
          {agent.capabilities.length > 3 && (
            <span className="px-2 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-[10px] rounded-md">
              +{agent.capabilities.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
        <div className="flex items-center space-x-4 text-xs text-[var(--text-muted)]">
          <span className="flex items-center">
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {meta.usageCount.toLocaleString()}
          </span>
          <span className="flex items-center">
            <svg className="w-3.5 h-3.5 mr-1.5 text-[var(--ai-warning)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {meta.rating.toFixed(1)}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="px-4 py-2 text-xs font-medium rounded-xl bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] text-white shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all"
        >
          查看
        </button>
      </div>
    </div>
  );
}

export default AgentMarketPage;
