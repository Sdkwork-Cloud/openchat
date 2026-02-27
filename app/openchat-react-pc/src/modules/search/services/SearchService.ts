import { eventEmitter, AppEvents } from '../../../core/events';
import { Result } from '../../../core/types';
import { 
  SearchResultItem, 
  SearchResultType, 
  SearchFilters, 
  SearchHistoryItem,
  SearchSuggestion 
} from '../types';

// Mock data for demonstration
const MOCK_AGENTS: SearchResultItem[] = [
  { id: 'agent_1', title: 'ChatGPT', subtitle: 'OpenAI', description: '强大的对话AI助手', type: 'agent', score: 100, icon: '🤖' },
  { id: 'agent_2', title: 'Claude', subtitle: 'Anthropic', description: '安全可靠的AI助手', type: 'agent', score: 95, icon: '🧠' },
  { id: 'agent_3', title: 'Midjourney', subtitle: 'AI绘图', description: '创意图像生成', type: 'agent', score: 90, icon: '🎨' },
];

const MOCK_CONTACTS: SearchResultItem[] = [
  { id: 'contact_1', title: '张三', subtitle: '产品经理', description: 'zhangsan@example.com', type: 'contact', score: 100, icon: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zhang' },
  { id: 'contact_2', title: '李四', subtitle: '设计师', description: 'lisi@example.com', type: 'contact', score: 95, icon: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Li' },
  { id: 'contact_3', title: '王五', subtitle: '工程师', description: 'wangwu@example.com', type: 'contact', score: 90, icon: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wang' },
];

const MOCK_FILES: SearchResultItem[] = [
  { id: 'file_1', title: '项目计划书.pdf', subtitle: '文档', description: '2.5 MB · 昨天', type: 'file', score: 100, icon: '📄' },
  { id: 'file_2', title: '设计稿.fig', subtitle: '设计', description: '15 MB · 3天前', type: 'file', score: 95, icon: '🎨' },
  { id: 'file_3', title: '会议记录.docx', subtitle: '文档', description: '500 KB · 上周', type: 'file', score: 90, icon: '📝' },
];

const MOCK_COMMANDS: SearchResultItem[] = [
  { id: 'cmd_1', title: '新建对话', subtitle: '快捷键', description: '创建新的AI对话会话', type: 'command', score: 100, icon: '💬', meta: { shortcut: '⌘N' } },
  { id: 'cmd_2', title: '打开设置', subtitle: '快捷键', description: '进入应用设置页面', type: 'command', score: 95, icon: '⚙️', meta: { shortcut: '⌘,' } },
  { id: 'cmd_3', title: '切换主题', subtitle: '快捷键', description: '在明暗主题间切换', type: 'command', score: 90, icon: '🌓', meta: { shortcut: '⌘⇧L' } },
  { id: 'cmd_4', title: '清空聊天记录', subtitle: '操作', description: '清空当前会话的所有消息', type: 'command', score: 85, icon: '🗑️' },
];

const MOCK_SETTINGS: SearchResultItem[] = [
  { id: 'setting_1', title: '账号信息', subtitle: '设置', description: '管理您的账号和个人资料', type: 'setting', score: 100, icon: '👤' },
  { id: 'setting_2', title: '通知设置', subtitle: '设置', description: '配置消息通知偏好', type: 'setting', score: 95, icon: '🔔' },
  { id: 'setting_3', title: '隐私设置', subtitle: '设置', description: '管理隐私和安全选项', type: 'setting', score: 90, icon: '🔒' },
  { id: 'setting_4', title: '主题外观', subtitle: '设置', description: '自定义界面主题和外观', type: 'setting', score: 85, icon: '🎨' },
];

class SearchServiceImpl {
  private HISTORY_KEY = 'sys_search_history_v2';
  private MAX_HISTORY = 20;

  constructor() {
    eventEmitter.on(AppEvents.DATA_UPDATED, () => {
      // Invalidate cache when data changes
    });
  }

  async search(query: string, filters: SearchFilters = {}): Promise<Result<SearchResultItem[]>> {
    if (!query.trim()) {
      return { success: true, data: [] };
    }

    const lowerQuery = query.toLowerCase();
    const results: SearchResultItem[] = [];

    // Search in different sources based on filter
    const typesToSearch: SearchResultType[] = 
      filters.type && filters.type !== 'all' 
        ? [filters.type] 
        : ['agent', 'contact', 'file', 'command', 'setting'];

    for (const type of typesToSearch) {
      let items: SearchResultItem[] = [];
      
      switch (type) {
        case 'agent':
          items = MOCK_AGENTS;
          break;
        case 'contact':
          items = MOCK_CONTACTS;
          break;
        case 'file':
          items = MOCK_FILES;
          break;
        case 'command':
          items = MOCK_COMMANDS;
          break;
        case 'setting':
          items = MOCK_SETTINGS;
          break;
      }

      const matched = items.filter(item => 
        item.title.toLowerCase().includes(lowerQuery) ||
        item.description?.toLowerCase().includes(lowerQuery) ||
        item.subtitle?.toLowerCase().includes(lowerQuery)
      );

      results.push(...matched);
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    // Apply date filter if specified
    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = Date.now();
      const ranges: Record<string, number> = {
        today: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
      };
      
      const cutoff = now - (ranges[filters.dateRange] || 0);
      const filtered = results.filter(r => !r.timestamp || r.timestamp > cutoff);
      return { success: true, data: filtered };
    }

    return { success: true, data: results.slice(0, 20) };
  }

  async getHistory(): Promise<Result<SearchHistoryItem[]>> {
    try {
      const raw = localStorage.getItem(this.HISTORY_KEY);
      const history: SearchHistoryItem[] = raw ? JSON.parse(raw) : [];
      return { success: true, data: history };
    } catch {
      return { success: true, data: [] };
    }
  }

  async addHistory(query: string, resultCount: number): Promise<Result<void>> {
    if (!query.trim()) return { success: true };

    const { data: history = [] } = await this.getHistory();
    
    // Remove existing entry
    const filtered = history.filter(h => h.query !== query);
    
    // Add new entry at the beginning
    filtered.unshift({
      id: `h_${Date.now()}`,
      query: query.trim(),
      timestamp: Date.now(),
      resultCount,
    });

    // Keep only recent entries
    const trimmed = filtered.slice(0, this.MAX_HISTORY);
    
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(trimmed));
    return { success: true };
  }

  async clearHistory(): Promise<Result<void>> {
    localStorage.removeItem(this.HISTORY_KEY);
    return { success: true };
  }

  async removeHistoryItem(id: string): Promise<Result<void>> {
    const { data: history = [] } = await this.getHistory();
    const filtered = history.filter(h => h.id !== id);
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(filtered));
    return { success: true };
  }

  async getSuggestions(query: string): Promise<Result<SearchSuggestion[]>> {
    if (!query.trim()) {
      // Return recent history as suggestions
      const { data: history = [] } = await this.getHistory();
      const suggestions: SearchSuggestion[] = history.slice(0, 5).map(h => ({
        id: h.id,
        text: h.query,
        type: 'history',
      }));
      return { success: true, data: suggestions };
    }

    // Return related suggestions based on query
    const suggestions: SearchSuggestion[] = [
      { id: 's1', text: `${query} 相关文件`, type: 'related' },
      { id: 's2', text: `${query} 聊天记录`, type: 'related' },
      { id: 's3', text: `${query} 智能体`, type: 'related' },
    ];

    return { success: true, data: suggestions };
  }

  async getTrending(): Promise<Result<SearchSuggestion[]>> {
    const trending: SearchSuggestion[] = [
      { id: 't1', text: 'AI绘图', type: 'trending' },
      { id: 't2', text: '代码助手', type: 'trending' },
      { id: 't3', text: '文档总结', type: 'trending' },
      { id: 't4', text: '翻译', type: 'trending' },
    ];
    return { success: true, data: trending };
  }

  executeCommand(item: SearchResultItem): void {
    switch (item.type) {
      case 'command':
        eventEmitter.emit('command:execute', { command: item.meta?.command || item.id });
        break;
      case 'setting':
        eventEmitter.emit('navigate', { path: '/settings' });
        break;
      default:
        eventEmitter.emit('navigate', { path: `/${item.type}/${item.id}` });
    }
  }
}

export const SearchService = new SearchServiceImpl();
