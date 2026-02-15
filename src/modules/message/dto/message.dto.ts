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
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
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
} from '../../../common/media-resource';

export { ImageMediaResource, VideoMediaResource, AudioMediaResource, MusicMediaResource, FileMediaResource, DocumentMediaResource, CodeMediaResource, CardMediaResource, PptMediaResource, CharacterMediaResource, Model3DMediaResource };

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  FILE = 'file',
  LOCATION = 'location',
  CARD = 'card',
  CUSTOM = 'custom',
  SYSTEM = 'system',
  MUSIC = 'music',
  DOCUMENT = 'document',
  CODE = 'code',
  PPT = 'ppt',
  CHARACTER = 'character',
  MODEL_3D = 'model_3d',
}

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  RECALLED = 'recalled',
}

export enum ConversationType {
  SINGLE = 'single',
  GROUP = 'group',
}

export class LocationContent {
  @ApiProperty({ description: '纬度', example: 39.9042 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: '经度', example: 116.4074 })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ description: '地址描述', example: '北京市东城区天安门' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: '地点名称', example: '天安门' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '缩略图URL' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

export class CardContent {
  @ApiProperty({ description: '用户ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({ description: '用户昵称' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ description: '用户头像URL' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: '用户签名' })
  @IsOptional()
  @IsString()
  signature?: string;
}

export class TextContent {
  @ApiProperty({ description: '文本内容', example: 'Hello World' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({ description: '是否提及', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];
}

export class SystemContent {
  @ApiProperty({ description: '系统消息类型' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ description: '系统消息内容' })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

export class CustomContent {
  @ApiProperty({ description: '自定义消息类型标识' })
  @IsString()
  @IsNotEmpty()
  customType: string;

  @ApiPropertyOptional({ description: '自定义消息数据' })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

export class MessageContent {
  @ApiPropertyOptional({ description: '文本内容' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TextContent)
  text?: TextContent;

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

  @ApiPropertyOptional({ description: '代码资源' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CodeMediaResource)
  code?: CodeMediaResource;

  @ApiPropertyOptional({ description: '演示文稿资源' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PptMediaResource)
  ppt?: PptMediaResource;

  @ApiPropertyOptional({ description: '数字人/角色资源' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CharacterMediaResource)
  character?: CharacterMediaResource;

  @ApiPropertyOptional({ description: '3D模型资源' })
  @IsOptional()
  @ValidateNested()
  @Type(() => Model3DMediaResource)
  model3d?: Model3DMediaResource;

  @ApiPropertyOptional({ description: '位置内容' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationContent)
  location?: LocationContent;

  @ApiPropertyOptional({ description: '名片内容' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CardContent)
  card?: CardContent;

  @ApiPropertyOptional({ description: '卡片资源（小程序、应用等）' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CardMediaResource)
  cardResource?: CardMediaResource;

  @ApiPropertyOptional({ description: '系统消息内容' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SystemContent)
  system?: SystemContent;

  @ApiPropertyOptional({ description: '自定义消息内容' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomContent)
  custom?: CustomContent;
}

export class SendMessage {
  @ApiPropertyOptional({
    description: '消息UUID（客户端生成，用于去重）',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  uuid?: string;

  @ApiProperty({
    description: '消息类型',
    enum: MessageType,
    example: MessageType.TEXT,
  })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiProperty({
    description: '消息内容，根据type不同结构不同',
    type: MessageContent,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => MessageContent)
  content: MessageContent;

  @ApiProperty({
    description: '发送者用户ID',
    example: 'user-123',
  })
  @IsString()
  @IsNotEmpty()
  fromUserId: string;

  @ApiPropertyOptional({
    description: '接收者用户ID（单聊时必填）',
    example: 'user-456',
  })
  @IsOptional()
  @IsString()
  toUserId?: string;

  @ApiPropertyOptional({
    description: '群组ID（群聊时必填）',
    example: 'group-789',
  })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({
    description: '回复的消息ID',
    example: 'msg-001',
  })
  @IsOptional()
  @IsString()
  replyToId?: string;

  @ApiPropertyOptional({
    description: '转发来源消息ID',
    example: 'msg-002',
  })
  @IsOptional()
  @IsString()
  forwardFromId?: string;

  @ApiPropertyOptional({
    description: '客户端序列号（用于消息去重）',
    example: 12345,
  })
  @IsOptional()
  @IsNumber()
  clientSeq?: number;

  @ApiPropertyOptional({
    description: '扩展数据',
  })
  @IsOptional()
  @IsObject()
  extra?: Record<string, any>;

  @ApiPropertyOptional({
    description: '是否需要已读回执',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  needReadReceipt?: boolean;
}

export class BatchSendMessage {
  @ApiProperty({
    description: '消息列表',
    type: [SendMessage],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SendMessage)
  messages: SendMessage[];
}

export class UpdateMessageStatus {
  @ApiProperty({
    description: '消息状态',
    enum: MessageStatus,
    example: MessageStatus.READ,
  })
  @IsEnum(MessageStatus)
  status: MessageStatus;
}

export class MarkMessagesRead {
  @ApiProperty({
    description: '消息ID列表',
    type: [String],
    example: ['msg-001', 'msg-002', 'msg-003'],
  })
  @IsArray()
  @IsString({ each: true })
  messageIds: string[];
}

export class GetMessagesQuery {
  @ApiPropertyOptional({
    description: '限制数量',
    default: 50,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: '偏移量',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  offset?: number = 0;

  @ApiPropertyOptional({
    description: '游标（用于游标分页）',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class GetMessageHistory {
  @ApiProperty({
    description: '目标ID（用户ID或群组ID）',
    example: 'user-456',
  })
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @ApiProperty({
    description: '会话类型',
    enum: ConversationType,
    example: ConversationType.SINGLE,
  })
  @IsEnum(ConversationType)
  type: ConversationType;

  @ApiPropertyOptional({
    description: '限制数量',
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: '游标',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: '消息类型过滤',
    enum: MessageType,
  })
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;
}

export class RecallMessage {
  @ApiProperty({
    description: '操作者用户ID',
    example: 'user-123',
  })
  @IsString()
  @IsNotEmpty()
  operatorId: string;
}

export class ForwardMessage {
  @ApiProperty({
    description: '原消息ID',
    example: 'msg-001',
  })
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @ApiProperty({
    description: '转发目标用户ID列表',
    type: [String],
    example: ['user-456', 'user-789'],
  })
  @IsArray()
  @IsString({ each: true })
  toUserIds: string[];

  @ApiPropertyOptional({
    description: '转发目标群组ID列表',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  toGroupIds?: string[];
}

export class SearchMessages {
  @ApiProperty({
    description: '搜索关键词',
    example: 'Hello',
  })
  @IsString()
  @IsNotEmpty()
  keyword: string;

  @ApiPropertyOptional({
    description: '目标ID（用户ID或群组ID）',
  })
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional({
    description: '会话类型',
    enum: ConversationType,
  })
  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType;

  @ApiPropertyOptional({
    description: '消息类型',
    enum: MessageType,
  })
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @ApiPropertyOptional({
    description: '开始时间',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({
    description: '结束时间',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({
    description: '页码',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: '每页数量',
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Max(100)
  limit?: number;
}
