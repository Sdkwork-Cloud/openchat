
import React, { useEffect, useState, useRef } from 'react';
import { useQueryParams, navigateBack } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { ArticleService, Article } from '../services/ArticleService';
import { Avatar } from '../../../components/Avatar';
import { StreamMarkdown } from '../../../utils/markdown';
import { Toast } from '../../../components/Toast';
import { Skeleton } from '../../../components/Skeleton/Skeleton';
import { Platform } from '../../../platform';
import { ImageViewer } from '../../../components/ImageViewer/ImageViewer';

export const ArticleDetailPage: React.FC = () => {
    const query = useQueryParams();
    const id = query.get('id');
    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);
    const [scrollProgress, setScrollProgress] = useState(0);
    
    // Interaction states
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [comment, setComment] = useState('');
    const [following, setFollowing] = useState(false);
    const [commentsList, setCommentsList] = useState<any[]>([]);
    
    // UI states
    const [isInputFocused, setIsInputFocused] = useState(false);

    const commentInputRef = useRef<HTMLInputElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            setLoading(true);
            const res = await ArticleService.getArticleDetail(id);
            if (res.success && res.data) {
                setArticle(res.data);
                setLikesCount(Math.floor(res.data.reads / 10)); 
                setCommentsList(res.data.comments || []);
            }
            setLoading(false);
        };
        load();
    }, [id]);

    const handleScroll = () => {
        if (contentRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
            const scrolled = scrollTop / (scrollHeight - clientHeight);
            setScrollProgress(Math.min(100, Math.max(0, scrolled * 100)));
        }
    };

    const handleImageClick = (url: string) => {
        ImageViewer.show(url);
    };

    const handleLike = () => {
        if (liked) {
            setLiked(false);
            setLikesCount(c => c - 1);
        } else {
            setLiked(true);
            setLikesCount(c => c + 1);
            Platform.device.vibrate(10);
        }
    };

    const handleFollow = () => {
        if (!following) {
            Toast.success(`已关注 ${article?.source}`);
            setFollowing(true);
        } else {
            setFollowing(false);
        }
    };

    const handleShare = () => {
        Toast.success('链接已复制，去分享给好友吧');
    };

    const handleSendComment = () => {
        if (!comment.trim()) return;
        
        Platform.device.vibrate(10);
        const newComment = {
            user: 'Me',
            text: comment,
            likes: 0,
            isNew: true
        };
        setCommentsList(prev => [newComment, ...prev]);
        setComment('');
        Toast.success('评论发表成功');
        commentInputRef.current?.blur();
        setIsInputFocused(false);
    };

    const scrollToComments = () => {
        // Simple implementation: scroll to bottom of content
        if (contentRef.current) {
            contentRef.current.scrollTo({ top: contentRef.current.scrollHeight, behavior: 'smooth' });
        }
    };

    if (loading) {
        return (
            <div style={{ height: '100%', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column' }}>
                <Navbar title="" onBack={() => navigateBack()} variant="default" />
                <div style={{ padding: '20px' }}>
                    <Skeleton width="80%" height={28} style={{ marginBottom: '16px' }} />
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '30px' }}>
                        <Skeleton width={40} height={40} variant="circle" />
                        <div style={{ flex: 1 }}>
                            <Skeleton width={120} height={14} style={{ marginBottom: '6px' }} />
                            <Skeleton width={80} height={12} />
                        </div>
                    </div>
                    <Skeleton width="100%" height={200} style={{ marginBottom: '20px' }} />
                    <Skeleton width="100%" height={16} style={{ marginBottom: '10px' }} />
                    <Skeleton width="90%" height={16} style={{ marginBottom: '10px' }} />
                    <Skeleton width="95%" height={16} />
                </div>
            </div>
        );
    }

    if (!article) return <div style={{height: '100%', background: 'var(--bg-body)'}} />;

    return (
        <div style={{ height: '100%', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Reading Progress Bar */}
            <div style={{ position: 'absolute', top: '44px', left: 0, right: 0, height: '2px', background: 'transparent', zIndex: 101 }}>
                <div style={{ width: `${scrollProgress}%`, height: '100%', background: 'var(--primary-color)', transition: 'width 0.1s linear', boxShadow: '0 0 4px var(--primary-color)' }} />
            </div>

            <Navbar 
                title={article.source} 
                onBack={() => navigateBack('/discover')} 
                rightElement={<div onClick={handleShare} style={{padding: '0 12px', cursor: 'pointer'}}>···</div>} 
            />
            
            <div 
                ref={contentRef}
                onScroll={handleScroll}
                style={{ flex: 1, overflowY: 'auto', padding: '0 0 80px 0' }}
            >
                <div style={{ padding: '24px 20px' }}>
                    {/* Title */}
                    <h1 style={{ fontSize: '26px', fontWeight: 800, lineHeight: 1.35, marginBottom: '24px', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                        {article.title}
                    </h1>

                    {/* Author Info */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
                        <Avatar src={article.authorAvatar} size={40} />
                        <div style={{ marginLeft: '12px', flex: 1 }}>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{article.source}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {article.publishTimeStr} · {article.reads} 阅读
                            </div>
                        </div>
                        <button 
                            onClick={handleFollow}
                            style={{ 
                                padding: '6px 16px', borderRadius: '20px', 
                                border: following ? '1px solid var(--border-color)' : '1px solid var(--primary-color)', 
                                color: following ? 'var(--text-secondary)' : 'var(--primary-color)', 
                                background: 'transparent', 
                                fontSize: '13px', fontWeight: 600,
                                transition: 'all 0.2s',
                                cursor: 'pointer'
                            }}
                        >
                            {following ? '已关注' : '关注'}
                        </button>
                    </div>

                    {/* Rich Content */}
                    <div className="article-body">
                        {article.contentBody && <StreamMarkdown content={article.contentBody} onImageClick={handleImageClick} />}
                    </div>

                    <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '0.5px solid var(--border-color)' }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '24px' }}>精选评论</div>
                        
                        {commentsList.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', padding: '20px' }}>暂无评论，快来抢沙发</div>
                        )}

                        {commentsList.map((c, i) => (
                            <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '24px', animation: c.isNew ? 'slideUp 0.3s' : 'none' }}>
                                <div style={{ flexShrink: 0 }}>
                                    <Avatar src={`https://api.dicebear.com/7.x/identicon/svg?seed=${c.user}`} size={36} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{c.user}</span>
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.8 }}>👍 {c.likes}</span>
                                    </div>
                                    <div style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{c.text}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Interaction Bar (Optimized) */}
            <div style={{ 
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'var(--bg-card)', borderTop: '0.5px solid var(--border-color)',
                padding: '8px 16px', paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
                display: 'flex', alignItems: 'center', gap: '12px', zIndex: 100,
                transition: 'all 0.3s ease'
            }}>
                <div style={{ 
                    flex: 1, 
                    background: 'var(--bg-body)', 
                    borderRadius: '20px', 
                    padding: '8px 16px', 
                    display: 'flex', 
                    alignItems: 'center',
                    transition: 'background 0.2s',
                    border: isInputFocused ? '1px solid var(--primary-color)' : '1px solid transparent'
                }}>
                    <div style={{ marginRight: '8px', color: 'var(--text-placeholder)', display: 'flex' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    </div>
                    <input 
                        ref={commentInputRef}
                        placeholder={isInputFocused ? "善语结善缘，恶语伤人心" : "写评论..."}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setTimeout(() => setIsInputFocused(false), 150)} // Delay for button click
                        onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                        style={{ 
                            border: 'none', background: 'transparent', outline: 'none', 
                            width: '100%', fontSize: '14px', color: 'var(--text-primary)',
                            caretColor: 'var(--primary-color)' 
                        }}
                    />
                </div>
                
                {/* Dynamic Right Section */}
                {(isInputFocused || comment.trim().length > 0) ? (
                    <button
                        onClick={handleSendComment}
                        disabled={!comment.trim()}
                        style={{
                            background: comment.trim() ? 'var(--primary-color)' : 'var(--bg-cell-active)',
                            color: comment.trim() ? 'white' : 'var(--text-secondary)',
                            border: 'none', borderRadius: '18px', padding: '6px 16px',
                            fontSize: '14px', fontWeight: 500,
                            transition: 'all 0.2s', cursor: comment.trim() ? 'pointer' : 'default',
                            whiteSpace: 'nowrap',
                            transform: comment.trim() ? 'scale(1)' : 'scale(0.95)',
                            opacity: comment.trim() ? 1 : 0.8,
                            animation: 'popIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }}
                    >
                        发送
                    </button>
                ) : (
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', color: 'var(--text-secondary)', animation: 'fadeIn 0.2s' }}>
                        <div onClick={handleLike} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0px', cursor: 'pointer', minWidth: '32px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill={liked ? '#fa5151' : 'none'} stroke={liked ? '#fa5151' : 'currentColor'} strokeWidth="1.5" style={{ transition: 'all 0.2s', transform: liked ? 'scale(1.1)' : 'scale(1)' }}>
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                            </svg>
                            {likesCount > 0 && <span style={{ fontSize: '10px', marginTop: '-2px', fontWeight: 500 }}>{likesCount}</span>}
                        </div>
                        
                        <div onClick={scrollToComments} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0px', cursor: 'pointer' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                            {commentsList.length > 0 && <span style={{ fontSize: '10px', marginTop: '-2px', fontWeight: 500 }}>{commentsList.length}</span>}
                        </div>

                        <div onClick={handleShare} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0px', cursor: 'pointer' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"></circle><path d="M16 12l-4-4-4 4"></path><path d="M12 16V8"></path></svg>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
