/**
 * Memory 管理面板组件
 *
 * 职责：管理智能体记忆和知识库
 */

import { useState, useEffect, useCallback } from 'react';
import { memoryService } from '../services/memory.service';
import { MemoryType, MemorySource } from '../entities/memory.entity';
import type {
  AgentMemory,
  KnowledgeDocument,
  MemoryStats,
  KnowledgeStats,
} from '../entities/memory.entity';

interface MemoryPanelProps {
  agentId: string;
}

const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  [MemoryType.EPISODIC]: '情景记忆',
  [MemoryType.SEMANTIC]: '语义记忆',
  [MemoryType.PROCEDURAL]: '程序记忆',
  [MemoryType.WORKING]: '工作记忆',
};

const MEMORY_SOURCE_LABELS: Record<MemorySource, string> = {
  [MemorySource.CONVERSATION]: '对话',
  [MemorySource.DOCUMENT]: '文档',
  [MemorySource.SYSTEM]: '系统',
  [MemorySource.USER]: '用户',
  [MemorySource.KNOWLEDGE]: '知识库',
};

export const MemoryPanel: React.FC<MemoryPanelProps> = ({ agentId }) => {
  const [activeTab, setActiveTab] = useState<'memory' | 'knowledge' | 'stats'>('memory');
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [knowledgeStats, setKnowledgeStats] = useState<KnowledgeStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addMemoryOpen, setAddMemoryOpen] = useState(false);
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  const [newMemory, setNewMemory] = useState({ content: '', type: MemoryType.EPISODIC });
  const [newDocument, setNewDocument] = useState({ title: '', content: '' });

  useEffect(() => {
    loadData();
  }, [agentId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [memoriesData, documentsData, memStats, knowStats] = await Promise.all([
        memoryService.getMemories(agentId, { limit: 50 }),
        memoryService.getKnowledgeDocuments(agentId),
        memoryService.getStats(agentId),
        memoryService.getKnowledgeStats(agentId),
      ]);
      setMemories(memoriesData);
      setDocuments(documentsData);
      setMemoryStats(memStats);
      setKnowledgeStats(knowStats);
    } catch (err: any) {
      setError(err.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadData();
      return;
    }
    setLoading(true);
    try {
      const results = await memoryService.searchMemories(agentId, searchQuery);
      setMemories(results.map((r) => r.memory));
    } catch (err: any) {
      setError(err.message || '搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemory = async () => {
    if (!newMemory.content.trim()) return;
    setLoading(true);
    try {
      await memoryService.storeMemory(agentId, {
        content: newMemory.content,
        type: newMemory.type,
      });
      setAddMemoryOpen(false);
      setNewMemory({ content: '', type: MemoryType.EPISODIC });
      loadData();
    } catch (err: any) {
      setError(err.message || '添加记忆失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!window.confirm('确定要删除这条记忆吗？')) return;
    try {
      await memoryService.deleteMemory(agentId, memoryId);
      loadData();
    } catch (err: any) {
      setError(err.message || '删除失败');
    }
  };

  const handleAddDocument = async () => {
    if (!newDocument.title.trim() || !newDocument.content.trim()) return;
    setLoading(true);
    try {
      await memoryService.addKnowledgeDocument(agentId, {
        title: newDocument.title,
        content: newDocument.content,
      });
      setAddDocumentOpen(false);
      setNewDocument({ title: '', content: '' });
      loadData();
    } catch (err: any) {
      setError(err.message || '添加文档失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('确定要删除这个文档吗？')) return;
    try {
      await memoryService.deleteKnowledgeDocument(agentId, documentId);
      loadData();
    } catch (err: any) {
      setError(err.message || '删除失败');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-700';
      case 'processing':
        return 'bg-yellow-100 text-yellow-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      <div className="flex-shrink-0 border-b border-[var(--border-color)]">
        <div className="flex">
          {[
            { key: 'memory', label: '记忆', icon: '🧠' },
            { key: 'knowledge', label: '知识库', icon: '📚' },
            { key: 'stats', label: '统计', icon: '📊' },
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

      {error && (
        <div className="mx-4 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center p-4">
          <div className="w-6 h-6 border-2 border-[var(--ai-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'memory' && (
          <div>
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索记忆..."
                className="flex-1 px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)]"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-hover)] transition-colors"
              >
                <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button
                onClick={() => setAddMemoryOpen(true)}
                className="px-4 py-2 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] text-white rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:border-[var(--ai-primary)] transition-colors"
                >
                  <p className="text-sm text-[var(--text-primary)] mb-2 line-clamp-2">
                    {memory.content}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-xs rounded-md">
                        {MEMORY_TYPE_LABELS[memory.type]}
                      </span>
                      <span className="px-2 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-xs rounded-md">
                        {MEMORY_SOURCE_LABELS[memory.source]}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(memory.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteMemory(memory.id)}
                      className="p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {memories.length === 0 && (
                <div className="text-center py-8 text-[var(--text-muted)]">
                  暂无记忆数据
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div>
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setAddDocumentOpen(true)}
                className="px-4 py-2 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] text-white rounded-xl transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                添加文档
              </button>
            </div>

            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">{doc.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(doc.status)}`}>
                          {doc.status}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {doc.chunkCount} 个片段 · {doc.tokenCount} tokens
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {documents.length === 0 && (
                <div className="text-center py-8 text-[var(--text-muted)]">
                  暂无知识文档
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            {memoryStats && (
              <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                <h3 className="text-base font-medium text-[var(--text-primary)] mb-4">记忆统计</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">总记忆数</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{memoryStats.totalMemories}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">总 Tokens</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{memoryStats.totalTokens}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">平均重要性</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{memoryStats.avgImportance.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)] mb-2">按类型分布</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(memoryStats.byType).map(([type, count]) => (
                        <span key={type} className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs rounded-md">
                          {MEMORY_TYPE_LABELS[type as MemoryType]}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {knowledgeStats && (
              <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                <h3 className="text-base font-medium text-[var(--text-primary)] mb-4">知识库统计</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">文档数</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{knowledgeStats.totalDocuments}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">片段数</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{knowledgeStats.totalChunks}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">总 Tokens</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{knowledgeStats.totalTokens}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {addMemoryOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-md bg-[var(--bg-secondary)] rounded-2xl shadow-xl">
            <div className="p-4 border-b border-[var(--border-color)]">
              <h3 className="text-lg font-medium text-[var(--text-primary)]">添加记忆</h3>
            </div>
            <div className="p-4 space-y-4">
              <textarea
                value={newMemory.content}
                onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                placeholder="记忆内容..."
                rows={4}
                className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] resize-none"
              />
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-2">记忆类型</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(MEMORY_TYPE_LABELS).map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => setNewMemory({ ...newMemory, type: type as MemoryType })}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        newMemory.type === type
                          ? 'bg-[var(--ai-primary)] text-white'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
              <button
                onClick={() => setAddMemoryOpen(false)}
                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddMemory}
                disabled={!newMemory.content.trim()}
                className="px-4 py-2 text-sm bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {addDocumentOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-md bg-[var(--bg-secondary)] rounded-2xl shadow-xl">
            <div className="p-4 border-b border-[var(--border-color)]">
              <h3 className="text-lg font-medium text-[var(--text-primary)]">添加知识文档</h3>
            </div>
            <div className="p-4 space-y-4">
              <input
                type="text"
                value={newDocument.title}
                onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                placeholder="文档标题"
                className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)]"
              />
              <textarea
                value={newDocument.content}
                onChange={(e) => setNewDocument({ ...newDocument, content: e.target.value })}
                placeholder="文档内容..."
                rows={6}
                className="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--ai-primary)] resize-none"
              />
            </div>
            <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
              <button
                onClick={() => setAddDocumentOpen(false)}
                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddDocument}
                disabled={!newDocument.title.trim() || !newDocument.content.trim()}
                className="px-4 py-2 text-sm bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryPanel;
