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

提供完整的即时通讯功能，所有方法都通过 `client.im.xxx` 调用。

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

#### 消息操作

```typescript
// 撤回消息
await client.im.recallMessage('message-id');

// 删除消息
await client.im.deleteMessage('message-id');

// 获取消息详情
const message = await client.im.getMessage('message-id');

// 获取消息列表
const messages = await client.im.getMessageList('conversation-id', {
  limit: 20,
  startMessageId: 'last-message-id'
});

// 搜索消息
const messages = await client.im.searchMessages('关键字', 'conversation-id');

// 标记消息已读
await client.im.markMessageAsRead('message-id');

// 标记会话已读
await client.im.markConversationAsRead('conversation-id');
```

#### 会话管理

```typescript
// 获取会话列表
const conversations = await client.im.getConversationList({
  limit: 50
});

// 获取会话详情
const conversation = await client.im.getConversation('conversation-id');

// 删除会话
await client.im.deleteConversation('conversation-id');

// 置顶/取消置顶会话
await client.im.setConversationPinned('conversation-id', true);
await client.im.setConversationPinned('conversation-id', false);

// 设置/取消免打扰
await client.im.setConversationMuted('conversation-id', true);
await client.im.setConversationMuted('conversation-id', false);

// 设置会话草稿
await client.im.setConversationDraft('conversation-id', '草稿内容');
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

```typescript
import { ErrorCode, OpenChatError } from '@openchat/typescript-sdk';

try {
  await client.auth.login('username', 'wrong-password');
} catch (error) {
  if (error instanceof OpenChatError) {
    switch (error.code) {
      case ErrorCode.AUTH_FAILED:
        console.log('认证失败：用户名或密码错误');
        break;
      case ErrorCode.NETWORK_ERROR:
        console.log('网络错误，请检查网络连接');
        break;
      case ErrorCode.IM_CONNECT_FAILED:
        console.log('IM连接失败');
        break;
      default:
        console.log('未知错误:', error.message);
    }
  }
}
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

SDK提供完整的TypeScript类型定义：

```typescript
import {
  // 配置类型
  OpenChatSDKConfig,
  
  // 实体类型
  User,
  UserInfo,
  Message,
  Conversation,
  Friend,
  FriendRequest,
  Group,
  GroupMember,
  
  // MediaResource 类型
  MediaResource,
  ImageResource,
  AudioResource,
  VideoResource,
  FileResource,
  LocationResource,
  CardResource,
  CustomResource,
  ResourceBuilder,
  
  // 枚举类型
  MessageType,
  MessageStatus,
  ConversationType,
  OpenChatEvent,
  ErrorCode,
  RTCProviderType,
  RTCEvent,
  
  // 错误类型
  OpenChatError,
} from '@openchat/typescript-sdk';
```

---

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
