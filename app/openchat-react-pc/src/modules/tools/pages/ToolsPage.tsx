import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench, Search, Star, Clock, Copy, Check, RefreshCw,
  QrCode, Lock, Fingerprint, Clock3, Braces, Code, Link,
  Type, FileText, Palette, Hash, Search as SearchIcon,
  GitCompare, Code2, Sparkles, Bot, ChevronRight
} from 'lucide-react';
import { ToolsService } from '../services/ToolsService';
import { Tool, ToolCategory, ToolHistory, PasswordOptions } from '../types';
import { useLiveQuery } from '../../../core/hooks';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { ScrollArea } from '../../../components/ui/ScrollArea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Textarea } from '../../../components/ui/Textarea';
import { Slider } from '../../../components/ui/Slider';
import { Switch } from '../../../components/ui/Switch';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

const iconMap: Record<string, React.ElementType> = {
  'qr': QrCode,
  'lock': Lock,
  'fingerprint': Fingerprint,
  'clock': Clock3,
  'braces': Braces,
  'code': Code,
  'link': Link,
  'type': Type,
  'file-text': FileText,
  'palette': Palette,
  'hash': Hash,
  'search': SearchIcon,
  'git-compare': GitCompare,
  'code-2': Code2,
  'sparkles': Sparkles,
  'bot': Bot,
};

const categoryColors: Record<ToolCategory, string> = {
  utility: 'bg-blue-500',
  converter: 'bg-green-500',
  generator: 'bg-purple-500',
  developer: 'bg-orange-500',
  ai: 'bg-pink-500',
};

const ToolCard: React.FC<{ tool: Tool; onClick: () => void }> = ({ tool, onClick }) => {
  const Icon = iconMap[tool.icon] || Wrench;
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white", categoryColors[tool.category])}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium truncate">{tool.name}</h4>
              {tool.isNew && <Badge className="text-xs bg-green-500">NEW</Badge>}
              {tool.isPopular && <Badge className="text-xs bg-orange-500">HOT</Badge>}
            </div>
            <p className="text-sm text-muted-foreground truncate">{tool.description}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardContent>
    </Card>
  );
};

// UUID Generator Component
const UUIDGenerator: React.FC = () => {
  const [uuid, setUuid] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = () => {
    setUuid(ToolsService.generateUUID());
    setCopied(false);
  };

  useEffect(() => { generate(); }, []);

  const copy = () => {
    navigator.clipboard.writeText(uuid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('已复制到剪贴板');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input value={uuid} readOnly className="font-mono text-lg" />
        <Button variant="outline" size="icon" onClick={copy}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
      <Button onClick={generate} className="w-full">
        <RefreshCw className="w-4 h-4 mr-2" />
        重新生成
      </Button>
    </div>
  );
};

// Password Generator Component
const PasswordGenerator: React.FC = () => {
  const [password, setPassword] = useState('');
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
  });
  const [copied, setCopied] = useState(false);

  const generate = () => {
    const pwd = ToolsService.generatePassword(options);
    if (pwd) {
      setPassword(pwd);
      setCopied(false);
    } else {
      toast.error('请至少选择一种字符类型');
    }
  };

  useEffect(() => { generate(); }, [options]);

  const copy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('已复制到剪贴板');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input value={password} readOnly className="font-mono text-lg" />
        <Button variant="outline" size="icon" onClick={copy}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">密码长度: {options.length}</label>
          <Slider
            value={[options.length]}
            onValueChange={([v]) => setOptions({ ...options, length: v })}
            min={6}
            max={32}
            step={1}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">大写字母</span>
            <Switch
              checked={options.includeUppercase}
              onCheckedChange={(v) => setOptions({ ...options, includeUppercase: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">小写字母</span>
            <Switch
              checked={options.includeLowercase}
              onCheckedChange={(v) => setOptions({ ...options, includeLowercase: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">数字</span>
            <Switch
              checked={options.includeNumbers}
              onCheckedChange={(v) => setOptions({ ...options, includeNumbers: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">特殊符号</span>
            <Switch
              checked={options.includeSymbols}
              onCheckedChange={(v) => setOptions({ ...options, includeSymbols: v })}
            />
          </div>
        </div>
      </div>

      <Button onClick={generate} className="w-full">
        <RefreshCw className="w-4 h-4 mr-2" />
        重新生成
      </Button>
    </div>
  );
};

// JSON Formatter Component
const JSONFormatter: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isValid, setIsValid] = useState(true);

  const format = () => {
    const formatted = ToolsService.formatJSON(input);
    const valid = ToolsService.validateJSON(input);
    setOutput(formatted);
    setIsValid(valid);
    if (valid) {
      toast.success('格式化成功');
    } else {
      toast.error('JSON格式无效');
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    toast.success('已复制到剪贴板');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">输入 JSON</label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="粘贴JSON内容..."
            className="min-h-[300px] font-mono text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">格式化结果</label>
          <Textarea
            value={output}
            readOnly
            className={cn(
              "min-h-[300px] font-mono text-sm",
              !isValid && "border-red-500"
            )}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={format}>
          <Braces className="w-4 h-4 mr-2" />
          格式化
        </Button>
        <Button variant="outline" onClick={copy} disabled={!output}>
          <Copy className="w-4 h-4 mr-2" />
          复制结果
        </Button>
      </div>
    </div>
  );
};

// Base64 Converter Component
const Base64Converter: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');

  const convert = () => {
    if (mode === 'encode') {
      setOutput(ToolsService.encodeBase64(input));
    } else {
      setOutput(ToolsService.decodeBase64(input));
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    toast.success('已复制到剪贴板');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={mode === 'encode' ? 'default' : 'outline'} onClick={() => setMode('encode')}>
          编码
        </Button>
        <Button variant={mode === 'decode' ? 'default' : 'outline'} onClick={() => setMode('decode')}>
          解码
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">输入</label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'encode' ? '输入文本...' : '输入Base64...'}
            className="min-h-[200px]"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">输出</label>
          <Textarea
            value={output}
            readOnly
            className="min-h-[200px] font-mono text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={convert}>
          <Code className="w-4 h-4 mr-2" />
          转换
        </Button>
        <Button variant="outline" onClick={copy} disabled={!output}>
          <Copy className="w-4 h-4 mr-2" />
          复制
        </Button>
      </div>
    </div>
  );
};

export const ToolsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'all'>('all');
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [popularTools, setPopularTools] = useState<Tool[]>([]);
  const [newTools, setNewTools] = useState<Tool[]>([]);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    const [{ data: all }, { data: popular }, { data: newT }] = await Promise.all([
      ToolsService.getTools(),
      ToolsService.getPopularTools(),
      ToolsService.getNewTools(),
    ]);
    if (all) setTools(all);
    if (popular) setPopularTools(popular);
    if (newT) setNewTools(newT);
  };

  const filteredTools = tools.filter(tool => {
    const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderToolComponent = (toolId: string) => {
    switch (toolId) {
      case 'uuid':
        return <UUIDGenerator />;
      case 'password':
        return <PasswordGenerator />;
      case 'json-formatter':
        return <JSONFormatter />;
      case 'base64':
        return <Base64Converter />;
      default:
        return (
          <div className="text-center py-12 text-muted-foreground">
            <Wrench className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>该工具正在开发中</p>
          </div>
        );
    }
  };

  return (
    <div className="h-full w-full flex">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card hidden lg:block">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
              placeholder="搜索工具..."
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-2 space-y-1">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                activeCategory === 'all' ? "bg-primary/10 text-primary" : "hover:bg-muted"
              )}
            >
              <Wrench className="w-4 h-4" />
              全部工具
            </button>
            {(Object.keys(categoryColors) as ToolCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  activeCategory === cat ? "bg-primary/10 text-primary" : "hover:bg-muted"
                )}
              >
                <div className={cn("w-2 h-2 rounded-full", categoryColors[cat])} />
                {ToolsService.getCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedTool ? (
          // Tool Detail View
          <>
            <div className="h-16 border-b flex items-center justify-between px-6 bg-card">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedTool(null)}>
                  ← 返回
                </Button>
                <h2 className="text-xl font-semibold">{selectedTool.name}</h2>
              </div>
            </div>
            <ScrollArea className="flex-1 p-6">
              <div className="max-w-3xl mx-auto">
                <p className="text-muted-foreground mb-6">{selectedTool.description}</p>
                {renderToolComponent(selectedTool.id)}
              </div>
            </ScrollArea>
          </>
        ) : (
          // Tools Grid View
          <>
            <div className="h-16 border-b flex items-center px-6 bg-card">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                工具箱
              </h2>
            </div>

            <ScrollArea className="flex-1 p-6">
              <div className="px-6 space-y-8">
                {/* Popular Tools */}
                {popularTools.length > 0 && activeCategory === 'all' && !searchQuery && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      热门工具
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {popularTools.map(tool => (
                        <ToolCard
                          key={tool.id}
                          tool={tool}
                          onClick={() => setSelectedTool(tool)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* New Tools */}
                {newTools.length > 0 && activeCategory === 'all' && !searchQuery && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-green-500" />
                      新上线
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {newTools.map(tool => (
                        <ToolCard
                          key={tool.id}
                          tool={tool}
                          onClick={() => setSelectedTool(tool)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* All Tools */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    {activeCategory === 'all' ? '全部工具' : ToolsService.getCategoryLabel(activeCategory)}
                  </h3>
                  {filteredTools.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Wrench className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>未找到匹配的工具</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredTools.map(tool => (
                        <ToolCard
                          key={tool.id}
                          tool={tool}
                          onClick={() => setSelectedTool(tool)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
};
