/**
 * 好友关系
 * 仅表示已建立的好友关系，不包含请求流程
 */
export class Friend {
  id: string;
  uuid?: string;
  userId: string;
  friendId: string;
  /**
   * 关系状态
   * - accepted: 已接受（成为好友）
   * - blocked: 已拉黑
   */
  status: 'accepted' | 'blocked';
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 好友请求
 * 管理好友请求的完整流程
 */
export class FriendRequest {
  id: string;
  uuid?: string;
  fromUserId: string;
  toUserId: string;
  /**
   * 请求状态
   * - pending: 等待确认
   * - accepted: 已接受
   * - rejected: 已拒绝
   */
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 好友管理接口
 */
export interface FriendManager {
  /**
   * 发送好友请求
   */
  sendFriendRequest(fromUserId: string, toUserId: string, message?: string): Promise<FriendRequest>;

  /**
   * 接受好友请求
   * 自动创建双向Friend记录和Contact记录
   */
  acceptFriendRequest(requestId: string): Promise<boolean>;

  /**
   * 拒绝好友请求
   */
  rejectFriendRequest(requestId: string): Promise<boolean>;

  /**
   * 取消好友请求
   */
  cancelFriendRequest(requestId: string): Promise<boolean>;

  /**
   * 移除好友
   * 同时删除Friend和Contact记录
   */
  removeFriend(userId: string, friendId: string): Promise<boolean>;

  /**
   * 拉黑好友
   */
  blockFriend(userId: string, friendId: string): Promise<boolean>;

  /**
   * 取消拉黑
   */
  unblockFriend(userId: string, friendId: string): Promise<boolean>;

  /**
   * 获取收到的好友请求列表
   */
  getFriendRequests(userId: string, status?: 'pending' | 'accepted' | 'rejected'): Promise<FriendRequest[]>;

  /**
   * 获取发送的好友请求列表
   */
  getSentFriendRequests(userId: string): Promise<FriendRequest[]>;

  /**
   * 获取好友ID列表（仅accepted状态）
   */
  getFriendIds(userId: string): Promise<string[]>;

  /**
   * 检查好友关系
   */
  checkFriendship(userId: string, friendId: string): Promise<boolean>;

  /**
   * 检查是否被拉黑
   */
  checkBlocked(userId: string, friendId: string): Promise<boolean>;
}
