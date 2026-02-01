/**
 * 测试环境初始化
 * 
 * 职责：配置测试全局设置和 mock
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ==================== 全局 Mock ====================

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock URL.createObjectURL / revokeObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(window.URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

// ==================== 测试工具函数 ====================

/**
 * 创建测试用的 Platform Mock
 */
export function createMockPlatform() {
  return {
    getPlatform: vi.fn().mockReturnValue('web'),
    getDeviceId: vi.fn().mockResolvedValue('test-device-id'),
    setStorage: vi.fn().mockResolvedValue(undefined),
    getStorage: vi.fn().mockResolvedValue(null),
    removeStorage: vi.fn().mockResolvedValue(undefined),
    copy: vi.fn().mockResolvedValue(undefined),
    readClipboard: vi.fn().mockResolvedValue(''),
    openExternal: vi.fn().mockResolvedValue(undefined),
    selectFile: vi.fn().mockResolvedValue([]),
    saveFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn().mockResolvedValue(undefined),
    minimizeWindow: vi.fn().mockResolvedValue(undefined),
    maximizeWindow: vi.fn().mockResolvedValue(undefined),
    closeWindow: vi.fn().mockResolvedValue(undefined),
    setFullscreen: vi.fn().mockResolvedValue(undefined),
    createPty: vi.fn().mockResolvedValue(undefined),
    writePty: vi.fn().mockResolvedValue(undefined),
    resizePty: vi.fn().mockResolvedValue(undefined),
    destroyPty: vi.fn().mockResolvedValue(undefined),
    onPtyData: vi.fn().mockReturnValue(() => {}),
    showNotification: vi.fn().mockResolvedValue(undefined),
    isOnline: vi.fn().mockReturnValue(true),
    onNetworkChange: vi.fn().mockReturnValue(() => {}),
  };
}

// ==================== 全局清理 ====================

afterEach(() => {
  vi.clearAllMocks();
});
