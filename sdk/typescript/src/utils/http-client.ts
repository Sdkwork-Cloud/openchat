/**
 * HTTP客户端抽象层
 * 支持浏览器、Node.js、小程序等多种环境的HTTP请求
 */

import { detectPlatform, Platform, getGlobalObject } from './platform-detector';

export interface HttpRequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: any;
  params?: Record<string, any>;
  timeout?: number;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export type HttpClient = <T = any>(config: HttpRequestConfig) => Promise<HttpResponse<T>>;

/**
 * 创建平台特定的HTTP客户端
 */
export function createHttpClient(): HttpClient {
  const platform = detectPlatform();

  switch (platform) {
    case Platform.WECHAT:
      return createWeChatHttpClient();
    case Platform.ALIPAY:
      return createAlipayHttpClient();
    case Platform.BAIDU:
      return createBaiduHttpClient();
    case Platform.BYTEDANCE:
      return createByteDanceHttpClient();
    case Platform.NODE:
      return createNodeHttpClient();
    case Platform.BROWSER:
    default:
      return createBrowserHttpClient();
  }
}

/**
 * 浏览器环境HTTP客户端（使用fetch）
 */
function createBrowserHttpClient(): HttpClient {
  return async <T>(config: HttpRequestConfig): Promise<HttpResponse<T>> => {
    const { url, method = 'GET', headers = {}, data, params } = config;

    // 构建URL（处理查询参数）
    let fullUrl = url;
    if (params) {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');
      fullUrl += (url.includes('?') ? '&' : '?') + queryString;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data && method !== 'GET') {
      fetchOptions.body = typeof data === 'string' ? data : JSON.stringify(data);
    }

    const response = await fetch(fullUrl, fetchOptions);
    const responseData = await response.json();

    // 获取响应头
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    };
  };
}

/**
 * Node.js环境HTTP客户端
 */
function createNodeHttpClient(): HttpClient {
  return async <T>(config: HttpRequestConfig): Promise<HttpResponse<T>> => {
    // 在Node.js环境中动态导入http/https模块
    const http = await import('http');
    const https = await import('https');
    const { URL } = await import('url');

    return new Promise((resolve, reject) => {
      const { url, method = 'GET', headers = {}, data, params } = config;

      // 构建URL
      let fullUrl = url;
      if (params) {
        const queryString = Object.entries(params)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
          .join('&');
        fullUrl += (url.includes('?') ? '&' : '?') + queryString;
      }

      const parsedUrl = new URL(fullUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const req = client.request(requestOptions, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = JSON.parse(responseData);
            resolve({
              data: parsedData,
              status: res.statusCode || 200,
              statusText: res.statusMessage || 'OK',
              headers: res.headers as Record<string, string>
            });
          } catch (error) {
            reject(new Error('Failed to parse response JSON'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data && method !== 'GET') {
        req.write(typeof data === 'string' ? data : JSON.stringify(data));
      }

      req.end();
    });
  };
}

/**
 * 微信小程序HTTP客户端
 */
function createWeChatHttpClient(): HttpClient {
  return <T>(config: HttpRequestConfig): Promise<HttpResponse<T>> => {
    return new Promise((resolve, reject) => {
      const wx = getGlobalObject();

      wx.request({
        url: config.url,
        method: config.method || 'GET',
        header: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        data: config.data,
        timeout: config.timeout || 30000,
        success: (res: any) => {
          resolve({
            data: res.data,
            status: res.statusCode,
            statusText: '',
            headers: res.header || {}
          });
        },
        fail: (err: any) => {
          reject(new Error(err.errMsg || 'Request failed'));
        }
      });
    });
  };
}

/**
 * 支付宝小程序HTTP客户端
 */
function createAlipayHttpClient(): HttpClient {
  return <T>(config: HttpRequestConfig): Promise<HttpResponse<T>> => {
    return new Promise((resolve, reject) => {
      const my = getGlobalObject();

      my.request({
        url: config.url,
        method: config.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        data: config.data,
        timeout: config.timeout || 30000,
        success: (res: any) => {
          resolve({
            data: res.data,
            status: res.status,
            statusText: '',
            headers: res.headers || {}
          });
        },
        fail: (err: any) => {
          reject(new Error(err.errorMessage || 'Request failed'));
        }
      });
    });
  };
}

/**
 * 百度小程序HTTP客户端
 */
function createBaiduHttpClient(): HttpClient {
  return <T>(config: HttpRequestConfig): Promise<HttpResponse<T>> => {
    return new Promise((resolve, reject) => {
      const swan = getGlobalObject();

      swan.request({
        url: config.url,
        method: config.method || 'GET',
        header: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        data: config.data,
        success: (res: any) => {
          resolve({
            data: res.data,
            status: res.statusCode,
            statusText: '',
            headers: res.header || {}
          });
        },
        fail: (err: any) => {
          reject(new Error(err.errMsg || 'Request failed'));
        }
      });
    });
  };
}

/**
 * 字节跳动小程序HTTP客户端
 */
function createByteDanceHttpClient(): HttpClient {
  return <T>(config: HttpRequestConfig): Promise<HttpResponse<T>> => {
    return new Promise((resolve, reject) => {
      const tt = getGlobalObject();

      tt.request({
        url: config.url,
        method: config.method || 'GET',
        header: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        data: config.data,
        success: (res: any) => {
          resolve({
            data: res.data,
            status: res.statusCode,
            statusText: '',
            headers: res.header || {}
          });
        },
        fail: (err: any) => {
          reject(new Error(err.errMsg || 'Request failed'));
        }
      });
    });
  };
}
