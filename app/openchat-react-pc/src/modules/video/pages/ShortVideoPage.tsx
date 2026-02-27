import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Heart, MessageCircle, Share2, Bookmark,
  Search, Filter, TrendingUp, Clock, MoreHorizontal,
  ChevronLeft, ChevronRight, Volume2, VolumeX
} from 'lucide-react';
import { VideoService } from '../services/VideoService';
import { Video, VideoType, VideoStats } from '../types';
import { useLiveQuery } from '../../../core/hooks';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { ScrollArea } from '../../../components/ui/ScrollArea';
import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/Avatar';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

const typeLabels: Record<VideoType, { label: string; color: string }> = {
  neural: { label: '神经网络', color: '#8b5cf6' },
  matrix: { label: '数据流', color: '#10b981' },
  aurora: { label: '极光', color: '#06b6d4' },
  cyber: { label: '赛博朋克', color: '#f43f5e' },
  nature: { label: '自然', color: '#22c55e' }
};

const VideoCard: React.FC<{
  video: Video;
  onClick: () => void;
  onLike: () => void;
}> = ({ video, onClick, onLike }) => {
  return (
    <div
      className="group relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer bg-muted"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <img
        src={video.thumbnail}
        alt={video.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Duration */}
      <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded text-white text-xs">
        {VideoService.formatDuration(video.duration)}
      </div>

      {/* Type Badge */}
      <div className="absolute top-2 left-2">
        <Badge
          style={{ backgroundColor: typeLabels[video.type].color }}
          className="text-white border-0"
        >
          {typeLabels[video.type].label}
        </Badge>
      </div>

      {/* Play Button */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Play className="w-8 h-8 text-white fill-white" />
        </div>
      </div>

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        <h4 className="font-semibold text-sm line-clamp-2 mb-1">{video.title}</h4>
        <p className="text-xs text-white/70 line-clamp-1 mb-2">{video.description}</p>

        <div className="flex items-center gap-2 mb-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={video.authorAvatar} />
            <AvatarFallback>{video.author[0]}</AvatarFallback>
          </Avatar>
          <span className="text-xs">@{video.author}</span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <Play className="w-3 h-3" />
            {VideoService.formatCount(video.views)}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onLike(); }}
            className="flex items-center gap-1 hover:text-red-400 transition-colors"
          >
            <Heart className={cn("w-3 h-3", video.hasLiked && "fill-red-500 text-red-500")} />
            {VideoService.formatCount(video.likes)}
          </button>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            {VideoService.formatCount(video.comments)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="absolute top-1/2 right-2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onLike(); }}
          className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70"
        >
          <Heart className={cn("w-4 h-4", video.hasLiked && "fill-red-500 text-red-500")} />
        </button>
        <button className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70">
          <Bookmark className={cn("w-4 h-4", video.hasCollected && "fill-yellow-400 text-yellow-400")} />
        </button>
        <button className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70">
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const ShortVideoPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeType, setActiveType] = useState<VideoType | 'all'>('all');
  const [stats, setStats] = useState<VideoStats | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data } = await VideoService.getStats();
    if (data) setStats(data);
  };

  const { data: videosData, viewStatus, refresh } = useLiveQuery(
    () => VideoService.getVideos({
      type: activeType === 'all' ? undefined : activeType,
      search: searchQuery
    }),
    [activeType, searchQuery]
  );

  const videos: Video[] = (videosData as any)?.content || [];

  const handleLike = async (id: string) => {
    await VideoService.toggleLike(id);
    refresh();
    loadStats();
  };

  return (
    <div className="h-full w-full flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 border-b flex items-center justify-between px-6 bg-card">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            短视频
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(value) => setSearchQuery(value)}
                placeholder="搜索视频..."
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            {/* Categories */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
              <button
                onClick={() => setActiveType('all')}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                  activeType === 'all'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                全部
              </button>
              {(Object.keys(typeLabels) as VideoType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    activeType === type
                      ? "text-white"
                      : "bg-muted hover:bg-muted/80"
                  )}
                  style={{
                    backgroundColor: activeType === type ? typeLabels[type].color : undefined
                  }}
                >
                  {typeLabels[type].label}
                </button>
              ))}
            </div>

            {/* Video Grid */}
            {videos.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Play className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">暂无视频</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {videos.map(video => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onClick={() => navigate(`/video/${video.id}`)}
                    onLike={() => handleLike(video.id)}
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
              <h4 className="font-semibold mb-4">平台数据</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{VideoService.formatCount(stats.totalVideos)}</div>
                  <div className="text-xs text-muted-foreground">视频</div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{VideoService.formatCount(stats.totalViews)}</div>
                  <div className="text-xs text-muted-foreground">播放</div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{VideoService.formatCount(stats.totalLikes)}</div>
                  <div className="text-xs text-muted-foreground">点赞</div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{Object.keys(stats.byType).length}</div>
                  <div className="text-xs text-muted-foreground">分类</div>
                </div>
              </div>
            </div>
          )}

          {/* Trending */}
          <div className="mb-6">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              热门标签
            </h4>
            <div className="flex flex-wrap gap-2">
              {['#AI', '#Neural', '#Cyberpunk', '#Nature', '#Matrix', '#Aurora'].map(tag => (
                <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-primary/20">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Recommended Creators */}
          <div>
            <h4 className="font-semibold mb-4">推荐创作者</h4>
            <div className="space-y-3">
              {[
                { name: 'Omni Vision', followers: '120K' },
                { name: 'Tech Core', followers: '85K' },
                { name: 'Nature Bot', followers: '200K' }
              ].map((creator, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${creator.name}`} />
                    <AvatarFallback>{creator.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{creator.name}</div>
                    <div className="text-xs text-muted-foreground">{creator.followers} 粉丝</div>
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
