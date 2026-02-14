import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { KnowledgeChunk, KnowledgeDocument } from './memory.entity';
import { EmbeddingService } from './embedding.service';
import { KnowledgeDocumentInput, KnowledgeSearchResult } from './memory.interface';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  private chunkSize: number;
  private chunkOverlap: number;

  constructor(
    private configService: ConfigService,
    @InjectRepository(KnowledgeChunk)
    private chunkRepository: Repository<KnowledgeChunk>,
    @InjectRepository(KnowledgeDocument)
    private documentRepository: Repository<KnowledgeDocument>,
    private embeddingService: EmbeddingService,
  ) {
    this.chunkSize = configService.get<number>('KNOWLEDGE_CHUNK_SIZE', 1000);
    this.chunkOverlap = configService.get<number>('KNOWLEDGE_CHUNK_OVERLAP', 200);
  }

  async addDocument(
    agentId: string,
    input: KnowledgeDocumentInput,
  ): Promise<KnowledgeDocument> {
    const now = new Date();
    const hash = this.generateHash(input.content);

    const existingDoc = await this.documentRepository.findOne({
      where: { agentId, hash },
    });

    if (existingDoc) {
      this.logger.debug(`Document already exists: ${existingDoc.id}`);
      return existingDoc;
    }

    const document = this.documentRepository.create({
      id: uuidv4(),
      agentId,
      title: input.title,
      description: input.description,
      sourcePath: input.sourcePath,
      sourceType: input.sourceType,
      hash,
      chunkCount: 0,
      totalTokens: 0,
      metadata: input.metadata || {},
      createdAt: now,
      updatedAt: now,
    });

    const savedDocument = await this.documentRepository.save(document);

    const chunks = await this.chunkContent(input.content, savedDocument.id, agentId);
    
    await this.chunkRepository.save(chunks);

    savedDocument.chunkCount = chunks.length;
    savedDocument.totalTokens = chunks.reduce((sum, c) => sum + this.estimateTokens(c.content), 0);
    await this.documentRepository.save(savedDocument);

    this.logger.log(`Added document: ${savedDocument.id} with ${chunks.length} chunks`);

    return savedDocument;
  }

  async addDocuments(
    agentId: string,
    inputs: KnowledgeDocumentInput[],
  ): Promise<KnowledgeDocument[]> {
    const results: KnowledgeDocument[] = [];
    for (const input of inputs) {
      const doc = await this.addDocument(agentId, input);
      results.push(doc);
    }
    return results;
  }

  async searchKnowledge(
    agentId: string,
    query: string,
    limit: number = 5,
    threshold: number = 0.7,
  ): Promise<KnowledgeSearchResult[]> {
    const queryEmbedding = await this.embeddingService.embed(query);

    const chunks = await this.chunkRepository.find({
      where: { agentId },
      relations: ['document'],
    });

    const scoredChunks: Array<{ chunk: KnowledgeChunk; score: number }> = chunks.map(chunk => ({
      chunk,
      score: chunk.embedding ? this.cosineSimilarity(queryEmbedding, chunk.embedding) : 0,
    }));

    scoredChunks.sort((a, b) => b.score - a.score);

    const topChunks = scoredChunks
      .filter(c => c.score >= threshold)
      .slice(0, limit);

    const documentIds = [...new Set(topChunks.map(c => c.chunk.documentId))];
    const documents = await this.documentRepository.find({
      where: { id: In(documentIds) },
    });
    const documentMap = new Map(documents.map(d => [d.id, d]));

    return topChunks.map(({ chunk, score }) => ({
      chunkId: chunk.id,
      documentId: chunk.documentId,
      documentTitle: documentMap.get(chunk.documentId)?.title || 'Unknown',
      content: chunk.content,
      score,
      metadata: chunk.metadata,
    }));
  }

  async getDocument(documentId: string): Promise<KnowledgeDocument | null> {
    return this.documentRepository.findOne({
      where: { id: documentId },
    });
  }

  async getDocuments(agentId: string): Promise<KnowledgeDocument[]> {
    return this.documentRepository.find({
      where: { agentId },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteDocument(documentId: string): Promise<boolean> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      return false;
    }

    await this.chunkRepository.delete({ documentId });
    await this.documentRepository.delete({ id: documentId });

    this.logger.log(`Deleted document: ${documentId}`);
    return true;
  }

  async updateDocument(
    documentId: string,
    input: Partial<KnowledgeDocumentInput>,
  ): Promise<KnowledgeDocument | null> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      return null;
    }

    if (input.title !== undefined) {
      document.title = input.title;
    }
    if (input.description !== undefined) {
      document.description = input.description;
    }
    if (input.sourcePath !== undefined) {
      document.sourcePath = input.sourcePath;
    }
    if (input.sourceType !== undefined) {
      document.sourceType = input.sourceType;
    }
    if (input.metadata !== undefined) {
      document.metadata = input.metadata;
    }

    if (input.content !== undefined) {
      await this.chunkRepository.delete({ documentId: document.id });

      const chunks = await this.chunkContent(input.content, document.id, document.agentId);
      await this.chunkRepository.save(chunks);

      document.chunkCount = chunks.length;
      document.totalTokens = chunks.reduce((sum, c) => sum + this.estimateTokens(c.content), 0);
      document.hash = this.generateHash(input.content);
    }

    document.updatedAt = new Date();
    return this.documentRepository.save(document);
  }

  async getDocumentChunks(documentId: string): Promise<KnowledgeChunk[]> {
    return this.chunkRepository.find({
      where: { documentId },
      order: { chunkIndex: 'ASC' },
    });
  }

  async getKnowledgeStats(agentId: string): Promise<{
    documentCount: number;
    totalChunks: number;
    totalTokens: number;
    totalSize: number;
  }> {
    const documents = await this.documentRepository.find({
      where: { agentId },
    });

    const totalChunks = documents.reduce((sum, d) => sum + d.chunkCount, 0);
    const totalTokens = documents.reduce((sum, d) => sum + (d.totalTokens || 0), 0);

    return {
      documentCount: documents.length,
      totalChunks,
      totalTokens,
      totalSize: totalTokens * 4,
    };
  }

  private async chunkContent(
    content: string,
    documentId: string,
    agentId: string,
  ): Promise<KnowledgeChunk[]> {
    const chunks: KnowledgeChunk[] = [];
    const sentences = content.split(/(?<=[.!?])\s+/);
    
    let currentChunk = '';
    let chunkIndex = 0;
    let startOffset = 0;

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > this.chunkSize && currentChunk.length > 0) {
        const embedding = await this.embeddingService.embed(currentChunk);
        
        chunks.push(this.chunkRepository.create({
          id: uuidv4(),
          documentId,
          agentId,
          content: currentChunk.trim(),
          chunkIndex,
          startOffset,
          endOffset: startOffset + currentChunk.length,
          embedding,
          hash: this.generateHash(currentChunk),
          metadata: {},
          createdAt: new Date(),
        }));

        chunkIndex++;
        startOffset += currentChunk.length - this.chunkOverlap;
        
        const words = currentChunk.split(/\s+/);
        const overlapWords = words.slice(-Math.floor(this.chunkOverlap / 5)).join(' ');
        currentChunk = overlapWords + ' ' + sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      const embedding = await this.embeddingService.embed(currentChunk);
      
      chunks.push(this.chunkRepository.create({
        id: uuidv4(),
        documentId,
        agentId,
        content: currentChunk.trim(),
        chunkIndex,
        startOffset,
        endOffset: startOffset + currentChunk.length,
        embedding,
        hash: this.generateHash(currentChunk),
        metadata: {},
        createdAt: new Date(),
      }));
    }

    return chunks;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private generateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
