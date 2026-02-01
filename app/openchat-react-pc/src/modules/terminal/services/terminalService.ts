/**
 * Terminal Service
 * 
 * 终端模块的业务逻辑入口
 * 职责：
 * 1. 管理终端会话生命周期
 * 2. 与 Platform 层交互
 * 3. 提供业务方法给 UI 层
 */

import { getPlatform } from '../../../platform';
import type { TerminalSession } from '../entities/terminalSession.entity';
import {
  createTerminalSession,
  updateTerminalSessionStatus,
  updateTerminalSessionCwd,
} from '../entities/terminalSession.entity';

/**
 * 终端服务类
 */
class TerminalService {
  private sessions: Map<string, TerminalSession> = new Map();
  private dataCallbacks: Map<string, ((data: string) => void)[]> = new Map();
  private unsubscribers: Map<string, (() => void)[]> = new Map();

  /**
   * 创建终端会话
   */
  async createSession(name: string, shell?: string): Promise<TerminalSession> {
    const id = `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = createTerminalSession(id, name, shell);
    
    this.sessions.set(id, session);
    
    try {
      const platform = getPlatform();
      await platform.createPty(id, shell);
      
      // 监听 PTY 数据
      const unsubscribe = platform.onPtyData(id, (data) => {
        this.handlePtyData(id, data);
      });
      
      this.unsubscribers.set(id, [unsubscribe]);
      
      // 更新状态为已连接
      const updatedSession = updateTerminalSessionStatus(session, 'connected');
      this.sessions.set(id, updatedSession);
      
      return updatedSession;
    } catch (error) {
      const errorSession = updateTerminalSessionStatus(session, 'error');
      this.sessions.set(id, errorSession);
      throw error;
    }
  }

  /**
   * 获取所有会话
   */
  getSessions(): TerminalSession[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) => b.lastActivityAt - a.lastActivityAt
    );
  }

  /**
   * 获取单个会话
   */
  getSession(id: string): TerminalSession | undefined {
    return this.sessions.get(id);
  }

  /**
   * 写入数据到终端
   */
  async writeSession(id: string, data: string): Promise<void> {
    const platform = getPlatform();
    await platform.writePty(id, data);
    
    // 更新活动时间
    const session = this.sessions.get(id);
    if (session) {
      this.sessions.set(id, {
        ...session,
        lastActivityAt: Date.now(),
      });
    }
  }

  /**
   * 调整终端大小
   */
  async resizeSession(id: string, cols: number, rows: number): Promise<void> {
    const platform = getPlatform();
    await platform.resizePty(id, cols, rows);
  }

  /**
   * 关闭终端会话
   */
  async closeSession(id: string): Promise<void> {
    // 取消订阅
    const unsubscribers = this.unsubscribers.get(id);
    if (unsubscribers) {
      unsubscribers.forEach(unsubscribe => unsubscribe());
      this.unsubscribers.delete(id);
    }
    
    // 销毁 PTY
    try {
      const platform = getPlatform();
      await platform.destroyPty(id);
    } catch (error) {
      console.error('Failed to destroy PTY:', error);
    }
    
    // 更新状态
    const session = this.sessions.get(id);
    if (session) {
      this.sessions.set(id, updateTerminalSessionStatus(session, 'disconnected'));
    }
    
    // 清理
    this.sessions.delete(id);
    this.dataCallbacks.delete(id);
  }

  /**
   * 订阅终端数据
   */
  onSessionData(id: string, callback: (data: string) => void): () => void {
    if (!this.dataCallbacks.has(id)) {
      this.dataCallbacks.set(id, []);
    }
    
    const callbacks = this.dataCallbacks.get(id)!;
    callbacks.push(callback);
    
    // 返回取消订阅函数
    return () => {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * 处理 PTY 数据
   */
  private handlePtyData(id: string, data: string): void {
    const callbacks = this.dataCallbacks.get(id);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
    
    // 解析工作目录（简化实现）
    this.parseCwd(id, data);
  }

  /**
   * 解析当前工作目录
   */
  private parseCwd(id: string, data: string): void {
    // 这里可以实现更复杂的 CWD 解析逻辑
    // 目前仅作为示例
    const session = this.sessions.get(id);
    if (session && data.includes('cd ')) {
      // 简化处理，实际应该通过更可靠的方式获取 CWD
      const match = data.match(/cd\s+(\S+)/);
      if (match) {
        const newCwd = match[1];
        this.sessions.set(id, updateTerminalSessionCwd(session, newCwd));
      }
    }
  }

  /**
   * 检查是否在 Desktop 环境
   */
  isDesktop(): boolean {
    return getPlatform().getPlatform() === 'desktop';
  }
}

// 单例导出
export const terminalService = new TerminalService();

export default terminalService;
