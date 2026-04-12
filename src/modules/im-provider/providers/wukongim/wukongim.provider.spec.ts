import { WukongIMProvider } from './wukongim.provider';
import { WukongIMChannelType } from '../../../wukongim/wukongim.constants';
import { WukongIMTokenService } from '../../../wukongim/wukongim-token.service';
import { WukongIMUtils } from '../../../wukongim/wukongim.utils';

describe('WukongIMProvider', () => {
  async function createProvider() {
    const wukongIMClient = {
      sendMessage: jest.fn().mockResolvedValue({
        message_id: 'msg-1',
        client_msg_no: 'client-1',
      }),
      sendBatchMessages: jest.fn().mockResolvedValue([
        { message_id: 'msg-1', client_msg_no: 'client-1' },
        { message_id: 'msg-2', client_msg_no: 'client-2' },
      ]),
      upsertUserToken: jest.fn().mockResolvedValue({ status: 200 }),
    };
    const tokenService = new WukongIMTokenService({
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'WUKONGIM_SECRET') {
          return 'wukongim-provider-test-secret';
        }
        return defaultValue;
      }),
    } as any);

    const provider = new WukongIMProvider(wukongIMClient as any, tokenService);
    await provider.initialize({
      provider: 'wukongim',
      endpoint: 'http://127.0.0.1:15001',
    });

    return {
      provider,
      wukongIMClient,
    };
  }

  it('sends direct messages to the recipient uid channel', async () => {
    const { provider, wukongIMClient } = await createProvider();

    await provider.sendMessage({
      type: 'text',
      content: { text: 'hello bob' },
      from: '2',
      to: '3',
    });

    expect(wukongIMClient.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel_id: '3',
        channel_type: WukongIMChannelType.PERSON,
        from_uid: '2',
      }),
    );
    expect(
      WukongIMUtils.decodePayload(
        wukongIMClient.sendMessage.mock.calls[0][0].payload,
      ),
    ).toEqual({
      type: 'text',
      content: { text: 'hello bob' },
    });
  });

  it('keeps group sends on the room channel', async () => {
    const { provider, wukongIMClient } = await createProvider();

    await provider.sendMessage({
      type: 'text',
      content: { text: 'hello group' },
      from: '2',
      to: 'group-1',
      roomId: 'group-1',
    });

    expect(wukongIMClient.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel_id: 'group-1',
        channel_type: WukongIMChannelType.GROUP,
        from_uid: '2',
      }),
    );
  });

  it('uses recipient uid channels for direct items in batch sends', async () => {
    const { provider, wukongIMClient } = await createProvider();

    await provider.sendBatchMessages([
      {
        type: 'text',
        content: { text: 'hello bob' },
        from: '2',
        to: '3',
      },
      {
        type: 'text',
        content: { text: 'hello group' },
        from: '2',
        to: 'group-1',
        roomId: 'group-1',
      },
    ]);

    expect(wukongIMClient.sendBatchMessages).toHaveBeenCalledWith([
      expect.objectContaining({
        channel_id: '3',
        channel_type: WukongIMChannelType.PERSON,
        from_uid: '2',
      }),
      expect.objectContaining({
        channel_id: 'group-1',
        channel_type: WukongIMChannelType.GROUP,
        from_uid: '2',
      }),
    ]);
  });

  it('generates provider tokens that can be validated back to the issuing user', async () => {
    const { provider, wukongIMClient } = await createProvider();

    const token = await provider.generateToken('user-100');

    expect(wukongIMClient.upsertUserToken).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'user-100',
        token,
        device_flag: 1,
        device_level: 1,
      }),
    );
    await expect(provider.validateToken(token)).resolves.toEqual({
      userId: 'user-100',
      valid: true,
    });
  });

  it('registers callbacks and dispatches provider lifecycle and webhook events', async () => {
    const { provider } = await createProvider();
    const statusCallback = jest.fn();
    const userStatusCallback = jest.fn();
    const messageCallback = jest.fn();

    provider.subscribeToConnectionStatus(statusCallback);
    provider.subscribeToUserStatus(userStatusCallback);
    provider.subscribeToMessages(messageCallback);

    await provider.connect('user-200');
    provider.handleWebhookUserStatus({
      uid: 'user-201',
      online: true,
      timestamp: 1712400000000,
    });
    provider.handleWebhookMessage({
      message_id: 'msg-200',
      client_msg_no: 'client-msg-200',
      from_uid: 'user-200',
      channel_id: 'group-200',
      channel_type: WukongIMChannelType.GROUP,
      payload: WukongIMUtils.encodePayload({
        type: 'text',
        content: { text: 'hello webhook' },
      }),
      timestamp: 1712400001000,
    });

    expect(statusCallback).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'connected' }),
    );
    expect(userStatusCallback).toHaveBeenCalledWith('user-201', 'online');
    expect(messageCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'msg-200',
        from: 'user-200',
        to: 'group-200',
        roomId: 'group-200',
        type: 'text',
      }),
    );
  });
});
