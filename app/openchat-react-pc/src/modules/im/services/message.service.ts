/**
 * 消息服务 - SDK实现版
 *
 * 职责：
 * 1. 通过SDK发送消息（文本、图片、文件等）
 * 2. 消息状态管理（发送中、已发送、已送达、已读、失败）
 * 3. 消息历史查询（通过SDK从服务器获取）
 * 4. 消息撤回
 * 5. 消息搜索
 *
 * 注意：此服务完全基于OpenChat TypeScript SDK实现，不再使用模拟数据
 */

import type { Message, MessageStatus } from '../entities/message.entity';
import {
  getSDKClient,
  sendTextMessage,
  sendImageMessage,
  getMessageList,
  recallMessage as sdkRecallMessage,
  deleteMessage as sdkDeleteMessage,
  searchMessageList,
  markMessageAsRead as sdkMarkMessageAsRead,
  convertFrontendContentToSDK,
  convertSDKMessageToFrontend,
  registerSDKEvents,
} from '../adapters/sdk-adapter';

// 消息队列管理
class MessageQueue {
  private queue: Array<{ id: string; params: SendMessageParams; resolve: (message: Message) => void; reject: (error: Error) => void }> = [];
  private processing = false;

  async add(params: SendMessageParams): Promise<Message> {
    return new Promise((resolve, reject) => {
      const id = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.queue.push({ id, params, resolve, reject });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      try {
        const message = await this.sendMessageInternal(item.params);
        item.resolve(message);
      } catch (error) {
        item.reject(error as Error);
      }
    }

    this.processing = false;
  }

  private async sendMessageInternal(params: SendMessageParams): Promise<Message> {
    const { conversationId, content, isGroup = false } = params;

    switch (content.type) {
      case 'text':
        return await sendTextMessage(conversationId, content.text || '', isGroup);
      
      case 'image':
        return await sendImageMessage(conversationId, content.url || '', {
          width: content.width,
          height: content.height,
          fileSize: content.fileSize,
        }, isGroup);
      
      default:
        return await this.sendCustomMessage(conversationId, content, isGroup);
    }
  }

  private async sendCustomMessage(
    conversationId: string,
    content: MessageContent,
    isGroup: boolean
  ): Promise<Message> {
    const client = getSDKClient();
    const sdkContent = convertFrontendContentToSDK(content);

    const sendParams = isGroup
      ? { groupId: conversationId, customType: content.type, data: sdkContent }
      : { toUserId: conversationId, customType: content.type, data: sdkContent };

    const sdkMessage = await client.im.messages.sendCustom(sendParams);
    return convertSDKMessageToFrontend(sdkMessage);
  }
}

const messageQueue = new MessageQueue();

// 消息状态缓存
const messageStatusCache = new Map<string, MessageStatus>();

// 注册消息状态更新监听
export function registerMessageEventListeners() {
  try {
    registerSDKEvents({
      onMessageSent: (message) => {
        messageStatusCache.set(message.id, message.status);
      },
      onMessageReceived: (message) => {
        messageStatusCache.set(message.id, message.status);
      },
    });
  } catch (error) {
    console.warn('Failed to register message event listeners:', error);
  }
}

// 消息类型扩展
export type MessageContentType = 'text' | 'image' | 'file' | 'voice' | 'video' | 'location' | 'card';

export interface MessageContent {
  type: MessageContentType;
  text?: string;
  html?: string;
  url?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number; // 语音/视频时长
  width?: number; // 图片/视频宽度
  height?: number; // 图片/视频高度
  thumbUrl?: string; // 缩略图
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  card?: {
    title: string;
    description: string;
    url: string;
    image?: string;
  };
}

export interface SendMessageParams {
  conversationId: string;
  content: MessageContent;
  replyToMessageId?: string; // 回复消息ID
  mentions?: string[]; // @提及的用户ID列表
  isGroup?: boolean; // 是否为群聊
}

export interface MessageQueryParams {
  conversationId: string;
  beforeMessageId?: string;
  afterMessageId?: string;
  limit?: number;
  keyword?: string;
}

/**
 * 发送消息
 * 通过消息队列发送到服务器，支持多种消息类型
 */
export async function sendMessage(params: SendMessageParams): Promise<Message> {
  try {
    return await messageQueue.add(params);
  } catch (error) {
    console.error('发送消息失败:', error);
    throw error;
  }
}

/**
 * 发送消息（批量）
 */
export async function sendBatchMessages(paramsList: SendMessageParams[]): Promise<Message[]> {
  try {
    const promises = paramsList.map(params => messageQueue.add(params));
    return await Promise.all(promises);
  } catch (error) {
    console.error('批量发送消息失败:', error);
    throw error;
  }
}

/**
 * 获取消息状态
 */
export function getMessageStatus(messageId: string): MessageStatus | undefined {
  return messageStatusCache.get(messageId);
}

/**
 * 清空消息状态缓存
 */
export function clearMessageStatusCache(): void {
  messageStatusCache.clear();
}

/**
 * 获取消息列表
 * 通过SDK从服务器获取历史消息
 */
export async function getMessages(params: MessageQueryParams): Promise<Message[]> {
  const { conversationId, beforeMessageId, limit = 50 } = params;

  try {
    const messages = await getMessageList(conversationId, {
      beforeMessageId,
      limit,
    });

    return messages;
  } catch (error) {
    console.error('获取消息列表失败:', error);
    throw error;
  }
}

/**
 * 更新消息状态
 * 通过SDK同步到服务器
 */
export async function updateMessageStatus(
  conversationId: string,
  messageId: string,
  status: MessageStatus
): Promise<void> {
  try {
    const client = getSDKClient();

    // 根据状态执行相应操作
    switch (status) {
      case 'read':
        await sdkMarkMessageAsRead(messageId);
        break;

      default:
        // 其他状态由SDK自动管理
        break;
    }
  } catch (error) {
    console.error('更新消息状态失败:', error);
    throw error;
  }
}

/**
 * 撤回消息
 * 通过SDK发送到服务器执行撤回操作
 */
export async function recallMessage(
  conversationId: string,
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await sdkRecallMessage(messageId);

    if (!success) {
      return { success: false, error: '撤回消息失败，可能已超过撤回时间限制' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('撤回消息失败:', error);
    return { success: false, error: error.message || '撤回消息失败' };
  }
}

/**
 * 删除消息（仅自己可见）
 * 通过SDK从服务器删除
 */
export async function deleteMessage(
  conversationId: string,
  messageId: string
): Promise<void> {
  try {
    await sdkDeleteMessage(messageId);
  } catch (error) {
    console.error('删除消息失败:', error);
    throw error;
  }
}

/**
 * 搜索消息
 * 通过SDK从服务器搜索
 */
export async function searchMessages(
  conversationId: string,
  keyword: string,
  limit: number = 20
): Promise<Message[]> {
  try {
    const messages = await searchMessageList(conversationId, keyword);
    return messages.slice(0, limit);
  } catch (error) {
    console.error('搜索消息失败:', error);
    throw error;
  }
}

/**
 * 标记消息为已读
 * 通过SDK同步到服务器
 */
export async function markMessagesAsRead(
  conversationId: string,
  messageIds?: string[]
): Promise<void> {
  try {
    if (messageIds && messageIds.length > 0) {
      // 标记指定消息为已读
      for (const messageId of messageIds) {
        await sdkMarkMessageAsRead(messageId);
      }
    } else {
      // 标记整个会话为已读
      const client = getSDKClient();
      await client.im.messages.markConversationAsRead(conversationId);
    }
  } catch (error) {
    console.error('标记已读失败:', error);
    throw error;
  }
}

/**
 * 获取未读消息数量
 * 通过SDK从服务器获取
 */
export async function getUnreadCount(conversationId: string): Promise<number> {
  try {
    const client = getSDKClient();
    const conversation = await client.im.conversations.getConversation(conversationId);

    return conversation?.unreadCount || 0;
  } catch (error) {
    console.error('获取未读数失败:', error);
    return 0;
  }
}
