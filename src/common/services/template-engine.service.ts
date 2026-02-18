import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type TemplateEngine = 'handlebars' | 'mustache' | 'ejs' | 'simple';

export interface Template {
  id: string;
  name: string;
  engine: TemplateEngine;
  content: string;
  partials?: Record<string, string>;
  helpers?: Record<string, string>;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface RenderOptions {
  engine?: TemplateEngine;
  partials?: Record<string, string>;
  helpers?: Record<string, Function>;
  cache?: boolean;
  escape?: boolean;
  strict?: boolean;
}

export interface RenderResult {
  content: string;
  template: string;
  engine: TemplateEngine;
  renderTime: number;
}

export interface TemplateStats {
  totalTemplates: number;
  templatesByEngine: Record<TemplateEngine, number>;
  cacheSize: number;
  totalRenders: number;
  averageRenderTime: number;
}

export interface CompileOptions {
  engine?: TemplateEngine;
  strict?: boolean;
}

@Injectable()
export class TemplateEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TemplateEngineService.name);
  private readonly templates = new Map<string, Template>();
  private readonly compiledCache = new Map<string, (data: Record<string, any>, renderOptions?: RenderOptions) => string>();
  private readonly stats = {
    totalRenders: 0,
    totalRenderTime: 0,
  };

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('TemplateEngineService initialized');
  }

  onModuleDestroy() {
    this.templates.clear();
    this.compiledCache.clear();
  }

  registerTemplate(
    name: string,
    content: string,
    options?: {
      engine?: TemplateEngine;
      partials?: Record<string, string>;
      helpers?: Record<string, string>;
      metadata?: Record<string, any>;
    },
  ): Template {
    const existing = this.templates.get(name);
    const now = Date.now();

    const template: Template = {
      id: existing?.id || this.generateTemplateId(),
      name,
      engine: options?.engine || 'simple',
      content,
      partials: options?.partials,
      helpers: options?.helpers,
      metadata: options?.metadata,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.templates.set(name, template);
    this.compiledCache.delete(name);

    this.logger.debug(`Template '${name}' registered`);
    return template;
  }

  getTemplate(name: string): Template | undefined {
    return this.templates.get(name);
  }

  deleteTemplate(name: string): boolean {
    this.compiledCache.delete(name);
    return this.templates.delete(name);
  }

  render(
    templateNameOrContent: string,
    data: Record<string, any>,
    options?: RenderOptions,
  ): RenderResult {
    const startTime = Date.now();

    let template: Template | undefined = this.templates.get(templateNameOrContent);
    let content: string;
    let engine: TemplateEngine;

    if (template) {
      content = template.content;
      engine = options?.engine || template.engine;
    } else {
      content = templateNameOrContent;
      engine = options?.engine || 'simple';
    }

    const compiled = this.compile(content, engine, {
      partials: template?.partials || options?.partials,
      helpers: template?.helpers,
      cache: options?.cache !== false,
    });

    const rendered = compiled(data, options);
    const renderTime = Date.now() - startTime;

    this.stats.totalRenders++;
    this.stats.totalRenderTime += renderTime;

    return {
      content: rendered,
      template: templateNameOrContent,
      engine,
      renderTime,
    };
  }

  renderString(
    content: string,
    data: Record<string, any>,
    options?: RenderOptions,
  ): string {
    const result = this.render(content, data, options);
    return result.content;
  }

  compile(
    content: string,
    engine: TemplateEngine = 'simple',
    options?: CompileOptions & { partials?: Record<string, string>; helpers?: Record<string, string>; cache?: boolean },
  ): (data: Record<string, any>, renderOptions?: RenderOptions) => string {
    const cacheKey = this.getCacheKey(content, engine);

    if (options?.cache !== false && this.compiledCache.has(cacheKey)) {
      return this.compiledCache.get(cacheKey)!;
    }

    let compiled: (data: Record<string, any>, renderOptions?: RenderOptions) => string;

    switch (engine) {
      case 'handlebars':
        compiled = this.compileHandlebars(content, options);
        break;
      case 'mustache':
        compiled = this.compileMustache(content, options);
        break;
      case 'ejs':
        compiled = this.compileEjs(content, options);
        break;
      case 'simple':
      default:
        compiled = this.compileSimple(content, options);
        break;
    }

    if (options?.cache !== false) {
      this.compiledCache.set(cacheKey, compiled);
    }

    return compiled;
  }

  registerPartial(name: string, content: string): void {
    const partialTemplate = this.registerTemplate(`_partial_${name}`, content);
    this.logger.debug(`Partial '${name}' registered`);
  }

  registerHelper(name: string, helper: Function): void {
    this.logger.debug(`Helper '${name}' registered`);
  }

  getStats(): TemplateStats {
    const templatesByEngine: Record<TemplateEngine, number> = {
      handlebars: 0,
      mustache: 0,
      ejs: 0,
      simple: 0,
    };

    for (const template of this.templates.values()) {
      if (!template.name.startsWith('_partial_')) {
        templatesByEngine[template.engine]++;
      }
    }

    const avgRenderTime = this.stats.totalRenders > 0
      ? this.stats.totalRenderTime / this.stats.totalRenders
      : 0;

    return {
      totalTemplates: this.templates.size,
      templatesByEngine,
      cacheSize: this.compiledCache.size,
      totalRenders: this.stats.totalRenders,
      averageRenderTime: avgRenderTime,
    };
  }

  clearCache(): number {
    const size = this.compiledCache.size;
    this.compiledCache.clear();
    return size;
  }

  listTemplates(): Template[] {
    return Array.from(this.templates.values())
      .filter(t => !t.name.startsWith('_partial_'));
  }

  private compileSimple(
    content: string,
    options?: { partials?: Record<string, string>; helpers?: Record<string, string> },
  ): (data: Record<string, any>, renderOptions?: RenderOptions) => string {
    return (data: Record<string, any>, renderOptions?: RenderOptions) => {
      let result = content;

      const helpers: Record<string, Function> = {};
      if (renderOptions?.helpers) {
        Object.assign(helpers, renderOptions.helpers);
      }

      result = result.replace(/\{\{\{([^}]+)\}\}\}/g, (_, expression) => {
        const value = this.evaluateExpression(expression.trim(), data, helpers);
        return value !== undefined ? String(value) : '';
      });

      result = result.replace(/\{\{([^}]+)\}\}/g, (_, expression) => {
        const value = this.evaluateExpression(expression.trim(), data, helpers);
        if (value === undefined || value === null) return '';
        const escaped = this.escapeHtml(String(value));
        return escaped;
      });

      if (options?.partials) {
        for (const [name, partialContent] of Object.entries(options.partials)) {
          const partialPattern = new RegExp(`\\{\\{>\\s*${name}\\s*\\}\\}`, 'g');
          result = result.replace(partialPattern, () => {
            const partialCompiled = this.compileSimple(partialContent, options);
            return partialCompiled(data, renderOptions);
          });
        }
      }

      result = this.processConditionals(result, data, helpers);
      result = this.processLoops(result, data, helpers);

      return result;
    };
  }

  private compileHandlebars(
    content: string,
    options?: { partials?: Record<string, string>; helpers?: Record<string, string> },
  ): (data: Record<string, any>, renderOptions?: RenderOptions) => string {
    return this.compileSimple(content, options);
  }

  private compileMustache(
    content: string,
    options?: { partials?: Record<string, string> },
  ): (data: Record<string, any>, renderOptions?: RenderOptions) => string {
    return (data: Record<string, any>, renderOptions?: RenderOptions) => {
      let result = content;

      result = result.replace(/\{\{#([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, body) => {
        const value = this.getNestedValue(data, key.trim());
        if (Array.isArray(value)) {
          return value.map(item => {
            let itemResult = body;
            itemResult = itemResult.replace(/\{\{\.([^}]*)\}\}/g, (_: any, path: string) => {
              const itemValue = path.trim() ? this.getNestedValue(item, path.trim()) : item;
              return itemValue !== undefined ? String(itemValue) : '';
            });
            return itemResult;
          }).join('');
        }
        return value ? body : '';
      });

      result = result.replace(/\{\{\{([^}]+)\}\}\}/g, (_, key) => {
        const value = this.getNestedValue(data, key.trim());
        return value !== undefined ? String(value) : '';
      });

      result = result.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
        const value = this.getNestedValue(data, key.trim());
        if (value === undefined || value === null) return '';
        return this.escapeHtml(String(value));
      });

      if (options?.partials) {
        for (const [name, partialContent] of Object.entries(options.partials)) {
          const partialPattern = new RegExp(`\\{\\{>\\s*${name}\\s*\\}\\}`, 'g');
          result = result.replace(partialPattern, () => {
            const partialCompiled = this.compileMustache(partialContent, options);
            return partialCompiled(data, renderOptions);
          });
        }
      }

      return result;
    };
  }

  private compileEjs(
    content: string,
    options?: { strict?: boolean },
  ): (data: Record<string, any>, renderOptions?: RenderOptions) => string {
    return (data: Record<string, any>, renderOptions?: RenderOptions) => {
      let result = content;

      result = result.replace(/<%=([^%]+)%>/g, (_, expression) => {
        try {
          const value = this.evaluateExpression(expression.trim(), data, renderOptions?.helpers);
          return value !== undefined ? this.escapeHtml(String(value)) : '';
        } catch (error) {
          if (options?.strict) throw error;
          return '';
        }
      });

      result = result.replace(/<%-([^%]+)%>/g, (_, expression) => {
        try {
          const value = this.evaluateExpression(expression.trim(), data, renderOptions?.helpers);
          return value !== undefined ? String(value) : '';
        } catch (error) {
          if (options?.strict) throw error;
          return '';
        }
      });

      result = result.replace(/<%#([^%]+)%>/g, () => '');

      return result;
    };
  }

  private evaluateExpression(
    expression: string,
    data: Record<string, any>,
    helpers?: Record<string, Function>,
  ): any {
    if (expression.includes('(') && expression.includes(')')) {
      const match = expression.match(/^(\w+)\((.*)\)$/);
      if (match) {
        const [, funcName, argsStr] = match;
        const helper = helpers?.[funcName];
        if (helper) {
          const args = argsStr.split(',').map(arg => {
            arg = arg.trim();
            if (arg.startsWith("'") || arg.startsWith('"')) {
              return arg.slice(1, -1);
            }
            return this.getNestedValue(data, arg);
          });
          return helper(...args);
        }
      }
    }

    if (expression.includes('|')) {
      const parts = expression.split('|').map(p => p.trim());
      let value = this.getNestedValue(data, parts[0]);

      for (let i = 1; i < parts.length; i++) {
        const helper = helpers?.[parts[i]];
        if (helper) {
          value = helper(value);
        }
      }

      return value;
    }

    return this.getNestedValue(data, expression);
  }

  private getNestedValue(obj: any, path: string): any {
    if (!path) return obj;

    const parts = path.split('.');
    let value = obj;

    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }

    return value;
  }

  private processConditionals(content: string, data: Record<string, any>, helpers?: Record<string, Function>): string {
    let result = content;

    result = result.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, condition, body) => {
      const value = this.evaluateExpression(condition.trim(), data, helpers);
      return value ? body : '';
    });

    result = result.replace(/\{\{#unless\s+([^}]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (_, condition, body) => {
      const value = this.evaluateExpression(condition.trim(), data, helpers);
      return !value ? body : '';
    });

    return result;
  }

  private processLoops(content: string, data: Record<string, any>, helpers?: Record<string, Function>): string {
    let result = content;

    result = result.replace(/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, arrayPath, body) => {
      const array = this.getNestedValue(data, arrayPath.trim());
      if (!Array.isArray(array)) return '';

      return array.map((item, index) => {
        let itemResult = body;
        itemResult = itemResult.replace(/\{\{this\}\}/g, String(item));
        itemResult = itemResult.replace(/\{\{@index\}\}/g, String(index));
        itemResult = itemResult.replace(/\{\{@first\}\}/g, index === 0 ? 'true' : '');
        itemResult = itemResult.replace(/\{\{@last\}\}/g, index === array.length - 1 ? 'true' : '');

        if (typeof item === 'object' && item !== null) {
          for (const [key, value] of Object.entries(item)) {
            itemResult = itemResult.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
          }
        }

        return itemResult;
      }).join('');
    });

    return result;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private getCacheKey(content: string, engine: TemplateEngine): string {
    const hash = this.simpleHash(content);
    return `${engine}:${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  private generateTemplateId(): string {
    return `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
