/**
 * 类名合并工具
 * 
 * 基于 clsx 和 tailwind-merge 的类名合并工具
 */

import { clsx, type ClassValue } from 'clsx';

/**
 * 合并类名
 * @param inputs - 类名数组
 * @returns 合并后的类名字符串
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export default cn;
