import { OpenChatClient } from '../../src/openchat-client';
import { ApiService } from '../../src/services/api-service';
import { OpenChatSDKConfig, RTCRoomType } from '../../src/types';

const testConfig: OpenChatSDKConfig = {
  server: {
    baseUrl: 'http://localhost:3000',
    timeout: 30000,
    maxRetries: 3,
  },
  im: {
    wsUrl: 'ws://localhost:3000/ws',
  },
  auth: {
    uid: 'test-user-1',
    token: 'test-token-123',
  },
};

describe('OpenChatClient RTC orchestration', () => {
  let client: OpenChatClient;

  beforeEach(() => {
    client = new OpenChatClient(testConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('createRoom 应透传参数到 ApiService.createRTCRoom', async () => {
    const params = {
      type: RTCRoomType.GROUP,
      participants: ['test-user-1', 'test-user-2'],
      provider: 'tencent' as const,
      name: 'team-room',
    };
    const expected = {
      id: 'room-1',
      ...params,
      creatorId: 'test-user-1',
      status: 'active',
      startedAt: '2026-03-07T00:00:00.000Z',
    };
    const spy = jest
      .spyOn(ApiService.prototype, 'createRTCRoom')
      .mockResolvedValue(expected as any);

    const result = await client.rtc.createRoom(params);

    expect(spy).toHaveBeenCalledWith(params);
    expect(result).toEqual(expected);
  });

  test('getMyRooms 应使用当前登录 uid', async () => {
    const expected = [{ id: 'room-1' }, { id: 'room-2' }];
    const spy = jest
      .spyOn(ApiService.prototype, 'getRTCRoomsByUserId')
      .mockResolvedValue(expected as any);

    const result = await client.rtc.getMyRooms();

    expect(spy).toHaveBeenCalledWith('test-user-1');
    expect(result).toEqual(expected);
  });

  test('generateToken/validateToken 应透传参数', async () => {
    const tokenParams = {
      roomId: 'room-1',
      provider: 'volcengine' as const,
      role: 'host',
    };
    const generated = { token: 'rtc-token-1' };
    const validated = { valid: true, roomId: 'room-1', userId: 'test-user-1' };
    const generateSpy = jest
      .spyOn(ApiService.prototype, 'generateRTCToken')
      .mockResolvedValue(generated as any);
    const validateSpy = jest
      .spyOn(ApiService.prototype, 'validateRTCToken')
      .mockResolvedValue(validated as any);

    const token = await client.rtc.generateToken(tokenParams as any);
    const validation = await client.rtc.validateToken('rtc-token-1');

    expect(generateSpy).toHaveBeenCalledWith(tokenParams);
    expect(validateSpy).toHaveBeenCalledWith('rtc-token-1');
    expect(token).toEqual(generated);
    expect(validation).toEqual(validated);
  });

  test('addParticipant/removeParticipant 应透传参数', async () => {
    const addSpy = jest
      .spyOn(ApiService.prototype, 'addRTCParticipant')
      .mockResolvedValue(true);
    const removeSpy = jest
      .spyOn(ApiService.prototype, 'removeRTCParticipant')
      .mockResolvedValue(true);

    const addResult = await client.rtc.addParticipant('room-1', 'test-user-2');
    const removeResult = await client.rtc.removeParticipant('room-1', 'test-user-2');

    expect(addSpy).toHaveBeenCalledWith('room-1', 'test-user-2');
    expect(removeSpy).toHaveBeenCalledWith('room-1', 'test-user-2');
    expect(addResult).toBe(true);
    expect(removeResult).toBe(true);
  });

  test('provider 能力/统计/健康接口应透传 query', async () => {
    const capabilities = {
      defaultProvider: 'volcengine',
      fallbackOrder: ['volcengine'],
      activeProviders: ['volcengine'],
      providers: [],
    };
    const statsQuery = { provider: 'tencent', windowMinutes: 60 };
    const stats = [{ provider: 'tencent', operation: 'createRoom', total: 10 }];
    const healthQuery = { provider: 'volcengine', minSamples: 10 };
    const health = {
      generatedAt: '2026-03-07T00:00:00.000Z',
      windowMinutes: 60,
      fallbackOrder: ['volcengine'],
      providers: [],
    };
    const capabilitiesSpy = jest
      .spyOn(ApiService.prototype, 'getRTCProviderCapabilities')
      .mockResolvedValue(capabilities as any);
    const statsSpy = jest
      .spyOn(ApiService.prototype, 'getRTCProviderStats')
      .mockResolvedValue(stats as any);
    const healthSpy = jest
      .spyOn(ApiService.prototype, 'getRTCProviderHealth')
      .mockResolvedValue(health as any);

    const capabilitiesResult = await client.rtc.getProviderCapabilities();
    const statsResult = await client.rtc.getProviderStats(statsQuery as any);
    const healthResult = await client.rtc.getProviderHealth(healthQuery as any);

    expect(capabilitiesSpy).toHaveBeenCalledTimes(1);
    expect(statsSpy).toHaveBeenCalledWith(statsQuery);
    expect(healthSpy).toHaveBeenCalledWith(healthQuery);
    expect(capabilitiesResult).toEqual(capabilities);
    expect(statsResult).toEqual(stats);
    expect(healthResult).toEqual(health);
  });

  test('startRecording/stopRecording 应透传 roomId 与 payload', async () => {
    const startPayload = { taskId: 'task-1', metadata: { source: 'sdk-test' } };
    const stopPayload = { taskId: 'task-1', metadata: { reason: 'manual-stop' } };
    const recording = { id: 'record-1', roomId: 'room-1', status: 'recording' };
    const stopped = { id: 'record-1', roomId: 'room-1', status: 'completed' };
    const startSpy = jest
      .spyOn(ApiService.prototype, 'startRTCRecording')
      .mockResolvedValue(recording as any);
    const stopSpy = jest
      .spyOn(ApiService.prototype, 'stopRTCRecording')
      .mockResolvedValue(stopped as any);

    const startResult = await client.rtc.startRecording('room-1', startPayload as any);
    const stopResult = await client.rtc.stopRecording('room-1', stopPayload as any);

    expect(startSpy).toHaveBeenCalledWith('room-1', startPayload);
    expect(stopSpy).toHaveBeenCalledWith('room-1', stopPayload);
    expect(startResult).toEqual(recording);
    expect(stopResult).toEqual(stopped);
  });

  test('视频记录接口应透传参数', async () => {
    const record = { id: 'record-1', roomId: 'room-1' };
    const list = [{ id: 'record-1' }, { id: 'record-2' }];
    const syncPayload = { roomId: 'room-1', taskId: 'task-1' };
    const metadata = { source: 'transcoder', retry: 1 };
    const syncSpy = jest
      .spyOn(ApiService.prototype, 'syncRTCVideoRecord')
      .mockResolvedValue(record as any);
    const metadataSpy = jest
      .spyOn(ApiService.prototype, 'updateVideoRecordMetadata')
      .mockResolvedValue(record as any);
    const roomRecordsSpy = jest
      .spyOn(ApiService.prototype, 'getVideoRecordsByRoomId')
      .mockResolvedValue(list as any);
    const myRecordsSpy = jest
      .spyOn(ApiService.prototype, 'getVideoRecords')
      .mockResolvedValue(list as any);

    const syncResult = await client.rtc.syncVideoRecord('record-1', syncPayload as any);
    const metadataResult = await client.rtc.updateVideoRecordMetadata('record-1', metadata);
    const roomRecords = await client.rtc.getRoomVideoRecords('room-1');
    const myRecords = await client.rtc.getMyVideoRecords({ status: 'completed' } as any);

    expect(syncSpy).toHaveBeenCalledWith('record-1', syncPayload);
    expect(metadataSpy).toHaveBeenCalledWith('record-1', metadata);
    expect(roomRecordsSpy).toHaveBeenCalledWith('room-1');
    expect(myRecordsSpy).toHaveBeenCalledWith({ status: 'completed' });
    expect(syncResult).toEqual(record);
    expect(metadataResult).toEqual(record);
    expect(roomRecords).toEqual(list);
    expect(myRecords).toEqual(list);
  });
});
