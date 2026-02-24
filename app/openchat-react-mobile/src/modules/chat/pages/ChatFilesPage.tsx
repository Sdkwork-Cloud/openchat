
import React, { useState, useMemo } from 'react';
import { Navbar } from '../../../components/Navbar/Navbar';
import { useQueryParams } from '../../../router';
import { ImageViewer } from '../../../components/ImageViewer/ImageViewer';
import { Toast } from '../../../components/Toast';
import { Cell, CellGroup } from '../../../components/Cell';
import { Empty } from '../../../components/Empty/Empty';

const TABS = ['图片与视频', '文件', '链接'];

// Mock Data (Static for demo, but structured for filtering)
const RAW_MEDIA = Array(24).fill(null).map((_, i) => ({
    id: `img_${i}`,
    url: `https://picsum.photos/300/300?random=${i + 100}`,
    date: '2023-12-01',
    type: 'image'
}));

const RAW_FILES = [
    { id: 'f1', name: '项目需求文档 v2.0.pdf', size: '2.4 MB', date: '昨天', type: 'pdf' },
    { id: 'f2', name: 'UI 设计规范.sketch', size: '45.1 MB', date: '10月24日', type: 'sketch' },
    { id: 'f3', name: '会议纪要.docx', size: '128 KB', date: '10月20日', type: 'doc' },
    { id: 'f4', name: 'Q4 季度预算表.xlsx', size: '1.2 MB', date: '10月15日', type: 'xls' },
    { id: 'f5', name: '架构图_Final.png', size: '3.5 MB', date: '10月10日', type: 'png' },
];

const RAW_LINKS = [
    { id: 'l1', title: 'OpenAI 发布 GPT-5 预览版', url: 'https://openai.com/blog/gpt-5-preview', icon: '🔗', date: '12:30' },
    { id: 'l2', title: '前端架构现代化指南 - GitHub', url: 'https://github.com/modern/frontend', icon: '🔗', date: '昨天' },
    { id: 'l3', title: 'React 19 RC 详解', url: 'https://react.dev/blog/2024', icon: '🔗', date: '10月22日' },
];

export const ChatFilesPage: React.FC = () => {
    const query = useQueryParams();
    const [activeTab, setActiveTab] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    // --- Search Filtering Algorithm ---
    const filteredContent = useMemo(() => {
        const lowerQ = searchQuery.toLowerCase();
        
        if (activeTab === 0) {
            // Images don't usually have names in this view
            return RAW_MEDIA; 
        }
        if (activeTab === 1) {
            return RAW_FILES.filter(f => f.name.toLowerCase().includes(lowerQ));
        }
        if (activeTab === 2) {
            return RAW_LINKS.filter(l => l.title.toLowerCase().includes(lowerQ) || l.url.toLowerCase().includes(lowerQ));
        }
        return [];
    }, [activeTab, searchQuery]);

    const handleFileClick = (file: any) => {
        Toast.info(`正在打开: ${file.name}`);
    };

    const handleLinkClick = (link: any) => {
        window.open(link.url, '_blank');
    };

    const renderContent = () => {
        if (filteredContent.length === 0) {
            return <Empty icon="🔍" text="无相关内容" />;
        }

        if (activeTab === 0) {
            return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px' }}>
                    {filteredContent.map((item: any, index: number) => (
                        <div 
                            key={item.id} 
                            onClick={() => ImageViewer.show(filteredContent.map((i: any) => i.url), index)}
                            style={{ aspectRatio: '1/1', background: '#eee', position: 'relative', cursor: 'pointer' }}
                        >
                            <img src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                        </div>
                    ))}
                </div>
            );
        }

        if (activeTab === 1) {
            return (
                <CellGroup border={false}>
                    {filteredContent.map((file: any) => (
                        <Cell 
                            key={file.id}
                            onClick={() => handleFileClick(file)}
                            icon={
                                <div style={{ 
                                    width: '40px', height: '40px', borderRadius: '6px', 
                                    background: file.type === 'pdf' ? '#ff6b6b' : (file.type === 'xls' ? '#51cf66' : '#339af0'), 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    color: 'white', fontSize: '10px', fontWeight: 700,
                                    textTransform: 'uppercase'
                                }}>
                                    {file.type}
                                </div>
                            }
                            title={file.name}
                            label={`${file.size} · ${file.date}`}
                            center
                        />
                    ))}
                </CellGroup>
            );
        }

        return (
            <CellGroup border={false}>
                {filteredContent.map((link: any) => (
                    <Cell 
                        key={link.id}
                        onClick={() => handleLinkClick(link)}
                        icon={
                            <div style={{ width: '40px', height: '40px', background: '#f0f0f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                                {link.icon}
                            </div>
                        }
                        title={link.title}
                        label={link.url}
                        value={link.date}
                        center
                    />
                ))}
            </CellGroup>
        );
    };

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title="聊天内容" />
            <div style={{ padding: '10px 16px', background: 'var(--bg-card)', borderBottom: '0.5px solid var(--border-color)', position: 'sticky', top: '44px', zIndex: 10 }}>
                <div style={{ background: 'var(--bg-body)', borderRadius: '6px', padding: '0 12px', height: '36px', display: 'flex', alignItems: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input 
                        placeholder="搜索" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ 
                            flex: 1, height: '100%', background: 'transparent', 
                            border: 'none', marginLeft: '8px',
                            fontSize: '14px', outline: 'none', color: 'var(--text-primary)'
                        }} 
                    />
                    {searchQuery && (
                        <div onClick={() => setSearchQuery('')} style={{ padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</div>
                    )}
                </div>
            </div>
            
            <div style={{ display: 'flex', background: 'var(--bg-card)', borderBottom: '0.5px solid var(--border-color)', marginBottom: '10px' }}>
                {TABS.map((t, i) => (
                    <div 
                        key={i} 
                        onClick={() => setActiveTab(i)}
                        style={{ 
                            flex: 1, textAlign: 'center', padding: '14px 0', fontSize: '14px',
                            color: activeTab === i ? 'var(--primary-color)' : 'var(--text-secondary)',
                            fontWeight: activeTab === i ? 600 : 400,
                            position: 'relative', cursor: 'pointer',
                            transition: 'color 0.2s'
                        }}
                    >
                        {t}
                        {activeTab === i && <div style={{ position: 'absolute', bottom: 0, left: '35%', right: '35%', height: '2px', background: 'var(--primary-color)', borderRadius: '2px' }} />}
                    </div>
                ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {renderContent()}
            </div>
        </div>
    );
};
