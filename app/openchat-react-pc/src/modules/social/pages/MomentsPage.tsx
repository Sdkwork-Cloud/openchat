import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, MessageCircle, Share2, MoreHorizontal, Image as ImageIcon, 
  MapPin, Globe, Lock, Send, X, ChevronLeft, ChevronRight,
  UserPlus, Users, TrendingUp
} from 'lucide-react';
import { MomentsService } from '../services/MomentsService';
import { Moment, Comment, SocialStats } from '../types';
import { useLiveQuery } from '../../../core/hooks';
import { Button } from '../../../components/ui/Button';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/Avatar';
import { ScrollArea } from '../../../components/ui/ScrollArea';
import { Separator } from '../../../components/ui/Separator';
import { Textarea } from '../../../components/ui/Textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/Dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/DropdownMenu';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

const ImageGrid: React.FC<{ images: string[]; onImageClick: (index: number) => void }> = ({ images, onImageClick }) => {
  if (images.length === 0) return null;
  
  if (images.length === 1) {
    return (
      <div className="mt-3 max-w-md">
        <img 
          src={images[0]} 
          alt="" 
          className="rounded-lg cursor-pointer hover:opacity-95 transition-opacity max-h-80 object-cover"
          onClick={() => onImageClick(0)}
        />
      </div>
    );
  }

  if (images.length === 2) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2 max-w-md">
        {images.map((img, idx) => (
          <img 
            key={idx}
            src={img} 
            alt="" 
            className="rounded-lg cursor-pointer hover:opacity-95 transition-opacity aspect-square object-cover"
            onClick={() => onImageClick(idx)}
          />
        ))}
      </div>
    );
  }

  if (images.length === 3) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2 max-w-md">
        <img 
          src={images[0]} 
          alt="" 
          className="rounded-lg cursor-pointer hover:opacity-95 transition-opacity row-span-2 aspect-[3/4] object-cover"
          onClick={() => onImageClick(0)}
        />
        {images.slice(1).map((img, idx) => (
          <img 
            key={idx + 1}
            src={img} 
            alt="" 
            className="rounded-lg cursor-pointer hover:opacity-95 transition-opacity aspect-square object-cover"
            onClick={() => onImageClick(idx + 1)}
          />
        ))}
      </div>
    );
  }

  // 4+ images
  return (
    <div className="mt-3 grid grid-cols-3 gap-2 max-w-md">
      {images.slice(0, 9).map((img, idx) => (
        <div key={idx} className="relative aspect-square">
          <img 
            src={img} 
            alt="" 
            className="rounded-lg cursor-pointer hover:opacity-95 transition-opacity w-full h-full object-cover"
            onClick={() => onImageClick(idx)}
          />
          {idx === 8 && images.length > 9 && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center text-white font-medium">
              +{images.length - 9}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const MomentCard: React.FC<{ 
  moment: Moment; 
  onLike: (id: string) => void;
  onComment: (id: string) => void;
  onImageClick: (moment: Moment, index: number) => void;
}> = ({ moment, onLike, onComment, onImageClick }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    setIsSubmitting(true);
    await MomentsService.addComment(moment.id, commentText);
    setCommentText('');
    setIsSubmitting(false);
    toast.success('评论已发布');
  };

  return (
    <div className="bg-card rounded-xl p-5 mb-4 border shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar className="w-12 h-12 cursor-pointer" onClick={() => {}}>
          <AvatarImage src={moment.avatar} />
          <AvatarFallback>{moment.author[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-base hover:text-primary cursor-pointer">
              {moment.author}
            </h4>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>收藏</DropdownMenuItem>
                <DropdownMenuItem>举报</DropdownMenuItem>
                {moment.authorId === 'current_user' && (
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => MomentsService.deleteMoment(moment.id)}
                  >
                    删除
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
            <span>{moment.displayTime}</span>
            {moment.location && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {moment.location}
                </span>
              </>
            )}
            {!moment.isPublic && (
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                私密
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-3">
        <p className="text-base whitespace-pre-wrap leading-relaxed">{moment.content}</p>
        <ImageGrid images={moment.images} onImageClick={(idx) => onImageClick(moment, idx)} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6 mt-4 pt-3 border-t">
        <button 
          onClick={() => onLike(moment.id)}
          className={cn(
            "flex items-center gap-2 text-sm transition-colors",
            moment.hasLiked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Heart className={cn("w-5 h-5", moment.hasLiked && "fill-current")} />
          <span>{moment.likes > 0 ? moment.likes : '点赞'}</span>
        </button>
        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span>{moment.comments.length > 0 ? moment.comments.length : '评论'}</span>
        </button>
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Share2 className="w-5 h-5" />
          <span>分享</span>
        </button>
      </div>

      {/* Likes */}
      {moment.likedBy.length > 0 && (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <Heart className="w-4 h-4 text-red-500 fill-red-500" />
          <span className="text-foreground">
            {moment.likedBy.length} 人觉得很赞
          </span>
        </div>
      )}

      {/* Comments */}
      {(moment.comments.length > 0 || showComments) && (
        <div className="mt-3 bg-muted/50 rounded-lg p-3">
          {moment.comments.map((comment) => (
            <div key={comment.id} className="text-sm py-1">
              <span className="font-medium text-primary cursor-pointer">{comment.userName}</span>
              {comment.replyTo && (
                <>
                  <span className="text-muted-foreground"> 回复 </span>
                  <span className="font-medium text-primary">{comment.replyTo.userName}</span>
                </>
              )}
              <span className="text-muted-foreground">: </span>
              <span>{comment.text}</span>
            </div>
          ))}
          
          {showComments && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="写下你的评论..."
                className="min-h-[60px] resize-none"
              />
              <Button 
                size="icon" 
                className="shrink-0"
                disabled={!commentText.trim() || isSubmitting}
                onClick={handleSubmitComment}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PublishDialog: React.FC<{ isOpen: boolean; onClose: () => void; onPublish: () => void }> = ({ 
  isOpen, onClose, onPublish 
}) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePublish = async () => {
    if (!content.trim() && images.length === 0) return;
    
    setIsSubmitting(true);
    await MomentsService.publish({
      content,
      images,
      isPublic,
    });
    setIsSubmitting(false);
    onClose();
    onPublish();
    toast.success('动态已发布');
    setContent('');
    setImages([]);
  };

  const handleAddImage = () => {
    // Mock image upload
    const randomId = Math.floor(Math.random() * 100);
    setImages([...images, `https://picsum.photos/400/400?random=${randomId}`]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>发布动态</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="分享你的想法..."
            className="min-h-[120px] resize-none"
          />
          
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative">
                  <img src={img} alt="" className="w-20 h-20 rounded-lg object-cover" />
                  <button 
                    onClick={() => setImages(images.filter((_, i) => i !== idx))}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleAddImage}>
                <ImageIcon className="w-4 h-4 mr-1" />
                添加图片
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsPublic(!isPublic)}
              >
                {isPublic ? <Globe className="w-4 h-4 mr-1" /> : <Lock className="w-4 h-4 mr-1" />}
                {isPublic ? '公开' : '私密'}
              </Button>
            </div>
            <Button 
              onClick={handlePublish}
              disabled={(!content.trim() && images.length === 0) || isSubmitting}
            >
              {isSubmitting ? '发布中...' : '发布'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ImageViewer: React.FC<{
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}> = ({ images, currentIndex, isOpen, onClose, onPrev, onNext }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button 
        className="absolute top-4 right-4 text-white/80 hover:text-white"
        onClick={onClose}
      >
        <X className="w-8 h-8" />
      </button>
      
      {images.length > 1 && (
        <>
          <button 
            className="absolute left-4 text-white/80 hover:text-white disabled:opacity-30"
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-10 h-10" />
          </button>
          <button 
            className="absolute right-4 text-white/80 hover:text-white disabled:opacity-30"
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            disabled={currentIndex === images.length - 1}
          >
            <ChevronRight className="w-10 h-10" />
          </button>
        </>
      )}
      
      <img 
        src={images[currentIndex]} 
        alt="" 
        className="max-w-[90vw] max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
};

export const MomentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [stats, setStats] = useState<SocialStats | null>(null);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const { data: momentsData, viewStatus, refresh } = useLiveQuery(
    () => MomentsService.getFeed(),
    []
  );
  const moments: Moment[] = (momentsData as any) || [];

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data } = await MomentsService.getStats('current_user');
    if (data) setStats(data);
  };

  const handleLike = async (id: string) => {
    await MomentsService.likeMoment(id);
    refresh();
  };

  const handleImageClick = (moment: Moment, index: number) => {
    setViewerImages(moment.images);
    setViewerIndex(index);
    setIsViewerOpen(true);
  };

  return (
    <div className="h-full w-full flex">
      {/* Left Sidebar - User Info */}
      <div className="w-80 border-r bg-card hidden lg:block">
        <div className="p-6">
          {/* User Card */}
          <div className="text-center">
            <Avatar className="w-24 h-24 mx-auto">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" />
              <AvatarFallback>我</AvatarFallback>
            </Avatar>
            <h3 className="mt-4 text-xl font-semibold">AI User</h3>
            <p className="text-sm text-muted-foreground">分享生活，连接世界</p>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 mt-6 text-center">
              <div>
                <div className="text-xl font-bold">{stats.totalMoments}</div>
                <div className="text-xs text-muted-foreground">动态</div>
              </div>
              <div>
                <div className="text-xl font-bold">{stats.followers}</div>
                <div className="text-xs text-muted-foreground">粉丝</div>
              </div>
              <div>
                <div className="text-xl font-bold">{stats.following}</div>
                <div className="text-xs text-muted-foreground">关注</div>
              </div>
            </div>
          )}

          <Separator className="my-6" />

          {/* Quick Actions */}
          <div className="space-y-2">
            <Button 
              className="w-full justify-start gap-2"
              onClick={() => setIsPublishOpen(true)}
            >
              <ImageIcon className="w-4 h-4" />
              发布动态
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <UserPlus className="w-4 h-4" />
              发现好友
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <TrendingUp className="w-4 h-4" />
              热门动态
            </Button>
          </div>
        </div>
      </div>

      {/* Main Feed */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 border-b flex items-center justify-between px-6 bg-card">
          <h2 className="text-xl font-semibold">社交圈</h2>
          <div className="flex items-center gap-2 lg:hidden">
            <Button size="sm" onClick={() => setIsPublishOpen(true)}>
              <ImageIcon className="w-4 h-4 mr-1" />
              发布
            </Button>
          </div>
        </div>

        {/* Feed */}
        <ScrollArea className="flex-1">
          <div className="max-w-2xl mx-auto p-6">
            {moments.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">还没有动态</p>
                <p className="text-sm mt-1">点击发布按钮分享你的第一条动态</p>
              </div>
            ) : (
              moments.map((moment) => (
                <MomentCard
                  key={moment.id}
                  moment={moment}
                  onLike={handleLike}
                  onComment={() => {}}
                  onImageClick={handleImageClick}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Sidebar - Trending */}
      <div className="w-80 border-l bg-card hidden xl:block">
        <div className="p-6">
          <h4 className="font-semibold mb-4">热门话题</h4>
          <div className="space-y-3">
            {['#AI创作', '#科技前沿', '#生活分享', '#设计美学', '#编程技巧'].map((tag, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-primary cursor-pointer hover:underline">{tag}</span>
                <span className="text-muted-foreground">{Math.floor(Math.random() * 1000)} 讨论</span>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          <h4 className="font-semibold mb-4">推荐关注</h4>
          <div className="space-y-3">
            {['Tech Lead', 'Creative AI', '产品经理小王'].map((name, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`} />
                  <AvatarFallback>{name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{name}</div>
                  <div className="text-xs text-muted-foreground">{Math.floor(Math.random() * 100)} 粉丝</div>
                </div>
                <Button size="sm" variant="outline">关注</Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Publish Dialog */}
      <PublishDialog 
        isOpen={isPublishOpen} 
        onClose={() => setIsPublishOpen(false)}
        onPublish={() => { refresh(); loadStats(); }}
      />

      {/* Image Viewer */}
      <ImageViewer
        images={viewerImages}
        currentIndex={viewerIndex}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        onPrev={() => setViewerIndex(prev => Math.max(0, prev - 1))}
        onNext={() => setViewerIndex(prev => Math.min(viewerImages.length - 1, prev + 1))}
      />
    </div>
  );
};
