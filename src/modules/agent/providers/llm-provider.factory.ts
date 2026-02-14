import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  LLMProvider,
  LLMConfig,
} from '../agent.interface';

export interface ILLMProvider {
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest): AsyncGenerator<ChatStreamChunk>;
}

@Injectable()
export class LLMProviderFactory {
  private readonly logger = new Logger(LLMProviderFactory.name);
  private providers: Map<string, ILLMProvider> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    const openaiBaseUrl = this.configService.get<string>('OPENAI_BASE_URL');
    
    if (openaiApiKey) {
      this.providers.set('openai', new OpenAIProvider({
        provider: 'openai',
        apiKey: openaiApiKey,
        baseUrl: openaiBaseUrl || 'https://api.openai.com/v1',
      }));
    }

    const anthropicApiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (anthropicApiKey) {
      this.providers.set('anthropic', new AnthropicProvider({
        provider: 'anthropic',
        apiKey: anthropicApiKey,
      }));
    }

    const deepseekApiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    if (deepseekApiKey) {
      this.providers.set('deepseek', new DeepSeekProvider({
        provider: 'deepseek',
        apiKey: deepseekApiKey,
        baseUrl: 'https://api.deepseek.com/v1',
      }));
    }

    const zhipuApiKey = this.configService.get<string>('ZHIPU_API_KEY');
    if (zhipuApiKey) {
      this.providers.set('zhipu', new ZhipuProvider({
        provider: 'zhipu',
        apiKey: zhipuApiKey,
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      }));
    }

    const qwenApiKey = this.configService.get<string>('QWEN_API_KEY');
    if (qwenApiKey) {
      this.providers.set('qwen', new QwenProvider({
        provider: 'qwen',
        apiKey: qwenApiKey,
        baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
      }));
    }

    const moonshotApiKey = this.configService.get<string>('MOONSHOT_API_KEY');
    if (moonshotApiKey) {
      this.providers.set('moonshot', new MoonshotProvider({
        provider: 'moonshot',
        apiKey: moonshotApiKey,
        baseUrl: 'https://api.moonshot.cn/v1',
      }));
    }

    const doubaoApiKey = this.configService.get<string>('DOUBAO_API_KEY');
    if (doubaoApiKey) {
      this.providers.set('doubao', new DoubaoProvider({
        provider: 'doubao',
        apiKey: doubaoApiKey,
      }));
    }

    this.logger.log(`Initialized ${this.providers.size} LLM providers`);
  }

  getProvider(providerName: string): ILLMProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      this.logger.warn(`Provider ${providerName} not found, falling back to openai`);
      return this.providers.get('openai') || this.providers.values().next().value;
    }
    return provider;
  }

  registerProvider(name: string, provider: ILLMProvider): void {
    this.providers.set(name, provider);
    this.logger.log(`Registered LLM provider: ${name}`);
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

export class OpenAIProvider implements ILLMProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private apiKey: string;
  private baseUrl: string;

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || 'gpt-4',
        messages: request.messages.map(m => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : m.content,
          name: m.name,
          tool_calls: m.toolCalls,
          tool_call_id: m.toolCallId,
        })),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        top_p: request.topP,
        frequency_penalty: request.frequencyPenalty,
        presence_penalty: request.presencePenalty,
        stop: request.stop,
        tools: request.tools,
        tool_choice: request.toolChoice,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return this.transformResponse(data);
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<ChatStreamChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || 'gpt-4',
        messages: request.messages.map(m => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : m.content,
          name: m.name,
          tool_calls: m.toolCalls,
          tool_call_id: m.toolCallId,
        })),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        top_p: request.topP,
        tools: request.tools,
        tool_choice: request.toolChoice,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;
        
        if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.slice(6));
            yield this.transformStreamChunk(json);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  }

  private transformResponse(data: any): ChatResponse {
    return {
      id: data.id,
      object: 'chat.completion',
      created: data.created,
      model: data.model,
      choices: data.choices.map((choice: any) => ({
        index: choice.index,
        message: {
          id: data.id,
          role: choice.message.role,
          content: choice.message.content || '',
          toolCalls: choice.message.tool_calls?.map((tc: any) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
          timestamp: Date.now(),
        },
        finishReason: choice.finish_reason,
      })),
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }

  private transformStreamChunk(data: any): ChatStreamChunk {
    return {
      id: data.id,
      object: 'chat.completion.chunk',
      created: data.created,
      model: data.model,
      choices: data.choices.map((choice: any) => ({
        index: choice.index,
        delta: {
          role: choice.delta?.role,
          content: choice.delta?.content,
          toolCalls: choice.delta?.tool_calls?.map((tc: any) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function?.name || '',
              arguments: tc.function?.arguments || '',
            },
          })),
        },
        finishReason: choice.finish_reason,
      })),
    };
  }
}

export class AnthropicProvider implements ILLMProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  private apiKey: string;
  private baseUrl: string = 'https://api.anthropic.com/v1';

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey || '';
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const systemMessage = request.messages.find(m => m.role === 'system');
    const otherMessages = request.messages.filter(m => m.role !== 'system');

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model || 'claude-3-opus-20240229',
        max_tokens: request.maxTokens || 4096,
        system: systemMessage?.content,
        messages: otherMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return this.transformResponse(data);
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<ChatStreamChunk> {
    const systemMessage = request.messages.find(m => m.role === 'system');
    const otherMessages = request.messages.filter(m => m.role !== 'system');

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model || 'claude-3-opus-20240229',
        max_tokens: request.maxTokens || 4096,
        system: systemMessage?.content,
        messages: otherMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    const responseId = `anthropic-${Date.now()}`;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.slice(6));
            if (json.type === 'content_block_delta') {
              yield {
                id: responseId,
                object: 'chat.completion.chunk',
                created: Date.now(),
                model: request.model || 'claude-3-opus-20240229',
                choices: [{
                  index: 0,
                  delta: {
                    content: json.delta?.text || '',
                  },
                  finishReason: null,
                }],
              };
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  }

  private transformResponse(data: any): ChatResponse {
    return {
      id: data.id,
      object: 'chat.completion',
      created: Date.now(),
      model: data.model,
      choices: [{
        index: 0,
        message: {
          id: data.id,
          role: 'assistant',
          content: data.content?.[0]?.text || '',
          timestamp: Date.now(),
        },
        finishReason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason,
      }],
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };
  }
}

export class DeepSeekProvider extends OpenAIProvider {
  constructor(config: LLMConfig) {
    super(config);
  }
}

export class ZhipuProvider extends OpenAIProvider {
  constructor(config: LLMConfig) {
    super(config);
  }
}

export class QwenProvider extends OpenAIProvider {
  constructor(config: LLMConfig) {
    super(config);
  }
}

export class MoonshotProvider extends OpenAIProvider {
  constructor(config: LLMConfig) {
    super(config);
  }
}

export class DoubaoProvider extends OpenAIProvider {
  constructor(config: LLMConfig) {
    super(config);
  }
}
