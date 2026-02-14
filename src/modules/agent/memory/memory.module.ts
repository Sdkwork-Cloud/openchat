import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AgentMemory,
  MemorySummary,
  KnowledgeChunk,
  KnowledgeDocument,
  MemoryVector,
} from './memory.entity';
import { MemoryManagerService } from './memory-manager.service';
import { EmbeddingService } from './embedding.service';
import { MemoryCacheService } from './memory-cache.service';
import { KnowledgeService } from './knowledge.service';
import { MemoryController } from './memory.controller';
import { MemoryService } from './memory.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgentMemory,
      MemorySummary,
      KnowledgeChunk,
      KnowledgeDocument,
      MemoryVector,
    ]),
  ],
  controllers: [MemoryController],
  providers: [
    MemoryManagerService,
    EmbeddingService,
    MemoryCacheService,
    KnowledgeService,
    MemoryService,
  ],
  exports: [
    MemoryManagerService,
    EmbeddingService,
    MemoryCacheService,
    KnowledgeService,
    MemoryService,
  ],
})
export class MemoryModule {}
