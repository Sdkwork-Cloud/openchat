
import React from 'react';
import { navigate } from '../router';
import { useChatStore } from '../services/store';
import { Platform } from '../platform';

// Mapping tools to specific Agent IDs for "Smart Routing"
const tools = [
  { title: 'AI 帮写', icon: '📝', color: '#FF9C6E', agentId: 'agent_writer' },
  { title: '文生图', icon: '🎨', color: '#5CDBD3', agentId: 'agent_image' },
  { title: '视频生成', icon: '🎬', color: '#95DE64', agentId: 'agent_image' }, // Reuse image agent for demo or create new
  { title: '代码生成', icon: '💻', color: '#85A5FF', agentId: 'agent_coder' }, // Changed PPT to Code for better agent match
  { title: '英语私教', icon: '🎙️', color: '#FFADD2', agentId: 'agent_english' },
  { title: '文档翻译', icon: '🌍', color: '#B37FEB', agentId: 'omni_core' },
];

const drafts = [
  { id: 1, title: '关于 Q4 季度架构规划的草稿', time: '10分钟前' },
  { id: 2, title: '未命名的画作', time: '2小时前' },
];

export const CreationPage: React.FC = () => {
  const { createSession } = useChatStore();

  // The Smart Algorithm: Intent -> Agent Session
  const handleToolClick = async (tool: typeof tools[0]) => {
      // Create a session with the specific specialist agent
      const sessionId = await createSession(tool.agentId);
      // Navigate to chat
      navigate('/chat', { id: sessionId });
      
      Platform.device.vibrate(5);
  };

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg-body)' }}>
      {/* Navbar - Unified */}
      <div style={{ 
        height: '44px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', // Center title
        padding: '0 16px',
        background: 'var(--navbar-bg)',
        fontWeight: 600,
        fontSize: '17px',
        color: 'var(--text-primary)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '0.5px solid var(--border-color)',
        backdropFilter: 'blur(10px)',
        paddingTop: 'env(safe-area-inset-top)'
      }}>
        创作中心
      </div>

      <div style={{ padding: '16px' }}>
        {/* Tools Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '12px', 
          marginBottom: '24px' 
        }}>
          {tools.map(tool => (
            <div 
              key={tool.title} 
              onClick={() => handleToolClick(tool)}
              style={{ 
                background: 'var(--bg-card)', 
                borderRadius: '12px', 
                padding: '16px 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                cursor: 'pointer'
              }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                background: tool.color, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '20px',
                color: 'white'
              }}>
                {tool.icon}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{tool.title}</div>
            </div>
          ))}
        </div>

        {/* Drafts */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', padding: '0 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '16px 0 8px 0', fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)', borderBottom: '0.5px solid var(--border-color)' }}>
            最近草稿
          </div>
          {drafts.map((draft, idx) => (
            <div 
              key={draft.id} 
              onClick={() => navigate('/general', { title: '草稿预览' })}
              style={{ 
                padding: '16px 0', 
                borderBottom: idx !== drafts.length - 1 ? '0.5px solid var(--border-color)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer'
            }}>
              <div style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{draft.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{draft.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
