
import React from 'react';
import { navigate } from '../../../router';
import { useChatStore } from '../../../services/store';

interface PluginItem {
    label: string;
    icon: string;
    color: string;
    action?: string;
    agentId?: string; // New: Direct agent switch
}

interface ChatPluginPanelProps {
    visible: boolean;
    onPluginClick: (label: string) => void;
}

const PLUGIN_ITEMS: PluginItem[] = [
    { label: '好物推荐', icon: '🛍️', color: '#ff4d4f', agentId: 'agent_shopper' },
    { label: 'Prompt 库', icon: '📚', color: '#722ed1' },
    { label: '翻译助手', icon: '🌍', color: '#1890ff' },
    { label: '代码片段', icon: '💻', color: '#fa8c16' },
    { label: '润色文本', icon: '✨', color: '#eb2f96' },
    { label: 'AI 绘图', icon: '🎨', color: '#13c2c2', action: '/creation' },
    { label: '文档分析', icon: '📄', color: '#52c41a' },
];

export const ChatPluginPanel: React.FC<ChatPluginPanelProps> = ({ visible, onPluginClick }) => {
    const { createSession } = useChatStore();

    const handleItemClick = async (plugin: PluginItem) => {
        if (plugin.action) {
            navigate(plugin.action);
        } else if (plugin.agentId) {
            // Smart Switch: Create session with specific agent
            const sessionId = await createSession(plugin.agentId);
            navigate('/chat', { id: sessionId });
        } else {
            onPluginClick(plugin.label);
        }
    };

    return (
        <div style={{
            height: visible ? '180px' : '0px',
            overflow: 'hidden',
            transition: 'height 0.25s cubic-bezier(0.19, 1, 0.22, 1)',
            background: 'var(--bg-body)',
            borderTop: visible ? '0.5px solid var(--border-color)' : 'none',
        }}>
             <div style={{ padding: '16px', height: '100%', overflowY: 'auto' }}>
                 <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>智能助手 & 提示词</span>
                    <span style={{ color: 'var(--primary-color)' }}>应用市场 ›</span>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {PLUGIN_ITEMS.map(plugin => (
                        <div 
                            key={plugin.label}
                            onClick={() => handleItemClick(plugin)}
                            style={{ 
                                background: 'var(--bg-card)', 
                                padding: '12px', 
                                borderRadius: '8px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                gap: '8px',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ fontSize: '24px', zIndex: 1 }}>{plugin.icon}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-primary)', zIndex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{plugin.label}</div>
                            
                            {/* Decorative background accent */}
                            <div style={{ 
                                position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', 
                                background: plugin.color, opacity: 0.8 
                            }} />
                        </div>
                    ))}
                 </div>
             </div>
        </div>
    );
};
