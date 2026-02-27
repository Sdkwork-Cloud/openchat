import { AbstractStorageService } from '../../../core/AbstractStorageService';
import { Result } from '../../../core/types';
import { AppEvents, eventEmitter } from '../../../core/events';
import { Tool, ToolCategory, ToolHistory, PasswordOptions } from '../types';

const TOOLS: Tool[] = [
  // Utility
  { id: 'qr-code', name: '二维码生成器', description: '生成自定义二维码', icon: 'qr', category: 'utility', isPopular: true },
  { id: 'password', name: '密码生成器', description: '生成强密码', icon: 'lock', category: 'utility', isPopular: true },
  { id: 'uuid', name: 'UUID生成器', description: '生成唯一标识符', icon: 'fingerprint', category: 'utility' },
  { id: 'timestamp', name: '时间戳转换', description: '时间戳与日期互转', icon: 'clock', category: 'utility' },
  
  // Converter
  { id: 'json-formatter', name: 'JSON格式化', description: '美化和验证JSON', icon: 'braces', category: 'converter', isPopular: true },
  { id: 'base64', name: 'Base64编解码', description: 'Base64转换工具', icon: 'code', category: 'converter' },
  { id: 'url-encode', name: 'URL编解码', description: 'URL编码转换', icon: 'link', category: 'converter' },
  { id: 'case-converter', name: '大小写转换', description: '文本大小写转换', icon: 'type', category: 'converter' },
  
  // Generator
  { id: 'lorem-ipsum', name: '文本生成器', description: '生成占位文本', icon: 'file-text', category: 'generator' },
  { id: 'color-picker', name: '颜色选择器', description: '颜色值转换', icon: 'palette', category: 'generator', isNew: true },
  { id: 'hash', name: '哈希计算器', description: 'MD5/SHA计算', icon: 'hash', category: 'generator' },
  
  // Developer
  { id: 'regex', name: '正则测试', description: '正则表达式测试', icon: 'search', category: 'developer' },
  { id: 'diff', name: '文本对比', description: '对比文本差异', icon: 'git-compare', category: 'developer' },
  { id: 'html-escape', name: 'HTML转义', description: 'HTML实体编解码', icon: 'code-2', category: 'developer' },
  
  // AI
  { id: 'text-summarize', name: '文本摘要', description: 'AI自动生成摘要', icon: 'sparkles', category: 'ai', isNew: true },
  { id: 'code-explain', name: '代码解释', description: 'AI解释代码含义', icon: 'bot', category: 'ai', isNew: true },
];

class ToolsServiceImpl extends AbstractStorageService<ToolHistory> {
  constructor() {
    super('sys_tools_history_v1');
  }

  async getTools(category?: ToolCategory): Promise<Result<Tool[]>> {
    if (category) {
      return { success: true, data: TOOLS.filter(t => t.category === category) };
    }
    return { success: true, data: TOOLS };
  }

  async getToolById(id: string): Promise<Result<Tool | undefined>> {
    const tool = TOOLS.find(t => t.id === id);
    return { success: true, data: tool };
  }

  async getPopularTools(): Promise<Result<Tool[]>> {
    return { success: true, data: TOOLS.filter(t => t.isPopular) };
  }

  async getNewTools(): Promise<Result<Tool[]>> {
    return { success: true, data: TOOLS.filter(t => t.isNew) };
  }

  async addHistory(toolId: string, toolName: string, input?: string, output?: string): Promise<Result<ToolHistory>> {
    const history: ToolHistory = {
      id: `h_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      toolId,
      toolName,
      input,
      output,
      createTime: Date.now(),
      updateTime: Date.now()
    };
    await this.saveItem(history);
    eventEmitter.emit(AppEvents.DATA_UPDATED, { key: this.storageKey });
    return { success: true, data: history };
  }

  async getHistory(toolId?: string): Promise<Result<ToolHistory[]>> {
    let list = await this.loadData();
    if (toolId) {
      list = list.filter(h => h.toolId === toolId);
    }
    list.sort((a, b) => (b.createTime || 0) - (a.createTime || 0));
    return { success: true, data: list.slice(0, 20) };
  }

  // Tool Functions
  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  generatePassword(options: PasswordOptions): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let chars = '';
    if (options.includeUppercase) chars += uppercase;
    if (options.includeLowercase) chars += lowercase;
    if (options.includeNumbers) chars += numbers;
    if (options.includeSymbols) chars += symbols;
    
    if (chars === '') return '';
    
    let password = '';
    for (let i = 0; i < options.length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  formatJSON(json: string): string {
    try {
      const parsed = JSON.parse(json);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return json;
    }
  }

  validateJSON(json: string): boolean {
    try {
      JSON.parse(json);
      return true;
    } catch (e) {
      return false;
    }
  }

  encodeBase64(text: string): string {
    try {
      return btoa(unescape(encodeURIComponent(text)));
    } catch (e) {
      return '';
    }
  }

  decodeBase64(base64: string): string {
    try {
      return decodeURIComponent(escape(atob(base64)));
    } catch (e) {
      return '';
    }
  }

  encodeURL(text: string): string {
    return encodeURIComponent(text);
  }

  decodeURL(url: string): string {
    try {
      return decodeURIComponent(url);
    } catch (e) {
      return url;
    }
  }

  timestampToDate(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  }

  dateToTimestamp(dateStr: string): number {
    const date = new Date(dateStr);
    return Math.floor(date.getTime() / 1000);
  }

  convertCase(text: string, toCase: 'upper' | 'lower' | 'title' | 'camel'): string {
    switch (toCase) {
      case 'upper':
        return text.toUpperCase();
      case 'lower':
        return text.toLowerCase();
      case 'title':
        return text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
      case 'camel':
        return text.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
          index === 0 ? word.toLowerCase() : word.toUpperCase()
        ).replace(/\s+/g, '');
      default:
        return text;
    }
  }

  generateLoremIpsum(paragraphs: number = 3): string {
    const words = [
      'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
      'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
      'magna', 'aliqua', 'ut', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud'
    ];
    
    let result = '';
    for (let p = 0; p < paragraphs; p++) {
      const sentenceCount = Math.floor(Math.random() * 3) + 3;
      for (let s = 0; s < sentenceCount; s++) {
        const wordCount = Math.floor(Math.random() * 10) + 5;
        let sentence = '';
        for (let w = 0; w < wordCount; w++) {
          sentence += words[Math.floor(Math.random() * words.length)] + ' ';
        }
        result += sentence.charAt(0).toUpperCase() + sentence.slice(1).trim() + '. ';
      }
      result += '\n\n';
    }
    return result.trim();
  }

  escapeHTML(html: string): string {
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  unescapeHTML(html: string): string {
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");
  }

  calculateHash(text: string, algorithm: 'md5' | 'sha1' | 'sha256'): string {
    // Simplified hash calculation for demo
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  getCategoryLabel(category: ToolCategory): string {
    const labels: Record<ToolCategory, string> = {
      utility: '实用工具',
      converter: '转换工具',
      generator: '生成工具',
      developer: '开发工具',
      ai: 'AI工具'
    };
    return labels[category];
  }
}

export const ToolsService = new ToolsServiceImpl();
