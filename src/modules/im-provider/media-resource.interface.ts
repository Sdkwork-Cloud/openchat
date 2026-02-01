/**
 * AI时代通用 MediaResource 资源存储结构标准 (MRS - MediaResource Standard)
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
  artist?: string;
  album?: string;
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
  fileType?: string;
  lastModified?: string;
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

// ==================== AI时代资源构建器 ====================

/**
 * AI时代资源构建器
 * 支持创建符合MRS标准的各种资源对象
 */
export class ResourceBuilder {
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
