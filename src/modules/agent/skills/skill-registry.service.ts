import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Skill, SkillResult, SkillExecutionContext } from '../agent.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SkillRegistry implements OnModuleInit {
  private readonly logger = new Logger(SkillRegistry.name);
  private skills: Map<string, Skill> = new Map();

  async onModuleInit() {
    this.registerBuiltInSkills();
    this.logger.log(`Skill registry initialized with ${this.skills.size} skills`);
  }

  private registerBuiltInSkills(): void {
    this.register({
      id: 'summarize',
      name: 'Summarize',
      description: 'Summarize long text into a concise summary',
      version: '1.0.0',
      input: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to summarize' },
          maxLength: { type: 'number', description: 'Maximum summary length' },
        },
        required: ['text'],
      },
      output: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          originalLength: { type: 'number' },
          summaryLength: { type: 'number' },
        },
      },
      execute: async (input: any, context: SkillExecutionContext) => {
        const text = input.text;
        const maxLength = input.maxLength || 200;
        const summary = text.length > maxLength 
          ? text.substring(0, maxLength) + '...' 
          : text;
        
        return {
          success: true,
          output: {
            summary,
            originalLength: text.length,
            summaryLength: summary.length,
          },
          metadata: {
            executionId: context.executionId,
            skillId: 'summarize',
            skillName: 'Summarize',
            startTime: context.startedAt.getTime(),
            endTime: Date.now(),
            duration: Date.now() - context.startedAt.getTime(),
          },
        };
      },
    });

    this.register({
      id: 'translate',
      name: 'Translate',
      description: 'Translate text between languages',
      version: '1.0.0',
      input: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to translate' },
          sourceLanguage: { type: 'string', description: 'Source language code' },
          targetLanguage: { type: 'string', description: 'Target language code' },
        },
        required: ['text', 'targetLanguage'],
      },
      output: {
        type: 'object',
        properties: {
          translatedText: { type: 'string' },
          sourceLanguage: { type: 'string' },
          targetLanguage: { type: 'string' },
        },
      },
      execute: async (input: any, context: SkillExecutionContext) => {
        context.logger.info(`Translating to ${input.targetLanguage}`);
        
        return {
          success: true,
          output: {
            translatedText: `[Translated to ${input.targetLanguage}]: ${input.text}`,
            sourceLanguage: input.sourceLanguage || 'auto',
            targetLanguage: input.targetLanguage,
          },
          metadata: {
            executionId: context.executionId,
            skillId: 'translate',
            skillName: 'Translate',
            startTime: context.startedAt.getTime(),
            endTime: Date.now(),
            duration: Date.now() - context.startedAt.getTime(),
          },
        };
      },
    });

    this.register({
      id: 'sentiment_analysis',
      name: 'Sentiment Analysis',
      description: 'Analyze the sentiment of text',
      version: '1.0.0',
      input: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to analyze' },
        },
        required: ['text'],
      },
      output: {
        type: 'object',
        properties: {
          sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
          confidence: { type: 'number' },
          scores: { type: 'object' },
        },
      },
      execute: async (input: any, context: SkillExecutionContext) => {
        const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'wonderful'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'sad'];
        
        const text = input.text.toLowerCase();
        let positiveScore = 0;
        let negativeScore = 0;
        
        positiveWords.forEach(word => {
          if (text.includes(word)) positiveScore++;
        });
        negativeWords.forEach(word => {
          if (text.includes(word)) negativeScore++;
        });
        
        const total = positiveScore + negativeScore || 1;
        const sentiment = positiveScore > negativeScore ? 'positive' 
          : negativeScore > positiveScore ? 'negative' 
          : 'neutral';
        const confidence = Math.abs(positiveScore - negativeScore) / total;
        
        return {
          success: true,
          output: {
            sentiment,
            confidence: Math.min(confidence, 1),
            scores: {
              positive: positiveScore / total,
              negative: negativeScore / total,
              neutral: 1 - (positiveScore + negativeScore) / total,
            },
          },
          metadata: {
            executionId: context.executionId,
            skillId: 'sentiment_analysis',
            skillName: 'Sentiment Analysis',
            startTime: context.startedAt.getTime(),
            endTime: Date.now(),
            duration: Date.now() - context.startedAt.getTime(),
          },
        };
      },
    });

    this.register({
      id: 'extract_entities',
      name: 'Entity Extraction',
      description: 'Extract named entities from text',
      version: '1.0.0',
      input: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to extract entities from' },
          entityTypes: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Types of entities to extract (person, organization, location, date, etc.)',
          },
        },
        required: ['text'],
      },
      output: {
        type: 'object',
        properties: {
          entities: { type: 'array' },
          count: { type: 'number' },
        },
      },
      execute: async (input: any, context: SkillExecutionContext) => {
        const text = input.text;
        const entities: any[] = [];
        
        const patterns = {
          email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
          phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
          url: /https?:\/\/[^\s]+/g,
          date: /\b\d{4}[-/]\d{2}[-/]\d{2}\b|\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g,
        };
        
        for (const [type, pattern] of Object.entries(patterns)) {
          const matches = text.match(pattern) || [];
          matches.forEach((match: string) => {
            entities.push({ type, value: match });
          });
        }
        
        return {
          success: true,
          output: {
            entities,
            count: entities.length,
          },
          metadata: {
            executionId: context.executionId,
            skillId: 'extract_entities',
            skillName: 'Entity Extraction',
            startTime: context.startedAt.getTime(),
            endTime: Date.now(),
            duration: Date.now() - context.startedAt.getTime(),
          },
        };
      },
    });

    this.register({
      id: 'keyword_extraction',
      name: 'Keyword Extraction',
      description: 'Extract keywords from text',
      version: '1.0.0',
      input: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to extract keywords from' },
          limit: { type: 'number', description: 'Maximum number of keywords' },
        },
        required: ['text'],
      },
      output: {
        type: 'object',
        properties: {
          keywords: { type: 'array', items: { type: 'string' } },
        },
      },
      execute: async (input: any, context: SkillExecutionContext) => {
        const text = input.text;
        const limit = input.limit || 10;
        
        const words = text.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter((word: string) => word.length > 3);
        
        const frequency: Record<string, number> = {};
        words.forEach((word: string) => {
          frequency[word] = (frequency[word] || 0) + 1;
        });
        
        const keywords = Object.entries(frequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([word]) => word);
        
        return {
          success: true,
          output: { keywords },
          metadata: {
            executionId: context.executionId,
            skillId: 'keyword_extraction',
            skillName: 'Keyword Extraction',
            startTime: context.startedAt.getTime(),
            endTime: Date.now(),
            duration: Date.now() - context.startedAt.getTime(),
          },
        };
      },
    });

    this.register({
      id: 'text_classification',
      name: 'Text Classification',
      description: 'Classify text into predefined categories',
      version: '1.0.0',
      input: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to classify' },
          categories: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Possible categories',
          },
        },
        required: ['text', 'categories'],
      },
      output: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          confidence: { type: 'number' },
          scores: { type: 'object' },
        },
      },
      execute: async (input: any, context: SkillExecutionContext) => {
        const { text, categories } = input;
        
        const scores: Record<string, number> = {};
        categories.forEach((cat: string) => {
          const keywords = cat.toLowerCase().split(/[\s_-]+/);
          const matches = keywords.filter((kw: string) => 
            text.toLowerCase().includes(kw)
          ).length;
          scores[cat] = matches / keywords.length;
        });
        
        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        const [category, confidence] = sorted[0] || ['unknown', 0];
        
        return {
          success: true,
          output: {
            category,
            confidence,
            scores,
          },
          metadata: {
            executionId: context.executionId,
            skillId: 'text_classification',
            skillName: 'Text Classification',
            startTime: context.startedAt.getTime(),
            endTime: Date.now(),
            duration: Date.now() - context.startedAt.getTime(),
          },
        };
      },
    });

    this.register({
      id: 'question_answering',
      name: 'Question Answering',
      description: 'Answer questions based on provided context',
      version: '1.0.0',
      input: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'Question to answer' },
          context: { type: 'string', description: 'Context text to find answer in' },
        },
        required: ['question', 'context'],
      },
      output: {
        type: 'object',
        properties: {
          answer: { type: 'string' },
          confidence: { type: 'number' },
        },
      },
      execute: async (input: any, context: SkillExecutionContext) => {
        const { question, context: ctx } = input;
        
        const sentences = ctx.split(/[.!?]+/).filter((s: string) => s.trim());
        const questionWords = question.toLowerCase().split(/\s+/);
        
        let bestMatch = '';
        let bestScore = 0;
        
        sentences.forEach((sentence: string) => {
          const sentenceWords = sentence.toLowerCase().split(/\s+/);
          const matches = questionWords.filter((w: string) => 
            sentenceWords.includes(w)
          ).length;
          const score = matches / questionWords.length;
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = sentence.trim();
          }
        });
        
        return {
          success: true,
          output: {
            answer: bestMatch || 'No relevant answer found in context.',
            confidence: bestScore,
          },
          metadata: {
            executionId: context.executionId,
            skillId: 'question_answering',
            skillName: 'Question Answering',
            startTime: context.startedAt.getTime(),
            endTime: Date.now(),
            duration: Date.now() - context.startedAt.getTime(),
          },
        };
      },
    });

    this.register({
      id: 'content_moderation',
      name: 'Content Moderation',
      description: 'Check content for inappropriate material',
      version: '1.0.0',
      input: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to moderate' },
        },
        required: ['text'],
      },
      output: {
        type: 'object',
        properties: {
          isSafe: { type: 'boolean' },
          flags: { type: 'array', items: { type: 'string' } },
          scores: { type: 'object' },
        },
      },
      execute: async (input: any, context: SkillExecutionContext) => {
        const text = input.text.toLowerCase();
        const flags: string[] = [];
        const scores: Record<string, number> = {};
        
        const inappropriatePatterns = [
          { category: 'violence', patterns: ['kill', 'murder', 'attack', 'fight'] },
          { category: 'hate', patterns: ['hate', 'discriminate', 'racist'] },
          { category: 'adult', patterns: ['xxx', 'adult', 'explicit'] },
          { category: 'spam', patterns: ['buy now', 'click here', 'free money'] },
        ];
        
        inappropriatePatterns.forEach(({ category, patterns }) => {
          const matches = patterns.filter(p => text.includes(p)).length;
          scores[category] = matches / patterns.length;
          if (matches > 0) {
            flags.push(category);
          }
        });
        
        return {
          success: true,
          output: {
            isSafe: flags.length === 0,
            flags,
            scores,
          },
          metadata: {
            executionId: context.executionId,
            skillId: 'content_moderation',
            skillName: 'Content Moderation',
            startTime: context.startedAt.getTime(),
            endTime: Date.now(),
            duration: Date.now() - context.startedAt.getTime(),
          },
        };
      },
    });
  }

  register(skill: Skill): void {
    this.skills.set(skill.id, skill);
    this.logger.debug(`Registered skill: ${skill.name} (${skill.id})`);
  }

  async get(id: string): Promise<Skill | undefined> {
    return this.skills.get(id);
  }

  async getAll(): Promise<Skill[]> {
    return Array.from(this.skills.values());
  }

  async getByIds(ids: string[]): Promise<Skill[]> {
    return ids
      .map(id => this.skills.get(id))
      .filter((skill): skill is Skill => skill !== undefined);
  }

  unregister(id: string): boolean {
    return this.skills.delete(id);
  }

  has(id: string): boolean {
    return this.skills.has(id);
  }

  list(): { id: string; name: string; description: string }[] {
    return Array.from(this.skills.values()).map(skill => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
    }));
  }
}
