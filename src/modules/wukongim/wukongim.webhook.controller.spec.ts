import { WukongIMWebhookController } from './wukongim.webhook.controller';
import { WukongIMWebhookEvent } from './wukongim.constants';

describe('WukongIMWebhookController', () => {
  function createController() {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'WUKONGIM_WEBHOOK_ENABLED') {
          return true;
        }
        if (key === 'WUKONGIM_WEBHOOK_SECRET') {
          return '';
        }
        return undefined;
      }),
    };
    const messageRepository = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    };
    const messageReceiptRepository = {
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    };
    const provider = {
      handleWebhookUserStatus: jest.fn(),
      handleWebhookMessage: jest.fn(),
    };

    const controller = new WukongIMWebhookController(
      configService as any,
      messageRepository as any,
      messageReceiptRepository as any,
      undefined,
      provider as any,
    );

    return {
      controller,
      provider,
    };
  }

  it('forwards online/offline lifecycle events to the WukongIM provider bridge', async () => {
    const { controller, provider } = createController();

    await controller.receiveWebhook({
      event: WukongIMWebhookEvent.CONNECT,
      timestamp: Date.now(),
      data: {
        uid: 'user-10',
        device_flag: 1,
        online: true,
        timestamp: Date.now(),
      },
    });

    await controller.receiveWebhook({
      event: WukongIMWebhookEvent.USER_OFFLINE,
      timestamp: Date.now(),
      data: {
        uid: 'user-10',
      },
    } as any);

    expect(provider.handleWebhookUserStatus).toHaveBeenNthCalledWith(1, {
      uid: 'user-10',
      online: true,
      timestamp: expect.any(Number),
    });
    expect(provider.handleWebhookUserStatus).toHaveBeenNthCalledWith(2, {
      uid: 'user-10',
      online: false,
      timestamp: expect.any(Number),
    });
  });

  it('forwards realtime message webhook events to the WukongIM provider bridge', async () => {
    const { controller, provider } = createController();

    await controller.receiveWebhook({
      event: WukongIMWebhookEvent.MESSAGE,
      timestamp: Date.now(),
      data: {
        message_id: 'msg-10',
        client_msg_no: 'client-10',
        from_uid: 'user-10',
        channel_id: 'group-10',
        channel_type: 2,
        payload: 'eyJ0eXBlIjoidGV4dCIsImNvbnRlbnQiOnsidGV4dCI6ImhlbGxvIn19',
        timestamp: Date.now(),
      },
    } as any);

    expect(provider.handleWebhookMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message_id: 'msg-10',
        from_uid: 'user-10',
        channel_id: 'group-10',
      }),
    );
  });
});
