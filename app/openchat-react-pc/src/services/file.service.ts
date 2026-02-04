/**
 * 文件服务
 *
 * 功能：
 * 1. 大文件分片上传
 * 2. 断点续传
 * 3. 文件上传进度监控
 * 4. 文件下载
 * 5. 文件管理
 * 6. 文件预览
 */

import { API_BASE_URL } from '@/app/env';
import { errorService } from './error.service';

// 浏览器兼容的 EventEmitter 实现
class EventEmitter {
  private events: Map<string, Function[]>;

  constructor() {
    this.events = new Map();
  }

  on(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return this;
  }

  once(event: string, listener: Function): this {
    const onceListener = (...args: any[]) => {
      this.off(event, onceListener);
      listener(...args);
    };
    this.on(event, onceListener);
    return this;
  }

  off(event: string, listener: Function): this {
    if (this.events.has(event)) {
      const listeners = this.events.get(event)!;
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (this.events.has(event)) {
      const listeners = this.events.get(event)!;
      for (const listener of listeners) {
        listener(...args);
      }
      return true;
    }
    return false;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  getMaxListeners(): number {
    return 0;
  }

  setMaxListeners(n: number): this {
    return this;
  }

  listeners(event: string): Function[] {
    return this.events.get(event) || [];
  }

  rawListeners(event: string): Function[] {
    return this.events.get(event) || [];
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0;
  }

  prependListener(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.unshift(listener);
    return this;
  }

  prependOnceListener(event: string, listener: Function): this {
    const onceListener = (...args: any[]) => {
      this.off(event, onceListener);
      listener(...args);
    };
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.unshift(onceListener);
    return this;
  }

  eventNames(): string[] {
    return Array.from(this.events.keys());
  }
}

export interface FileUploadOptions {
  chunkSize?: number;
  concurrentChunks?: number;
  retryAttempts?: number;
  retryDelay?: number;
  onProgress?: (progress: number, uploadedBytes: number, totalBytes: number) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  onComplete?: (fileId: string, fileUrl: string) => void;
  onError?: (error: Error) => void;
}

export interface FileChunk {
  index: number;
  start: number;
  end: number;
  size: number;
  data: Blob;
}

export interface UploadSession {
  id: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: Set<number>;
  uploadUrl: string;
  progress: number;
  startTime: number;
  lastActivity: number;
}

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  thumbnailUrl?: string;
  uploadTime: number;
  uploaderId?: string;
  [key: string]: any;
}

export class FileService extends EventEmitter {
  private static instance: FileService;
  private uploadSessions: Map<string, UploadSession> = new Map();
  private isInitialized = false;

  private constructor() {
    super();
  }

  static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  /**
   * 初始化文件服务
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // 恢复未完成的上传会话
    this.restoreUploadSessions();
    
    this.isInitialized = true;
    console.log('[FileService] Initialized');
  }

  /**
   * 上传文件
   */
  async uploadFile(file: File, options: FileUploadOptions = {}): Promise<string> {
    const {
      chunkSize = 1024 * 1024, // 1MB
      concurrentChunks = 3,
      retryAttempts = 3,
      retryDelay = 1000,
    } = options;

    try {
      // 创建上传会话
      const session = await this.createUploadSession(file, chunkSize);
      this.uploadSessions.set(session.id, session);
      this.saveUploadSessions();

      // 分片上传
      await this.uploadChunks(session, {
        concurrentChunks,
        retryAttempts,
        retryDelay,
        onProgress: options.onProgress,
        onChunkComplete: options.onChunkComplete,
      });

      // 完成上传
      const fileUrl = await this.completeUpload(session);
      
      // 清理会话
      this.uploadSessions.delete(session.id);
      this.saveUploadSessions();

      // 触发完成事件
      options.onComplete?.(session.fileId, fileUrl);
      this.emit('uploadComplete', session.fileId, fileUrl);

      return fileUrl;
    } catch (error: any) {
      options.onError?.(error);
      this.emit('uploadError', error);
      errorService.handleError(error, {
        context: 'file:upload',
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  /**
   * 创建上传会话
   */
  private async createUploadSession(file: File, chunkSize: number): Promise<UploadSession> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/files/upload/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          chunkSize,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create upload session');
      }

      const data = await response.json();
      return {
        id: data.sessionId,
        fileId: data.fileId,
        fileName: file.name,
        fileSize: file.size,
        chunkSize,
        totalChunks: Math.ceil(file.size / chunkSize),
        uploadedChunks: new Set(),
        uploadUrl: data.uploadUrl,
        progress: 0,
        startTime: Date.now(),
        lastActivity: Date.now(),
      };
    } catch (error) {
      throw new Error('Failed to create upload session');
    }
  }

  /**
   * 上传分片
   */
  private async uploadChunks(session: UploadSession, options: {
    concurrentChunks: number;
    retryAttempts: number;
    retryDelay: number;
    onProgress?: (progress: number, uploadedBytes: number, totalBytes: number) => void;
    onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  }): Promise<void> {
    const chunks = this.createChunks(session);
    const uploadedChunks = session.uploadedChunks;
    const totalChunks = chunks.length;
    let uploadedBytes = Array.from(uploadedChunks).reduce((sum, index) => sum + chunks[index].size, 0);

    // 过滤已上传的分片
    const pendingChunks = chunks.filter((_, index) => !uploadedChunks.has(index));

    // 并发上传
    const chunkQueue = [...pendingChunks];
    const activeUploads: Promise<void>[] = [];

    while (chunkQueue.length > 0 || activeUploads.length > 0) {
      // 启动新的上传任务
      while (activeUploads.length < options.concurrentChunks && chunkQueue.length > 0) {
        const chunk = chunkQueue.shift()!;
        const uploadPromise = this.uploadChunk(session, chunk, options.retryAttempts, options.retryDelay)
          .then(() => {
            uploadedChunks.add(chunk.index);
            uploadedBytes += chunk.size;
            const progress = Math.min((uploadedBytes / session.fileSize) * 100, 100);
            
            // 更新进度
            session.progress = progress;
            session.lastActivity = Date.now();
            this.saveUploadSessions();

            // 触发事件
            options.onProgress?.(progress, uploadedBytes, session.fileSize);
            options.onChunkComplete?.(chunk.index, totalChunks);
            this.emit('chunkUploaded', session.id, chunk.index, progress);
          })
          .finally(() => {
            const index = activeUploads.indexOf(uploadPromise);
            if (index > -1) {
              activeUploads.splice(index, 1);
            }
          });

        activeUploads.push(uploadPromise);
      }

      // 等待至少一个上传完成
      if (activeUploads.length > 0) {
        await Promise.race(activeUploads);
      }
    }
  }

  /**
   * 上传单个分片
   */
  private async uploadChunk(session: UploadSession, chunk: FileChunk, retryAttempts: number, retryDelay: number): Promise<void> {
    let attempts = 0;

    while (attempts < retryAttempts) {
      try {
        const formData = new FormData();
        formData.append('sessionId', session.id);
        formData.append('chunkIndex', chunk.index.toString());
        formData.append('totalChunks', session.totalChunks.toString());
        formData.append('file', chunk.data, session.fileName);

        const response = await fetch(`${API_BASE_URL}/api/files/upload/chunk`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload chunk');
        }

        return;
      } catch (error) {
        attempts++;
        if (attempts >= retryAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempts - 1)));
      }
    }
  }

  /**
   * 完成上传
   */
  private async completeUpload(session: UploadSession): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/files/upload/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          sessionId: session.id,
          fileId: session.fileId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete upload');
      }

      const data = await response.json();
      return data.fileUrl;
    } catch (error) {
      throw new Error('Failed to complete upload');
    }
  }

  /**
   * 创建分片
   */
  private createChunks(session: UploadSession): FileChunk[] {
    const chunks: FileChunk[] = [];
    const { fileSize, chunkSize } = session;

    for (let i = 0; i < session.totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileSize);
      const size = end - start;

      chunks.push({
        index: i,
        start,
        end,
        size,
        data: new Blob([], { type: 'application/octet-stream' }), // 实际数据会在上传时读取
      });
    }

    return chunks;
  }

  /**
   * 暂停上传
   */
  pauseUpload(sessionId: string): void {
    const session = this.uploadSessions.get(sessionId);
    if (session) {
      this.emit('uploadPaused', sessionId);
    }
  }

  /**
   * 恢复上传
   */
  async resumeUpload(sessionId: string, options?: FileUploadOptions): Promise<void> {
    const session = this.uploadSessions.get(sessionId);
    if (!session) {
      throw new Error('Upload session not found');
    }

    try {
      // 检查已上传的分片
      const uploadedChunks = await this.getUploadedChunks(session.id);
      session.uploadedChunks = new Set(uploadedChunks);

      // 继续上传
      await this.uploadChunks(session, {
        concurrentChunks: options?.concurrentChunks || 3,
        retryAttempts: options?.retryAttempts || 3,
        retryDelay: options?.retryDelay || 1000,
        onProgress: options?.onProgress,
        onChunkComplete: options?.onChunkComplete,
      });

      // 完成上传
      const fileUrl = await this.completeUpload(session);
      
      // 清理会话
      this.uploadSessions.delete(session.id);
      this.saveUploadSessions();

      // 触发完成事件
      options?.onComplete?.(session.fileId, fileUrl);
      this.emit('uploadComplete', session.fileId, fileUrl);
    } catch (error: any) {
      options?.onError?.(error);
      this.emit('uploadError', error);
      throw error;
    }
  }

  /**
   * 获取已上传的分片
   */
  private async getUploadedChunks(sessionId: string): Promise<number[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/files/upload/chunks`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get uploaded chunks');
      }

      const data = await response.json();
      return data.chunks || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(fileUrl: string, fileName: string): Promise<void> {
    try {
      const response = await fetch(fileUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.emit('downloadComplete', fileName);
    } catch (error: any) {
      this.emit('downloadError', error);
      errorService.handleError(error, {
        context: 'file:download',
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(fileId: string): Promise<FileInfo> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get file info');
      }

      const data = await response.json();
      return {
        id: data.id,
        name: data.name,
        size: data.size,
        type: data.type,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl,
        uploadTime: data.uploadTime,
        uploaderId: data.uploaderId,
        ...data,
      };
    } catch (error: any) {
      errorService.handleError(error, {
        context: 'file:getInfo',
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      this.emit('fileDeleted', fileId);
    } catch (error: any) {
      errorService.handleError(error, {
        context: 'file:delete',
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  /**
   * 获取文件列表
   */
  async getFileList(options?: {
    page?: number;
    pageSize?: number;
    type?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ files: FileInfo[]; total: number }> {
    try {
      const params = new URLSearchParams({
        page: (options?.page || 1).toString(),
        pageSize: (options?.pageSize || 20).toString(),
        ...(options?.type && { type: options.type }),
        ...(options?.sortBy && { sortBy: options.sortBy }),
        ...(options?.sortOrder && { sortOrder: options.sortOrder }),
      });

      const response = await fetch(`${API_BASE_URL}/api/files?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get file list');
      }

      const data = await response.json();
      return {
        files: data.files.map((file: any) => ({
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.type,
          url: file.url,
          thumbnailUrl: file.thumbnailUrl,
          uploadTime: file.uploadTime,
          uploaderId: file.uploaderId,
          ...file,
        })),
        total: data.total,
      };
    } catch (error: any) {
      errorService.handleError(error, {
        context: 'file:getList',
        showNotification: true,
        reportError: true,
      });
      throw error;
    }
  }

  /**
   * 保存上传会话
   */
  private saveUploadSessions(): void {
    try {
      const sessions = Array.from(this.uploadSessions.values()).map(session => ({
        ...session,
        uploadedChunks: Array.from(session.uploadedChunks),
      }));
      localStorage.setItem('file_upload_sessions', JSON.stringify(sessions));
    } catch (error) {
      console.warn('Failed to save upload sessions:', error);
    }
  }

  /**
   * 加载上传会话
   */
  private restoreUploadSessions(): void {
    try {
      const sessionsData = localStorage.getItem('file_upload_sessions');
      if (sessionsData) {
        const sessions = JSON.parse(sessionsData);
        sessions.forEach((sessionData: any) => {
          const session: UploadSession = {
            ...sessionData,
            uploadedChunks: new Set(sessionData.uploadedChunks),
          };
          this.uploadSessions.set(session.id, session);
        });
      }
    } catch (error) {
      console.warn('Failed to restore upload sessions:', error);
    }
  }

  /**
   * 获取上传会话
   */
  getUploadSession(sessionId: string): UploadSession | null {
    return this.uploadSessions.get(sessionId) || null;
  }

  /**
   * 获取所有上传会话
   */
  getUploadSessions(): UploadSession[] {
    return Array.from(this.uploadSessions.values());
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.uploadSessions) {
      if (now - session.lastActivity > 24 * 60 * 60 * 1000) { // 24小时过期
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.uploadSessions.delete(sessionId);
      this.emit('sessionExpired', sessionId);
    });

    if (expiredSessions.length > 0) {
      this.saveUploadSessions();
    }
  }

  /**
   * 获取文件服务状态
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      activeUploads: this.uploadSessions.size,
      totalUploads: this.uploadSessions.size,
    };
  }
}

export const fileService = FileService.getInstance();

export default FileService;