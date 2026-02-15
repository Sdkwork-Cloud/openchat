/**
 * 悟空IM服务实现
 * 
 * 职责：
 * 1. 实现标准化的IMService接口
 * 2. 封装悟空IM EasySDK的所有细节
 * 3. 处理协议转换（OpenChat标准 <-> 悟空IM协议）
 * 4. 提供连接管理和消息队列
 */

import { EventEmitter } from 'eventemitter3';
import {
  IIMService,
  IMServiceConfig,
  IMServiceEvent,
  ConnectionState,
  CreateConversationParams,
} from './im-service';

import {
  Message,
  MessageType,
  MessageStatus,
  ChannelType,
  Conversation,
  ConversationType,
  OpenChatEvent,
  ErrorCode,
  OpenChatError,
  QueryConversationsOptions,
  QueryMessagesOptions,
  ConversationMember,
  ReadReceipt,
} from '../types';

import {
  SendTextMessageParams,
  SendMediaMessageParams,
  SendCombinedMessageParams,
  SendCustomMessageParams,
  ImageMediaResource,
  AudioMediaResource,
  VideoMediaResource,
  FileMediaResource,
  LocationMediaResource,
  CardMediaResource,
  CustomMediaResource,
  CharacterMediaResource,
  MusicMediaResource,
  Model3DMediaResource,
  MediaResourceType,
  ForwardInfo,
  ResourceBuilder,
} from '../types/message';

// ==================== 悟空IM SDK类型定义 ====================

interface WKIMConfig {
  uid: string;
  token: string;
  /** IM服务器WebSocket地址 */
  serverUrl: string;
  deviceId?: string;
  deviceFlag?: number;
}

interface WKIMMessage {
  messageId: string;
  messageType: number;
  content: any;
  fromUid: string;
  toUid?: string;
  channelId?: string;
  channelType: number;
  timestamp: number;
  clientSeq?: number;
  status?: number;
}

interface WKIMConversation {
  channelId: string;
  channelType: number;
  unreadCount: number;
  lastMessage?: WKIMMessage;
  timestamp: number;
  isPinned?: boolean;
  isMuted?: boolean;
}

// ==================== 悟空IM服务实现 ====================

export class WukongIMService extends EventEmitter implements IIMService {
  private wkim: any = null;
  private config: IMServiceConfig | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private messageQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: unknown) => void; task: () => Promise<unknown> }> = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimer: any = null;
  private isProcessingQueue: boolean = false;

  // 缓存
  private messageCache: Map<string, Message> = new Map();
  private conversationCache: Map<string, Conversation> = new Map();

  constructor() {
    super();
  }

  // ==================== 连接管理 ====================

  async connect(config: IMServiceConfig): Promise<void> {
    if (this.connectionState === ConnectionState.CONNECTED) {
      return;
    }

    this.config = config;
    this.setConnectionState(ConnectionState.CONNECTING);

    try {
      // 动态加载悟空IM SDK
      const { WKIM, WKIMEvent } = await this.loadWKIMSDK();

      // 初始化WKIM
      const wkimConfig = {
        uid: config.uid,
        token: config.token,
        serverUrl: config.serverUrl,
        deviceId: config.deviceId,
        deviceFlag: config.deviceFlag || 2,
      };

      // 添加可选参数
      if (config.appId) {
        (wkimConfig as any).appId = config.appId;
      }
      if (config.appKey) {
        (wkimConfig as any).appKey = config.appKey;
      }
      if (config.thirdPartyAuth) {
        (wkimConfig as any).thirdPartyAuth = config.thirdPartyAuth;
      }

      this.wkim = WKIM.init(wkimConfig);

      // 绑定事件
      this.bindWKEvents(WKIMEvent);

      // 等待连接成功
      await this.waitForConnection();

      this.reconnectAttempts = 0;

    } catch (error) {
      this.setConnectionState(ConnectionState.ERROR);
      throw this.createError(ErrorCode.IM_CONNECT_FAILED, 'Failed to connect to IM server', error);
    }
  }

  disconnect(): void {
    if (this.wkim) {
      this.wkim.disconnect();
      this.wkim = null;
    }

    this.clearReconnectTimer();
    this.setConnectionState(ConnectionState.DISCONNECTED);
    this.messageQueue = [];
    this.messageCache.clear();
  }

  async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit(IMServiceEvent.ERROR, {
        code: ErrorCode.IM_CONNECT_FAILED,
        message: 'Max reconnection attempts reached',
      });
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionState(ConnectionState.RECONNECTING);

    try {
      await this.delay(1000 * Math.min(this.reconnectAttempts, 5));

      if (this.config) {
        await this.connect(this.config);
      }
    } catch (error) {
      this.scheduleReconnect();
    }
  }

  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED && this.wkim !== null;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  // ==================== 消息发送 - 优化版API（直接使用userId/groupId） ====================

  /**
   * 解析发送消息参数，自动判断会话类型
   * @param params 发送消息参数
   * @returns { targetId: string, conversationType: ConversationType }
   */
  private resolveSendParams(params: { toUserId?: string; groupId?: string }): { targetId: string; conversationType: ConversationType } {
    if (params.toUserId) {
      return { targetId: params.toUserId, conversationType: ConversationType.SINGLE };
    } else if (params.groupId) {
      return { targetId: params.groupId, conversationType: ConversationType.GROUP };
    } else {
      throw this.createError(ErrorCode.INVALID_PARAM, '必须指定 toUserId 或 groupId');
    }
  }

  async sendText(params: SendTextMessageParams): Promise<Message> {
    return this.executeWithConnection(async () => {
      const { targetId, conversationType } = this.resolveSendParams(params);
      const wkMessage = await this.wkim.sendTextMessage({
        channelId: targetId,
        channelType: this.convertConversationTypeToChannel(conversationType),
        content: params.text,
      });

      const message = this.convertWKMessageToStandard(wkMessage);
      this.messageCache.set(message.id, message);
      this.emit(IMServiceEvent.MESSAGE_SENT, message);

      return message;
    });
  }

  async sendImage(params: SendMediaMessageParams<ImageMediaResource>): Promise<Message> {
    return this.executeWithConnection(async () => {
      const { targetId, conversationType } = this.resolveSendParams(params);
      const wkMessage = await this.wkim.sendImageMessage({
        channelId: targetId,
        channelType: this.convertConversationTypeToChannel(conversationType),
        url: params.resource.url,
        width: params.resource.width,
        height: params.resource.height,
        size: params.resource.size,
      });

      const message = this.convertWKMessageToStandard(wkMessage);
      this.messageCache.set(message.id, message);
      this.emit(IMServiceEvent.MESSAGE_SENT, message);

      return message;
    });
  }

  async sendAudio(params: SendMediaMessageParams<AudioMediaResource>): Promise<Message> {
    return this.executeWithConnection(async () => {
      const { targetId, conversationType } = this.resolveSendParams(params);
      const wkMessage = await this.wkim.sendVoiceMessage({
        channelId: targetId,
        channelType: this.convertConversationTypeToChannel(conversationType),
        url: params.resource.url,
        duration: params.resource.duration || 0,
      });

      const message = this.convertWKMessageToStandard(wkMessage);
      this.messageCache.set(message.id, message);
      this.emit(IMServiceEvent.MESSAGE_SENT, message);

      return message;
    });
  }

  async sendVideo(params: SendMediaMessageParams<VideoMediaResource>): Promise<Message> {
    return this.executeWithConnection(async () => {
      const { targetId, conversationType } = this.resolveSendParams(params);
      const wkMessage = await this.wkim.sendVideoMessage({
        channelId: targetId,
        channelType: this.convertConversationTypeToChannel(conversationType),
        url: params.resource.url,
        thumbnail: params.resource.coverUrl,
        duration: params.resource.duration || 0,
        width: params.resource.width,
        height: params.resource.height,
      });

      const message = this.convertWKMessageToStandard(wkMessage);
      this.messageCache.set(message.id, message);
      this.emit(IMServiceEvent.MESSAGE_SENT, message);

      return message;
    });
  }

  async sendFile(params: SendMediaMessageParams<FileMediaResource>): Promise<Message> {
    return this.executeWithConnection(async () => {
      const { targetId, conversationType } = this.resolveSendParams(params);
      const wkMessage = await this.wkim.sendFileMessage({
        channelId: targetId,
        channelType: this.convertConversationTypeToChannel(conversationType),
        url: params.resource.url,
        name: params.resource.name || 'file',
        size: params.resource.size,
        mimeType: params.resource.mimeType,
      });

      const message = this.convertWKMessageToStandard(wkMessage);
      this.messageCache.set(message.id, message);
      this.emit(IMServiceEvent.MESSAGE_SENT, message);

      return message;
    });
  }

  async sendLocation(params: SendMediaMessageParams<LocationMediaResource>): Promise<Message> {
    return this.executeWithConnection(async () => {
      const { targetId, conversationType } = this.resolveSendParams(params);
      const wkMessage = await this.wkim.sendLocationMessage({
        channelId: targetId,
        channelType: this.convertConversationTypeToChannel(conversationType),
        latitude: params.resource.latitude,
        longitude: params.resource.longitude,
        address: params.resource.address,
        name: params.resource.name,
      });

      const message = this.convertWKMessageToStandard(wkMessage);
      this.messageCache.set(message.id, message);
      this.emit(IMServiceEvent.MESSAGE_SENT, message);

      return message;
    });
  }

  async sendCard(params: SendMediaMessageParams<CardMediaResource>): Promise<Message> {
    return this.executeWithConnection(async () => {
      const { targetId, conversationType } = this.resolveSendParams(params);
      const wkMessage = await this.wkim.sendCustomMessage({
        channelId: targetId,
        channelType: this.convertConversationTypeToChannel(conversationType),
        customType: 'card',
        data: {
          cardType: params.resource.cardType,
          title: params.resource.title,
          description: params.resource.description,
          imageUrl: params.resource.imageUrl,
          url: params.resource.linkUrl,
          data: params.resource.data,
        },
      });

      const message = this.convertWKMessageToStandard(wkMessage);
      this.messageCache.set(message.id, message);
      this.emit(IMServiceEvent.MESSAGE_SENT, message);

      return message;
    });
  }

  async sendCharacter(params: SendMediaMessageParams<CharacterMediaResource>): Promise<Message> {
    return this.executeWithConnection(async () => {
      const { targetId, conversationType } = this.resolveSendParams(params);
      const wkMessage = await this.wkim.sendCustomMessage({
        channelId: targetId,
        channelType: this.convertConversationTypeToChannel(conversationType),
        customType: 'character',
        data: {
          characterType: params.resource.characterType,
          gender: params.resource.gender,
          ageGroup: params.resource.ageGroup,
          avatarUrl: params.resource.avatarUrl,
          avatarVideoUrl: params.resource.avatarVideoUrl,
          speakerId: params.resource.speakerId,
          appearanceParams: params.resource.appearanceParams,
          animationParams: params.resource.animationParams,
          personalityPrompt: params.resource.personalityPrompt,
        },
      });

      const message = this.convertWKMessageToStandard(wkMessage);
      this.messageCache.set(message.id, message);
      this.emit(IMServiceEvent.MESSAGE_SENT, message);

      return message;
    });
  }

  async sendMusic(params: SendMediaMessageParams<MusicMediaResource>): Promise<Message> {
    return this.executeWithConnection(async () => {
      const { targetId, conversationType } = this.resolveSendParams(params);
      const wkMessage = await this.wkim.sendCustomMessage({
        channelId: targetId,
        channelType: this.convertConversationTypeToChannel(conversationType),
        customType: 'music',
        data: {
          url: params.resource.url,
          duration: params.resource.duration,
          bpm: params.resource.bpm,
          genre: params.resource.genre,
          mood: params.resource.mood,
          instruments: params.resource.instruments,
          prompt: params.resource.prompt,
        },
      });

      const message = this.convertWKMessageToStandard(wkMessage);
      this.messageCache.set(message.id, message);
      this.emit(IMServiceEvent.MESSAGE_SENT, message);

      return message;
    });
  }

  async sendModel3D(params: SendMediaMessageParams<Model3DMediaResource>): Promise<Message> {
    return this.executeWithConnection(async () => {
      const { targetId, conversationType } = this.resolveSendParams(params);
      const wkMessage = await this.wkim.sendCustomMessage({
        channelId: targetId,
        channelType: this.convertConversationTypeToChannel(conversationType),
        customType: 'model3d',
        data: {
          url: params.resource.url,
          format: params.resource.format,
          polygons: params.resource.polygons,
          textures: params.resource.textures,
          animations: params.resource.animations,
          previewUrl: params.resource.previewUrl,
        },
      });

      const message = this.convertWKMessageToStandard(wkMessage);
      this.messageCache.set(message.id, message);
      this.emit(IMServiceEvent.MESSAGE_SENT, message);

      return message;
    });
  }

  async sendCustom(params: SendCustomMessageParams): Promise<Message> {
    return this.executeWithConnection(async () => {
      const { targetId, conversationType } = this.resolveSendParams(params);
      const wkMessage = await this.wkim.sendCustomMessage({
        channelId: targetId,
        channelType: this.convertConversationTypeToChannel(conversationType),
        customType: params.customType,
        data: params.data,
      });

      const message = this.convertWKMessageToStandard(wkMessage);
      this.messageCache.set(message.id, message);
      this.emit(IMServiceEvent.MESSAGE_SENT, message);

      return message;
    });
  }

  async sendCombined(params: SendCombinedMessageParams): Promise<Message> {
    return this.executeWithConnection(async () => {
      const { targetId, conversationType } = this.resolveSendParams(params);
      const wkMessage = await this.wkim.sendCustomMessage({
        channelId: targetId,
        channelType: this.convertConversationTypeToChannel(conversationType),
        customType: 'combined',
        data: {
          resources: params.resources,
          caption: params.caption,
        },
      });

      const message = this.convertWKMessageToStandard(wkMessage);
      this.messageCache.set(message.id, message);
      this.emit(IMServiceEvent.MESSAGE_SENT, message);

      return message;
    });
  }

  async forwardMessage(messageId: string, targetId: string, conversationType: ConversationType): Promise<Message> {
    const originalMessage = await this.getMessage(messageId);
    if (!originalMessage) {
      throw this.createError(ErrorCode.MESSAGE_NOT_FOUND, 'Message not found');
    }

    // 根据会话类型确定使用 toUserId 还是 groupId
    const forwardParams = conversationType === ConversationType.SINGLE
      ? { toUserId: targetId }
      : { groupId: targetId };

    // 根据原消息类型转发
    switch (originalMessage.type) {
      case MessageType.TEXT:
        if (!originalMessage.content.text) {
          throw this.createError(ErrorCode.INVALID_PARAM, 'Text content is empty');
        }
        return this.sendText({
          ...forwardParams,
          text: originalMessage.content.text,
        });

      case MessageType.IMAGE:
        if (!originalMessage.content.image) {
          throw this.createError(ErrorCode.INVALID_PARAM, 'Image content is empty');
        }
        return this.sendImage({
          ...forwardParams,
          resource: ResourceBuilder.image(originalMessage.content.image.url, {
            width: originalMessage.content.image.width?.toString(),
            height: originalMessage.content.image.height?.toString(),
          }),
        });

      case MessageType.AUDIO:
        if (!originalMessage.content.audio) {
          throw this.createError(ErrorCode.INVALID_PARAM, 'Audio content is empty');
        }
        return this.sendAudio({
          ...forwardParams,
          resource: ResourceBuilder.audio(originalMessage.content.audio.url, originalMessage.content.audio.duration?.toString() || '0'),
        });

      case MessageType.VIDEO:
        if (!originalMessage.content.video) {
          throw this.createError(ErrorCode.INVALID_PARAM, 'Video content is empty');
        }
        return this.sendVideo({
          ...forwardParams,
          resource: ResourceBuilder.video(originalMessage.content.video.url, originalMessage.content.video.duration?.toString() || '0', {
            coverUrl: originalMessage.content.video.thumbnail,
          }),
        });

      case MessageType.FILE:
        if (!originalMessage.content.file) {
          throw this.createError(ErrorCode.INVALID_PARAM, 'File content is empty');
        }
        return this.sendFile({
          ...forwardParams,
          resource: ResourceBuilder.file(originalMessage.content.file.url, originalMessage.content.file.name, {
            size: originalMessage.content.file.size?.toString(),
          }),
        });

      default:
        throw this.createError(ErrorCode.INVALID_PARAM, 'Cannot forward this message type');
    }
  }

  async replyMessage(messageId: string, replyToId: string, content: string, conversationType: ConversationType): Promise<Message> {
    const originalMessage = await this.getMessage(replyToId);
    if (!originalMessage) {
      throw this.createError(ErrorCode.MESSAGE_NOT_FOUND, 'Reply to message not found');
    }

    // 根据会话类型确定使用 toUserId 还是 groupId
    const replyParams = conversationType === ConversationType.SINGLE
      ? { toUserId: originalMessage.fromUid }
      : { groupId: originalMessage.channelId || '' };

    return this.sendCustom({
      ...replyParams,
      customType: 'reply',
      data: {
        replyToId,
        originalMessage: {
          id: originalMessage.id,
          fromUid: originalMessage.fromUid,
          content: originalMessage.content,
          type: originalMessage.type,
        },
        replyContent: content,
      },
    });
  }

  async translateMessage(messageId: string, targetLanguage: string): Promise<{ original: string; translated: string }> {
    const message = await this.getMessage(messageId);
    if (!message) {
      throw this.createError(ErrorCode.MESSAGE_NOT_FOUND, 'Message not found');
    }

    let original = '';
    switch (message.type) {
      case MessageType.TEXT:
        original = message.content.text || '';
        break;
      case MessageType.AUDIO:
        original = message.content.audio?.text || '';
        break;
      default:
        throw this.createError(ErrorCode.INVALID_PARAM, 'Cannot translate this message type');
    }

    if (!original) {
      throw this.createError(ErrorCode.INVALID_PARAM, 'No content to translate');
    }

    // 这里可以集成真实的翻译API，如Google Translate、百度翻译等
    // 暂时返回模拟的翻译结果
    const translated = `[Translated to ${targetLanguage}]: ${original}`;

    return {
      original,
      translated,
    };
  }

  // ==================== 消息操作 ====================

  async recallMessage(messageId: string): Promise<boolean> {
    return this.executeWithConnection(async () => {
      try {
        await this.wkim.recallMessage(messageId);
        this.emit(IMServiceEvent.MESSAGE_RECALLED, { messageId });
        return true;
      } catch (error) {
        return false;
      }
    });
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    return this.executeWithConnection(async () => {
      try {
        await this.wkim.deleteMessage(messageId);
        this.messageCache.delete(messageId);
        this.emit(IMServiceEvent.MESSAGE_DELETED, { messageId });
        return true;
      } catch (error) {
        return false;
      }
    });
  }

  async getMessage(messageId: string): Promise<Message | null> {
    // 先查缓存
    if (this.messageCache.has(messageId)) {
      return this.messageCache.get(messageId)!;
    }

    return this.executeWithConnection(async () => {
      try {
        const wkMessage = await this.wkim.getMessage(messageId);
        if (!wkMessage) return null;

        const message = this.convertWKMessageToStandard(wkMessage);
        this.messageCache.set(messageId, message);
        return message;
      } catch (error) {
        return null;
      }
    });
  }

  async getMessageList(conversationId: string, options?: QueryMessagesOptions): Promise<Message[]> {
    return this.executeWithConnection(async () => {
      const wkMessages = await this.wkim.getMessages({
        channelId: conversationId,
        startMessageId: options?.startMessageId,
        limit: options?.limit || 20,
      });

      const messages = wkMessages.map((msg: WKIMMessage) => this.convertWKMessageToStandard(msg));

      // 更新缓存
      messages.forEach((msg: Message) => {
        this.messageCache.set(msg.id, msg);
      });

      return messages;
    });
  }

  async searchMessages(keyword: string, conversationId?: string): Promise<Message[]> {
    return this.executeWithConnection(async () => {
      const wkMessages = await this.wkim.searchMessages({
        keyword,
        channelId: conversationId,
      });

      return wkMessages.map((msg: WKIMMessage) => this.convertWKMessageToStandard(msg));
    });
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    return this.executeWithConnection(async () => {
      await this.wkim.markMessageAsRead(messageId);
      this.emit(IMServiceEvent.MESSAGE_READ, { messageId });
    });
  }

  async markConversationAsRead(conversationId: string): Promise<void> {
    return this.executeWithConnection(async () => {
      await this.wkim.markConversationAsRead(conversationId);
    });
  }

  async getMessageReadReceipt(messageId: string): Promise<ReadReceipt[]> {
    return this.executeWithConnection(async () => {
      const receipts = await this.wkim.getMessageReadReceipt(messageId);
      return receipts.map((receipt: any) => ({
        userId: receipt.uid,
        timestamp: receipt.timestamp,
      }));
    });
  }

  // ==================== 会话管理 ====================

  async createConversation(params: CreateConversationParams): Promise<Conversation> {
    return this.executeWithConnection(async () => {
      const wkConversation = await this.wkim.createConversation({
        channelId: params.targetId,
        channelType: this.convertConversationTypeToChannel(params.type),
        title: params.title,
        avatar: params.avatar,
        members: params.members,
      });

      const conversation = this.convertWKConversationToStandard(wkConversation);
      this.conversationCache.set(conversation.id, conversation);
      this.emit(IMServiceEvent.CONVERSATION_CREATED, conversation);

      return conversation;
    });
  }

  async getConversationList(options?: QueryConversationsOptions): Promise<Conversation[]> {
    return this.executeWithConnection(async () => {
      const wkConversations = await this.wkim.getConversations({
        limit: options?.limit || 50,
      });

      const conversations = wkConversations.map((conv: WKIMConversation) =>
        this.convertWKConversationToStandard(conv)
      );

      // 更新缓存
      conversations.forEach((conv: Conversation) => {
        this.conversationCache.set(conv.id, conv);
      });

      return conversations;
    });
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    // 先查缓存
    if (this.conversationCache.has(conversationId)) {
      return this.conversationCache.get(conversationId)!;
    }

    return this.executeWithConnection(async () => {
      try {
        const wkConversation = await this.wkim.getConversation(conversationId);
        if (!wkConversation) return null;

        const conversation = this.convertWKConversationToStandard(wkConversation);
        this.conversationCache.set(conversationId, conversation);
        return conversation;
      } catch (error) {
        return null;
      }
    });
  }

  async deleteConversation(conversationId: string): Promise<void> {
    return this.executeWithConnection(async () => {
      await this.wkim.deleteConversation(conversationId);
      this.conversationCache.delete(conversationId);
      this.emit(IMServiceEvent.CONVERSATION_DELETED, { conversationId });
    });
  }

  async clearConversationMessages(conversationId: string): Promise<void> {
    return this.executeWithConnection(async () => {
      await this.wkim.clearConversationMessages(conversationId);
      this.emit(IMServiceEvent.CONVERSATION_CLEARED, { conversationId });
    });
  }

  async setConversationPinned(conversationId: string, isPinned: boolean): Promise<void> {
    return this.executeWithConnection(async () => {
      await this.wkim.setConversationPinned(conversationId, isPinned);

      // 更新缓存
      const conversation = await this.getConversation(conversationId);
      if (conversation) {
        conversation.isPinned = isPinned;
        this.emit(IMServiceEvent.CONVERSATION_UPDATED, conversation);
      }
    });
  }

  async setConversationMuted(conversationId: string, isMuted: boolean): Promise<void> {
    return this.executeWithConnection(async () => {
      await this.wkim.setConversationMuted(conversationId, isMuted);

      // 更新缓存
      const conversation = await this.getConversation(conversationId);
      if (conversation) {
        conversation.isMuted = isMuted;
        this.emit(IMServiceEvent.CONVERSATION_UPDATED, conversation);
      }
    });
  }

  async setConversationDraft(conversationId: string, draft: string): Promise<void> {
    return this.executeWithConnection(async () => {
      await this.wkim.setConversationDraft(conversationId, draft);
    });
  }

  async getConversationDraft(conversationId: string): Promise<string | null> {
    return this.executeWithConnection(async () => {
      try {
        const draft = await this.wkim.getConversationDraft(conversationId);
        return draft || null;
      } catch (error) {
        return null;
      }
    });
  }

  async clearConversationDraft(conversationId: string): Promise<void> {
    return this.executeWithConnection(async () => {
      await this.wkim.setConversationDraft(conversationId, '');
    });
  }

  async getConversationMembers(conversationId: string): Promise<ConversationMember[]> {
    return this.executeWithConnection(async () => {
      const members = await this.wkim.getConversationMembers(conversationId);
      return members.map((member: any) => ({
        userId: member.uid,
        role: member.role,
        joinTime: member.joinTime,
      }));
    });
  }

  // ==================== 同步 ====================

  async syncMessages(conversationId: string, options?: { startTime?: number; limit?: number }): Promise<Message[]> {
    return this.getMessageList(conversationId, {
      startMessageId: options?.startTime?.toString(),
      limit: options?.limit,
    });
  }

  async syncConversations(): Promise<Conversation[]> {
    return this.getConversationList();
  }

  // ==================== 私有方法 ====================

  private async loadWKIMSDK(): Promise<any> {
    if (typeof window !== 'undefined') {
      if ((window as any).EasyJSSDK) {
        return (window as any).EasyJSSDK;
      }

      await this.loadScript('https://unpkg.com/easyjssdk@latest/dist/easyjssdk.min.js');
      return (window as any).EasyJSSDK;
    }

    try {
      // 尝试CommonJS导入
      if (typeof require === 'function') {
        return require('easyjssdk');
      }
    } catch (error) {
      console.error('Failed to load easyjssdk:', error);
    }

    throw new Error('EasyJSSDK is not available in this environment');
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  private bindWKEvents(WKIMEvent: any): void {
    if (!this.wkim) return;

    this.wkim.on(WKIMEvent.Connect, () => {
      this.setConnectionState(ConnectionState.CONNECTED);
      this.emit(IMServiceEvent.CONNECTED, {});
      this.processMessageQueue();
    });

    this.wkim.on(WKIMEvent.Disconnect, (info: any) => {
      this.setConnectionState(ConnectionState.DISCONNECTED);
      this.emit(IMServiceEvent.DISCONNECTED, info);
      this.scheduleReconnect();
    });

    this.wkim.on(WKIMEvent.Message, (wkMessage: WKIMMessage) => {
      const message = this.convertWKMessageToStandard(wkMessage);
      this.messageCache.set(message.id, message);
      this.emit(IMServiceEvent.MESSAGE_RECEIVED, message);
    });

    this.wkim.on(WKIMEvent.Error, (error: any) => {
      this.emit(IMServiceEvent.ERROR, error);
    });
  }

  private setConnectionState(state: ConnectionState): void {
    const oldState = this.connectionState;
    this.connectionState = state;

    if (oldState !== state && state === ConnectionState.RECONNECTING) {
      this.emit(IMServiceEvent.RECONNECTING, { attempt: this.reconnectAttempts });
    }
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      const checkConnection = () => {
        if (this.connectionState === ConnectionState.CONNECTED) {
          clearTimeout(timeout);
          resolve();
        } else if (this.connectionState === ConnectionState.ERROR) {
          clearTimeout(timeout);
          reject(new Error('Connection failed'));
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }

  private async executeWithConnection<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.isConnected()) {
      throw this.createError(ErrorCode.IM_DISCONNECTED, 'IM not connected');
    }

    return fn();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnect();
    }, 3000);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private async processMessageQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      const { task, resolve, reject } = this.messageQueue.shift()!;

      try {
        const result = await task();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createError(code: ErrorCode, message: string, data?: any): OpenChatError {
    const error = new Error(message) as OpenChatError;
    error.code = code;
    error.data = data;
    return error;
  }

  // ==================== 类型转换 ====================

  private convertWKMessageToStandard(wkMessage: WKIMMessage): Message {
    return {
      id: wkMessage.messageId,
      type: wkMessage.messageType as string | MessageType,
      content: wkMessage.content,
      fromUserId: wkMessage.fromUid,
      fromUid: wkMessage.fromUid,
      toUserId: wkMessage.toUid,
      toUid: wkMessage.toUid,
      channelId: wkMessage.channelId,
      channelType: this.parseChannelType(wkMessage.channelType),
      status: (wkMessage.status ? (wkMessage.status.toString() as MessageStatus) : MessageStatus.SENT),
      timestamp: wkMessage.timestamp,
      createdAt: new Date(wkMessage.timestamp).toISOString(),
      updatedAt: new Date(wkMessage.timestamp).toISOString(),
      clientSeq: wkMessage.clientSeq,
      isRead: false,
    } as Message;
  }

  private convertWKConversationToStandard(wkConversation: WKIMConversation): Conversation {
    return {
      id: wkConversation.channelId,
      channelId: wkConversation.channelId,
      channelType: this.parseChannelType(wkConversation.channelType),
      type: this.parseChannelTypeToConversation(wkConversation.channelType),
      targetId: wkConversation.channelId,
      unreadCount: wkConversation.unreadCount,
      lastMessage: wkConversation.lastMessage
        ? this.convertWKMessageToStandard(wkConversation.lastMessage)
        : undefined,
      updatedAt: wkConversation.timestamp,
      isPinned: wkConversation.isPinned || false,
      isMuted: wkConversation.isMuted || false,
    };
  }

  private convertConversationTypeToChannel(type: ConversationType): number {
    switch (type) {
      case ConversationType.SINGLE:
        return 1;
      case ConversationType.GROUP:
        return 2;
      case ConversationType.CUSTOMER:
        return 3;
      default:
        return 1;
    }
  }

  private parseChannelType(channelType: number): ChannelType {
    switch (channelType) {
      case 1:
        return ChannelType.PERSON;
      case 2:
        return ChannelType.GROUP;
      case 3:
        return ChannelType.CUSTOMER;
      default:
        return ChannelType.PERSON;
    }
  }

  private parseChannelTypeToConversation(channelType: number): ConversationType {
    switch (channelType) {
      case 1:
        return ConversationType.SINGLE;
      case 2:
        return ConversationType.GROUP;
      case 3:
        return ConversationType.CUSTOMER;
      default:
        return ConversationType.SINGLE;
    }
  }
}

// ==================== 工厂 ====================

export class WukongIMServiceFactory {
  static create(): IIMService {
    return new WukongIMService();
  }
}

export default WukongIMService;
