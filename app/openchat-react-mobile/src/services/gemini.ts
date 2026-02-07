
import { GoogleGenAI } from "@google/genai";

const CONFIG = {
  DEFAULT_MODEL: 'gemini-3-flash-preview',
  MAX_OUTPUT_TOKENS: 4000,
  MAX_HISTORY_CHARS: 30000, 
  TEMPERATURE: 0.7,
};

class GeminiService {
  private client: GoogleGenAI;

  constructor() {
    const apiKey = process.env.API_KEY || '';
    this.client = new GoogleGenAI({ apiKey });
  }

  private prepareContext(history: { role: 'user' | 'model'; content: string }[]): { role: 'user' | 'model'; parts: { text: string }[] }[] {
    const optimizedHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    let currentLength = 0;

    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      const msgLength = msg.content.length;

      if (currentLength + msgLength > CONFIG.MAX_HISTORY_CHARS) {
        break;
      }

      optimizedHistory.unshift({
        role: msg.role,
        parts: [{ text: msg.content }]
      });
      currentLength += msgLength;
    }

    return optimizedHistory;
  }

  /**
   * Generates a context-aware system instruction.
   * Injects current Date, Time, and Weekday.
   */
  private getEnhancedSystemInstruction(baseInstruction: string): string {
      const now = new Date();
      const dateStr = now.toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      
      const contextPrompt = `\n[System Context]\nCurrent Date: ${dateStr}\nCurrent Time: ${timeStr}\nEnvironment: Mobile Web App\n`;
      
      return baseInstruction + contextPrompt;
  }

  /**
   * Enhanced sendMessageStream that accepts specific System Instructions
   */
  async *sendMessageStream(
    history: { role: 'user' | 'model'; content: string }[], 
    newMessage: string,
    systemInstruction: string // <--- Dynamic Persona Injection
  ) {
    try {
      const managedHistory = this.prepareContext(history);
      const enhancedInstruction = this.getEnhancedSystemInstruction(systemInstruction);

      const chat = this.client.chats.create({
        model: CONFIG.DEFAULT_MODEL,
        history: managedHistory,
        config: {
          temperature: CONFIG.TEMPERATURE,
          maxOutputTokens: CONFIG.MAX_OUTPUT_TOKENS,
          systemInstruction: enhancedInstruction, // Inject the Agent's "Soul" + Time
        }
      });

      const result = await chat.sendMessageStream({ message: newMessage });

      for await (const chunk of result) {
        const text = chunk.text;
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }
}

export const aiService = new GeminiService();
