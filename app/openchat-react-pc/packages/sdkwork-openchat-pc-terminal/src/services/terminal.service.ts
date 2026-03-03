/**
 * Terminal Service
 *
 * 独立于主应用 src 的终端服务实现，负责：
 * 1. 会话生命周期管理
 * 2. 命令执行与输出流
 * 3. 数据订阅分发
 */

import type { TerminalSession } from "../entities/terminalSession.entity";
import {
  createTerminalSession,
  updateTerminalSessionCwd,
  updateTerminalSessionStatus,
} from "../entities/terminalSession.entity";

class TerminalService {
  private sessions: Map<string, TerminalSession> = new Map();
  private dataCallbacks: Map<string, ((data: string) => void)[]> = new Map();

  async createSession(name: string, shell: string = "bash"): Promise<TerminalSession> {
    const id = `terminal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const session = createTerminalSession(id, name, shell, "~");
    const connected = {
      ...updateTerminalSessionStatus(session, "connected"),
      isPrimary: this.sessions.size === 0,
    };
    this.sessions.set(id, connected);
    this.emitData(id, `session ${name} ready`);
    return connected;
  }

  getSessions(): TerminalSession[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  }

  getSession(id: string): TerminalSession | undefined {
    return this.sessions.get(id);
  }

  async writeSession(id: string, data: string): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error("Session not found");
    }

    const input = data.replace(/\r?\n/g, "").trim();
    if (!input) {
      return;
    }

    const outputs = this.executeCommand(session, input);
    outputs.forEach((line) => this.emitData(id, line));

    this.sessions.set(id, {
      ...session,
      lastActivityAt: Date.now(),
    });
  }

  async resizeSession(_id: string, _cols: number, _rows: number): Promise<void> {
    // Web/模拟实现无需处理尺寸变化
  }

  async closeSession(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      this.sessions.set(id, updateTerminalSessionStatus(session, "disconnected"));
    }
    this.sessions.delete(id);
    this.dataCallbacks.delete(id);

    // 重新指定主会话
    const [first] = this.getSessions();
    if (first) {
      this.sessions.set(first.id, { ...first, isPrimary: true });
    }
  }

  onSessionData(id: string, callback: (data: string) => void): () => void {
    if (!this.dataCallbacks.has(id)) {
      this.dataCallbacks.set(id, []);
    }

    const callbacks = this.dataCallbacks.get(id)!;
    callbacks.push(callback);

    return () => {
      const list = this.dataCallbacks.get(id);
      if (!list) {
        return;
      }
      const idx = list.indexOf(callback);
      if (idx >= 0) {
        list.splice(idx, 1);
      }
      if (list.length === 0) {
        this.dataCallbacks.delete(id);
      }
    };
  }

  isDesktop(): boolean {
    const g = globalThis as unknown as {
      __TAURI__?: unknown;
      __TAURI_INTERNALS__?: unknown;
    };
    return Boolean(g.__TAURI__ || g.__TAURI_INTERNALS__);
  }

  private emitData(id: string, data: string): void {
    const callbacks = this.dataCallbacks.get(id);
    if (!callbacks || callbacks.length === 0) {
      return;
    }
    callbacks.forEach((callback) => callback(data));
  }

  private executeCommand(session: TerminalSession, input: string): string[] {
    if (input === "help") {
      return [
        "available commands:",
        "help, date, pwd, ls, cd <path>, echo <text>, clear, whoami",
      ];
    }

    if (input === "date") {
      return [new Date().toLocaleString()];
    }

    if (input === "pwd") {
      return [session.cwd];
    }

    if (input === "ls") {
      return ["Desktop Documents Downloads Projects"];
    }

    if (input.startsWith("cd ")) {
      const nextPath = input.slice(3).trim();
      if (!nextPath) {
        return ["usage: cd <path>"];
      }
      const current = this.sessions.get(session.id);
      if (current) {
        this.sessions.set(session.id, updateTerminalSessionCwd(current, nextPath));
      }
      return [`changed directory to ${nextPath}`];
    }

    if (input.startsWith("echo ")) {
      return [input.slice(5)];
    }

    if (input === "whoami") {
      return ["openchat-user"];
    }

    if (input === "clear") {
      return ["__CLEAR__"];
    }

    return [`command not found: ${input}`];
  }
}

export const terminalService = new TerminalService();

export default terminalService;
