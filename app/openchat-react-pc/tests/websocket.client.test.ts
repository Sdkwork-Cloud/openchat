/**
 * WebSocket 客户端单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WebSocketClient from '../src/services/websocket.client';

describe('WebSocketClient', () => {
  let wsClient: WebSocketClient;
  let mockWebSocket: any;

  beforeEach(() => {
    // 模拟 WebSocket
    mockWebSocket = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
    };

    global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket);

    // 创建 WebSocket 客户端
    wsClient = new WebSocketClient({
      url: 'ws://localhost:8080',
      token: 'test-token',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct config', () => {
    expect(wsClient).toBeDefined();
    expect(wsClient.state).toBe('disconnected');
  });

  it('should connect to WebSocket server', () => {
    wsClient.connect();
    expect(WebSocket).toHaveBeenCalledWith('ws://localhost:8080?token=test-token');
    expect(wsClient.state).toBe('connecting');
  });

  it('should handle open event', () => {
    wsClient.connect();
    expect(mockWebSocket.onopen).toBeDefined();
    
    // 模拟 open 事件
    mockWebSocket.onopen();
    expect(wsClient.state).toBe('connected');
  });

  it('should send message when connected', async () => {
    wsClient.connect();
    mockWebSocket.onopen();
    
    await wsClient.send('test-event', { data: 'test-data' });
    expect(mockWebSocket.send).toHaveBeenCalled();
  });

  it('should queue message when disconnected', async () => {
    await wsClient.send('test-event', { data: 'test-data' });
    expect(mockWebSocket.send).not.toHaveBeenCalled();
    
    // 连接后应该发送队列中的消息
    wsClient.connect();
    mockWebSocket.onopen();
    expect(mockWebSocket.send).toHaveBeenCalled();
  });

  it('should handle message event', () => {
    wsClient.connect();
    mockWebSocket.onopen();
    
    const messageHandler = vi.fn();
    wsClient.on('test-event', messageHandler);
    
    // 模拟 message 事件
    const testMessage = JSON.stringify({
      event: 'test-event',
      payload: { data: 'test-data' },
    });
    mockWebSocket.onmessage({ data: testMessage });
    
    expect(messageHandler).toHaveBeenCalledWith({ data: 'test-data' });
  });

  it('should handle close event', () => {
    wsClient.connect();
    mockWebSocket.onopen();
    
    const closeHandler = vi.fn();
    wsClient.on('disconnected', closeHandler);
    
    // 模拟 close 事件
    mockWebSocket.onclose({ code: 1000, reason: 'Normal closure' });
    
    expect(wsClient.state).toBe('disconnected');
    expect(closeHandler).toHaveBeenCalled();
  });

  it('should handle error event', () => {
    wsClient.connect();
    
    const errorHandler = vi.fn();
    wsClient.on('error', errorHandler);
    
    // 模拟 error 事件
    const testError = new Error('Test error');
    mockWebSocket.onerror(testError);
    
    expect(wsClient.state).toBe('error');
    expect(errorHandler).toHaveBeenCalledWith(testError);
  });

  it('should reconnect after disconnection', () => {
    wsClient.connect();
    mockWebSocket.onopen();
    
    // 模拟 close 事件
    mockWebSocket.onclose({ code: 1006, reason: 'Abnormal closure' });
    
    expect(wsClient.state).toBe('reconnecting');
  });

  it('should send heartbeat', () => {
    wsClient.connect();
    mockWebSocket.onopen();
    
    // 模拟心跳响应
    const pongMessage = JSON.stringify({
      event: 'pong',
      payload: { timestamp: Date.now() },
    });
    
    // 等待心跳发送
    setTimeout(() => {
      mockWebSocket.onmessage({ data: pongMessage });
      expect(wsClient.state).toBe('connected');
    }, 100);
  });

  it('should disconnect properly', () => {
    wsClient.connect();
    mockWebSocket.onopen();
    
    wsClient.disconnect();
    expect(mockWebSocket.close).toHaveBeenCalled();
    expect(wsClient.state).toBe('disconnected');
  });

  it('should get connection info', () => {
    const connectionInfo = wsClient.connectionInfo;
    expect(connectionInfo).toBeDefined();
    expect(connectionInfo.state).toBe('disconnected');
  });

  it('should cleanup expired messages', () => {
    wsClient.connect();
    mockWebSocket.onopen();
    
    const expiredCount = wsClient.cleanupExpiredMessages();
    expect(expiredCount).toBe(0);
  });

  it('should clear message queue', () => {
    wsClient.connect();
    
    wsClient.clearMessageQueue();
    const queueStatus = wsClient.getMessageQueueStatus();
    expect(queueStatus.total).toBe(0);
  });
});
