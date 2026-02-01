/**
 * Terminal Session 实体
 * 
 * 定义终端会话的领域模型
 */

/**
 * 终端会话状态
 */
export type TerminalSessionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * 终端会话实体
 */
export interface TerminalSession {
  /** 会话唯一标识 */
  id: string;
  
  /** 会话名称 */
  name: string;
  
  /** 使用的 Shell */
  shell: string;
  
  /** 当前工作目录 */
  cwd: string;
  
  /** 会话状态 */
  status: TerminalSessionStatus;
  
  /** 创建时间 */
  createdAt: number;
  
  /** 最后活动时间 */
  lastActivityAt: number;
  
  /** 是否为主会话 */
  isPrimary: boolean;
}

/**
 * 创建新的终端会话
 */
export function createTerminalSession(
  id: string,
  name: string,
  shell: string = 'bash',
  cwd: string = '~'
): TerminalSession {
  const now = Date.now();
  return {
    id,
    name,
    shell,
    cwd,
    status: 'connecting',
    createdAt: now,
    lastActivityAt: now,
    isPrimary: false,
  };
}

/**
 * 更新终端会话状态
 */
export function updateTerminalSessionStatus(
  session: TerminalSession,
  status: TerminalSessionStatus
): TerminalSession {
  return {
    ...session,
    status,
    lastActivityAt: Date.now(),
  };
}

/**
 * 更新终端会话工作目录
 */
export function updateTerminalSessionCwd(
  session: TerminalSession,
  cwd: string
): TerminalSession {
  return {
    ...session,
    cwd,
    lastActivityAt: Date.now(),
  };
}

export default TerminalSession;
