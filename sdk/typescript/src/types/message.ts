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

import { ConversationType } from './index';

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
  CARD = 'CARD',
  LOCATION = 'LOCATION',
  CUSTOM = 'CUSTOM'
}

/**
 * 卡片类型枚举
 */
export enum CardType {
  MINI_PROGRAM = 'MINI_PROGRAM',
  APP = 'APP',
  LINK = 'LINK',
  ARTICLE = 'ARTICLE',
  PRODUCT = 'PRODUCT',
  ORDER = 'ORDER',
  PAYMENT = 'PAYMENT',
  INVITATION = 'INVITATION',
  RED_PACKET = 'RED_PACKET',
  LOCATION = 'LOCATION',
  CONTACT = 'CONTACT',
  FILE_PREVIEW = 'FILE_PREVIEW',
  CUSTOM = 'CUSTOM'
}

/**
 * 音频格式枚举
 */
export enum AudioFormat {
  WAV = 'WAV',
  MP3 = 'MP3',
  AAC = 'AAC',
  FLAC = 'FLAC',
  OGG = 'OGG',
  PCM = 'PCM',
  AIFF = 'AIFF',
  AU = 'AU',
  OPUS = 'OPUS'
}

/**
 * 视频格式枚举
 */
export enum VideoFormat {
  MP4 = 'MP4',
  AVI = 'AVI',
  MOV = 'MOV',
  WMV = 'WMV',
  FLV = 'FLV',
  MKV = 'MKV',
  WEBM = 'WEBM',
  MPEG = 'MPEG',
  '3GP' = '3GP',
  TS = 'TS'
}

/**
 * 图片格式枚举
 */
export enum ImageFormat {
  JPEG = 'JPEG',
  JPG = 'JPG',
  PNG = 'PNG',
  GIF = 'GIF',
  BMP = 'BMP',
  WEBP = 'WEBP',
  SVG = 'SVG',
  TIFF = 'TIFF',
  ICO = 'ICO',
  HEIC = 'HEIC'
}

/**
 * 文档格式枚举
 */
export enum DocumentFormat {
  PDF = 'PDF',
  DOC = 'DOC',
  DOCX = 'DOCX',
  XLS = 'XLS',
  XLSX = 'XLSX',
  TXT = 'TXT',
  RTF = 'RTF',
  MD = 'MD',
  EPUB = 'EPUB'
}

/**
 * PPT格式枚举
 */
export enum PptFormat {
  PPT = 'PPT',
  PPTX = 'PPTX',
  KEY = 'KEY',
  ODP = 'ODP'
}

/**
 * 代码语言枚举
 */
export enum CodeLanguage {
  JAVA = 'JAVA',
  PYTHON = 'PYTHON',
  JAVASCRIPT = 'JAVASCRIPT',
  TYPESCRIPT = 'TYPESCRIPT',
  CPP = 'CPP',
  C = 'C',
  CSHARP = 'CSHARP',
  GO = 'GO',
  RUST = 'RUST',
  PHP = 'PHP',
  RUBY = 'RUBY',
  SWIFT = 'SWIFT',
  KOTLIN = 'KOTLIN',
  SQL = 'SQL',
  HTML = 'HTML',
  CSS = 'CSS',
  SHELL = 'SHELL',
  JSON = 'JSON',
  XML = 'XML',
  YAML = 'YAML',
  OTHER = 'OTHER'
}

/**
 * 3D模型格式枚举
 */
export enum Model3DFormat {
  OBJ = 'OBJ',
  FBX = 'FBX',
  GLTF = 'GLTF',
  GLB = 'GLB',
  STL = 'STL',
  PLY = 'PLY',
  '3DS' = '3DS',
  DAE = 'DAE',
  USD = 'USD'
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
  size?: number;
  name?: string;
  extension?: string;

  // === AI 语义（核心）===
  prompt?: string;
  metadata?: Record<string, any>;

  // === 组织与治理 ===
  tags?: TagsContent;

  // === 时间信息 ===
  createdAt?: string;
  updatedAt?: string;

  // === 创建者 ===
  creatorId?: string;

  // === 描述 ===
  description?: string;

  // === 扩展字段 ===
  extras?: Record<string, any>;
}

// ==================== 卡片相关类型 ====================

/**
 * 卡片动作
 */
export interface CardAction {
  type: string;
  url?: string;
  params?: Record<string, any>;
  appId?: string;
  appPath?: string;
}

/**
 * 卡片按钮
 */
export interface CardButton {
  text: string;
  action?: CardAction;
  style?: string;
  color?: string;
}

// ==================== 媒体资源细分规范 ====================

/**
 * 图片资源（ImageMediaResource）
 * 支持AI图像分割、多图变体、重绘（inpainting / outpainting）
 */
export interface ImageMediaResource extends MediaResource {
  type: MediaResourceType.IMAGE;
  url: string;
  format?: ImageFormat;
  width?: number;
  height?: number;
  splitImages?: ImageMediaResource[];
  aspectRatio?: string;
  colorMode?: string;
  dpi?: number;
  thumbnailUrl?: string;
}

/**
 * 视频资源（VideoMediaResource）
 * 适用于剪辑系统、AI视频生成、数字人驱动视频
 */
export interface VideoMediaResource extends MediaResource {
  type: MediaResourceType.VIDEO;
  url: string;
  format?: VideoFormat;
  duration?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  bitRate?: string;
  codec?: string;
  thumbnailUrl?: string;
  coverUrl?: string;
}

/**
 * 音频资源（AudioMediaResource）
 * 用于TTS、配音、背景音
 */
export interface AudioMediaResource extends MediaResource {
  type: MediaResourceType.AUDIO;
  url: string;
  format?: AudioFormat;
  duration?: number;
  bitRate?: string;
  sampleRate?: string;
  channels?: number;
  codec?: string;
  text?: string;
  waveform?: number[];
  speakerId?: string;
}

/**
 * 音乐资源（MusicMediaResource）
 * 专门用于音乐生成
 */
export interface MusicMediaResource extends MediaResource {
  type: MediaResourceType.MUSIC;
  url: string;
  format?: AudioFormat;
  duration?: number;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  lyrics?: string;
  coverUrl?: string;
  year?: number;
  bpm?: number;
  mood?: string;
  instruments?: string[];
}

/**
 * 文件资源（FileMediaResource）
 */
export interface FileMediaResource extends MediaResource {
  type: MediaResourceType.FILE;
  name: string;
  url: string;
  mimeType?: string;
  hash?: string;
  path?: string;
}

/**
 * 文档资源（DocumentMediaResource）
 */
export interface DocumentMediaResource extends MediaResource {
  type: MediaResourceType.DOCUMENT;
  url: string;
  format?: DocumentFormat;
  pageCount?: number;
  author?: string;
  title?: string;
  summary?: string;
  keywords?: string[];
  contentText?: string;
  coverUrl?: string;
  version?: string;
}

/**
 * 代码资源（CodeMediaResource）
 */
export interface CodeMediaResource extends MediaResource {
  type: MediaResourceType.CODE;
  language?: CodeLanguage;
  code?: string;
  lineCount?: number;
  comments?: string;
  dependencies?: string[];
  license?: string;
  version?: string;
  author?: string;
}

/**
 * PPT资源（PptMediaResource）
 */
export interface PptMediaResource extends MediaResource {
  type: MediaResourceType.PPT;
  format?: PptFormat;
  slideCount?: number;
  theme?: string;
  author?: string;
  title?: string;
  notes?: string;
  slideThumbnails?: string[];
}

/**
 * 数字人/角色资源（CharacterMediaResource）
 */
export interface CharacterMediaResource extends MediaResource {
  type: MediaResourceType.CHARACTER;
  name?: string;
  characterType?: string;
  gender?: string;
  ageGroup?: string;
  avatarImage?: ImageMediaResource;
  avatarVideo?: VideoMediaResource;
  avatarUrl?: string;
  avatarVideoUrl?: string;
  speakerId?: string;
  appearanceParams?: Record<string, any>;
  animationParams?: Record<string, any>;
  actions?: string[];
  expressions?: string[];
  voiceFeatures?: Record<string, any>;
  personalityPrompt?: string;
}

/**
 * 3D模型资源（Model3DMediaResource）
 */
export interface Model3DMediaResource extends MediaResource {
  type: MediaResourceType.MODEL_3D;
  format?: Model3DFormat;
  vertexCount?: number;
  faceCount?: number;
  materialCount?: number;
  boneCount?: number;
  animationCount?: number;
  boundingBox?: {
    width?: number;
    height?: number;
    depth?: number;
  };
  previewUrl?: string;
  textureUrls?: string[];
  polygons?: number;
  textures?: string[];
  animations?: string[];
}

/**
 * 卡片资源（CardMediaResource）
 */
export interface CardMediaResource extends MediaResource {
  type: MediaResourceType.CARD;
  cardType: CardType;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  sourceName?: string;
  sourceIcon?: string;
  targetUrl?: string;
  appId?: string;
  appPath?: string;
  appOriginalId?: string;
  appVersion?: string;
  packageName?: string;
  appDownloadUrl?: string;
  mainAction?: CardAction;
  buttons?: CardButton[];
  extraData?: Record<string, any>;
  tag?: string;
  status?: string;
  expireTime?: string;
  showSource?: boolean;
  imageUrl?: string;
  linkUrl?: string;
  data?: Record<string, any>;
}

/**
 * 位置资源（LocationMediaResource）
 */
export interface LocationMediaResource extends MediaResource {
  type: MediaResourceType.LOCATION;
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
  poiId?: string;
  cityName?: string;
  thumbnailUrl?: string;
  scale?: number;
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
  document?: DocumentMediaResource;
  ppt?: PptMediaResource;
  code?: CodeMediaResource;
  character?: CharacterMediaResource;
  model3d?: Model3DMediaResource;
  card?: CardMediaResource;
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
  | DocumentMediaResource
  | CodeMediaResource
  | PptMediaResource
  | CharacterMediaResource
  | Model3DMediaResource
  | CardMediaResource
  | LocationMediaResource
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
/** @deprecated 使用 CardMediaResource */
export type CardResource = CardMediaResource;
/** @deprecated 使用 LocationMediaResource */
export type LocationResource = LocationMediaResource;
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
 * 用户名片内容
 */
export interface UserCardContent {
  userId: string;
  nickname?: string;
  avatar?: string;
  signature?: string;
}

/**
 * 向后兼容的类型别名
 */
export type CardContent = UserCardContent;

/**
 * 系统消息内容
 */
export interface SystemMessageContent {
  type: string;
  data?: Record<string, any>;
}

/**
 * 媒体消息内容（旧版API兼容）
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
 * 标准消息内容（与API文档一致）
 */
export interface StandardMessageContent {
  text?: TextMessageContent;
  image?: ImageMediaResource;
  audio?: AudioMediaResource;
  video?: VideoMediaResource;
  file?: FileMediaResource;
  music?: MusicMediaResource;
  document?: DocumentMediaResource;
  code?: CodeMediaResource;
  ppt?: PptMediaResource;
  character?: CharacterMediaResource;
  model3d?: Model3DMediaResource;
  location?: LocationMediaResource;
  card?: UserCardContent;
  cardResource?: CardMediaResource;
  custom?: CustomMediaResource;
  system?: SystemMessageContent;
}

/**
 * 消息内容联合类型
 */
export type MessageContent =
  | TextMessageContent
  | MediaMessageContent
  | CombinedMessageContent
  | StandardMessageContent;

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

// ==================== 标准发送消息参数（与API文档一致） ====================

/**
 * 标准发送消息参数
 */
export interface SendMessageParams {
  /** 消息UUID（客户端生成，用于去重） */
  uuid?: string;
  /** 消息类型 */
  type: string;
  /** 消息内容 */
  content: StandardMessageContent;
  /** 发送者用户ID */
  fromUserId: string;
  /** 接收者用户ID（单聊时必填） */
  toUserId?: string;
  /** 群组ID（群聊时必填） */
  groupId?: string;
  /** 回复的消息ID */
  replyToId?: string;
  /** 转发来源消息ID */
  forwardFromId?: string;
  /** 客户端序列号，用于消息去重 */
  clientSeq?: number;
  /** 扩展数据 */
  extra?: Record<string, any>;
  /** 是否需要已读回执，默认true */
  needReadReceipt?: boolean;
}

/**
 * 批量发送消息参数
 */
export interface BatchSendMessagesParams {
  messages: SendMessageParams[];
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
  static audio(url: string, duration: number, options?: Omit<AudioMediaResource, 'type' | 'url' | 'duration'>): AudioMediaResource {
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
  static video(url: string, duration: number, options?: Omit<VideoMediaResource, 'type' | 'url' | 'duration'>): VideoMediaResource {
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
  static aiVideo(prompt: string, url: string, duration: number, options?: Omit<VideoMediaResource, 'type' | 'url' | 'duration' | 'prompt'>): VideoMediaResource {
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
  static music(url: string, duration: number, options?: Omit<MusicMediaResource, 'type' | 'url' | 'duration'>): MusicMediaResource {
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
  static aiMusic(prompt: string, url: string, duration: number, options?: Omit<MusicMediaResource, 'type' | 'url' | 'duration' | 'prompt'>): MusicMediaResource {
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
   * 创建文档资源
   */
  static document(url: string, options?: Omit<DocumentMediaResource, 'type' | 'url'>): DocumentMediaResource {
    return {
      type: MediaResourceType.DOCUMENT,
      url,
      ...options,
    };
  }

  /**
   * 创建代码资源
   */
  static code(options?: Omit<CodeMediaResource, 'type'>): CodeMediaResource {
    return {
      type: MediaResourceType.CODE,
      ...options,
    };
  }

  /**
   * 创建PPT资源
   */
  static ppt(options?: Omit<PptMediaResource, 'type'>): PptMediaResource {
    return {
      type: MediaResourceType.PPT,
      ...options,
    };
  }

  /**
   * 创建卡片资源
   */
  static card(cardType: CardType, title: string, options?: Omit<CardMediaResource, 'type' | 'cardType' | 'title'>): CardMediaResource {
    return {
      type: MediaResourceType.CARD,
      cardType,
      title,
      ...options,
    };
  }

  /**
   * 创建小程序卡片
   */
  static miniProgramCard(
    title: string,
    appId: string,
    appPath: string,
    options?: Omit<CardMediaResource, 'type' | 'cardType' | 'title' | 'appId' | 'appPath'>
  ): CardMediaResource {
    return {
      type: MediaResourceType.CARD,
      cardType: CardType.MINI_PROGRAM,
      title,
      appId,
      appPath,
      ...options,
    };
  }

  /**
   * 创建应用卡片
   */
  static appCard(
    title: string,
    packageName: string,
    options?: Omit<CardMediaResource, 'type' | 'cardType' | 'title' | 'packageName'>
  ): CardMediaResource {
    return {
      type: MediaResourceType.CARD,
      cardType: CardType.APP,
      title,
      packageName,
      ...options,
    };
  }

  /**
   * 创建链接卡片
   */
  static linkCard(
    title: string,
    targetUrl: string,
    options?: Omit<CardMediaResource, 'type' | 'cardType' | 'title' | 'targetUrl'>
  ): CardMediaResource {
    return {
      type: MediaResourceType.CARD,
      cardType: CardType.LINK,
      title,
      targetUrl,
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
  static model3d(format: Model3DFormat, options?: Omit<Model3DMediaResource, 'type' | 'format'>): Model3DMediaResource {
    return {
      type: MediaResourceType.MODEL_3D,
      format,
      ...options,
    };
  }

  /**
   * 创建多模态资源包装器
   */
  static asset(options: Omit<AssetMediaResource, 'type'>): AssetMediaResource {
    return {
      type: MediaResourceType.FILE,
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
