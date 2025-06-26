/**
 * HTTP and Route type definitions for ElizaOS
 *
 * This module provides type-safe definitions for HTTP requests, responses,
 * and route handlers to replace usage of 'any' types.
 */

import type { IAgentRuntime } from './runtime';

/**
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * HTTP headers interface
 */
export interface HttpHeaders {
  [key: string]: string | string[] | undefined;
}

/**
 * HTTP query parameters
 */
export interface QueryParams {
  [key: string]: string | string[] | undefined;
}

/**
 * HTTP request body types
 */
export type RequestBody =
  | string
  | Buffer
  | Record<string, unknown>
  | Array<unknown>
  | FormData
  | null;

/**
 * File upload interface
 */
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

/**
 * Type-safe HTTP request interface
 */
export interface TypedRequest {
  method: HttpMethod;
  url: string;
  path: string;
  query: QueryParams;
  params: Record<string, string>;
  headers: HttpHeaders;
  body: RequestBody;
  files?: UploadedFile[];
  ip: string;
  userAgent?: string;

  // Express.js specific
  get(headerName: string): string | undefined;
  header(headerName: string): string | undefined;
  is(type: string): string | false | null;
}

/**
 * Type-safe HTTP response interface
 */
export interface TypedResponse {
  statusCode: number;

  // Methods
  status(code: number): TypedResponse;
  json(body: unknown): TypedResponse;
  send(body: string | Buffer | object): TypedResponse;
  end(chunk?: string | Buffer): TypedResponse;
  redirect(url: string): TypedResponse;
  redirect(status: number, url: string): TypedResponse;
  cookie(name: string, value: string, options?: CookieOptions): TypedResponse;
  clearCookie(name: string, options?: CookieOptions): TypedResponse;
  setHeader(name: string, value: string | string[]): TypedResponse;
  getHeader(name: string): string | string[] | number | undefined;
  removeHeader(name: string): TypedResponse;

  // Properties
  headersSent: boolean;
  locals: Record<string, unknown>;
}

/**
 * Cookie options interface
 */
export interface CookieOptions {
  maxAge?: number;
  signed?: boolean;
  expires?: Date;
  httpOnly?: boolean;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
}

/**
 * Route handler function type
 */
export type RouteHandler = (
  req: TypedRequest,
  res: TypedResponse,
  runtime: IAgentRuntime
) => Promise<void> | void;

/**
 * Error handler function type
 */
export type ErrorHandler = (
  error: Error,
  req: TypedRequest,
  res: TypedResponse,
  runtime: IAgentRuntime
) => Promise<void> | void;

/**
 * Middleware function type
 */
export type MiddlewareHandler = (
  req: TypedRequest,
  res: TypedResponse,
  next: () => void
) => Promise<void> | void;

/**
 * Route definition interface
 */
export interface Route {
  type: HttpMethod | 'STATIC';
  path: string;
  filePath?: string;
  public?: boolean;
  name?: string;
  handler?: RouteHandler;
  errorHandler?: ErrorHandler;
  middleware?: MiddlewareHandler[];
  isMultipart?: boolean;
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  auth?: {
    required: boolean;
    roles?: string[];
  };
  validation?: {
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
    params?: Record<string, unknown>;
  };
}

/**
 * API response wrapper types
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}

/**
 * Pagination interface
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Type-safe response helpers
 */
export class ResponseHelper {
  static success<T>(res: TypedResponse, data: T, metadata?: Record<string, unknown>): void {
    res.status(200).json({
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    } as ApiResponse<T>);
  }

  static error(
    res: TypedResponse,
    statusCode: number,
    errorCode: string,
    message: string,
    details?: unknown
  ): void {
    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message,
        details,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse);
  }

  static notFound(res: TypedResponse, resource: string, identifier?: string): void {
    this.error(
      res,
      404,
      'RESOURCE_NOT_FOUND',
      identifier ? `${resource} not found: ${identifier}` : `${resource} not found`
    );
  }

  static badRequest(res: TypedResponse, message: string, details?: unknown): void {
    this.error(res, 400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(res: TypedResponse, message = 'Unauthorized'): void {
    this.error(res, 401, 'UNAUTHORIZED', message);
  }

  static forbidden(res: TypedResponse, message = 'Forbidden'): void {
    this.error(res, 403, 'FORBIDDEN', message);
  }

  static internalError(res: TypedResponse, message = 'Internal server error'): void {
    this.error(res, 500, 'INTERNAL_ERROR', message);
  }

  static paginated<T>(
    res: TypedResponse,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
    }
  ): void {
    const totalPages = Math.ceil(pagination.total / pagination.limit);

    res.status(200).json({
      success: true,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    } as PaginatedResponse<T>);
  }
}

/**
 * Request validation helpers
 */
export class RequestValidator {
  static validateQuery(_req: TypedRequest, _schema: Record<string, unknown>): void {
    // Implementation would use the validation system
    // This is a placeholder for the actual validation logic
  }

  static validateBody(_req: TypedRequest, _schema: Record<string, unknown>): void {
    // Implementation would use the validation system
    // This is a placeholder for the actual validation logic
  }

  static validateParams(_req: TypedRequest, _schema: Record<string, unknown>): void {
    // Implementation would use the validation system
    // This is a placeholder for the actual validation logic
  }

  static requireAuth(req: TypedRequest): void {
    const authHeader = req.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }
  }

  static extractBearerToken(req: TypedRequest): string | null {
    const authHeader = req.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  static extractApiKey(req: TypedRequest): string | null {
    return req.get('x-api-key') || null;
  }
}
