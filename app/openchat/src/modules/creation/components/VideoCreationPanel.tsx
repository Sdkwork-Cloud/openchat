
import React, { useState, useEffect, useRef } from 'react';
import { navigate } from '../../../router';
import { useChatStore } from '../../../services/store';

interface VideoCreationPanelProps {
    visible: boolean;
    onClose: () => void;
}

export const VideoCreationPanel: React.FC<VideoCreationPanelProps> = ({ visible, onClose }) => {
    const { createSession } = useChatStore();
    const [prompt, setPrompt] = useState('');
    const [duration, setDuration] = useState(5);
    const [cameraX, setCameraX] = useState(0); 
    const [cameraY, setCameraY] = useState(0); 
    const [zoom, setZoom] = useState('none'); 
    const [motion, setMotion] = useState(5); // Motion Bucket 1-10
    const [fps, setFps] = useState(24);

    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (visible) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [visible]);

    if (!visible) return null;

    const handleCreate = () => {
        const cameraDesc = `Camera: ${zoom !== 'none' ? `Zoom ${zoom}` : ''} Pan X:${cameraX} Y:${cameraY}`;
        const payload = `[VIDEO_GEN]\nPrompt: ${prompt}\nDuration: ${duration}s\nMotion: ${motion}\nFPS: ${fps}\n${cameraDesc}`;
        const sessionId = createSession('agent_image'); 
        navigate('/chat', { id: sessionId });
        onClose();
    };

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 910, animation: 'fadeIn 0.2s forwards' }} />
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: 'var(--bg-card)', borderRadius: '24px 24px 0 0',
                zIndex: 920, display: 'flex', flexDirection: 'column',
                maxHeight: '90vh', paddingBottom: 'env(safe-area-inset-bottom)',
                animation: 'slideUpPanel 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}>
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid var(--border-color)' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>视频生成 Pro</div>
                    <div onClick={onClose} style={{ padding: '4px', cursor: 'pointer', background: 'var(--bg-body)', borderRadius: '50%' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>视频内容</label>
                        <textarea 
                            ref={inputRef}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="描述视频内容，例如：无人机视角拍摄的海岸线，海浪拍打..."
                            style={{
                                width: '100%', height: '100px', padding: '12px', borderRadius: '12px',
                                border: '1px solid var(--border-color)', background: 'var(--bg-body)',
                                fontSize: '16px', outline: 'none', resize: 'none', color: 'var(--text-primary)'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', display: 'block' }}>运镜控制 (Camera)</label>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            {/* Direction Pad */}
                            <div style={{ width: '120px', height: '120px', background: 'var(--bg-body)', borderRadius: '50%', position: 'relative', border: '1px solid var(--border-color)' }}>
                                <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr' }}>
                                    {[
                                        {x:-1,y:1}, {x:0,y:1}, {x:1,y:1},
                                        {x:-1,y:0}, {x:0,y:0}, {x:1,y:0},
                                        {x:-1,y:-1}, {x:0,y:-1}, {x:1,y:-1}
                                    ].map((pos, i) => (
                                        <div 
                                            key={i}
                                            onClick={() => { setCameraX(pos.x); setCameraY(pos.y); }}
                                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            {pos.x === cameraX && pos.y === cameraY && (
                                                <div style={{ width: '12px', height: '12px', background: 'var(--primary-color)', borderRadius: '50%', boxShadow: '0 0 8px var(--primary-color)' }} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div style={{ position: 'absolute', top: 5, left: '50%', transform: 'translateX(-50%)', fontSize: '10px', color: '#999' }}>UP</div>
                                <div style={{ position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)', fontSize: '10px', color: '#999' }}>DOWN</div>
                                <div style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#999' }}>L</div>
                                <div style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#999' }}>R</div>
                            </div>

                            {/* Zoom Controls */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {['Zoom In', 'Zoom Out', 'No Zoom'].map(z => {
                                    const val = z === 'Zoom In' ? 'in' : (z === 'Zoom Out' ? 'out' : 'none');
                                    return (
                                        <div 
                                            key={val} 
                                            onClick={() => setZoom(val)}
                                            style={{
                                                padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '13px',
                                                background: zoom === val ? 'var(--primary-color)' : 'var(--bg-body)',
                                                color: zoom === val ? 'white' : 'var(--text-primary)',
                                                cursor: 'pointer', fontWeight: 500
                                            }}
                                        >
                                            {z}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>动作幅度 (Motion Bucket: {motion})</label>
                        <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            value={motion} 
                            onChange={(e) => setMotion(parseInt(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--primary-color)' }} 
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#999', marginTop: '4px' }}>
                            <span>Static (1)</span>
                            <span>Dynamic (10)</span>
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>视频时长 & 帧率</label>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                            {[3, 5, 10].map(s => (
                                <div 
                                    key={s} 
                                    onClick={() => setDuration(s)}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '8px', textAlign: 'center',
                                        border: duration === s ? '1.5px solid var(--primary-color)' : '1px solid var(--border-color)',
                                        color: duration === s ? 'var(--primary-color)' : 'var(--text-primary)',
                                        background: duration === s ? 'rgba(41, 121, 255, 0.05)' : 'transparent',
                                        fontSize: '14px', fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    {s}s
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {[24, 30, 60].map(f => (
                                <div 
                                    key={f} 
                                    onClick={() => setFps(f)}
                                    style={{
                                        flex: 1, padding: '8px', borderRadius: '8px', textAlign: 'center',
                                        border: fps === f ? '1.5px solid var(--primary-color)' : '1px solid var(--border-color)',
                                        color: fps === f ? 'var(--primary-color)' : 'var(--text-secondary)',
                                        fontSize: '12px', fontWeight: 500, cursor: 'pointer'
                                    }}
                                >
                                    {f} FPS
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                    <button 
                        onClick={handleCreate}
                        disabled={!prompt.trim()}
                        style={{
                            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                            background: prompt.trim() ? 'var(--primary-gradient)' : 'var(--bg-cell-active)',
                            color: prompt.trim() ? 'white' : 'var(--text-secondary)',
                            fontSize: '16px', fontWeight: 600, cursor: prompt.trim() ? 'pointer' : 'not-allowed'
                        }}
                    >
                        生成视频 (消耗 10 积分)
                    </button>
                </div>
            </div>
        </>
    );
};
