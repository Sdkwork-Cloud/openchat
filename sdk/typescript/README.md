# OpenChat TypeScript SDK

高内聚低耦合的即时通讯SDK，基于悟空IM EasySDK实现实时通讯，支持浏览器、Node.js、小程序等多平台。

## 特性

- **无UI框架耦合** - 纯SDK设计，可与任何UI框架配合使用
- **多平台支持** - 浏览器、Node.js、微信小程序、支付宝小程序、百度小程序、字节跳动小程序
- **基于悟空IM** - 使用悟空IM EasySDK实现高效的实时消息传输
- **类型安全** - 完整的TypeScript类型定义
- **高内聚低耦合** - 清晰的架构分层（服务层、客户端层）
- **统一连接管理** - 用户只需调用`client.init()`即可连接所有服务
- **MediaResource标准** - 采用统一的资源定义标准，简洁优雅的API设计
- **简洁API设计** - 提供`client.im.xxx`和`client.rtc.xxx`的直观接口

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenChatClient                          │
│              (客户端层 - 统一API入口)                         │
│                                                             │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│   │  client.im  │  │ client.rtc  │  │  client.auth    │   │
│   │  (即时通讯)  │  │ (实时音视频) │  │   (认证模块)     │   │
│   └──────┬──────┘  └──────┬──────┘  └────────┬────────┘   │
│          │                │                   │            │
│   ┌──────▼──────┐  ┌──────▼──────┐  ┌────────▼────────┐   │
│   │  IMService  │  │  RTCManager │  │   ApiService    │   │
│   │  (悟空IM)   │  │ (多Provider)│  │  (HTTP API)     │   │
│   └─────────────┘  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 安装

```bash
npm install @openchat/typescript-sdk
# or
yarn add @openchat/typescript-sdk
# or
pnpm add @openchat/typescript-sdk
```

## 快速开始

### 基础用法

```typescript
import { createOpenChatClient, ConversationType, ResourceBuilder } from '@openchat/typescript-sdk';

// 创建客户端实例
const client = createOpenChatClient({
  apiBaseUrl: 'https://api.openchat.com',     // OpenChat REST API地址
  imWsUrl: 'wss://im.openchat.com/ws',        // 悟空IM WebSocket地址
  uid: 'user-uid',
  token: 'user-token',
});

// 一键初始化（连接IM服务、API服务等）
await client.init();

// 监听消息事件
client.on('message_received', (message) => {
  console.log('收到新消息:', message.content);
});

// 发送文本消息给单个用户
await client.im.sendText({
  toUserId: 'user-123',
  text: 'Hello, World!'
});

// 发送文本消息到群组
await client.im.sendText({
  groupId: 'group-456',
  text: '大家好!'
});

// 发送图片消息 - 使用 MediaResource 标准
await client.im.sendImage({
  toUserId: 'user-123',
  resource: ResourceBuilder.image('https://example.com/image.jpg', {
    width: '1920',
    height: '1080'
  })
});
```

### MediaResource 标准

SDK采用统一的MediaResource标准定义所有媒体类型，提供简洁优雅的API：

```typescript
import { ResourceBuilder } from '@openchat/typescript-sdk';

// 创建图片资源
const imageResource = ResourceBuilder.image('https://example.com/photo.jpg', {
  width: '1920',
  height: '1080',
  thumbnailUrl: 'https://example.com/photo_thumb.jpg'
});

// 创建音频资源
const audioResource = ResourceBuilder.audio('https://example.com/voice.mp3', '60', {
  text: '语音转文字内容',
  waveform: [0.1, 0.5, 0.8, 0.3, 0.9]
});

// 创建视频资源
const videoResource = ResourceBuilder.video('https://example.com/video.mp4', '120', {
  coverUrl: 'https://example.com/cover.jpg',
  width: '1920',
  height: '1080'
});

// 创建文件资源
const fileResource = ResourceBuilder.file('https://example.com/doc.pdf', 'document.pdf', {
  size: '1024000',
  mimeType: 'application/pdf'
});

// 创建位置资源
const locationResource = ResourceBuilder.location('39.9042', '116.4074', {
  locationName: '天安门广场',
  address: '北京市东城区'
});

// 创建名片资源
const cardResource = ResourceBuilder.card('user', {
  title: '张三',
  description: '产品经理',
  imageUrl: 'https://example.com/avatar.jpg'
});
```

### 完整的认证流程

```typescript
import { OpenChatClient, ConversationType, ResourceBuilder } from '@openchat/typescript-sdk';

const client = new OpenChatClient({
  apiBaseUrl: 'https://api.openchat.com',    // OpenChat REST API地址
  imWsUrl: 'wss://im.openchat.com/ws',       // 悟空IM WebSocket地址
  uid: '', // 初始为空
  token: '', // 初始为空
});

// 1. 用户注册
const userInfo = await client.auth.register('username', 'password', '昵称');
console.log('注册成功:', userInfo);

// 2. 用户登录（自动初始化SDK）
const loginInfo = await client.auth.login('username', 'password');
console.log('登录成功:', loginInfo);
// 登录成功后自动调用 client.init() 连接所有服务

// 3. 现在可以收发消息了
await client.im.sendText({
  toUserId: 'friend-uid',
  text: 'Hello!'
});

// 4. 登出
await client.auth.logout(); // 自动清理所有连接
```

### 小程序中使用

```typescript
// app.ts (微信小程序)
import { OpenChatClient, ConversationType, ResourceBuilder } from '@openchat/typescript-sdk';

App({
  globalData: {
    openChat: null as OpenChatClient | null,
  },

  async onLaunch() {
    // 创建客户端（自动检测小程序环境）
    this.globalData.openChat = new OpenChatClient({
      apiBaseUrl: 'https://api.openchat.com',    // OpenChat REST API地址
      imWsUrl: 'wss://im.openchat.com/ws',       // 悟空IM WebSocket地址
      uid: '',
      token: '',
    });
  },
});

// pages/chat/chat.ts
Page({
  async onLoad() {
    const app = getApp();
    const client = app.globalData.openChat;

    // 监听消息
    client.on('message_received', (message) => {
      console.log('新消息:', message);
    });

    // 发送图片消息 - 使用 MediaResource 标准
    await client.im.sendImage({
      targetId: 'channel-id',
      conversationType: ConversationType.SINGLE,
      resource: ResourceBuilder.image('https://example.com/image.jpg')
    });
  },
});
```

## API文档

### OpenChatClient

主客户端类，提供统一的API入口。

#### 配置

```typescript
interface OpenChatSDKConfig {
  apiBaseUrl: string;      // OpenChat Server API地址（HTTP REST API）
  imWsUrl: string;         // 悟空IM WebSocket地址（实时消息）
  uid: string;             // 用户ID
  token: string;           // 认证Token
  deviceFlag?: number;     // 设备标识（可选）
  apiKey?: string;         // API密钥（可选）
}
```

#### 方法

| 方法 | 描述 |
|------|------|
| `init()` | 一键初始化SDK，连接所有服务（IM、API等） |
| `destroy()` | 销毁SDK，断开所有连接 |
| `isInitialized()` | 是否已初始化 |
| `isConnected()` | 是否已连接 |
| `on(event, handler)` | 监听事件 |
| `off(event, handler)` | 取消监听 |

---

### IM模块 (client.im)

提供完整的即时通讯功能，所有方法都通过 `client.im.xxx` 调用。SDK采用领域驱动设计，将IM功能分为多个子模块：

- `client.im.messages`: 消息相关操作
- `client.im.contacts`: 联系人管理
- `client.im.conversations`: 会话管理
- `client.im.groups`: 群组管理

#### 连接状态

```typescript
// 检查IM连接状态
const isConnected = client.im.isConnected();

// 获取连接状态
const state = client.im.getConnectionState();
// 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
```

#### 发送消息 - 优化版API（直接使用toUserId/groupId）

```typescript
import { ResourceBuilder } from '@openchat/typescript-sdk';

// 发送文本消息给单个用户
const message = await client.im.sendText({
  toUserId: 'user-123',
  text: 'Hello, World!',
  mentions: ['user-456'],  // @提及用户
  mentionAll: false        // 是否@所有人
});

// 发送文本消息到群组
const message = await client.im.sendText({
  groupId: 'group-456',
  text: '大家好!'
});

// 发送图片消息给单个用户 - 使用 ResourceBuilder
const message = await client.im.sendImage({
  toUserId: 'user-123',
  resource: ResourceBuilder.image('https://example.com/image.jpg', {
    width: '1920',
    height: '1080',
    thumbnailUrl: 'https://example.com/thumb.jpg'
  })
});

// 发送图片消息到群组
const message = await client.im.sendImage({
  groupId: 'group-456',
  resource: ResourceBuilder.image('https://example.com/image.jpg')
});

// 发送语音消息给单个用户
const message = await client.im.sendAudio({
  toUserId: 'user-123',
  resource: ResourceBuilder.audio('https://example.com/audio.mp3', '60', {
    text: '语音转文字内容',
    waveform: [0.1, 0.5, 0.8, 0.3]
  })
});

// 发送视频消息给单个用户
const message = await client.im.sendVideo({
  toUserId: 'user-123',
  resource: ResourceBuilder.video('https://example.com/video.mp4', '120', {
    coverUrl: 'https://example.com/cover.jpg',
    width: '1920',
    height: '1080'
  })
});

// 发送文件消息给单个用户
const message = await client.im.sendFile({
  toUserId: 'user-123',
  resource: ResourceBuilder.file('https://example.com/file.pdf', 'document.pdf', {
    size: '1024000',
    mimeType: 'application/pdf'
  })
});

// 发送位置消息给单个用户
const message = await client.im.sendLocation({
  toUserId: 'user-123',
  resource: ResourceBuilder.location('39.9042', '116.4074', {
    locationName: '天安门广场',
    address: '北京市东城区'
  })
});

// 发送名片消息给单个用户
const message = await client.im.sendCard({
  toUserId: 'user-123',
  resource: ResourceBuilder.card('user', {
    title: '张三',
    description: '产品经理',
    imageUrl: 'https://example.com/avatar.jpg'
  })
});

// 发送数字人/角色消息给单个用户
const message = await client.im.sendCharacter({
  toUserId: 'user-123',
  resource: ResourceBuilder.character('avatar', {
    title: 'AI助手',
    personalityPrompt: '友好、专业的AI助手',
    avatarUrl: 'https://example.com/avatar.jpg'
  })
});

// 发送音乐消息给单个用户
const message = await client.im.sendMusic({
  toUserId: 'user-123',
  resource: ResourceBuilder.music('https://example.com/music.mp3', '180', {
    genre: 'pop',
    mood: 'happy'
  })
});

// 发送3D模型消息给单个用户
const message = await client.im.sendModel3D({
  toUserId: 'user-123',
  resource: ResourceBuilder.model3d('https://example.com/model.glb', 'glb', {
    previewUrl: 'https://example.com/preview.jpg'
  })
});

// 发送自定义消息给单个用户
const message = await client.im.sendCustom({
  toUserId: 'user-123',
  customType: 'order',
  data: {
    orderId: 'ORDER-123',
    status: 'paid',
    amount: 199.99
  }
});

// 发送组合消息（支持多个资源）给单个用户
const message = await client.im.sendCombined({
  toUserId: 'user-123',
  resources: [
    ResourceBuilder.image('https://example.com/1.jpg'),
    ResourceBuilder.image('https://example.com/2.jpg'),
    ResourceBuilder.image('https://example.com/3.jpg')
  ],
  caption: '看看这些照片'
});
```

#### 消息操作 (client.im.messages)

```typescript
// 发送文本消息
await client.im.messages.sendText({ toUserId: 'user-123', text: 'Hello!' });

// 撤回消息
await client.im.messages.recallMessage('message-id');

// 删除消息
await client.im.messages.deleteMessage('message-id');

// 获取消息详情
const message = await client.im.messages.getMessage('message-id');

// 获取消息列表
const messages = await client.im.messages.getMessageList('conversation-id', {
  limit: 20,
  startMessageId: 'last-message-id'
});

// 搜索消息
const messages = await client.im.messages.searchMessages('关键字', 'conversation-id');

// 标记消息已读
await client.im.messages.markMessageAsRead('message-id');

// 标记会话已读
await client.im.messages.markConversationAsRead('conversation-id');

// 转发消息
const forwardedMessage = await client.im.messages.forwardMessage('message-id', 'target-id', ConversationType.SINGLE);

// 引用回复消息
const replyMessage = await client.im.messages.replyMessage('message-id', 'reply-to-id', '回复内容', ConversationType.SINGLE);

// 翻译消息
const translation = await client.im.messages.translateMessage('message-id', 'en');
console.log('原文:', translation.original);
console.log('译文:', translation.translated);

// 获取会话草稿
const draft = await client.im.messages.getConversationDraft('conversation-id');

// 设置会话草稿
await client.im.messages.setConversationDraft('conversation-id', '草稿内容');

// 清空会话草稿
await client.im.messages.clearConversationDraft('conversation-id');
```

#### 会话管理 (client.im.conversations)

```typescript
// 获取会话列表
const conversations = await client.im.conversations.getConversationList({
  limit: 50
});

// 获取会话详情
const conversation = await client.im.conversations.getConversation('conversation-id');

// 删除会话
await client.im.conversations.deleteConversation('conversation-id');

// 置顶/取消置顶会话
await client.im.conversations.setConversationPinned('conversation-id', true);
await client.im.conversations.setConversationPinned('conversation-id', false);

// 设置/取消免打扰
await client.im.conversations.setConversationMuted('conversation-id', true);
await client.im.conversations.setConversationMuted('conversation-id', false);

// 设置会话草稿
await client.im.conversations.setConversationDraft('conversation-id', '草稿内容');

// 创建会话
const conversation = await client.im.conversations.createConversation('target-id', ConversationType.SINGLE);
```

#### IM事件监听

```typescript
// 监听IM事件
client.im.on('message_received', (message) => {
  console.log('收到消息:', message);
});

client.im.on('message_sent', (message) => {
  console.log('消息已发送:', message);
});

client.im.on('connected', () => {
  console.log('IM已连接');
});

client.im.on('disconnected', () => {
  console.log('IM已断开');
});

// 取消监听
client.im.off('message_received', handler);
```

---

### RTC模块 (client.rtc)

提供完整的实时音视频通话功能，所有方法都通过 `client.rtc.xxx` 调用。

#### 初始化RTC

```typescript
// 初始化RTC模块
await client.rtc.init({
  provider: RTCProviderType.VOLCENGINE,  // 使用火山引擎RTC
  providerConfig: {
    appId: 'your-app-id',
    appKey: 'your-app-key',
  }
});

// 销毁RTC模块
await client.rtc.destroy();
```

#### 通话控制

```typescript
// 开始通话
await client.rtc.startCall('room-id', {
  autoPublish: true,    // 自动发布本地流
  autoSubscribe: true   // 自动订阅远程流
});

// 结束通话
await client.rtc.endCall();

// 检查是否在通话中
const inCall = client.rtc.isInCall();

// 获取当前房间ID
const roomId = client.rtc.getRoomId();
```

#### 流控制

```typescript
// 创建本地流
const localStream = await client.rtc.createLocalStream({
  video: true,
  audio: true
});

// 发布本地流
await client.rtc.publishStream(localStream.streamId);

// 取消发布本地流
await client.rtc.unpublishStream(localStream.streamId);

// 订阅远程流
const remoteStream = await client.rtc.subscribeStream('remote-user-id', {
  video: true,
  audio: true
});

// 取消订阅远程流
await client.rtc.unsubscribeStream('remote-user-id');
```

#### 设备控制

```typescript
// 启用/禁用视频
await client.rtc.enableVideo(true);
await client.rtc.enableVideo(false);

// 启用/禁用音频
await client.rtc.enableAudio(true);
await client.rtc.enableAudio(false);

// 切换摄像头
await client.rtc.switchCamera();
```

#### RTC事件监听

```typescript
// 监听RTC事件
client.rtc.on('call_started', ({ roomId }) => {
  console.log('通话开始:', roomId);
});

client.rtc.on('call_ended', ({ roomId }) => {
  console.log('通话结束:', roomId);
});

client.rtc.on(RTCEvent.USER_JOINED, ({ userId }) => {
  console.log('用户加入:', userId);
});

client.rtc.on(RTCEvent.USER_LEFT, ({ userId }) => {
  console.log('用户离开:', userId);
});

client.rtc.on(RTCEvent.REMOTE_STREAM_ADDED, ({ userId }) => {
  console.log('远程流添加:', userId);
});

client.rtc.on(RTCEvent.NETWORK_QUALITY, (quality) => {
  console.log('网络质量:', quality);
});

// 取消监听
client.rtc.off('call_started', handler);
```

---

### 认证模块 (client.auth)

```typescript
// 注册
const userInfo = await client.auth.register('username', 'password', '昵称');

// 登录（自动初始化SDK）
const userInfo = await client.auth.login('username', 'password');

// 登出（自动清理连接）
await client.auth.logout();

// 获取当前用户
const user = client.auth.getCurrentUser();

// 刷新Token
const newToken = await client.auth.refreshToken();
```

---

### 用户模块 (client.user)

```typescript
// 获取用户信息
const user = await client.user.getInfo('user-uid');

// 批量获取用户
const users = await client.user.getBatch(['uid1', 'uid2', 'uid3']);

// 更新用户信息
await client.user.update('user-uid', {
  nickname: '新昵称',
  avatar: 'https://example.com/avatar.jpg'
});

// 搜索用户
const users = await client.user.search('关键字', 20);
```

---

### 好友模块 (client.friend)

```typescript
// 获取好友列表
const friends = await client.friend.getList();

// 发送好友请求
await client.friend.sendRequest('target-uid', '你好，想加你为好友');

// 接受好友请求
await client.friend.acceptRequest('request-id');

// 拒绝好友请求
await client.friend.rejectRequest('request-id');

// 删除好友
await client.friend.remove('friend-uid');

// 拉黑好友
await client.friend.block('friend-uid');

// 取消拉黑
await client.friend.unblock('friend-uid');

// 设置备注
await client.friend.setRemark('friend-uid', '备注名');
```

---

### 群组模块 (client.group)

```typescript
// 创建群组
const group = await client.group.create('群组名称', ['member1', 'member2'], {
  avatar: 'https://example.com/group-avatar.jpg',
  notice: '群组公告'
});

// 获取群组信息
const group = await client.group.getInfo('group-id');

// 获取我的群组列表
const groups = await client.group.getMyList();

// 更新群组信息
await client.group.updateInfo('group-id', {
  name: '新名称',
  notice: '新公告'
});

// 解散群组
await client.group.dissolve('group-id');

// 获取群成员
const members = await client.group.getMembers('group-id');

// 添加成员
await client.group.addMember('group-id', 'new-member-uid');

// 移除成员
await client.group.removeMember('group-id', 'member-uid');

// 退出群组
await client.group.quit('group-id');
```

---

## 事件系统

```typescript
import { OpenChatEvent } from '@openchat/typescript-sdk';

// 连接状态事件
client.on(OpenChatEvent.CONNECTED, () => {
  console.log('SDK连接成功');
});

client.on(OpenChatEvent.DISCONNECTED, () => {
  console.log('SDK连接断开');
});

client.on(OpenChatEvent.ERROR, (error) => {
  console.error('SDK错误:', error);
});
```

---

## 错误处理

SDK提供了完整的错误处理机制，所有错误都通过`OpenChatError`类进行标准化处理。以下是详细的错误处理指南：

### 错误类型和代码

```typescript
import { ErrorCode, OpenChatError } from '@openchat/typescript-sdk';

// 错误代码分类
const errorCategories = {
  // 通用错误
  common: [
    ErrorCode.UNKNOWN_ERROR,    // 1000: 未知错误
    ErrorCode.NETWORK_ERROR,    // 1001: 网络错误
    ErrorCode.TIMEOUT_ERROR,    // 1002: 超时错误
    ErrorCode.INVALID_PARAM,    // 1003: 参数错误
  ],
  
  // 认证错误
  auth: [
    ErrorCode.AUTH_FAILED,      // 1100: 认证失败
    ErrorCode.TOKEN_EXPIRED,    // 1101: Token过期
    ErrorCode.TOKEN_INVALID,    // 1102: Token无效
  ],
  
  // 用户错误
  user: [
    ErrorCode.USER_NOT_FOUND,   // 1200: 用户不存在
    ErrorCode.USER_ALREADY_EXISTS, // 1201: 用户已存在
  ],
  
  // 消息错误
  message: [
    ErrorCode.MESSAGE_SEND_FAILED, // 1300: 消息发送失败
    ErrorCode.MESSAGE_NOT_FOUND,   // 1301: 消息不存在
  ],
  
  // 好友错误
  friend: [
    ErrorCode.FRIEND_NOT_FOUND,    // 1400: 好友不存在
    ErrorCode.FRIEND_ALREADY_EXISTS, // 1401: 好友已存在
  ],
  
  // 群组错误
  group: [
    ErrorCode.GROUP_NOT_FOUND,     // 1500: 群组不存在
    ErrorCode.GROUP_ALREADY_EXISTS, // 1501: 群组已存在
    ErrorCode.GROUP_PERMISSION_DENIED, // 1502: 群组权限不足
  ],
  
  // IM连接错误
  im: [
    ErrorCode.IM_CONNECT_FAILED,   // 2000: IM连接失败
    ErrorCode.IM_DISCONNECTED,     // 2001: IM已断开
  ],
  
  // RTC错误
  rtc: [
    ErrorCode.RTC_NOT_INITIALIZED, // 2100: RTC未初始化
    ErrorCode.RTC_CONNECT_FAILED,  // 2101: RTC连接失败
    ErrorCode.RTC_CALL_FAILED,     // 2102: RTC通话失败
  ],
};
```

### 错误处理最佳实践

```typescript
import { ErrorCode, OpenChatError } from '@openchat/typescript-sdk';

// 1. 基础错误处理
try {
  await client.auth.login('username', 'wrong-password');
} catch (error) {
  if (error instanceof OpenChatError) {
    switch (error.code) {
      case ErrorCode.AUTH_FAILED:
        console.log('认证失败：用户名或密码错误');
        // 显示登录错误提示
        break;
      case ErrorCode.NETWORK_ERROR:
        console.log('网络错误，请检查网络连接');
        // 显示网络错误提示
        break;
      case ErrorCode.TIMEOUT_ERROR:
        console.log('请求超时，请重试');
        // 显示超时错误提示
        break;
      case ErrorCode.INVALID_PARAM:
        console.log('参数错误:', error.message);
        // 显示参数错误提示
        break;
      default:
        console.log('未知错误:', error.message);
        // 显示通用错误提示
    }
  } else {
    // 处理非SDK错误
    console.log('系统错误:', error);
  }
}

// 2. 错误分类处理
function handleError(error: any) {
  if (!(error instanceof OpenChatError)) {
    console.error('系统错误:', error);
    return;
  }

  // 认证相关错误
  if (errorCategories.auth.includes(error.code)) {
    console.log('认证错误:', error.message);
    // 跳转到登录页面
    return;
  }

  // 网络相关错误
  if (error.code === ErrorCode.NETWORK_ERROR || error.code === ErrorCode.TIMEOUT_ERROR) {
    console.log('网络错误:', error.message);
    // 显示网络错误提示，建议用户检查网络连接
    return;
  }

  // IM连接错误
  if (errorCategories.im.includes(error.code)) {
    console.log('消息服务错误:', error.message);
    // 尝试重新连接IM服务
    setTimeout(() => {
      client.im.reconnect();
    }, 1000);
    return;
  }

  // 其他错误
  console.log('其他错误:', error.message);
}

// 3. 错误重试机制
async function withRetry<T>(fn: () => Promise<T>, retries: number = 3): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && 
        (error instanceof OpenChatError && 
         (error.code === ErrorCode.NETWORK_ERROR || 
          error.code === ErrorCode.TIMEOUT_ERROR || 
          error.code === ErrorCode.IM_CONNECT_FAILED))) {
      console.log(`请求失败，${retries}次重试机会`);
      // 指数退避
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, 3 - retries)));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
}

// 使用重试机制
try {
  const result = await withRetry(() => client.im.messages.sendText({ 
    toUserId: 'user-123', 
    text: 'Hello' 
  }));
  console.log('消息发送成功:', result);
} catch (error) {
  handleError(error);
}
```

### 错误监听

除了使用try-catch捕获错误外，你还可以通过事件监听器来捕获SDK的错误：

```typescript
// 监听全局错误
client.on('error', (error) => {
  console.log('SDK错误:', error);
  handleError(error);
});

// 监听IM服务错误
client.im.on('error', (error) => {
  console.log('IM服务错误:', error);
  // 处理IM错误
});

// 监听RTC服务错误
client.rtc.on('error', (error) => {
  console.log('RTC服务错误:', error);
  // 处理RTC错误
});
```

## 最佳实践

### 1. 初始化和连接管理

```typescript
// 正确的初始化流程
const client = createOpenChatClient({
  server: {
    baseUrl: 'https://api.openchat.com',
    timeout: 30000,
    maxRetries: 3,
    cache: {
      maxSize: 100,
      defaultTTL: 300000, // 5分钟
    },
  },
  im: {
    wsUrl: 'wss://im.openchat.com/ws',
    deviceId: `web-${Date.now()}`,
    deviceFlag: 2, // WEB
  },
  auth: {
    uid: 'user-123',
    token: 'your-token',
  },
});

// 初始化SDK
async function initializeSDK() {
  try {
    await client.init();
    console.log('SDK初始化成功');
    return true;
  } catch (error) {
    console.error('SDK初始化失败:', error);
    return false;
  }
}

// 监听连接状态
client.on('connected', () => {
  console.log('SDK已连接');
  // 连接成功后的处理
});

client.on('disconnected', () => {
  console.log('SDK已断开连接');
  // 断开连接后的处理
});

client.on('reconnecting', () => {
  console.log('SDK正在重连');
  // 显示重连提示
});

client.on('reconnected', () => {
  console.log('SDK重连成功');
  // 重连成功后的处理
});
```

### 2. 消息发送和接收

```typescript
// 消息发送最佳实践
async function sendMessage(toUserId: string, content: string) {
  try {
    // 显示发送中状态
    const messageId = `msg-${Date.now()}`;
    
    // 发送消息
    const message = await client.im.messages.sendText({
      toUserId,
      text: content,
    });
    
    console.log('消息发送成功:', message);
    return message;
  } catch (error) {
    console.error('消息发送失败:', error);
    // 显示发送失败状态
    throw error;
  }
}

// 消息接收最佳实践
client.on('message_received', (message) => {
  console.log('收到新消息:', message);
  
  // 处理不同类型的消息
  switch (message.type) {
    case 1: // 文本消息
      handleTextMessage(message);
      break;
    case 2: // 图片消息
      handleImageMessage(message);
      break;
    case 3: // 音频消息
      handleAudioMessage(message);
      break;
    case 4: // 视频消息
      handleVideoMessage(message);
      break;
    case 5: // 文件消息
      handleFileMessage(message);
      break;
    default:
      handleUnknownMessage(message);
  }
  
  // 标记消息为已读
  client.im.messages.markMessageAsRead(message.id);
});

// 消息批量获取
async function loadMessageHistory(conversationId: string, limit: number = 50) {
  try {
    const messages = await client.im.messages.getMessageList(conversationId, {
      limit,
    });
    console.log(`加载了${messages.length}条消息`);
    return messages;
  } catch (error) {
    console.error('加载消息历史失败:', error);
    return [];
  }
}
```

### 3. 会话管理

```typescript
// 会话列表管理
async function loadConversations() {
  try {
    const conversations = await client.im.conversations.getConversationList();
    console.log(`加载了${conversations.length}个会话`);
    
    // 处理会话列表
    conversations.forEach(conversation => {
      console.log('会话:', conversation.name, conversation.unreadCount);
    });
    
    return conversations;
  } catch (error) {
    console.error('加载会话列表失败:', error);
    return [];
  }
}

// 会话置顶和静音
async function updateConversationSettings(conversationId: string, isPinned: boolean, isMuted: boolean) {
  try {
    // 设置置顶
    await client.im.conversations.pinConversation(conversationId, isPinned);
    
    // 设置静音
    await client.im.conversations.muteConversation(conversationId, isMuted);
    
    console.log('会话设置更新成功');
  } catch (error) {
    console.error('更新会话设置失败:', error);
  }
}

// 会话草稿管理
async function saveConversationDraft(conversationId: string, draft: string) {
  try {
    await client.im.conversations.setConversationDraft(conversationId, draft);
    console.log('草稿保存成功');
  } catch (error) {
    console.error('保存草稿失败:', error);
  }
}
```

### 4. 群组管理

```typescript
// 创建群组
async function createGroup(name: string, memberUids: string[]) {
  try {
    const group = await client.im.groups.createGroup(name, memberUids, {
      avatar: 'https://example.com/group-avatar.jpg',
      notice: '欢迎加入群组',
    });
    console.log('群组创建成功:', group);
    return group;
  } catch (error) {
    console.error('创建群组失败:', error);
    throw error;
  }
}

// 群组成员管理
async function manageGroupMembers(groupId: string, addMembers: string[], removeMembers: string[]) {
  try {
    // 添加成员
    for (const uid of addMembers) {
      await client.im.groups.addGroupMember(groupId, uid);
    }
    
    // 移除成员
    for (const uid of removeMembers) {
      await client.im.groups.removeGroupMember(groupId, uid);
    }
    
    console.log('群组成员管理成功');
  } catch (error) {
    console.error('群组成员管理失败:', error);
  }
}
```

### 5. 性能优化

```typescript
// 1. 使用缓存
client.getApiService().enableCache(true);

// 2. 批量操作
async function batchGetUsers(uids: string[]) {
  try {
    const users = await client.getApiService().getUsers(uids);
    return users;
  } catch (error) {
    console.error('批量获取用户失败:', error);
    return [];
  }
}

// 3. 节流和防抖
import { throttle, debounce } from 'lodash';

// 节流处理消息发送
const sendMessageThrottled = throttle(async (params) => {
  try {
    return await client.im.messages.sendText(params);
  } catch (error) {
    console.error('发送消息失败:', error);
  }
}, 1000);

// 防抖处理搜索
const searchUsersDebounced = debounce(async (keyword) => {
  try {
    return await client.getApiService().searchUsers(keyword);
  } catch (error) {
    console.error('搜索用户失败:', error);
    return [];
  }
}, 300);

// 4. 资源管理
function cleanupSDK() {
  // 销毁SDK实例
  client.destroy();
  console.log('SDK已销毁');
}

// 页面卸载时清理
window.addEventListener('beforeunload', cleanupSDK);
```

### 6. 安全最佳实践

```typescript
// 1. Token管理
function manageToken(token: string) {
  // 存储Token
  localStorage.setItem('openchat-token', token);
  
  // 设置Token到SDK
  client.setToken(token);
}

// 2. 安全的认证流程
async function secureLogin(username: string, password: string) {
  try {
    const userInfo = await client.auth.login(username, password);
    // 存储认证信息
    manageToken(userInfo.token);
    return userInfo;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
}

// 3. 防止消息泄露
function secureMessageHandling(message) {
  // 检查消息来源
  if (!message.fromUid) {
    console.warn('消息缺少发送者ID');
    return false;
  }
  
  // 验证消息格式
  if (!message.id || !message.type || !message.content) {
    console.warn('消息格式不正确');
    return false;
  }
  
  return true;
}

// 4. 定期刷新Token
setInterval(async () => {
  try {
    const newToken = await client.auth.refreshToken();
    manageToken(newToken);
    console.log('Token已刷新');
  } catch (error) {
    console.error('刷新Token失败:', error);
    // Token刷新失败，可能需要重新登录
  }
}, 30 * 60 * 1000); // 每30分钟刷新一次
```

### 7. 多平台适配

```typescript
import {
  detectPlatform,
  isBrowser,
  isNode,
  isMiniProgram,
  isWeChat,
  isAlipay,
  Platform
} from '@openchat/typescript-sdk';

// 平台检测和适配
function adaptToPlatform() {
  const platform = detectPlatform();
  console.log('当前平台:', platform);
  
  switch (platform) {
    case Platform.BROWSER:
      console.log('在浏览器中运行');
      // 浏览器特定处理
      break;
    
    case Platform.NODE:
      console.log('在Node.js中运行');
      // Node.js特定处理
      break;
    
    case Platform.WECHAT:
      console.log('在微信小程序中运行');
      // 微信小程序特定处理
      break;
    
    case Platform.ALIPAY:
      console.log('在支付宝小程序中运行');
      // 支付宝小程序特定处理
      break;
    
    case Platform.BAIDU:
      console.log('在百度小程序中运行');
      // 百度小程序特定处理
      break;
    
    case Platform.BYTE_DANCE:
      console.log('在字节跳动小程序中运行');
      // 字节跳动小程序特定处理
      break;
    
    default:
      console.log('在未知平台中运行');
  }
}

// 调用平台适配
adaptToPlatform();
```

---

## 平台检测

SDK自动检测运行平台，你也可以手动检测：

```typescript
import { 
  detectPlatform, 
  isBrowser, 
  isNode, 
  isMiniProgram,
  isWeChat,
  isAlipay,
  Platform 
} from '@openchat/typescript-sdk';

// 检测当前平台
const platform = detectPlatform();
console.log(platform); // 'browser' | 'node' | 'wechat' | 'alipay' | ...

// 判断特定平台
if (isBrowser()) {
  console.log('在浏览器中运行');
}

if (isMiniProgram()) {
  console.log('在小程序中运行');
}

if (isWeChat()) {
  console.log('在微信小程序中运行');
}
```

---

## 高级用法

### 直接使用服务层

```typescript
import { ApiService, WukongIMService, ResourceBuilder, ConversationType } from '@openchat/typescript-sdk';

// 直接使用API服务层
const apiService = new ApiService({
  apiBaseUrl: 'https://api.openchat.com',    // OpenChat REST API地址
  imWsUrl: 'wss://im.openchat.com/ws',       // 悟空IM WebSocket地址
  uid: '',
  token: '',
});

// 登录获取token
const userInfo = await apiService.login('username', 'password');
apiService.setToken(userInfo.token);

// 调用API
const friends = await apiService.getFriends();

// 直接使用IM服务层
const imService = new WukongIMService();
await imService.connect({
  uid: 'user-uid',
  token: 'user-token',
  serverUrl: 'wss://im.openchat.com/ws',  // 悟空IM WebSocket地址
});

// 发送消息 - 使用 MediaResource 标准
const message = await imService.sendText({
  targetId: 'channel-id',
  conversationType: ConversationType.SINGLE,
  text: 'Hello'
});

// 发送图片
const imageMessage = await imService.sendImage({
  targetId: 'channel-id',
  conversationType: ConversationType.SINGLE,
  resource: ResourceBuilder.image('https://example.com/image.jpg')
});
```

---

## 类型定义

SDK提供完整的TypeScript类型定义，以下是核心类型的详细说明：

### 配置类型

```typescript
import {
  ServerConfig,
  WukongIMConfig,
  AuthConfig,
  OpenChatSDKConfig,
  DeviceFlag
} from '@openchat/typescript-sdk';

// 服务端API配置
interface ServerConfig {
  baseUrl: string;         // OpenChat Server API地址
  apiKey?: string;         // API密钥（可选）
  timeout?: number;        // 请求超时时间（毫秒）
  maxRetries?: number;     // 最大重试次数
  headers?: Record<string, string>; // 自定义请求头
  cache?: {
    maxSize?: number;       // 最大缓存大小
    defaultTTL?: number;    // 默认缓存TTL（毫秒）
  };
}

// 悟空IM配置
interface WukongIMConfig {
  wsUrl: string;           // 悟空IM WebSocket地址
  apiUrl?: string;         // 悟空IM API地址（可选）
  deviceId?: string;        // 设备标识
  deviceFlag?: DeviceFlag;  // 设备类型
  appId?: string;           // 悟空IM应用ID
  appKey?: string;          // 悟空IM应用密钥
}

// 认证配置
interface AuthConfig {
  uid: string;              // 用户ID
  token: string;            // 认证Token
  useThirdPartyAuth?: boolean; // 是否使用第三方认证系统
  thirdPartyAuth?: {
    type: string;           // 认证类型
    info: Record<string, any>; // 认证信息
  };
}

// 完整SDK配置
interface OpenChatSDKConfig {
  server: ServerConfig;     // 服务端API配置
  im: WukongIMConfig;       // 悟空IM配置
  auth: AuthConfig;         // 认证配置
  debug?: boolean;          // 是否启用调试日志
  extras?: Record<string, any>; // 全局扩展字段
}

// 设备标识枚举
enum DeviceFlag {
  APP = 1,            // 移动应用
  WEB = 2,            // Web浏览器
  MINI_PROGRAM = 3,   // 小程序
}
```

### 用户类型

```typescript
import {
  User,
  UserInfo,
  UserStatus
} from '@openchat/typescript-sdk';

// 用户信息
interface User {
  id: string;               // 用户ID
  username: string;          // 用户名
  nickname?: string;         // 昵称
  avatar?: string;           // 头像URL
  status?: UserStatus;       // 在线状态
  lastSeenAt?: number;       // 最后在线时间
  createdAt: number;         // 创建时间
  updatedAt: number;         // 更新时间
  extras?: Record<string, any>; // 扩展字段
}

// 用户状态枚举
enum UserStatus {
  ONLINE = 'online',         // 在线
  OFFLINE = 'offline',       // 离线
  BUSY = 'busy',             // 忙碌
  AWAY = 'away',             // 离开
}

// 用户认证信息
interface UserInfo {
  user: User;                // 用户信息
  token: string;             // 认证Token
  expiresAt?: number;         // 过期时间
}
```

### 消息类型

```typescript
import {
  Message,
  MessageType,
  MessageStatus,
  ChannelType,
  ImageContent,
  AudioContent,
  VideoContent,
  FileContent,
  LocationContent,
  CardContent
} from '@openchat/typescript-sdk';

// 消息
interface Message {
  id: string;               // 消息ID
  type: MessageType;         // 消息类型
  content: any;              // 消息内容
  fromUid: string;           // 发送者ID
  toUid?: string;            // 接收者ID（单聊）
  channelId?: string;        // 频道ID（群聊）
  channelType: ChannelType;   // 频道类型
  status: MessageStatus;      // 消息状态
  timestamp: number;         // 发送时间
  clientSeq?: number;         // 客户端序列号
  isRead?: boolean;           // 是否已读
}

// 消息类型枚举
enum MessageType {
  TEXT = 1,                  // 文本消息
  IMAGE = 2,                 // 图片消息
  AUDIO = 3,                 // 音频消息
  VIDEO = 4,                 // 视频消息
  FILE = 5,                  // 文件消息
  LOCATION = 6,               // 位置消息
  CARD = 7,                  // 卡片消息
  CUSTOM = 99,                // 自定义消息
}

// 消息状态枚举
enum MessageStatus {
  SENDING = 'sending',        // 发送中
  SENT = 'sent',              // 已发送
  DELIVERED = 'delivered',    // 已送达
  READ = 'read',              // 已读
  FAILED = 'failed',          // 发送失败
  RECALLED = 'recalled',       // 已撤回
}

// 频道类型枚举
enum ChannelType {
  PERSON = 1,                 // 单聊
  GROUP = 2,                  // 群聊
  CUSTOMER = 3,               // 客服
}
```

### 会话类型

```typescript
import {
  Conversation,
  ConversationType,
  ConversationMember,
  ReadReceipt
} from '@openchat/typescript-sdk';

// 会话
interface Conversation {
  id: string;               // 会话ID
  channelId: string;         // 频道ID
  channelType: ChannelType;   // 频道类型
  type: ConversationType;     // 会话类型
  targetId: string;           // 目标ID（用户ID或群组ID）
  name?: string;              // 会话名称
  avatar?: string;            // 头像
  lastMessage?: Message;      // 最后一条消息
  unreadCount: number;        // 未读数
  isPinned: boolean;          // 是否置顶
  isMuted: boolean;           // 是否免打扰
  updatedAt: number;          // 最后更新时间
  createdAt?: number;         // 创建时间
  extras?: Record<string, any>; // 扩展字段
}

// 会话类型枚举
enum ConversationType {
  SINGLE = 'single',          // 单聊
  GROUP = 'group',            // 群聊
  CUSTOMER = 'customer',      // 客服
}

// 会话成员
interface ConversationMember {
  userId: string;             // 用户ID
  role?: number;              // 角色
  joinTime?: number;          // 加入时间
}

// 已读回执
interface ReadReceipt {
  userId: string;             // 用户ID
  timestamp: number;          // 已读时间戳
}
```

### 好友类型

```typescript
import {
  Friend,
  FriendStatus,
  FriendRequest,
  FriendRequestStatus
} from '@openchat/typescript-sdk';

// 好友
interface Friend {
  uid: string;               // 好友ID
  user?: User;                // 好友信息
  remark?: string;            // 备注名
  status: FriendStatus;       // 状态
  createdAt: number;          // 添加时间
  extras?: Record<string, any>; // 扩展字段
}

// 好友状态枚举
enum FriendStatus {
  PENDING = 'pending',        // 待确认
  ACCEPTED = 'accepted',      // 已接受
  BLOCKED = 'blocked',        // 已拉黑
}

// 好友请求
interface FriendRequest {
  id: string;               // 请求ID
  fromUid: string;            // 发送者ID
  toUid: string;              // 接收者ID
  message?: string;           // 验证消息
  status: FriendRequestStatus; // 状态
  createdAt: number;          // 创建时间
}

// 好友请求状态枚举
enum FriendRequestStatus {
  PENDING = 'pending',        // 待处理
  ACCEPTED = 'accepted',      // 已接受
  REJECTED = 'rejected',      // 已拒绝
  EXPIRED = 'expired',        // 已过期
}
```

### 群组类型

```typescript
import {
  Group,
  GroupType,
  GroupMember,
  GroupRole
} from '@openchat/typescript-sdk';

// 群组
interface Group {
  id: string;               // 群组ID
  name: string;              // 群组名称
  avatar?: string;           // 群组头像
  notice?: string;           // 群组公告
  ownerUid: string;          // 群主ID
  memberCount: number;        // 成员数量
  maxMembers: number;         // 最大成员数
  type: GroupType;            // 群组类型
  createdAt: number;          // 创建时间
  extras?: Record<string, any>; // 扩展字段
}

// 群组类型枚举
enum GroupType {
  NORMAL = 1,                 // 普通群组
  TEMP = 2,                   // 临时群组
}

// 群成员
interface GroupMember {
  groupId: string;            // 群组ID
  uid: string;                // 用户ID
  user?: User;                 // 用户信息
  role: GroupRole;             // 角色
  groupNickname?: string;      // 群昵称
  joinedAt: number;            // 加入时间
}

// 群成员角色枚举
enum GroupRole {
  OWNER = 1,                  // 群主
  ADMIN = 2,                  // 管理员
  MEMBER = 3,                  // 普通成员
}
```

### 联系人类型

```typescript
import {
  Contact,
  ContactType
} from '@openchat/typescript-sdk';

// 联系人
interface Contact {
  id: string;               // 联系人ID
  uid: string;               // 用户ID
  type: ContactType;          // 类型
  name?: string;              // 名称
  remark?: string;            // 备注
  tags?: string[];            // 标签
  isFavorite: boolean;        // 是否收藏
  lastContactAt?: number;     // 最后联系时间
}

// 联系人类型枚举
enum ContactType {
  USER = 'user',              // 用户
  GROUP = 'group',            // 群组
}
```

### 事件类型

```typescript
import {
  OpenChatEvent
} from '@openchat/typescript-sdk';

// 事件枚举
enum OpenChatEvent {
  // 连接事件
  CONNECTED = 'connected',             // 已连接
  DISCONNECTED = 'disconnected',       // 已断开
  RECONNECTING = 'reconnecting',       // 正在重连
  RECONNECTED = 'reconnected',         // 重连成功
  
  // 消息事件
  MESSAGE_RECEIVED = 'message_received', // 收到消息
  MESSAGE_SENT = 'message_sent',       // 消息已发送
  MESSAGE_FAILED = 'message_failed',   // 消息发送失败
  MESSAGE_READ = 'message_read',       // 消息已读
  MESSAGE_RECALLED = 'message_recalled', // 消息已撤回
  
  // 用户事件
  USER_ONLINE = 'user_online',         // 用户上线
  USER_OFFLINE = 'user_offline',       // 用户离线
  USER_INFO_UPDATED = 'user_info_updated', // 用户信息更新
  
  // 好友事件
  FRIEND_REQUEST_RECEIVED = 'friend_request_received', // 收到好友请求
  FRIEND_ADDED = 'friend_added',       // 添加好友
  FRIEND_REMOVED = 'friend_removed',   // 删除好友
  FRIEND_BLOCKED = 'friend_blocked',   // 拉黑好友
  
  // 群组事件
  GROUP_INVITATION_RECEIVED = 'group_invitation_received', // 收到群邀请
  GROUP_MEMBER_ADDED = 'group_member_added', // 添加群成员
  GROUP_MEMBER_REMOVED = 'group_member_removed', // 移除群成员
  GROUP_INFO_UPDATED = 'group_info_updated', // 群组信息更新
  
  // 会话事件
  CONVERSATION_UPDATED = 'conversation_updated', // 会话更新
  CONVERSATION_DELETED = 'conversation_deleted', // 会话删除
  
  // 错误事件
  ERROR = 'error',                     // 错误
}
```

### 错误类型

```typescript
import {
  ErrorCode,
  OpenChatError
} from '@openchat/typescript-sdk';

// 错误代码枚举
enum ErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 1000,        // 未知错误
  NETWORK_ERROR = 1001,        // 网络错误
  TIMEOUT_ERROR = 1002,        // 超时错误
  INVALID_PARAM = 1003,        // 参数错误
  
  // 认证错误
  AUTH_FAILED = 1100,          // 认证失败
  TOKEN_EXPIRED = 1101,        // Token过期
  TOKEN_INVALID = 1102,        // Token无效
  
  // 用户错误
  USER_NOT_FOUND = 1200,       // 用户不存在
  USER_ALREADY_EXISTS = 1201,   // 用户已存在
  
  // 消息错误
  MESSAGE_SEND_FAILED = 1300,   // 消息发送失败
  MESSAGE_NOT_FOUND = 1301,     // 消息不存在
  
  // 好友错误
  FRIEND_NOT_FOUND = 1400,      // 好友不存在
  FRIEND_ALREADY_EXISTS = 1401,  // 好友已存在
  
  // 群组错误
  GROUP_NOT_FOUND = 1500,       // 群组不存在
  GROUP_ALREADY_EXISTS = 1501,   // 群组已存在
  GROUP_PERMISSION_DENIED = 1502, // 群组权限不足
  
  // IM连接错误
  IM_CONNECT_FAILED = 2000,     // IM连接失败
  IM_DISCONNECTED = 2001,       // IM已断开
  
  // RTC错误
  RTC_NOT_INITIALIZED = 2100,   // RTC未初始化
  RTC_CONNECT_FAILED = 2101,    // RTC连接失败
  RTC_CALL_FAILED = 2102,       // RTC通话失败
}

// 错误类
class OpenChatError extends Error {
  code: ErrorCode;             // 错误代码
  data?: any;                  // 错误数据

  constructor(code: ErrorCode, message: string, data?: any);
}
```

### 选项类型

```typescript
import {
  SendMessageOptions,
  QueryMessagesOptions,
  QueryConversationsOptions
} from '@openchat/typescript-sdk';

// 发送消息选项
interface SendMessageOptions {
  persist?: boolean;           // 是否持久化
  receipt?: boolean;           // 是否需要回执
  timeout?: number;            // 超时时间
}

// 查询消息选项
interface QueryMessagesOptions {
  startMessageId?: string;     // 起始消息ID
  endMessageId?: string;       // 结束消息ID
  limit?: number;              // 查询数量
  reverse?: boolean;           // 是否倒序
}

// 查询会话选项
interface QueryConversationsOptions {
  channelType?: ChannelType;    // 会话类型过滤
  includePinned?: boolean;      // 是否包含置顶
  limit?: number;              // 查询数量
}
```

### 回调类型

```typescript
import {
  EventCallback,
  MessageCallback,
  UserCallback,
  ErrorCallback,
  ConnectionCallback,
  DisconnectionCallback
} from '@openchat/typescript-sdk';

// 事件回调类型
type EventCallback<T = any> = (data: T) => void;

// 消息回调类型
type MessageCallback = EventCallback<Message>;

// 用户回调类型
type UserCallback = EventCallback<User>;

// 错误回调类型
type ErrorCallback = EventCallback<OpenChatError>;

// 连接回调类型
type ConnectionCallback = EventCallback<{ uid: string }>;

// 断开连接回调类型
type DisconnectionCallback = EventCallback<{ code: number; reason: string }>;
```

### MediaResource 类型

```typescript
import {
  MediaResource,
  ImageResource,
  AudioResource,
  VideoResource,
  FileResource,
  LocationResource,
  CardResource,
  CustomResource,
  ResourceBuilder
} from '@openchat/typescript-sdk';

// 图片资源
interface ImageResource {
  type: 'image';
  url: string;
  width?: string;
  height?: string;
  size?: string;
  thumbnailUrl?: string;
  format?: string;
}

// 音频资源
interface AudioResource {
  type: 'audio';
  url: string;
  duration: string;
  text?: string;
  waveform?: number[];
  format?: string;
}

// 视频资源
interface VideoResource {
  type: 'video';
  url: string;
  duration: string;
  coverUrl?: string;
  width?: string;
  height?: string;
  format?: string;
}

// 文件资源
interface FileResource {
  type: 'file';
  url: string;
  name: string;
  size?: string;
  mimeType?: string;
  format?: string;
}

// 位置资源
interface LocationResource {
  type: 'location';
  latitude: string;
  longitude: string;
  locationName?: string;
  address?: string;
}

// 卡片资源
interface CardResource {
  type: 'card';
  cardType: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  data?: Record<string, any>;
}

// 自定义资源
interface CustomResource {
  type: 'custom';
  customType: string;
  data: Record<string, any>;
}

// 资源构建器
class ResourceBuilder {
  static image(url: string, options?: Partial<ImageResource>): ImageResource;
  static audio(url: string, duration: string, options?: Partial<AudioResource>): AudioResource;
  static video(url: string, duration: string, options?: Partial<VideoResource>): VideoResource;
  static file(url: string, name: string, options?: Partial<FileResource>): FileResource;
  static location(latitude: string, longitude: string, options?: Partial<LocationResource>): LocationResource;
  static card(cardType: string, options?: Partial<CardResource>): CardResource;
  static custom(customType: string, data: Record<string, any>): CustomResource;
}
```

---

## 常见问题解答 (FAQ)

### 安装和配置

**Q: 安装SDK时遇到依赖冲突怎么办？**
A: 可以尝试使用 `npm install --legacy-peer-deps` 命令安装，或者检查项目的依赖版本，确保与SDK的依赖版本兼容。

**Q: 如何配置SDK以连接到自定义的OpenChat服务器？**
A: 在创建SDK实例时，通过 `server.baseUrl` 配置项指定自定义服务器地址：
```typescript
const client = createOpenChatClient({
  server: {
    baseUrl: 'https://your-custom-server.com',
  },
  // 其他配置...
});
```

**Q: 如何配置悟空IM服务？**
A: 在创建SDK实例时，通过 `im` 配置项指定悟空IM服务地址：
```typescript
const client = createOpenChatClient({
  im: {
    wsUrl: 'wss://your-wukongim-server.com/ws',
    apiUrl: 'https://your-wukongim-server.com/api',
  },
  // 其他配置...
});
```

### 连接和认证

**Q: SDK初始化失败，提示"IM连接失败"怎么办？**
A: 检查以下几点：
1. 悟空IM WebSocket地址是否正确
2. 网络连接是否正常
3. 用户认证Token是否有效
4. 防火墙是否阻止了WebSocket连接

**Q: 如何使用第三方认证系统？**
A: 使用 `initWithThirdPartyAuth` 方法初始化SDK：
```typescript
await client.initWithThirdPartyAuth({
  type: 'your-auth-type',
  info: {
    // 第三方认证信息
  }
});
```

**Q: Token过期了怎么办？**
A: 可以使用 `client.auth.refreshToken()` 方法刷新Token，或者监听认证错误，在Token过期时重新登录。

### 消息发送和接收

**Q: 消息发送失败，提示"消息发送失败"怎么办？**
A: 检查以下几点：
1. IM服务是否连接正常
2. 目标用户ID或群组ID是否正确
3. 消息内容是否符合格式要求
4. 网络连接是否稳定

**Q: 为什么收不到消息？**
A: 检查以下几点：
1. IM服务是否连接正常
2. 是否正确监听了 `message_received` 事件
3. 消息是否被过滤或拦截
4. 网络连接是否稳定

**Q: 如何发送图片、音频等多媒体消息？**
A: 使用 `ResourceBuilder` 构建资源，然后调用相应的发送方法：
```typescript
const imageResource = ResourceBuilder.image('https://example.com/image.jpg');
await client.im.messages.sendImage({
  toUserId: 'user-123',
  resource: imageResource
});
```

### 会话和群组

**Q: 如何创建会话？**
A: 使用 `client.im.conversations.createConversation` 方法：
```typescript
const conversation = await client.im.conversations.createConversation(
  'target-user-id',
  ConversationType.SINGLE
);
```

**Q: 如何创建群组？**
A: 使用 `client.im.groups.createGroup` 方法：
```typescript
const group = await client.im.groups.createGroup(
  '群组名称',
  ['member-id-1', 'member-id-2']
);
```

**Q: 如何获取会话列表？**
A: 使用 `client.im.conversations.getConversationList` 方法：
```typescript
const conversations = await client.im.conversations.getConversationList();
```

### 错误处理

**Q: 如何处理网络错误？**
A: 可以使用重试机制，或者显示网络错误提示：
```typescript
async function withRetry(fn, retries = 3) {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && error.code === ErrorCode.NETWORK_ERROR) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
}
```

**Q: 如何处理认证错误？**
A: 认证错误通常需要重新登录，可以监听认证错误并跳转到登录页面：
```typescript
client.on('error', (error) => {
  if (error.code === ErrorCode.AUTH_FAILED || error.code === ErrorCode.TOKEN_EXPIRED) {
    // 跳转到登录页面
    window.location.href = '/login';
  }
});
```

### 性能优化

**Q: 如何优化SDK的性能？**
A: 可以从以下几个方面优化：
1. 启用缓存：`client.getApiService().enableCache(true);`
2. 使用批量操作：如 `client.getApiService().getUsers()` 批量获取用户信息
3. 使用节流和防抖：限制频繁操作
4. 及时清理资源：页面卸载时调用 `client.destroy()`
5. 优化消息处理：避免在消息接收回调中执行耗时操作

**Q: 如何减少SDK的包体积？**
A: 可以使用按需导入，或者在构建时使用Tree Shaking：
```typescript
// 按需导入
import { createOpenChatClient } from '@openchat/typescript-sdk';
import { ResourceBuilder } from '@openchat/typescript-sdk';
```

### 多平台适配

**Q: 如何在微信小程序中使用SDK？**
A: 在微信小程序中，SDK会自动检测平台并适配，使用方式与浏览器端相同：
```typescript
// app.js
const { createOpenChatClient } = require('@openchat/typescript-sdk');

App({
  onLaunch() {
    this.globalData.client = createOpenChatClient({
      // 配置...
    });
  }
});
```

**Q: 如何在Node.js中使用SDK？**
A: 在Node.js中，SDK会自动检测平台并适配，使用方式与浏览器端相同：
```typescript
const { createOpenChatClient } = require('@openchat/typescript-sdk');

const client = createOpenChatClient({
  // 配置...
});

await client.init();
```

### RTC相关

**Q: 如何使用RTC功能？**
A: 首先初始化RTC模块，然后开始通话：
```typescript
// 初始化RTC
await client.rtc.init({
  provider: RTCProviderType.VOLCENGINE,
  providerConfig: {
    appId: 'your-app-id',
    appKey: 'your-app-key',
  }
});

// 开始通话
await client.rtc.startCall('room-id');
```

**Q: RTC通话失败怎么办？**
A: 检查以下几点：
1. RTC模块是否正确初始化
2. 摄像头和麦克风权限是否开启
3. 网络连接是否稳定
4. RTC服务配置是否正确

### 其他问题

**Q: SDK支持哪些消息类型？**
A: SDK支持多种消息类型，包括文本、图片、音频、视频、文件、位置、卡片、自定义消息等。

**Q: 如何自定义消息类型？**
A: 使用 `client.im.messages.sendCustom` 方法发送自定义消息：
```typescript
await client.im.messages.sendCustom({
  toUserId: 'user-123',
  customType: 'your-custom-type',
  data: {
    // 自定义数据
  }
});
```

**Q: 如何实现消息撤回功能？**
A: 使用 `client.im.messages.recallMessage` 方法：
```typescript
await client.im.messages.recallMessage('message-id');
```

**Q: 如何实现消息已读回执？**
A: 使用 `client.im.messages.markMessageAsRead` 方法：
```typescript
await client.im.messages.markMessageAsRead('message-id');
```

**Q: 如何搜索消息？**
A: 使用 `client.im.messages.searchMessages` 方法：
```typescript
const messages = await client.im.messages.searchMessages('关键字', 'conversation-id');
```

## 浏览器支持

- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

---

## 小程序支持

- ✅ 微信小程序 (WeChat Mini Program)
- ✅ 支付宝小程序 (Alipay Mini Program)
- ✅ 百度智能小程序 (Baidu Smart Program)
- ✅ 字节跳动小程序 (ByteDance Mini Program)

---

## Node.js支持

- Node.js 14+

---

## 支持的RTC Provider

| Provider | 类型 | 状态 |
|---------|------|------|
| **火山引擎** | `RTCProviderType.VOLCENGINE` | ✅ 已支持 |
| **声网Agora** | `RTCProviderType.AGORA` | 🚧 计划中 |
| **腾讯TRTC** | `RTCProviderType.TRTC` | 🚧 计划中 |

---

## 依赖说明

- **悟空IM EasySDK**: 提供底层实时通讯能力
- **EventEmitter3**: 事件系统（浏览器/Node.js）
- **火山引擎RTC SDK**: RTC音视频通话能力（可选）

---

## 许可证

MIT License
