/**
 * UUID 生成工具
 *
 * 职责：提供统一的 UUID 生成方法
 */

/**
 * 生成标准 UUID v4
 * 格式：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 生成短 UUID（16位）
 * 用于需要较短 ID 的场景
 */
export function generateShortUUID(): string {
  return 'xxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 生成时间戳 + 随机数的唯一 ID
 * 格式：timestamp-random
 */
export function generateTimestampId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成随机字符串
 * @param length 字符串长度
 * @param chars 可选字符集
 */
export function generateRandomString(
  length: number = 16,
  chars: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
