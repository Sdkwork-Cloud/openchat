
import React, { useState, useEffect, useRef } from 'react';
import { navigate, useQueryParams } from '../../../router';
import { CreationService, CreationItem, CreationType } from '../services/CreationService';
import { ImageCreationPanel } from '../components/ImageCreationPanel';
import { VideoCreationPanel } from '../components/VideoCreationPanel';
import { MusicCreationPanel } from '../components/MusicCreationPanel';
import { CreationCard } from '../components/CreationCard';
import { Toast } from '../../../components/Toast';
import { Tabs } from '../../../components/Tabs/Tabs'; 
import { Dialog } from '../../../components/Dialog'; 
import { Spinner } from '../../../components/Spinner/Spinner';
import { Empty } from '../../../components/Empty/Empty';

const CATEGORIES = [
    { id: '推荐', label: '推荐' },
    { id: '绘图', label: '绘图' },
    { id: '视频', label: '视频' },
    { id: '音乐', label: '音乐' },
    { id: '3D', label: '3D' },
    { id: '赛博', label: '赛博' },
    { id: '二次元', label: '二次元' }
];

const FAB = ({ onClick }: { onClick: () => void }) => (
    <div 
        onClick={onClick}
        className="fab-btn"
        style={{
            position: 'fixed', bottom: '90px', right: '20px',
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'var(--primary-gradient)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(41, 121, 255, 0.4)',
            cursor: 'pointer', zIndex: 100,
            fontSize: '28px',
            transition: 'transform 0.2s'
        }}
    >
        +
        <style>{`.fab-btn:active { transform: scale(0.9); }`}</style>
    </div>
);

export const CreationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('推荐');
  const [feedItems, setFeedItems] = useState<CreationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [activePanel, setActivePanel] = useState<'none'|'image'|'video'|'music'>('none');
  const [initialData, setInitialData] = useState<any>(null); 
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const query = useQueryParams();
  const autoPanel = query.get('panel');
  const autoPrompt = query.get('prompt');

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (autoPanel === 'image' || autoPanel === 'video') {
          setActivePanel(autoPanel);
          if (autoPrompt) {
              setInitialData({ prompt: decodeURIComponent(autoPrompt) });
          }
      }
  }, [autoPanel, autoPrompt]);

  useEffect(() => {
      loadFeed();
  }, [activeTab]);

  const loadFeed = async () => {
      setLoading(true);
      const res = await CreationService.getInspirationFeed(1, 20, activeTab);
      if (res.success && res.data) {
          setFeedItems(res.data.content);
      }
      setLoading(false);
  };

  const handleCardClick = (item: CreationItem) => {
      navigate('/creation/detail', { id: item.id });
  };

  const handlePanelClose = () => {
      setActivePanel('none');
      setInitialData(null); 
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setPendingFile(file);
          setShowImportConfirm(true);
      }
      e.target.value = '';
  };

  const processImport = async () => {
      if (!pendingFile) return;
      const file = pendingFile;
      setShowImportConfirm(false);

      const maxSize = 50 * 1024 * 1024; 
      if (file.size > maxSize) {
          Toast.error('文件过大，请上传小于 50MB 的文件');
          return;
      }

      Toast.loading('正在上传并导入...');
      
      let type: CreationType = 'image';
      if (file.type.startsWith('video')) type = 'video';
      else if (file.type.startsWith('audio')) type = 'music';
      
      const url = URL.createObjectURL(file);

      await CreationService.create({
          title: file.name,
          type: type,
          prompt: 'Local Upload',
          ratio: '1:1', 
          style: 'imported',
          url: url,
          isPublic: false,
          author: 'Me',
          likes: 0
      });

      setTimeout(() => {
          Toast.success('导入成功');
          setShowSheet(false);
          loadFeed(); 
          navigate('/my-creations'); 
      }, 800);
  };

  return (
    <div style={{ height: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Header with Tabs */}
      <div style={{ 
          background: 'var(--navbar-bg)', 
          backdropFilter: 'blur(20px)',
          position: 'sticky', top: 0, zIndex: 50,
          paddingTop: 'env(safe-area-inset-top)',
          display: 'flex', alignItems: 'center'
      }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
              <Tabs 
                  items={CATEGORIES} 
                  activeId={activeTab} 
                  onChange={setActiveTab} 
                  style={{ background: 'transparent', borderBottom: 'none' }}
              />
          </div>
          <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }}></div>
          <div 
              onClick={() => navigate('/creation/search')}
              style={{ padding: '0 12px', cursor: 'pointer', color: 'var(--text-primary)' }}
          >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
      </div>

      {/* Masonry Grid */}
      <div 
        ref={containerRef}
        style={{ 
            flex: 1, overflowY: 'auto', 
            padding: '4px',
            paddingBottom: '100px' 
        }}
      >
          {loading ? (
              <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}>
                  <Spinner size={32} />
              </div>
          ) : feedItems.length > 0 ? (
              <div style={{ columnCount: 2, columnGap: '4px' }}>
                  {feedItems.map(item => (
                      <CreationCard key={item.id} item={item} onClick={() => handleCardClick(item)} />
                  ))}
              </div>
          ) : (
              <Empty text="暂无灵感" subText="尝试切换分类或自己创作" />
          )}
      </div>

      <FAB onClick={() => setShowSheet(true)} />

      {/* Hidden File Input */}
      <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*,video/*,audio/*"
          onChange={onFileSelect}
      />

      {/* Import Dialog */}
      <Dialog 
          visible={showImportConfirm}
          title="确认导入"
          content={`是否将 "${pendingFile?.name}" 导入到我的作品库？`}
          actions={[
              { text: '取消', onClick: () => setShowImportConfirm(false) },
              { text: '导入', onClick: processImport, primary: true }
          ]}
      />

      {/* Panel Selection Sheet */}
      {showSheet && (
          <div onClick={() => setShowSheet(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ width: '100%', background: 'var(--bg-card)', borderRadius: '24px 24px 0 0', padding: '30px 20px 40px', animation: 'slideUp 0.3s' }} onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', textAlign: 'center' }}>开始创作</div>
                  
                  {/* AI Tools Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                      {[
                          { id: 'image', label: 'AI 绘图', icon: '🎨', color: '#FF9C6E' },
                          { id: 'video', label: '视频生成', icon: '🎬', color: '#95DE64' },
                          { id: 'music', label: 'AI 音乐', icon: '🎵', color: '#FF85C0' },
                      ].map(t => (
                          <div key={t.id} onClick={() => { setShowSheet(false); setActivePanel(t.id as any); }} style={{ background: 'var(--bg-body)', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                              <div style={{ fontSize: '32px' }}>{t.icon}</div>
                              <div style={{ fontWeight: 600, fontSize: '13px' }}>{t.label}</div>
                          </div>
                      ))}
                  </div>

                  {/* Upload Option */}
                  <div 
                      onClick={() => fileInputRef.current?.click()}
                      style={{ 
                          background: 'var(--bg-body)', padding: '16px', borderRadius: '16px', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                          cursor: 'pointer', border: '1px dashed var(--border-color)'
                      }}
                  >
                      <span style={{ fontSize: '20px' }}>📤</span>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-secondary)' }}>本地上传</span>
                  </div>
              </div>
          </div>
      )}

      <ImageCreationPanel visible={activePanel === 'image'} onClose={handlePanelClose} initialData={initialData} />
      <VideoCreationPanel visible={activePanel === 'video'} onClose={handlePanelClose} initialData={initialData} />
      <MusicCreationPanel visible={activePanel === 'music'} onClose={handlePanelClose} />
    </div>
  );
};