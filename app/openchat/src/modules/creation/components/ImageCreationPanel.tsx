
import React, { useState, useEffect, useRef } from 'react';
import { navigate } from '../../../router';
import { useChatStore } from '../../../services/store';
import { Toast } from '../../../components/Toast';

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
type CreationMode = 'text' | 'portrait' | 'grid';

const STYLES = [
    { id: 'none', label: '通用', icon: '✨' },
    { id: 'photo', label: '摄影', icon: '📸' },
    { id: 'anime', label: '动漫', icon: '🌸' },
    { id: '3d', label: '3D', icon: '🧊' },
    { id: 'cyber', label: '赛博', icon: '🤖' },
    { id: 'oil', label: '油画', icon: '🎨' },
    { id: 'pixel', label: '像素', icon: '👾' },
];

interface ImageCreationPanelProps {
    visible: boolean;
    onClose: () => void;
    initialData?: any;
}

export const ImageCreationPanel: React.FC<ImageCreationPanelProps> = ({ visible, onClose, initialData }) => {
    const { createSession } = useChatStore();
    
    // Core State
    const [mode, setMode] = useState<CreationMode>('text');
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    
    // Config State
    const [ratio, setRatio] = useState<AspectRatio>('1:1');
    const [style, setStyle] = useState('none');
    const [hd, setHd] = useState(false);
    const [seed, setSeed] = useState<string>('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    
    // Image Refs
    const [refImage, setRefImage] = useState<string | null>(null); // For General Img2Img
    const [faceImage, setFaceImage] = useState<string | null>(null); // For Portrait
    
    // Grid State
    const [gridRows, setGridRows] = useState(2);
    const [gridCols, setGridCols] = useState(2);
    
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (visible) {
            if (initialData) {
                setPrompt(initialData.prompt || '');
                setRatio(initialData.ratio || '1:1');
                setStyle(initialData.style || 'none');
            }
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [visible, initialData]);

    if (!visible) return null;

    const handleCreate = async () => {
        const baseParams = `Prompt: ${prompt}\nNegative: ${negativePrompt}\nStyle: ${style}\nHD: ${hd}\nSeed: ${seed || 'Random'}`;
        let payload = '';

        if (mode === 'text') {
            payload = `[IMAGE_GEN]\nMode: Text/Img2Img\n${baseParams}\nRatio: ${ratio}\nRefImage: ${refImage ? 'Yes' : 'No'}`;
        } else if (mode === 'portrait') {
            payload = `[PORTRAIT_GEN]\nMode: AI Portrait\n${baseParams}\nRatio: ${ratio}\nFaceRef: ${faceImage ? 'Yes' : 'No'}`;
        } else if (mode === 'grid') {
            payload = `[GRID_GEN]\nMode: Grid Split\n${baseParams}\nGrid: ${gridRows}x${gridCols}\nTotal Images: ${gridRows * gridCols}`;
        }

        const sessionId = await createSession('agent_image');
        navigate('/chat', { id: sessionId });
        onClose();
    };

    const handleImageUpload = (type: 'ref' | 'face') => {
        // Simulation
        const mockUrl = type === 'face' 
            ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' 
            : 'https://picsum.photos/200/300';
        
        if (type === 'face') setFaceImage(mockUrl);
        else setRefImage(mockUrl);
        
        Toast.success(type === 'face' ? '面部特征提取成功' : '参考图上传成功');
    };

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 910, animation: 'fadeIn 0.2s forwards' }} />
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: 'var(--bg-card)', borderRadius: '24px 24px 0 0',
                zIndex: 920, display: 'flex', flexDirection: 'column',
                maxHeight: '92vh', paddingBottom: 'env(safe-area-inset-bottom)',
                animation: 'slideUpPanel 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}>
                {/* Header */}
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid var(--border-color)' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>灵感绘图 Pro</div>
                    <div onClick={onClose} style={{ padding: '4px', cursor: 'pointer', background: 'var(--bg-body)', borderRadius: '50%' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px 20px' }}>
                    
                    {/* Mode Switcher Tabs */}
                    <div style={{ display: 'flex', margin: '20px 0', background: 'var(--bg-body)', padding: '4px', borderRadius: '12px' }}>
                        {[
                            { id: 'text', label: '文生图' },
                            { id: 'portrait', label: 'AI 写真' },
                            { id: 'grid', label: '智能宫格' }
                        ].map(m => (
                            <div 
                                key={m.id}
                                onClick={() => setMode(m.id as CreationMode)}
                                style={{
                                    flex: 1, textAlign: 'center', padding: '10px', borderRadius: '8px',
                                    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                                    background: mode === m.id ? 'var(--bg-card)' : 'transparent',
                                    color: mode === m.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    boxShadow: mode === m.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {m.label}
                            </div>
                        ))}
                    </div>

                    {/* Mode Specific Uploaders */}
                    {mode === 'portrait' && (
                        <div style={{ marginBottom: '20px', background: 'var(--bg-body)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div 
                                onClick={() => handleImageUpload('face')}
                                style={{ 
                                    width: '70px', height: '70px', borderRadius: '50%', 
                                    border: '2px dashed var(--primary-color)', background: 'var(--bg-card)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden', cursor: 'pointer', flexShrink: 0
                                }}
                            >
                                {faceImage ? <img src={faceImage} style={{ width: '100%', height: '100%' }} /> : <span style={{ fontSize: '24px' }}>👤</span>}
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '15px' }}>上传人物参考 (Face ID)</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>AI 将保持人物面部特征一致，生成不同风格的写真照片。</div>
                            </div>
                        </div>
                    )}

                    {/* Prompt Area */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                {mode === 'portrait' ? '场景与动作描述' : '画面描述'}
                            </label>
                            <span onClick={() => { setPrompt(p => p + ", highly detailed, 8k, cinematic lighting"); Toast.success('已应用画质增强词'); }} style={{ fontSize: '12px', color: 'var(--primary-color)', cursor: 'pointer' }}>✨ 一键润色</span>
                        </div>
                        <textarea 
                            ref={inputRef}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={mode === 'grid' ? "一只可爱的猫咪，不同的表情..." : "描述你想象中的画面..."}
                            style={{
                                width: '100%', height: '100px', padding: '12px', borderRadius: '12px',
                                border: '1px solid var(--border-color)', background: 'var(--bg-body)',
                                fontSize: '16px', outline: 'none', resize: 'none', color: 'var(--text-primary)'
                            }}
                        />
                    </div>

                    {/* General Reference Image (Text Mode Only) */}
                    {mode === 'text' && (
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>参考底图 (垫图)</label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div 
                                    onClick={() => handleImageUpload('ref')}
                                    style={{ 
                                        width: '80px', height: '80px', borderRadius: '12px', 
                                        border: '1px dashed var(--border-color)', background: 'var(--bg-body)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', overflow: 'hidden'
                                    }}
                                >
                                    {refImage ? (
                                        <img src={refImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: '24px', color: '#999' }}>+</span>
                                    )}
                                </div>
                                {refImage && (
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>参考权重 (Denoising)</div>
                                        <input type="range" min="0" max="100" defaultValue="75" style={{ width: '100%', accentColor: 'var(--primary-color)' }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Grid Settings (Grid Mode Only) */}
                    {mode === 'grid' && (
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>宫格布局设置</label>
                            <div style={{ display: 'flex', gap: '16px', background: 'var(--bg-body)', padding: '16px', borderRadius: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '12px', marginBottom: '6px', color: 'var(--text-secondary)' }}>行数 (Rows): {gridRows}</div>
                                    <input type="range" min="1" max="4" value={gridRows} onChange={e => setGridRows(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary-color)' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '12px', marginBottom: '6px', color: 'var(--text-secondary)' }}>列数 (Cols): {gridCols}</div>
                                    <input type="range" min="1" max="4" value={gridCols} onChange={e => setGridCols(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary-color)' }} />
                                </div>
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--primary-color)', textAlign: 'right' }}>
                                将生成一张包含 {gridRows * gridCols} 个画面的拼接图
                            </div>
                        </div>
                    )}

                    {/* Style Selector */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>艺术风格</label>
                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                            {STYLES.map(s => (
                                <div key={s.id} onClick={() => setStyle(s.id)} style={{
                                    flexShrink: 0, padding: '8px 16px', borderRadius: '20px',
                                    background: style === s.id ? 'var(--primary-color)' : 'var(--bg-body)',
                                    color: style === s.id ? 'white' : 'var(--text-primary)',
                                    fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
                                    border: '1px solid transparent'
                                }}>{s.icon} {s.label}</div>
                            ))}
                        </div>
                    </div>

                    {/* Aspect Ratio (Hidden in Grid Mode usually fixed, but lets keep it flexible) */}
                    {mode !== 'grid' && (
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>图片比例</label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                {['1:1', '16:9', '9:16', '3:4'].map(r => (
                                    <div key={r} onClick={() => setRatio(r as AspectRatio)} style={{
                                        flex: 1, height: '36px', borderRadius: '8px',
                                        border: ratio === r ? '1.5px solid var(--primary-color)' : '1px solid var(--border-color)',
                                        color: ratio === r ? 'var(--primary-color)' : 'var(--text-secondary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: ratio === r ? 'rgba(41, 121, 255, 0.05)' : 'transparent'
                                    }}>{r}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Advanced Toggle */}
                    <div onClick={() => setShowAdvanced(!showAdvanced)} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '16px' }}>
                        {showAdvanced ? '收起高级设置' : '展开高级设置'} 
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6"/></svg>
                    </div>

                    {showAdvanced && (
                        <div style={{ padding: '16px', background: 'var(--bg-body)', borderRadius: '12px', marginBottom: '20px', animation: 'fadeIn 0.2s' }}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>负向提示词 (Negative Prompt)</label>
                                <textarea 
                                    value={negativePrompt}
                                    onChange={(e) => setNegativePrompt(e.target.value)}
                                    placeholder="不想出现的元素，如：low quality, blurry..."
                                    style={{ width: '100%', height: '60px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', fontSize: '14px', outline: 'none', resize: 'none', color: 'var(--text-primary)' }}
                                />
                            </div>
                            
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>随机种子 (Seed)</label>
                                <input 
                                    value={seed}
                                    onChange={(e) => setSeed(e.target.value)}
                                    placeholder="留空为随机 (-1)"
                                    type="number"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', fontSize: '14px', outline: 'none', color: 'var(--text-primary)' }}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>启用高清修复 (Hires Fix)</label>
                                <div onClick={() => setHd(!hd)} style={{ width: '40px', height: '22px', background: hd ? 'var(--primary-color)' : 'var(--border-color)', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                                    <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: hd ? '20px' : '2px', transition: 'left 0.2s' }} />
                                </div>
                            </div>
                        </div>
                    )}
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
                        生成图片 (消耗 2 积分)
                    </button>
                </div>
            </div>
        </>
    );
};
