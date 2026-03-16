import { ForbiddenException } from '@nestjs/common';
import { IoTController } from './iot.controller';

describe('IoTController', () => {
  function createController() {
    const iotService = {
      registerDevice: jest.fn(),
    };

    const controller = new IoTController(iotService as any);
    return { controller, iotService };
  }

  it('should reject registerDevice when request userId and body userId mismatch', async () => {
    const { controller, iotService } = createController();

    await expect(controller.registerDevice(
      { auth: { userId: 'user-1' } } as any,
      {
        deviceId: 'dev-1',
        type: 'sensor' as any,
        name: 'device-1',
        userId: 'user-2',
      },
    )).rejects.toBeInstanceOf(ForbiddenException);

    expect(iotService.registerDevice).not.toHaveBeenCalled();
  });

  it('should always persist current authenticated userId in registerDevice', async () => {
    const { controller, iotService } = createController();
    iotService.registerDevice.mockResolvedValue({ id: 'dev-1' });

    const result = await controller.registerDevice(
      { auth: { userId: 'user-1' } } as any,
      {
        deviceId: 'dev-1',
        type: 'sensor' as any,
        name: 'device-1',
        userId: 'user-1',
        metadata: { source: 'test' },
      },
    );

    expect(result).toEqual({ id: 'dev-1' });
    expect(iotService.registerDevice).toHaveBeenCalledWith({
      deviceId: 'dev-1',
      type: 'sensor',
      name: 'device-1',
      userId: 'user-1',
      metadata: { source: 'test' },
    });
  });
});

