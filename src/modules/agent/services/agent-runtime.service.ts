import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  Agent,
  AgentSession,
  AgentMessage,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  Tool,
  Skill,
  ToolCall,
  AgentEventType,
  AgentEvent,
  ExecutionState,
  ExecutionContext,
  ExecutionStep,
} from '../agent.interface';
import { AgentEventService } from '../agent-event.service';
import { LLMProviderFactory } from '../providers/llm-provider.factory';
import { ToolRegistry } from '../tools/tool-registry.service';
import { SkillRegistry } from '../skills/skill-registry.service';
import { MemoryManagerService } from '../memory/memory-manager.service';

export interface AgentRuntime {
  id: string;
  agent: Agent;
  state: 'idle' | 'initializing' | 'ready' | 'executing' | 'error';
  tools: Map<string, Tool>;
  skills: Map<string, Skill>;
  memoryManager: MemoryManagerService;
}

@Injectable()
export class AgentRuntimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentRuntimeService.name);
  private runtimes: Map<string, AgentRuntime> = new Map();
  private runtimeLocks: Map<string, Promise<void>> = new Map();
  private runtimeLastUsed: Map<string, number> = new Map();
  private readonly RUNTIME_TTL = 30 * 60 * 1000; // 30分钟
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    private configService: ConfigService,
    private eventService: AgentEventService,
    private llmProviderFactory: LLMProviderFactory,
    private toolRegistry: ToolRegistry,
    private skillRegistry: SkillRegistry,
    @Inject(forwardRef(() => MemoryManagerService))
    private memoryManager: MemoryManagerService,
  ) {}

  async onModuleInit() {
    this.logger.log('Agent Runtime Service initialized');
    // 启动清理定时器
    this.startCleanupInterval();
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    // 清理所有runtime
    for (const runtimeId of this.runtimes.keys()) {
      this.destroyRuntime(runtimeId);
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleRuntimes();
    }, 60000); // 每分钟检查一次
  }

  private cleanupStaleRuntimes(): void {
    const now = Date.now();
    for (const [id, lastUsed] of this.runtimeLastUsed.entries()) {
      if (now - lastUsed > this.RUNTIME_TTL) {
        // 检查是否正在执行
        if (!this.runtimeLocks.has(id)) {
          this.logger.log(`Cleaning up stale runtime: ${id}`);
          this.destroyRuntime(id);
          this.runtimeLastUsed.delete(id);
        }
      }
    }
  }

  async initializeRuntime(agent: Agent): Promise<AgentRuntime> {
    const runtimeId = uuidv4();
    
    const runtime: AgentRuntime = {
      id: runtimeId,
      agent,
      state: 'initializing',
      tools: new Map(),
      skills: new Map(),
      memoryManager: this.memoryManager,
    };

    this.runtimes.set(runtimeId, runtime);

    try {
      await this.loadTools(runtime, agent.config.tools || []);
      await this.loadSkills(runtime, agent.config.skills || []);
      
      runtime.state = 'ready';
      
      this.emitEvent(runtime, AgentEventType.AGENT_INITIALIZED, { agentId: agent.id });
      
      this.logger.log(`Agent runtime initialized: ${agent.id}`);
      return runtime;
    } catch (error) {
      runtime.state = 'error';
      this.logger.error(`Failed to initialize runtime for agent ${agent.id}:`, error);
      throw error;
    }
  }

  async chat(
    runtimeId: string,
    request: ChatRequest,
    sessionId?: string,
    userId?: string,
  ): Promise<ChatResponse> {
    // 获取或创建锁，确保同一时间只有一个请求在执行
    const lockWaitStart = Date.now();
    const MAX_LOCK_WAIT_TIME = 60000; // 最大等待60秒

    let lock = this.runtimeLocks.get(runtimeId);
    while (lock) {
      // 检查是否超过最大等待时间
      if (Date.now() - lockWaitStart > MAX_LOCK_WAIT_TIME) {
        throw new Error(`Timeout waiting for runtime lock: ${runtimeId}`);
      }
      await lock;
      lock = this.runtimeLocks.get(runtimeId);
    }

    let resolveLock: () => void;
    const newLock = new Promise<void>(resolve => { resolveLock = resolve; });
    this.runtimeLocks.set(runtimeId, newLock);

    const runtime = this.runtimes.get(runtimeId);
    if (!runtime) {
      this.runtimeLocks.delete(runtimeId);
      resolveLock!();
      throw new Error(`Runtime not found: ${runtimeId}`);
    }

    if (runtime.state !== 'ready') {
      this.runtimeLocks.delete(runtimeId);
      resolveLock!();
      throw new Error(`Runtime not ready: ${runtime.state}`);
    }

    runtime.state = 'executing';
    this.runtimeLastUsed.set(runtimeId, Date.now());
    const executionId = uuidv4();
    const startTime = Date.now();

    const executionContext: ExecutionContext = {
      id: executionId,
      agentId: runtime.agent.id,
      sessionId,
      userId,
      request,
      state: ExecutionState.RUNNING,
      startTime,
      steps: [],
    };

    try {
      this.emitEvent(runtime, AgentEventType.CHAT_STARTED, {
        sessionId,
        userId,
        executionId
      });

      const messages = await this.prepareMessages(runtime, request, executionContext);

      const llmProvider = this.llmProviderFactory.getProvider(
        runtime.agent.config.llm?.provider || 'openai'
      );

      const response = await llmProvider.chat({
        model: runtime.agent.config.model || request.model,
        messages,
        temperature: runtime.agent.config.temperature ?? request.temperature,
        maxTokens: runtime.agent.config.maxTokens ?? request.maxTokens,
        tools: this.getToolDefinitions(runtime),
        toolChoice: request.toolChoice,
      });

      let finalResponse = response;
      let iterations = 0;
      const maxIterations = 10;

      while (iterations < maxIterations) {
        const message = response.choices[0]?.message;

        if (message?.toolCalls && message.toolCalls.length > 0) {
          messages.push(message);

          for (const toolCall of message.toolCalls) {
            const toolResult = await this.executeTool(
              runtime,
              toolCall,
              executionContext,
              sessionId,
              userId
            );

            messages.push({
              id: uuidv4(),
              role: 'tool',
              content: JSON.stringify(toolResult.output),
              toolCallId: toolCall.id,
              timestamp: Date.now(),
            });
          }

          finalResponse = await llmProvider.chat({
            model: runtime.agent.config.model,
            messages,
            temperature: runtime.agent.config.temperature,
            tools: this.getToolDefinitions(runtime),
          });

          iterations++;
        } else {
          break;
        }
      }

      executionContext.state = ExecutionState.COMPLETED;
      runtime.state = 'ready';

      this.emitEvent(runtime, AgentEventType.CHAT_COMPLETED, {
        sessionId,
        userId,
        executionId,
        response: finalResponse,
      });

      return finalResponse;
    } catch (error) {
      executionContext.state = ExecutionState.FAILED;
      runtime.state = 'ready';

      this.emitEvent(runtime, AgentEventType.CHAT_ERROR, {
        sessionId,
        userId,
        executionId,
        error: error.message,
      });

      throw error;
    } finally {
      // 释放锁
      this.runtimeLocks.delete(runtimeId);
      resolveLock!();
    }
  }

  async *chatStream(
    runtimeId: string,
    request: ChatRequest,
    sessionId?: string,
    userId?: string,
  ): AsyncGenerator<ChatStreamChunk> {
    // 获取或创建锁，确保同一时间只有一个请求在执行
    let lock = this.runtimeLocks.get(runtimeId);
    while (lock) {
      await lock;
      lock = this.runtimeLocks.get(runtimeId);
    }

    let resolveLock: () => void;
    const newLock = new Promise<void>(resolve => { resolveLock = resolve; });
    this.runtimeLocks.set(runtimeId, newLock);

    const runtime = this.runtimes.get(runtimeId);
    if (!runtime) {
      this.runtimeLocks.delete(runtimeId);
      resolveLock!();
      throw new Error(`Runtime not found: ${runtimeId}`);
    }

    if (runtime.state !== 'ready') {
      this.runtimeLocks.delete(runtimeId);
      resolveLock!();
      throw new Error(`Runtime not ready: ${runtime.state}`);
    }

    runtime.state = 'executing';
    this.runtimeLastUsed.set(runtimeId, Date.now());
    const executionId = uuidv4();

    let stream: AsyncGenerator<ChatStreamChunk> | undefined;
    let continueStream: AsyncGenerator<ChatStreamChunk> | undefined;

    try {
      this.emitEvent(runtime, AgentEventType.CHAT_STARTED, {
        sessionId,
        userId,
        executionId
      });

      const messages = await this.prepareMessages(runtime, request);

      const llmProvider = this.llmProviderFactory.getProvider(
        runtime.agent.config.llm?.provider || 'openai'
      );

      stream = llmProvider.chatStream({
        model: runtime.agent.config.model || request.model,
        messages,
        temperature: runtime.agent.config.temperature ?? request.temperature,
        maxTokens: runtime.agent.config.maxTokens ?? request.maxTokens,
        tools: this.getToolDefinitions(runtime),
      });

      let fullContent = '';
      const toolCalls: ToolCall[] = [];

      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;

          if (delta?.content) {
            fullContent += delta.content;

            this.emitEvent(runtime, AgentEventType.CHAT_STREAM, {
              sessionId,
              userId,
              executionId,
              content: delta.content,
              isComplete: false,
            });
          }

          if (delta?.toolCalls) {
            for (const tc of delta.toolCalls) {
              const existingTc = toolCalls.find(t => t.id === tc.id);
              if (existingTc) {
                existingTc.function.arguments += tc.function.arguments;
              } else {
                toolCalls.push(tc);
              }
            }
          }

          yield chunk;
        }
      } finally {
        // 确保第一个stream被正确关闭
        if (stream && typeof (stream as any).return === 'function') {
          await (stream as any).return();
        }
      }

      if (toolCalls.length > 0) {
        messages.push({
          id: uuidv4(),
          role: 'assistant',
          content: fullContent,
          toolCalls,
          timestamp: Date.now(),
        });

        for (const toolCall of toolCalls) {
          const toolResult = await this.executeTool(
            runtime,
            toolCall,
            { id: executionId, agentId: runtime.agent.id, request, state: ExecutionState.RUNNING, startTime: Date.now(), steps: [] },
            sessionId,
            userId
          );

          messages.push({
            id: uuidv4(),
            role: 'tool',
            content: JSON.stringify(toolResult.output),
            toolCallId: toolCall.id,
            timestamp: Date.now(),
          });
        }

        continueStream = llmProvider.chatStream({
          model: runtime.agent.config.model,
          messages,
          temperature: runtime.agent.config.temperature,
        });

        try {
          for await (const chunk of continueStream) {
            const delta = chunk.choices[0]?.delta;

            if (delta?.content) {
              this.emitEvent(runtime, AgentEventType.CHAT_STREAM, {
                sessionId,
                userId,
                executionId,
                content: delta.content,
                isComplete: false,
              });
            }

            yield chunk;
          }
        } finally {
          // 确保continueStream被正确关闭
          if (continueStream && typeof (continueStream as any).return === 'function') {
            await (continueStream as any).return();
          }
        }
      }

      runtime.state = 'ready';

      this.emitEvent(runtime, AgentEventType.CHAT_COMPLETED, {
        sessionId,
        userId,
        executionId,
      });
    } catch (error) {
      runtime.state = 'ready';

      this.emitEvent(runtime, AgentEventType.CHAT_ERROR, {
        sessionId,
        userId,
        executionId,
        error: error.message,
      });

      throw error;
    } finally {
      // 释放锁
      this.runtimeLocks.delete(runtimeId);
      resolveLock!();
    }
  }

  async executeSkill(
    runtimeId: string,
    skillId: string,
    input: unknown,
    sessionId?: string,
    userId?: string,
  ): Promise<any> {
    const runtime = this.runtimes.get(runtimeId);
    if (!runtime) {
      throw new Error(`Runtime not found: ${runtimeId}`);
    }

    const skill = runtime.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    const executionId = uuidv4();
    const startTime = Date.now();

    this.emitEvent(runtime, AgentEventType.SKILL_INVOKING, {
      skillId,
      input,
      sessionId,
      userId,
      executionId,
    });

    try {
      const result = await skill.execute(input, {
        executionId,
        agentId: runtime.agent.id,
        sessionId,
        userId,
        input,
        logger: {
          info: (msg, ...args) => this.logger.log(`[Skill:${skillId}] ${msg}`, ...args),
          warn: (msg, ...args) => this.logger.warn(`[Skill:${skillId}] ${msg}`, ...args),
          error: (msg, ...args) => this.logger.error(`[Skill:${skillId}] ${msg}`, ...args),
          debug: (msg, ...args) => this.logger.debug(`[Skill:${skillId}] ${msg}`, ...args),
        },
        startedAt: new Date(),
      });

      this.emitEvent(runtime, AgentEventType.SKILL_COMPLETED, {
        skillId,
        result,
        sessionId,
        userId,
        executionId,
        duration: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      this.emitEvent(runtime, AgentEventType.SKILL_FAILED, {
        skillId,
        error: error.message,
        sessionId,
        userId,
        executionId,
      });

      throw error;
    }
  }

  getRuntime(runtimeId: string): AgentRuntime | undefined {
    return this.runtimes.get(runtimeId);
  }

  destroyRuntime(runtimeId: string): void {
    const runtime = this.runtimes.get(runtimeId);
    if (runtime) {
      this.emitEvent(runtime, AgentEventType.AGENT_DESTROYED, { agentId: runtime.agent.id });
      this.runtimes.delete(runtimeId);
      this.logger.log(`Runtime destroyed: ${runtimeId}`);
    }
  }

  private async loadTools(runtime: AgentRuntime, toolIds: string[]): Promise<void> {
    for (const toolId of toolIds) {
      const tool = await this.toolRegistry.get(toolId);
      if (tool) {
        runtime.tools.set(toolId, tool);
      }
    }
  }

  private async loadSkills(runtime: AgentRuntime, skillIds: string[]): Promise<void> {
    for (const skillId of skillIds) {
      const skill = await this.skillRegistry.get(skillId);
      if (skill) {
        runtime.skills.set(skillId, skill);
      }
    }
  }

  private async prepareMessages(
    runtime: AgentRuntime,
    request: ChatRequest,
    executionContext?: ExecutionContext,
  ): Promise<ChatMessage[]> {
    const messages: ChatMessage[] = [];

    if (runtime.agent.config.systemPrompt) {
      messages.push({
        id: uuidv4(),
        role: 'system',
        content: runtime.agent.config.systemPrompt,
        timestamp: Date.now(),
      });
    }

    const memoryMessages = await runtime.memoryManager.getRecentMemories(
      runtime.agent.id,
      runtime.agent.config.memory?.limit || 10
    );
    
    for (const mem of memoryMessages) {
      messages.push({
        id: mem.id,
        role: (mem.metadata?.role as any) || 'user',
        content: mem.content,
        timestamp: mem.timestamp.getTime(),
      });
    }

    messages.push(...request.messages);

    return messages;
  }

  private async executeTool(
    runtime: AgentRuntime,
    toolCall: ToolCall,
    executionContext: ExecutionContext,
    sessionId?: string,
    userId?: string,
  ): Promise<{ output: unknown }> {
    const tool = runtime.tools.get(toolCall.function.name);
    if (!tool) {
      throw new Error(`Tool not found: ${toolCall.function.name}`);
    }

    const stepId = uuidv4();
    const startTime = Date.now();

    const step: ExecutionStep = {
      id: stepId,
      type: 'tool',
      name: toolCall.function.name,
      input: JSON.parse(toolCall.function.arguments),
      state: ExecutionState.RUNNING,
      startTime,
    };
    executionContext.steps.push(step);

    this.emitEvent(runtime, AgentEventType.TOOL_INVOKING, {
      toolName: toolCall.function.name,
      input: step.input,
      sessionId,
      userId,
      executionId: executionContext.id,
    });

    try {
      const result = await tool.execute(step.input, {
        agentId: runtime.agent.id,
        sessionId,
        userId,
        executionId: executionContext.id,
      });

      step.output = result.output;
      step.state = ExecutionState.COMPLETED;
      step.endTime = Date.now();

      this.emitEvent(runtime, AgentEventType.TOOL_COMPLETED, {
        toolName: toolCall.function.name,
        output: result.output,
        sessionId,
        userId,
        executionId: executionContext.id,
        duration: step.endTime - startTime,
      });

      return { output: result.output };
    } catch (error) {
      step.state = ExecutionState.FAILED;
      step.endTime = Date.now();
      step.error = error;

      this.emitEvent(runtime, AgentEventType.TOOL_FAILED, {
        toolName: toolCall.function.name,
        error: error.message,
        sessionId,
        userId,
        executionId: executionContext.id,
      });

      throw error;
    }
  }

  private getToolDefinitions(runtime: AgentRuntime): any[] {
    return Array.from(runtime.tools.values()).map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  private emitEvent(
    runtime: AgentRuntime,
    type: AgentEventType,
    payload: any,
  ): void {
    this.eventService.emit({
      type,
      timestamp: Date.now(),
      payload,
      metadata: {
        agentId: runtime.agent.id,
      },
    });
  }
}
