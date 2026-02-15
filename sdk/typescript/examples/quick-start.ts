/**
 * OpenChat TypeScript SDK - 快速开始示例
 * 
 * 本示例展示了SDK的主要功能和用法
 */

import OpenChatClient, { createOpenChatClient } from '../src/openchat-client';
import { ConversationType, ResourceBuilder } from '../src/types/message';

/**
 * 基础配置
 */
const config = {
  server: {
    baseUrl: 'https://api.openchat.com',
    timeout: 30000,
    maxRetries: 3,
  },
  im: {
    wsUrl: 'wss://ws.openchat.com',
    uid: 'your-user-id',
    deviceId: 'your-device-id',
  },
  auth: {
    token: 'your-access-token',
    uid: 'your-user-id',
  },
  debug: true,
};

/**
 * 示例1: 创建客户端并初始化
 */
async function initClient() {
  console.log('=== 初始化客户端 ===');
  
  // 方式1: 使用 new OpenChatClient()
  const client1 = new OpenChatClient(config);
  
  // 方式2: 使用工厂函数
  const client2 = createOpenChatClient(config);
  
  // 初始化
  await client1.init();
  console.log('客户端初始化成功!');
  
  return client1;
}

/**
 * 示例2: 登录
 */
async function loginExample(client: OpenChatClient) {
  console.log('=== 用户登录 ===');
  
  try {
    const userInfo = await client.auth.login({
      username: 'test-user',
      password: 'test-password',
    });
    
    console.log('登录成功:', userInfo);
    return userInfo;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
}

/**
 * 示例3: 发送各种消息
 */
async function sendMessagesExample(client: OpenChatClient) {
  console.log('=== 发送消息示例 ===');
  
  // 发送文本消息 (单聊)
  await client.im.messages.sendText({
    toUserId: 'target-user-id',
    text: '你好，这是一条测试消息！',
    mentions: [],
  });
  
  // 发送文本消息 (群聊)
  await client.im.messages.sendText({
    groupId: 'target-group-id',
    text: '@大家 请查看这个消息',
    mentions: ['user-1', 'user-2'],
  });
  
  // 发送图片消息
  await client.im.messages.sendImage({
    toUserId: 'target-user-id',
    resource: ResourceBuilder.image('https://example.com/image.jpg', {
      width: 1920,
      height: 1080,
      format: 'JPEG',
    }),
  });
  
  // 发送语音消息
  await client.im.messages.sendAudio({
    toUserId: 'target-user-id',
    resource: ResourceBuilder.audio('https://example.com/audio.mp3', 30),
  });
  
  // 发送视频消息
  await client.im.messages.sendVideo({
    toUserId: 'target-user-id',
    resource: ResourceBuilder.video('https://example.com/video.mp4', 120, {
      coverUrl: 'https://example.com/cover.jpg',
    }),
  });
  
  // 发送文件消息
  await client.im.messages.sendFile({
    toUserId: 'target-user-id',
    resource: ResourceBuilder.file('https://example.com/document.pdf', '文档.pdf'),
  });
  
  // 发送位置消息
  await client.im.messages.sendLocation({
    toUserId: 'target-user-id',
    resource: {
      type: 'LOCATION',
      latitude: 39.9042,
      longitude: 116.4074,
      name: '天安门广场',
      address: '北京市东城区',
    },
  });
  
  // 发送小程序卡片
  await client.im.messages.sendCard({
    toUserId: 'target-user-id',
    resource: ResourceBuilder.miniProgramCard(
      'OpenChat小程序',
      'wx1234567890',
      'pages/index/index',
      {
        description: '一个现代化的即时通讯应用',
      }
    ),
  });
  
  console.log('消息发送完成!');
}

/**
 * 示例4: 使用HTTP API发送消息
 */
async function sendApiMessageExample(client: OpenChatClient) {
  console.log('=== 使用HTTP API发送消息 ===');
  
  // 发送文本消息 (REST API)
  const message = await client.api.sendMessage({
    type: 'text',
    content: {
      text: {
        text: 'Hello from REST API!',
      },
    },
    fromUserId: 'your-user-id',
    toUserId: 'target-user-id',
  });
  
  console.log('消息发送成功:', message);
  
  // 获取消息详情
  const messageDetail = await client.api.getMessage(message.id);
  console.log('消息详情:', messageDetail);
  
  // 批量发送消息
  const batchResult = await client.api.batchSendMessages([
    {
      type: 'text',
      content: { text: { text: '批量消息1' } },
      fromUserId: 'your-user-id',
      toUserId: 'user-1',
    },
    {
      type: 'text',
      content: { text: { text: '批量消息2' } },
      fromUserId: 'your-user-id',
      toUserId: 'user-2',
    },
  ]);
  
  console.log('批量发送结果:', batchResult);
}

/**
 * 示例5: 好友管理
 */
async function friendsExample(client: OpenChatClient) {
  console.log('=== 好友管理 ===');
  
  // 获取好友列表
  const friends = await client.im.contacts.getFriends();
  console.log('好友列表:', friends);
  
  // 发送好友请求
  await client.im.contacts.sendFriendRequest('friend-user-id', '你好，我想加你为好友');
  
  // 接受好友请求
  await client.im.contacts.acceptFriendRequest('request-id');
  
  // 删除好友
  await client.im.contacts.removeFriend('friend-user-id');
  
  console.log('好友管理操作完成!');
}

/**
 * 示例6: 群组管理
 */
async function groupsExample(client: OpenChatClient) {
  console.log('=== 群组管理 ===');
  
  // 创建群组
  const group = await client.im.groups.createGroup('技术交流群', ['user-1', 'user-2', 'user-3']);
  console.log('创建群组:', group);
  
  // 获取群组信息
  const groupInfo = await client.im.groups.getGroup(group.id);
  console.log('群组信息:', groupInfo);
  
  // 添加群成员
  await client.im.groups.addGroupMember(group.id, 'user-4');
  
  // 移除群成员
  await client.im.groups.removeGroupMember(group.id, 'user-2');
  
  console.log('群组管理操作完成!');
}

/**
 * 示例7: 消息操作
 */
async function messageOperationsExample(client: OpenChatClient) {
  console.log('=== 消息操作 ===');
  
  // 撤回消息
  const recallResult = await client.api.recallMessage('message-id');
  console.log('撤回结果:', recallResult);
  
  // 标记消息已读
  await client.api.markMessagesAsRead('user-id', ['msg-1', 'msg-2']);
  
  // 转发消息
  const forwardResult = await client.api.forwardMessage('original-message-id', {
    toUserIds: ['user-1', 'user-2'],
    toGroupIds: ['group-1'],
  });
  console.log('转发结果:', forwardResult);
  
  // 更新消息状态
  await client.api.updateMessageStatus('message-id', 'read');
  
  console.log('消息操作完成!');
}

/**
 * 示例8: Agent和AI Bot
 */
async function agentExample(client: OpenChatClient) {
  console.log('=== Agent和AI Bot ===');
  
  // 获取Agent列表
  const agents = await client.api.service.getAgents();
  console.log('Agent列表:', agents);
  
  // 创建Agent会话
  const session = await client.api.service.createAgentSession('agent-id');
  console.log('创建会话:', session);
  
  // 发送消息到Agent
  const response = await client.api.service.sendMessageToAgent(session.id, {
    content: '你好，请帮我写一个TypeScript函数',
  });
  console.log('Agent响应:', response);
  
  console.log('Agent操作完成!');
}

/**
 * 示例9: 健康检查
 */
async function healthCheckExample(client: OpenChatClient) {
  console.log('=== 健康检查 ===');
  
  // 基础健康检查
  const health = await client.api.service.checkHealth();
  console.log('基础健康:', health);
  
  // 就绪检查
  const ready = await client.api.service.checkReady();
  console.log('就绪状态:', ready);
  
  // 存活检查
  const live = await client.api.service.checkLive();
  console.log('存活状态:', live);
  
  console.log('健康检查完成!');
}

/**
 * 示例10: RTC音视频通话
 */
async function rtcExample(client: OpenChatClient) {
  console.log('=== RTC音视频通话 ===');
  
  // 初始化RTC
  await client.rtc.init({
    provider: 'VOLCENGINE',
  });
  
  // 开始通话
  await client.rtc.startCall('room-123', {
    autoPublish: true,
    autoSubscribe: true,
  });
  
  // 结束通话
  await client.rtc.endCall();
  
  console.log('RTC操作完成!');
}

/**
 * 主函数 - 运行所有示例
 */
async function main() {
  console.log('OpenChat TypeScript SDK 快速开始');
  console.log('==================================\n');
  
  try {
    // 1. 创建并初始化客户端
    const client = await initClient();
    
    // 2. 登录
    // await loginExample(client);
    
    // 3. 发送消息
    // await sendMessagesExample(client);
    
    // 4. 使用HTTP API
    // await sendApiMessageExample(client);
    
    // 5. 好友管理
    // await friendsExample(client);
    
    // 6. 群组管理
    // await groupsExample(client);
    
    // 7. 消息操作
    // await messageOperationsExample(client);
    
    // 8. Agent和AI Bot
    // await agentExample(client);
    
    // 9. 健康检查
    // await healthCheckExample(client);
    
    // 10. RTC通话
    // await rtcExample(client);
    
    console.log('\n所有示例运行完成!');
    
    // 清理资源
    client.destroy();
    
  } catch (error) {
    console.error('示例运行出错:', error);
    process.exit(1);
  }
}

// 运行主函数
// main();

export {
  initClient,
  loginExample,
  sendMessagesExample,
  sendApiMessageExample,
  friendsExample,
  groupsExample,
  messageOperationsExample,
  agentExample,
  healthCheckExample,
  rtcExample,
};
