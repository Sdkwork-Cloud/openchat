export const AGENT_MODULE_CONSTANTS = {
  DEFAULT_MODEL: 'gpt-4',
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 4096,
  DEFAULT_MEMORY_LIMIT: 100,
  DEFAULT_MEMORY_MAX_TOKENS: 8000,
  
  MAX_TOOL_ITERATIONS: 10,
  MAX_MESSAGE_LENGTH: 100000,
  MAX_SESSIONS_PER_USER: 100,
  MAX_AGENTS_PER_USER: 50,
  
  TOOL_TIMEOUT_MS: 30000,
  SKILL_TIMEOUT_MS: 60000,
  LLM_TIMEOUT_MS: 120000,
  
  MEMORY_CONSOLIDATION_INTERVAL_MS: 3600000,
  MEMORY_CACHE_SIZE: 10000,
  MEMORY_CACHE_TTL_MS: 3600000,
  
  EMBEDDING_DIMENSION: 1536,
  EMBEDDING_BATCH_SIZE: 100,
  
  KNOWLEDGE_CHUNK_SIZE: 1000,
  KNOWLEDGE_CHUNK_OVERLAP: 200,
  
  SESSION_CLEANUP_INTERVAL_MS: 86400000,
  RUNTIME_CLEANUP_INTERVAL_MS: 1800000,
};

export const AGENT_EVENT_NAMES = {
  AGENT_CREATED: 'agent.created',
  AGENT_UPDATED: 'agent.updated',
  AGENT_DELETED: 'agent.deleted',
  AGENT_STARTED: 'agent.started',
  AGENT_STOPPED: 'agent.stopped',
  
  SESSION_CREATED: 'session.created',
  SESSION_CLOSED: 'session.closed',
  
  MESSAGE_SENT: 'message.sent',
  MESSAGE_RECEIVED: 'message.received',
  
  TOOL_CALLED: 'tool.called',
  TOOL_COMPLETED: 'tool.completed',
  TOOL_FAILED: 'tool.failed',
  
  SKILL_EXECUTED: 'skill.executed',
  SKILL_FAILED: 'skill.failed',
  
  ERROR_OCCURRED: 'error.occurred',
};

export const LLM_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  DEEPSEEK: 'deepseek',
  ZHIPU: 'zhipu',
  QWEN: 'qwen',
  MOONSHOT: 'moonshot',
  DOUBAO: 'doubao',
  GOOGLE: 'google',
  CUSTOM: 'custom',
} as const;

export const MEMORY_TYPES = {
  EPISODIC: 'episodic',
  SEMANTIC: 'semantic',
  PROCEDURAL: 'procedural',
  WORKING: 'working',
} as const;

export const MEMORY_SOURCES = {
  CONVERSATION: 'conversation',
  DOCUMENT: 'document',
  SYSTEM: 'system',
  USER: 'user',
  KNOWLEDGE: 'knowledge',
} as const;

export const TOOL_CATEGORIES = {
  WEB: 'web',
  FILE: 'file',
  CODE: 'code',
  DATA: 'data',
  SYSTEM: 'system',
  CUSTOM: 'custom',
} as const;

export const SKILL_CATEGORIES = {
  TEXT: 'text',
  ANALYSIS: 'analysis',
  TRANSFORMATION: 'transformation',
  GENERATION: 'generation',
  CUSTOM: 'custom',
} as const;
