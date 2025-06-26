import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as fs from 'node:fs';
import path, { basename, extname, join } from 'node:path';
import { logger } from '@elizaos/core';
import { apiKeyAuthMiddleware } from './middleware/auth.js';
import type { ServerOptions, ServerMiddleware } from '../types/server.js';

/**
 * MiddlewareService - Handles all Express middleware configuration
 * Extracted from AgentServer to follow Single Responsibility Principle
 */
export class MiddlewareService {
  
  /**
   * Setup security middleware (Helmet)
   */
  public setupSecurityMiddleware(app: express.Application): void {
    const isProd = process.env.NODE_ENV === 'production';
    logger.debug('Setting up security headers...');
    
    if (!isProd) {
      logger.debug(`NODE_ENV: ${process.env.NODE_ENV}`);
      logger.debug(`CSP will be: ${isProd ? 'ENABLED' : 'MINIMAL_DEV'}`);
    }
    
    app.use(
      helmet({
        // Content Security Policy - environment-aware configuration
        contentSecurityPolicy: isProd
          ? {
              // Production CSP - includes upgrade-insecure-requests
              directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
                fontSrc: ["'self'", 'https:', 'data:'],
                connectSrc: ["'self'", 'ws:', 'wss:', 'https:', 'http:'],
                mediaSrc: ["'self'", 'blob:', 'data:'],
                objectSrc: ["'none'"],
                frameSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                // upgrade-insecure-requests is added by helmet automatically
              },
              useDefaults: true,
            }
          : {
              // Development CSP - minimal policy without upgrade-insecure-requests
              directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'http:'],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
                fontSrc: ["'self'", 'https:', 'http:', 'data:'],
                connectSrc: ["'self'", 'ws:', 'wss:', 'https:', 'http:'],
                mediaSrc: ["'self'", 'blob:', 'data:'],
                objectSrc: ["'none'"],
                frameSrc: ["'self'", 'data:'],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                // Note: upgrade-insecure-requests is intentionally omitted for Safari compatibility
              },
              useDefaults: false,
            },
        // Cross-Origin Embedder Policy - disabled for compatibility
        crossOriginEmbedderPolicy: false,
        // Cross-Origin Resource Policy
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        // Frame Options - allow same-origin iframes to align with frameSrc CSP
        frameguard: { action: 'sameorigin' },
        // Hide Powered-By header
        hidePoweredBy: true,
        // HTTP Strict Transport Security - only in production
        hsts: isProd
          ? {
              maxAge: 31536000, // 1 year
              includeSubDomains: true,
              preload: true,
            }
          : false,
        // No Sniff
        noSniff: true,
        // Referrer Policy
        referrerPolicy: { policy: 'no-referrer-when-downgrade' },
        // X-XSS-Protection
        xssFilter: true,
      })
    );
  }

  /**
   * Setup custom middlewares from options
   */
  public setupCustomMiddlewares(app: express.Application, options?: ServerOptions): void {
    if (options?.middlewares) {
      logger.debug('Applying custom middlewares...');
      for (const middleware of options.middlewares) {
        app.use(middleware);
      }
    }
  }

  /**
   * Setup standard middlewares (CORS, JSON parsing, etc.)
   */
  public setupStandardMiddlewares(app: express.Application): void {
    logger.debug('Setting up standard middlewares...');
    
    // CORS
    app.use(
      cors({
        origin: process.env.CORS_ORIGIN || true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-KEY'],
      })
    );
    
    // JSON body parser
    app.use(
      express.json({
        limit: process.env.EXPRESS_MAX_PAYLOAD || '100kb',
      })
    );
  }

  /**
   * Setup authentication middleware
   */
  public setupAuthMiddleware(app: express.Application): void {
    const serverAuthToken = process.env.ELIZA_SERVER_AUTH_TOKEN;
    if (serverAuthToken) {
      logger.info('Server authentication enabled. Requires X-API-KEY header for /api routes.');
      // Apply middleware only to /api paths
      app.use('/api', (req, res, next) => {
        apiKeyAuthMiddleware(req, res, next);
      });
    } else {
      logger.warn(
        'Server authentication is disabled. Set ELIZA_SERVER_AUTH_TOKEN environment variable to enable.'
      );
    }
  }

  /**
   * Setup media serving routes
   */
  public setupMediaRoutes(app: express.Application): void {
    // Create upload directories
    const uploadsBasePath = path.join(process.cwd(), '.eliza', 'data', 'uploads', 'agents');
    const generatedBasePath = path.join(process.cwd(), '.eliza', 'data', 'generated');
    fs.mkdirSync(uploadsBasePath, { recursive: true });
    fs.mkdirSync(generatedBasePath, { recursive: true });

    // Agent-specific media serving
    this.setupAgentMediaRoute(app, uploadsBasePath);
    this.setupGeneratedMediaRoute(app, generatedBasePath);
    this.setupChannelMediaRoute(app, uploadsBasePath);
  }

  /**
   * Setup content type middleware for static assets
   */
  public setupContentTypeMiddleware(app: express.Application): void {
    app.use((req, res, next) => {
      // Automatically detect and handle static assets based on file extension
      const ext = extname(req.path).toLowerCase();

      // Set correct content type based on file extension
      if (ext === '.js' || ext === '.mjs') {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (ext === '.css') {
        res.setHeader('Content-Type', 'text/css');
      } else if (ext === '.svg') {
        res.setHeader('Content-Type', 'image/svg+xml');
      } else if (ext === '.png') {
        res.setHeader('Content-Type', 'image/png');
      } else if (ext === '.jpg' || ext === '.jpeg') {
        res.setHeader('Content-Type', 'image/jpeg');
      }

      // Continue processing
      next();
    });
  }

  /**
   * Setup static file serving
   */
  public setupStaticFileServing(app: express.Application, clientPath: string): void {
    const staticOptions = {
      etag: true,
      lastModified: true,
      setHeaders: (res: express.Response, filePath: string) => {
        // Set the correct content type for different file extensions
        const ext = extname(filePath).toLowerCase();
        if (ext === '.css') {
          res.setHeader('Content-Type', 'text/css');
        } else if (ext === '.js') {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (ext === '.html') {
          res.setHeader('Content-Type', 'text/html');
        } else if (ext === '.png') {
          res.setHeader('Content-Type', 'image/png');
        } else if (ext === '.jpg' || ext === '.jpeg') {
          res.setHeader('Content-Type', 'image/jpeg');
        } else if (ext === '.svg') {
          res.setHeader('Content-Type', 'image/svg+xml');
        }
      },
    };

    app.use(express.static(clientPath, staticOptions));
  }

  /**
   * Add a single middleware to the pipeline
   */
  public addMiddleware(app: express.Application, middleware: ServerMiddleware): void {
    app.use(middleware);
  }

  // ===============================
  // Private Helper Methods
  // ===============================

  private setupAgentMediaRoute(app: express.Application, uploadsBasePath: string): void {
    app.get(
      '/media/uploads/agents/:agentId/:filename',
      // @ts-expect-error - this is a valid express route
      (req: express.Request, res: express.Response) => {
        const agentId = req.params.agentId as string;
        const filename = req.params.filename as string;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        if (!uuidRegex.test(agentId)) {
          return res.status(400).json({ error: 'Invalid agent ID format' });
        }
        
        const sanitizedFilename = basename(filename);
        const agentUploadsPath = join(uploadsBasePath, agentId);
        const filePath = join(agentUploadsPath, sanitizedFilename);
        
        if (!filePath.startsWith(agentUploadsPath)) {
          return res.status(403).json({ error: 'Access denied' });
        }

        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: 'File does not exist!!!!!!!' });
        }

        res.sendFile(sanitizedFilename, { root: agentUploadsPath }, (err) => {
          if (err) {
            if (err.message === 'Request aborted') {
              logger.warn(`[MEDIA] Download aborted: ${req.originalUrl}`);
            } else if (!res.headersSent) {
              logger.warn(`[MEDIA] File not found: ${agentUploadsPath}/${sanitizedFilename}`);
              res.status(404).json({ error: 'File not found' });
            }
          } else {
            logger.debug(`[MEDIA] Successfully served: ${sanitizedFilename}`);
          }
        });
      }
    );
  }

  private setupGeneratedMediaRoute(app: express.Application, generatedBasePath: string): void {
    app.get(
      '/media/generated/:agentId/:filename',
      // @ts-expect-error - this is a valid express route
      (req: express.Request<{ agentId: string; filename: string }>, res: express.Response) => {
        const agentId = req.params.agentId;
        const filename = req.params.filename;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        if (!uuidRegex.test(agentId)) {
          return res.status(400).json({ error: 'Invalid agent ID format' });
        }
        
        const sanitizedFilename = basename(filename);
        const agentGeneratedPath = join(generatedBasePath, agentId);
        const filePath = join(agentGeneratedPath, sanitizedFilename);
        
        if (!filePath.startsWith(agentGeneratedPath)) {
          return res.status(403).json({ error: 'Access denied' });
        }
        
        res.sendFile(filePath, (err) => {
          if (err) {
            res.status(404).json({ error: 'File not found' });
          }
        });
      }
    );
  }

  private setupChannelMediaRoute(app: express.Application, uploadsBasePath: string): void {
    app.get(
      '/media/uploads/channels/:channelId/:filename',
      (req: express.Request<{ channelId: string; filename: string }>, res: express.Response) => {
        const channelId = req.params.channelId as string;
        const filename = req.params.filename as string;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(channelId)) {
          res.status(400).json({ error: 'Invalid channel ID format' });
          return;
        }

        const sanitizedFilename = basename(filename);
        const channelUploadsPath = join(uploadsBasePath, 'channels', channelId);
        const filePath = join(channelUploadsPath, sanitizedFilename);

        if (!filePath.startsWith(channelUploadsPath)) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }

        res.sendFile(filePath, (err) => {
          if (err) {
            logger.warn(`[STATIC] Channel media file not found: ${filePath}`, err);
            if (!res.headersSent) {
              res.status(404).json({ error: 'File not found' });
            }
          } else {
            logger.debug(`[STATIC] Served channel media file: ${filePath}`);
          }
        });
      }
    );
  }
}