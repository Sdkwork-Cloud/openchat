
import { Toast } from '../components/Toast';
import { Platform } from '../platform';

interface RequestConfig extends RequestInit {
    timeout?: number;
    params?: Record<string, string | number | boolean>;
    skipErrorHandle?: boolean;
}

interface ApiResponse<T = any> {
    code: number;
    message: string;
    data: T;
    success: boolean;
}

class HttpClient {
    private baseURL: string;
    private defaultTimeout: number = 10000;

    constructor(baseURL: string = '') {
        this.baseURL = baseURL;
    }

    private async request<T>(url: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
        const { timeout = this.defaultTimeout, params, skipErrorHandle, ...options } = config;
        
        let fullUrl = this.baseURL + url;
        if (params) {
            const queryString = new URLSearchParams(
                Object.entries(params).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {})
            ).toString();
            fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
        }

        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        // Inject Auth Token
        const token = await Platform.storage.get('sys_auth_token');
        const headers = new Headers(options.headers);
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
            headers.set('Content-Type', 'application/json');
        }

        try {
            const response = await fetch(fullUrl, {
                ...options,
                headers,
                signal: controller.signal
            });
            clearTimeout(id);

            // Handle HTTP Errors
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorBody}`);
            }

            // Handle Logic Errors (Assuming standard JSON envelope)
            // For demo, we assume success if HTTP is OK, but real apps check code === 200
            const data = await response.json();
            
            // Transform to Standard Result
            const result: ApiResponse<T> = {
                code: data.code || 200,
                message: data.message || 'Success',
                data: data.data !== undefined ? data.data : data, // Fallback if no data wrapper
                success: true
            };

            return result;

        } catch (error: any) {
            clearTimeout(id);
            const msg = error.name === 'AbortError' ? '请求超时' : (error.message || '网络连接异常');
            
            if (!skipErrorHandle) {
                Toast.error(msg);
            }

            console.error(`[Net] Request Failed: ${url}`, error);
            
            return {
                code: 500,
                message: msg,
                data: null as any,
                success: false
            };
        }
    }

    public get<T>(url: string, params?: Record<string, any>, config?: RequestConfig) {
        return this.request<T>(url, { ...config, method: 'GET', params });
    }

    public post<T>(url: string, data?: any, config?: RequestConfig) {
        return this.request<T>(url, { ...config, method: 'POST', body: JSON.stringify(data) });
    }

    public put<T>(url: string, data?: any, config?: RequestConfig) {
        return this.request<T>(url, { ...config, method: 'PUT', body: JSON.stringify(data) });
    }

    public delete<T>(url: string, config?: RequestConfig) {
        return this.request<T>(url, { ...config, method: 'DELETE' });
    }
    
    public upload<T>(url: string, file: File, fieldName = 'file', config?: RequestConfig) {
        const formData = new FormData();
        formData.append(fieldName, file);
        return this.request<T>(url, { ...config, method: 'POST', body: formData });
    }
}

// Singleton Instance
export const Http = new HttpClient(process.env.API_BASE_URL || '');
