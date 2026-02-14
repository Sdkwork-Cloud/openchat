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
  SendMessageRequest,
  MessageAttachment
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

// SDK适配器函数
export {
  getSDKClient,
  initializeSDK,
  destroySDK,
  isSDKInitialized,
  getSDKState,
  subscribeToSDKState,
  convertSDKMessageToFrontend,
  convertFrontendContentToSDK,
  convertSDKConversationToFrontend,
  convertSDKGroupToFrontend,
  convertSDKGroupMemberToFrontend,
  registerSDKEvents,
  sendTextMessage,
  sendImageMessage,
  getMessageList,
  recallMessage,
  deleteMessage,
  markMessageAsRead,
  markConversationAsRead,
  searchMessageList,
  getGroupList,
  getGroupDetail,
  createGroup,
  addGroupMembers,
  removeGroupMember,
  quitGroup,
  dissolveGroup,
  type SDKAdapterConfig,
} from './adapters';

// SDK Provider
export { SDKProvider, useSDK, useSDKReady } from './components/SDKProvider';

// 组件
export { VirtualizedMessageList } from './components/VirtualizedMessageList';

// 消息服务类型和函数
export {
  sendMessage,
  getMessages,
  recallMessage as recallMessageService,
  deleteMessage as deleteMessageService,
  searchMessages,
  markMessagesAsRead,
  getUnreadCount,
  registerMessageEventListeners,
  type MessageContent,
  type MessageContentType,
  type SendMessageParams,
  type MessageQueryParams,
} from './services/message.service';
