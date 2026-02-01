/**
 * 消息类型定义 - 采用AI时代MediaResource标准 (MRS - MediaResource Standard)
 *
 * 设计原则：
 * 1. AI-Native: 资源不是文件，而是「生成能力 + 状态快照」
 * 2. 支持Prompt重写和重新生成
 * 3. 支持多模态融合（图 + 音 + 人设）
 * 4. 跨系统、跨端、跨AI引擎复用
 * 5. 类型安全
 * 6. 支持扩展
 *
 * 参考标准：AI时代通用MediaResource资源存储结构标准 v1.0
 */

import { ConversationType, MessageStatus, ReadReceipt } from './index';

// ==================== AI时代MediaResource标准枚举 ====================

/**
 * 媒体资源类型枚举
 * 类型 ≠ 存储方式，类型 = 语义 + AI 处理方式
 */
export enum MediaResourceType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
  FILE = 'FILE',
  MUSIC = 'MUSIC',
  CHARACTER = 'CHARACTER',
  MODEL_3D = 'MODEL_3D',
  PPT = 'PPT',
  CODE = 'CODE',
  LOCATION = 'LOCATION',
  CARD = 'CARD',
  CUSTOM = 'CUSTOM'
}

/**
 * 音频格式枚举
 */
export enum AudioFormat {
  MP3 = 'MP3',
  WAV = 'WAV',
  AAC = 'AAC',
  OGG = 'OGG',
  FLAC = 'FLAC',
  M4A = 'M4A'
}

// ==================== AI时代MediaResource基础结构 ====================

/**
 * 标签体系
 * 支持树状标签、AI分类/聚类、多系统统一索引
 */
export interface TagsContent {
  tags?: string[];
  children?: TagsContent[];
}

/**
 * AI时代MediaResource基础结构（核心标准）
 *
 * 关键设计说明：
 * - prompt: 资源的"灵魂"，可重写 ⭐⭐⭐⭐⭐
 * - metadata: 模型参数、采样方式 ⭐⭐⭐⭐
 * - url / base64: 只是当前状态 ⭐⭐
 */
export interface MediaResource {
  // === 唯一标识 ===
  id?: string;
  uuid?: string;

  // === 数据载体 ===
  url?: string;
  bytes?: number[];
  base64?: string;
  localFile?: object;

  // === 基础描述 ===
  type?: MediaResourceType;
  mimeType?: string;
  size?: string;  // 注意：AI标准中size为string类型
  name?: string;
  extension?: string;

  // === AI 语义（核心）===
  prompt?: string;                // 可修改、可再生成
  metadata?: Record<string, any>; // 模型参数 / 生成配置

  // === 组织与治理 ===
  tags?: TagsContent;

  // === 扩展字段 ===
  extras?: Record<string, any>;
}

// ==================== 媒体资源细分规范 ====================

/**
 * 图片资源（ImageMediaResource）
 * 支持AI图像分割、多图变体、重绘（inpainting / outpainting）
 */
export interface ImageMediaResource extends MediaResource {
  type: MediaResourceType.IMAGE;
  width?: string;           // AI标准中尺寸为string
  height?: string;
  aspectRatio?: string;
  splitImages?: ImageMediaResource[];  // AI图像分割结果
  thumbnailUrl?: string;
  thumbnailWidth?: string;
  thumbnailHeight?: string;
}

/**
 * 视频资源（VideoMediaResource）
 * 适用于剪辑系统、AI视频生成、数字人驱动视频
 */
export interface VideoMediaResource extends MediaResource {
  type: MediaResourceType.VIDEO;
  duration?: string;        // AI标准中时长为string
  width?: string;
  height?: string;
  coverUrl?: string;
  coverWidth?: string;
  coverHeight?: string;
  frameRate?: string;
  codec?: string;
}

/**
 * 音频资源（AudioMediaResource）
 * 用于TTS、配音、背景音
 */
export interface AudioMediaResource extends MediaResource {
  type: MediaResourceType.AUDIO;
  format?: AudioFormat;
  bitRate?: string;
  sampleRate?: string;
  channels?: string;
  duration?: string;
  // 语音特有
  text?: string;            // 语音转文字内容
  waveform?: number[];      // 波形数据
  speakerId?: string;       // 说话人ID
}

/**
 * 音乐资源（MusicMediaResource）
 * 专门用于音乐生成
 */
export interface MusicMediaResource extends MediaResource {
  type: MediaResourceType.MUSIC;
  duration?: string;
  bpm?: string;             // 节拍
  genre?: string;           // 流派
  mood?: string;            // 情绪
  instruments?: string[];   // 乐器
}

/**
 * 文件资源（FileMediaResource）
 */
export interface FileMediaResource extends MediaResource {
  type: MediaResourceType.FILE | MediaResourceType.DOCUMENT | MediaResourceType.PPT | MediaResourceType.CODE;
  iconUrl?: string;
  pages?: string;           // 页数（文档）
  lines?: string;           // 行数（代码）
  language?: string;        // 代码语言
}

/**
 * 位置资源（LocationMediaResource）
 */
export interface LocationMediaResource extends MediaResource {
  type: MediaResourceType.LOCATION;
  latitude: string;         // AI标准中坐标为string
  longitude: string;
  address?: string;
  locationName?: string;    // 地点名称
  mapUrl?: string;
  mapProvider?: string;     // 地图提供商
}

/**
 * 名片资源（CardMediaResource）
 */
export interface CardMediaResource extends MediaResource {
  type: MediaResourceType.CARD;
  cardType: string;         // user | group | post | product | link
  title?: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  data?: Record<string, any>;
}

/**
 * 数字人/角色资源（CharacterMediaResource）
 * AI时代的核心资源类型之一：数字主播、AI虚拟员工、Agent Avatar
 */
export interface CharacterMediaResource extends MediaResource {
  type: MediaResourceType.CHARACTER;
  characterType?: string;   // 角色类型
  gender?: string;
  ageGroup?: string;
  avatarUrl?: string;
  avatarVideoUrl?: string;  // 动态头像
  speakerId?: string;       // TTS说话人ID
  appearanceParams?: Record<string, any>;  // 外观参数
  animationParams?: Record<string, any>;   // 动画参数
  personalityPrompt?: string;              // 性格提示词
}

/**
 * 3D模型资源（Model3DMediaResource）
 */
export interface Model3DMediaResource extends MediaResource {
  type: MediaResourceType.MODEL_3D;
  format?: string;          // 格式：glb, gltf, fbx, obj等
  polygons?: string;        // 多边形数
  textures?: string;        // 贴图数量
  animations?: string;      // 动画数量
  previewUrl?: string;      // 预览图/视频
}

/**
 * 自定义资源（CustomMediaResource）
 */
export interface CustomMediaResource extends MediaResource {
  type: MediaResourceType.CUSTOM;
  customType: string;
  data: Record<string, any>;
}

// ==================== 资源包装器（多模态聚合） ====================

/**
 * 资源包装器（AssetMediaResource）
 * 用途：多模态资源聚合、AI Agent输入输出、跨系统兼容
 */
export interface AssetMediaResource extends MediaResource {
  image?: ImageMediaResource;
  video?: VideoMediaResource;
  audio?: AudioMediaResource;
  music?: MusicMediaResource;
  file?: FileMediaResource;
  location?: LocationMediaResource;
  card?: CardMediaResource;
  character?: CharacterMediaResource;
  model3d?: Model3DMediaResource;
  custom?: CustomMediaResource;
  extraProps?: Record<string, any>;
}

// ==================== 联合类型定义 ====================

/**
 * 所有媒体资源的联合类型
 */
export type AnyMediaResource =
  | ImageMediaResource
  | VideoMediaResource
  | AudioMediaResource
  | MusicMediaResource
  | FileMediaResource
  | LocationMediaResource
  | CardMediaResource
  | CharacterMediaResource
  | Model3DMediaResource
  | CustomMediaResource
  | AssetMediaResource;

// ==================== 向后兼容：传统资源类型别名 ====================

/** @deprecated 使用 ImageMediaResource */
export type ImageResource = ImageMediaResource;
/** @deprecated 使用 VideoMediaResource */
export type VideoResource = VideoMediaResource;
/** @deprecated 使用 AudioMediaResource */
export type AudioResource = AudioMediaResource;
/** @deprecated 使用 FileMediaResource */
export type FileResource = FileMediaResource;
/** @deprecated 使用 LocationMediaResource */
export type LocationResource = LocationMediaResource;
/** @deprecated 使用 CardMediaResource */
export type CardResource = CardMediaResource;
/** @deprecated 使用 CustomMediaResource */
export type CustomResource = CustomMediaResource;
/** @deprecated 使用 AnyMediaResource */
export type MessageResource = AnyMediaResource;

// ==================== 消息内容定义 ====================

/**
 * 文本消息内容
 */
export interface TextMessageContent {
  type: 'text';
  text: string;
  mentions?: string[];
  mentionAll?: boolean;
}

/**
 * 媒体消息内容
 */
export interface MediaMessageContent<T extends AnyMediaResource = AnyMediaResource> {
  type: 'media';
  resource: T;
  caption?: string;
}

/**
 * 组合消息内容（支持多模态资源聚合）
 */
export interface CombinedMessageContent {
  type: 'combined';
  resources: AnyMediaResource[];
  caption?: string;
}

/**
 * 消息内容联合类型
 */
export type MessageContent =
  | TextMessageContent
  | MediaMessageContent
  | CombinedMessageContent;

// ==================== 消息定义 ====================

/**
 * 转发信息
 */
export interface ForwardInfo {
  messageId: string;
  fromUid: string;
  conversationId: string;
  timestamp: number;
}

// ==================== 发送消息参数（优化版API） ====================

/**
 * 发送消息基础参数 - 优化版
 * 直接使用 toUserId 或 groupId，底层自动判断会话类型
 */
export interface SendMessageBaseParams {
  /** 目标用户ID（单聊） */
  toUserId?: string;
  /** 目标群组ID（群聊） */
  groupId?: string;
  /** 回复的消息ID */
  replyTo?: string;
  /** 扩展字段 */
  extras?: Record<string, any>;
}

/**
 * 发送文本消息参数
 * @example
 * ```typescript
 * // 发送给单个用户
 * await client.im.sendText({
 *   toUserId: 'user-123',
 *   text: 'Hello!'
 * });
 *
 * // 发送到群组
 * await client.im.sendText({
 *   groupId: 'group-456',
 *   text: '大家好!'
 * });
 * ```
 */
export interface SendTextMessageParams extends SendMessageBaseParams {
  text: string;
  mentions?: string[];
  mentionAll?: boolean;
}

/**
 * 发送媒体消息参数（泛型支持）
 * @example
 * ```typescript
 * // 发送图片给单个用户
 * await client.im.sendImage({
 *   toUserId: 'user-123',
 *   resource: ResourceBuilder.image('https://example.com/image.jpg')
 * });
 *
 * // 发送视频到群组
 * await client.im.sendVideo({
 *   groupId: 'group-456',
 *   resource: ResourceBuilder.video('https://example.com/video.mp4', '120')
 * });
 * ```
 */
export interface SendMediaMessageParams<T extends AnyMediaResource = AnyMediaResource> extends SendMessageBaseParams {
  resource: T;
  caption?: string;
}

/**
 * 发送组合消息参数
 */
export interface SendCombinedMessageParams extends SendMessageBaseParams {
  resources: AnyMediaResource[];
  caption?: string;
}

/**
 * 发送自定义消息参数
 */
export interface SendCustomMessageParams extends SendMessageBaseParams {
  customType: string;
  data: Record<string, any>;
}

// ==================== 旧版API兼容（已废弃） ====================

/** @deprecated 使用新的SendMessageBaseParams，直接使用userId或groupId */
export interface LegacySendMessageBaseParams {
  targetId: string;
  conversationType: ConversationType;
  replyTo?: string;
  extras?: Record<string, any>;
}

// ==================== AI时代资源构建器 ====================

/**
 * AI时代资源构建器
 * 支持创建符合MRS标准的各种资源对象
 */
export class ResourceBuilder {
  /**
   * 创建文本资源（用于自定义消息中的文本内容）
   */
  static text(text: string): { text: string; type: 'text' } {
    return {
      type: 'text',
      text,
    };
  }

  /**
   * 创建图片资源
   */
  static image(url: string, options?: Omit<ImageMediaResource, 'type' | 'url'>): ImageMediaResource {
    return {
      type: MediaResourceType.IMAGE,
      url,
      ...options,
    };
  }

  /**
   * 创建AI生成图片资源（带prompt）
   */
  static aiImage(prompt: string, url: string, options?: Omit<ImageMediaResource, 'type' | 'url' | 'prompt'>): ImageMediaResource {
    return {
      type: MediaResourceType.IMAGE,
      prompt,
      url,
      ...options,
    };
  }

  /**
   * 创建音频资源
   */
  static audio(url: string, duration: string, options?: Omit<AudioMediaResource, 'type' | 'url' | 'duration'>): AudioMediaResource {
    return {
      type: MediaResourceType.AUDIO,
      url,
      duration,
      ...options,
    };
  }

  /**
   * 创建AI语音资源（TTS）
   */
  static tts(text: string, url: string, speakerId?: string, options?: Omit<AudioMediaResource, 'type' | 'url' | 'text'>): AudioMediaResource {
    return {
      type: MediaResourceType.AUDIO,
      url,
      text,
      speakerId,
      ...options,
    };
  }

  /**
   * 创建视频资源
   */
  static video(url: string, duration: string, options?: Omit<VideoMediaResource, 'type' | 'url' | 'duration'>): VideoMediaResource {
    return {
      type: MediaResourceType.VIDEO,
      url,
      duration,
      ...options,
    };
  }

  /**
   * 创建AI生成视频资源（带prompt）
   */
  static aiVideo(prompt: string, url: string, duration: string, options?: Omit<VideoMediaResource, 'type' | 'url' | 'duration' | 'prompt'>): VideoMediaResource {
    return {
      type: MediaResourceType.VIDEO,
      prompt,
      url,
      duration,
      ...options,
    };
  }

  /**
   * 创建音乐资源
   */
  static music(url: string, duration: string, options?: Omit<MusicMediaResource, 'type' | 'url' | 'duration'>): MusicMediaResource {
    return {
      type: MediaResourceType.MUSIC,
      url,
      duration,
      ...options,
    };
  }

  /**
   * 创建AI生成音乐资源（带prompt）
   */
  static aiMusic(prompt: string, url: string, duration: string, options?: Omit<MusicMediaResource, 'type' | 'url' | 'duration' | 'prompt'>): MusicMediaResource {
    return {
      type: MediaResourceType.MUSIC,
      prompt,
      url,
      duration,
      ...options,
    };
  }

  /**
   * 创建文件资源
   */
  static file(url: string, name: string, options?: Omit<FileMediaResource, 'type' | 'url' | 'name'>): FileMediaResource {
    return {
      type: MediaResourceType.FILE,
      url,
      name,
      ...options,
    };
  }

  /**
   * 创建位置资源
   */
  static location(latitude: string, longitude: string, options?: Omit<LocationMediaResource, 'type' | 'latitude' | 'longitude'>): LocationMediaResource {
    return {
      type: MediaResourceType.LOCATION,
      latitude,
      longitude,
      ...options,
    };
  }

  /**
   * 创建名片资源
   */
  static card(cardType: string, options?: Omit<CardMediaResource, 'type' | 'cardType'>): CardMediaResource {
    return {
      type: MediaResourceType.CARD,
      cardType,
      ...options,
    };
  }

  /**
   * 创建数字人/角色资源
   */
  static character(characterType: string, options?: Omit<CharacterMediaResource, 'type' | 'characterType'>): CharacterMediaResource {
    return {
      type: MediaResourceType.CHARACTER,
      characterType,
      ...options,
    };
  }

  /**
   * 创建3D模型资源
   */
  static model3d(url: string, format: string, options?: Omit<Model3DMediaResource, 'type' | 'url' | 'format'>): Model3DMediaResource {
    return {
      type: MediaResourceType.MODEL_3D,
      url,
      format,
      ...options,
    };
  }

  /**
   * 创建自定义资源
   */
  static custom(customType: string, data: Record<string, any>, options?: Omit<CustomMediaResource, 'type' | 'customType' | 'data'>): CustomMediaResource {
    return {
      type: MediaResourceType.CUSTOM,
      customType,
      data,
      ...options,
    };
  }

  /**
   * 创建多模态资源包装器
   */
  static asset(options: Omit<AssetMediaResource, 'type'>): AssetMediaResource {
    return {
      type: MediaResourceType.FILE, // 基础类型
      ...options,
    };
  }
}

// ==================== 便捷函数 ====================

/**
 * 创建文本消息内容
 */
export function createTextContent(text: string, options?: { mentions?: string[]; mentionAll?: boolean }): TextMessageContent {
  return {
    type: 'text',
    text,
    ...options,
  };
}

/**
 * 创建媒体消息内容
 */
export function createMediaContent<T extends AnyMediaResource>(resource: T, caption?: string): MediaMessageContent<T> {
  return {
    type: 'media',
    resource,
    caption,
  };
}

/**
 * 创建组合消息内容
 */
export function createCombinedContent(resources: AnyMediaResource[], caption?: string): CombinedMessageContent {
  return {
    type: 'combined',
    resources,
    caption,
  };
}

/**
 * 创建AI生成资源（通用）
 * 支持通过prompt重新生成资源
 */
export function createAIGeneratedResource(
  type: MediaResourceType,
  prompt: string,
  url?: string,
  metadata?: Record<string, any>
): MediaResource {
  return {
    type,
    prompt,
    url,
    metadata,
  };
}

/**
 * 重新生成资源（基于prompt）
 * 返回一个新的资源对象，保留原资源的prompt和metadata
 */
export function regenerateResource(
  resource: MediaResource,
  newPrompt?: string,
  newMetadata?: Record<string, any>
): MediaResource {
  return {
    ...resource,
    prompt: newPrompt || resource.prompt,
    metadata: { ...resource.metadata, ...newMetadata },
    // 清除旧的url，等待重新生成
    url: undefined,
    base64: undefined,
  };
}
