import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, X, Clock, TrendingUp, Command, Bot, User, FileText, 
  Settings, MessageSquare, ArrowRight, Trash2, Sparkles
} from 'lucide-react';
import { SearchService } from '../services/SearchService';
import { SearchResultItem, SearchResultType, SearchSuggestion } from '../types';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { ScrollArea } from '../../../components/ui/ScrollArea';
import { toast } from 'sonner';

interface SearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeIcons: Record<SearchResultType, React.ReactNode> = {
  agent: <Bot className="w-4 h-4" />,
  chat: <MessageSquare className="w-4 h-4" />,
  contact: <User className="w-4 h-4" />,
  file: <FileText className="w-4 h-4" />,
  article: <FileText className="w-4 h-4" />,
  creation: <Sparkles className="w-4 h-4" />,
  command: <Command className="w-4 h-4" />,
  setting: <Settings className="w-4 h-4" />,
};

const typeLabels: Record<SearchResultType, string> = {
  agent: '智能体',
  chat: '聊天',
  contact: '联系人',
  file: '文件',
  article: '文章',
  creation: '作品',
  command: '命令',
  setting: '设置',
};

const HighlightText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
  if (!highlight.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-primary/20 text-primary font-medium rounded px-0.5">
            {part}
          </mark>
        ) : part
      )}
    </>
  );
};

export const SearchPalette: React.FC<SearchPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [history, setHistory] = useState<SearchSuggestion[]>([]);
  const [trending, setTrending] = useState<SearchSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      loadInitialData();
    }
  }, [isOpen]);

  // Load initial data (history and trending)
  const loadInitialData = async () => {
    const [{ data: hist }, { data: trend }] = await Promise.all([
      SearchService.getSuggestions(''),
      SearchService.getTrending(),
    ]);
    setHistory(hist || []);
    setTrending(trend || []);
  };

  // Search when query changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim()) {
        setIsLoading(true);
        const { data } = await SearchService.search(query);
        setResults(data || []);
        setSelectedIndex(0);
        
        // Load suggestions
        const { data: suggs } = await SearchService.getSuggestions(query);
        setSuggestions(suggs || []);
        setIsLoading(false);
      } else {
        setResults([]);
        setSuggestions([]);
        loadInitialData();
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = query.trim() ? results : [...suggestions, ...history];
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (items[selectedIndex]) {
          handleSelect(items[selectedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [query, results, suggestions, history, selectedIndex, onClose]);

  const handleSelect = async (item: SearchResultItem | SearchSuggestion) => {
    if ('title' in item) {
      // It's a search result
      await SearchService.addHistory(query, results.length);
      
      switch (item.type) {
        case 'agent':
          navigate(`/agents/${item.id}`);
          break;
        case 'contact':
          navigate(`/contacts/${item.id}`);
          break;
        case 'file':
          navigate('/drive');
          break;
        case 'command':
          SearchService.executeCommand(item);
          break;
        case 'setting':
          navigate('/settings');
          break;
        default:
          navigate(`/${item.type}/${item.id}`);
      }
    } else {
      // It's a suggestion
      setQuery((item as SearchSuggestion).text);
      return;
    }
    
    onClose();
    setQuery('');
  };

  const handleClearHistory = async () => {
    await SearchService.clearHistory();
    setHistory([]);
    toast.success('搜索历史已清空');
  };

  const renderIcon = (item: SearchResultItem) => {
    if (typeof item.icon === 'string' && item.icon.startsWith('http')) {
      return <img src={item.icon} alt="" className="w-8 h-8 rounded-full object-cover" />;
    }
    if (typeof item.icon === 'string') {
      return <span className="text-xl">{item.icon}</span>;
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
        {typeIcons[item.type]}
      </div>
    );
  };

  if (!isOpen) return null;

  const hasResults = results.length > 0;
  const hasSuggestions = suggestions.length > 0 || history.length > 0 || trending.length > 0;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Palette */}
      <div 
        className="relative w-full max-w-2xl bg-card rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索智能体、联系人、文件、命令..."
            className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted rounded border">
            ESC
          </kbd>
        </div>

        {/* Content */}
        <div className="max-h-[60vh]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              搜索中...
            </div>
          ) : query.trim() && hasResults ? (
            // Search Results
            <ScrollArea className="max-h-[60vh]">
              <div className="py-2">
                {results.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                      selectedIndex === index && "bg-primary/5"
                    )}
                  >
                    {renderIcon(item)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          <HighlightText text={item.title} highlight={query} />
                        </span>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {typeLabels[item.type]}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          <HighlightText text={item.description} highlight={query} />
                        </p>
                      )}
                    </div>
                    {item.meta?.shortcut && (
                      <kbd className="px-2 py-0.5 text-xs bg-muted rounded">
                        {item.meta.shortcut}
                      </kbd>
                    )}
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : query.trim() && !hasResults ? (
            // No Results
            <div className="p-8 text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>未找到 "{query}" 相关结果</p>
              <p className="text-sm mt-1">尝试其他关键词或检查拼写</p>
            </div>
          ) : (
            // Initial State - Suggestions & History
            <ScrollArea className="max-h-[60vh]">
              <div className="py-2">
                {/* Recent History */}
                {history.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between px-4 mb-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        最近搜索
                      </div>
                      <button 
                        onClick={handleClearHistory}
                        className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        清空
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 px-4">
                      {history.map((item, index) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          className={cn(
                            "px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-full transition-colors",
                            selectedIndex === index && "bg-primary/10 text-primary"
                          )}
                        >
                          {item.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending */}
                {trending.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 px-4 mb-2 text-sm text-muted-foreground">
                      <TrendingUp className="w-4 h-4" />
                      热门搜索
                    </div>
                    <div className="flex flex-wrap gap-2 px-4">
                      {trending.map((item, index) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          className={cn(
                            "px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-full transition-colors",
                            selectedIndex === (history.length + index) && "bg-primary/10 text-primary"
                          )}
                        >
                          {item.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="mt-6 px-4">
                  <div className="text-sm text-muted-foreground mb-2">快速访问</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => { navigate('/chat'); onClose(); }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left"
                    >
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <span className="text-sm">新建对话</span>
                    </button>
                    <button 
                      onClick={() => { navigate('/agents'); onClose(); }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left"
                    >
                      <Bot className="w-4 h-4 text-primary" />
                      <span className="text-sm">Agent市场</span>
                    </button>
                    <button 
                      onClick={() => { navigate('/settings'); onClose(); }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left"
                    >
                      <Settings className="w-4 h-4 text-primary" />
                      <span className="text-sm">设置</span>
                    </button>
                    <button 
                      onClick={() => { navigate('/notifications'); onClose(); }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left"
                    >
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-[10px] text-white">5</span>
                      </div>
                      <span className="text-sm">消息中心</span>
                    </button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 text-xs text-muted-foreground border-t">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background rounded border">↑↓</kbd>
              导航
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background rounded border">↵</kbd>
              选择
            </span>
          </div>
          <div>
            {results.length > 0 && `${results.length} 个结果`}
          </div>
        </div>
      </div>
    </div>
  );
};
