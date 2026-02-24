
import React, { useEffect, useState, useMemo } from 'react';
import { navigateBack, useQueryParams } from '../../../router';
import { Navbar } from '../../../components/Navbar/Navbar';
import { SettingsService, AIConfig, ModelConfigItem } from '../services/SettingsService';
import { Cell, CellGroup } from '../../../components/Cell';
import { Switch } from '../../../components/Switch/Switch';
import { Input } from '../../../components/Input/Input';
import { Button } from '../../../components/Button/Button';
import { Toast } from '../../../components/Toast';
import { ModelPicker, ModelProvider } from '../../../components/ModelPicker/ModelPicker';
import { Slider } from '../../../components/Slider/Slider'; // New

// --- Domain Configuration Data (Rich Metadata) ---
const DOMAIN_PROVIDERS: Record<string, ModelProvider[]> = {
    text: [
        { id: 'gemini', name: 'Google Gemini', icon: '✨', desc: 'Google 最强多模态模型，速度快，上下文长', models: ['gemini-3-flash-preview', 'gemini-3-pro-preview', 'gemini-1.5-pro'] },
        { id: 'openai', name: 'OpenAI', icon: '🤖', desc: '业界标杆，逻辑推理能力强', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
        { id: 'anthropic', name: 'Anthropic', icon: '🧠', desc: 'Claude 系列，擅长长文本和代码', models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'] },
        { id: 'ollama', name: 'Ollama (Local)', icon: '🦙', desc: '本地私有化部署，数据不出域', models: ['llama3', 'mistral', 'gemma'] },
    ],
    image: [
        { id: 'midjourney', name: 'Midjourney', icon: '⛵', desc: '艺术感极强，画面精美', models: ['V6.0', 'Niji 6', 'V5.2'] },
        { id: 'dall-e', name: 'DALL·E', icon: '🎨', desc: '语义理解准确，易于控制', models: ['dall-e-3', 'dall-e-2'] },
        { id: 'stable-diffusion', name: 'Stability AI', icon: '🌌', desc: '开源生态，可控性高', models: ['sd3', 'sdxl-turbo', 'sd-1.5'] },
    ],
    video: [
        { id: 'runway', name: 'Runway', icon: '🎬', desc: '影视级视频生成', models: ['gen-3-alpha', 'gen-2'] },
        { id: 'luma', name: 'Luma Dream', icon: '🌙', desc: '极速生成，动态自然', models: ['dream-machine'] },
        { id: 'sora', name: 'OpenAI Sora', icon: '🎥', desc: '世界模拟器 (Preview)', models: ['sora-1.0'] },
    ],
    speech: [
        { id: 'openai', name: 'OpenAI TTS', icon: '🗣️', desc: '自然流畅的人声合成', models: ['tts-1', 'tts-1-hd'] },
        { id: 'elevenlabs', name: 'ElevenLabs', icon: '🎙️', desc: '情感丰富，支持声音克隆', models: ['multilingual-v2', 'turbo-v2'] },
    ],
    music: [
        { id: 'suno', name: 'Suno', icon: '🎵', desc: '生成完整歌曲，含人声', models: ['v3', 'v3.5'] },
        { id: 'udio', name: 'Udio', icon: '🎹', desc: '高保真音乐创作', models: ['beta-v1'] },
    ]
};

export const ModelConfigDetailPage: React.FC = () => {
    const query = useQueryParams();
    const domain = query.get('domain') as keyof AIConfig;
    const title = query.get('title') || '模型配置';

    const [config, setConfig] = useState<ModelConfigItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        const load = async () => {
            const res = await SettingsService.getConfig();
            if (res.data && res.data.aiConfig && res.data.aiConfig[domain]) {
                setConfig(res.data.aiConfig[domain]);
            }
            setLoading(false);
        };
        load();
    }, [domain]);

    const handleSave = async () => {
        if (!config) return;
        Toast.loading('保存中...');
        await SettingsService.updateAIConfig(domain, config);
        setTimeout(() => {
            Toast.success('配置已更新');
            navigateBack();
        }, 500);
    };

    const updateField = (field: keyof ModelConfigItem, value: any) => {
        setConfig(prev => prev ? ({ ...prev, [field]: value }) : null);
    };

    if (loading || !config) return <div style={{ height: '100%', background: 'var(--bg-body)' }} />;

    const isLocal = config.mode === 'local';
    
    // Get providers for current domain, fallback to generic if missing
    const currentProviders = DOMAIN_PROVIDERS[domain] || DOMAIN_PROVIDERS['text'];
    
    // Find active provider object for display
    const activeProviderObj = currentProviders.find(p => p.id === config.provider) || 
                              { name: config.provider, icon: '🔧', desc: 'Custom Provider' };

    return (
        <div style={{ minHeight: '100%', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column' }}>
            <Navbar title={title} onBack={() => navigateBack()} />
            
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
                {/* Mode Switcher */}
                <div style={{ padding: '16px 16px 8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    运行模式
                </div>
                <div style={{ padding: '0 16px', marginBottom: '12px' }}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '6px', display: 'flex', border: '0.5px solid var(--border-color)' }}>
                        <div 
                            onClick={() => updateField('mode', 'cloud')}
                            style={{ 
                                flex: 1, padding: '10px', textAlign: 'center', borderRadius: '8px', 
                                background: !isLocal ? 'var(--primary-color)' : 'transparent',
                                color: !isLocal ? 'white' : 'var(--text-secondary)',
                                fontWeight: !isLocal ? 600 : 400, fontSize: '14px', cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            ☁️ 云端 API (Cloud)
                        </div>
                        <div 
                            onClick={() => updateField('mode', 'local')}
                            style={{ 
                                flex: 1, padding: '10px', textAlign: 'center', borderRadius: '8px', 
                                background: isLocal ? 'var(--primary-color)' : 'transparent',
                                color: isLocal ? 'white' : 'var(--text-secondary)',
                                fontWeight: isLocal ? 600 : 400, fontSize: '14px', cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            🏠 本地部署 (Local)
                        </div>
                    </div>
                </div>

                <CellGroup title="模型选择">
                    <Cell 
                        title="启用此服务" 
                        value={<Switch checked={config.enabled} onChange={(v) => updateField('enabled', v)} />} 
                    />
                    
                    {/* The New Premium Model Picker Trigger */}
                    <div 
                        onClick={() => setShowPicker(true)}
                        style={{ 
                            padding: '16px', background: 'var(--bg-card)', 
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            cursor: 'pointer', position: 'relative',
                            borderBottom: '0.5px solid var(--border-color)'
                        }}
                    >
                        <div style={{ fontSize: '16px', color: 'var(--text-primary)' }}>当前模型</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: 500 }}>
                                    {activeProviderObj.icon} {activeProviderObj.name}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    {config.modelName}
                                </div>
                            </div>
                            <div style={{ color: '#c5c9cf' }}>›</div>
                        </div>
                    </div>
                </CellGroup>

                <CellGroup title={isLocal ? "连接配置" : "认证配置"}>
                    {isLocal ? (
                        <>
                            <div style={{ padding: '12px 16px', background: 'var(--bg-card)' }}>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Endpoint URL</div>
                                <Input 
                                    value={config.endpoint || ''} 
                                    onChange={(e) => updateField('endpoint', e.target.value)}
                                    placeholder="http://localhost:11434"
                                    containerStyle={{marginBottom: 0, border: '1px solid var(--border-color)'}}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ padding: '12px 16px', background: 'var(--bg-card)' }}>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>API Key</div>
                                <Input 
                                    type="password"
                                    value={config.apiKey || ''} 
                                    onChange={(e) => updateField('apiKey', e.target.value)}
                                    placeholder="sk-..."
                                    containerStyle={{marginBottom: 0, border: '1px solid var(--border-color)'}}
                                />
                            </div>
                        </>
                    )}
                </CellGroup>

                <CellGroup title="高级参数">
                    <div style={{ padding: '16px', background: 'var(--bg-card)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '16px', color: 'var(--text-primary)' }}>随机性 (Temperature)</span>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{config.temperature}</span>
                        </div>
                        <Slider 
                            min={0} 
                            max={2} 
                            step={0.1} 
                            value={config.temperature || 0.7} 
                            onChange={(val) => updateField('temperature', val)}
                        />
                    </div>
                </CellGroup>
                
                <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {isLocal 
                        ? '请确保本地服务 (如 Ollama, LM Studio) 已启动并允许跨域请求 (CORS)。' 
                        : 'API Key 将仅存储在本地设备，不会上传至 OpenChat 服务器。'}
                </div>
            </div>

            <div style={{ padding: '16px', background: 'var(--bg-card)', borderTop: '0.5px solid var(--border-color)', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
                <Button block onClick={handleSave}>保存配置</Button>
            </div>

            {/* Reusable Model Picker */}
            <ModelPicker 
                visible={showPicker}
                onClose={() => setShowPicker(false)}
                title={`选择${title.replace('设置', '')}`}
                providers={currentProviders}
                initialProviderId={config.provider}
                selectedModel={config.modelName}
                onSelect={(providerId, modelId) => {
                    updateField('provider', providerId);
                    updateField('modelName', modelId);
                    setShowPicker(false);
                }}
            />
        </div>
    );
};
