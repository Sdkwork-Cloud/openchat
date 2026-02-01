# OpenChat SDK API 规范

## 概述

本文档定义了OpenChat即时通讯服务的标准化SDK接口。所有语言的SDK都应遵循此规范实现。

## 基础配置

### 初始化配置

```typescript
interface OpenChatConfig {
  baseUrl: string;           // 服务器地址
  apiKey?: string;           // API密钥（可选）
  timeout?: number;          // 请求超时（毫秒，默认30000）
  maxRetries?: number;       // 最大重试次数（默认3）
  enableLogging?: boolean;   // 是否启用日志（默认false）
}
```

### 全局事件

```typescript
enum OpenChatEvent {
  CONNECTED = 'connected',           // 连接成功
  DISCONNECTED = 'disconnected',     // 连接断开
  MESSAGE_RECEIVED = 'message_received',  // 收到消息
  MESSAGE_SENT = 'message_sent',     // 消息发送成功
  MESSAGE_FAILED = 'message_failed', // 消息发送失败
  FRIEND_REQUEST = 'friend_request', // 收到好友请求
  GROUP_INVITATION = 'group_invitation',  // 收到群组邀请
  USER_ONLINE = 'user_online',       // 用户上线
  USER_OFFLINE = 'user_offline',     // 用户下线
  ERROR = 'error',                   // 错误
}
```

## 核心接口

### 1. 认证模块 (Auth)

```typescript
interface AuthModule {
  // 用户注册
  register(username: string, password: string, nickname?: string): Promise<AuthResponse>;
  
  // 用户登录
  login(username: string, password: string): Promise<AuthResponse>;
  
  // 获取当前用户信息
  getCurrentUser(): Promise<User | null>;
  
  // 修改密码
  changePassword(oldPassword: string, newPassword: string): Promise<boolean>;
  
  // 登出
  logout(): Promise<void>;
  
  // 检查登录状态
  isAuthenticated(): boolean;
  
  // 获取Token
  getToken(): string | null;
  
  // 设置Token（用于自动登录）
  setToken(token: string): void;
}

interface AuthResponse {
  user: User;
  token: string;
}
```

### 2. 用户模块 (User)

```typescript
interface UserModule {
  // 获取用户信息
  getUser(userId: string): Promise<User | null>;
  
  // 根据用户名获取用户
  getUserByUsername(username: string): Promise<User | null>;
  
  // 批量获取用户
  getUsers(userIds: string[]): Promise<User[]>;
  
  // 更新用户信息
  updateUser(userId: string, data: Partial<User>): Promise<User | null>;
  
  // 删除用户
  deleteUser(userId: string): Promise<boolean>;
}

interface User {
  id: string;
  username: string;
  nickname?: string;
  avatar?: string;
  status?: 'online' | 'offline';
  lastSeen?: number;
  createdAt: number;
  updatedAt: number;
}
```

### 3. 好友模块 (Friend)

```typescript
interface FriendModule {
  // 发送好友请求
  sendFriendRequest(toUserId: string, message?: string): Promise<FriendRequest>;
  
  // 接受好友请求
  acceptFriendRequest(requestId: string): Promise<boolean>;
  
  // 拒绝好友请求
  rejectFriendRequest(requestId: string): Promise<boolean>;
  
  // 取消好友请求
  cancelFriendRequest(requestId: string): Promise<boolean>;
  
  // 删除好友
  removeFriend(friendId: string): Promise<boolean>;
  
  // 拉黑好友
  blockFriend(friendId: string): Promise<boolean>;
  
  // 取消拉黑
  unblockFriend(friendId: string): Promise<boolean>;
  
  // 获取好友列表
  getFriends(): Promise<Friend[]>;
  
  // 获取收到的好友请求
  getReceivedRequests(): Promise<FriendRequest[]>;
  
  // 获取发送的好友请求
  getSentRequests(): Promise<FriendRequest[]>;
  
  // 检查是否为好友
  isFriend(userId: string): Promise<boolean>;
  
  // 检查是否被拉黑
  isBlocked(userId: string): Promise<boolean>;
}

interface Friend {
  userId: string;
  friendId: string;
  status: 'accepted' | 'blocked';
  acceptedAt?: number;
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  createdAt: number;
}
```

### 4. 消息模块 (Message)

```typescript
interface MessageModule {
  // 发送文本消息
  sendTextMessage(toUserId: string, text: string): Promise<Message>;
  
  // 发送群聊消息
  sendGroupMessage(groupId: string, content: MessageContent): Promise<Message>;
  
  // 发送图片消息
  sendImageMessage(toUserId: string, image: ImageResource): Promise<Message>;
  
  // 发送语音消息
  sendAudioMessage(toUserId: string, audio: AudioResource): Promise<Message>;
  
  // 发送视频消息
  sendVideoMessage(toUserId: string, video: VideoResource): Promise<Message>;
  
  // 发送文件消息
  sendFileMessage(toUserId: string, file: FileResource): Promise<Message>;
  
  // 发送自定义消息
  sendCustomMessage(toUserId: string, custom: Record<string, any>): Promise<Message>;
  
  // 获取消息详情
  getMessage(messageId: string): Promise<Message | null>;
  
  // 获取消息历史
  getMessageHistory(options: MessageHistoryOptions): Promise<Message[]>;
  
  // 标记消息已读
  markAsRead(messageIds: string[]): Promise<boolean>;
  
  // 删除消息
  deleteMessage(messageId: string): Promise<boolean>;
  
  // 撤回消息
  recallMessage(messageId: string): Promise<boolean>;
  
  // 监听新消息
  onMessageReceived(callback: (message: Message) => void): void;
  
  // 取消监听
  offMessageReceived(callback: (message: Message) => void): void;
}

interface Message {
  id: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'card' | 'custom' | 'system';
  content: MessageContent;
  fromUserId: string;
  toUserId?: string;
  groupId?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'recalled';
  createdAt: number;
  updatedAt: number;
}

interface MessageContent {
  text?: string;
  image?: ImageResource;
  audio?: AudioResource;
  video?: VideoResource;
  file?: FileResource;
  card?: CardMessage;
  custom?: Record<string, any>;
}

interface MessageHistoryOptions {
  targetId: string;          // 用户ID或群组ID
  type: 'single' | 'group';  // 会话类型
  limit?: number;            // 数量限制（默认20）
  before?: number;           // 时间戳，获取此时间之前的消息
}
```

### 5. 群组模块 (Group)

```typescript
interface GroupModule {
  // 创建群组
  createGroup(name: string, options?: CreateGroupOptions): Promise<Group>;
  
  // 获取群组信息
  getGroup(groupId: string): Promise<Group | null>;
  
  // 更新群组信息
  updateGroup(groupId: string, data: Partial<Group>): Promise<Group | null>;
  
  // 删除群组
  deleteGroup(groupId: string): Promise<boolean>;
  
  // 获取我的群组列表
  getMyGroups(): Promise<Group[]>;
  
  // 添加群成员
  addMember(groupId: string, userId: string): Promise<boolean>;
  
  // 移除群成员
  removeMember(groupId: string, userId: string): Promise<boolean>;
  
  // 设置成员角色
  setMemberRole(groupId: string, userId: string, role: 'owner' | 'admin' | 'member'): Promise<boolean>;
  
  // 获取群成员列表
  getMembers(groupId: string): Promise<GroupMember[]>;
  
  // 退出群组
  leaveGroup(groupId: string): Promise<boolean>;
  
  // 转让群主
  transferOwnership(groupId: string, newOwnerId: string): Promise<boolean>;
  
  // 发送群组邀请
  inviteUser(groupId: string, userId: string): Promise<GroupInvitation>;
  
  // 接受群组邀请
  acceptInvitation(invitationId: string): Promise<boolean>;
  
  // 拒绝群组邀请
  rejectInvitation(invitationId: string): Promise<boolean>;
  
  // 加入黑名单
  addToBlacklist(groupId: string, userId: string): Promise<boolean>;
  
  // 移出黑名单
  removeFromBlacklist(groupId: string, userId: string): Promise<boolean>;
  
  // 踢出成员
  kickMember(groupId: string, userId: string): Promise<boolean>;
}

interface Group {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  ownerId: string;
  memberCount: number;
  maxMembers: number;
  createdAt: number;
  updatedAt: number;
}

interface GroupMember {
  groupId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: number;
}

interface GroupInvitation {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

interface CreateGroupOptions {
  avatar?: string;
  description?: string;
  memberIds?: string[];
}
```

### 6. 会话模块 (Conversation)

```typescript
interface ConversationModule {
  // 获取会话列表
  getConversations(options?: ConversationListOptions): Promise<Conversation[]>;
  
  // 获取会话详情
  getConversation(conversationId: string): Promise<Conversation | null>;
  
  // 获取指定目标的会话
  getConversationByTarget(targetId: string, type: 'single' | 'group'): Promise<Conversation | null>;
  
  // 删除会话
  deleteConversation(conversationId: string): Promise<boolean>;
  
  // 置顶会话
  pinConversation(conversationId: string): Promise<boolean>;
  
  // 取消置顶
  unpinConversation(conversationId: string): Promise<boolean>;
  
  // 设置免打扰
  muteConversation(conversationId: string): Promise<boolean>;
  
  // 取消免打扰
  unmuteConversation(conversationId: string): Promise<boolean>;
  
  // 清空未读数
  clearUnreadCount(conversationId: string): Promise<boolean>;
  
  // 获取总未读数
  getTotalUnreadCount(): Promise<number>;
}

interface Conversation {
  id: string;
  type: 'single' | 'group';
  userId: string;
  targetId: string;
  targetName?: string;
  targetAvatar?: string;
  lastMessageId?: string;
  lastMessagePreview?: string;
  lastMessageTime?: number;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  createdAt: number;
  updatedAt: number;
}

interface ConversationListOptions {
  type?: 'single' | 'group';
  isPinned?: boolean;
  limit?: number;
  offset?: number;
}
```

### 7. 联系人模块 (Contact)

```typescript
interface ContactModule {
  // 获取联系人列表
  getContacts(options?: ContactListOptions): Promise<Contact[]>;
  
  // 获取联系人详情
  getContact(contactId: string): Promise<Contact | null>;
  
  // 更新联系人
  updateContact(contactId: string, data: Partial<Contact>): Promise<Contact | null>;
  
  // 删除联系人
  deleteContact(contactId: string): Promise<boolean>;
  
  // 设置收藏
  setFavorite(contactId: string, isFavorite: boolean): Promise<boolean>;
  
  // 设置备注
  setRemark(contactId: string, remark: string): Promise<boolean>;
  
  // 添加标签
  addTag(contactId: string, tag: string): Promise<boolean>;
  
  // 移除标签
  removeTag(contactId: string, tag: string): Promise<boolean>;
  
  // 搜索联系人
  searchContacts(keyword: string): Promise<Contact[]>;
  
  // 获取联系人统计
  getContactStats(): Promise<ContactStats>;
}

interface Contact {
  id: string;
  userId: string;
  targetId: string;
  type: 'user' | 'group';
  name?: string;
  remark?: string;
  avatar?: string;
  tags?: string[];
  isFavorite: boolean;
  status: 'active' | 'blocked' | 'deleted';
  lastContactTime?: number;
  createdAt: number;
  updatedAt: number;
}

interface ContactStats {
  total: number;
  userCount: number;
  groupCount: number;
  favoriteCount: number;
  blockedCount: number;
}

interface ContactListOptions {
  type?: 'user' | 'group';
  status?: 'active' | 'blocked' | 'deleted';
  isFavorite?: boolean;
  tag?: string;
  limit?: number;
  offset?: number;
}
```

## 资源类型

### 媒体资源

```typescript
interface ImageResource {
  url: string;
  width?: number;
  height?: number;
  size?: number;
  thumbnail?: string;
}

interface AudioResource {
  url: string;
  duration?: number;
  size?: number;
}

interface VideoResource {
  url: string;
  thumbnail?: string;
  duration?: number;
  width?: number;
  height?: number;
  size?: number;
}

interface FileResource {
  url: string;
  name: string;
  size: number;
  mimeType?: string;
}

interface CardMessage {
  type: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  url?: string;
  [key: string]: any;
}
```

## 错误处理

### 错误码定义

```typescript
enum ErrorCode {
  // 通用错误 (1000-1099)
  UNKNOWN_ERROR = 1000,
  NETWORK_ERROR = 1001,
  TIMEOUT_ERROR = 1002,
  UNAUTHORIZED = 1003,
  FORBIDDEN = 1004,
  NOT_FOUND = 1005,
  VALIDATION_ERROR = 1006,
  
  // 认证错误 (1100-1199)
  AUTH_FAILED = 1100,
  TOKEN_EXPIRED = 1101,
  TOKEN_INVALID = 1102,
  
  // 用户错误 (1200-1299)
  USER_NOT_FOUND = 1200,
  USER_ALREADY_EXISTS = 1201,
  
  // 好友错误 (1300-1399)
  FRIEND_ALREADY_EXISTS = 1300,
  FRIEND_REQUEST_ALREADY_SENT = 1301,
  FRIEND_NOT_FOUND = 1302,
  
  // 群组错误 (1400-1499)
  GROUP_NOT_FOUND = 1400,
  GROUP_ALREADY_EXISTS = 1401,
  GROUP_MEMBER_ALREADY_EXISTS = 1402,
  GROUP_MEMBER_NOT_FOUND = 1403,
  GROUP_PERMISSION_DENIED = 1404,
  
  // 消息错误 (1500-1599)
  MESSAGE_NOT_FOUND = 1500,
  MESSAGE_SEND_FAILED = 1501,
  MESSAGE_RECALL_FAILED = 1502,
  
  // 会话错误 (1600-1699)
  CONVERSATION_NOT_FOUND = 1600,
}

interface OpenChatError extends Error {
  code: ErrorCode;
  message: string;
  data?: any;
}
```

## 事件监听

### 事件接口

```typescript
interface EventEmitter {
  on(event: OpenChatEvent, callback: (...args: any[]) => void): void;
  off(event: OpenChatEvent, callback: (...args: any[]) => void): void;
  once(event: OpenChatEvent, callback: (...args: any[]) => void): void;
  emit(event: OpenChatEvent, ...args: any[]): void;
}
```

## 平台特定实现

### React SDK
- 基于Fetch API
- 支持React Hooks
- 支持TypeScript

### Flutter SDK
- 基于Dart HTTP客户端
- 支持Stream
- 支持异步/await

### iOS SDK
- 基于Swift
- 使用URLSession
- 支持Combine框架

### Android SDK
- 基于Kotlin
- 使用OkHttp
- 支持Coroutine

### Node.js SDK
- 基于axios
- 支持EventEmitter
- 支持TypeScript

### Python SDK
- 基于requests
- 支持asyncio
- 支持类型注解
