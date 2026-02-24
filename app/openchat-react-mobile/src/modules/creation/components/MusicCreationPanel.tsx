
import React, { useState, useRef, useEffect } from 'react';
import { navigate } from '../../../router';
import { useChatStore } from '../../../services/store';
import { CreationService } from '../services/CreationService';

interface MusicCreationPanelProps {
    visible: boolean;
    onClose: () => void;
}

const GENRES = [
    { id: 'pop', label: 'Pop 流行' },
    { id: 'rock', label: 'Rock 摇滚' },
    { id: 'jazz', label: 'Jazz 爵士' },
    { id: 'electronic', label: 'Electronic 电子' },
    { id: 'hiphop', label: 'Hip Hop 嘻哈' },
    { id: 'rnb', label: 'R&B' },
    { id: 'classical', label: 'Classical 古典' },
    { id: 'lofi', label: 'Lofi 治愈' },
    { id: 'metal', label: 'Metal 金属' }
];

export const MusicCreationPanel: React.FC<MusicCreationPanelProps> = ({ visible, onClose }) => {
    const { createSession } = useChatStore();
    const [mode, setMode] = useState<'desc' | 'custom'>('desc');
    const [description, setDescription] = useState('');
    const [lyrics, setLyrics] = useState('');
    const [style, setStyle] = useState('');
    const [title, setTitle] = useState('');
    const [isInstrumental, setIsInstrumental] = useState(false);

    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (visible) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [visible]);

    if (!visible) return null;

    const handleCreate = async () => {
        await CreationService.create({
            title: title || (description.slice(0, 15) || '未命名音乐'),
            type: 'music',
            prompt: mode === 'desc' ? description : lyrics,
            ratio: '1:1', 
            style: style,
            url: '', // Placeholder
            isPublic: false,
            likes: 0,
            author: 'Me'
        });

        const sessionId = await createSession('omni_core');
        navigate('/chat', { id: sessionId });
        onClose();
    };

    const addGenre = (g: string) => {
        // Simple toggle/add logic
        if (style.includes(g)) return;
        setStyle(prev => prev ? `${prev}, ${g}` : g);
    };

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 910, animation: 'fadeIn 0.2s forwards' }} />
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: 'var(--bg-card)', borderRadius: '24px 24px 0 0', zIndex: 920,
                display: 'flex', flexDirection: 'column',
                maxHeight: '90vh', paddingBottom: 'env(safe-area-inset-bottom)',
                animation: 'slideUpPanel 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}>
                {/* Header */}
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid var(--border-color)' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>AI 音乐创作</div>
                    <div onClick={onClose} style={{ padding: '4px', cursor: 'pointer', background: 'var(--bg-body)', borderRadius: '50%' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    
                    {/* Mode Switcher */}
                    <div style={{ display: 'flex', background: 'var(--bg-body)', padding: '4px', borderRadius: '12px', marginBottom: '24px' }}>
                        <div 
                            onClick={() => setMode('desc')} 
                            style={{ 
                                flex: 1, textAlign: 'center', padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                                background: mode === 'desc' ? 'var(--bg-card)' : 'transparent', 
                                color: mode === 'desc' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                boxShadow: mode === 'desc' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                cursor: 'pointer', transition: 'all 0.2s' 
                            }}
                        >
                            灵感模式
                        </div>
                        <div 
                            onClick={() => setMode('custom')} 
                            style={{ 
                                flex: 1, textAlign: 'center', padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                                background: mode === 'custom' ? 'var(--bg-card)' : 'transparent', 
                                color: mode === 'custom' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                boxShadow: mode === 'custom' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                cursor: 'pointer', transition: 'all 0.2s' 
                            }}
                        >
                            专业歌词
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-body)', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>🎻</span>
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>纯音乐模式 (Instrumental)</span>
                        </div>
                        <div onClick={() => setIsInstrumental(!isInstrumental)} style={{ width: '40px', height: '22px', background: isInstrumental ? 'var(--primary-color)' : 'var(--border-color)', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                            <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: isInstrumental ? '20px' : '2px', transition: 'left 0.2s' }} />
                        </div>
                    </div>

                    {mode === 'desc' ? (
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>歌曲描述</label>
                            <textarea 
                                ref={inputRef}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="一首关于雨夜的爵士乐，女声，萨克斯独奏，忧伤的氛围..."
                                style={{ width: '100%', height: '120px', background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px', color: 'var(--text-primary)', fontSize: '16px', resize: 'none', outline: 'none' }}
                            />
                        </div>
                    ) : (
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>自定义歌词</label>
                            <textarea 
                                ref={inputRef}
                                value={lyrics}
                                onChange={e => setLyrics(e.target.value)}
                                placeholder="[Verse]&#10;填入你的歌词...&#10;&#10;[Chorus]&#10;AI 将为你谱曲..."
                                style={{ width: '100%', height: '160px', background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px', color: 'var(--text-primary)', fontSize: '14px', resize: 'none', outline: 'none', fontFamily: 'monospace', lineHeight: '1.5' }}
                            />
                        </div>
                    )}

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>音乐风格 (Style)</label>
                        <input 
                            value={style}
                            onChange={e => setStyle(e.target.value)}
                            placeholder="Pop, Electronic, Cinematic..."
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '15px', outline: 'none', marginBottom: '12px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {GENRES.map(g => (
                                <span 
                                    key={g.id} 
                                    onClick={() => addGenre(g.id)} 
                                    style={{ 
                                        fontSize: '12px', padding: '6px 12px', 
                                        background: style.includes(g.id) ? 'rgba(41, 121, 255, 0.1)' : 'var(--bg-body)', 
                                        color: style.includes(g.id) ? 'var(--primary-color)' : 'var(--text-secondary)',
                                        borderRadius: '16px', cursor: 'pointer', border: '1px solid var(--border-color)',
                                        fontWeight: style.includes(g.id) ? 600 : 400
                                    }}
                                >
                                    {g.label}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>歌曲标题 (Title)</label>
                        <input 
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="给你的歌起个名字..."
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '15px', outline: 'none' }}
                        />
                    </div>
                </div>

                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                    <button 
                        onClick={handleCreate}
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--primary-gradient)', border: 'none', color: 'white', fontSize: '16px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(41, 121, 255, 0.3)' }}
                    >
                        <span>立即创作</span>
                        <span style={{ fontSize: '12px', opacity: 0.8 }}>⚡ 10</span>
                    </button>
                </div>
            </div>
        </>
    );
};
