/**
 * 微前端架构类型定义
 * 
 * 定义微前端的核心概念、配置和通信机制
 */

export type MicroFrontendStatus = 'not_loaded' | 'loading' | 'loaded' | 'mounted' | 'unmounted' | 'error';

export interface MicroFrontendConfig {
  name: string;
  entry: string;
  container: string | HTMLElement;
  activeWhen?: (path: string) => boolean;
  props?: Record<string, any>;
  sandbox?: boolean;
  cssSelector?: string;
  loadTimeout?: number;
  mountTimeout?: number;
  unmountTimeout?: number;
}

export interface MicroFrontendManifest {
  name: string;
  version: string;
  entry: string;
  styles?: string[];
  scripts?: string[];
  dependencies?: Record<string, string>;
  exposes?: Record<string, string>;
}

export interface MicroFrontend {
  name: string;
  config: MicroFrontendConfig;
  status: MicroFrontendStatus;
  instance?: any;
  manifest?: MicroFrontendManifest;
  error?: string;
  mountProps?: Record<string, any>;

  load(): Promise<void>;
  mount(props?: Record<string, any>): Promise<void>;
  unmount(): Promise<void>;
  update(props?: Record<string, any>): Promise<void>;
  getStatus(): MicroFrontendStatus;
  setError(error: string): void;
  clearError(): void;
}

export interface MicroFrontendLoader {
  load(config: MicroFrontendConfig): Promise<MicroFrontend>;
  get(name: string): MicroFrontend | undefined;
  getAll(): MicroFrontend[];
  remove(name: string): Promise<void>;
  clear(): Promise<void>;
}

export interface MicroFrontendEvent {
  type: string;
  payload: any;
  source: string;
  target?: string;
  timestamp: number;
}

export interface MicroFrontendChannel {
  send(event: MicroFrontendEvent): void;
  on(type: string, handler: (event: MicroFrontendEvent) => void): void;
  off(type: string, handler: (event: MicroFrontendEvent) => void): void;
  clear(): void;
}

export interface MicroFrontendRegistry {
  register(config: MicroFrontendConfig): void;
  unregister(name: string): void;
  get(name: string): MicroFrontendConfig | undefined;
  getAll(): MicroFrontendConfig[];
}

export interface MicroFrontendContext {
  app: any;
  services: Record<string, any>;
  channel: MicroFrontendChannel;
  config: Record<string, any>;
}

export type MicroFrontendLifecycleHook = 
  | 'beforeLoad'
  | 'afterLoad'
  | 'beforeMount'
  | 'afterMount'
  | 'beforeUnmount'
  | 'afterUnmount'
  | 'beforeUpdate'
  | 'afterUpdate'
  | 'error';

export interface MicroFrontendLifecycleEvent {
  name: string;
  microFrontend: MicroFrontend;
  error?: string;
  timestamp: number;
}
