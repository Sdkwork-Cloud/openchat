
import { useState, useCallback } from 'react';
import { useChatStore } from '../../../services/store';
import { aiService } from '../../../services/gemini';
import { ChatSession, Agent } from '../../../types/core';
import { Platform } from '../../../platform';

export const useChatStream = () => {
  const { addMessage, updateMessageContent } = useChatStore();
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (text: string, session: ChatSession, agent: Agent) => {
    if (!text.trim() || !session || !agent) return;

    Platform.device.vibrate(5);

    // 1. Optimistic User Message
    const userMsgId = Date.now().toString();
    await addMessage(session.id, { 
      id: userMsgId, 
      role: 'user', 
      content: text, 
      timestamp: Date.now() 
    });
    
    setIsLoading(true);

    // 2. Placeholder Model Message
    const modelMsgId = (Date.now() + 1).toString();
    await addMessage(session.id, { 
      id: modelMsgId, 
      role: 'model', 
      content: '', 
      timestamp: Date.now(), 
      isStreaming: true 
    });

    // 3. API Stream Logic
    try {
      // Prepare history strictly with role/content for the API
      const historyForApi = session.messages.map(m => ({ role: m.role, content: m.content }));
      
      const stream = aiService.sendMessageStream(historyForApi, text, agent.systemInstruction);
      
      let fullText = '';
      for await (const chunk of stream) {
        fullText += chunk;
        // Real-time update for streaming effect
        updateMessageContent(session.id, modelMsgId, fullText, true);
      }
      
      // Finalize
      updateMessageContent(session.id, modelMsgId, fullText, false);
      Platform.device.vibrate([5, 5]); 

    } catch (e) {
      console.error(e);
      updateMessageContent(session.id, modelMsgId, '⚠️ 网络连接问题，请稍后重试。', false);
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, updateMessageContent]);

  return { sendMessage, isLoading };
};
