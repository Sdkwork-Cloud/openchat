export class Friend {
  id: string;
  uuid?: string;
  userId: string;
  friendId: string;
  remark?: string;
  group?: string;
  status: 'pending' | 'accepted' | 'blocked';
  acceptedAt?: Date;
  blockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class FriendRequest {
  id: string;
  uuid?: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  message?: string;
  expiresAt?: Date;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FriendManager {
  sendFriendRequest(fromUserId: string, toUserId: string, message?: string): Promise<FriendRequest>;
  acceptFriendRequest(requestId: string): Promise<boolean>;
  rejectFriendRequest(requestId: string): Promise<boolean>;
  cancelFriendRequest(requestId: string): Promise<boolean>;
  removeFriend(userId: string, friendId: string): Promise<boolean>;
  blockFriend(userId: string, friendId: string): Promise<boolean>;
  unblockFriend(userId: string, friendId: string): Promise<boolean>;
  getFriendRequests(userId: string, status?: 'pending' | 'accepted' | 'rejected' | 'expired'): Promise<FriendRequest[]>;
  getSentFriendRequests(userId: string): Promise<FriendRequest[]>;
  getFriendIds(userId: string): Promise<string[]>;
  checkFriendship(userId: string, friendId: string): Promise<boolean>;
  checkBlocked(userId: string, friendId: string): Promise<boolean>;
}
