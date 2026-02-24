
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQueryParams, navigate } from '../../../router'; 
import { Toast } from '../../../components/Toast';
import { ChatActionPanel } from './ChatActionPanel';
import { ChatEmojiPanel } from './ChatEmojiPanel';
import { VoiceOverlay } from '../../../components/VoiceOverlay/VoiceOverlay'; 
import { Message } from '../types';
import { PromptTextInput, PromptTextInputRef } from '../../../components/PromptTextInput/PromptTextInput';
import { useChatStore } from '../../../services/store';
import { Haptic } from '../../../utils/haptic'; 
import { Icon } from '../../../components/Icon/Icon';
import { useTranslation } from '../../../core/i18n/I18nContext';

interface ChatInputProps {
  onSend: (text: string, replyTo?: Message, image?: File) => void;
  isLoading: boolean;
  replyMessage: Message | null;
  onCancelReply: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading, replyMessage, onCancelReply }) => {
  const { createSession } = useChatStore();
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [activePanel, setActivePanel] = useState<'none' | 'action' | 'emoji'>('none');
  const [isRecording, setIsRecording] = useState(false);
  const [cancelVoice, setCancelVoice] = useState(false);
  
  const editorRef = useRef<PromptTextInputRef>(null);
  const startYRef = useRef<number>(0);

  // Fix: Retrieve sessionId from current URL query parameters to support action panel links
  const query = useQueryParams();
  const sessionId = query.get('id') || '';

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;
    Haptic.success();
    onSend(input, replyMessage || undefined);
    setInput(''); 
    if (replyMessage) onCancelReply();
    setTimeout(() => editorRef.current?.focus(), 50);
  }, [input, isLoading, onSend, replyMessage, onCancelReply]);

  // Fix: Implement handleEmojiSelect to append the chosen emoji to the input buffer
  const handleEmojiSelect = (emoji: string) => {
    setInput(prev => prev + emoji);
    Haptic.selection();
  };

  const togglePanel = (panel: 'action' | 'emoji') => {
      if (activePanel === panel) {
          setActivePanel('none');
          setTimeout(() => editorRef.current?.focus(), 100);
      } else {
          Haptic.selection();
          setActivePanel(panel);
          editorRef.current?.blur();
      }
  };
  
  const handleVoiceStart = (e: React.TouchEvent) => {
      e.preventDefault();
      setIsRecording(true);
      setCancelVoice(false);
      Haptic.heavy();
      startYRef.current = e.touches[0].clientY;
  };

  const handleVoiceMove = (e: React.TouchEvent) => {
      const diff = startYRef.current - e.touches[0].clientY;
      const shouldCancel = diff > 80;
      if (shouldCancel !== cancelVoice) {
          Haptic.selection();
          setCancelVoice(shouldCancel);
      }
  };

  const handleVoiceEnd = () => {
      setIsRecording(false);
      if (!cancelVoice) {
          Haptic.success();
          Toast.success('语音已发送(模拟)');
      }
  };

  return (
    <div style={{
        background: 'rgba(var(--navbar-bg-rgb), 0.95)',
        backdropFilter: 'blur(30px)',
        borderTop: '0.5px solid var(--border-color)',
        paddingBottom: activePanel === 'none' ? 'calc(env(safe-area-inset-bottom) + 8px)' : '8px',
        zIndex: 200,
        position: 'relative'
    }}>
        <VoiceOverlay isRecording={isRecording} cancelVoice={cancelVoice} />

        {replyMessage && (
            <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.03)', borderBottom: '0.5px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                    <div style={{ width: '2px', height: '12px', background: 'var(--primary-color)', marginRight: '8px' }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('chat.replying_to')} {replyMessage.content}</span>
                </div>
                <Icon name="close" size={14} onClick={onCancelReply} />
            </div>
        )}

        <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
            <Icon 
                name={mode === 'text' ? 'voice' : 'keyboard'} 
                size={28} 
                onClick={() => { Haptic.selection(); setMode(mode === 'text' ? 'voice' : 'text'); setActivePanel('none'); }} 
                style={{ marginBottom: '6px' }}
            />

            <div style={{ flex: 1, minHeight: '40px', background: 'var(--bg-body)', borderRadius: '12px', padding: '2px' }}>
                {mode === 'text' ? (
                    <PromptTextInput
                        ref={editorRef}
                        value={input}
                        onChange={setInput}
                        onSubmit={handleSend}
                        placeholder={t('chat.input_placeholder')}
                        maxHeight="120px"
                        style={{ padding: '8px 10px', fontSize: '16px' }}
                    />
                ) : (
                    <div 
                        onTouchStart={handleVoiceStart}
                        onTouchMove={handleVoiceMove}
                        onTouchEnd={handleVoiceEnd}
                        style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: cancelVoice ? 'var(--danger)' : 'var(--text-primary)', userSelect: 'none' }}
                    >
                        {cancelVoice ? '松开取消' : (isRecording ? '松开 发送' : '按住 说话')}
                    </div>
                )}
            </div>

            <Icon 
                name="emoji" 
                size={28} 
                onClick={() => togglePanel('emoji')} 
                style={{ marginBottom: '6px', color: activePanel === 'emoji' ? 'var(--primary-color)' : 'inherit' }} 
            />

            {input.trim() ? (
                <button 
                    onClick={handleSend}
                    style={{ background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '12px', padding: '0 16px', height: '40px', fontWeight: 600, transition: 'all 0.2s' }}
                >
                    {t('chat.send')}
                </button>
            ) : (
                <Icon 
                    name="plus" 
                    size={28} 
                    onClick={() => togglePanel('action')} 
                    style={{ marginBottom: '6px', transform: activePanel === 'action' ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s' }} 
                />
            )}
        </div>

        <ChatEmojiPanel visible={activePanel === 'emoji'} onSelect={handleEmojiSelect} />
        <ChatActionPanel visible={activePanel === 'action'} sessionId={sessionId} onSendImage={() => {}} />
    </div>
  );
};
