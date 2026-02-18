import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  pbkdf2Sync,
  scryptSync,
  timingSafeEqual,
  CipherGCM,
  DecipherGCM,
} from 'crypto';

export type EncryptionAlgorithm = 'aes-256-gcm' | 'aes-256-cbc' | 'aes-128-gcm' | 'chacha20-poly1305';
export type HashAlgorithm = 'sha256' | 'sha512' | 'sha384' | 'md5';
export type KeyDerivationFunction = 'pbkdf2' | 'scrypt' | 'hkdf';

export interface EncryptionOptions {
  algorithm?: EncryptionAlgorithm;
  iv?: Buffer;
  aad?: Buffer;
  tagLength?: number;
}

export interface DecryptionOptions {
  algorithm?: EncryptionAlgorithm;
  iv: Buffer;
  authTag?: Buffer;
  aad?: Buffer;
}

export interface KeyDerivationOptions {
  kdf?: KeyDerivationFunction;
  salt?: Buffer;
  iterations?: number;
  keyLength?: number;
}

export interface HashOptions {
  algorithm?: HashAlgorithm;
  encoding?: 'hex' | 'base64' | 'buffer';
}

@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private masterKey: Buffer;
  private readonly defaultAlgorithm: EncryptionAlgorithm = 'aes-256-gcm';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const key = this.configService.get<string>('ENCRYPTION_MASTER_KEY');
    if (key) {
      this.masterKey = Buffer.from(key, 'hex');
      if (this.masterKey.length !== 32) {
        throw new Error('Master key must be 32 bytes (64 hex characters)');
      }
    } else {
      this.masterKey = randomBytes(32);
      this.logger.warn('No master key configured, using random key. Data will not persist across restarts.');
    }
    this.logger.log('EncryptionService initialized');
  }

  encrypt(
    plaintext: string | Buffer,
    key?: Buffer,
    options?: EncryptionOptions,
  ): { ciphertext: Buffer; iv: Buffer; authTag?: Buffer } {
    const encryptionKey = key || this.masterKey;
    const algorithm = options?.algorithm || this.defaultAlgorithm;
    const iv = options?.iv || randomBytes(this.getIvLength(algorithm));

    const cipher = createCipheriv(algorithm, encryptionKey, iv);
    const isAEAD = this.isAEAD(algorithm);

    if (isAEAD && options?.aad) {
      (cipher as CipherGCM).setAAD(options.aad);
    }

    const plaintextBuffer = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext, 'utf8');

    const encrypted = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);

    const result: { ciphertext: Buffer; iv: Buffer; authTag?: Buffer } = {
      ciphertext: encrypted,
      iv,
    };

    if (isAEAD) {
      result.authTag = (cipher as CipherGCM).getAuthTag();
    }

    return result;
  }

  decrypt(
    ciphertext: Buffer,
    key: Buffer,
    options: DecryptionOptions,
  ): Buffer {
    const algorithm = options.algorithm || this.defaultAlgorithm;
    const isAEAD = this.isAEAD(algorithm);

    const decipher = createDecipheriv(algorithm, key, options.iv);

    if (isAEAD && options.authTag) {
      (decipher as DecipherGCM).setAuthTag(options.authTag);
    }

    if (isAEAD && options.aad) {
      (decipher as DecipherGCM).setAAD(options.aad);
    }

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  encryptString(
    plaintext: string,
    key?: Buffer,
    options?: EncryptionOptions,
  ): string {
    const result = this.encrypt(plaintext, key, options);
    const parts = [result.iv.toString('base64'), result.ciphertext.toString('base64')];

    if (result.authTag) {
      parts.push(result.authTag.toString('base64'));
    }

    return parts.join('.');
  }

  decryptString(
    encrypted: string,
    key?: Buffer,
    options?: Omit<DecryptionOptions, 'iv' | 'authTag'>,
  ): string {
    const parts = encrypted.split('.');
    const iv = Buffer.from(parts[0], 'base64');
    const ciphertext = Buffer.from(parts[1], 'base64');
    const authTag = parts[2] ? Buffer.from(parts[2], 'base64') : undefined;

    const decrypted = this.decrypt(ciphertext, key || this.masterKey, {
      ...options,
      iv,
      authTag,
    });

    return decrypted.toString('utf8');
  }

  hash(
    data: string | Buffer,
    options?: HashOptions,
  ): string | Buffer {
    const algorithm = options?.algorithm || 'sha256';
    const encoding = options?.encoding || 'hex';

    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const hash = createHash(algorithm).update(dataBuffer).digest();

    if (encoding === 'buffer') {
      return hash;
    }

    return hash.toString(encoding);
  }

  hmac(
    data: string | Buffer,
    key: string | Buffer,
    options?: HashOptions,
  ): string | Buffer {
    const algorithm = options?.algorithm || 'sha256';
    const encoding = options?.encoding || 'hex';

    const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key, 'utf8');
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');

    const hmac = createHmac(algorithm, keyBuffer).update(dataBuffer).digest();

    if (encoding === 'buffer') {
      return hmac;
    }

    return hmac.toString(encoding);
  }

  deriveKey(
    password: string,
    options?: KeyDerivationOptions,
  ): Buffer {
    const kdf = options?.kdf || 'pbkdf2';
    const salt = options?.salt || randomBytes(16);
    const iterations = options?.iterations || 100000;
    const keyLength = options?.keyLength || 32;

    switch (kdf) {
      case 'pbkdf2':
        return pbkdf2Sync(password, salt, iterations, keyLength, 'sha256');
      case 'scrypt':
        return scryptSync(password, salt, keyLength, {
          N: 16384,
          r: 8,
          p: 1,
          maxmem: 64 * 1024 * 1024,
        });
      default:
        throw new Error(`Unsupported KDF: ${kdf}`);
    }
  }

  compareHash(
    data: string | Buffer,
    hashedValue: string | Buffer,
    options?: HashOptions,
  ): boolean {
    const computed = this.hash(data, { ...options, encoding: 'buffer' });
    const hashedBuffer = Buffer.isBuffer(hashedValue)
      ? hashedValue
      : Buffer.from(hashedValue, 'hex');

    if (computed.length !== hashedBuffer.length) {
      return false;
    }

    return timingSafeEqual(computed as Buffer, hashedBuffer);
  }

  compareHmac(
    data: string | Buffer,
    hmacValue: string | Buffer,
    key: string | Buffer,
    options?: HashOptions,
  ): boolean {
    const computed = this.hmac(data, key, { ...options, encoding: 'buffer' });
    const hmacBuffer = Buffer.isBuffer(hmacValue)
      ? hmacValue
      : Buffer.from(hmacValue, 'hex');

    if (computed.length !== hmacBuffer.length) {
      return false;
    }

    return timingSafeEqual(computed as Buffer, hmacBuffer);
  }

  generateKey(length: number = 32): Buffer {
    return randomBytes(length);
  }

  generateKeyString(length: number = 32, encoding: BufferEncoding = 'hex'): string {
    return randomBytes(length).toString(encoding);
  }

  generateIV(algorithm?: EncryptionAlgorithm): Buffer {
    const ivLength = this.getIvLength(algorithm || this.defaultAlgorithm);
    return randomBytes(ivLength);
  }

  rotateKey(oldKey: Buffer, newKey: Buffer, encryptedData: string): string {
    const decrypted = this.decryptString(encryptedData, oldKey);
    return this.encryptString(decrypted, newKey);
  }

  private getIvLength(algorithm: EncryptionAlgorithm): number {
    switch (algorithm) {
      case 'aes-256-gcm':
      case 'aes-128-gcm':
      case 'aes-256-cbc':
        return 16;
      case 'chacha20-poly1305':
        return 12;
      default:
        return 16;
    }
  }

  private isAEAD(algorithm: EncryptionAlgorithm): boolean {
    return algorithm.includes('gcm') || algorithm === 'chacha20-poly1305';
  }
}

export function Encrypted(fieldKey?: string) {
  return function (target: any, propertyKey: string) {
    const privateKey = `_${propertyKey}`;

    Object.defineProperty(target, propertyKey, {
      get() {
        return this[privateKey];
      },
      set(value: string) {
        if (value && !value.includes('.')) {
          const encryptionService = (this as any).encryptionService as EncryptionService;
          if (encryptionService) {
            this[privateKey] = encryptionService.encryptString(value);
            return;
          }
        }
        this[privateKey] = value;
      },
    });
  };
}

export function Hashed(options?: HashOptions) {
  return function (target: any, propertyKey: string) {
    const privateKey = `_${propertyKey}`;

    Object.defineProperty(target, propertyKey, {
      get() {
        return this[privateKey];
      },
      set(value: string) {
        if (value && !this[privateKey]) {
          const encryptionService = (this as any).encryptionService as EncryptionService;
          if (encryptionService) {
            this[privateKey] = encryptionService.hash(value, options) as string;
            return;
          }
        }
        this[privateKey] = value;
      },
    });
  };
}
