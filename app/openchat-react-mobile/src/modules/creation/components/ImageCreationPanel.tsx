
import React, { useState, useEffect, useRef } from 'react';
import { navigate } from '../../../router';
import { useChatStore } from '../../../services/store';
import { Toast } from '../../../components/Toast';
import { CreationService } from '../../creation/services/CreationService';
import { Tabs } from '../../../components/Tabs/Tabs';
import { Platform } from '../../../platform';
import { Cell, CellGroup } from '../../../components/Cell';
import { ActionSheet } from '../../../components/ActionSheet/ActionSheet';
import { Switch } from '../../../components/Switch/Switch';
import { PromptTextInput, PromptTextInputRef } from '../../../components/PromptTextInput/PromptTextInput';
import { ModelPicker, ModelProvider } from '../../../components/ModelPicker/ModelPicker';
import { Slider } from '../../../components/Slider/Slider'; // New

interface ImageCreationPanelProps {
    visible: boolean;
    onClose: () => void;
    initialData?: any;
}

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
type CreationMode = 'text' | 'img2img' | 'portrait' | 'grid';

const CHANNELS: ModelProvider[] = [
    { id: 'midjourney', name: 'Midjourney', icon: '⛵', desc: '艺术与写实并重，色彩表现力极佳', models: ['V6.0 Alpha', 'Niji 6 (Anime)', 'V5.2 Raw', 'V5.1', 'V5.0'] },
    { id: 'openai', name: 'OpenAI', icon: '🤖', desc: '语义理解极强，精准还原描述', models: ['DALL·E 3', 'DALL·E 2', 'DALL·E 2 Exp'] },
    { id: 'google', name: 'Google', icon: '☁️', desc: '生成速度快，写实风格出色', models: ['Imagen 3', 'Gemini Pro Vision', 'Imagen 2'] },
    { id: 'aliyun', name: '阿里云', icon: '🔶', desc: '通义万相，国风与写实兼备', models: ['Wanx V1', 'Wanx V2 Beta', 'Wanx Anime'] },
    { id: 'stability', name: 'Stability AI', icon: '🌌', desc: '开源生态王者，控制力强', models: ['Stable Diffusion 3', 'SDXL Turbo', 'SDXL 1.0', 'SD 1.5'] },
    { id: 'adobe', name: 'Adobe', icon: '🎨', desc: '版权合规，商业设计首选', models: ['Firefly Image 3', 'Firefly Image 2'] }
];

const STYLES = [
    { id: 'none', label: '通用', icon: '✨', gradient: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' },
    { id: 'photo', label: '摄影', icon: '📸', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 'anime', label: '动漫', icon: '🌸', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)' },
    { id: '3d', label: '3D', icon: '🧊', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
    { id: 'cyber', label: '赛博', icon: '🤖', gradient: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)' },
    { id: 'oil', label: '油画', icon: '🎨', gradient: 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)' },
    { id: 'pixel', label: '像素', icon: '👾', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
];

const RATIO_OPTIONS = [
    { label: '1:1', value: '1:1', desc: '方形 (社交头像/帖子)' },
    { label: '3:4', value: '3:4', desc: '竖向 (手机壁纸/人像)' },
    { label: '4:3', value: '4:3', desc: '横向 (传统照片/幻灯片)' },
    { label: '16:9', value: '16:9', desc: '宽屏 (电脑壁纸/封面)' },
    { label: '9:16', value: '9:16', desc: '全屏 (Stories/海报)' },
];

export const ImageCreationPanel: React.FC<ImageCreationPanelProps> = ({ visible, onClose, initialData }) => {
    const { createSession } = useChatStore();
    
    // Core State
    const [mode, setMode] = useState<CreationMode>('text');
    const [prompt, setPrompt] = useState('');
    
    // Channel & Model State
    const [channel, setChannel] = useState(CHANNELS[0].id);
    const [model, setModel] = useState(CHANNELS[0].models[0]);
    const [showPicker, setShowPicker] = useState(false);

    // Config State
    const [ratio, setRatio] = useState<AspectRatio>('1:1');
    const [style, setStyle] = useState('none');
    const [hd, setHd] = useState(false);
    
    const [showRatioPicker, setShowRatioPicker] = useState(false);
    
    // Reference Image State
    const [refImage, setRefImage] = useState<string | null>(null);
    const [refStrength, setRefStrength] = useState(50);
    
    const inputRef = useRef<PromptTextInputRef>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Derived active objects
    const activeChannelObj = CHANNELS.find(c => c.id === channel) || CHANNELS[0];

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

    const handleTabChange = (id: string) => {
        setMode(id as any);
    };

    const handleCreate = async () => {
        let finalPrompt = `${prompt} --v ${model}`;
        if (refImage) finalPrompt += ` --iw ${refStrength/100}`;

        await CreationService.create({
            title: prompt.slice(0, 20) || '未命名作品',
            type: 'image',
            prompt: finalPrompt,
            ratio: ratio,
            style: style,
            url: `https://api.dicebear.com/7.x/shapes/svg?seed=${Date.now()}`, 
            isPublic: false,
            likes: 0,
            author: 'Me'
        });

        const sessionId = await createSession('agent_image');
        navigate('/chat', { id: sessionId });
        onClose();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setRefImage(url);
            if (mode === 'text') setMode('img2img');
        }
        e.target.value = '';
    };

    if (!visible) return null;

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 910, animation: 'fadeIn 0.2s forwards' }} />
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: 'var(--bg-card)', borderRadius: '24px 24px 0 0',
                zIndex: 920, display: 'flex', flexDirection: 'column',
                maxHeight: '92vh', paddingBottom: 'env(safe-area-inset-bottom)',
                animation: 'slideUpPanel 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.1)'
            }}>
                <div style={{ background: 'rgba(var(--bg-card-rgb), 0.98)', backdropFilter: 'blur(10px)', borderRadius: '24px 24px 0 0' }}>
                    <div style={{ height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderBottom: '0.5px solid transparent' }}>
                        <span style={{ fontSize: '16px', fontWeight: 600 }}>AI 图片创作</span>
                        <div 
                            onClick={onClose} 
                            style={{ 
                                position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                                width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                cursor: 'pointer', borderRadius: '50%', background: 'var(--bg-body)',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </div>
                    </div>

                    <div style={{ paddingBottom: '0px' }}>
                        <Tabs 
                            items={[
                                { id: 'text', label: '文生图' }, 
                                { id: 'img2img', label: '参考生图' }, 
                                { id: 'portrait', label: 'AI 写真' }, 
                                { id: 'grid', label: '智能宫格' }
                            ]}
                            activeId={mode}
                            onChange={handleTabChange}
                            variant="line"
                            style={{ background: 'transparent', borderBottom: '0.5px solid var(--border-color)' }}
                        />
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    
                    {(mode === 'img2img' || refImage) && (
                        <div style={{ marginBottom: '20px', animation: 'fadeIn 0.2s' }}>
                            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>参考底图 (Reference)</label>
                                {refImage && (
                                    <span onClick={() => setRefImage(null)} style={{ fontSize: '11px', color: '#fa5151', cursor: 'pointer' }}>移除</span>
                                )}
                            </div>
                            {!refImage ? (
                                <div onClick={() => fileInputRef.current?.click()} style={{ height: '100px', borderRadius: '12px', border: '1px dashed var(--border-color)', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                    <div style={{ fontSize: '24px', opacity: 0.5 }}>📷</div>
                                    <div style={{ fontSize: '13px' }}>点击上传参考图</div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '16px', background: 'var(--bg-body)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(0,0,0,0.1)' }}>
                                        <img src={refImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>参考强度 (Denoising)</span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>{refStrength}%</span>
                                        </div>
                                        <Slider 
                                            min={10} 
                                            max={90} 
                                            step={10} 
                                            value={refStrength} 
                                            onChange={setRefStrength}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                {mode === 'portrait' ? '场景与动作描述' : '画面描述 (Prompt)'}
                            </label>
                            <span onClick={() => { setPrompt(p => p + ", highly detailed, 8k, cinematic lighting"); Toast.success('已应用画质增强词'); }} style={{ fontSize: '11px', color: 'var(--primary-color)', cursor: 'pointer', background: 'rgba(41, 121, 255, 0.1)', padding: '4px 8px', borderRadius: '12px', fontWeight: 500 }}>✨ 一键润色</span>
                        </div>
                        <PromptTextInput 
                            ref={inputRef}
                            value={prompt}
                            onChange={setPrompt}
                            placeholder={mode === 'portrait' ? "描述人物动作、神态、环境..." : "描述你想象中的画面，例如：赛博朋克风格的雨夜街道..."}
                            style={{ width: '100%', height: '110px', padding: '12px', borderRadius: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-body)' }}
                        />
                    </div>

                    <div onClick={() => setShowPicker(true)} style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', right: -20, top: -20, fontSize: '100px', opacity: 0.05, transform: 'rotate(15deg)', pointerEvents: 'none' }}>{activeChannelObj.icon}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', zIndex: 1 }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', border: '1px solid var(--border-color)' }}>{activeChannelObj.icon}</div>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {model}
                                    <span style={{ fontSize: '10px', color: 'white', background: 'var(--primary-color)', padding: '1px 4px', borderRadius: '4px', fontWeight: 500 }}>PRO</span>
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{activeChannelObj.name} Engine</div>
                            </div>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 1 }}>
                            <span style={{ fontSize: '13px' }}>切换</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '10px' }}>艺术风格</label>
                        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '4px', scrollbarWidth: 'none', marginLeft: '-4px' }}>
                            {STYLES.map(s => {
                                const isSelected = style === s.id;
                                return (
                                    <div key={s.id} onClick={() => setStyle(s.id)} style={{ flexShrink: 0, width: '72px', height: '72px', borderRadius: '12px', background: s.gradient, position: 'relative', cursor: 'pointer', border: isSelected ? '2px solid var(--primary-color)' : '2px solid transparent', transition: 'all 0.2s', transform: isSelected ? 'scale(1.05) translateY(-2px)' : 'scale(1)', boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.1)' : 'none' }}>
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '24px' }}>{s.icon}</div>
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.9)', color: '#333', fontSize: '10px', textAlign: 'center', padding: '4px 0', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', fontWeight: 600 }}>{s.label}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <CellGroup title="生成参数">
                            <Cell title="图片比例" value={ratio} isLink onClick={() => setShowRatioPicker(true)} />
                            <Cell title="高清修复 (Hires Fix)" value={<Switch checked={hd} onChange={setHd} />} />
                        </CellGroup>
                    </div>
                </div>

                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                    <button onClick={handleCreate} disabled={!prompt.trim()} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: prompt.trim() ? 'var(--primary-gradient)' : 'var(--bg-cell-active)', color: prompt.trim() ? 'white' : 'var(--text-secondary)', fontSize: '16px', fontWeight: 600, cursor: prompt.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: prompt.trim() ? '0 4px 16px rgba(41, 121, 255, 0.3)' : 'none', transition: 'all 0.2s' }}>
                        <span>生成图片</span>
                        <span style={{ fontSize: '12px', opacity: 0.8, fontWeight: 400 }}>| {model}</span>
                    </button>
                </div>
            </div>

            <ModelPicker 
                visible={showPicker}
                onClose={() => setShowPicker(false)}
                providers={CHANNELS}
                initialProviderId={channel}
                selectedModel={model}
                onSelect={(cId, mId) => {
                    setChannel(cId);
                    setModel(mId);
                    setShowPicker(false);
                }}
            />

            <ActionSheet visible={showRatioPicker} onClose={() => setShowRatioPicker(false)} title="选择图片比例" height="auto">
                <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', paddingBottom: '40px' }}>
                    {RATIO_OPTIONS.map(opt => (
                        <div key={opt.value} onClick={() => { setRatio(opt.value as any); setShowRatioPicker(false); }} style={{ padding: '12px', borderRadius: '12px', border: ratio === opt.value ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', background: ratio === opt.value ? 'rgba(41, 121, 255, 0.05)' : 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{opt.label}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{opt.desc}</div>
                            </div>
                            {ratio === opt.value && <div style={{ color: 'var(--primary-color)', fontSize: '18px' }}>✓</div>}
                        </div>
                    ))}
                </div>
            </ActionSheet>
        </>
    );
};
