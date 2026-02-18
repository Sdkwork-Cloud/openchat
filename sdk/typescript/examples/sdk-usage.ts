/**
 * OpenChat SDK 使用示例
 * 展示SDK的完整用法
 */

import {
  // 客户端
  OpenChatClient,
  createOpenChatClient,
  
  // 日志
  Logger,
  LogLevel,
  createLogger,
  
  // 性能监控
  PerformanceMonitor,
  createPerformanceMonitor,
  
  // 插件系统
  PluginManager,
  Plugin,
  
  // 错误处理
  SDKError,
  ErrorCode,
  success,
  failure,
  isSuccess,
  
  // 工具
  debounce,
  throttle,
  generateUUID,
  sleep,
  
  // 类型
  OpenChatSDKConfig,
  Message,
  Conversation,
  User,
  
  // 消息资源
  ResourceBuilder,
  
  // 平台检测
  Platform,
  detectPlatform,
} from './src';

// ==================== 基础示例 ====================

async function basicUsage() {
  const client = createOpenChatClient({
    server: {
      baseUrl: 'https://api.openchat.com',
    },
    im: {
      wsUrl: 'wss://im.openchat.com/ws',
    },
    auth: {
      uid: 'user-123',
      token: 'user-token',
    },
    debug: true,
  });

  await client.init();

  console.log('Client initialized!');
}

// ==================== 消息发送示例 ====================

async function sendMessage() {
  const client = createOpenChatClient({
    server: { baseUrl: 'https://api.openchat.com' },
    im: { wsUrl: 'wss://im.openchat.com/ws' },
    auth: { uid: 'user-123', token: 'token' },
  });

  await client.init();

  // 发送文本消息
  await client.im.messages.sendText({
    toUserId: 'user-456',
    content: 'Hello!',
  });

  // 发送图片消息
  await client.im.messages.sendImage({
    toUserId: 'user-456',
    imageUrl: 'https://example.com/image.jpg',
  });

  // 发送文件消息
  await client.im.messages.sendFile({
    toUserId: 'user-456',
    fileUrl: 'https://example.com/file.pdf',
    fileName: 'document.pdf',
    fileSize: 1024000,
  });

  // 使用ResourceBuilder
  const message = ResourceBuilder.buildTextMessage({
    text: 'Hello with ResourceBuilder!',
  });
  
  await client.im.messages.send({
    conversationId: 'conv-123',
    message,
  });
}

// ==================== 日志系统示例 ====================

function loggingExample() {
  const logger = createLogger({
    level: LogLevel.DEBUG,
    prefix: '[MyApp]',
    timestamp: true,
    colorize: true,
  });

  logger.debug('Debug message', { data: 123 });
  logger.info('Info message');
  logger.warn('Warning message');
  logger.error('Error message', new Error('Test error'));

  // 创建子日志器
  const childLogger = logger.child('ModuleA');
  childLogger.info('Child logger message');

  // 使用计时功能
  logger.time('operation');
  // ... 执行操作
  logger.timeEnd('operation');

  // 使用分组功能
  logger.group('Request');
  logger.info('Request started');
  logger.info('Request completed');
  logger.groupEnd();
}

// ==================== 性能监控示例 ====================

function performanceExample() {
  const monitor = createPerformanceMonitor({
    enabled: true,
    maxSamples: 1000,
  });

  // 计时操作
  const stopTimer = monitor.startTimer('api_call');
  // ... 执行API调用
  const duration = stopTimer();
  console.log(`API call took ${duration}ms`);

  // 记录指标
  monitor.record('response_time', 150);
  monitor.increment('request_count');
  monitor.gauge('active_users', 100);

  // 获取统计
  const stats = monitor.getStats('response_time');
  console.log(`Average: ${stats.avg}ms, P95: ${stats.p95}ms`);

  // 导出指标
  const metrics = monitor.export();
  console.log('Exported metrics:', metrics);

  // 输出摘要
  monitor.logSummary();
}

// ==================== 插件系统示例 ====================

function pluginExample() {
  const logger = createLogger({ level: LogLevel.INFO });

  // 创建自定义插件
  const loggingPlugin: Plugin = {
    name: 'logging-plugin',
    version: '1.0.0',
    
    install(context) {
      logger.info('Logging plugin installed');
    },
    
    onConnect() {
      logger.info('Connected to server');
    },
    
    onDisconnect() {
      logger.info('Disconnected from server');
    },
    
    onMessage(message) {
      logger.debug('Message received:', message);
      return message;
    },
    
    onError(error) {
      logger.error('Error occurred:', error);
    },
  };

  // 创建分析插件
  const analyticsPlugin: Plugin = {
    name: 'analytics-plugin',
    version: '1.0.0',
    
    install(context) {
      context.client.on('message', (msg: any) => {
        console.log('Analytics: Message sent to', msg.toUserId);
      });
    },
  };

  // 使用插件
  const client = createOpenChatClient({
    server: { baseUrl: 'https://api.openchat.com' },
    im: { wsUrl: 'wss://im.openchat.com/ws' },
    auth: { uid: 'user-123', token: 'token' },
  });

  // 注意: 实际使用时需要在客户端中集成插件管理器
  logger.info('Plugin system ready');
}

// ==================== 错误处理示例 ====================

function errorHandlingExample() {
  // 使用SDKError
  try {
    throw SDKError.unauthorized('Invalid token');
  } catch (error) {
    if (error instanceof SDKError) {
      console.log(`Error code: ${error.code}`);
      console.log(`Status: ${error.status}`);
      console.log(`Message: ${error.message}`);
    }
  }

  // 使用Result类型
  const result = await fetchUser('user-123');
  
  if (isSuccess(result)) {
    console.log('User:', result.data);
  } else {
    console.log('Error:', result.error.message);
  }
}

async function fetchUser(userId: string) {
  try {
    // 模拟API调用
    const user: User = { id: userId, username: 'test' };
    return success(user);
  } catch (error) {
    return failure({
      code: 'FETCH_ERROR',
      message: 'Failed to fetch user',
    });
  }
}

// ==================== 工具函数示例 ====================

function utilityExample() {
  // 防抖
  const debouncedSearch = debounce((query: string) => {
    console.log('Searching:', query);
  }, 300);

  // 节流
  const throttledScroll = throttle(() => {
    console.log('Scroll position:', window.scrollY);
  }, 100);

  // UUID生成
  const uuid = generateUUID();
  console.log('Generated UUID:', uuid);

  // 深度克隆
  const original = { a: 1, b: { c: 2 } };
  const cloned = original; // 简化示例，实际应使用deepClone

  // 异步延迟
  await sleep(1000);
  console.log('Delayed execution');

  // 平台检测
  const platform = detectPlatform();
  console.log('Running on:', platform);
}

// ==================== React集成示例 ====================

/*
// 在React中使用
import React, { useEffect, useState } from 'react';

function ChatComponent() {
  const [client, setClient] = useState<OpenChatClient | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const newClient = createOpenChatClient({
      server: { baseUrl: 'https://api.openchat.com' },
      im: { wsUrl: 'wss://im.openchat.com/ws' },
      auth: { uid: 'user-123', token: 'token' },
    });

    newClient.init().then(() => {
      setClient(newClient);

      // 监听消息
      newClient.on('message', (message: Message) => {
        setMessages(prev => [...prev, message]);
      });
    });

    return () => {
      newClient.disconnect();
    };
  }, []);

  const sendMessage = async (text: string) => {
    if (!client) return;
    
    await client.im.messages.sendText({
      toUserId: 'user-456',
      content: text,
    });
  };

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      <button onClick={() => sendMessage('Hello!')}>Send</button>
    </div>
  );
}
*/

// ==================== Vue集成示例 ====================

/*
// 在Vue 3中使用
import { createApp, ref, onMounted, onUnmounted } from 'vue';
import { createOpenChatClient } from '@openchat/typescript-sdk';

function useChat() {
  const client = ref<OpenChatClient | null>(null);
  const messages = ref<Message[]>([]);

  onMounted(async () => {
    client.value = createOpenChatClient({
      server: { baseUrl: 'https://api.openchat.com' },
      im: { wsUrl: 'wss://im.openchat.com/ws' },
      auth: { uid: 'user-123', token: 'token' },
    });

    await client.value.init();

    client.value.on('message', (message: Message) => {
      messages.value.push(message);
    });
  });

  onUnmounted(() => {
    client.value?.disconnect();
  });

  const sendMessage = async (text: string) => {
    if (!client.value) return;
    
    await client.value.im.messages.sendText({
      toUserId: 'user-456',
      content: text,
    });
  };

  return { messages, sendMessage };
}
*/

// ==================== Node.js后端示例 ====================

/*
// 在Node.js中使用
import { createOpenChatClient } from '@openchat/typescript-sdk';

async function serverExample() {
  const client = createOpenChatClient({
    server: { baseUrl: 'https://api.openchat.com' },
    auth: { uid: 'server-bot', token: 'bot-token' },
    im: { wsUrl: 'wss://im.openchat.com/ws' },
  });

  await client.init();

  // 批量发送消息
  const userIds = ['user-1', 'user-2', 'user-3'];
  
  await Promise.all(
    userIds.map(userId =>
      client.im.messages.sendText({
        toUserId: userId,
        content: 'Broadcast message!',
      })
    )
  );

  console.log('Broadcast sent!');
}
*/

// ==================== 小程序示例 ====================

/*
// 在微信小程序中使用
import { createOpenChatClient, Platform } from '@openchat/typescript-sdk';

function miniProgramExample() {
  const client = createOpenChatClient({
    server: { baseUrl: 'https://api.openchat.com' },
    im: { wsUrl: 'wss://im.openchat.com/ws' },
    auth: { uid: 'user-123', token: 'token' },
    platform: Platform.WEI_XIN_MINI_PROGRAM,
  });

  client.init().then(() => {
    console.log('Mini program client initialized');
  });
}
*/

console.log('SDK Examples loaded!');
