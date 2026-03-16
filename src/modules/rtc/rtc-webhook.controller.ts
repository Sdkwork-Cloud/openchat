import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { RTCService } from './rtc.service';
import { AllowAnonymous } from '../../common/auth/guards/multi-auth.guard';

type RawBodyRequest = Request & { rawBody?: Buffer };

@ApiTags('rtc-webhook')
@AllowAnonymous()
@Controller('webhook/rtc/volcengine')
export class RTCWebhookController {
  private readonly logger = new Logger(RTCWebhookController.name);
  private readonly enabled: boolean;
  private readonly webhookSecret: string;
  private readonly timestampToleranceSeconds: number;

  constructor(
    private readonly rtcService: RTCService,
    private readonly configService: ConfigService,
  ) {
    this.enabled = this.readBooleanConfig(
      ['RTC_VOLCENGINE_WEBHOOK_ENABLED'],
      true,
    );
    this.webhookSecret = this.readConfig(
      ['RTC_VOLCENGINE_WEBHOOK_SECRET'],
      '',
    );
    this.timestampToleranceSeconds = this.readNumberConfig(
      ['RTC_VOLCENGINE_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS'],
      300,
      30,
    );
  }

  @Post('recording')
  @ApiOperation({
    summary: 'Receive Volcengine recording webhook callback and sync record state',
  })
  async handleRecordingWebhook(
    @Body() payload: Record<string, any>,
    @Headers('x-volc-signature') signature?: string,
    @Headers('x-volcengine-signature') signatureAlias?: string,
    @Headers('x-rtc-signature') rtcSignature?: string,
    @Headers('x-volc-timestamp') timestampHeader?: string,
    @Headers('x-rtc-timestamp') rtcTimestamp?: string,
    @Req() req?: RawBodyRequest,
  ): Promise<{ success: boolean; updated: boolean; recordId?: string; reason?: string }> {
    if (!this.enabled) {
      throw new BadRequestException('RTC webhook is disabled');
    }

    const resolvedSignature = signature
      || signatureAlias
      || rtcSignature
      || this.pickString(payload?.Signature, payload?.signature);
    const resolvedTimestamp = timestampHeader || rtcTimestamp;
    const isRtcEventEnvelope = this.isRtcEventEnvelope(payload);
    if (this.webhookSecret) {
      if (isRtcEventEnvelope) {
        this.validateRtcEventSignature(payload, resolvedSignature);
      } else {
        if (!resolvedSignature) {
          throw new UnauthorizedException('Missing webhook signature');
        }
        if (resolvedTimestamp) {
          this.validateTimestamp(resolvedTimestamp);
        }
        const rawBody = this.extractRawBody(payload, req);
        this.validateSignature(rawBody, resolvedSignature);
      }
    }

    const normalizedPayload = this.normalizeWebhookPayload(payload);
    try {
      const result = await this.rtcService.handleVolcengineRecordingWebhook(normalizedPayload);
      return {
        success: true,
        updated: result.updated,
        recordId: result.recordId,
        reason: result.reason,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process Volcengine recording webhook: ${message}`);
      return {
        success: true,
        updated: false,
        reason: 'processing_error',
      };
    }
  }

  private extractRawBody(payload: Record<string, any>, req?: RawBodyRequest): Buffer {
    if (req?.rawBody && Buffer.isBuffer(req.rawBody)) {
      return req.rawBody;
    }
    return Buffer.from(JSON.stringify(payload || {}), 'utf8');
  }

  private validateSignature(rawBody: Buffer, signature: string): void {
    const normalizedSignature = signature.replace(/^sha256=/i, '').trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(normalizedSignature)) {
      throw new UnauthorizedException('Invalid signature format');
    }
    const expectedHex = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    const expectedBuffer = Buffer.from(expectedHex, 'hex');
    const actualBuffer = Buffer.from(normalizedSignature, 'hex');
    const valid = expectedBuffer.length === actualBuffer.length
      && timingSafeEqual(expectedBuffer, actualBuffer);
    if (!valid) {
      throw new UnauthorizedException('Invalid signature');
    }
  }

  private validateRtcEventSignature(payload: Record<string, any>, providedSignature?: string): void {
    const signature = this.pickString(providedSignature, payload?.Signature, payload?.signature);
    if (!signature) {
      throw new UnauthorizedException('Missing webhook signature');
    }
    const normalizedSignature = signature.replace(/^sha256=/i, '').trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(normalizedSignature)) {
      throw new UnauthorizedException('Invalid signature format');
    }

    const eventType = this.pickString(payload?.EventType, payload?.eventType);
    const eventData = typeof payload?.EventData === 'string'
      ? payload.EventData
      : typeof payload?.eventData === 'string'
        ? payload.eventData
        : JSON.stringify(payload?.EventData ?? payload?.eventData ?? {});
    const eventTime = this.pickString(payload?.EventTime, payload?.eventTime);
    const eventId = this.pickString(payload?.EventId, payload?.eventId);
    const appId = this.pickString(payload?.AppId, payload?.appId);
    const version = this.pickString(payload?.Version, payload?.version);
    const nonce = this.pickString(payload?.Nonce, payload?.nonce);

    const items = [
      appId,
      eventData,
      eventId,
      eventTime,
      eventType,
      nonce,
      this.webhookSecret,
      version,
    ].map((item) => item || '');
    items.sort();

    const expectedHex = createHash('sha256').update(items.join('')).digest('hex');
    const expectedBuffer = Buffer.from(expectedHex, 'hex');
    const actualBuffer = Buffer.from(normalizedSignature, 'hex');
    const valid = expectedBuffer.length === actualBuffer.length
      && timingSafeEqual(expectedBuffer, actualBuffer);
    if (!valid) {
      throw new UnauthorizedException('Invalid signature');
    }
  }

  private validateTimestamp(rawValue: string): void {
    const timestampRaw = Number(rawValue);
    if (!Number.isFinite(timestampRaw)) {
      throw new UnauthorizedException('Invalid timestamp');
    }
    const timestampSeconds = timestampRaw > 1e12
      ? Math.floor(timestampRaw / 1000)
      : Math.floor(timestampRaw);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestampSeconds) > this.timestampToleranceSeconds) {
      throw new UnauthorizedException('Expired timestamp');
    }
  }

  private normalizeWebhookPayload(payload: Record<string, any>): Record<string, any> {
    if (!this.isRtcEventEnvelope(payload)) {
      return payload || {};
    }
    const eventData = this.extractEventData(payload);
    const normalized: Record<string, any> = {
      ...eventData,
    };
    const eventId = this.pickString(payload.EventId, payload.eventId);
    if (eventId && !normalized.eventId) {
      normalized.eventId = eventId;
    }
    const eventType = this.pickString(payload.EventType, payload.eventType);
    if (eventType && !normalized.eventType) {
      normalized.eventType = eventType;
    }
    const eventTime = this.pickString(payload.EventTime, payload.eventTime);
    if (eventTime && !normalized.eventTime) {
      normalized.eventTime = eventTime;
    }
    return normalized;
  }

  private extractEventData(payload: Record<string, any>): Record<string, any> {
    const raw = payload?.EventData ?? payload?.eventData;
    if (!raw) {
      return {};
    }
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Record<string, any>;
    }
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, any>;
        }
      } catch {
        return {};
      }
    }
    return {};
  }

  private isRtcEventEnvelope(payload: Record<string, any>): boolean {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return false;
    }
    return !!(
      (payload.EventType || payload.eventType)
      && (payload.EventTime || payload.eventTime)
      && (payload.EventId || payload.eventId)
      && (payload.EventData !== undefined || payload.eventData !== undefined)
    );
  }

  private pickString(...values: unknown[]): string {
    for (const value of values) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(Math.trunc(value));
      }
    }
    return '';
  }

  private readConfig(keys: string[], fallback: string): string {
    for (const key of keys) {
      const value = this.configService.get<string | number | boolean>(key);
      if (value === undefined || value === null) {
        continue;
      }
      const normalized = String(value).trim();
      if (normalized) {
        return normalized;
      }
    }
    return fallback;
  }

  private readNumberConfig(keys: string[], fallback: number, minValue: number): number {
    const rawValue = this.readConfig(keys, String(fallback));
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < minValue) {
      return fallback;
    }
    return Math.floor(parsed);
  }

  private readBooleanConfig(keys: string[], fallback: boolean): boolean {
    const rawValue = this.readConfig(keys, fallback ? 'true' : 'false').toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(rawValue);
  }
}
