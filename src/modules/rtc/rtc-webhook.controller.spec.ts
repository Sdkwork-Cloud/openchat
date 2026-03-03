import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac } from 'crypto';
import { RTCWebhookController } from './rtc-webhook.controller';
import { RTCService } from './rtc.service';

describe('RTCWebhookController', () => {
  function createController(configOverrides: Record<string, unknown> = {}) {
    const rtcService = {
      handleVolcengineRecordingWebhook: jest.fn(),
    } as unknown as RTCService;

    const configService = {
      get: jest.fn((key: string) => configOverrides[key]),
    } as unknown as ConfigService;

    return {
      controller: new RTCWebhookController(rtcService, configService),
      rtcService,
    };
  }

  it('should reject request when webhook endpoint is disabled', async () => {
    const { controller } = createController({
      RTC_VOLCENGINE_WEBHOOK_ENABLED: false,
    });

    await expect(controller.handleRecordingWebhook({
      taskId: 'task-disabled-1',
    } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should process webhook without signature when no secret is configured', async () => {
    const { controller, rtcService } = createController();
    (rtcService.handleVolcengineRecordingWebhook as jest.Mock).mockResolvedValue({
      updated: true,
      recordId: 'record-1',
    });

    const payload = {
      taskId: 'task-1',
      status: 'completed',
    };
    const result = await controller.handleRecordingWebhook(payload);

    expect(result).toEqual({
      success: true,
      updated: true,
      recordId: 'record-1',
      reason: undefined,
    });
    expect((rtcService.handleVolcengineRecordingWebhook as jest.Mock).mock.calls).toEqual([[payload]]);
  });

  it('should validate signature when webhook secret is configured', async () => {
    const secret = 'rtc-webhook-secret';
    const { controller, rtcService } = createController({
      RTC_VOLCENGINE_WEBHOOK_SECRET: secret,
    });
    (rtcService.handleVolcengineRecordingWebhook as jest.Mock).mockResolvedValue({
      updated: true,
      recordId: 'record-2',
    });

    const payload = {
      taskId: 'task-2',
      status: 'completed',
    };
    const rawBody = Buffer.from(JSON.stringify(payload), 'utf8');
    const signature = createHmac('sha256', secret).update(rawBody).digest('hex');
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const result = await controller.handleRecordingWebhook(
      payload,
      `sha256=${signature}`,
      undefined,
      undefined,
      timestamp,
      undefined,
      { rawBody } as any,
    );

    expect(result.updated).toBe(true);
    expect((rtcService.handleVolcengineRecordingWebhook as jest.Mock).mock.calls).toEqual([[payload]]);
  });

  it('should reject webhook when signature is invalid', async () => {
    const { controller } = createController({
      RTC_VOLCENGINE_WEBHOOK_SECRET: 'rtc-webhook-secret',
    });

    await expect(controller.handleRecordingWebhook(
      { taskId: 'task-3' } as any,
      'sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      undefined,
      undefined,
      Math.floor(Date.now() / 1000).toString(),
      undefined,
      { rawBody: Buffer.from('{"taskId":"task-3"}', 'utf8') } as any,
    )).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should return success envelope when webhook processing throws', async () => {
    const { controller, rtcService } = createController();
    (rtcService.handleVolcengineRecordingWebhook as jest.Mock).mockRejectedValue(new Error('sync failed'));

    const result = await controller.handleRecordingWebhook({
      taskId: 'task-4',
      status: 'completed',
    } as any);

    expect(result).toEqual({
      success: true,
      updated: false,
      reason: 'processing_error',
    });
  });

  it('should verify volcengine event-envelope signature and forward parsed EventData', async () => {
    const secret = 'rtc-event-envelope-secret';
    const { controller, rtcService } = createController({
      RTC_VOLCENGINE_WEBHOOK_SECRET: secret,
    });
    (rtcService.handleVolcengineRecordingWebhook as jest.Mock).mockResolvedValue({
      updated: true,
      recordId: 'record-event-1',
    });

    const envelope: Record<string, any> = {
      EventType: 'RecordComplete',
      EventData: JSON.stringify({
        TaskId: 'task-event-1',
        Status: 'completed',
        FilePath: 'https://example.com/event.mp4',
      }),
      EventTime: '2026-03-03T03:00:00+08:00',
      EventId: 'event-1',
      AppId: 'rtc-app-1',
      Version: '2020-12-01',
      Nonce: 'nonce-abc',
    };
    const signItems = [
      envelope.EventType,
      envelope.EventData,
      envelope.EventTime,
      envelope.EventId,
      envelope.AppId,
      envelope.Version,
      envelope.Nonce,
      secret,
    ].sort();
    envelope.Signature = createHash('sha256').update(signItems.join('')).digest('hex');

    const result = await controller.handleRecordingWebhook(envelope as any);

    expect(result).toEqual({
      success: true,
      updated: true,
      recordId: 'record-event-1',
      reason: undefined,
    });
    expect((rtcService.handleVolcengineRecordingWebhook as jest.Mock).mock.calls).toEqual([[
      expect.objectContaining({
        TaskId: 'task-event-1',
        Status: 'completed',
        FilePath: 'https://example.com/event.mp4',
        eventId: 'event-1',
        eventType: 'RecordComplete',
      }),
    ]]);
  });
});
