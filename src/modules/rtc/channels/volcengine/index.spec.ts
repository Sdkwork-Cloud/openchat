import { VolcengineRTCChannel } from './index';

describe('VolcengineRTCChannel recording OpenAPI mapping', () => {
  function createChannel() {
    const channel = new VolcengineRTCChannel();
    return channel;
  }

  async function initChannel(channel: VolcengineRTCChannel, appId: string = 'rtc-app-id') {
    await channel.initialize({
      provider: 'volcengine',
      appId,
      appKey: 'app-key',
      appSecret: 'app-secret-for-tests',
      region: 'cn-north-1',
      accessKeyId: 'ak-test',
      secretAccessKey: 'sk-test',
      recordStartOptions: {
        StorageConfig: {
          Vendor: 'tos',
        },
      },
    } as any);
  }

  it('should call StartRecord with AppId/RoomId/TaskId payload keys', async () => {
    const channel = createChannel();
    await initChannel(channel, 'rtc-app-id');

    const invokeSpy = jest.spyOn(channel as any, 'invokeRtcOpenApi').mockResolvedValue({
      ResponseMetadata: { RequestId: 'request-1' },
      Result: {
        TaskId: 'task-start-1',
        Status: 'recording',
      },
    });

    const task = await channel.startRecording({
      roomId: 'room-1',
      userId: 'user-1',
    });

    expect(task.taskId).toBe('task-start-1');
    expect(task.status).toBe('recording');
    expect(invokeSpy).toHaveBeenCalledWith(expect.objectContaining({
      action: 'StartRecord',
      version: '2023-11-01',
      method: 'POST',
      payload: expect.objectContaining({
        AppId: 'rtc-app-id',
        RoomId: 'room-1',
        TaskId: expect.any(String),
      }),
    }));
  });

  it('should reject invalid taskId format before calling OpenAPI', async () => {
    const channel = createChannel();
    await initChannel(channel, 'rtc-app-id');
    const invokeSpy = jest.spyOn(channel as any, 'invokeRtcOpenApi').mockResolvedValue({});

    await expect(channel.startRecording({
      roomId: 'room-1',
      userId: 'user-1',
      taskId: 'invalid task id',
    })).rejects.toThrow('taskId format');

    expect(invokeSpy).not.toHaveBeenCalled();
  });

  it('should require StorageConfig for StartRecord by default', async () => {
    const channel = createChannel();
    await channel.initialize({
      provider: 'volcengine',
      appId: 'rtc-app-id',
      appKey: 'app-key',
      appSecret: 'app-secret-for-tests',
      region: 'cn-north-1',
      accessKeyId: 'ak-test',
      secretAccessKey: 'sk-test',
    } as any);

    const invokeSpy = jest.spyOn(channel as any, 'invokeRtcOpenApi').mockResolvedValue({});
    await expect(channel.startRecording({
      roomId: 'room-no-storage',
      userId: 'user-1',
    })).rejects.toThrow('StorageConfig');
    expect(invokeSpy).not.toHaveBeenCalled();
  });

  it('should call GetRecordTask with AppId/RoomId/TaskId payload keys', async () => {
    const channel = createChannel();
    await initChannel(channel, '123456');

    const invokeSpy = jest.spyOn(channel as any, 'invokeRtcOpenApi').mockResolvedValue({
      ResponseMetadata: { RequestId: 'request-2' },
      Result: {
        TaskId: 'task-query-1',
        RoomId: 'room-query-1',
        Status: 'completed',
      },
    });

    const task = await channel.getRecordingTask('room-query-1', 'task-query-1');

    expect(task).not.toBeNull();
    expect(task?.taskId).toBe('task-query-1');
    expect(task?.roomId).toBe('room-query-1');
    expect(invokeSpy).toHaveBeenCalledWith(expect.objectContaining({
      action: 'GetRecordTask',
      version: '2023-11-01',
      method: 'GET',
      payload: {
        AppId: '123456',
        RoomId: 'room-query-1',
        TaskId: 'task-query-1',
      },
    }));
  });
});
