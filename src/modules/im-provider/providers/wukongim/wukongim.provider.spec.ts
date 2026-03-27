import { WukongIMProvider } from './wukongim.provider';
import { WukongIMChannelType } from '../../../wukongim/wukongim.constants';
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
    };

    const provider = new WukongIMProvider(wukongIMClient as any);
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
});
