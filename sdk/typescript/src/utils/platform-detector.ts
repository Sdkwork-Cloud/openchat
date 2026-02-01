/**
 * 平台检测工具
 * 用于检测当前运行环境（浏览器、Node.js、小程序等）
 */

export enum Platform {
  BROWSER = 'browser',
  NODE = 'node',
  WECHAT = 'wechat',
  ALIPAY = 'alipay',
  BAIDU = 'baidu',
  BYTEDANCE = 'bytedance',
  UNKNOWN = 'unknown'
}

/**
 * 检测当前平台
 */
export function detectPlatform(): Platform {
  // 检测微信小程序
  if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
    return Platform.WECHAT;
  }

  // 检测支付宝小程序
  if (typeof my !== 'undefined' && my.getSystemInfoSync) {
    return Platform.ALIPAY;
  }

  // 检测百度小程序
  if (typeof swan !== 'undefined' && swan.getSystemInfoSync) {
    return Platform.BAIDU;
  }

  // 检测字节跳动小程序
  if (typeof tt !== 'undefined' && tt.getSystemInfoSync) {
    return Platform.BYTEDANCE;
  }

  // 检测Node.js环境
  try {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      return Platform.NODE;
    }
  } catch (error) {
    // 忽略process未定义的错误
  }

  // 检测浏览器环境
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return Platform.BROWSER;
  }

  return Platform.UNKNOWN;
}

/**
 * 是否在浏览器环境
 */
export function isBrowser(): boolean {
  return detectPlatform() === Platform.BROWSER;
}

/**
 * 是否在Node.js环境
 */
export function isNode(): boolean {
  return detectPlatform() === Platform.NODE;
}

/**
 * 是否在小程序环境
 */
export function isMiniProgram(): boolean {
  const platform = detectPlatform();
  return [
    Platform.WECHAT,
    Platform.ALIPAY,
    Platform.BAIDU,
    Platform.BYTEDANCE
  ].includes(platform);
}

/**
 * 是否在微信小程序
 */
export function isWeChat(): boolean {
  return detectPlatform() === Platform.WECHAT;
}

/**
 * 是否在支付宝小程序
 */
export function isAlipay(): boolean {
  return detectPlatform() === Platform.ALIPAY;
}

/**
 * 是否在百度小程序
 */
export function isBaidu(): boolean {
  return detectPlatform() === Platform.BAIDU;
}

/**
 * 是否在字节跳动小程序
 */
export function isByteDance(): boolean {
  return detectPlatform() === Platform.BYTEDANCE;
}

/**
 * 获取平台特定的全局对象
 */
export function getGlobalObject(): any {
  const platform = detectPlatform();

  switch (platform) {
    case Platform.WECHAT:
      return wx;
    case Platform.ALIPAY:
      return my;
    case Platform.BAIDU:
      return swan;
    case Platform.BYTEDANCE:
      return tt;
    case Platform.BROWSER:
      return window;
    case Platform.NODE:
      return global;
    default:
      return {};
  }
}

/**
 * 获取平台名称
 */
export function getPlatformName(): string {
  return detectPlatform();
}
