import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Tool, ToolResult, ToolExecutionContext, ToolDefinition } from '../agent.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ToolRegistry implements OnModuleInit {
  private readonly logger = new Logger(ToolRegistry.name);
  private tools: Map<string, Tool> = new Map();
  private categories: Map<string, Set<string>> = new Map();

  async onModuleInit() {
    this.registerBuiltInTools();
    this.logger.log(`Tool registry initialized with ${this.tools.size} tools`);
  }

  private registerBuiltInTools(): void {
    this.register({
      name: 'web_search',
      description: 'Search the web for information',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results',
            default: 5,
          },
        },
        required: ['query'],
      },
      execute: async (input: any, context: ToolExecutionContext) => {
        this.logger.log(`Web search: ${input.query}`);
        return {
          success: true,
          output: {
            results: [],
            query: input.query,
          },
        };
      },
    });

    this.register({
      name: 'calculator',
      description: 'Perform mathematical calculations',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'The mathematical expression to evaluate',
          },
        },
        required: ['expression'],
      },
      execute: async (input: any, context: ToolExecutionContext) => {
        try {
          const result = this.safeEval(input.expression);
          return {
            success: true,
            output: { result },
          };
        } catch (error) {
          return {
            success: false,
            error: `Calculation error: ${error.message}`,
          };
        }
      },
    });

    this.register({
      name: 'get_current_time',
      description: 'Get the current date and time',
      parameters: {
        type: 'object',
        properties: {
          timezone: {
            type: 'string',
            description: 'Timezone (e.g., "Asia/Shanghai")',
          },
        },
      },
      execute: async (input: any, context: ToolExecutionContext) => {
        const now = new Date();
        return {
          success: true,
          output: {
            iso: now.toISOString(),
            unix: now.getTime(),
            timezone: input.timezone || 'UTC',
          },
        };
      },
    });

    this.register({
      name: 'get_weather',
      description: 'Get current weather information for a location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City name or coordinates',
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            default: 'celsius',
          },
        },
        required: ['location'],
      },
      execute: async (input: any, context: ToolExecutionContext) => {
        this.logger.log(`Weather lookup: ${input.location}`);
        return {
          success: true,
          output: {
            location: input.location,
            temperature: 22,
            unit: input.unit || 'celsius',
            condition: 'sunny',
            humidity: 45,
            windSpeed: 10,
          },
        };
      },
    });

    this.register({
      name: 'send_message',
      description: 'Send a message to a user or channel',
      parameters: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: 'Recipient user ID or channel ID',
          },
          content: {
            type: 'string',
            description: 'Message content',
          },
          type: {
            type: 'string',
            enum: ['text', 'image', 'file'],
            default: 'text',
          },
        },
        required: ['to', 'content'],
      },
      execute: async (input: any, context: ToolExecutionContext) => {
        this.logger.log(`Send message to ${input.to}: ${input.content}`);
        return {
          success: true,
          output: {
            messageId: uuidv4(),
            to: input.to,
            sentAt: new Date().toISOString(),
          },
        };
      },
    });

    this.register({
      name: 'execute_code',
      description: 'Execute code in a sandboxed environment',
      parameters: {
        type: 'object',
        properties: {
          language: {
            type: 'string',
            enum: ['python', 'javascript', 'typescript'],
            description: 'Programming language',
          },
          code: {
            type: 'string',
            description: 'Code to execute',
          },
          timeout: {
            type: 'number',
            description: 'Execution timeout in seconds',
            default: 30,
          },
        },
        required: ['language', 'code'],
      },
      execute: async (input: any, context: ToolExecutionContext) => {
        this.logger.log(`Execute ${input.language} code`);
        return {
          success: true,
          output: {
            stdout: '',
            stderr: '',
            exitCode: 0,
            executionTime: 0,
          },
        };
      },
    });

    this.register({
      name: 'knowledge_search',
      description: 'Search the knowledge base for relevant information',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results',
            default: 5,
          },
          threshold: {
            type: 'number',
            description: 'Similarity threshold',
            default: 0.7,
          },
        },
        required: ['query'],
      },
      execute: async (input: any, context: ToolExecutionContext) => {
        this.logger.log(`Knowledge search: ${input.query}`);
        return {
          success: true,
          output: {
            results: [],
            query: input.query,
          },
        };
      },
    });

    this.register({
      name: 'create_task',
      description: 'Create a new task',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Task title',
          },
          description: {
            type: 'string',
            description: 'Task description',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            default: 'medium',
          },
          dueDate: {
            type: 'string',
            description: 'Due date in ISO format',
          },
        },
        required: ['title'],
      },
      execute: async (input: any, context: ToolExecutionContext) => {
        this.logger.log(`Create task: ${input.title}`);
        return {
          success: true,
          output: {
            taskId: uuidv4(),
            title: input.title,
            status: 'pending',
            createdAt: new Date().toISOString(),
          },
        };
      },
    });

    this.register({
      name: 'http_request',
      description: 'Make an HTTP request',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'Request URL',
          },
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            default: 'GET',
          },
          headers: {
            type: 'object',
            description: 'Request headers',
          },
          body: {
            type: 'object',
            description: 'Request body',
          },
          timeout: {
            type: 'number',
            description: 'Timeout in milliseconds',
            default: 30000,
          },
        },
        required: ['url'],
      },
      execute: async (input: any, context: ToolExecutionContext) => {
        this.logger.log(`HTTP ${input.method || 'GET'} ${input.url}`);
        try {
          const response = await fetch(input.url, {
            method: input.method || 'GET',
            headers: input.headers,
            body: input.body ? JSON.stringify(input.body) : undefined,
          });
          const data = await response.text();
          return {
            success: response.ok,
            output: {
              status: response.status,
              headers: Object.fromEntries(response.headers.entries()),
              body: data,
            },
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
          };
        }
      },
    });

    this.register({
      name: 'file_operations',
      description: 'Perform file operations (read, write, list, delete)',
      parameters: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['read', 'write', 'list', 'delete'],
            description: 'File operation type',
          },
          path: {
            type: 'string',
            description: 'File or directory path',
          },
          content: {
            type: 'string',
            description: 'Content to write (for write operation)',
          },
        },
        required: ['operation', 'path'],
      },
      execute: async (input: any, context: ToolExecutionContext) => {
        this.logger.log(`File operation: ${input.operation} ${input.path}`);
        return {
          success: true,
          output: {
            operation: input.operation,
            path: input.path,
          },
        };
      },
    });
  }

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
    this.logger.debug(`Registered tool: ${tool.name}`);
  }

  async get(name: string): Promise<Tool | undefined> {
    return this.tools.get(name);
  }

  async getAll(): Promise<Tool[]> {
    return Array.from(this.tools.values());
  }

  async getDefinitions(): Promise<ToolDefinition[]> {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as any,
      },
    }));
  }

  async getByName(names: string[]): Promise<Tool[]> {
    return names
      .map(name => this.tools.get(name))
      .filter((tool): tool is Tool => tool !== undefined);
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): string[] {
    return Array.from(this.tools.keys());
  }

  private safeEval(expression: string): number {
    const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '');
    const result = Function(`"use strict"; return (${sanitized})`)();
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Invalid calculation result');
    }
    return result;
  }
}
