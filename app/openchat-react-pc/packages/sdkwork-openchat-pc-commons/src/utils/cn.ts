/**
 * 绫诲悕鍚堝苟宸ュ叿
 * 
 * 鍩轰簬 clsx 鍜?tailwind-merge 鐨勭被鍚嶅悎骞跺伐鍏? */

import { clsx, type ClassValue } from 'clsx';

/**
 * 鍚堝苟绫诲悕
 * @param inputs - 绫诲悕鏁扮粍
 * @returns 鍚堝苟鍚庣殑绫诲悕瀛楃涓? */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export default cn;

