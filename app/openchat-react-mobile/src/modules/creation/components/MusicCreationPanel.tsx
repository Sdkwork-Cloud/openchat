
import React, { useState, useRef, useEffect } from 'react';
import { navigate } from '../../../router';
import { useChatStore } from '../../../services/store';

interface MusicCreationPanelProps {
    visible: boolean;
    onClose: () => void;
}

const GENRES = ['Pop', 'Rock', 'Jazz', 'Electronic', 'Hip Hop', 'R&B', 'Classical', 'Lofi', 'Metal'];

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

    const handleCreate = () => {
        const payload = `[MUSIC_GEN]\nMode: ${mode}\nTitle: ${title}\nStyle: ${style}\nData: ${mode === 'desc' ? description : lyrics}\nInst: ${isInstrumental}`;
        const sessionId = createSession('omni_core');
        navigate('/chat', { id: sessionId });
        onClose();
    };

    const addGenre = (g: string) => {
        setStyle(prev => prev ? `${prev}, ${g}` : g);
    };

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 910 }} />
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: '#121212', color: '#ededed',
                borderRadius: '24px 24px 0 0', zIndex: 920,
                display: 'flex', flexDirection: 'column',
                maxHeight: '90vh', paddingBottom: 'env(safe-area-inset-bottom)',
                animation: 'slideUpPanel 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}>
                {/* Header with Close Button */}
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>AI 音乐创作</div>
                    <div onClick={onClose} style={{ width: '32px', height: '32px', cursor: 'pointer', background: '#333', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    
                    {/* Mode Switcher */}
                    <div style={{ display: 'flex', background: '#222', padding: '4px', borderRadius: '12px', marginBottom: '24px' }}>
                        <div 
                            onClick={() => setMode('desc')} 
                            style={{ 
                                flex: 1, textAlign: 'center', padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                                background: mode === 'desc' ? '#444' : 'transparent', color: mode === 'desc' ? 'white' : '#888',
                                cursor: 'pointer', transition: 'all 0.2s' 
                            }}
                        >
                            灵感模式
                        </div>
                        <div 
                            onClick={() => setMode('custom')} 
                            style={{ 
                                flex: 1, textAlign: 'center', padding: '10px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                                background: mode === 'custom' ? '#444' : 'transparent', color: mode === 'custom' ? 'white' : '#888',
                                cursor: 'pointer', transition: 'all 0.2s' 
                            }}
                        >
                            专业歌词
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#222', borderRadius: '12px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>纯音乐 (Instrumental)</span>
                        <div onClick={() => setIsInstrumental(!isInstrumental)} style={{ width: '40px', height: '22px', background: isInstrumental ? '#07c160' : '#444', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                            <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: isInstrumental ? '20px' : '2px', transition: 'left 0.2s' }} />
                        </div>
                    </div>

                    {mode === 'desc' ? (
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '12px', color: '#888', fontWeight: 600, display: 'block', marginBottom: '8px' }}>歌曲描述</label>
                            <textarea 
                                ref={inputRef}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="一首关于雨夜的爵士乐，女声，萨克斯独奏，忧伤的氛围..."
                                style={{ width: '100%', height: '140px', background: '#222', border: '1px solid #333', borderRadius: '12px', padding: '16px', color: 'white', fontSize: '16px', resize: 'none', outline: 'none' }}
                            />
                        </div>
                    ) : (
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '12px', color: '#888', fontWeight: 600, display: 'block', marginBottom: '8px' }}>歌词 (Lyrics)</label>
                            <textarea 
                                ref={inputRef}
                                value={lyrics}
                                onChange={e => setLyrics(e.target.value)}
                                placeholder="[Verse]&#10;填入你的歌词...&#10;&#10;[Chorus]&#10;AI 将为你谱曲..."
                                style={{ width: '100%', height: '180px', background: '#222', border: '1px solid #333', borderRadius: '12px', padding: '16px', color: 'white', fontSize: '14px', resize: 'none', outline: 'none', fontFamily: 'monospace', lineHeight: '1.5' }}
                            />
                        </div>
                    )}

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ fontSize: '12px', color: '#888', fontWeight: 600, display: 'block', marginBottom: '8px' }}>音乐风格 (Style)</label>
                        <input 
                            value={style}
                            onChange={e => setStyle(e.target.value)}
                            placeholder="Pop, Electronic, Cinematic..."
                            style={{ width: '100%', padding: '14px', background: '#222', border: '1px solid #333', borderRadius: '12px', color: 'white', fontSize: '15px', outline: 'none', marginBottom: '12px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {GENRES.map(g => (
                                <span key={g} onClick={() => addGenre(g)} style={{ fontSize: '11px', padding: '6px 12px', background: '#333', borderRadius: '16px', cursor: 'pointer', border: '1px solid #444' }}>{g}</span>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ fontSize: '12px', color: '#888', fontWeight: 600, display: 'block', marginBottom: '8px' }}>歌曲标题 (Title)</label>
                        <input 
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="给你的歌起个名字..."
                            style={{ width: '100%', padding: '14px', background: '#222', border: '1px solid #333', borderRadius: '12px', color: 'white', fontSize: '15px', outline: 'none' }}
                        />
                    </div>
                </div>

                <div style={{ padding: '20px', borderTop: '1px solid #333' }}>
                    <button 
                        onClick={handleCreate}
                        style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'linear-gradient(90deg, #7928CA, #FF0080)', border: 'none', color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <span>立即创作</span>
                        <span style={{ fontSize: '12px', opacity: 0.8 }}>⚡ 10</span>
                    </button>
                </div>
            </div>
        </>
    );
};
