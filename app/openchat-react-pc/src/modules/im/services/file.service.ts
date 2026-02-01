/**
 * 文件上传服务
 *
 * 职责：
 * 1. 文件上传（图片、视频、文档等）
 * 2. 上传进度管理
 * 3. 文件类型验证
 * 4. 文件压缩（图片）
 * 5. 生成缩略图
 */

import { generateUUID } from '@/utils/uuid';

export interface UploadFileParams {
  file: File;
  onProgress?: (progress: number) => void;
  compress?: boolean; // 是否压缩图片
  maxWidth?: number; // 图片最大宽度
  maxHeight?: number; // 图片最大高度
}

export interface UploadResult {
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number; // 视频时长
  error?: string;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

// 文件类型配置
const FILE_TYPE_CONFIG = {
  image: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
  },
  video: {
    extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
    maxSize: 100 * 1024 * 1024, // 100MB
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'],
  },
  audio: {
    extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac'],
    maxSize: 50 * 1024 * 1024, // 50MB
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac'],
  },
  document: {
    extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar'],
    maxSize: 50 * 1024 * 1024, // 50MB
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed',
    ],
  },
};

/**
 * 验证文件
 */
export function validateFile(file: File, type?: 'image' | 'video' | 'audio' | 'document'): FileValidationResult {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  
  // 检查文件类型
  if (type) {
    const config = FILE_TYPE_CONFIG[type];
    if (!config.extensions.includes(ext)) {
      return {
        valid: false,
        error: `不支持的文件格式，请上传 ${config.extensions.join(', ')} 格式的文件`,
      };
    }
    
    if (file.size > config.maxSize) {
      return {
        valid: false,
        error: `文件大小超过限制，最大支持 ${formatFileSize(config.maxSize)}`,
      };
    }
  }
  
  // 通用检查
  if (file.size === 0) {
    return { valid: false, error: '文件不能为空' };
  }
  
  // 检查文件名长度
  if (file.name.length > 200) {
    return { valid: false, error: '文件名过长' };
  }
  
  return { valid: true };
}

/**
 * 获取文件类型
 */
export function getFileType(file: File): 'image' | 'video' | 'audio' | 'document' | 'unknown' {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  
  for (const [type, config] of Object.entries(FILE_TYPE_CONFIG)) {
    if (config.extensions.includes(ext)) {
      return type as 'image' | 'video' | 'audio' | 'document';
    }
  }
  
  return 'unknown';
}

/**
 * 压缩图片
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      let { width, height } = img;
      
      // 计算缩放比例
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建 canvas 上下文'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('图片压缩失败'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    
    img.src = url;
  });
}

/**
 * 生成图片缩略图
 */
export async function generateThumbnail(
  file: File,
  maxWidth: number = 300,
  maxHeight: number = 300
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      let { width, height } = img;
      
      // 计算缩放比例
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('无法创建 canvas 上下文'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
      URL.revokeObjectURL(url);
      resolve(thumbnailUrl);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('缩略图生成失败'));
    };
    
    img.src = url;
  });
}

/**
 * 获取视频时长
 */
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法获取视频信息'));
    };
    
    video.src = url;
  });
}

/**
 * 获取图片尺寸
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法获取图片尺寸'));
    };
    
    img.src = url;
  });
}

/**
 * 上传文件
 */
export async function uploadFile(params: UploadFileParams): Promise<UploadResult> {
  const { file, onProgress, compress = true, maxWidth = 1920, maxHeight = 1920 } = params;
  
  // 验证文件
  const fileType = getFileType(file);
  const validation = validateFile(file, fileType === 'unknown' ? undefined : fileType);
  
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  try {
    let uploadFile: File | Blob = file;
    let thumbnailUrl: string | undefined;
    let dimensions: { width: number; height: number } | undefined;
    let duration: number | undefined;
    
    // 图片处理
    if (fileType === 'image') {
      // 获取图片尺寸
      dimensions = await getImageDimensions(file);
      
      // 生成缩略图
      thumbnailUrl = await generateThumbnail(file);
      
      // 压缩图片
      if (compress && file.size > 1024 * 1024) {
        uploadFile = await compressImage(file, maxWidth, maxHeight);
      }
    }
    
    // 视频处理
    if (fileType === 'video') {
      duration = await getVideoDuration(file);
    }
    
    // 模拟上传进度
    const totalSize = uploadFile instanceof File ? uploadFile.size : uploadFile.size;
    let uploadedSize = 0;
    const chunkSize = totalSize / 10;
    
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      uploadedSize += chunkSize;
      const progress = Math.min((uploadedSize / totalSize) * 100, 100);
      onProgress?.(progress);
    }
    
    // 生成模拟的 URL
    const url = URL.createObjectURL(uploadFile instanceof File ? uploadFile : new Blob([uploadFile]));
    
    return {
      success: true,
      url,
      thumbnailUrl,
      fileName: file.name,
      fileSize: uploadFile instanceof File ? uploadFile.size : uploadFile.size,
      width: dimensions?.width,
      height: dimensions?.height,
      duration,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败',
    };
  }
}

/**
 * 批量上传文件
 */
export async function uploadFiles(
  files: File[],
  onProgress?: (index: number, progress: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const result = await uploadFile({
      file: files[i],
      onProgress: (progress) => onProgress?.(i, progress),
    });
    results.push(result);
  }
  
  return results;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * 下载文件
 */
export function downloadFile(url: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 复制文件到剪贴板
 */
export async function copyFileToClipboard(file: File): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          [file.type]: file,
        }),
      ]);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
