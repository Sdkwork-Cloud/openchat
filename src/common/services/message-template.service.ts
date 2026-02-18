import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { I18nService } from './i18n.service';
import { buildCacheKey } from '../decorators/cache.decorator';

export interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  subject?: string;
  content: string;
  variables: string[];
  channels: ('email' | 'sms' | 'push' | 'in_app' | 'websocket')[];
  locale?: string;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface RenderedMessage {
  subject?: string;
  content: string;
  html?: string;
  variables: Record<string, any>;
  missingVariables: string[];
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object';
  required: boolean;
  default?: any;
  description?: string;
}

@Injectable()
export class MessageTemplateService implements OnModuleInit {
  private readonly logger = new Logger(MessageTemplateService.name);
  private readonly templates = new Map<string, MessageTemplate>();
  private readonly variablePattern = /\{\{(\w+)\}\}/g;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly i18nService: I18nService,
  ) {}

  onModuleInit() {
    this.loadTemplates();
    this.initializeDefaultTemplates();
    this.logger.log('MessageTemplateService initialized');
  }

  async createTemplate(
    template: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt' | 'variables'>,
  ): Promise<MessageTemplate> {
    const id = this.generateId();
    const now = Date.now();

    const variables = this.extractVariables(template.content);

    const newTemplate: MessageTemplate = {
      ...template,
      id,
      variables,
      createdAt: now,
      updatedAt: now,
    };

    this.templates.set(id, newTemplate);
    await this.persistTemplate(newTemplate);

    this.logger.debug(`Template created: ${id}`);
    return newTemplate;
  }

  async updateTemplate(
    id: string,
    updates: Partial<Omit<MessageTemplate, 'id' | 'createdAt'>>,
  ): Promise<MessageTemplate | null> {
    const template = this.templates.get(id);
    if (!template) return null;

    const variables = updates.content
      ? this.extractVariables(updates.content)
      : template.variables;

    const updated: MessageTemplate = {
      ...template,
      ...updates,
      id,
      variables,
      updatedAt: Date.now(),
    };

    this.templates.set(id, updated);
    await this.persistTemplate(updated);

    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    if (!this.templates.has(id)) return false;

    this.templates.delete(id);
    await this.redisService.del(buildCacheKey('message_template', id));

    return true;
  }

  async getTemplate(id: string): Promise<MessageTemplate | undefined> {
    return this.templates.get(id);
  }

  async getTemplateByName(name: string, locale?: string): Promise<MessageTemplate | undefined> {
    for (const template of this.templates.values()) {
      if (template.name === name) {
        if (!locale || !template.locale || template.locale === locale) {
          return template;
        }
      }
    }
    return undefined;
  }

  async listTemplates(category?: string): Promise<MessageTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (category) {
      templates = templates.filter((t) => t.category === category);
    }

    return templates.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async render(
    templateIdOrName: string,
    variables: Record<string, any>,
    options?: {
      locale?: string;
      channel?: MessageTemplate['channels'][number];
      fallbackLocale?: string;
    },
  ): Promise<RenderedMessage> {
    let template = await this.getTemplate(templateIdOrName);

    if (!template) {
      template = await this.getTemplateByName(templateIdOrName, options?.locale);
    }

    if (!template && options?.fallbackLocale) {
      template = await this.getTemplateByName(templateIdOrName, options?.fallbackLocale);
    }

    if (!template) {
      throw new Error(`Template not found: ${templateIdOrName}`);
    }

    const missingVariables = template.variables.filter((v) => !(v in variables));

    const renderedContent = this.renderContent(template.content, variables);
    const renderedSubject = template.subject
      ? this.renderContent(template.subject, variables)
      : undefined;

    const html = this.convertToHtml(renderedContent);

    return {
      subject: renderedSubject,
      content: renderedContent,
      html,
      variables,
      missingVariables,
    };
  }

  async renderAndTranslate(
    templateIdOrName: string,
    variables: Record<string, any>,
    locale: string = 'zh-CN',
  ): Promise<RenderedMessage> {
    const translatedVars: Record<string, any> = {};

    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === 'string' && value.startsWith('i18n.')) {
        const translationKey = value.substring(5);
        translatedVars[key] = await this.i18nService.translate(translationKey, locale as any);
      } else {
        translatedVars[key] = value;
      }
    }

    return this.render(templateIdOrName, translatedVars, { locale });
  }

  validateVariables(
    templateId: string,
    variables: Record<string, any>,
  ): { valid: boolean; missing: string[]; extra: string[] } {
    const template = this.templates.get(templateId);

    if (!template) {
      return { valid: false, missing: [], extra: [] };
    }

    const missing = template.variables.filter((v) => !(v in variables));
    const extra = Object.keys(variables).filter((v) => !template!.variables.includes(v));

    return {
      valid: missing.length === 0,
      missing,
      extra,
    };
  }

  private extractVariables(content: string): string[] {
    const variables = new Set<string>();
    let match;

    while ((match = this.variablePattern.exec(content)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }

  private renderContent(content: string, variables: Record<string, any>): string {
    return content.replace(this.variablePattern, (_, key) => {
      if (key in variables) {
        const value = variables[key];
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value);
      }
      return `{{${key}}}`;
    });
  }

  private convertToHtml(content: string): string {
    return content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  }

  private async loadTemplates(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const keys = await client.keys('message_template:*');

      for (const key of keys) {
        const data = await this.redisService.get(key);
        if (data) {
          const template = JSON.parse(data) as MessageTemplate;
          this.templates.set(template.id, template);
        }
      }

      this.logger.debug(`Loaded ${this.templates.size} message templates`);
    } catch (error) {
      this.logger.error('Failed to load templates:', error);
    }
  }

  private async persistTemplate(template: MessageTemplate): Promise<void> {
    await this.redisService.set(
      buildCacheKey('message_template', template.id),
      JSON.stringify(template),
    );
  }

  private initializeDefaultTemplates(): void {
    const defaults: Array<Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt' | 'variables'>> = [
      {
        name: 'welcome',
        category: 'auth',
        subject: '欢迎加入 {{appName}}',
        content: '您好 {{username}}，\n\n欢迎加入 **{{appName}}**！\n\n您的账户已创建成功。\n\n祝您使用愉快！',
        channels: ['email', 'in_app'],
      },
      {
        name: 'friend_request',
        category: 'social',
        subject: '新的好友请求',
        content: '{{fromUsername}} 想要添加您为好友。\n\n留言：{{message}}\n\n[点击查看]({{link}})',
        channels: ['push', 'in_app', 'websocket'],
      },
      {
        name: 'group_invite',
        category: 'social',
        subject: '群组邀请',
        content: '{{inviterName}} 邀请您加入群组 **{{groupName}}**\n\n[接受邀请]({{link}})',
        channels: ['push', 'in_app', 'websocket'],
      },
      {
        name: 'password_reset',
        category: 'auth',
        subject: '重置密码',
        content: '您好 {{username}}，\n\n您收到此邮件是因为您请求重置密码。\n\n验证码：**{{code}}**\n\n有效期：{{expiry}}分钟',
        channels: ['email'],
      },
      {
        name: 'new_message',
        category: 'message',
        content: '{{senderName}}：{{messagePreview}}',
        channels: ['push', 'websocket'],
      },
      {
        name: 'verification_code',
        category: 'auth',
        subject: '验证码',
        content: '您的验证码是：**{{code}}**\n\n有效期：{{expiry}}分钟',
        channels: ['sms', 'email'],
      },
    ];

    for (const template of defaults) {
      const existing = this.getTemplateByName(template.name);
      if (!existing) {
        this.createTemplate(template).catch((err) => {
          this.logger.error(`Failed to create default template ${template.name}:`, err);
        });
      }
    }
  }

  private generateId(): string {
    return `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function UseTemplate(templateName: string, variablesGetter?: (...args: any[]) => Record<string, any>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const templateService = (this as any).templateService as MessageTemplateService;

      if (!templateService) {
        return originalMethod.apply(this, args);
      }

      const variables = variablesGetter ? variablesGetter(...args) : {};
      const rendered = await templateService.render(templateName, variables);

      return originalMethod.apply(this, [...args, rendered]);
    };

    return descriptor;
  };
}
