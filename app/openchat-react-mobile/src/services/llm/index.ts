
import { ILLMProvider, ChatMessage, GeneratorConfig } from './types';
import { GeminiProvider } from './providers/GeminiProvider';
import { MockProvider } from './providers/MockProvider';

class LLMService {
  private provider: ILLMProvider;

  constructor() {
    const apiKey = process.env.API_KEY;
    
    // Logic: Use Gemini if Key exists and is not the placeholder, otherwise Mock
    if (apiKey && apiKey !== 'PLACEHOLDER_API_KEY') {
      console.log('[LLMService] Using Gemini Provider');
      this.provider = new GeminiProvider(apiKey);
    } else {
      console.warn('[LLMService] No valid API Key found. Using Mock Provider.');
      this.provider = new MockProvider();
    }
  }

  /**
   * Main entry point for streaming chat
   */
  async *chatStream(
    history: ChatMessage[], 
    message: string, 
    images?: { mimeType: string; data: string }[],
    systemInstruction?: string
  ) {
    const config: GeneratorConfig = {
      systemInstruction: systemInstruction,
      temperature: 0.7
    };

    yield* this.provider.generateStream(history, message, images, config);
  }
}

export const llmService = new LLMService();
