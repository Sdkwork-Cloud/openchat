
import React, { useState, useEffect, useRef } from 'react';
import { navigate } from '../../../router';
import { useChatStore } from '../../../services/store';
import { CreationService } from '../services/CreationService';
import { Tabs } from '../../../components/Tabs/Tabs';
import { Platform } from '../../../platform';
import { Cell, CellGroup } from '../../../components/Cell';
import { ActionSheet } from '../../../components/ActionSheet/ActionSheet';
import { PromptTextInput, PromptTextInputRef } from '../../../components/PromptTextInput/PromptTextInput';
import { ModelPicker, ModelProvider } from '../../../components/ModelPicker/ModelPicker';

interface VideoCreationPanelProps {
    visible: boolean;
    onClose: () => void;
    initialData?: any; 
}

const CHANNELS: ModelProvider[] = [
    { id: 'runway', name: 'Runway', icon: '🎬', desc: '影视级视频生成，动态效果极佳', models: ['Gen-3 Alpha', 'Gen-2', 'Frame Interpolation', 'Green Screen'] },
    { id: 'google', name: 'Google', icon: '☁️', desc: 'Veo 视频模型，超长时长支持', models: ['Veo', 'Imagen Video', 'Lumiere (Preview)'] },
    { id: 'openai', name: 'OpenAI', icon: '🤖', desc: '世界模拟器，物理规律遵循度高', models: ['Sora', 'Sora Turbo', 'Sora HD'] },
    { id: 'aliyun', name: '阿里云', icon: '🔶', desc: '人物与表情动画专家', models: ['LivePortrait', 'Emoji Animate', 'Animate Anyone'] },
    { id: 'pika', name: 'Pika', icon: '⚡', desc: '动画风格与特效生成', models: ['Pika 1.0', 'Pika Art', 'Lip Sync'] }
];

const RATIO_OPTIONS = [
    { label: '16:9', value: '16:9', desc: '横屏视频 (YouTube)' },
    { label: '9:16', value: '9:16', desc: '竖屏短视频 (TikTok/Reels)' },
    { label: '1:1', value: '1:1', desc: '方形 (Instagram)' },
    { label: '4:3', value: '4:3', desc: '经典电视' },
    { label: '3:4', value: '3:4', desc: '传统竖屏' },
    { label: '21:9', value: '21:9', desc: '电影宽银幕' },
    { label: '9:21', value: '9:21', desc: '超长竖屏' },
];

const DURATION_OPTIONS = Array.from({ length: 13 }, (_, i) => {
    const val = i + 4;
    return { label: `${val} 秒`, value: val };
});

type VideoMode = 'text' | 'image' | 'frames' | 'omni';

// --- Helper: Upload Box ---
const UploadBox = ({ label, image, onClick, onClear, height = '100px' }: { label: string, image: string | null, onClick: () => void, onClear: () => void, height?: string }) => (
    <div 
        onClick={image ? undefined : onClick}
        style={{ 
            flex: 1, height: height, borderRadius: '12px', 
            border: '1px dashed var(--border-color)', background: 'var(--bg-body)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: image ? 'default' : 'pointer', overflow: 'hidden', position: 'relative',
            transition: 'all 0.2s'
        }}
        onTouchStart={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
        onTouchEnd={(e) => e.currentTarget.style.background = 'var(--bg-body)'}
    >
        {image ? (
            <>
                <img src={image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div onClick={(e) => { e.stopPropagation(); onClear(); }} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', cursor: 'pointer' }}>✕</div>
            </>
        ) : (
            <>
                <div style={{ fontSize: '24px', marginBottom: '6px', opacity: 0.5 }}>📷</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</div>
            </>
        )}
    </div>
);

export const VideoCreationPanel: React.FC<VideoCreationPanelProps> = ({ visible, onClose, initialData }) => {
    const { createSession } = useChatStore();
    const [mode, setMode] = useState<VideoMode>('text');
    const [prompt, setPrompt] = useState('');
    
    // Updated Config: Ratio & Duration
    const [ratio, setRatio] = useState('16:9');
    const [duration, setDuration] = useState(5);

    // Pickers visibility
    const [showRatioPicker, setShowRatioPicker] = useState(false);
    const [showDurationPicker, setShowDurationPicker] = useState(false);

    // Advanced Inputs
    const [singleImage, setSingleImage] = useState<string | null>(null);
    const [startFrame, setStartFrame] = useState<string | null>(null);
    const [endFrame, setEndFrame] = useState<string | null>(null);
    const [refImages, setRefImages] = useState<string[]>([]);

    // Channel State
    const [channel, setChannel] = useState(CHANNELS[0].id);
    const [model, setModel] = useState(CHANNELS[0].models[0]);
    const [showPicker, setShowPicker] = useState(false);

    const inputRef = useRef<PromptTextInputRef>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const activeUploadType = useRef<'single' | 'start' | 'end' | 'ref' | null>(null);

    // Derived active objects
    const activeChannelObj = CHANNELS.find(c => c.id === channel) || CHANNELS[0];

    useEffect(() => {
        if (visible) {
            if (initialData && initialData.prompt) {
                setPrompt(initialData.prompt);
            }
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [visible, initialData]);

    const handleCreate = async () => {
        await CreationService.create({
            title: prompt.slice(0, 15) || '未命名视频',
            type: 'video',
            prompt: prompt,
            ratio: ratio,
            style: `Model: ${model}`,
            url: '', 
            isPublic: false,
            likes: 0,
            author: 'Me'
        });

        const sessionId = await createSession('agent_image'); 
        navigate('/chat', { id: sessionId });
        onClose();
    };

    const triggerUpload = (type: 'single' | 'start' | 'end' | 'ref') => {
        activeUploadType.current = type;
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            if (activeUploadType.current === 'single') setSingleImage(url);
            else if (activeUploadType.current === 'start') setStartFrame(url);
            else if (activeUploadType.current === 'end') setEndFrame(url);
            else if (activeUploadType.current === 'ref') setRefImages(prev => [...prev, url].slice(0, 3));
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
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />

                <div style={{ background: 'rgba(var(--bg-card-rgb), 0.98)', backdropFilter: 'blur(10px)', borderRadius: '24px 24px 0 0' }}>
                    <div style={{ height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <span style={{ fontSize: '16px', fontWeight: 600 }}>AI 视频创作</span>
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
                                { id: 'text', label: '文生视频' }, 
                                { id: 'image', label: '图生视频' },
                                { id: 'frames', label: '首尾帧' },
                                { id: 'omni', label: '全能多参' }
                            ]}
                            activeId={mode}
                            onChange={(id) => setMode(id as any)}
                            variant="line"
                            style={{ background: 'transparent', borderBottom: '0.5px solid var(--border-color)' }}
                        />
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {mode === 'image' && (
                        <div style={{ marginBottom: '20px', animation: 'fadeIn 0.2s' }}>
                            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '10px' }}>参考底图</label>
                            <UploadBox label="上传图片" image={singleImage} onClick={() => triggerUpload('single')} onClear={() => setSingleImage(null)} height="160px" />
                        </div>
                    )}

                    {mode === 'frames' && (
                        <div style={{ marginBottom: '20px', animation: 'fadeIn 0.2s' }}>
                            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '10px' }}>首尾帧控制</label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <UploadBox label="首帧 (Start)" image={startFrame} onClick={() => triggerUpload('start')} onClear={() => setStartFrame(null)} />
                                <UploadBox label="尾帧 (End)" image={endFrame} onClick={() => triggerUpload('end')} onClear={() => setEndFrame(null)} />
                            </div>
                        </div>
                    )}

                    {mode === 'omni' && (
                        <div style={{ marginBottom: '20px', animation: 'fadeIn 0.2s' }}>
                            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>全能参考 (Omni Ref)</span>
                                <span style={{ fontSize: '11px', fontWeight: 400 }}>{refImages.length}/3</span>
                            </label>
                            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                                {refImages.map((img, i) => (
                                    <div key={i} style={{ width: '80px', height: '80px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-color)' }}>
                                        <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div onClick={() => setRefImages(prev => prev.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer' }}>✕</div>
                                    </div>
                                ))}
                                {refImages.length < 3 && (
                                    <div onClick={() => triggerUpload('ref')} style={{ width: '80px', height: '80px', flexShrink: 0, borderRadius: '12px', border: '1px dashed var(--border-color)', background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '24px', color: 'var(--text-secondary)' }}>+</div>
                                )}
                            </div>
                        </div>
                    )}

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '10px' }}>画面脚本</label>
                        <PromptTextInput 
                            ref={inputRef}
                            value={prompt}
                            onChange={setPrompt}
                            placeholder={mode === 'text' ? "描述视频内容，例如：一只正在奔跑的赛博朋克风格的猫，霓虹灯背景..." : "描述画面动态..."}
                            style={{ width: '100%', height: '100px', background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px' }}
                        />
                    </div>

                    <div onClick={() => setShowPicker(true)} style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', right: -20, top: -20, fontSize: '100px', opacity: 0.05, transform: 'rotate(15deg)', pointerEvents: 'none' }}>{activeChannelObj.icon}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', zIndex: 1 }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', border: '1px solid var(--border-color)' }}>{activeChannelObj.icon}</div>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {model}
                                    <span style={{ fontSize: '10px', color: 'white', background: 'var(--primary-color)', padding: '1px 4px', borderRadius: '4px', fontWeight: 500 }}>AI</span>
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
                        <CellGroup title="生成参数">
                            <Cell title="视频比例" value={ratio} isLink onClick={() => setShowRatioPicker(true)} />
                            <Cell title="视频时长" value={`${duration} 秒`} isLink onClick={() => setShowDurationPicker(true)} />
                        </CellGroup>
                    </div>
                </div>

                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                    <button onClick={handleCreate} disabled={!prompt.trim()} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: prompt.trim() ? 'var(--primary-gradient)' : 'var(--bg-cell-active)', color: prompt.trim() ? 'white' : 'var(--text-secondary)', fontSize: '16px', fontWeight: 600, cursor: prompt.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: prompt.trim() ? '0 4px 16px rgba(41, 121, 255, 0.3)' : 'none', transition: 'all 0.2s' }}>
                        <span>生成视频</span>
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

            <ActionSheet visible={showRatioPicker} onClose={() => setShowRatioPicker(false)} title="选择视频比例" height="auto">
                <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', paddingBottom: '40px' }}>
                    {RATIO_OPTIONS.map(opt => (
                        <div key={opt.value} onClick={() => { setRatio(opt.value); setShowRatioPicker(false); }} style={{ padding: '12px', borderRadius: '12px', border: ratio === opt.value ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', background: ratio === opt.value ? 'rgba(41, 121, 255, 0.05)' : 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{opt.label}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{opt.desc}</div>
                            </div>
                            {ratio === opt.value && <div style={{ color: 'var(--primary-color)', fontSize: '18px' }}>✓</div>}
                        </div>
                    ))}
                </div>
            </ActionSheet>

            <ActionSheet visible={showDurationPicker} onClose={() => setShowDurationPicker(false)} title="选择视频时长" height="auto">
                <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', paddingBottom: '40px' }}>
                    {DURATION_OPTIONS.map(opt => (
                        <div key={opt.value} onClick={() => { setDuration(opt.value); setShowDurationPicker(false); }} style={{ padding: '12px 0', borderRadius: '12px', border: duration === opt.value ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', background: duration === opt.value ? 'rgba(41, 121, 255, 0.05)' : 'var(--bg-card)', color: duration === opt.value ? 'var(--primary-color)' : 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: duration === opt.value ? 600 : 400, fontSize: '14px' }}>
                            {opt.label}
                        </div>
                    ))}
                </div>
            </ActionSheet>
        </>
    );
};
