import { ForbiddenException } from '@nestjs/common';
import { ThirdPartyController } from './third-party.controller';

describe('ThirdPartyController', () => {
  function createController() {
    const thirdPartyService = {
      sendMessage: jest.fn(),
      syncContacts: jest.fn(),
      getContact: jest.fn(),
      getMessageStatus: jest.fn(),
    };

    const controller = new ThirdPartyController(thirdPartyService as any);
    return { controller, thirdPartyService };
  }

  it('should reject sendMessage when fromUserId mismatches request userId', async () => {
    const { controller, thirdPartyService } = createController();

    await expect(controller.sendMessage(
      'telegram',
      { auth: { userId: 'user-1' } } as any,
      {
        fromUserId: 'user-2',
        toUserId: 'target-1',
        content: { text: 'hello' },
        type: 'text',
        status: 'sending',
      } as any,
    )).rejects.toBeInstanceOf(ForbiddenException);

    expect(thirdPartyService.sendMessage).not.toHaveBeenCalled();
  });

  it('should overwrite fromUserId with authenticated userId', async () => {
    const { controller, thirdPartyService } = createController();
    const sent = { id: 'msg-1', platform: 'telegram' };
    thirdPartyService.sendMessage.mockResolvedValue(sent);

    const result = await controller.sendMessage(
      'telegram',
      { auth: { userId: 'user-1' } } as any,
      {
        fromUserId: 'user-1',
        toUserId: 'target-1',
        content: { text: 'hello' },
        type: 'text',
        status: 'sending',
      } as any,
    );

    expect(result).toEqual(sent);
    expect(thirdPartyService.sendMessage).toHaveBeenCalledWith(
      'telegram',
      expect.objectContaining({
        fromUserId: 'user-1',
        toUserId: 'target-1',
      }),
    );
  });

  it('should sync contacts using authenticated userId', async () => {
    const { controller, thirdPartyService } = createController();
    thirdPartyService.syncContacts.mockResolvedValue([{ id: 'c1' }]);

    const result = await controller.syncContacts(
      'whatsapp',
      { auth: { userId: 'user-9' } } as any,
    );

    expect(result).toEqual([{ id: 'c1' }]);
    expect(thirdPartyService.syncContacts).toHaveBeenCalledWith('whatsapp', 'user-9');
  });
});

