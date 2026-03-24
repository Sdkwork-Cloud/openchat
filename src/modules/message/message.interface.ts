import {
  TextMediaResource,
  ImageMediaResource,
  VideoMediaResource,
  AudioMediaResource,
  MusicMediaResource,
  FileMediaResource,
  DocumentMediaResource,
  CodeMediaResource,
  CardMediaResource,
  PptMediaResource,
  CharacterMediaResource,
  Model3DMediaResource,
  LocationMediaResource,
} from "../../common/media-resource";

export {
  TextMediaResource,
  ImageMediaResource,
  VideoMediaResource,
  AudioMediaResource,
  MusicMediaResource,
  FileMediaResource,
  DocumentMediaResource,
  CodeMediaResource,
  CardMediaResource,
  PptMediaResource,
  CharacterMediaResource,
  Model3DMediaResource,
  LocationMediaResource,
};

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  AUDIO = "audio",
  VIDEO = "video",
  FILE = "file",
  LOCATION = "location",
  CARD = "card",
  CUSTOM = "custom",
  SYSTEM = "system",
  MUSIC = "music",
  DOCUMENT = "document",
  CODE = "code",
  PPT = "ppt",
  CHARACTER = "character",
  MODEL_3D = "model_3d",
}

export enum MessageStatus {
  SENDING = "sending",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed",
  RECALLED = "recalled",
}

export enum ConversationType {
  SINGLE = "single",
  GROUP = "group",
}

export type TextContent = TextMediaResource;

export type LocationContent = LocationMediaResource;

export interface CardContent {
  userId: string;
  nickname?: string;
  avatar?: string;
  signature?: string;
}

export interface SystemContent {
  type: string;
  data?: Record<string, any>;
}

export interface CustomContent {
  customType: string;
  data?: Record<string, any>;
}

export interface EventContent {
  type: string;
  name?: string;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface MessageContent {
  text?: TextContent;
  image?: ImageMediaResource;
  video?: VideoMediaResource;
  audio?: AudioMediaResource;
  music?: MusicMediaResource;
  file?: FileMediaResource;
  document?: DocumentMediaResource;
  code?: CodeMediaResource;
  ppt?: PptMediaResource;
  character?: CharacterMediaResource;
  model3d?: Model3DMediaResource;
  location?: LocationContent;
  card?: CardContent;
  cardResource?: CardMediaResource;
  system?: SystemContent;
  custom?: CustomContent;
  event?: EventContent;
}

export interface Message {
  id: string;
  uuid: string;
  type: MessageType;
  content: MessageContent;
  fromUserId: string;
  toUserId?: string;
  groupId?: string;
  replyToId?: string;
  forwardFromId?: string;
  seq?: number;
  status: MessageStatus;
  clientSeq?: number;
  extra?: Record<string, any>;
  needReadReceipt?: boolean;
  recalledAt?: Date;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SendMessageResult {
  success: boolean;
  message?: Message;
  error?: string;
  errorCode?: string;
  isDuplicate?: boolean;
  eventId?: string;
  eventType?: "messageSent" | "messageFailed";
  occurredAt?: number;
  stateVersion?: number;
}

export interface MessageQueryOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
  messageType?: MessageType;
  fromSeq?: number;
  toSeq?: number;
  direction?: "before" | "after";
}

export interface MessageSearchOptions {
  keyword: string;
  targetId?: string;
  type?: ConversationType;
  messageType?: MessageType;
  startTime?: string;
  endTime?: string;
  page?: number;
  limit?: number;
}

export interface MessageManager {
  sendMessage(
    message: Omit<
      Message,
      "id" | "uuid" | "status" | "createdAt" | "updatedAt"
    > & { clientSeq?: number },
  ): Promise<SendMessageResult>;
  editMessage(
    messageId: string,
    operatorId: string,
    update: {
      content: MessageContent;
      extra?: Record<string, unknown>;
    },
  ): Promise<SendMessageResult>;
  getMessageById(id: string): Promise<Message | null>;
  getMessagesByUserId(
    userId: string,
    options?: MessageQueryOptions,
  ): Promise<Message[]>;
  getMessagesByGroupId(
    groupId: string,
    options?: MessageQueryOptions,
  ): Promise<Message[]>;
  getMessageHistoryBySeq(
    userId: string,
    targetId: string,
    type: "single" | "group",
    options?: {
      fromSeq?: number;
      toSeq?: number;
      limit?: number;
      direction?: "before" | "after";
      includeMissingSeqs?: boolean;
    },
  ): Promise<{
    targetId: string;
    type: "single" | "group";
    direction: "before" | "after";
    fromSeq: number;
    toSeq?: number;
    maxSeq: number;
    hasMore: boolean;
    nextSeq?: number;
    missingSeqFrom?: number;
    missingSeqTo?: number;
    missingSeqRequestedTo?: number;
    missingSeqTruncated?: boolean;
    missingSeqs?: number[];
    messages: Message[];
  }>;
  updateMessageStatus(id: string, status: MessageStatus): Promise<boolean>;
  deleteMessage(id: string): Promise<boolean>;
  markMessagesAsRead(userId: string, messageIds: string[]): Promise<boolean>;
  recallMessage(
    messageId: string,
    operatorId: string,
  ): Promise<{ success: boolean; error?: string }>;
  forwardMessage(
    messageId: string,
    fromUserId: string,
    toUserId?: string,
    toGroupId?: string,
  ): Promise<SendMessageResult>;
  searchMessages(
    options: MessageSearchOptions,
  ): Promise<{ messages: Message[]; total: number }>;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  targetId: string;
  targetName: string;
  targetAvatar?: string;
  lastMessage?: Message;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  updatedAt: Date;
}

export interface ConversationManager {
  getConversations(
    userId: string,
    options?: { page?: number; limit?: number },
  ): Promise<Conversation[]>;
  getConversationById(id: string): Promise<Conversation | null>;
  pinConversation(id: string): Promise<boolean>;
  unpinConversation(id: string): Promise<boolean>;
  muteConversation(id: string): Promise<boolean>;
  unmuteConversation(id: string): Promise<boolean>;
  deleteConversation(id: string): Promise<boolean>;
  clearMessages(conversationId: string): Promise<boolean>;
}
