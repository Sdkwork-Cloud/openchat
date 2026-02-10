/**
 * OpenAI 对话服务
 *
 * 提供 OpenAI GPT API 调用
 * 文档：https://platform.openai.com/docs/api-reference/chat
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChatRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class OpenAIChatService {
  private readonly logger = new Logger(OpenAIChatService.name);

  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly model: string;
  private readonly defaultSystemPrompt: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    this.apiUrl = this.configService.get<string>('OPENAI_API_URL') || 'https://api.openai.com/v1/chat/completions';
    this.model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-3.5-turbo';
    this.defaultSystemPrompt = this.configService.get<string>('OPENAI_SYSTEM_PROMPT') ||
      '你是一个 helpful 的 AI 助手，名字叫小智。请用简洁友好的中文回答问题。';
  }

  /**
   * 对话
   *
   * @param messages - 对话历史
   * @param options - 对话选项
   * @returns AI 回复
   */
  async chat(
    messages: Array<{ role: string; content: string }>,
    options: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // 构建请求消息
      const requestMessages: OpenAIMessage[] = [
        {
          role: 'system',
          content: options.systemPrompt || this.defaultSystemPrompt,
        },
        ...messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      // 构建请求体
      const requestBody: OpenAIChatRequest = {
        model: this.model,
        messages: requestMessages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 500,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        stream: false,
      };

      // 发送请求
      const response = await firstValueFrom(
        this.httpService.post<OpenAIChatResponse>(this.apiUrl, requestBody, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        })
      );

      const data = response.data;

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenAI');
      }

      const reply = data.choices[0].message.content;
      this.logger.debug(`OpenAI response: "${reply.substring(0, 100)}..."`);
      this.logger.debug(`Token usage: ${data.usage.total_tokens} (${data.usage.prompt_tokens} + ${data.usage.completion_tokens})`);

      return reply;

    } catch (error) {
      this.logger.error('OpenAI chat request failed:', error);
      
      // 处理特定错误
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          throw new Error('OpenAI API key invalid');
        } else if (status === 429) {
          throw new Error('OpenAI rate limit exceeded');
        } else if (status === 500) {
          throw new Error('OpenAI server error');
        }
        
        throw new Error(`OpenAI API error: ${data?.error?.message || 'Unknown error'}`);
      }
      
      throw error;
    }
  }

  /**
   * 流式对话（用于实时响应）
   *
   * @param messages - 对话历史
   * @param onChunk - 收到数据块时的回调
   * @param options - 对话选项
   */
  async chatStream(
    messages: Array<{ role: string; content: string }>,
    onChunk: (chunk: string) => void,
    options: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<void> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // 构建请求消息
      const requestMessages: OpenAIMessage[] = [
        {
          role: 'system',
          content: options.systemPrompt || this.defaultSystemPrompt,
        },
        ...messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      // 构建请求体
      const requestBody: OpenAIChatRequest = {
        model: this.model,
        messages: requestMessages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 500,
        stream: true,
      };

      // 发送流式请求
      const response = await firstValueFrom(
        this.httpService.post(this.apiUrl, requestBody, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
          timeout: 60000,
        })
      );

      // 处理流式响应
      const stream = response.data;
      
      return new Promise((resolve, reject) => {
        let buffer = '';

        stream.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          
          // 处理 SSE 格式的数据
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              
              if (data === '[DONE]') {
                resolve();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  onChunk(content);
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        });

        stream.on('end', () => {
          resolve();
        });

        stream.on('error', (error: Error) => {
          reject(error);
        });
      });

    } catch (error) {
      this.logger.error('OpenAI stream chat request failed:', error);
      throw error;
    }
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * 获取模型信息
   */
  getModelInfo(): { model: string; apiUrl: string } {
    return {
      model: this.model,
      apiUrl: this.apiUrl,
    };
  }
}
