import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm';

export type MemoryType = 'episodic' | 'semantic' | 'procedural' | 'working';
export type MemorySource = 'conversation' | 'document' | 'system' | 'user' | 'knowledge';

@Entity('agent_memories')
@Index('idx_memories_agent', ['agentId'])
@Index('idx_memories_session', ['sessionId'])
@Index('idx_memories_type', ['type'])
@Index('idx_memories_source', ['source'])
@Index('idx_memories_timestamp', ['timestamp'])
@Index('idx_memories_agent_type', ['agentId', 'type'])
export class AgentMemory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  agentId: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  sessionId: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  userId: string;

  @Column({ type: 'text', nullable: false })
  content: string;

  @Column({
    type: 'enum',
    enum: ['episodic', 'semantic', 'procedural', 'working'],
    default: 'episodic',
  })
  type: MemoryType;

  @Column({
    type: 'enum',
    enum: ['conversation', 'document', 'system', 'user', 'knowledge'],
    default: 'conversation',
  })
  source: MemorySource;

  @Column({ type: 'simple-array', nullable: true })
  embedding: number[];

  @Column({ type: 'float', nullable: true })
  importance: number;

  @Column({ type: 'float', nullable: true })
  decayFactor: number;

  @Column({ type: 'int', nullable: true, default: 0 })
  accessCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  metadata: MemoryMetadata;

  @Column({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date;
}

export interface MemoryMetadata {
  title?: string;
  category?: string;
  tags?: string[];
  role?: 'user' | 'assistant' | 'system' | 'tool';
  sourcePath?: string;
  documentId?: string;
  chunkIndex?: number;
  confidence?: number;
  customData?: Record<string, unknown>;
  [key: string]: unknown;
}

@Entity('agent_memory_summaries')
@Index('idx_memory_summaries_agent', ['agentId'])
@Index('idx_memory_summaries_session', ['sessionId'])
export class MemorySummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  agentId: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  sessionId: string;

  @Column({ type: 'text', nullable: false })
  summary: string;

  @Column({ type: 'int', nullable: false })
  messageCount: number;

  @Column({ type: 'jsonb', nullable: true })
  keyPoints: string[];

  @Column({ type: 'jsonb', nullable: true })
  entities: ExtractedEntity[];

  @Column({ type: 'jsonb', nullable: true })
  topics: string[];

  @Column({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date;
}

export interface ExtractedEntity {
  type: 'person' | 'organization' | 'location' | 'date' | 'concept' | 'other';
  name: string;
  mentions: number;
  context?: string;
}

@Entity('agent_knowledge_chunks')
@Index('idx_knowledge_chunks_document', ['documentId'])
@Index('idx_knowledge_chunks_agent', ['agentId'])
export class KnowledgeChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  documentId: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  agentId: string;

  @Column({ type: 'text', nullable: false })
  content: string;

  @Column({ type: 'int', nullable: false })
  chunkIndex: number;

  @Column({ type: 'int', nullable: true })
  startOffset: number;

  @Column({ type: 'int', nullable: true })
  endOffset: number;

  @Column({ type: 'simple-array', nullable: true })
  embedding: number[];

  @Column({ type: 'varchar', length: 64, nullable: true })
  hash: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

@Entity('agent_knowledge_documents')
@Index('idx_knowledge_documents_agent', ['agentId'])
export class KnowledgeDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  agentId: string;

  @Column({ type: 'varchar', length: 500, nullable: false })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  sourcePath: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sourceType: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  hash: string;

  @Column({ type: 'int', nullable: true, default: 0 })
  chunkCount: number;

  @Column({ type: 'int', nullable: true })
  totalTokens: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: DocumentMetadata;

  @Column({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date;
}

export interface DocumentMetadata {
  author?: string;
  category?: string;
  tags?: string[];
  language?: string;
  mimeType?: string;
  size?: number;
  customData?: Record<string, unknown>;
}

@Entity('agent_memory_vectors')
@Index('idx_memory_vectors_agent', ['agentId'])
export class MemoryVector {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  agentId: string;

  @Column({ type: 'varchar', length: 36, nullable: false })
  memoryId: string;

  @Column({ type: 'simple-array', nullable: false })
  embedding: number[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  embeddingModel: string;

  @Column({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
