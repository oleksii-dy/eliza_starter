export class ApiError extends Error {
    code;
    details;
    status;
    constructor(code, message, details, status) {
        super(message);
        this.code = code;
        this.details = details;
        this.status = status;
        this.name = 'ApiError';
    }
}
export class BaseApiClient {
    baseUrl;
    apiKey;
    timeout;
    defaultHeaders;
    constructor(config) {
        this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.apiKey = config.apiKey;
        this.timeout = config.timeout || 30000; // 30 seconds default
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            ...config.headers,
        };
        if (this.apiKey) {
            this.defaultHeaders['X-API-KEY'] = this.apiKey;
        }
    }
    async request(method, path, options) {
        // Handle empty baseUrl for relative URLs
        let url;
        if (this.baseUrl) {
            url = new URL(`${this.baseUrl}${path}`);
        }
        else if (typeof window !== 'undefined' && window.location) {
            url = new URL(path, window.location.origin);
        }
        else {
            // Fallback for non-browser environments
            url = new URL(path, 'http://localhost:3000');
        }
        // Add query parameters
        if (options?.params) {
            Object.entries(options.params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, String(value));
                }
            });
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const headers = {
                ...this.defaultHeaders,
                ...options?.config?.headers,
                ...options?.headers,
            };
            // Remove Content-Type header if body is FormData
            if (options?.body instanceof FormData) {
                delete headers['Content-Type'];
            }
            const response = await fetch(url.toString(), {
                method,
                headers,
                body: options?.body instanceof FormData
                    ? options.body
                    : options?.body
                        ? JSON.stringify(options.body)
                        : undefined,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const data = (await response.json());
            if (!response.ok || !data.success) {
                const error = 'error' in data
                    ? data.error
                    : {
                        code: 'UNKNOWN_ERROR',
                        message: 'An unknown error occurred',
                    };
                throw new ApiError(error.code, error.message, error.details, response.status);
            }
            return data.data;
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof ApiError) {
                throw error;
            }
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new ApiError('TIMEOUT', 'Request timed out');
                }
                throw new ApiError('NETWORK_ERROR', error.message);
            }
            throw new ApiError('UNKNOWN_ERROR', 'An unknown error occurred');
        }
    }
    async get(path, options) {
        return this.request('GET', path, options);
    }
    async post(path, body, options) {
        return this.request('POST', path, { ...options, body });
    }
    async put(path, body, options) {
        return this.request('PUT', path, { ...options, body });
    }
    async patch(path, body, options) {
        return this.request('PATCH', path, { ...options, body });
    }
    async delete(path, options) {
        return this.request('DELETE', path, options);
    }
}
