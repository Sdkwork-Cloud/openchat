
import React, { useState, useEffect } from 'react';
import { navigate } from '../../../router';
import { CreationService, CreationItem } from '../services/CreationService';
import { ImageCreationPanel } from '../components/ImageCreationPanel';
import { VideoCreationPanel } from '../components/VideoCreationPanel';
import { MusicCreationPanel } from '../components/MusicCreationPanel';

const CATEGORIES = ['推荐', '春节', '赛博', '古风', '萌宠', '3D', '二次元', '极简', 'Logo'];

const ActionSheet = ({ visible, onClose, onAction }: { visible: boolean; onClose: () => void; onAction: (type: 'image' | 'video' | 'music') => void }) => {
    if (!visible) return null;
    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 900, animation: 'fadeIn 0.2s forwards' }} />
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 901,
                background: 'var(--bg-body)', borderRadius: '24px 24px 0 0',
                padding: '24px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
                animation: 'slideUp 0.3s cubic-bezier(0.19, 1, 0.22, 1) forwards'
            }}>
                <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', color: 'var(--text-primary)', textAlign: 'center' }}>开始创作</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    {[
                        { id: 'image', label: '文生图', icon: '🎨', color: '#FF9C6E' },
                        { id: 'video', label: '视频生成', icon: '🎬', color: '#95DE64' },
                        { id: 'music', label: 'AI 音乐', icon: '🎵', color: '#FF85C0' },
                    ].map(opt => (
                        <div key={opt.id} onClick={() => onAction(opt.id as any)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: opt.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>{opt.icon}</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{opt.label}</div>
                        </div>
                    ))}
                </div>
                <div onClick={onClose} style={{ marginTop: '32px', padding: '16px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>取消</div>
            </div>
            <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        </>
    );
};

export const CreationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('推荐');
  const [feedItems, setFeedItems] = useState<CreationItem[]>([]);
  const [showSheet, setShowSheet] = useState(false);
  
  // Independent Panel States
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [showVideoPanel, setShowVideoPanel] = useState(false);
  const [showMusicPanel, setShowMusicPanel] = useState(false);
  
  const [remixData, setRemixData] = useState<any>(null);

  useEffect(() => {
      const loadFeed = async () => {
          const res = await CreationService.getInspirationFeed(1, 20, activeTab);
          if (res.success && res.data) {
              setFeedItems(res.data.content);
          }
      };
      loadFeed();
  }, [activeTab]);

  // Interaction Handlers
  const handleItemClick = (item: CreationItem) => {
      // Remix Logic: Pass existing data to the image panel
      if (item.type === 'image') {
          setRemixData(item);
          setShowImagePanel(true);
      }
  };

  const openPanel = (type: 'image' | 'video' | 'music') => {
      setShowSheet(false);
      setRemixData(null); // Clear remix data for fresh start
      
      if (type === 'image') setShowImagePanel(true);
      if (type === 'video') setShowVideoPanel(true);
      if (type === 'music') setShowMusicPanel(true);
  };

  return (
    <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. Top Navigation Categories */}
      <div style={{ 
        height: '50px', display: 'flex', alignItems: 'center', 
        background: 'var(--bg-body)', position: 'sticky', top: 0, zIndex: 100,
        paddingTop: 'env(safe-area-inset-top)', paddingLeft: '16px', paddingRight: '4px',
        borderBottom: '0.5px solid rgba(0,0,0,0.03)'
      }}>
        <div style={{ flex: 1, display: 'flex', overflowX: 'auto', gap: '28px', scrollbarWidth: 'none', alignItems: 'center', height: '100%', paddingRight: '16px' }}>
            {CATEGORIES.map(cat => (
                <div 
                    key={cat} 
                    onClick={() => setActiveTab(cat)} 
                    style={{ 
                        fontSize: activeTab === cat ? '17px' : '15px', 
                        color: activeTab === cat ? 'var(--text-primary)' : 'var(--text-secondary)', 
                        fontWeight: activeTab === cat ? 700 : 400, 
                        whiteSpace: 'nowrap', 
                        cursor: 'pointer', 
                        transition: 'all 0.2s',
                        transform: activeTab === cat ? 'scale(1.05)' : 'scale(1)'
                    }}
                >
                    {cat}
                </div>
            ))}
        </div>
        <div onClick={() => navigate('/search')} style={{ width: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
      </div>

      {/* 2. Immersive Masonry Feed */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '8px', columnCount: 2, columnGap: '8px' }}>
              {feedItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    onClick={() => handleItemClick(item)} 
                    style={{ 
                        breakInside: 'avoid', 
                        marginBottom: '8px', 
                        background: 'var(--bg-card)', 
                        borderRadius: '12px', 
                        overflow: 'hidden', 
                        cursor: 'pointer',
                        position: 'relative'
                    }}
                  >
                      <div style={{ position: 'relative' }}>
                          {item.url ? (
                              <img 
                                src={item.url} 
                                alt={item.title} 
                                style={{ width: '100%', display: 'block', minHeight: index % 2 === 0 ? '200px' : '150px', background: '#eee' }} 
                                loading="lazy" 
                              />
                          ) : (
                              <div style={{ width: '100%', height: '150px', background: 'var(--bg-cell-active)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                                  {item.type === 'video' ? '🎬' : '🎵'}
                              </div>
                          )}
                          {/* Pro Badge overlay */}
                          <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', display: 'flex', gap: '4px' }}>
                              <span>{item.ratio || '1:1'}</span>
                              {item.style && <span>• {item.style}</span>}
                          </div>
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 8px 8px', background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)', color: 'white' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600 }}>{item.title}</div>
                          </div>
                      </div>
                      <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--primary-gradient)' }}></div>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.author}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              Remix
                          </div>
                      </div>
                  </div>
              ))}
          </div>
          {feedItems.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>暂无推荐内容</div>
          )}
      </div>

      {/* 3. FAB (Floating Action Button) */}
      <div style={{ position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 200 }}>
          <div 
            onClick={() => setShowSheet(true)} 
            style={{ 
                background: 'var(--primary-gradient)', 
                borderRadius: '24px', 
                padding: '12px 24px', 
                display: 'flex', alignItems: 'center', gap: '8px', 
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(41, 121, 255, 0.4)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
              <div style={{ fontSize: '20px' }}>✨</div>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>开始创作</span>
          </div>
      </div>

      {/* 4. Action Sheet */}
      <ActionSheet visible={showSheet} onClose={() => setShowSheet(false)} onAction={openPanel} />

      {/* 5. Independent Professional Panels */}
      <ImageCreationPanel 
        visible={showImagePanel} 
        onClose={() => setShowImagePanel(false)} 
        initialData={remixData}
      />

      <VideoCreationPanel 
        visible={showVideoPanel} 
        onClose={() => setShowVideoPanel(false)} 
      />

      <MusicCreationPanel 
        visible={showMusicPanel} 
        onClose={() => setShowMusicPanel(false)} 
      />

    </div>
  );
};
