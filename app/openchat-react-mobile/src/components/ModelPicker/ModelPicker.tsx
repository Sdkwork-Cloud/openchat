
import React, { useState, useEffect } from 'react';
import { Platform } from '../../platform';
import { Popup } from '../Popup/Popup';

export interface ModelProvider {
    id: string;
    name: string;
    icon: string;
    desc: string;
    models: string[];
}

interface ModelPickerProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    providers: ModelProvider[];
    initialProviderId?: string; 
    selectedModel?: string; 
    onSelect: (providerId: string, modelId: string) => void;
}

export const ModelPicker: React.FC<ModelPickerProps> = ({ 
    visible, 
    onClose, 
    title = '选择模型',
    providers, 
    initialProviderId, 
    selectedModel, 
    onSelect 
}) => {
    const [activeProviderId, setActiveProviderId] = useState(initialProviderId || (providers[0]?.id));
    
    useEffect(() => {
        if (visible) {
            if (initialProviderId) setActiveProviderId(initialProviderId);
            else if (providers.length > 0) setActiveProviderId(providers[0].id);
        }
    }, [visible, initialProviderId, providers]);

    const activeProvider = providers.find(p => p.id === activeProviderId) || providers[0];

    return (
        <Popup 
            visible={visible} 
            onClose={onClose} 
            position="bottom" 
            round 
            style={{ height: '75vh' }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'inherit' }}>
                {/* Header */}
                <div style={{ 
                    padding: '16px', textAlign: 'center', fontWeight: 600, 
                    borderBottom: '0.5px solid var(--border-color)', 
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    background: 'rgba(var(--bg-card-rgb), 0.95)',
                    backdropFilter: 'blur(10px)',
                    fontSize: '17px',
                    flexShrink: 0
                }}>
                    <span>{title}</span>
                    <div 
                        onClick={() => { Platform.device.vibrate(5); onClose(); }} 
                        style={{ 
                            position: 'absolute', right: 16, top: 16, padding: 4, cursor: 'pointer',
                            background: 'var(--bg-body)', borderRadius: '50%', width: '28px', height: '28px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div>
                </div>
                
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* Left Sidebar: Providers */}
                    <div style={{ width: '130px', background: 'var(--bg-body)', overflowY: 'auto', borderRight: '0.5px solid var(--border-color)' }}>
                        {providers.map(p => {
                            const isActive = activeProviderId === p.id;
                            return (
                                <div 
                                    key={p.id}
                                    onClick={() => { Platform.device.vibrate(5); setActiveProviderId(p.id); }}
                                    style={{ 
                                        padding: '16px 12px', 
                                        background: isActive ? 'var(--bg-card)' : 'transparent',
                                        position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                                        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px'
                                    }}
                                >
                                    {isActive && (
                                        <div style={{ 
                                            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', 
                                            width: '3px', height: '24px', background: 'var(--primary-color)', 
                                            borderRadius: '0 3px 3px 0' 
                                        }} />
                                    )}
                                    
                                    <div style={{ fontSize: '22px', flexShrink: 0 }}>{p.icon}</div>
                                    <div style={{ 
                                        fontSize: '13px', lineHeight: 1.3, flex: 1,
                                        color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)',
                                        fontWeight: isActive ? 600 : 400
                                    }}>{p.name}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Content: Models */}
                    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '20px 20px 10px' }}>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {activeProvider?.icon} {activeProvider?.name}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                                {activeProvider?.desc}
                            </div>
                        </div>
                        
                        <div style={{ padding: '10px 20px 30px' }}>
                            {activeProvider?.models.map(m => {
                                const isSelected = selectedModel === m;
                                return (
                                    <div 
                                        key={m} 
                                        onClick={() => {
                                            Platform.device.vibrate(10);
                                            onSelect(activeProviderId, m);
                                        }}
                                        style={{ 
                                            padding: '16px', marginBottom: '10px',
                                            borderRadius: '12px', 
                                            background: isSelected ? 'rgba(41, 121, 255, 0.08)' : 'var(--bg-body)',
                                            border: isSelected ? '1px solid rgba(41, 121, 255, 0.3)' : '1px solid transparent',
                                            color: isSelected ? 'var(--primary-color)' : 'var(--text-primary)',
                                            fontWeight: isSelected ? 600 : 400,
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            cursor: 'pointer', transition: 'all 0.1s'
                                        }}
                                    >
                                        <span style={{ fontSize: '15px' }}>{m}</span>
                                        {isSelected && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </Popup>
    );
};
