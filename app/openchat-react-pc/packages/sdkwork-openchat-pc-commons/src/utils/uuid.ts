/**
 * UUID 鐢熸垚宸ュ叿
 *
 * 鑱岃矗锛氭彁渚涚粺涓€鐨?UUID 鐢熸垚鏂规硶
 */

/**
 * 鐢熸垚鏍囧噯 UUID v4
 * 鏍煎紡锛歺xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 鐢熸垚鐭?UUID锛?6浣嶏級
 * 鐢ㄤ簬闇€瑕佽緝鐭?ID 鐨勫満鏅? */
export function generateShortUUID(): string {
  return 'xxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 鐢熸垚鏃堕棿鎴?+ 闅忔満鏁扮殑鍞竴 ID
 * 鏍煎紡锛歵imestamp-random
 */
export function generateTimestampId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 鐢熸垚闅忔満瀛楃涓? * @param length 瀛楃涓查暱搴? * @param chars 鍙€夊瓧绗﹂泦
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

