
export interface ChatMessage {
  role: 'user' | 'model';
  content: string; // Legacy text content
  parts?: Array<{
    text?: string;
    inlineData?: {
      mimeType: string;
      data: string;
    };
  }>;
}

export interface GeneratorConfig {
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
}

export interface ILLMProvider {
  name: string;
  generateStream(
    history: ChatMessage[], 
    prompt: string, 
    images?: { mimeType: string; data: string }[],
    config?: GeneratorConfig
  ): AsyncGenerator<string, void, unknown>;
}
