export interface MediaResource {
  id?: string;
  uuid?: string;
  url?: string;
  bytes?: number[];
  base64?: string;
  localFile?: object;
  type?: string;
  mimeType?: string;
  size?: string;
  name?: string;
  extension?: string;
  prompt?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  extras?: Record<string, any>;
}

export interface ImageMediaResource extends MediaResource {
  type: 'IMAGE';
  width?: string;
  height?: string;
  aspectRatio?: string;
  splitImages?: ImageMediaResource[];
  thumbnailUrl?: string;
  thumbnailWidth?: string;
  thumbnailHeight?: string;
}

export interface VideoMediaResource extends MediaResource {
  type: 'VIDEO';
  duration?: string;
  width?: string;
  height?: string;
  coverUrl?: string;
  coverWidth?: string;
  coverHeight?: string;
  frameRate?: string;
  codec?: string;
}

export interface AudioMediaResource extends MediaResource {
  type: 'AUDIO';
  format?: string;
  bitRate?: string;
  sampleRate?: string;
  channels?: string;
  duration?: string;
  text?: string;
  waveform?: number[];
  speakerId?: string;
}

export interface FileMediaResource extends MediaResource {
  type: 'FILE' | 'DOCUMENT' | 'PPT' | 'CODE';
  iconUrl?: string;
  pages?: string;
  lines?: string;
  language?: string;
  fileType?: string;
  lastModified?: string;
}

export type AnyMediaResource =
  | ImageMediaResource
  | VideoMediaResource
  | AudioMediaResource
  | FileMediaResource
  | MediaResource;
