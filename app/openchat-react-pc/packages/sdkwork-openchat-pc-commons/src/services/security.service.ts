/**
 * 瀹夊叏鏈嶅姟
 *
 * 鍔熻兘锛? * 1. 杈撳叆楠岃瘉鍜屽噣鍖? * 2. XSS 闃叉姢
 * 3. CSRF 闃叉姢
 * 4. 瀵嗙爜寮哄害楠岃瘉
 * 5. 瀹夊叏澶撮儴绠＄悊
 * 6. 鍐呭瀹夊叏绛栫暐(CSP)绠＄悊
 */

// 娴忚鍣ㄥ吋瀹圭殑 EventEmitter 瀹炵幇
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
  styleSrcElem?: string[];
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

const CSP_DIRECTIVE_MAP: Record<
  Exclude<keyof ContentSecurityPolicy, 'reportUri' | 'reportOnly'>,
  string
> = {
  defaultSrc: 'default-src',
  scriptSrc: 'script-src',
  styleSrc: 'style-src',
  styleSrcElem: 'style-src-elem',
  imgSrc: 'img-src',
  fontSrc: 'font-src',
  connectSrc: 'connect-src',
  mediaSrc: 'media-src',
  objectSrc: 'object-src',
  frameSrc: 'frame-src',
  formAction: 'form-action',
  baseUri: 'base-uri',
};

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
   * 鍒濆鍖栧畨鍏ㄦ湇鍔?   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // 鐢熸垚 CSRF 浠ょ墝
    this.generateCsrfToken();
    
    // 璁剧疆瀹夊叏澶撮儴
    this.setupSecurityHeaders();
    
    // 璁剧疆鍐呭瀹夊叏绛栫暐(CSP)
    this.setContentSecurityPolicy({
      defaultSrc: ['\'self\''],
      scriptSrc: ['\'self\'', '\'unsafe-inline\'', '\'unsafe-eval\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
      styleSrcElem: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
      imgSrc: ['\'self\'', 'data:', 'blob:'],
      fontSrc: ['\'self\'', 'data:', 'https://fonts.gstatic.com'],
      connectSrc: ['\'self\'', 'ws:', 'wss:', 'http:', 'https:'],
      mediaSrc: ['\'self\'', 'blob:', 'https:'],
      objectSrc: ['\'none\''],
      frameSrc: ['\'none\''],
      formAction: ['\'self\''],
      baseUri: ['\'self\''],
    }, { onlyIfMissing: true });
    
    this.isInitialized = true;
    console.log('[SecurityService] Initialized');
  }

  /**
   * 楠岃瘉杈撳叆鍊?   */
  validate(value: any, rules: ValidationRule): ValidationResult {
    const errors: string[] = [];

    // 楠岃瘉蹇呭～
    if (rules.required && !this.isValuePresent(value)) {
      errors.push(rules.message || '姝ゅ瓧娈典负蹇呭～椤?);
    }

    // 楠岃瘉鏈€灏忛暱搴?    if (rules.minLength !== undefined && this.getValueLength(value) < rules.minLength) {
      errors.push(rules.message || `闀垮害涓嶈兘灏戜簬 ${rules.minLength} 涓瓧绗);
    }

    // 楠岃瘉鏈€澶ч暱搴?    if (rules.maxLength !== undefined && this.getValueLength(value) > rules.maxLength) {
      errors.push(rules.message || `闀垮害涓嶈兘瓒呰繃 ${rules.maxLength} 涓瓧绗);
    }

    // 楠岃瘉姝ｅ垯琛ㄨ揪寮?    if (rules.pattern && !rules.pattern.test(String(value))) {
      errors.push(rules.message || '杈撳叆鏍煎紡涓嶆纭?);
    }

    // 楠岃瘉鑷畾涔夎鍒?    if (rules.custom && !rules.custom(value)) {
      errors.push(rules.message || '杈撳叆楠岃瘉澶辫触');
    }

    return {
      isValid: errors.length === 0,
      errors,
      value,
    };
  }

  /**
   * 鎵归噺楠岃瘉
   */
  validateBatch(data: Record<string, any>, rules: Record<string, ValidationRule>): Record<string, ValidationResult> {
    const results: Record<string, ValidationResult> = {};

    Object.entries(rules).forEach(([field, fieldRules]) => {
      results[field] = this.validate(data[field], fieldRules);
    });

    return results;
  }

  /**
   * 楠岃瘉瀵嗙爜寮哄害
   */
  validatePasswordStrength(password: string): PasswordStrengthResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // 闀垮害妫€鏌?    if (password.length < 8) {
      errors.push('瀵嗙爜闀垮害涓嶈兘灏戜簬8涓瓧绗?);
    } else if (password.length >= 12) {
      score += 1;
    }

    // 灏忓啓瀛楁瘝
    if (!/[a-z]/.test(password)) {
      errors.push('瀵嗙爜蹇呴』鍖呭惈鑷冲皯涓€涓皬鍐欏瓧姣?);
    } else {
      score += 1;
    }

    // 澶у啓瀛楁瘝
    if (!/[A-Z]/.test(password)) {
      errors.push('瀵嗙爜蹇呴』鍖呭惈鑷冲皯涓€涓ぇ鍐欏瓧姣?);
    } else {
      score += 1;
    }

    // 鏁板瓧
    if (!/\d/.test(password)) {
      errors.push('瀵嗙爜蹇呴』鍖呭惈鑷冲皯涓€涓暟瀛?);
    } else {
      score += 1;
    }

    // 鐗规畩瀛楃
    if (!/[@$!%*?&]/.test(password)) {
      errors.push('瀵嗙爜蹇呴』鍖呭惈鑷冲皯涓€涓壒娈婂瓧绗?@$!%*?&)');
    } else {
      score += 1;
    }

    // 寤鸿
    if (password.length < 12) {
      suggestions.push('寤鸿浣跨敤12浣嶄互涓婂瘑鐮佸寮哄畨鍏ㄦ€?);
    }
    if (!/[^A-Za-z\d@$!%*?&]/.test(password)) {
      suggestions.push('鍙互娣诲姞鏇村绫诲瀷鐨勭壒娈婂瓧绗?);
    }
    if (!/[0-9]{2,}/.test(password)) {
      suggestions.push('寤鸿浣跨敤澶氫釜鏁板瓧');
    }
    if (!/[A-Z]{2,}/.test(password)) {
      suggestions.push('寤鸿浣跨敤澶氫釜澶у啓瀛楁瘝');
    }

    // 璁＄畻寮哄害绛夌骇
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
   * 鍑€鍖栬緭鍏ワ紝闃叉XSS
   */
  sanitizeInput(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  /**
   * 鍑€鍖朒TML锛屽厑璁稿畨鍏ㄧ殑HTML鏍囩
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
            // 绉婚櫎鎵€鏈夊睘鎬?            for (let j = element.attributes.length - 1; j >= 0; j--) {
              element.removeAttribute(element.attributes[j].name);
            }
            recursivelySanitize(child);
          }
        } else if (child.nodeType === Node.TEXT_NODE) {
          // 鏂囨湰鑺傜偣宸茬粡鏄畨鍏ㄧ殑
        }
      }
    };

    recursivelySanitize(tempDiv);
    return tempDiv.innerHTML;
  }

  /**
   * 鐢熸垚 CSRF 浠ょ墝
   */
  generateCsrfToken(): string {
    const token = `${Date.now()}-${Math.random().toString(36).substr(2, 15)}-${Math.random().toString(36).substr(2, 15)}`;
    this.csrfToken = token;
    localStorage.setItem('csrf_token', token);
    return token;
  }

  /**
   * 鑾峰彇 CSRF 浠ょ墝
   */
  getCsrfToken(): string {
    if (!this.csrfToken) {
      this.csrfToken = localStorage.getItem('csrf_token') || this.generateCsrfToken();
    }
    return this.csrfToken;
  }

  /**
   * 楠岃瘉 CSRF 浠ょ墝
   */
  validateCsrfToken(token: string): boolean {
    return token === this.getCsrfToken();
  }

  /**
   * 鐢熸垚鍐呭瀹夊叏绛栫暐(CSP)
   */
  generateContentSecurityPolicy(policy: ContentSecurityPolicy = {}): string {
    const defaultPolicy: ContentSecurityPolicy = {
      defaultSrc: ['\'self\''],
      scriptSrc: ['\'self\'', '\'unsafe-inline\'', '\'unsafe-eval\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
      styleSrcElem: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
      imgSrc: ['\'self\'', 'data:', 'blob:'],
      fontSrc: ['\'self\'', 'data:', 'https://fonts.gstatic.com'],
      connectSrc: ['\'self\'', 'ws:', 'wss:', 'http:', 'https:'],
      mediaSrc: ['\'self\'', 'blob:', 'https:'],
      objectSrc: ['\'none\''],
      frameSrc: ['\'none\''],
      formAction: ['\'self\''],
      baseUri: ['\'self\''],
      ...policy,
    };

    const directives = Object.entries(defaultPolicy)
      .filter(([_, value]) => value !== undefined)
      .flatMap(([directive, value]) => {
        if (directive === 'reportOnly') {
          return [];
        }

        if (directive === 'reportUri') {
          return [`report-uri ${value}`];
        }

        const mappedDirective = CSP_DIRECTIVE_MAP[
          directive as keyof typeof CSP_DIRECTIVE_MAP
        ];
        if (!mappedDirective) {
          return [];
        }

        return [`${mappedDirective} ${(value as string[]).join(' ')}`];
      });

    return directives.join('; ');
  }

  /**
   * 璁剧疆鍐呭瀹夊叏绛栫暐(CSP)
   */
  setContentSecurityPolicy(
    policy: ContentSecurityPolicy = {},
    options: { onlyIfMissing?: boolean } = {},
  ): void {
    const cspHeader = this.generateContentSecurityPolicy(policy);
    const existingTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');

    if (options.onlyIfMissing && existingTags.length > 0) {
      return;
    }

    const metaTag = document.createElement('meta');
    metaTag.httpEquiv = 'Content-Security-Policy';
    metaTag.content = cspHeader;

    // 绉婚櫎鏃х殑 CSP 鏍囩
    existingTags.forEach(tag => tag.remove());

    // 娣诲姞鏂扮殑 CSP 鏍囩
    document.head.appendChild(metaTag);

    this.emit('cspUpdated', cspHeader);
  }

  /**
   * 璁剧疆瀹夊叏鐩稿叧鐨?HTTP 澶撮儴
   */
  setupSecurityHeaders(): void {
    // 前端只能通过 meta 设置少量安全策略；X-Frame-Options 等必须由服务端 HTTP Header 下发
    const headers = [
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
      
      // 绉婚櫎鏃х殑鏍囩
      const existingTags = document.querySelectorAll(`meta[http-equiv="${header.name}"]`);
      existingTags.forEach(tag => tag.remove());
      
      // 娣诲姞鏂扮殑鏍囩
      document.head.appendChild(metaTag);
    });

    this.emit('securityHeadersUpdated', headers);
  }

  /**
   * 楠岃瘉 URL 鐨勫畨鍏ㄦ€?   */
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
   * 楠岃瘉鐢靛瓙閭欢鍦板潃
   */
  validateEmail(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  /**
   * 楠岃瘉鎵嬫満鍙风爜锛堜腑鍥藉ぇ闄嗭級
   */
  validatePhone(phone: string): boolean {
    const phonePattern = /^1[3-9]\d{9}$/;
    return phonePattern.test(phone);
  }

  /**
   * 鐢熸垚瀹夊叏鐨勯殢鏈哄瓧绗︿覆
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
   * 鍝堝笇鏁版嵁锛堢敤浜庨潪瀵嗙爜鏁版嵁锛?   */
  async hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 妫€鏌ュ€兼槸鍚﹀瓨鍦?   */
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
   * 鑾峰彇鍊肩殑闀垮害
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
   * 鑾峰彇瀹夊叏缁熻
   */
  getSecurityStats() {
    return {
      csrfToken: this.csrfToken ? 'set' : 'not set',
      initialized: this.isInitialized,
      timestamp: Date.now(),
    };
  }

  /**
   * 鎵ц瀹夊叏鎵弿
   */
  async scanSecurityVulnerabilities(): Promise<SecurityScanResult> {
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];

    // 鎵弿DOM涓殑XSS婕忔礊
    vulnerabilities.push(...this.scanForXSSVulnerabilities());

    // 妫€鏌ユ晱鎰熸暟鎹毚闇?    vulnerabilities.push(...this.scanForSensitiveDataExposure());

    // 楠岃瘉CSP閰嶇疆
    vulnerabilities.push(...this.scanForCSPIssues());

    // 妫€鏌ヨ璇佸拰鎺堟潈闂
    vulnerabilities.push(...this.scanForAuthIssues());

    // 妫€鏌RL鍜岄摼鎺ュ畨鍏ㄦ€?    vulnerabilities.push(...this.scanForUrlVulnerabilities());

    const duration = Date.now() - startTime;

    // 鐢熸垚鎵弿缁撴灉
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
   * 鎵弿DOM涓殑XSS婕忔礊
   */
  private scanForXSSVulnerabilities(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // 妫€鏌ュ嵄闄╃殑HTML灞炴€?    const dangerousAttributes = ['onerror', 'onload', 'onclick', 'onmouseover', 'onkeydown', 'onfocus'];
    const elements = document.querySelectorAll('*');

    elements.forEach((element, index) => {
      dangerousAttributes.forEach(attr => {
        if (element.hasAttribute(attr)) {
          vulnerabilities.push({
            id: `xss-${index}`,
            type: 'xss',
            severity: 'high',
            description: `鍙戠幇鍗遍櫓鐨勪簨浠跺鐞嗗櫒灞炴€? ${attr}`,
            location: `${element.tagName.toLowerCase()}[${attr}]`,
            remediation: '绉婚櫎鍗遍櫓鐨勪簨浠跺鐞嗗櫒灞炴€э紝浣跨敤瀹夊叏鐨勪簨浠剁洃鍚櫒',
            evidence: element.outerHTML,
          });
        }
      });
    });

    // 妫€鏌ュ嵄闄╃殑URL
    const links = document.querySelectorAll('a[href], iframe[src], script[src]');
    links.forEach((link, index) => {
      const url = link.getAttribute('href') || link.getAttribute('src');
      if (url && (url.startsWith('javascript:') || url.includes('data:text/html'))) {
        vulnerabilities.push({
          id: `xss-url-${index}`,
          type: 'xss',
          severity: 'critical',
          description: `鍙戠幇鍗遍櫓鐨刄RL: ${url.substring(0, 50)}...`,
          location: `${link.tagName.toLowerCase()}[${link.hasAttribute('href') ? 'href' : 'src'}]`,
          remediation: '绉婚櫎鍗遍櫓鐨刄RL锛屼娇鐢ㄥ畨鍏ㄧ殑閾炬帴',
          evidence: link.outerHTML,
        });
      }
    });

    return vulnerabilities;
  }

  /**
   * 妫€鏌ユ晱鎰熸暟鎹毚闇?   */
  private scanForSensitiveDataExposure(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // 妫€鏌ocalStorage涓殑鏁忔劅鏁版嵁
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          // 妫€鏌ユ槸鍚﹀寘鍚晱鎰熶俊鎭?          const sensitivePatterns = [
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
                description: `鍦╨ocalStorage涓彂鐜板彲鑳界殑鏁忔劅鏁版嵁: ${key}`,
                location: `localStorage[${key}]`,
                remediation: '閬垮厤鍦╨ocalStorage涓瓨鍌ㄦ晱鎰熸暟鎹紝浣跨敤瀹夊叏鐨勫瓨鍌ㄦ柟妗?,
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
   * 楠岃瘉CSP閰嶇疆
   */
  private scanForCSPIssues(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // 妫€鏌ユ槸鍚﹀瓨鍦–SP閰嶇疆
    const cspMetaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
    if (cspMetaTags.length === 0) {
      vulnerabilities.push({
        id: 'csp-missing',
        type: 'other',
        severity: 'medium',
        description: '鏈彂鐜癈ontent-Security-Policy閰嶇疆',
        location: 'HTML澶撮儴',
        remediation: '娣诲姞Content-Security-Policy閰嶇疆浠ラ槻姝SS鏀诲嚮',
      });
    } else {
      // 妫€鏌SP閰嶇疆鏄惁杩囦簬瀹芥澗
      cspMetaTags.forEach((tag, index) => {
        const content = tag.getAttribute('content');
        if (content) {
          if (content.includes("'unsafe-eval'")) {
            vulnerabilities.push({
              id: `csp-unsafe-eval-${index}`,
              type: 'xss',
              severity: 'high',
              description: 'CSP閰嶇疆鍖呭惈unsafe-eval锛屽厑璁告墽琛屽姩鎬佷唬鐮?,
              location: 'Content-Security-Policy',
              remediation: '绉婚櫎unsafe-eval锛屼娇鐢ㄥ畨鍏ㄧ殑浠ｇ爜鎵ц鏂瑰紡',
              evidence: content,
            });
          }

          if (content.includes("'unsafe-inline'")) {
            vulnerabilities.push({
              id: `csp-unsafe-inline-${index}`,
              type: 'xss',
              severity: 'medium',
              description: 'CSP閰嶇疆鍖呭惈unsafe-inline锛屽厑璁稿唴鑱旇剼鏈?,
              location: 'Content-Security-Policy',
              remediation: '绉婚櫎unsafe-inline锛屼娇鐢ㄨ剼鏈搱甯屾垨nonce',
              evidence: content,
            });
          }

          if (content.includes('*')) {
            vulnerabilities.push({
              id: `csp-wildcard-${index}`,
              type: 'other',
              severity: 'low',
              description: 'CSP閰嶇疆鍖呭惈閫氶厤绗?*)锛屽彲鑳借繃浜庡鏉?,
              location: 'Content-Security-Policy',
              remediation: '浣跨敤鏇村叿浣撶殑婧愶紝閬垮厤浣跨敤閫氶厤绗?,
              evidence: content,
            });
          }
        }
      });
    }

    return vulnerabilities;
  }

  /**
   * 妫€鏌ヨ璇佸拰鎺堟潈闂
   */
  private scanForAuthIssues(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // 妫€鏌ユ槸鍚︿娇鐢℉TTPS
    if (window.location.protocol !== 'https:') {
      vulnerabilities.push({
        id: 'auth-https',
        type: 'auth',
        severity: 'high',
        description: '褰撳墠杩炴帴涓嶆槸HTTPS锛屽彲鑳藉鑷磋璇佷俊鎭绐冨彇',
        location: 'window.location.protocol',
        remediation: '浣跨敤HTTPS杩炴帴淇濇姢鏁忔劅淇℃伅',
        evidence: `Protocol: ${window.location.protocol}`,
      });
    }

    // 妫€鏌SRF浠ょ墝
    if (!this.csrfToken) {
      vulnerabilities.push({
        id: 'auth-csrf',
        type: 'csrf',
        severity: 'medium',
        description: '鏈缃瓹SRF浠ょ墝',
        location: 'SecurityService.csrfToken',
        remediation: '鐢熸垚骞朵娇鐢–SRF浠ょ墝淇濇姢琛ㄥ崟鎻愪氦',
      });
    }

    return vulnerabilities;
  }

  /**
   * 妫€鏌RL鍜岄摼鎺ュ畨鍏ㄦ€?   */
  private scanForUrlVulnerabilities(): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // 妫€鏌ラ〉闈RL
    const currentUrl = window.location.href;
    if (currentUrl.includes('password=') || currentUrl.includes('token=') || currentUrl.includes('secret=')) {
      vulnerabilities.push({
        id: 'url-sensitive',
        type: 'sensitive-data',
        severity: 'high',
        description: 'URL涓寘鍚彲鑳界殑鏁忔劅鏁版嵁',
        location: 'window.location.href',
        remediation: '閬垮厤鍦║RL涓紶閫掓晱鎰熸暟鎹紝浣跨敤POST璇锋眰鎴栧叾浠栧畨鍏ㄦ柟寮?,
        evidence: currentUrl,
      });
    }

    // 妫€鏌ラ摼鎺?    const links = document.querySelectorAll('a[href]');
    links.forEach((link, index) => {
      const href = link.getAttribute('href');
      if (href) {
        if (href.includes('javascript:') || href.includes('data:text/html')) {
          vulnerabilities.push({
            id: `url-javascript-${index}`,
            type: 'xss',
            severity: 'high',
            description: `鍙戠幇鍗遍櫓鐨凧avaScript閾炬帴: ${href.substring(0, 50)}...`,
            location: `a[href]`,
            remediation: '绉婚櫎鍗遍櫓鐨凧avaScript閾炬帴锛屼娇鐢ㄥ畨鍏ㄧ殑閾炬帴',
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
              description: `鍙戠幇闈濰TTP/HTTPS閾炬帴: ${url.protocol}`,
              location: `a[href]`,
              remediation: '浣跨敤HTTP/HTTPS閾炬帴锛岄伩鍏嶄娇鐢ㄥ叾浠栧崗璁?,
              evidence: href,
            });
          }
        } catch {
          // 鏃犳晥鐨刄RL锛屽拷鐣?        }
      }
    });

    return vulnerabilities;
  }
}

export const securityService = SecurityService.getInstance();

/**
 * 鍏ㄥ眬瀹夊叏楠岃瘉鍑芥暟
 */
export function validateInput(value: any, rules: ValidationRule): ValidationResult {
  return securityService.validate(value, rules);
}

/**
 * 鍏ㄥ眬瀵嗙爜寮哄害楠岃瘉鍑芥暟
 */
export function validatePassword(password: string): PasswordStrengthResult {
  return securityService.validatePasswordStrength(password);
}

/**
 * 鍏ㄥ眬杈撳叆鍑€鍖栧嚱鏁? */
export function sanitizeInput(input: string): string {
  return securityService.sanitizeInput(input);
}

export default SecurityService;
