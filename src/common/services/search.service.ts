import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SearchDocument {
  id: string;
  type: string;
  title?: string;
  content?: string;
  fields?: Record<string, any>;
  tags?: string[];
  createdAt?: number;
  updatedAt?: number;
}

export interface SearchOptions {
  fuzzy?: boolean;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
  highlight?: boolean;
  highlightTag?: string;
}

export interface SearchQuery {
  text?: string;
  type?: string | string[];
  fields?: Record<string, any>;
  tags?: string[];
  dateRange?: {
    field: 'createdAt' | 'updatedAt';
    start?: number;
    end?: number;
  };
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  options?: SearchOptions;
  limit?: number;
  offset?: number;
}

export interface SearchResult<T = any> {
  id: string;
  type: string;
  score: number;
  document: T;
  highlights?: Record<string, string[]>;
}

export interface SearchResponse<T = any> {
  results: SearchResult<T>[];
  total: number;
  took: number;
  query: SearchQuery;
}

export interface IndexOptions {
  analyzer?: 'standard' | 'simple' | 'whitespace';
  storeFields?: boolean;
}

export interface SearchStats {
  totalDocuments: number;
  documentsByType: Record<string, number>;
  indexSize: number;
  lastIndexed?: number;
}

@Injectable()
export class SearchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SearchService.name);
  private readonly indices = new Map<string, {
    documents: Map<string, SearchDocument>;
    invertedIndex: Map<string, Map<string, number[]>>;
    options: Required<IndexOptions>;
    stats: {
      totalDocuments: number;
      documentsByType: Record<string, number>;
      lastIndexed?: number;
    };
  }>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('SearchService initialized');
  }

  onModuleDestroy() {
    this.indices.clear();
  }

  createIndex(name: string, options?: IndexOptions): void {
    if (this.indices.has(name)) {
      throw new Error(`Index '${name}' already exists`);
    }

    const defaultOptions: Required<IndexOptions> = {
      analyzer: options?.analyzer || 'standard',
      storeFields: options?.storeFields !== false,
    };

    this.indices.set(name, {
      documents: new Map(),
      invertedIndex: new Map(),
      options: defaultOptions,
      stats: {
        totalDocuments: 0,
        documentsByType: {},
      },
    });

    this.logger.log(`Search index '${name}' created`);
  }

  index(name: string, document: SearchDocument): void {
    const index = this.indices.get(name);
    if (!index) {
      throw new Error(`Index '${name}' not found`);
    }

    const existingDoc = index.documents.get(document.id);
    if (existingDoc) {
      this.removeFromInvertedIndex(index, existingDoc);
    }

    index.documents.set(document.id, document);

    this.addToInvertedIndex(index, document);

    index.stats.totalDocuments = index.documents.size;
    index.stats.documentsByType[document.type] = (index.stats.documentsByType[document.type] || 0) + (existingDoc ? 0 : 1);
    index.stats.lastIndexed = Date.now();
  }

  indexBatch(name: string, documents: SearchDocument[]): void {
    for (const doc of documents) {
      this.index(name, doc);
    }
  }

  unindex(name: string, documentId: string): boolean {
    const index = this.indices.get(name);
    if (!index) return false;

    const document = index.documents.get(documentId);
    if (!document) return false;

    this.removeFromInvertedIndex(index, document);
    index.documents.delete(documentId);

    index.stats.totalDocuments = index.documents.size;
    index.stats.documentsByType[document.type] = Math.max(0, (index.stats.documentsByType[document.type] || 0) - 1);

    return true;
  }

  search<T = any>(name: string, query: SearchQuery): SearchResponse<T> {
    const startTime = Date.now();
    const index = this.indices.get(name);

    if (!index) {
      throw new Error(`Index '${name}' not found`);
    }

    let results: SearchResult<T>[] = [];
    let matchingIds = new Set<string>();

    if (query.text) {
      matchingIds = this.searchByText(index, query.text, query.options);
    } else {
      for (const id of index.documents.keys()) {
        matchingIds.add(id);
      }
    }

    for (const id of matchingIds) {
      const doc = index.documents.get(id);
      if (!doc) continue;

      if (!this.matchesFilters(doc, query)) {
        continue;
      }

      const score = this.calculateScore(index, doc, query);
      const highlights = query.options?.highlight
        ? this.getHighlights(doc, query.text, query.options?.highlightTag || 'mark')
        : undefined;

      results.push({
        id: doc.id,
        type: doc.type,
        score,
        document: doc as any,
        highlights,
      });
    }

    results.sort((a, b) => b.score - a.score);

    if (query.sort) {
      results.sort((a, b) => {
        const aVal = this.getSortValue(a.document, query.sort!.field);
        const bVal = this.getSortValue(b.document, query.sort!.field);

        if (aVal === undefined && bVal === undefined) return 0;
        if (aVal === undefined) return 1;
        if (bVal === undefined) return -1;

        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return query.sort!.order === 'desc' ? -comparison : comparison;
      });
    }

    const total = results.length;

    if (query.offset !== undefined) {
      results = results.slice(query.offset);
    }

    if (query.limit !== undefined) {
      results = results.slice(0, query.limit);
    }

    return {
      results,
      total,
      took: Date.now() - startTime,
      query,
    };
  }

  getDocument<T = any>(name: string, documentId: string): T | undefined {
    const index = this.indices.get(name);
    if (!index) return undefined;

    return index.documents.get(documentId) as T | undefined;
  }

  getStats(name: string): SearchStats {
    const index = this.indices.get(name);
    if (!index) {
      throw new Error(`Index '${name}' not found`);
    }

    let indexSize = 0;
    for (const [term, docMap] of index.invertedIndex) {
      indexSize += term.length;
      for (const positions of docMap.values()) {
        indexSize += positions.length * 4;
      }
    }

    return {
      totalDocuments: index.stats.totalDocuments,
      documentsByType: { ...index.stats.documentsByType },
      indexSize,
      lastIndexed: index.stats.lastIndexed,
    };
  }

  suggest(name: string, prefix: string, limit?: number): string[] {
    const index = this.indices.get(name);
    if (!index) return [];

    const suggestions: string[] = [];
    const lowerPrefix = prefix.toLowerCase();

    for (const term of index.invertedIndex.keys()) {
      if (term.startsWith(lowerPrefix)) {
        suggestions.push(term);
        if (suggestions.length >= (limit || 10)) break;
      }
    }

    return suggestions;
  }

  clearIndex(name: string): number {
    const index = this.indices.get(name);
    if (!index) return 0;

    const count = index.documents.size;
    index.documents.clear();
    index.invertedIndex.clear();
    index.stats = {
      totalDocuments: 0,
      documentsByType: {},
    };

    return count;
  }

  destroyIndex(name: string): boolean {
    return this.indices.delete(name);
  }

  private addToInvertedIndex(index: {
    invertedIndex: Map<string, Map<string, number[]>>;
    options: Required<IndexOptions>;
  }, document: SearchDocument): void {
    const textContent = this.extractTextContent(document);
    const tokens = this.tokenize(textContent, index.options.analyzer);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (!index.invertedIndex.has(token)) {
        index.invertedIndex.set(token, new Map());
      }

      const docMap = index.invertedIndex.get(token)!;
      if (!docMap.has(document.id)) {
        docMap.set(document.id, []);
      }
      docMap.get(document.id)!.push(i);
    }
  }

  private removeFromInvertedIndex(index: {
    invertedIndex: Map<string, Map<string, number[]>>;
  }, document: SearchDocument): void {
    for (const [, docMap] of index.invertedIndex) {
      docMap.delete(document.id);
    }
  }

  private searchByText(
    index: {
      documents: Map<string, SearchDocument>;
      invertedIndex: Map<string, Map<string, number[]>>;
      options: Required<IndexOptions>;
    },
    text: string,
    options?: SearchOptions,
  ): Set<string> {
    const results = new Set<string>();
    const tokens = this.tokenize(text, index.options.analyzer);

    for (const token of tokens) {
      if (options?.fuzzy) {
        for (const [term, docMap] of index.invertedIndex) {
          if (this.fuzzyMatch(token, term, 2)) {
            for (const docId of docMap.keys()) {
              results.add(docId);
            }
          }
        }
      } else {
        const docMap = index.invertedIndex.get(token);
        if (docMap) {
          for (const docId of docMap.keys()) {
            results.add(docId);
          }
        }
      }
    }

    return results;
  }

  private matchesFilters(document: SearchDocument, query: SearchQuery): boolean {
    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      if (!types.includes(document.type)) {
        return false;
      }
    }

    if (query.tags && query.tags.length > 0) {
      const docTags = document.tags || [];
      if (!query.tags.some(tag => docTags.includes(tag))) {
        return false;
      }
    }

    if (query.fields) {
      for (const [field, value] of Object.entries(query.fields)) {
        const docValue = document.fields?.[field];
        if (docValue !== value) {
          return false;
        }
      }
    }

    if (query.dateRange) {
      const docDate = query.dateRange.field === 'createdAt'
        ? document.createdAt
        : document.updatedAt;

      if (docDate === undefined) return false;

      if (query.dateRange.start !== undefined && docDate < query.dateRange.start) {
        return false;
      }

      if (query.dateRange.end !== undefined && docDate > query.dateRange.end) {
        return false;
      }
    }

    return true;
  }

  private calculateScore(
    index: {
      documents: Map<string, SearchDocument>;
      invertedIndex: Map<string, Map<string, number[]>>;
    },
    document: SearchDocument,
    query: SearchQuery,
  ): number {
    if (!query.text) return 1;

    const tokens = this.tokenize(query.text, 'standard');
    let score = 0;

    for (const token of tokens) {
      const docMap = index.invertedIndex.get(token);
      if (docMap?.has(document.id)) {
        const positions = docMap.get(document.id)!;
        const tf = positions.length;
        const idf = Math.log(index.documents.size / (docMap.size || 1));
        score += tf * idf;
      }
    }

    if (document.title && query.text) {
      const titleTokens = this.tokenize(document.title, 'standard');
      const queryTokens = this.tokenize(query.text, 'standard');
      const titleMatches = titleTokens.filter(t => queryTokens.includes(t)).length;
      score += titleMatches * 2;
    }

    return score;
  }

  private getHighlights(
    document: SearchDocument,
    text?: string,
    tag: string = 'mark',
  ): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};

    if (!text) return highlights;

    const tokens = this.tokenize(text, 'standard');
    const regex = new RegExp(`(${tokens.join('|')})`, 'gi');

    const fieldsToHighlight = ['title', 'content'];

    for (const field of fieldsToHighlight) {
      const value = (document as any)[field];
      if (typeof value === 'string') {
        const highlighted = value.replace(regex, `<${tag}>$1</${tag}>`);
        if (highlighted !== value) {
          highlights[field] = [highlighted];
        }
      }
    }

    return highlights;
  }

  private getSortValue(document: any, field: string): any {
    const parts = field.split('.');
    let value = document;

    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      value = value[part];
    }

    return value;
  }

  private extractTextContent(document: SearchDocument): string {
    const parts: string[] = [];

    if (document.title) parts.push(document.title);
    if (document.content) parts.push(document.content);

    if (document.fields) {
      for (const value of Object.values(document.fields)) {
        if (typeof value === 'string') {
          parts.push(value);
        }
      }
    }

    if (document.tags) {
      parts.push(...document.tags);
    }

    return parts.join(' ');
  }

  private tokenize(text: string, analyzer: string): string[] {
    if (!text) return [];

    let tokens: string[];

    switch (analyzer) {
      case 'simple':
        tokens = text.toLowerCase().split(/\s+/);
        break;
      case 'whitespace':
        tokens = text.split(/\s+/);
        break;
      case 'standard':
      default:
        tokens = text.toLowerCase().split(/[^a-zA-Z0-9\u4e00-\u9fa5]+/);
        break;
    }

    return tokens.filter(t => t.length > 0);
  }

  private fuzzyMatch(a: string, b: string, maxDistance: number): boolean {
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > maxDistance) return false;

    const matrix: number[][] = [];

    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }

    return matrix[a.length][b.length] <= maxDistance;
  }
}
