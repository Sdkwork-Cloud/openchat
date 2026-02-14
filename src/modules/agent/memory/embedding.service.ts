import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmbeddingConfig {
  provider: 'openai' | 'local' | 'custom';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  dimension: number;
  batchSize: number;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private config: EmbeddingConfig;
  private cache: Map<string, number[]> = new Map();
  private maxCacheSize: number = 10000;

  constructor(private configService: ConfigService) {
    this.config = {
      provider: (configService.get<string>('EMBEDDING_PROVIDER') as any) || 'openai',
      model: configService.get<string>('EMBEDDING_MODEL') || 'text-embedding-3-small',
      apiKey: configService.get<string>('OPENAI_API_KEY'),
      baseUrl: configService.get<string>('OPENAI_BASE_URL') || 'https://api.openai.com/v1',
      dimension: configService.get<number>('EMBEDDING_DIMENSION') || 1536,
      batchSize: configService.get<number>('EMBEDDING_BATCH_SIZE') || 100,
    };
  }

  async embed(text: string): Promise<number[]> {
    const cacheKey = this.getCacheKey(text);
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let embedding: number[];

    switch (this.config.provider) {
      case 'openai':
        embedding = await this.embedWithOpenAI(text);
        break;
      case 'local':
        embedding = await this.embedLocal(text);
        break;
      default:
        embedding = await this.embedWithOpenAI(text);
    }

    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(cacheKey, embedding);

    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];

    for (let i = 0; i < texts.length; i++) {
      const cacheKey = this.getCacheKey(texts[i]);
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        results[i] = cached;
      } else {
        uncachedTexts.push(texts[i]);
        uncachedIndices.push(i);
      }
    }

    if (uncachedTexts.length > 0) {
      const batches = this.chunkArray(uncachedTexts, this.config.batchSize);
      
      for (const batch of batches) {
        let embeddings: number[][];

        switch (this.config.provider) {
          case 'openai':
            embeddings = await this.embedBatchWithOpenAI(batch);
            break;
          case 'local':
            embeddings = await Promise.all(batch.map(t => this.embedLocal(t)));
            break;
          default:
            embeddings = await this.embedBatchWithOpenAI(batch);
        }

        for (let i = 0; i < batch.length; i++) {
          const originalIndex = uncachedIndices[uncachedTexts.indexOf(batch[i])];
          results[originalIndex] = embeddings[i];

          const cacheKey = this.getCacheKey(batch[i]);
          if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
              this.cache.delete(firstKey);
            }
          }
          this.cache.set(cacheKey, embeddings[i]);
        }
      }
    }

    return results;
  }

  private async embedWithOpenAI(text: string): Promise<number[]> {
    const response = await fetch(`${this.config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI Embedding API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  private async embedBatchWithOpenAI(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI Embedding API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.data.sort((a: any, b: any) => a.index - b.index).map((d: any) => d.embedding);
  }

  private async embedLocal(text: string): Promise<number[]> {
    const embedding: number[] = [];
    const normalized = text.toLowerCase().trim();
    
    const hash = this.simpleHash(normalized);
    const seed = hash % 1000000;
    
    for (let i = 0; i < this.config.dimension; i++) {
      const value = Math.sin(seed + i * 0.1) * Math.cos(seed + i * 0.05);
      embedding.push(value);
    }
    
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    return embedding.map(v => v / norm);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private getCacheKey(text: string): string {
    return `${this.config.model}:${text.substring(0, 100)}:${text.length}`;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  clearCache(): void {
    this.cache.clear();
    this.logger.debug('Embedding cache cleared');
  }

  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
    };
  }
}
