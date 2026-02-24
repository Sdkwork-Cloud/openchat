
import { GoogleGenAI } from "@google/genai";
import { ILLMProvider, ChatMessage, GeneratorConfig } from '../types';

export class GeminiProvider implements ILLMProvider {
  name = 'Gemini';
  private client: GoogleGenAI;
  private modelName = 'gemini-3-flash-preview'; // Standard fast model

  // Configuration for Context Window
  private readonly MAX_HISTORY_MESSAGES = 20; // Keep last 20 messages

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  /**
   * Smart Context Pruning Algorithm
   */
  private pruneHistory(history: ChatMessage[]): any[] {
    // Map internal ChatMessage to Gemini API format
    const mappedHistory = history.map(msg => {
      // If the message has explicit parts (multimodal), use them
      if (msg.parts && msg.parts.length > 0) {
        return {
          role: msg.role === 'user' ? 'user' : 'model',
          parts: msg.parts
        };
      }
      
      // Fallback logic: Detect if content is a data URL (image) stored in content string
      // This supports the simplified storage model where we might store base64 in content
      if (msg.role === 'user' && msg.content.startsWith('data:image/')) {
          const match = msg.content.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
          if (match) {
              return {
                  role: 'user',
                  parts: [{
                      inlineData: { mimeType: match[1], data: match[2] }
                  }]
              };
          }
      }

      // Default text
      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      };
    });

    if (mappedHistory.length <= this.MAX_HISTORY_MESSAGES) {
      return mappedHistory;
    }

    // Sliding Window
    return mappedHistory.slice(-this.MAX_HISTORY_MESSAGES);
  }

  async *generateStream(
    history: ChatMessage[], 
    prompt: string, 
    images?: { mimeType: string; data: string }[],
    config?: GeneratorConfig
  ): AsyncGenerator<string, void, unknown> {
    try {
      const optimizedHistory = this.pruneHistory(history);

      const chat = this.client.chats.create({
        model: this.modelName,
        history: optimizedHistory,
        config: {
          temperature: config?.temperature ?? 0.7,
          maxOutputTokens: config?.maxOutputTokens ?? 4000,
          systemInstruction: config?.systemInstruction,
        }
      });

      // Construct current message parts
      const currentParts: any[] = [];
      
      // Add images if present
      if (images && images.length > 0) {
          images.forEach(img => {
              currentParts.push({
                  inlineData: {
                      mimeType: img.mimeType,
                      data: img.data
                  }
              });
          });
      }
      
      // Add text prompt
      if (prompt) {
          currentParts.push({ text: prompt });
      }

      // If purely image with no prompt, add a default description request
      if (currentParts.length === 0) {
           currentParts.push({ text: "Describe this." });
      }

      const result = await chat.sendMessageStream({ 
          message: currentParts 
      });

      for await (const chunk of result) {
        const text = chunk.text;
        if (text) {
          yield text;
        }
      }
    } catch (error: any) {
      console.error("[GeminiProvider] Error:", error);
      
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('API key')) {
          yield `\n\n[System Alert]: API Key is invalid.`;
      } else if (errorMessage.includes('429')) {
          yield `\n\n[System Alert]: Rate limit exceeded.`;
      } else {
          yield `\n\n[System Alert]: Connection failed (${errorMessage}).`;
      }
    }
  }
}
