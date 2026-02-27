import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Compass, Flame, Clock, TrendingUp, Play, FileText,
  Image as ImageIcon, Headphones, ChevronLeft, ChevronRight,
  Heart, Eye, Bookmark, Share2
} from 'lucide-react';
import { DiscoverService } from '../services/DiscoverService';
import { DiscoverItem, DiscoverCategory, DiscoverBanner, ContentType } from '../types';
import { useLiveQuery } from '../../../core/hooks';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { ScrollArea } from '../../../components/ui/ScrollArea';
import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { cn } from '../../../lib/utils';

const typeIcons: Record<ContentType, React.ReactNode> = {
  article: <FileText className="w-4 h-4" />,
  video: <Play className="w-4 h-4" />,
  image: <ImageIcon className="w-4 h-4" />,
  audio: <Headphones className="w-4 h-4" />
};

const BannerCarousel: React.FC<{ banners: DiscoverBanner[] }> = ({ banners }) => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <div className="relative h-[280px] rounded-2xl overflow-hidden group">
      {banners.map((banner, idx) => (
        <div
          key={banner.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-500 cursor-pointer",
            idx === current ? "opacity-100" : "opacity-0"
          )}
          style={{ background: banner.bgColor }}
          onClick={() => navigate(banner.link)}
        >
          <img
            src={banner.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 flex flex-col justify-center px-12">
            <h3 className="text-3xl font-bold text-white mb-2">{banner.title}</h3>
            <p className="text-white/80 text-lg">{banner.subtitle}</p>
            <Button className="mt-6 w-fit bg-white/20 hover:bg-white/30 text-white border-0">
              了解更多
            </Button>
          </div>
        </div>
      ))}

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              idx === current ? "bg-white w-6" : "bg-white/50"
            )}
          />
        ))}
      </div>

      {/* Arrows */}
      <button
        onClick={() => setCurrent(prev => (prev - 1 + banners.length) % banners.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={() => setCurrent(prev => (prev + 1) % banners.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
};

const CategoryGrid: React.FC<{
  categories: DiscoverCategory[];
  activeId: string;
  onSelect: (id: string) => void;
}> = ({ categories, activeId, onSelect }) => {
  return (
    <div className="grid grid-cols-5 gap-4">
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-xl transition-all",
            activeId === cat.id
              ? "bg-primary/10 ring-2 ring-primary/30"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
          >
            <Compass className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium">{cat.name}</span>
          <span className="text-xs text-muted-foreground">{cat.count}</span>
        </button>
      ))}
    </div>
  );
};

const ContentCard: React.FC<{ item: DiscoverItem }> = ({ item }) => {
  const navigate = useNavigate();

  return (
    <div
      className="group bg-card rounded-xl overflow-hidden border hover:shadow-lg transition-all cursor-pointer"
      onClick={() => item.url && navigate(item.url)}
    >
      {/* Cover */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={item.cover}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-black/50 text-white border-0">
            {typeIcons[item.type]}
            <span className="ml-1 capitalize">{item.type}</span>
          </Badge>
        </div>
        <button className="absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <Bookmark className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <h4 className="font-semibold text-base line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {item.title}
        </h4>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {item.summary}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {item.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
              #{tag}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs">
              {item.source[0]}
            </div>
            <span className="truncate max-w-[80px]">{item.source}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {item.reads > 999 ? `${(item.reads / 1000).toFixed(1)}k` : item.reads}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {item.likes}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DiscoverPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'recommend'>('recommend');
  const [banners, setBanners] = useState<DiscoverBanner[]>([]);
  const [categories, setCategories] = useState<DiscoverCategory[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const [{ data: b }, { data: c }] = await Promise.all([
      DiscoverService.getBanners(),
      DiscoverService.getCategories()
    ]);
    if (b) setBanners(b);
    if (c) setCategories(c);
  };

  const { data: feedData, viewStatus, refresh } = useLiveQuery(
    () => DiscoverService.getFeed({ category: activeCategory, sortBy }),
    [activeCategory, sortBy]
  );

  const feed: DiscoverItem[] = (feedData as any)?.content || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="h-full w-full flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 border-b flex items-center justify-between px-6 bg-card">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            发现
          </h2>
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(value) => setSearchQuery(value)}
                placeholder="搜索感兴趣的内容..."
                className="pl-10"
              />
            </div>
          </form>
          <div className="flex items-center gap-2">
            <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <TabsList>
                <TabsTrigger value="recommend">
                  <Compass className="w-4 h-4 mr-1" />
                  推荐
                </TabsTrigger>
                <TabsTrigger value="hot">
                  <Flame className="w-4 h-4 mr-1" />
                  热门
                </TabsTrigger>
                <TabsTrigger value="new">
                  <Clock className="w-4 h-4 mr-1" />
                  最新
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {/* Banner */}
            {banners.length > 0 && (
              <div className="mb-8">
                <BannerCarousel banners={banners} />
              </div>
            )}

            {/* Categories */}
            {categories.length > 0 && (
              <div className="mb-8">
                <CategoryGrid
                  categories={categories}
                  activeId={activeCategory}
                  onSelect={setActiveCategory}
                />
              </div>
            )}

            {/* Content Grid */}
            {feed.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Compass className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">暂无内容</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {feed.map(item => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </div>
            )}

            {/* Load More */}
            {feed.length > 0 && (
              <div className="text-center mt-8">
                <Button variant="outline" onClick={() => {}}>
                  加载更多
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l bg-card hidden xl:block">
        <div className="p-6">
          {/* Trending */}
          <div className="mb-6">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              热门趋势
            </h4>
            <div className="space-y-3">
              {['#AI革命', '#数字游民', '#极简设计', '#远程办公', '#创意编程'].map((tag, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-primary cursor-pointer hover:underline">{tag}</span>
                  <span className="text-xs text-muted-foreground">{Math.floor(Math.random() * 10 + 1)}k 讨论</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="mb-6">
            <h4 className="font-semibold mb-4">快速入口</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="justify-start" onClick={() => navigate('/moments')}>
                <Compass className="w-4 h-4 mr-2" />
                社交圈
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => navigate('/agents')}>
                <Play className="w-4 h-4 mr-2" />
                Agent市场
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => navigate('/commerce/mall')}>
                <ImageIcon className="w-4 h-4 mr-2" />
                商城
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => navigate('/notifications')}>
                <Heart className="w-4 h-4 mr-2" />
                消息中心
              </Button>
            </div>
          </div>

          {/* Recommended Creators */}
          <div>
            <h4 className="font-semibold mb-4">推荐创作者</h4>
            <div className="space-y-3">
              {[
                { name: 'AI实验室', desc: '专注AI技术分享' },
                { name: '设计达人', desc: 'UI/UX设计教程' },
                { name: '极客时间', desc: '前沿技术解读' }
              ].map((creator, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                    {creator.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{creator.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{creator.desc}</div>
                  </div>
                  <Button size="sm" variant="outline">关注</Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
