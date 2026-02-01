/**
 * IM 模块入口 - SDK集成版
 *
 * 职责：
 * 1. 导出模块公共 API
 * 2. 导出页面组件
 * 3. 导出类型定义
 * 4. 导出SDK适配器和Provider
 *
 * 注意：所有IM操作都通过OpenChat TypeScript SDK实现
 */

// 页面
export { ChatPage } from './pages/ChatPage';

// 实体类型
export type {
  Conversation,
  ConversationType,
  ConversationFilter
} from './entities/conversation.entity';

export type {
  Message,
  MessageType,
  MessageStatus,
  SendMessageRequest
} from './entities/message.entity';

export type {
  Group,
  GroupMember,
  GroupRole,
  GroupNotice,
  GroupSettings
} from './entities/group.entity';

// Hooks
export { useConversations } from './hooks/useConversations';
export { useMessages } from './hooks/useMessages';

// 服务（基于SDK实现）
export * from './services';

// SDK适配器
export * from './adapters';

// SDK Provider
export { SDKProvider, useSDK, useSDKReady } from './components/SDKProvider';

// 组件
export { VirtualizedMessageList } from './components/VirtualizedMessageList';
