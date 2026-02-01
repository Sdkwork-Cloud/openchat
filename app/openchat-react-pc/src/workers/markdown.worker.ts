/**
 * Markdown 解析 Web Worker
 *
 * 职责：在后台线程解析 Markdown，避免阻塞主线程
 */

import { marked } from 'marked';
import DOMPurify from 'dompurify';

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: false,
  mangle: false,
});

// 配置 DOMPurify（在 worker 中使用简化版）
const purifyConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'code', 'pre', 'blockquote',
    'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'del', 'ins', 'sup', 'sub', 'hr'
  ],
  ALLOWED_ATTR: ['href', 'title', 'src', 'alt', 'class'],
  ALLOW_DATA_ATTR: false,
};

/**
 * 解析 Markdown
 */
function parseMarkdown(content: string): string {
  try {
    // 解析 markdown
    const rawHtml = marked.parse(content) as string;
    
    // 清理 HTML（防止 XSS）
    // 注意：在 worker 中 DOMPurify 需要特殊处理
    // 这里使用简化版的清理逻辑
    const cleanHtml = sanitizeHtml(rawHtml);
    
    return cleanHtml;
  } catch (error) {
    console.error('Markdown parsing error:', error);
    return content;
  }
}

/**
 * 简化版 HTML 清理
 */
function sanitizeHtml(html: string): string {
  // 移除危险标签和属性
  return html
    // 移除 script 标签
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // 移除 on* 事件属性
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
    // 移除 javascript: 协议
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
    // 移除 data: 协议的链接（除了图片）
    .replace(/(?!src\s*=\s*["']data:image)\s+src\s*=\s*["']data:[^"']*["']/gi, '');
}

/**
 * 分块解析长文本
 */
function parseChunks(content: string, chunkSize: number = 5000): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  const lines = content.split('\n');
  
  for (const line of lines) {
    if ((currentChunk + line).length > chunkSize && currentChunk.length > 0) {
      chunks.push(parseMarkdown(currentChunk));
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(parseMarkdown(currentChunk));
  }
  
  return chunks;
}

// Worker 消息处理
self.onmessage = (event: MessageEvent) => {
  const { id, content, type = 'full' } = event.data;
  
  try {
    let result: string | string[];
    
    if (type === 'chunks' && content.length > 10000) {
      // 长文本分块解析
      result = parseChunks(content);
    } else {
      // 普通解析
      result = parseMarkdown(content);
    }
    
    self.postMessage({
      id,
      result,
      success: true,
    });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    });
  }
};

// 类型声明
export type MarkdownWorkerRequest = {
  id: string;
  content: string;
  type?: 'full' | 'chunks';
};

export type MarkdownWorkerResponse = {
  id: string;
  result?: string | string[];
  error?: string;
  success: boolean;
};
