import { Injectable } from '@nestjs/common';

@Injectable()
export class SanitizeUtil {
  private static readonly SENSITIVE_FIELDS = [
    'password',
    'passwordConfirm',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'apiSecret',
    'authorization',
    'creditCard',
    'cardNumber',
    'cvv',
    'ssn',
    'idCard',
    'bankAccount',
  ];

  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) {
      return email;
    }
    const [localPart, domain] = email.split('@');
    const maskedLocal = localPart.length > 2
      ? `${localPart.substring(0, 2)}***`
      : '***';
    return `${maskedLocal}@${domain}`;
  }

  static maskPhone(phone: string): string {
    if (!phone || phone.length < 7) {
      return phone;
    }
    return phone.replace(/(\d{3})\d{4}(\d+)/, '$1****$2');
  }

  static maskIdCard(idCard: string): string {
    if (!idCard || idCard.length < 8) {
      return idCard;
    }
    const start = idCard.substring(0, 4);
    const end = idCard.substring(idCard.length - 4);
    return `${start}********${end}`;
  }

  static maskBankCard(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 8) {
      return cardNumber;
    }
    const start = cardNumber.substring(0, 4);
    const end = cardNumber.substring(cardNumber.length - 4);
    return `${start}****${end}`;
  }

  static maskString(str: string, visibleChars: number = 4): string {
    if (!str || str.length <= visibleChars) {
      return '****';
    }
    const visible = str.substring(0, visibleChars);
    return `${visible}****`;
  }

  static sanitizeObject<T extends Record<string, any>>(
    obj: T,
    fields?: string[],
  ): Partial<T> {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sensitiveFields = fields || this.SENSITIVE_FIELDS;
    const result: Partial<T> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveFields.some(field =>
        lowerKey.includes(field.toLowerCase()),
      );

      if (isSensitive) {
        result[key as keyof T] = '******' as any;
      } else if (typeof value === 'object' && value !== null) {
        result[key as keyof T] = this.sanitizeObject(value, sensitiveFields) as any;
      } else {
        result[key as keyof T] = value;
      }
    }

    return result;
  }

  static sanitizeArray<T extends Record<string, any>>(
    arr: T[],
    fields?: string[],
  ): Partial<T>[] {
    return arr.map(item => this.sanitizeObject(item, fields));
  }

  static sanitizeForLog(data: any): any {
    if (!data) {
      return data;
    }

    if (typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return this.sanitizeArray(data);
    }

    return this.sanitizeObject(data);
  }

  static sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      if (urlObj.searchParams.has('token')) {
        urlObj.searchParams.set('token', '******');
      }
      if (urlObj.searchParams.has('key')) {
        urlObj.searchParams.set('key', '******');
      }
      if (urlObj.searchParams.has('secret')) {
        urlObj.searchParams.set('secret', '******');
      }
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  static sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    return this.sanitizeObject(headers, [
      'authorization',
      'cookie',
      'set-cookie',
      'x-api-key',
      'x-auth-token',
      'x-access-token',
    ]);
  }

  static sanitizeBody(body: any): any {
    return this.sanitizeObject(body);
  }

  static sanitizeQuery(query: Record<string, any>): Record<string, any> {
    return this.sanitizeObject(query, ['token', 'key', 'secret', 'password']);
  }
}
