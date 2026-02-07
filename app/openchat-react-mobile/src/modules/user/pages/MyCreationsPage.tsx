
import React, { useState, useEffect } from 'react';
import { Navbar } from '../../../components/Navbar/Navbar';
import { ImageViewer } from '../../../components/ImageViewer/ImageViewer';
import { navigate } from '../../../router';
import { CreationService, CreationItem } from '../../creation/services/CreationService';

const TABS = ['全部', '图片', '视频', '音乐', '文本'];

export const MyCreationsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('全部');
    const [creations, setCreations] = useState<CreationItem[]>([]);

    useEffect(() => {
        const load = async () => {
            const res = await CreationService.getMyCreations(activeTab);
            if (res.success && res.data) {
                setCreations(res.data);
            }
        };
        load();
    }, [activeTab]);

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar 
                title="我的作品" 
                onBack={() => navigate('/me')}
            />
            
            {/* Tabs */}
            <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '0 8px', borderBottom: '0.5px solid var(--border-color)', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {TABS.map(tab => (
                    <div 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{ 
                            padding: '14px 16px', 
                            fontSize: '15px', 
                            color: activeTab === tab ? 'var(--primary-color)' : 'var(--text-secondary)',
                            fontWeight: activeTab === tab ? 600 : 400,
                            position: 'relative',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {tab}
                        {activeTab === tab && (
                            <div style={{ position: 'absolute', bottom: 0, left: '25%', right: '25%', height: '2px', background: 'var(--primary-color)', borderRadius: '2px' }} />
                        )}
                    </div>
                ))}
            </div>

            <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', flex: 1, alignContent: 'start' }}>
                {creations.map(item => (
                    <div 
                        key={item.id}
                        style={{ 
                            background: 'var(--bg-card)', borderRadius: '10px', overflow: 'hidden',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.03)', cursor: 'pointer',
                            border: '0.5px solid var(--border-color)'
                        }}
                        onClick={() => {
                            if (item.type === 'image' && item.url) ImageViewer.show(item.url);
                        }}
                    >
                        <div style={{ 
                            width: '100%', aspectRatio: item.ratio === '9:16' ? '9/16' : (item.ratio === '16:9' ? '16/9' : '1/1'),
                            background: 'var(--bg-cell-top)', position: 'relative',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {item.url && item.url.startsWith('http') ? (
                                <img src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                            ) : (
                                <div style={{ fontSize: '36px', opacity: 0.8 }}>
                                    {item.type === 'video' ? '🎬' : (item.type === 'music' ? '🎵' : '📄')}
                                </div>
                            )}
                            
                            <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>
                                {item.type}
                            </div>
                        </div>
                        <div style={{ padding: '10px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(item.createTime).toLocaleDateString()}</div>
                        </div>
                    </div>
                ))}
            </div>
            
            {creations.length === 0 && (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    暂无相关作品
                </div>
            )}
        </div>
    );
};
