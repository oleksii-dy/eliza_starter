/**
 * Server-related types and interfaces
 */

import { type Request, type Response, type NextFunction } from 'express';

export type ServerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void;

export interface ServerOptions {
  middlewares?: ServerMiddleware[];
  dataDir?: string;
  postgresUrl?: string;
}

export interface ServerFactoryOptions {
  /**
   * Database data directory (for PGLite)
   */
  dataDir?: string;
  
  /**
   * PostgreSQL connection URL (takes precedence over PGLite)
   */
  postgresUrl?: string;
  
  /**
   * Server port (defaults to 3000). If port is busy, will automatically find next available port.
   */
  port?: number;
  
  /**
   * Custom Express middlewares
   */
  middlewares?: ServerMiddleware[];
  
  /**
   * Host to bind to (defaults to 0.0.0.0)
   */
  host?: string;
  
  /**
   * Environment-specific settings
   */
  env?: 'development' | 'production' | 'test';
  
  /**
   * Interactive database configuration (for Custom use)
   */
  configure?: boolean;
  
  /**
   * External database configuration function (for Custom advanced setup)
   */
  configureDatabaseFn?: (configure?: boolean) => Promise<string | null>;
  
  /**
   * External data directory resolution function (for Custom advanced setup)
   */
  resolveDataDirFn?: () => Promise<string>;
}