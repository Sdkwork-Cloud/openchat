/**
 * 会话服务 - SDK实现版
 *
 * 职责：
 * 1. 获取会话列表（通过SDK从服务器获取）
 * 2. 会话管理（置顶、免打扰、删除）
 * 3. 会话搜索
 * 4. 未读消息统计
 *
 * 注意：此服务完全基于OpenChat TypeScript SDK实现，不再使用模拟数据
 */

import type { Conversation } from '../entities/conversation.entity';
import {
  getSDKClient,
  getConversationList,
  registerSDKEvents,
  convertSDKConversationToFrontend,
} from '../adapters/sdk-adapter';

export interface ConversationQueryParams {
  type?: 'single' | 'group' | 'ai' | 'customer';
  keyword?: string;
  limit?: number;
}

/**
 * 获取会话列表
 * 通过SDK从服务器获取
 */
export async function getConversations(params?: ConversationQueryParams): Promise<Conversation[]> {
  try {
    let conversations = await getConversationList();

    // 按类型筛选
    if (params?.type) {
      conversations = conversations.filter((c) => c.type === params.type);
    }

    // 按关键词搜索
    if (params?.keyword) {
      const keyword = params.keyword.toLowerCase();
      conversations = conversations.filter(
        (c) =>
          c.name.toLowerCase().includes(keyword) ||
          c.lastMessage.toLowerCase().includes(keyword)
      );
    }

    // 限制数量
    if (params?.limit) {
      conversations = conversations.slice(0, params.limit);
    }

    return conversations;
  } catch (error) {
    console.error('获取会话列表失败:', error);
    throw error;
  }
}

/**
 * 获取单个会话详情
 */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  try {
    const client = getSDKClient();
    const sdkConversation = await client.im.getConversation(conversationId);

    if (!sdkConversation) {
      return null;
    }

    return convertSDKConversationToFrontend(sdkConversation);
  } catch (error) {
    console.error('获取会话详情失败:', error);
    return null;
  }
}

/**
 * 删除会话
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    const client = getSDKClient();
    await client.im.deleteConversation(conversationId);
  } catch (error) {
    console.error('删除会话失败:', error);
    throw error;
  }
}

/**
 * 置顶/取消置顶会话
 */
export async function pinConversation(
  conversationId: string,
  isPinned: boolean
): Promise<void> {
  try {
    const client = getSDKClient();
    await client.im.pinConversation(conversationId, isPinned);
  } catch (error) {
    console.error('置顶会话失败:', error);
    throw error;
  }
}

/**
 * 设置会话免打扰
 */
export async function muteConversation(
  conversationId: string,
  isMuted: boolean
): Promise<void> {
  try {
    const client = getSDKClient();
    await client.im.muteConversation(conversationId, isMuted);
  } catch (error) {
    console.error('设置免打扰失败:', error);
    throw error;
  }
}

/**
 * 标记会话已读
 */
export async function markConversationAsRead(conversationId: string): Promise<void> {
  try {
    const client = getSDKClient();
    await client.im.markConversationAsRead(conversationId);
  } catch (error) {
    console.error('标记会话已读失败:', error);
    throw error;
  }
}

/**
 * 设置会话草稿
 */
export async function setConversationDraft(
  conversationId: string,
  draft: string
): Promise<void> {
  try {
    const client = getSDKClient();
    await client.im.setConversationDraft(conversationId, draft);
  } catch (error) {
    console.error('设置会话草稿失败:', error);
    throw error;
  }
}

/**
 * 获取总未读消息数
 */
export async function getTotalUnreadCount(): Promise<number> {
  try {
    const conversations = await getConversationList();
    return conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
  } catch (error) {
    console.error('获取未读数失败:', error);
    return 0;
  }
}

/**
 * 注册会话更新监听
 */
export function onConversationUpdated(
  callback: (conversation: Conversation) => void
): () => void {
  return registerSDKEvents({
    onConversationUpdated: callback,
  });
}
