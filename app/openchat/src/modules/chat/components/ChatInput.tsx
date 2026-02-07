
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryParams } from '../../../router'; 
import { Toast } from '../../../components/Toast';
import { ChatActionPanel } from './ChatActionPanel';
import { ChatPluginPanel } from './ChatPluginPanel';
import { Platform } from '../../../platform';
import { VoiceOverlay } from './VoiceOverlay';

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
}

const Icons = {
  voice_wave: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>,
  keyboard: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01"/><path d="M10 8h.01"/><path d="M14 8h.01"/><path d="M18 8h.01"/><path d="M6 12h.01"/><path d="M10 12h.01"/><path d="M14 12h.01"/><path d="M18 12h.01"/><path d="M7 16h10"/></svg>,
  plus: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
};

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [activePanel, setActivePanel] = useState<'none' | 'action' | 'plugin'>('none');
  
  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [cancelVoice, setCancelVoice] = useState(false);
  const startYRef = useRef<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const query = useQueryParams();
  const sessionId = query.get('id') || undefined;

  // --- Handlers ---

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;
    onSend(input);
    setInput('');
    setActivePanel('none');
    // Reset height
    if (textareaRef.current) {
        textareaRef.current.style.height = '40px';
        textareaRef.current.focus();
    }
  }, [input, isLoading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const togglePanel = (panel: 'action' | 'plugin') => {
      if (activePanel === panel) {
          setActivePanel('none');
          setTimeout(() => textareaRef.current?.focus(), 100);
      } else {
          setActivePanel(panel);
          textareaRef.current?.blur();
      }
  };
  
  const toggleMode = () => {
      setMode(prev => {
          const newMode = prev === 'text' ? 'voice' : 'text';
          setActivePanel('none');
          if (newMode === 'text') setTimeout(() => textareaRef.current?.focus(), 100);
          return newMode;
      });
  };

  const handlePluginClick = (label: string) => {
      Toast.success(`已启用: ${label}`);
      setActivePanel('none');
      
      const templates: Record<string, string> = {
          '翻译助手': '请帮我把下面的内容翻译成英文：\n' + input,
          '润色文本': '请帮我润色并优化以下文本，使其更专业：\n' + input,
          '代码片段': '请帮我写一段代码实现：' + input,
      };

      if (templates[label]) {
          setInput(templates[label]);
      }
      setTimeout(() => textareaRef.current?.focus(), 300);
  };

  // --- Voice Logic (Touch Events) ---
  const handleVoiceStart = (e: React.TouchEvent | React.MouseEvent) => {
      setIsRecording(true);
      setCancelVoice(false);
      Platform.device.vibrate(20);
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      startYRef.current = clientY;
  };

  const handleVoiceMove = (e: React.TouchEvent | React.MouseEvent) => {
      if (!isRecording) return;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      // If moved up by 60px, toggle cancel state
      setCancelVoice(startYRef.current - clientY > 60);
  };

  const handleVoiceEnd = (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      if (!isRecording) return;
      setIsRecording(false);
      
      if (cancelVoice) {
          // No action, cancelled
      } else {
          Platform.device.vibrate(10);
          onSend('🎤 [语音消息 3"]');
      }
      setCancelVoice(false);
  };

  // Auto-grow textarea effect
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px'; 
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [input]);

  return (
    <>
        <VoiceOverlay isRecording={isRecording} cancelVoice={cancelVoice} />

        <div style={{
            display: 'flex', flexDirection: 'column',
            background: 'var(--navbar-bg)', borderTop: '0.5px solid var(--border-color)',
            zIndex: 200,
            transition: 'all 0.2s',
            // Ensure input area is safe from bottom gestures
            paddingBottom: activePanel === 'none' ? 'calc(env(safe-area-inset-bottom) + 8px)' : '0'
        }}>
            {/* Input Bar */}
            <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'flex-end', gap: '12px', minHeight: '56px' }}>
                {/* Voice/Text Toggle */}
                <div onClick={toggleMode} style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', height: '40px', opacity: 0.8, cursor: 'pointer' }}>
                    {mode === 'text' ? Icons.voice_wave : Icons.keyboard}
                </div>

                {/* Input Area */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: '100%', minHeight: '40px' }}>
                    {mode === 'text' ? (
                        <textarea 
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setActivePanel('none')}
                            placeholder="发消息..."
                            rows={1}
                            style={{
                                width: '100%', border: 'none', borderRadius: '8px', padding: '10px 12px',
                                fontSize: '16px', lineHeight: '1.4', background: 'var(--bg-body)',
                                outline: 'none', height: '40px', minHeight: '40px', color: 'var(--text-primary)',
                                resize: 'none', fontFamily: 'inherit',
                            }}
                            disabled={isLoading}
                        />
                    ) : (
                        <button
                            onTouchStart={handleVoiceStart}
                            onTouchMove={handleVoiceMove}
                            onTouchEnd={handleVoiceEnd}
                            onMouseDown={handleVoiceStart}
                            onMouseMove={handleVoiceMove}
                            onMouseUp={handleVoiceEnd}
                            onMouseLeave={handleVoiceEnd}
                            style={{
                                width: '100%', height: '40px', borderRadius: '8px', border: 'none',
                                background: isRecording ? '#c5c5c5' : 'var(--bg-body)',
                                color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                userSelect: 'none', cursor: 'pointer', transition: 'background 0.1s'
                            }}
                        >
                            {isRecording ? '松开 结束' : '按住 说话'}
                        </button>
                    )}
                </div>
                
                {/* Plugin Button */}
                <div onClick={() => togglePanel('plugin')} style={{ color: activePanel === 'plugin' ? 'var(--primary-color)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', height: '40px', opacity: activePanel === 'plugin' ? 1 : 0.8, cursor: 'pointer' }}>
                    <div style={{ width: '24px', height: '24px', background: '#07c160', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px', fontFamily: 'serif' }}>P</div>
                </div>
                
                {/* Send or Action Button */}
                {(input.length > 0 && mode === 'text') ? (
                    <button 
                        onClick={handleSend}
                        disabled={isLoading}
                        style={{
                            border: 'none', background: 'var(--primary-color)', color: 'white',
                            borderRadius: '6px', padding: '0 14px', height: '34px', marginBottom: '3px',
                            fontWeight: 500, fontSize: '14px', marginLeft: '4px', whiteSpace: 'nowrap', cursor: 'pointer',
                        }}
                    >
                        发送
                    </button>
                ) : (
                    <div 
                        onClick={() => togglePanel('action')}
                        style={{ 
                            color: activePanel === 'action' ? 'var(--primary-color)' : 'var(--text-primary)', 
                            display: 'flex', alignItems: 'center', height: '40px', 
                            opacity: activePanel === 'action' ? 1 : 0.8, cursor: 'pointer',
                            transform: activePanel === 'action' ? 'rotate(45deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s, color 0.2s'
                        }}
                    >
                        {Icons.plus}
                    </div>
                )}
            </div>

            {/* Sub-Panels */}
            <ChatPluginPanel visible={activePanel === 'plugin'} onPluginClick={handlePluginClick} />
            <ChatActionPanel visible={activePanel === 'action'} sessionId={sessionId} />
            
            {/* Safe Area Spacer for Panels */}
            {activePanel !== 'none' && <div style={{ height: 'env(safe-area-inset-bottom)', background: 'var(--bg-body)' }} />}
        </div>
    </>
  );
};
