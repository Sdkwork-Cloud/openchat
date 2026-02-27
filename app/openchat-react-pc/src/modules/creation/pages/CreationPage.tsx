import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Image, Video, Music, Box, Search, Plus,
  Heart, Eye, Download, Share2, MoreHorizontal, Wand2,
  Sliders, X, ChevronRight
} from 'lucide-react';
import { CreationService } from '../services/CreationService';
import { CreationItem, CreationType, CreationTemplate, CreationStats } from '../types';
import { useLiveQuery } from '../../../core/hooks';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardContent } from '../../../components/ui/Card';
import { ScrollArea } from '../../../components/ui/ScrollArea';
import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/Dialog';
import { Textarea } from '../../../components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/Select';
import { Slider } from '../../../components/ui/Slider';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

const typeIcons: Record<CreationType, React.ReactNode> = {
  image: <Image className="w-5 h-5" />,
  video: <Video className="w-5 h-5" />,
  music: <Music className="w-5 h-5" />,
  text: <Sparkles className="w-5 h-5" />,
  '3d': <Box className="w-5 h-5" />
};

const typeLabels: Record<CreationType, string> = {
  image: 'AI绘图',
  video: '视频生成',
  music: 'AI音乐',
  text: '文本创作',
  '3d': '3D建模'
};

const CreationCard: React.FC<{ 
  item: CreationItem; 
  onClick: () => void;
  onLike: () => void;
}> = ({ item, onClick, onLike }) => {
  return (
    <div 
      className="group relative bg-card rounded-xl overflow-hidden border cursor-pointer hover:shadow-lg transition-all"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <img 
          src={item.thumbnail || item.url} 
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="bg-black/50 text-white border-0">
            {typeIcons[item.type]}
            <span className="ml-1">{typeLabels[item.type]}</span>
          </Badge>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-sm font-medium truncate">{item.title}</p>
          <p className="text-xs text-white/70 truncate">{item.style}</p>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <img 
            src={item.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.author}`}
            alt=""
            className="w-6 h-6 rounded-full"
          />
          <span className="text-sm text-muted-foreground truncate flex-1">{item.author}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {item.views > 999 ? `${(item.views / 1000).toFixed(1)}k` : item.views}
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); onLike(); }}
              className="flex items-center gap-1 hover:text-red-500 transition-colors"
            >
              <Heart className="w-4 h-4" />
              {item.likes}
            </button>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); }}
            className="p-1 hover:bg-muted rounded"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const CreateDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  template?: CreationTemplate;
}> = ({ isOpen, onClose, template }) => {
  const [type, setType] = useState<CreationType>(template?.type || 'image');
  const [prompt, setPrompt] = useState(template?.defaultPrompt || '');
  const [negativePrompt, setNegativePrompt] = useState(template?.defaultNegativePrompt || '');
  const [ratio, setRatio] = useState(template?.defaultRatio || '1:1');
  const [style, setStyle] = useState(template?.defaultStyle || '绘图');
  const [model, setModel] = useState('');
  const [steps, setSteps] = useState(30);
  const [cfgScale, setCfgScale] = useState(7);
  const [isCreating, setIsCreating] = useState(false);

  const styles = CreationService.getStyles();
  const ratios = CreationService.getRatios();
  const models = CreationService.getModels(type);

  useEffect(() => {
    if (models.length > 0) setModel(models[0]);
  }, [type, models]);

  const handleCreate = async () => {
    if (!prompt.trim()) {
      toast.error('请输入提示词');
      return;
    }

    setIsCreating(true);
    const { data } = await CreationService.create({
      prompt,
      negativePrompt,
      type,
      ratio,
      style,
      model,
      steps,
      cfgScale
    });
    setIsCreating(false);

    if (data) {
      toast.success('创作成功！');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            AI创作
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Type Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">创作类型</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(typeLabels) as CreationType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all",
                    type === t 
                      ? "border-primary bg-primary/5 text-primary" 
                      : "hover:bg-muted"
                  )}
                >
                  {typeIcons[t]}
                  <span className="text-xs">{typeLabels[t]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="text-sm font-medium mb-2 block">提示词</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述你想要创作的内容..."
              className="min-h-[100px]"
            />
          </div>

          {/* Negative Prompt */}
          <div>
            <label className="text-sm font-medium mb-2 block">反向提示词（可选）</label>
            <Input
              value={negativePrompt}
              onChange={(value) => setNegativePrompt(value)}
              placeholder="描述你不想要的内容..."
            />
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">风格</label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {styles.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">比例</label>
              <Select value={ratio} onValueChange={setRatio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ratios.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">模型</label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">迭代步数: {steps}</label>
              <Slider
                value={[steps]}
                onValueChange={([v]) => setSteps(v)}
                min={10}
                max={50}
                step={1}
              />
            </div>
          </div>

          {/* CFG Scale */}
          <div>
            <label className="text-sm font-medium mb-2 block">CFG Scale: {cfgScale}</label>
            <Slider
              value={[cfgScale]}
              onValueChange={([v]) => setCfgScale(v)}
              min={1}
              max={15}
              step={0.5}
            />
            <p className="text-xs text-muted-foreground mt-1">
              值越高，生成结果越遵循提示词；值越低，AI有更多创作自由
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>取消</Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  创作中...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  开始创作
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const CreationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState<CreationType | 'all'>('all');
  const [activeStyle, setActiveStyle] = useState('全部');
  const [templates, setTemplates] = useState<CreationTemplate[]>([]);
  const [stats, setStats] = useState<CreationStats | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CreationTemplate | undefined>();

  const styles = CreationService.getStyles();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const [{ data: t }, { data: s }] = await Promise.all([
      CreationService.getTemplates(),
      CreationService.getStats()
    ]);
    if (t) setTemplates(t);
    if (s) setStats(s);
  };

  const { data: feedData, viewStatus, refresh } = useLiveQuery(
    () => CreationService.getFeed({
      type: activeType === 'all' ? undefined : activeType,
      style: activeStyle === '全部' ? undefined : activeStyle
    }),
    [activeType, activeStyle]
  );

  const feed: CreationItem[] = (feedData as any)?.content || [];

  const handleLike = async (id: string) => {
    await CreationService.like(id);
    refresh();
  };

  const handleTemplateClick = (template: CreationTemplate) => {
    setSelectedTemplate(template);
    setIsCreateOpen(true);
  };

  return (
    <div className="h-full w-full flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 border-b flex items-center justify-between px-6 bg-card">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI创作
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(value) => setSearchQuery(value)}
                placeholder="搜索作品..."
                className="pl-10"
              />
            </div>
            <Button onClick={() => { setSelectedTemplate(undefined); setIsCreateOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" />
              创作
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            {/* Templates */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">创作模板</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {templates.map(template => (
                  <Card 
                    key={template.id}
                    className="cursor-pointer hover:shadow-lg transition-all group"
                    onClick={() => handleTemplateClick(template)}
                  >
                    <div className="relative aspect-video overflow-hidden rounded-t-lg">
                      <img 
                        src={template.preview} 
                        alt={template.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Wand2 className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
              <Tabs value={activeType} onValueChange={(v) => setActiveType(v as any)}>
                <TabsList>
                  <TabsTrigger value="all">全部</TabsTrigger>
                  {(Object.keys(typeLabels) as CreationType[]).map(t => (
                    <TabsTrigger key={t} value={t}>{typeLabels[t]}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <Select value={activeStyle} onValueChange={setActiveStyle}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="风格" />
                </SelectTrigger>
                <SelectContent>
                  {styles.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gallery */}
            {feed.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">暂无作品</p>
                <p className="text-sm mt-1">点击创作按钮开始你的AI创作之旅</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {feed.map(item => (
                  <CreationCard
                    key={item.id}
                    item={item}
                    onClick={() => navigate(`/creation/${item.id}`)}
                    onLike={() => handleLike(item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l bg-card hidden xl:block">
        <div className="p-6">
          {/* Stats */}
          {stats && (
            <div className="mb-6">
              <h4 className="font-semibold mb-4">我的创作</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{stats.totalCreations}</div>
                  <div className="text-xs text-muted-foreground">作品</div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{stats.totalLikes}</div>
                  <div className="text-xs text-muted-foreground">获赞</div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{stats.totalViews}</div>
                  <div className="text-xs text-muted-foreground">浏览</div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">
                    {Object.values(stats.byType).reduce((a, b) => a + b, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">类型</div>
                </div>
              </div>
            </div>
          )}

          {/* Type Distribution */}
          {stats && (
            <div className="mb-6">
              <h4 className="font-semibold mb-4">类型分布</h4>
              <div className="space-y-2">
                {Object.entries(stats.byType)
                  .filter(([, count]) => count > 0)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {typeIcons[type as CreationType]}
                        <span className="text-sm">{typeLabels[type as CreationType]}</span>
                      </div>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <h4 className="font-semibold mb-4">快捷操作</h4>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/my-creations')}>
                <Image className="w-4 h-4 mr-2" />
                我的作品
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/creation/history')}>
                <Sliders className="w-4 h-4 mr-2" />
                创作历史
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <CreateDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        template={selectedTemplate}
      />
    </div>
  );
};
