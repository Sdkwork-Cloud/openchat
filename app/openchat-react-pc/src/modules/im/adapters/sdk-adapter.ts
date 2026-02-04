/**
 * SDK适配器层
 * 
 * 职责：
 * 1. 将TypeScript SDK接口映射到前端数据模型
 * 2. 处理数据格式转换
 * 3. 提供统一的事件处理
 * 4. 管理SDK实例生命周期
 */

import {
  OpenChatClient,
  createOpenChatClient,
  ResourceBuilder,
  Message as SDKMessage,
  Conversation as SDKConversation,
  Group as SDKGroup,
  GroupMember as SDKGroupMember,
  MessageType,
  MessageStatus as SDKMessageStatus,
  OpenChatEvent,
} from '@openchat/typescript-sdk';

import type { Message, MessageStatus } from '../entities/message.entity';
import type { Conversation } from '../entities/conversation.entity';
import type { Group, GroupMember } from '../entities/group.entity';

// SDK配置
export interface SDKAdapterConfig {
  apiBaseUrl: string;
  imWsUrl: string;
  uid: string;
  token: string;
  deviceId?: string;
}

// 单例实例
let sdkClient: OpenChatClient | null = null;
let sdkInitializing: Promise<OpenChatClient> | null = null;

// SDK状态
interface SDKState {
  initialized: boolean;
  connecting: boolean;
  connected: boolean;
  error: string | null;
}

let sdkState: SDKState = {
  initialized: false,
  connecting: false,
  connected: false,
  error: null,
};

// 状态变化回调
let stateChangeCallbacks: Array<(state: SDKState) => void> = [];

/**
 * 获取SDK客户端实例（单例模式）
 */
export function getSDKClient(): OpenChatClient {
  if (!sdkClient) {
    throw new Error('SDK client not initialized. Call initializeSDK first.');
  }
  return sdkClient;
}

/**
 * 初始化SDK
 */
export async function initializeSDK(config: SDKAdapterConfig): Promise<OpenChatClient> {
  if (sdkClient) {
    console.warn('SDK already initialized');
    return sdkClient;
  }

  if (sdkInitializing) {
    console.warn('SDK initialization in progress');
    return sdkInitializing;
  }

  sdkInitializing = (async () => {
    try {
      updateSDKState({ connecting: true, error: null });

      const sdkConfig: any = {
        server: {
          baseUrl: config.apiBaseUrl,
        },
        im: {
          wsUrl: config.imWsUrl,
          deviceId: config.deviceId || `web-${Date.now()}`,
        },
        auth: {
          uid: config.uid,
          token: config.token,
        },
        debug: import.meta.env.MODE === 'development',
      };

      sdkClient = createOpenChatClient(sdkConfig);
      
      // 注册连接状态事件
      sdkClient.on(OpenChatEvent.CONNECTED, () => {
        updateSDKState({ connected: true, error: null });
      });
      
      sdkClient.on(OpenChatEvent.DISCONNECTED, () => {
        updateSDKState({ connected: false });
      });
      
      sdkClient.on(OpenChatEvent.ERROR, (error: any) => {
        updateSDKState({ error: error.message || 'Unknown error' });
      });

      await sdkClient.init();
      updateSDKState({ initialized: true, connecting: false, connected: true });

      return sdkClient;
    } catch (error: any) {
      console.error('SDK initialization failed:', error);
      updateSDKState({ 
        initialized: false, 
        connecting: false, 
        error: error.message || 'Initialization failed' 
      });
      throw error;
    } finally {
      sdkInitializing = null;
    }
  })();

  return sdkInitializing;
}

/**
 * 销毁SDK实例
 */
export function destroySDK(): void {
  if (sdkClient) {
    sdkClient.destroy();
    sdkClient = null;
  }
  updateSDKState({ 
    initialized: false, 
    connecting: false, 
    connected: false, 
    error: null 
  });
  stateChangeCallbacks = [];
}

/**
 * 检查SDK是否已初始化
 */
export function isSDKInitialized(): boolean {
  return sdkState.initialized;
}

/**
 * 获取SDK状态
 */
export function getSDKState(): SDKState {
  return { ...sdkState };
}

/**
 * 订阅SDK状态变化
 */
export function subscribeToSDKState(callback: (state: SDKState) => void): () => void {
  stateChangeCallbacks.push(callback);
  
  // 立即触发一次当前状态
  callback(getSDKState());
  
  return () => {
    stateChangeCallbacks = stateChangeCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * 更新SDK状态
 */
function updateSDKState(updates: Partial<SDKState>): void {
  sdkState = { ...sdkState, ...updates };
  stateChangeCallbacks.forEach(callback => callback(getSDKState()));
}

// ==================== 消息适配器 ====================

/**
 * 将SDK消息转换为前端消息格式
 */
export function convertSDKMessageToFrontend(sdkMessage: SDKMessage): Message {
  const content = parseMessageContent(sdkMessage);

  return {
    id: sdkMessage.id,
    conversationId: sdkMessage.channelId || '',
    senderId: sdkMessage.fromUid,
    senderName: sdkMessage.fromUid, // 需要通过user服务获取真实名称
    senderAvatar: '', // 需要通过user服务获取头像
    content,
    time: new Date(sdkMessage.timestamp).toISOString(),
    status: convertMessageStatus(sdkMessage.status),
  };
}

/**
 * 解析SDK消息内容为前端格式
 */
function parseMessageContent(sdkMessage: SDKMessage): any {
  const { type, content } = sdkMessage;

  switch (type) {
    case MessageType.TEXT:
      return {
        type: 'text',
        text: content.text || '',
        html: content.html,
      };

    case MessageType.IMAGE:
      return {
        type: 'image',
        url: content.url,
        width: content.width,
        height: content.height,
        fileName: content.name,
        fileSize: content.size,
      };

    case MessageType.AUDIO:
      return {
        type: 'voice',
        url: content.url,
        duration: content.duration,
        fileName: content.name,
        fileSize: content.size,
      };

    case MessageType.VIDEO:
      return {
        type: 'video',
        url: content.url,
        thumbUrl: content.thumbnail,
        duration: content.duration,
        width: content.width,
        height: content.height,
        fileName: content.name,
        fileSize: content.size,
      };

    case MessageType.FILE:
      return {
        type: 'file',
        url: content.url,
        fileName: content.name,
        fileSize: content.size,
      };

    case MessageType.LOCATION:
      return {
        type: 'location',
        location: {
          latitude: content.latitude,
          longitude: content.longitude,
          address: content.address,
        },
      };

    case MessageType.CARD:
      return {
        type: 'card',
        card: {
          title: content.title,
          description: content.description,
          url: content.url,
          image: content.imageUrl,
        },
      };

    default:
      return {
        type: 'text',
        text: '[未知消息类型]',
      };
  }
}

/**
 * 将前端消息内容转换为SDK格式
 */
export function convertFrontendContentToSDK(content: any): any {
  switch (content.type) {
    case 'text':
      return ResourceBuilder.text(content.text);

    case 'image':
      return ResourceBuilder.image(content.url, {
        width: content.width?.toString(),
        height: content.height?.toString(),
        size: content.fileSize?.toString(),
      });

    case 'voice':
      return ResourceBuilder.audio(content.url, content.duration?.toString() || '0');

    case 'video':
      return ResourceBuilder.video(content.url, content.duration?.toString() || '0', {
        coverUrl: content.thumbUrl,
        width: content.width?.toString(),
        height: content.height?.toString(),
      });

    case 'file':
      return ResourceBuilder.file(content.url, content.fileName, {
        size: content.fileSize?.toString(),
      });

    case 'location':
      return ResourceBuilder.location(
        content.location.latitude.toString(),
        content.location.longitude.toString(),
        {
          name: content.location.name,
          address: content.location.address,
        }
      );

    case 'card':
      return ResourceBuilder.card(content.cardType || 'user', {
        title: content.card?.title,
        description: content.card?.description,
        imageUrl: content.card?.image,
        linkUrl: content.card?.url,
      });

    default:
      throw new Error(`Unsupported message type: ${content.type}`);
  }
}

/**
 * 转换消息状态
 */
function convertMessageStatus(status?: SDKMessageStatus): MessageStatus {
  switch (status) {
    case SDKMessageStatus.SENDING:
      return 'sending';
    case SDKMessageStatus.SENT:
      return 'sent';
    case SDKMessageStatus.DELIVERED:
      return 'delivered';
    case SDKMessageStatus.READ:
      return 'read';
    case SDKMessageStatus.FAILED:
      return 'failed';
    default:
      return 'sending';
  }
}

// ==================== 会话适配器 ====================

/**
 * 将SDK会话转换为前端格式
 */
export function convertSDKConversationToFrontend(sdkConversation: SDKConversation): Conversation {
  const lastMessage = sdkConversation.lastMessage
    ? convertSDKMessageToFrontend(sdkConversation.lastMessage)
    : undefined;

  let conversationType: 'ai' | 'group' | 'user' = 'user';
  if (sdkConversation.type === 'group') {
    conversationType = 'group';
  } else if (sdkConversation.type === 'customer') {
    conversationType = 'ai';
  }

  return {
    id: sdkConversation.id,
    name: sdkConversation.name || sdkConversation.targetId,
    avatar: sdkConversation.avatar || '',
    lastMessage: lastMessage?.content?.text || '',
    lastMessageTime: formatTime(sdkConversation.updatedAt),
    unreadCount: sdkConversation.unreadCount || 0,
    isOnline: false, // 需要通过presence服务获取
    isTyping: false,
    type: conversationType,
  };
}



/**
 * 格式化时间显示
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // 小于1分钟
  if (diff < 60000) {
    return '刚刚';
  }

  // 小于1小时
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`;
  }

  // 小于24小时
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  }

  // 小于7天
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`;
  }

  // 显示日期
  return date.toLocaleDateString('zh-CN');
}

// ==================== 群组适配器 ====================

/**
 * 将SDK群组转换为前端格式
 */
export function convertSDKGroupToFrontend(sdkGroup: SDKGroup): Group {
  return {
    id: sdkGroup.id,
    name: sdkGroup.name,
    avatar: sdkGroup.avatar || sdkGroup.name[0]?.toUpperCase() || 'G',
    memberCount: sdkGroup.memberCount || 0,
    maxMembers: sdkGroup.maxMembers || 500,
    description: sdkGroup.notice || '',
    creatorId: '', // 需要通过API获取
    ownerId: sdkGroup.ownerUid || '',
    members: [], // 需要通过API获取
    createdAt: typeof sdkGroup.createdAt === 'number' ? new Date(sdkGroup.createdAt).toISOString() : new Date().toISOString(),
    settings: {
      allowInvite: true,
      allowMemberModify: false,
      needVerify: true,
      showMemberCount: true,
    },
    notices: [], // 需要单独获取
  };
}

/**
 * 将SDK群成员转换为前端格式
 */
export function convertSDKGroupMemberToFrontend(sdkMember: SDKGroupMember): GroupMember {
  return {
    id: sdkMember.uid,
    name: sdkMember.groupNickname || sdkMember.uid,
    avatar: sdkMember.user?.avatar || '',
    role: convertMemberRole(sdkMember.role),
    isOnline: false, // 需要通过presence服务获取
    joinTime: typeof sdkMember.joinedAt === 'number' ? new Date(sdkMember.joinedAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * 转换成员角色
 */
function convertMemberRole(role?: number): 'owner' | 'admin' | 'member' {
  switch (role) {
    case 2:
      return 'owner';
    case 1:
      return 'admin';
    case 0:
    default:
      return 'member';
  }
}

// ==================== 事件监听 ====================

/**
 * 注册SDK事件监听
 */
export function registerSDKEvents(callbacks: {
  onMessageReceived?: (message: Message) => void;
  onMessageSent?: (message: Message) => void;
  onMessageRecalled?: (messageId: string) => void;
  onMessageDeleted?: (messageId: string) => void;
  onConversationUpdated?: (conversation: Conversation) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: any) => void;
}): () => void {
  const client = getSDKClient();

  const handlers: Array<{ event: OpenChatEvent; handler: any }> = [];

  if (callbacks.onMessageReceived) {
    const handler = (sdkMessage: SDKMessage) => {
      callbacks.onMessageReceived!(convertSDKMessageToFrontend(sdkMessage));
    };
    client.on(OpenChatEvent.MESSAGE_RECEIVED, handler);
    handlers.push({ event: OpenChatEvent.MESSAGE_RECEIVED, handler });
  }

  if (callbacks.onMessageSent) {
    const handler = (sdkMessage: SDKMessage) => {
      callbacks.onMessageSent!(convertSDKMessageToFrontend(sdkMessage));
    };
    client.on(OpenChatEvent.MESSAGE_SENT, handler);
    handlers.push({ event: OpenChatEvent.MESSAGE_SENT, handler });
  }

  if (callbacks.onConnected) {
    client.on(OpenChatEvent.CONNECTED, callbacks.onConnected);
    handlers.push({ event: OpenChatEvent.CONNECTED, handler: callbacks.onConnected });
  }

  if (callbacks.onDisconnected) {
    client.on(OpenChatEvent.DISCONNECTED, callbacks.onDisconnected);
    handlers.push({ event: OpenChatEvent.DISCONNECTED, handler: callbacks.onDisconnected });
  }

  if (callbacks.onError) {
    client.on(OpenChatEvent.ERROR, callbacks.onError);
    handlers.push({ event: OpenChatEvent.ERROR, handler: callbacks.onError });
  }

  // 返回取消注册的函数
  return () => {
    handlers.forEach(({ event, handler }) => {
      client.off(event, handler);
    });
  };
}

// ==================== 便捷方法 ====================

/**
 * 发送文本消息
 */
export async function sendTextMessage(
  conversationId: string,
  text: string,
  isGroup: boolean = false
): Promise<Message> {
  const client = getSDKClient();

  const params = isGroup
    ? { groupId: conversationId, text }
    : { toUserId: conversationId, text };

  const sdkMessage = await client.im.messages.sendText(params);
  return convertSDKMessageToFrontend(sdkMessage);
}

/**
 * 发送图片消息
 */
export async function sendImageMessage(
  conversationId: string,
  imageUrl: string,
  options?: { width?: number; height?: number; fileSize?: number },
  isGroup: boolean = false
): Promise<Message> {
  const client = getSDKClient();

  const resource = ResourceBuilder.image(imageUrl, {
    width: options?.width?.toString(),
    height: options?.height?.toString(),
    size: options?.fileSize?.toString(),
  });

  const params = isGroup
    ? { groupId: conversationId, resource }
    : { toUserId: conversationId, resource };

  const sdkMessage = await client.im.messages.sendImage(params);
  return convertSDKMessageToFrontend(sdkMessage);
}

/**
 * 获取消息列表
 */
export async function getMessageList(
  conversationId: string,
  options?: { beforeMessageId?: string; limit?: number }
): Promise<Message[]> {
  const client = getSDKClient();

  const sdkMessages = await client.im.messages.getMessageList(conversationId, {
    startMessageId: options?.beforeMessageId,
    limit: options?.limit || 50,
  });

  return sdkMessages.map(convertSDKMessageToFrontend);
}

/**
 * 获取会话列表
 */
export async function getConversationList(): Promise<Conversation[]> {
  const client = getSDKClient();

  const sdkConversations = await client.im.conversations.getConversationList();
  return sdkConversations.map(convertSDKConversationToFrontend);
}

/**
 * 撤回消息
 */
export async function recallMessage(messageId: string): Promise<boolean> {
  const client = getSDKClient();
  return client.im.messages.recallMessage(messageId);
}

/**
 * 删除消息
 */
export async function deleteMessage(messageId: string): Promise<boolean> {
  const client = getSDKClient();
  return client.im.messages.deleteMessage(messageId);
}

/**
 * 标记消息已读
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  const client = getSDKClient();
  return client.im.messages.markMessageAsRead(messageId);
}

/**
 * 标记会话已读
 */
export async function markConversationAsRead(conversationId: string): Promise<void> {
  const client = getSDKClient();
  return client.im.messages.markConversationAsRead(conversationId);
}

/**
 * 搜索消息
 */
export async function searchMessageList(
  conversationId: string,
  keyword: string
): Promise<Message[]> {
  const client = getSDKClient();

  const sdkMessages = await client.im.messages.searchMessages(keyword, conversationId);
  return sdkMessages.map(convertSDKMessageToFrontend);
}

/**
 * 获取群组列表
 */
export async function getGroupList(): Promise<Group[]> {
  const client = getSDKClient();

  const sdkGroups = await client.im.groups.getMyGroups();
  return sdkGroups.map(convertSDKGroupToFrontend);
}

/**
 * 获取群组详情
 */
export async function getGroupDetail(groupId: string): Promise<Group | null> {
  const client = getSDKClient();

  try {
    const sdkGroup = await client.im.groups.getGroup(groupId);
    return convertSDKGroupToFrontend(sdkGroup);
  } catch (error) {
    return null;
  }
}

/**
 * 创建群组
 */
export async function createGroup(
  name: string,
  memberIds: string[],
  options?: { description?: string; avatar?: string }
): Promise<Group> {
  const client = getSDKClient();

  const sdkGroup = await client.im.groups.createGroup(name, memberIds, {
    avatar: options?.avatar,
    notice: options?.description,
  });

  return convertSDKGroupToFrontend(sdkGroup);
}

/**
 * 添加群成员
 */
export async function addGroupMembers(groupId: string, memberIds: string[]): Promise<void> {
  const client = getSDKClient();

  for (const memberId of memberIds) {
    await client.im.groups.addGroupMember(groupId, memberId);
  }
}

/**
 * 移除群成员
 */
export async function removeGroupMember(groupId: string, memberId: string): Promise<void> {
  const client = getSDKClient();
  await client.im.groups.removeGroupMember(groupId, memberId);
}

/**
 * 退出群组
 */
export async function quitGroup(groupId: string): Promise<void> {
  const client = getSDKClient();
  await client.im.groups.quitGroup(groupId);
}

/**
 * 解散群组
 */
export async function dissolveGroup(groupId: string): Promise<void> {
  const client = getSDKClient();
  await client.im.groups.dissolveGroup(groupId);
}

// 导出SDK类型
export type { OpenChatClient };
