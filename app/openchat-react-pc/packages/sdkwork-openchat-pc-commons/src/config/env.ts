/**
 * 鐜鍙橀噺閰嶇疆
 * 
 * 瀹氫箟搴旂敤杩愯鎵€闇€鐨勭幆澧冨彉閲? * 鏀寔澶氱幆澧冿細development, test, production
 */

// ============================================
// 搴旂敤淇℃伅
// ============================================

// 搴旂敤鍚嶇О
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'OpenChat';

// 搴旂敤鐗堟湰
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

// ============================================
// 鐜鍒ゆ柇
// ============================================

// 鏄惁寮€鍙戠幆澧?export const IS_DEV = import.meta.env.DEV;

// 鏄惁鐢熶骇鐜
export const IS_PROD = import.meta.env.PROD;

// 褰撳墠鐜妯″紡 (development, test, production)
export const MODE = import.meta.env.MODE;

// ============================================
// 璋冭瘯閰嶇疆
// ============================================

// 璋冭瘯妯″紡
export const DEBUG = import.meta.env.VITE_DEBUG === 'true' || IS_DEV;

// 鏃ュ織绾у埆 (debug, info, warn, error)
export const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || (IS_DEV ? 'debug' : 'error');

// ============================================
// 鏈嶅姟绔偣閰嶇疆
// ============================================

// OpenChat Server API 鍦板潃 (SDK 鎺ュ叆浼樺厛浣跨敤 VITE_API_BASE_URL锛屽吋瀹规棫鍙橀噺)
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_APP_API_BASE_URL ||
  'http://localhost:3000';

// 鎮熺┖IM WebSocket 鍦板潃 (浼樺厛鏂板彉閲�)
export const IM_WS_URL =
  import.meta.env.VITE_IM_WS_URL ||
  import.meta.env.VITE_APP_IM_WS_URL ||
  'ws://localhost:3000/ws';

// SDK 搴旂敤绾� Access Token
export const SDK_ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN || "";

// ============================================
// RTC 閰嶇疆
// ============================================

export const RTC_CONFIG = {
  appId: import.meta.env.VITE_RTC_APP_ID || '',
  provider: import.meta.env.VITE_RTC_PROVIDER || 'volcengine',
};

// ============================================
// 鐜淇℃伅杈撳嚭 (寮€鍙戠幆澧?
// ============================================

if (IS_DEV || DEBUG) {
  console.log('[Env] ========================================');
  console.log('[Env] APP_NAME:', APP_NAME);
  console.log('[Env] APP_VERSION:', APP_VERSION);
  console.log('[Env] MODE:', MODE);
  console.log('[Env] IS_DEV:', IS_DEV);
  console.log('[Env] IS_PROD:', IS_PROD);
  console.log('[Env] DEBUG:', DEBUG);
  console.log('[Env] LOG_LEVEL:', LOG_LEVEL);
  console.log('[Env] API_BASE_URL:', API_BASE_URL);
  console.log('[Env] IM_WS_URL:', IM_WS_URL);
  console.log('[Env] RTC_PROVIDER:', RTC_CONFIG.provider);
  console.log('[Env] ========================================');
}

