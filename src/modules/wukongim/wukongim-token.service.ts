import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

interface WukongIMTokenPayload {
  uid: string;
  iat: number;
  exp?: number;
  nonce: string;
}

@Injectable()
export class WukongIMTokenService {
  private readonly logger = new Logger(WukongIMTokenService.name);
  private readonly tokenSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.tokenSecret = this.resolveTokenSecret();
  }

  generateToken(userId: string, expiresInSeconds?: number): string {
    const normalizedUserId = userId?.trim();
    if (!normalizedUserId) {
      throw new Error('WukongIM token userId is required');
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const payload: WukongIMTokenPayload = {
      uid: normalizedUserId,
      iat: issuedAt,
      nonce: randomBytes(8).toString('hex'),
    };

    if (typeof expiresInSeconds === 'number' && Number.isFinite(expiresInSeconds)) {
      payload.exp = issuedAt + Math.floor(expiresInSeconds);
    }

    const encodedPayload = this.encodePayload(payload);
    const signature = this.sign(encodedPayload);
    return `wk1.${encodedPayload}.${signature}`;
  }

  validateToken(token: string): { userId: string; valid: boolean } {
    const payload = this.decodeAndVerifyToken(token);
    if (!payload) {
      return {
        userId: '',
        valid: false,
      };
    }

    return {
      userId: payload.uid,
      valid: true,
    };
  }

  private resolveTokenSecret(): string {
    const configuredSecret = this.configService.get<string>('WUKONGIM_SECRET')
      || this.configService.get<string>('JWT_SECRET')
      || 'openchat-secret-key';

    if (configuredSecret === 'openchat-secret-key') {
      this.logger.warn('WukongIM token service is using fallback secret; set WUKONGIM_SECRET in production.');
    }

    return configuredSecret;
  }

  private decodeAndVerifyToken(token: string): WukongIMTokenPayload | null {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'wk1') {
      return null;
    }

    const [, encodedPayload, providedSignature] = parts;
    const expectedSignature = this.sign(encodedPayload);
    const providedBuffer = Buffer.from(providedSignature, 'base64url');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64url');

    if (
      providedBuffer.length !== expectedBuffer.length
      || !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      return null;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as Partial<WukongIMTokenPayload>;

      if (!payload.uid || typeof payload.uid !== 'string') {
        return null;
      }

      if (payload.exp !== undefined) {
        const now = Math.floor(Date.now() / 1000);
        if (!Number.isFinite(payload.exp) || now > payload.exp) {
          return null;
        }
      }

      return {
        uid: payload.uid,
        iat: Number(payload.iat) || 0,
        exp: payload.exp,
        nonce: typeof payload.nonce === 'string' ? payload.nonce : '',
      };
    } catch {
      return null;
    }
  }

  private encodePayload(payload: WukongIMTokenPayload): string {
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  }

  private sign(encodedPayload: string): string {
    return createHmac('sha256', this.tokenSecret)
      .update(encodedPayload)
      .digest('base64url');
  }
}
