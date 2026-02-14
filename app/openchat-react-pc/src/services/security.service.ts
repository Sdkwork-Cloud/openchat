/**
 * 安全服务
 *
 * 功能：
 * 1. 输入验证和净化
 * 2. XSS 防护
 * 3. CSRF 防护
 * 4. 密码强度验证
 * 5. 安全头部管理
 * 6. 内容安全策略(CSP)管理
 */

// 浏览器兼容的 EventEmitter 实现
class EventEmitter {
  private events: Map<string, Function[]>;

  constructor() {
    this.events = new Map();
  }

  on(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return this;
  }

  once(event: string, listener: Function): this {
    const onceListener = (...args: any[]) => {
      this.off(event, onceListener);
      listener(...args);
    };
    this.on(event, onceListener);
    return this;
  }

  off(event: string, listener: Function): this {
    if (this.events.has(event)) {
      const listeners = this.events.get(event)!;
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (this.events.has(event)) {
      const listeners = this.events.get(event)!;
      for (const listener of listeners) {
        listener(...args);
      }
      return true;
    }
    return false;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  getMaxListeners(): number {
    return 0;
  }

  setMaxListeners(_n: number): this {
    return this;
  }

  listeners(event: string): Function[] {
    return this.events.get(event) || [];
  }

  rawListeners(event: string): Function[] {
    return this.events.get(event) || [];
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0;
  }

  prependListener(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.unshift(listener);
    return this;
  }

  prependOnceListener(event: string, listener: Function): this {
    const onceListener = (...args: any[]) => {
      this.off(event, onceListener);
      listener(...args);
    };
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.unshift(onceListener);
    return this;
  }

  eventNames(): string[] {
    return Array.from(this.events.keys());
  }
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  value: any;
}

export interface PasswordStrengthResult {
  score: number; // 0-4
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'excellent';
  errors: string[];
  suggestions: string[];
}

export interface ContentSecurityPolicy {
  defaultSrc?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  fontSrc?: string[];
  connectSrc?: string[];
  mediaSrc?: string[];
  objectSrc?: string[];
  frameSrc?: string[];
  formAction?: string[];
  baseUri?: string[];
  reportUri?: string;
  reportOnly?: boolean;
}

export interface SecurityVulnerability {
  id: string;
  type: 'xss' | 'csrf' | 'injection' | 'auth' | 'sensitive-data' | 'broken-access' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: string;
  remediation: string;
  evidence?: string;
}

export interface SecurityScanResult {
  timestamp: number;
  duration: number;
  vulnerabilities: SecurityVulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export class SecurityService extends EventEmitter {
  private static instance: SecurityService;
  private csrfToken: string | null = null;
  private isInitialized = false;

  private constructor() {
    super();
  }

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * 初始化安全服务
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // 生成 CSRF 令牌
    this.generateCsrfToken();
    
    // 设置安全头部
    this.setupSecurityHeaders();
    
    // 设置内容安全策略(CSP)
    this.setContentSecurityPolicy({
      defaultSrc: ['\'self\''],
      scriptSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\''],
      imgSrc: ['\'self\'', 'data:', 'blob:'],
      fontSrc: ['\'self\'', 'data:'],
      connectSrc: ['\'self\''],
      mediaSrc: ['\'self\''],
      objectSrc: ['\'none\''],
      frameSrc: ['\'none\''],
      formAction: ['\'self\''],
      baseUri: ['\'self\''],
    });
    
    this.isInitialized = true;
    console.log('[SecurityService] Initialized');
  }

  /**
   * 验证输入值
   */
  validate(value: any, rules: ValidationRule): ValidationResult {
    const errors: string[] = [];

    // 验证必填
    if (rules.required && !this.isValuePresent(value)) {
      errors.push(rules.message || '此字段为必填项');
    }

    // 验证最小长度
    if (rules.minLength !== undefined && this.getValueLength(value) < rules.minLength) {
      errors.push(rules.message || `长度不能少于 ${rules.minLength} 个字符`);
    }

    // 验证最大长度
    if (rules.maxLength !== undefined && this.getValueLength(value) > rules.maxLength) {
      errors.push(rules.message || `长度不能超过 ${rules.maxLength} 个字符`);
    }

    // 验证正则表达式
    if (rules.pattern && !rules.pattern.test(String(value))) {
      errors.push(rules.message || '输入格式不正确');
    }

    // 验证自定义规则
    if (rules.custom && !rules.custom(value)) {
      errors.push(rules.message || '输入验证失败');
    }

    return {
      isValid: errors.length === 0,
      errors,
      value,
    };
  }

  /**
   * 批量验证
   */
  validateBatch(data: Record<string, any>, rules: Record<string, ValidationRule>): Record<string, ValidationResult> {
    const results: Record<string, ValidationResult> = {};

    Object.entries(rules).forEach(([field, fieldRules]) => {
      results[field] = this.validate(data[field], fieldRules);
    });

    return results;
  }

  /**
   * 验证密码强度
   */
  validatePasswordStrength(password: string): PasswordStrengthResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // 长度检查
    if (password.length < 8) {
      errors.push('密码长度不能少于8个字符');
    } else if (password.length >= 12) {
      score += 1;
    }

    // 小写字母
    if (!/[a-z]/.test(password)) {
      errors.push('密码必须包含至少一个小写字母');
    } else {
      score += 1;
    }

    // 大写字母
    if (!/[A-Z]/.test(password)) {
      errors.push('密码必须包含至少一个大写字母');
    } else {
      score += 1;
    }

    // 数字
    if (!/\d/.test(password)) {
      errors.push('密码必须包含至少一个数字');
    } else {
      score += 1;
    }

    // 特殊字符
    if (!/[@$!%*?&]/.test(password)) {
      errors.push('密码必须包含至少一个特殊字符(@$!%*?&)');
    } else {
      score += 1;
    }

    // 建议
    if (password.length < 12) {
      suggestions.push('建议使用12位以上密码增强安全性');
    }
    if (!/[^A-Za-z\d@$!%*?&]/.test(password)) {
      suggestions.push('可以添加更多类型的特殊字符');
    }
    if (!/[0-9]{2,}/.test(password)) {
      suggestions.push('建议使用多个数字');
    }
    if (!/[A-Z]{2,}/.test(password)) {
      suggestions.push('建议使用多个大写字母');
    }

    // 计算强度等级
    let strength: 'weak' | 'fair' | 'good' | 'strong' | 'excellent' = 'weak';
    switch (score) {
      case 0:
      case 1:
        strength = 'weak';
        break;
      case 2:
        strength = 'fair';
        break;
      case 3:
        strength = 'good';
        break;
      case 4:
        strength = 'strong';
        break;
      case 5:
        strength = 'excellent';
        break;
    }

    return {
      score: Math.min(score, 4),
      strength,
      errors,
      suggestions,
    };
  }

  /**
   * 净化输入，防止XSS
   */
  sanitizeInput(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  /**
   * 净化HTML，允许安全的HTML标签
   */
  sanitizeHtml(html: string, allowedTags: string[] = ['b', 'i', 'u', 'strong', 'em', 'br', 'p']): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const recursivelySanitize = (node: Node) => {
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.nodeType === Node.ELEMENT_NODE) {
          const element = child as Element;
          if (!allowedTags.includes(element.tagName.toLowerCase())) {
            const textNode = document.createTextNode(element.textContent || '');
            node.replaceChild(textNode, child);
            i--;
          } else {
            // 移除所有属性
            for (let j = element.attributes.length - 1; j >= 0; j--) {
              element.removeAttribute(element.attributes[j].name);
            }
            recursivelySanitize(child);
          }
        } else if (child.nodeType === Node.TEXT_NODE) {
          // 文本节点已经是安全的
        }
      }
    };

    recursivelySanitize(tempDiv);
    return tempDiv.innerHTML;
  }

  /**
   * 生成 CSRF 令牌
   */
  generateCsrfToken(): string {
    const token = `${Date.now()}-${Math.random().toString(36).substr(2, 15)}-${Math.random().toString(36).substr(2, 15)}`;
    this.csrfToken = token;
    localStorage.setItem('csrf_token', token);
    return token;
  }

  /**
   * 获取 CSRF 令牌
   */
  getCsrfToken(): string {
    if (!this.csrfToken) {
      this.csrfToken = localStorage.getItem('csrf_token') || this.generateCsrfToken();
    }
    return this.csrfToken;
  }

  /**
   * 验证 CSRF 令牌
   */
  validateCsrfToken(token: string): boolean {
    return token === this.getCsrfToken();
  }

  /**
   * 生成内容安全策略(CSP)
   */
  generateContentSecurityPolicy(policy: ContentSecurityPolicy = {}): string {
    const defaultPolicy: ContentSecurityPolicy = {
      defaultSrc: ['\'self\''],
      scriptSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\''],
      imgSrc: ['\'self\'', 'data:', 'blob:'],
      fontSrc: ['\'self\'', 'data:'],
      connectSrc: ['\'self\''],
      mediaSrc: ['\'self\''],
      objectSrc: ['\'none\''],
      frameSrc: ['\'none\''],
      formAction: ['\'self\''],
      baseUri: ['\'self\''],
      ...policy,
    };

    const directives = Object.entries(defaultPolicy)
      .filter(([_, value]) => value !== undefined)
      .map(([directive, value]) => {
        if (directive === 'reportUri' || directive === 'reportOnly') {
          return `${directive} ${value}`;
        }
        return `${directive} ${(value as string[]).join(' ')}`;
      });

    return directives.join('; ');
  }

  /**
   * 设置内容安全策略(CSP)
   */
  setContentSecurityPolicy(policy: ContentSecurityPolicy = {}): void {
    const cspHeader = this.generateContentSecurityPolicy(policy);
    const metaTag = document.createElement('meta');
    metaTag.httpEquiv = 'Content-Security-Policy';
    metaTag.content = cspHeader;
    
    // 移除旧的 CSP 标签
    const existingTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
    existingTags.forEach(tag => tag.remove());
    
    // 添加新的 CSP 标签
    document.head.appendChild(metaTag);
    
    this.emit('cspUpdated', cspHeader);
  }

  /**
   * 设置安全相关的 HTTP 头部
   */
  setupSecurityHeaders(): void {
    // 这些头部通常由服务器设置，但在客户端也可以通过 meta 标签设置部分
    const headers = [
      {
        name: 'X-Content-Type-Options',
        content: 'nosniff',
      },
      {
        name: 'X-Frame-Options',
        content: 'DENY',
      },
      {
        name: 'X-XSS-Protection',
        content: '1; mode=block',
      },
      {
        name: 'Referrer-Policy',
        content: 'strict-origin-when-cross-origin',
      },
      {
        name: 'Permissions-Policy',
        content: 'camera=(), microphone=(), geolocation=()',
      },
    ];

    headers.forEach(header => {
      const metaTag = document.createElement('meta');
      metaTag.httpEquiv = header.name;
      metaTag.content = header.content;
      
      // 移除旧的标签
      const existingTags = document.querySelectorAll(`meta[http-equiv="${header.name}"]`);
      existingTags.forEach(tag => tag.remove());
      
      // 添加新的标签
      document.head.appendChild(metaTag);
    });

    this.emit('securityHeadersUpdated', headers);
  }

  /**
   * 验证 URL 的安全性
   */
  validateUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const allowedProtocols = ['http:', 'https:'];
      return allowedProtocols.includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }

  /**
   * 验证电子邮件地址
   */
  validateEmail(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  /**
   * 验证手机号码（中国大陆）
   */
  validatePhone(phone: string): boolean {
    const phonePattern = /^1[3-9]\d{9}$/;
    return phonePattern.test(phone);
  }

  /**
   * 生成安全的随机字符串
   */
  generateSecureRandomString(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
      result += charset[array[i] % charset.length];
    }
    
    return result;
  }

  /**
   * 哈希数据（用于非密码数据）
   */
  async hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 检查值是否存在
   */
  private isValuePresent(value: any): boolean {
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return true;
  }

  /**
   * 获取值的长度
   */
  private getValueLength(value: any): number {
    if (value === null || value === undefined) {
      return 0;
    }
    if (typeof value === 'string') {
      return value.length;
    }
    if (Array.isArray(value)) {
      return value.length;
    }
    if (typeof value === 'object') {
      return Object.keys(value).length;
    }
    return String(value).length;
  }

  /**
   * 获取安全统计
   */
  getSecurityStats() {
    return {
      csrfToken: this.csrfToken ? 'set' : 'not set',
      initialized: this.isInitialized,
      timestamp: Date.now(),
    };
  }

  /**
   * 执行安全扫描
   */
  async scanSecurityVulnerabilities(): Promise<SecurityScanResult> {
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];

    // 扫描DOM中的XSS漏洞
    vulnerabilities.push(...this.scanForXSSVulnerabilities());

    // 检查敏感数据暴露
    vulnerabilities.push(...this.scanForSensitiveDataExposure());

    // 验证CSP配置
    vulnerabilities.push(...this.scanForCSPIssues());

    // 检查认证和授权问题
    vulnerabilities.push(...this.scanForAuthIssues());

    // 检查URL和链接安全性
    vulnerabilities.push(...this.scanForUrlVulnerabilities());

    const duration = Date.now() - startTime;

    // 生成扫描结果
    const result: SecurityScanResult = {
      timestamp: Date.now(),
      duration,
      vulnerabilities,
      summary: {
        total: vulnerabilities.length,
        critical: vulnerabilities.filter(v => v.severity === 'critical').length,
        high: vulnerabilities.filter(v => v.severity === 'high').length,
        medium: vulnerabilities.filter(v => v.severity === 'medium').length,
        low: vulnerabilities.filter(v => v.severity === 'low').length,
      },
    };

    this.emit('securityScanComplete', result);
    return result;
  }

  /**
   * 扫描DOM中的XSS漏洞
   */
  private scanForXSSVulnerabilities(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // 检查危险的HTML属性
    const dangerousAttributes = ['onerror', 'onload', 'onclick', 'onmouseover', 'onkeydown', 'onfocus'];
    const elements = document.querySelectorAll('*');

    elements.forEach((element, index) => {
      dangerousAttributes.forEach(attr => {
        if (element.hasAttribute(attr)) {
          vulnerabilities.push({
            id: `xss-${index}`,
            type: 'xss',
            severity: 'high',
            description: `发现危险的事件处理器属性: ${attr}`,
            location: `${element.tagName.toLowerCase()}[${attr}]`,
            remediation: '移除危险的事件处理器属性，使用安全的事件监听器',
            evidence: element.outerHTML,
          });
        }
      });
    });

    // 检查危险的URL
    const links = document.querySelectorAll('a[href], iframe[src], script[src]');
    links.forEach((link, index) => {
      const url = link.getAttribute('href') || link.getAttribute('src');
      if (url && (url.startsWith('javascript:') || url.includes('data:text/html'))) {
        vulnerabilities.push({
          id: `xss-url-${index}`,
          type: 'xss',
          severity: 'critical',
          description: `发现危险的URL: ${url.substring(0, 50)}...`,
          location: `${link.tagName.toLowerCase()}[${link.hasAttribute('href') ? 'href' : 'src'}]`,
          remediation: '移除危险的URL，使用安全的链接',
          evidence: link.outerHTML,
        });
      }
    });

    return vulnerabilities;
  }

  /**
   * 检查敏感数据暴露
   */
  private scanForSensitiveDataExposure(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // 检查localStorage中的敏感数据
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          // 检查是否包含敏感信息
          const sensitivePatterns = [
            /token|secret|password|key|auth|session|credential/i,
            /\b[A-Fa-f0-9]{32}\b/, // MD5
            /\b[A-Fa-f0-9]{40}\b/, // SHA1
            /\b[A-Fa-f0-9]{64}\b/, // SHA256
          ];

          for (const pattern of sensitivePatterns) {
            if (pattern.test(key) || pattern.test(value)) {
              vulnerabilities.push({
                id: `sensitive-data-${i}`,
                type: 'sensitive-data',
                severity: 'medium',
                description: `在localStorage中发现可能的敏感数据: ${key}`,
                location: `localStorage[${key}]`,
                remediation: '避免在localStorage中存储敏感数据，使用安全的存储方案',
                evidence: `Key: ${key}, Value: ${value.substring(0, 50)}...`,
              });
              break;
            }
          }
        }
      }
    }

    return vulnerabilities;
  }

  /**
   * 验证CSP配置
   */
  private scanForCSPIssues(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // 检查是否存在CSP配置
    const cspMetaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
    if (cspMetaTags.length === 0) {
      vulnerabilities.push({
        id: 'csp-missing',
        type: 'other',
        severity: 'medium',
        description: '未发现Content-Security-Policy配置',
        location: 'HTML头部',
        remediation: '添加Content-Security-Policy配置以防止XSS攻击',
      });
    } else {
      // 检查CSP配置是否过于宽松
      cspMetaTags.forEach((tag, index) => {
        const content = tag.getAttribute('content');
        if (content) {
          if (content.includes("'unsafe-eval'")) {
            vulnerabilities.push({
              id: `csp-unsafe-eval-${index}`,
              type: 'xss',
              severity: 'high',
              description: 'CSP配置包含unsafe-eval，允许执行动态代码',
              location: 'Content-Security-Policy',
              remediation: '移除unsafe-eval，使用安全的代码执行方式',
              evidence: content,
            });
          }

          if (content.includes("'unsafe-inline'")) {
            vulnerabilities.push({
              id: `csp-unsafe-inline-${index}`,
              type: 'xss',
              severity: 'medium',
              description: 'CSP配置包含unsafe-inline，允许内联脚本',
              location: 'Content-Security-Policy',
              remediation: '移除unsafe-inline，使用脚本哈希或nonce',
              evidence: content,
            });
          }

          if (content.includes('*')) {
            vulnerabilities.push({
              id: `csp-wildcard-${index}`,
              type: 'other',
              severity: 'low',
              description: 'CSP配置包含通配符(*)，可能过于宽松',
              location: 'Content-Security-Policy',
              remediation: '使用更具体的源，避免使用通配符',
              evidence: content,
            });
          }
        }
      });
    }

    return vulnerabilities;
  }

  /**
   * 检查认证和授权问题
   */
  private scanForAuthIssues(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // 检查是否使用HTTPS
    if (window.location.protocol !== 'https:') {
      vulnerabilities.push({
        id: 'auth-https',
        type: 'auth',
        severity: 'high',
        description: '当前连接不是HTTPS，可能导致认证信息被窃取',
        location: 'window.location.protocol',
        remediation: '使用HTTPS连接保护敏感信息',
        evidence: `Protocol: ${window.location.protocol}`,
      });
    }

    // 检查CSRF令牌
    if (!this.csrfToken) {
      vulnerabilities.push({
        id: 'auth-csrf',
        type: 'csrf',
        severity: 'medium',
        description: '未设置CSRF令牌',
        location: 'SecurityService.csrfToken',
        remediation: '生成并使用CSRF令牌保护表单提交',
      });
    }

    return vulnerabilities;
  }

  /**
   * 检查URL和链接安全性
   */
  private scanForUrlVulnerabilities(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // 检查页面URL
    const currentUrl = window.location.href;
    if (currentUrl.includes('password=') || currentUrl.includes('token=') || currentUrl.includes('secret=')) {
      vulnerabilities.push({
        id: 'url-sensitive',
        type: 'sensitive-data',
        severity: 'high',
        description: 'URL中包含可能的敏感数据',
        location: 'window.location.href',
        remediation: '避免在URL中传递敏感数据，使用POST请求或其他安全方式',
        evidence: currentUrl,
      });
    }

    // 检查链接
    const links = document.querySelectorAll('a[href]');
    links.forEach((link, index) => {
      const href = link.getAttribute('href');
      if (href) {
        if (href.includes('javascript:') || href.includes('data:text/html')) {
          vulnerabilities.push({
            id: `url-javascript-${index}`,
            type: 'xss',
            severity: 'high',
            description: `发现危险的JavaScript链接: ${href.substring(0, 50)}...`,
            location: `a[href]`,
            remediation: '移除危险的JavaScript链接，使用安全的链接',
            evidence: href,
          });
        }

        try {
          const url = new URL(href, window.location.origin);
          if (url.protocol !== 'https:' && url.protocol !== 'http:') {
            vulnerabilities.push({
              id: `url-protocol-${index}`,
              type: 'other',
              severity: 'low',
              description: `发现非HTTP/HTTPS链接: ${url.protocol}`,
              location: `a[href]`,
              remediation: '使用HTTP/HTTPS链接，避免使用其他协议',
              evidence: href,
            });
          }
        } catch {
          // 无效的URL，忽略
        }
      }
    });

    return vulnerabilities;
  }
}

export const securityService = SecurityService.getInstance();

/**
 * 全局安全验证函数
 */
export function validateInput(value: any, rules: ValidationRule): ValidationResult {
  return securityService.validate(value, rules);
}

/**
 * 全局密码强度验证函数
 */
export function validatePassword(password: string): PasswordStrengthResult {
  return securityService.validatePasswordStrength(password);
}

/**
 * 全局输入净化函数
 */
export function sanitizeInput(input: string): string {
  return securityService.sanitizeInput(input);
}

export default SecurityService;