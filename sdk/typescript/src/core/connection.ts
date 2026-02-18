/**
 * 连接状态管理
 * 自动重连、心跳检测、状态同步
 */

import { EventEmitter } from 'eventemitter3';
import { Logger } from './logger';
import { sleep, generateUUID } from './utils';

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

export interface ConnectionOptions {
  url: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  connectTimeout?: number;
}

export interface ConnectionEvents {
  state_change: (state: ConnectionState, oldState: ConnectionState) => void;
  connect: () => void;
  disconnect: () => void;
  error: (error: any) => void;
  reconnecting: (attempt: number, maxAttempts: number) => void;
  reconnect_failed: (attempt: number, error: any) => void;
  message: (data: any) => void;
  heartbeat: () => void;
  heartbeat_timeout: () => void;
}

export class ConnectionManager extends EventEmitter<ConnectionEvents> {
  private ws: WebSocket | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private options: Required<ConnectionOptions>;
  private logger: Logger;
  private reconnectAttempt: number = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatResponseTimer: NodeJS.Timeout | null = null;
  private connectTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: any[] = [];
  private isManualDisconnect: boolean = false;
  private connectionId: string = generateUUID();

  constructor(
    private url: string,
    options: ConnectionOptions,
    logger?: Logger
  ) {
    super();
    this.logger = logger || new Logger({ prefix: '[ConnectionManager]' });
    this.options = {
      url,
      reconnect: options.reconnect ?? true,
      reconnectInterval: options.reconnectInterval ?? 1000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      heartbeatTimeout: options.heartbeatTimeout ?? 10000,
      connectTimeout: options.connectTimeout ?? 10000,
    };
  }

  getState(): ConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }

  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED || this.state === ConnectionState.CONNECTING) {
      this.logger.warn('Already connected or connecting');
      return;
    }

    this.isManualDisconnect = false;
    await this.doConnect();
  }

  private async doConnect(): Promise<void> {
    const oldState = this.state;
    this.setState(ConnectionState.CONNECTING);

    try {
      this.ws = await this.createWebSocket();
      this.setupEventHandlers();
      this.startHeartbeat();
      
      this.setState(ConnectionState.CONNECTED);
      this.emit('connect');
      this.flushMessageQueue();
      
      this.logger.info(`Connected to ${this.options.url}`);
    } catch (error) {
      this.logger.error('Connection failed:', error);
      this.setState(ConnectionState.ERROR);
      this.emit('error', error);
      
      if (this.options.reconnect && !this.isManualDisconnect) {
        await this.scheduleReconnect();
      }
    }
  }

  private createWebSocket(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      this.connectTimer = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.options.connectTimeout);

      const ws = new WebSocket(this.options.url);
      
      ws.onopen = () => {
        clearTimeout(this.connectTimer!);
        resolve(ws);
      };
      
      ws.onerror = (error) => {
        clearTimeout(this.connectTimer!);
        reject(error);
      };
    });
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onclose = (event) => {
      this.logger.info('WebSocket closed:', event.code, event.reason);
      this.cleanup();
      
      const oldState = this.state;
      this.setState(ConnectionState.DISCONNECTED);
      
      if (!this.isManualDisconnect) {
        this.emit('disconnect');
        
        if (this.options.reconnect && this.reconnectAttempt < this.options.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      }
    };

    this.ws.onerror = (error) => {
      this.logger.error('WebSocket error:', error);
      this.emit('error', error);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (this.isHeartbeatMessage(data)) {
          this.handleHeartbeatResponse();
          return;
        }
        
        this.emit('message', data);
      } catch (error) {
        this.emit('message', event.data);
      }
    };
  }

  disconnect(): void {
    this.isManualDisconnect = true;
    this.cleanup();
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.setState(ConnectionState.DISCONNECTED);
    this.emit('disconnect');
    this.logger.info('Disconnected');
  }

  send(data: any): void {
    if (this.state !== ConnectionState.CONNECTED || !this.ws) {
      this.messageQueue.push(data);
      return;
    }

    const message = typeof data === 'string' ? data : JSON.stringify(data);
    this.ws.send(message);
  }

  sendBinary(data: ArrayBuffer): void {
    if (this.state !== ConnectionState.CONNECTED || !this.ws) {
      return;
    }
    this.ws.send(data);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  private async scheduleReconnect(): Promise<void> {
    const attempt = ++this.reconnectAttempt;
    const oldState = this.state;
    this.setState(ConnectionState.RECONNECTING);
    
    this.logger.info(`Reconnecting... Attempt ${attempt}/${this.options.maxReconnectAttempts}`);
    this.emit('reconnecting', attempt, this.options.maxReconnectAttempts);

    const delay = this.options.reconnectInterval * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    
    await sleep(delay + jitter);

    try {
      await this.doConnect();
      this.reconnectAttempt = 0;
    } catch (error) {
      this.logger.error('Reconnection failed:', error);
      this.emit('reconnect_failed', attempt, error);
      
      if (attempt < this.options.maxReconnectAttempts) {
        await this.scheduleReconnect();
      } else {
        this.setState(ConnectionState.ERROR);
        this.logger.error('Max reconnection attempts reached');
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatResponseTimer) {
      clearTimeout(this.heartbeatResponseTimer);
      this.heartbeatResponseTimer = null;
    }
  }

  private sendHeartbeat(): void {
    if (this.state !== ConnectionState.CONNECTED) return;
    
    this.send({ type: 'ping', timestamp: Date.now() });
    
    this.heartbeatResponseTimer = setTimeout(() => {
      this.logger.warn('Heartbeat timeout');
      this.emit('heartbeat_timeout');
      this.disconnect();
    }, this.options.heartbeatTimeout);
  }

  private handleHeartbeatResponse(): void {
    if (this.heartbeatResponseTimer) {
      clearTimeout(this.heartbeatResponseTimer);
      this.heartbeatResponseTimer = null;
    }
    this.emit('heartbeat');
  }

  private isHeartbeatMessage(data: any): boolean {
    return data?.type === 'pong' || data?.type === 'heartbeat';
  }

  private cleanup(): void {
    this.stopHeartbeat();
    
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setState(newState: ConnectionState): void {
    if (this.state === newState) return;
    
    const oldState = this.state;
    this.state = newState;
    this.logger.info(`State: ${oldState} -> ${newState}`);
    this.emit('state_change', newState, oldState);
  }

  getConnectionId(): string {
    return this.connectionId;
  }

  destroy(): void {
    this.disconnect();
    this.removeAllListeners();
    this.messageQueue = [];
  }
}

export function createConnectionManager(
  url: string,
  options: ConnectionOptions,
  logger?: Logger
): ConnectionManager {
  return new ConnectionManager(url, options, logger);
}
