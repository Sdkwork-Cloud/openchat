import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { Request } from 'express';
import { TokenBlacklistService } from '../../../common/auth/token-blacklist.service';

interface JwtPayload {
  userId?: string;
  username?: string;
  deviceId?: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: unknown;
}

@Injectable()
export class JwtPassportStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true,
    } as StrategyOptionsWithRequest);
  }

  async validate(request: Request, payload: JwtPayload) {
    const token = this.extractToken(request);
    if (token && await this.tokenBlacklistService.isBlacklisted(token)) {
      throw new UnauthorizedException('Token is blacklisted');
    }

    const userId = payload.userId;
    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const deviceId = this.extractDeviceId(payload);

    return {
      ...payload,
      userId,
      deviceId,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    };
  }

  private extractDeviceId(payload: JwtPayload): string | undefined {
    const candidates: Array<unknown> = [payload.deviceId];
    for (const candidate of candidates) {
      if (typeof candidate !== 'string') {
        continue;
      }
      const normalized = candidate.trim();
      if (!normalized) {
        continue;
      }
      if (/^[A-Za-z0-9._:-]{1,64}$/.test(normalized)) {
        return normalized;
      }
    }
    return undefined;
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
