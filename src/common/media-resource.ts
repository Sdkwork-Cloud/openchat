import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsObject,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Max,
  Min,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

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
  CODE = 'CODE'
}

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

export enum PptFormat {
  PPT = 'PPT',
  PPTX = 'PPTX',
  KEY = 'KEY',
  ODP = 'ODP'
}

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

export interface TagsContent {
  tags?: string[];
  children?: TagsContent[];
}

export class MediaResource {
  @ApiPropertyOptional({ description: '资源ID' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ description: '资源UUID' })
  @IsOptional()
  @IsUUID()
  uuid?: string;

  @ApiPropertyOptional({ description: '资源URL' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: '资源字节数据' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  bytes?: number[];

  @ApiPropertyOptional({ description: '本地文件' })
  @IsOptional()
  @IsObject()
  localFile?: object;

  @ApiPropertyOptional({ description: '资源Base64编码' })
  @IsOptional()
  @IsString()
  base64?: string;

  @ApiPropertyOptional({ description: '资源类型', enum: MediaResourceType })
  @IsOptional()
  @IsEnum(MediaResourceType)
  type?: MediaResourceType;

  @ApiPropertyOptional({ description: '资源MIME类型' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: '资源大小（字节）' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  size?: number;

  @ApiPropertyOptional({ description: '资源名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '资源扩展名' })
  @IsOptional()
  @IsString()
  extension?: string;

  @ApiPropertyOptional({ description: '资源标签' })
  @IsOptional()
  @IsObject()
  tags?: TagsContent;

  @ApiPropertyOptional({ description: '资源元数据' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'AI生成提示词' })
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional({ description: '创建时间' })
  @IsOptional()
  @IsString()
  createdAt?: string;

  @ApiPropertyOptional({ description: '更新时间' })
  @IsOptional()
  @IsString()
  updatedAt?: string;

  @ApiPropertyOptional({ description: '创建者ID' })
  @IsOptional()
  @IsString()
  creatorId?: string;

  @ApiPropertyOptional({ description: '资源描述' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class ImageMediaResource extends MediaResource {
  @ApiProperty({ description: '图片URL', example: 'https://example.com/image.jpg' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: '图片格式', enum: ImageFormat })
  @IsOptional()
  @IsEnum(ImageFormat)
  format?: ImageFormat;

  @ApiPropertyOptional({ description: '图片宽度（像素）', example: 1920 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({ description: '图片高度（像素）', example: 1080 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({ description: '图片分割结果', type: () => [ImageMediaResource] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ImageMediaResource)
  splitImages?: ImageMediaResource[];

  @ApiPropertyOptional({ description: '图片宽高比' })
  @IsOptional()
  @IsString()
  aspectRatio?: string;

  @ApiPropertyOptional({ description: '图片颜色模式' })
  @IsOptional()
  @IsString()
  colorMode?: string;

  @ApiPropertyOptional({ description: '图片DPI' })
  @IsOptional()
  @IsNumber()
  dpi?: number;

  @ApiPropertyOptional({ description: '缩略图URL' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

export class VideoMediaResource extends MediaResource {
  @ApiProperty({ description: '视频URL', example: 'https://example.com/video.mp4' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: '视频格式', enum: VideoFormat })
  @IsOptional()
  @IsEnum(VideoFormat)
  format?: VideoFormat;

  @ApiPropertyOptional({ description: '视频时长（秒）', example: 120 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: '视频宽度（像素）', example: 1920 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({ description: '视频高度（像素）', example: 1080 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({ description: '视频帧率', example: 30 })
  @IsOptional()
  @IsNumber()
  frameRate?: number;

  @ApiPropertyOptional({ description: '视频比特率' })
  @IsOptional()
  @IsString()
  bitRate?: string;

  @ApiPropertyOptional({ description: '视频编码格式' })
  @IsOptional()
  @IsString()
  codec?: string;

  @ApiPropertyOptional({ description: '视频缩略图URL' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: '视频封面URL' })
  @IsOptional()
  @IsString()
  coverUrl?: string;
}

export class AudioMediaResource extends MediaResource {
  @ApiProperty({ description: '音频URL', example: 'https://example.com/audio.mp3' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: '音频格式', enum: AudioFormat })
  @IsOptional()
  @IsEnum(AudioFormat)
  format?: AudioFormat;

  @ApiPropertyOptional({ description: '音频时长（秒）', example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: '比特率' })
  @IsOptional()
  @IsString()
  bitRate?: string;

  @ApiPropertyOptional({ description: '采样率' })
  @IsOptional()
  @IsString()
  sampleRate?: string;

  @ApiPropertyOptional({ description: '声道数' })
  @IsOptional()
  @IsNumber()
  channels?: number;

  @ApiPropertyOptional({ description: '音频编码格式' })
  @IsOptional()
  @IsString()
  codec?: string;
}

export class MusicMediaResource extends MediaResource {
  @ApiProperty({ description: '音乐URL', example: 'https://example.com/music.mp3' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: '音频格式', enum: AudioFormat })
  @IsOptional()
  @IsEnum(AudioFormat)
  format?: AudioFormat;

  @ApiPropertyOptional({ description: '音乐时长（秒）', example: 180 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: '音乐标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '音乐艺术家' })
  @IsOptional()
  @IsString()
  artist?: string;

  @ApiPropertyOptional({ description: '音乐专辑' })
  @IsOptional()
  @IsString()
  album?: string;

  @ApiPropertyOptional({ description: '音乐风格' })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({ description: '音乐歌词' })
  @IsOptional()
  @IsString()
  lyrics?: string;

  @ApiPropertyOptional({ description: '音乐封面URL' })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ description: '音乐年份' })
  @IsOptional()
  @IsNumber()
  year?: number;
}

export class FileMediaResource extends MediaResource {
  @ApiProperty({ description: '文件名', example: 'document.pdf' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '文件URL', example: 'https://example.com/file.pdf' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: '文件大小（字节）', example: 1024000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(104857600)
  size?: number;

  @ApiPropertyOptional({ description: '文件MIME类型', example: 'application/pdf' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: '文件哈希值' })
  @IsOptional()
  @IsString()
  hash?: string;

  @ApiPropertyOptional({ description: '文件路径' })
  @IsOptional()
  @IsString()
  path?: string;
}

export class DocumentMediaResource extends MediaResource {
  @ApiProperty({ description: '文档URL', example: 'https://example.com/document.pdf' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: '文档格式', enum: DocumentFormat })
  @IsOptional()
  @IsEnum(DocumentFormat)
  format?: DocumentFormat;

  @ApiPropertyOptional({ description: '文档页数' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  pageCount?: number;

  @ApiPropertyOptional({ description: '文档作者' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({ description: '文档标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '文档摘要' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: '文档关键词', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: '文档内容文本' })
  @IsOptional()
  @IsString()
  contentText?: string;

  @ApiPropertyOptional({ description: '文档封面URL' })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ description: '文档版本' })
  @IsOptional()
  @IsString()
  version?: string;
}

export class CodeMediaResource extends MediaResource {
  @ApiPropertyOptional({ description: '代码语言', enum: CodeLanguage })
  @IsOptional()
  @IsEnum(CodeLanguage)
  language?: CodeLanguage;

  @ApiPropertyOptional({ description: '代码内容' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: '代码行数' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lineCount?: number;

  @ApiPropertyOptional({ description: '代码注释' })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional({ description: '代码依赖', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];

  @ApiPropertyOptional({ description: '代码许可证' })
  @IsOptional()
  @IsString()
  license?: string;

  @ApiPropertyOptional({ description: '代码版本' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: '代码作者' })
  @IsOptional()
  @IsString()
  author?: string;
}

export class PptMediaResource extends MediaResource {
  @ApiPropertyOptional({ description: 'PPT格式', enum: PptFormat })
  @IsOptional()
  @IsEnum(PptFormat)
  format?: PptFormat;

  @ApiPropertyOptional({ description: '幻灯片数量' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  slideCount?: number;

  @ApiPropertyOptional({ description: 'PPT主题' })
  @IsOptional()
  @IsString()
  theme?: string;

  @ApiPropertyOptional({ description: 'PPT作者' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({ description: 'PPT标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'PPT备注' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: '幻灯片缩略图URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  slideThumbnails?: string[];
}

export class CharacterMediaResource extends MediaResource {
  @ApiPropertyOptional({ description: '角色名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '角色类型（2D_IMAGE, 2D_VIDEO, 3D_MODEL等）' })
  @IsOptional()
  @IsString()
  characterType?: string;

  @ApiPropertyOptional({ description: '性别' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: '年龄段' })
  @IsOptional()
  @IsString()
  ageGroup?: string;

  @ApiPropertyOptional({ description: '头像图片资源' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImageMediaResource)
  avatarImage?: ImageMediaResource;

  @ApiPropertyOptional({ description: '头像视频资源' })
  @IsOptional()
  @ValidateNested()
  @Type(() => VideoMediaResource)
  avatarVideo?: VideoMediaResource;

  @ApiPropertyOptional({ description: '关联发音人ID' })
  @IsOptional()
  @IsString()
  speakerId?: string;

  @ApiPropertyOptional({ description: '外观参数' })
  @IsOptional()
  @IsObject()
  appearanceParams?: Record<string, any>;

  @ApiPropertyOptional({ description: '动画参数' })
  @IsOptional()
  @IsObject()
  animationParams?: Record<string, any>;

  @ApiPropertyOptional({ description: '角色动作库', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actions?: string[];

  @ApiPropertyOptional({ description: '角色表情库', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expressions?: string[];

  @ApiPropertyOptional({ description: '角色声音特征' })
  @IsOptional()
  @IsObject()
  voiceFeatures?: Record<string, any>;
}

export class Model3DMediaResource extends MediaResource {
  @ApiPropertyOptional({ description: '3D模型格式', enum: Model3DFormat })
  @IsOptional()
  @IsEnum(Model3DFormat)
  format?: Model3DFormat;

  @ApiPropertyOptional({ description: '模型顶点数' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vertexCount?: number;

  @ApiPropertyOptional({ description: '模型面数' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  faceCount?: number;

  @ApiPropertyOptional({ description: '模型材质数' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  materialCount?: number;

  @ApiPropertyOptional({ description: '模型骨骼数' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  boneCount?: number;

  @ApiPropertyOptional({ description: '模型动画数' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  animationCount?: number;

  @ApiPropertyOptional({ description: '模型边界盒尺寸' })
  @IsOptional()
  @IsObject()
  boundingBox?: {
    width?: number;
    height?: number;
    depth?: number;
  };

  @ApiPropertyOptional({ description: '模型预览图URL' })
  @IsOptional()
  @IsString()
  previewUrl?: string;

  @ApiPropertyOptional({ description: '模型材质贴图URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  textureUrls?: string[];
}

export class AssetMediaResource extends MediaResource {
  @ApiPropertyOptional({ description: '图片资源' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImageMediaResource)
  image?: ImageMediaResource;

  @ApiPropertyOptional({ description: '视频资源' })
  @IsOptional()
  @ValidateNested()
  @Type(() => VideoMediaResource)
  video?: VideoMediaResource;

  @ApiPropertyOptional({ description: '音频资源' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AudioMediaResource)
  audio?: AudioMediaResource;

  @ApiPropertyOptional({ description: '音乐资源' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MusicMediaResource)
  music?: MusicMediaResource;

  @ApiPropertyOptional({ description: '数字人/角色资源' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CharacterMediaResource)
  character?: CharacterMediaResource;

  @ApiPropertyOptional({ description: '文件资源' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FileMediaResource)
  file?: FileMediaResource;

  @ApiPropertyOptional({ description: '文档资源' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentMediaResource)
  document?: DocumentMediaResource;

  @ApiPropertyOptional({ description: 'PPT资源' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PptMediaResource)
  ppt?: PptMediaResource;

  @ApiPropertyOptional({ description: '代码资源' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CodeMediaResource)
  code?: CodeMediaResource;

  @ApiPropertyOptional({ description: '3D模型资源' })
  @IsOptional()
  @ValidateNested()
  @Type(() => Model3DMediaResource)
  model3d?: Model3DMediaResource;

  @ApiPropertyOptional({ description: '扩展属性' })
  @IsOptional()
  @IsObject()
  extraProps?: Record<string, any>;
}

export type AnyMediaResource =
  | FileMediaResource
  | VideoMediaResource
  | ImageMediaResource
  | AudioMediaResource
  | MusicMediaResource
  | CharacterMediaResource
  | DocumentMediaResource
  | PptMediaResource
  | CodeMediaResource
  | Model3DMediaResource
  | AssetMediaResource;

export interface MediaResourceCollection {
  id?: string;
  name?: string;
  description?: string;
  resources?: AnyMediaResource[];
  totalCount?: number;
  createTime?: string;
  updateTime?: string;
}

export interface MediaResourceQuery {
  type?: MediaResourceType;
  name?: string;
  tags?: string[];
  createTimeStart?: string;
  createTimeEnd?: string;
  pageNum?: number;
  pageSize?: number;
}

export interface MediaResourceResult<T = AnyMediaResource> {
  success: boolean;
  data?: T;
  errorMessage?: string;
  errorCode?: string;
}

export interface MediaResourceBatchResult {
  success: boolean;
  successful?: AnyMediaResource[];
  failed?: {
    resource?: AnyMediaResource;
    errorMessage?: string;
  }[];
  successCount?: number;
  failCount?: number;
}
