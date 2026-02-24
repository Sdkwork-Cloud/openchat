
import { useState, useCallback, useRef, useEffect } from 'react';
import { useChatStore } from '../../../services/store';
import { llmService } from '../../../services/llm'; 
import { ChatSession, Agent } from '../../../types/core';
import { Platform } from '../../../platform';
import { Toast } from '../../../components/Toast';
import { Sound } from '../../../utils/sound'; // Audio
import { AppEvents, EVENTS } from '../../../core/events';

export const useChatStream = () => {
  const { addMessage, updateMessage } = useChatStore();
  const [isLoading, setIsLoading] = useState(false);
  
  // Logic locks
  const processingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // RAF (Render Loop) State
  const rafIdRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef<{ sessionId: string, msgId: string, content: string } | null>(null);

  // Haptic Throttling for "Thinking" feel
  const lastTickRef = useRef<number>(0);

  // RAF Worker Function
  const processUpdates = useCallback(() => {
      if (pendingUpdateRef.current) {
          const { sessionId, msgId, content } = pendingUpdateRef.current;
          
          // Apply update to store (which triggers React reconciliation)
          updateMessage(sessionId, msgId, { content, isStreaming: true });
          
          // Haptic Tick (Throttled to every 100ms to allow "texture" without overwhelming)
          const now = Date.now();
          if (now - lastTickRef.current > 100) {
              // Sound.tick(); // Optional: Audio tick
              // Platform.device.vibrate(2); // Very light impact
              lastTickRef.current = now;
          }

          // Clear pending state after applying
          pendingUpdateRef.current = null;
      }
      // Schedule next frame
      rafIdRef.current = requestAnimationFrame(processUpdates);
  }, [updateMessage]);

  // Lifecycle: Start/Stop RAF loop
  useEffect(() => {
      if (isLoading) {
          if (!rafIdRef.current) {
              rafIdRef.current = requestAnimationFrame(processUpdates);
          }
      } else {
          if (rafIdRef.current) {
              cancelAnimationFrame(rafIdRef.current);
              rafIdRef.current = null;
          }
      }
      return () => {
          // Cleanup on unmount
          if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
          if (abortControllerRef.current) abortControllerRef.current.abort();
      };
  }, [isLoading, processUpdates]);

  const sendMessage = useCallback(async (
      text: string, 
      session: ChatSession, 
      agent: Agent,
      replyTo?: { id: string, name: string, content: string },
      images?: { mimeType: string; data: string }[]
  ) => {
    if ((!text.trim() && (!images || images.length === 0)) || !session || !agent || processingRef.current) return;

    processingRef.current = true;
    setIsLoading(true);
    abortControllerRef.current = new AbortController();
    Platform.device.vibrate(5);
    Sound.pop(); // Sound effect for user send
    
    // Trigger Dynamic Island
    AppEvents.emit(EVENTS.STATUS_CHANGE, { status: 'loading', message: 'AI Thinking...' });

    const userMsgId = Date.now().toString();
    // Pre-calculate model ID so we can reference it in catch/finally
    const modelMsgId = (Date.now() + 1).toString(); 

    try {
        let userContent = text;
        
        // Handle image-only send
        if (images && images.length > 0 && !text) {
            userContent = `data:${images[0].mimeType};base64,${images[0].data}`;
        }

        // 1. Optimistic UI: Add User Message
        await addMessage(session.id, { 
          id: userMsgId, 
          role: 'user', 
          content: userContent, 
          createTime: Date.now(), 
          status: 'sending', 
          replyTo: replyTo 
        });
        
        // Simulate "Sent" status after network delay
        setTimeout(() => {
            updateMessage(session.id, userMsgId, { status: 'sent' });
        }, 600);
        
        // 2. Add Bot Placeholder
        await addMessage(session.id, { 
          id: modelMsgId, 
          role: 'model', 
          content: 'Thinking...', 
          createTime: Date.now(), 
          isStreaming: true,
          status: 'sending' 
        });

        // 3. Prepare Context
        const history = session.messages
            .filter(m => m.id !== userMsgId && m.id !== modelMsgId && m.role !== 'system') 
            .map(m => ({ role: m.role as 'user' | 'model', content: m.content }));

        let promptToSend = text;
        if (replyTo) {
            promptToSend = `[In reply to "${replyTo.content}"]: ${text}`;
        }
        
        if (images && images.length > 0 && !promptToSend.trim()) {
            promptToSend = "Describe this image.";
        }

        // 4. Start Streaming
        // Note: Actual LLM service might not support abort signal yet, but we structure for it
        const stream = llmService.chatStream(history, promptToSend, images, agent.systemInstruction);
        
        let fullText = '';
        let isFirstChunk = true;

        for await (const chunk of stream) {
            // Check abort
            if (abortControllerRef.current?.signal.aborted) break;

            if (isFirstChunk) {
                fullText = ''; // Clear "Thinking..."
                isFirstChunk = false;
                updateMessage(session.id, modelMsgId, { status: 'sent' });
                Platform.device.vibrate(10); // First token impact
            }
            fullText += chunk;
            
            // CRITICAL: Update the shared buffer
            pendingUpdateRef.current = {
                sessionId: session.id,
                msgId: modelMsgId,
                content: fullText
            };
        }
        
        // 5. Finalize
        if (!abortControllerRef.current?.signal.aborted) {
            updateMessage(session.id, modelMsgId, { content: fullText, isStreaming: false, status: 'sent' });
            Sound.pop(); // Sound effect for completion
            // Reset Island
            AppEvents.emit(EVENTS.STATUS_CHANGE, { status: 'idle' });
        }

    } catch (e) {
        console.error("[ChatStream] Error:", e);
        Toast.error('发送失败，请重试');
        updateMessage(session.id, modelMsgId, { isStreaming: false, status: 'error' });
        AppEvents.emit(EVENTS.STATUS_CHANGE, { status: 'error', message: 'Failed' });
    } finally {
        setIsLoading(false);
        processingRef.current = false;
        pendingUpdateRef.current = null;
        abortControllerRef.current = null;
    }
  }, [addMessage, updateMessage]);

  return { sendMessage, isLoading };
};
