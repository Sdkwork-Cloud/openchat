export enum AgentErrorCode {
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  AGENT_ALREADY_EXISTS = 'AGENT_ALREADY_EXISTS',
  AGENT_DISABLED = 'AGENT_DISABLED',
  AGENT_IN_MAINTENANCE = 'AGENT_IN_MAINTENANCE',
  
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_LIMIT_EXCEEDED = 'SESSION_LIMIT_EXCEEDED',
  
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
  INVALID_MESSAGE_FORMAT = 'INVALID_MESSAGE_FORMAT',
  
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  TOOL_TIMEOUT = 'TOOL_TIMEOUT',
  
  SKILL_NOT_FOUND = 'SKILL_NOT_FOUND',
  SKILL_EXECUTION_FAILED = 'SKILL_EXECUTION_FAILED',
  SKILL_TIMEOUT = 'SKILL_TIMEOUT',
  
  MEMORY_STORE_FAILED = 'MEMORY_STORE_FAILED',
  MEMORY_RETRIEVAL_FAILED = 'MEMORY_RETRIEVAL_FAILED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  
  LLM_PROVIDER_NOT_FOUND = 'LLM_PROVIDER_NOT_FOUND',
  LLM_API_ERROR = 'LLM_API_ERROR',
  LLM_RATE_LIMITED = 'LLM_RATE_LIMITED',
  LLM_CONTEXT_TOO_LONG = 'LLM_CONTEXT_TOO_LONG',
  
  RUNTIME_NOT_FOUND = 'RUNTIME_NOT_FOUND',
  RUNTIME_NOT_READY = 'RUNTIME_NOT_READY',
  RUNTIME_INITIALIZATION_FAILED = 'RUNTIME_INITIALIZATION_FAILED',
  
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class AgentError extends Error {
  public readonly code: AgentErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: AgentErrorCode,
    statusCode: number = 500,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AgentError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
  }

  static notFound(resource: string, id: string): AgentError {
    return new AgentError(
      `${resource} not found: ${id}`,
      AgentErrorCode.AGENT_NOT_FOUND,
      404,
      { resource, id },
    );
  }

  static agentNotFound(id: string): AgentError {
    return AgentError.notFound('Agent', id);
  }

  static sessionNotFound(id: string): AgentError {
    return AgentError.notFound('Session', id);
  }

  static toolNotFound(name: string): AgentError {
    return new AgentError(
      `Tool not found: ${name}`,
      AgentErrorCode.TOOL_NOT_FOUND,
      404,
      { toolName: name },
    );
  }

  static skillNotFound(id: string): AgentError {
    return new AgentError(
      `Skill not found: ${id}`,
      AgentErrorCode.SKILL_NOT_FOUND,
      404,
      { skillId: id },
    );
  }

  static runtimeNotFound(id: string): AgentError {
    return new AgentError(
      `Runtime not found: ${id}`,
      AgentErrorCode.RUNTIME_NOT_FOUND,
      404,
      { runtimeId: id },
    );
  }

  static runtimeNotReady(state: string): AgentError {
    return new AgentError(
      `Runtime not ready, current state: ${state}`,
      AgentErrorCode.RUNTIME_NOT_READY,
      400,
      { state },
    );
  }

  static llmError(provider: string, message: string, statusCode: number = 500): AgentError {
    return new AgentError(
      `LLM provider ${provider} error: ${message}`,
      AgentErrorCode.LLM_API_ERROR,
      statusCode,
      { provider, originalMessage: message },
    );
  }

  static toolExecutionFailed(toolName: string, error: string): AgentError {
    return new AgentError(
      `Tool execution failed: ${toolName} - ${error}`,
      AgentErrorCode.TOOL_EXECUTION_FAILED,
      500,
      { toolName, error },
    );
  }

  static permissionDenied(action: string, resource: string): AgentError {
    return new AgentError(
      `Permission denied: cannot ${action} on ${resource}`,
      AgentErrorCode.PERMISSION_DENIED,
      403,
      { action, resource },
    );
  }

  static invalidConfiguration(field: string, reason: string): AgentError {
    return new AgentError(
      `Invalid configuration: ${field} - ${reason}`,
      AgentErrorCode.INVALID_CONFIGURATION,
      400,
      { field, reason },
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

export class ToolExecutionError extends AgentError {
  public readonly toolName: string;
  public readonly input: unknown;

  constructor(toolName: string, input: unknown, message: string, details?: Record<string, unknown>) {
    super(
      `Tool '${toolName}' execution failed: ${message}`,
      AgentErrorCode.TOOL_EXECUTION_FAILED,
      500,
      { toolName, input, ...details },
    );
    this.name = 'ToolExecutionError';
    this.toolName = toolName;
    this.input = input;
  }
}

export class SkillExecutionError extends AgentError {
  public readonly skillId: string;
  public readonly input: unknown;

  constructor(skillId: string, input: unknown, message: string, details?: Record<string, unknown>) {
    super(
      `Skill '${skillId}' execution failed: ${message}`,
      AgentErrorCode.SKILL_EXECUTION_FAILED,
      500,
      { skillId, input, ...details },
    );
    this.name = 'SkillExecutionError';
    this.skillId = skillId;
    this.input = input;
  }
}

export class LLMError extends AgentError {
  public readonly provider: string;

  constructor(provider: string, message: string, statusCode: number = 500, details?: Record<string, unknown>) {
    super(
      `LLM provider '${provider}' error: ${message}`,
      AgentErrorCode.LLM_API_ERROR,
      statusCode,
      { provider, ...details },
    );
    this.name = 'LLMError';
    this.provider = provider;
  }

  static rateLimited(provider: string, retryAfter?: number): LLMError {
    return new LLMError(
      provider,
      'Rate limited',
      429,
      { retryAfter },
    );
  }

  static contextTooLong(provider: string, tokens: number, maxTokens: number): LLMError {
    return new LLMError(
      provider,
      `Context too long: ${tokens} tokens exceeds maximum ${maxTokens}`,
      400,
      { tokens, maxTokens },
    );
  }
}
