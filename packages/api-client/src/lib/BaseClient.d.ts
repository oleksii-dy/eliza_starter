import { ApiClientConfig, RequestConfig } from '../types/base';
export declare class ApiError extends Error {
    code: string;
    details?: string | undefined;
    status?: number | undefined;
    constructor(code: string, message: string, details?: string | undefined, status?: number | undefined);
}
export declare abstract class BaseApiClient {
    protected baseUrl: string;
    protected apiKey?: string;
    protected timeout: number;
    protected defaultHeaders: Record<string, string>;
    constructor(config: ApiClientConfig);
    protected request<T>(method: string, path: string, options?: {
        body?: any;
        params?: Record<string, any>;
        headers?: Record<string, string>;
        config?: RequestConfig;
    }): Promise<T>;
    protected get<T>(path: string, options?: Omit<Parameters<typeof this.request>[2], 'body'>): Promise<T>;
    protected post<T>(path: string, body?: any, options?: Parameters<typeof this.request>[2]): Promise<T>;
    protected put<T>(path: string, body?: any, options?: Parameters<typeof this.request>[2]): Promise<T>;
    protected patch<T>(path: string, body?: any, options?: Parameters<typeof this.request>[2]): Promise<T>;
    protected delete<T>(path: string, options?: Omit<Parameters<typeof this.request>[2], 'body'>): Promise<T>;
}
