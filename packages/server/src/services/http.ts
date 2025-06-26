import express, { Request, Response } from 'express';
import http from 'node:http';
import { logger, type UUID, type IAgentRuntime } from '@elizaos/core';
import { Server as SocketIOServer } from 'socket.io';
import { createApiRouter, createPluginRouteHandler, setupSocketIO } from '../api/index.js';
import type { Server } from '../server/server.js';

/**
 * HttpService - Handles HTTP server initialization, routing, and lifecycle
 * Extracted from AgentServer to follow Single Responsibility Principle
 */
export class HttpService {
  private server!: http.Server;
  private socketIO!: SocketIOServer;

  constructor(
    private app: express.Application,
    private agents: Map<UUID, IAgentRuntime>
  ) {}

  /**
   * Initialize HTTP server and Socket.IO
   */
  public initializeServer(serverInstance: Server): void {
    // Create HTTP server for Socket.io
    this.server = http.createServer(this.app);

    // Initialize Socket.io, passing the Server instance
    this.socketIO = setupSocketIO(this.server, this.agents, serverInstance);

    logger.success('HttpService HTTP server and Socket.IO initialized');
  }

  /**
   * Setup API routes
   */
  public setupApiRoutes(serverInstance: Server): void {
    // Mount the plugin route handler BEFORE static serving
    const pluginRouteHandler = createPluginRouteHandler(this.agents);
    this.app.use(pluginRouteHandler);

    // Mount the core API router under /api
    const apiRouter = createApiRouter(this.agents, serverInstance);
    this.app.use(
      '/api',
      (req: express.Request, _res: express.Response, next: express.NextFunction) => {
        if (req.path !== '/ping') {
          logger.debug(`API request: ${req.method} ${req.path}`);
        }
        next();
      },
      apiRouter,
      (err: any, req: Request, res: Response, _next: express.NextFunction) => {
        logger.error(`API error: ${req.method} ${req.path}`, err);
        res.status(500).json({
          success: false,
          error: {
            message: err.message || 'Internal Server Error',
            code: err.code || 500,
          },
        });
      }
    );
  }

  /**
   * Setup fallback routes
   */
  public setupFallbackRoutes(): void {
    // Add a catch-all route for API 404s
    this.app.use((req, res, next) => {
      // Check if this is an API route that wasn't handled
      if (req.path.startsWith('/api/')) {
        res.status(404).json({
          success: false,
          error: {
            message: 'API endpoint not found',
            code: 404,
          },
        });
      } else {
        // Not an API route, continue to next middleware
        next();
      }
    });

    // Main fallback for the SPA - must be registered after all other routes
    (this.app as any).use((req: express.Request, res: express.Response) => {
      // For JavaScript requests that weren't handled by static middleware,
      // return a JavaScript response instead of HTML
      if (
        req.path.endsWith('.js') ||
        req.path.includes('.js?') ||
        req.path.match(/\/[a-zA-Z0-9_-]+-[A-Za-z0-9]{8}\.js/)
      ) {
        res.setHeader('Content-Type', 'application/javascript');
        return res.status(404).send(`// JavaScript module not found: ${req.path}`);
      }

      // For all other routes, return API info instead of serving CLI files
      // This removes the dependency on CLI package
      res.status(200).json({
        message: 'ElizaOS Server API',
        version: '1.0.0',
        endpoints: {
          api: '/api',
          agents: '/api/agents',
          health: '/api/health'
        },
        documentation: 'https://github.com/elizaOS/eliza'
      });
    });
  }

  /**
   * Start the server
   */
  public start(port: number): void {
    if (!port || typeof port !== 'number') {
      throw new Error(`Invalid port number: ${port}`);
    }

    logger.debug(`Starting server on port ${port}...`);
    logger.debug(`Current agents count: ${this.agents.size}`);
    logger.debug(`Environment: ${process.env.NODE_ENV}`);

    const host = process.env.SERVER_HOST || '0.0.0.0';

    this.server
      .listen(port, host, () => {
        // Only show the dashboard URL in production mode
        if (process.env.NODE_ENV !== 'development') {
          console.log(
            `\x1b[32mStartup successful!\nGo to the dashboard at \x1b[1mhttp://localhost:${port}\x1b[22m\x1b[0m`
          );
        }

        // Add log for test readiness
        console.log(`AgentServer is listening on port ${port}`);

        logger.success(
          `REST API bound to ${host}:${port}. If running locally, access it at http://localhost:${port}.`
        );
        logger.debug(`Active agents: ${this.agents.size}`);
        this.agents.forEach((agent, id) => {
          logger.debug(`- Agent ${id}: ${agent.character.name}`);
        });
      })
      .on('error', (error: any) => {
        logger.error(`Failed to bind server to ${host}:${port}:`, error);

        // Provide helpful error messages for common issues
        if (error.code === 'EADDRINUSE') {
          logger.error(
            `Port ${port} is already in use. Please try a different port or stop the process using that port.`
          );
        } else if (error.code === 'EACCES') {
          logger.error(
            `Permission denied to bind to port ${port}. Try using a port above 1024 or running with appropriate permissions.`
          );
        } else if (error.code === 'EADDRNOTAVAIL') {
          logger.error(
            `Cannot bind to ${host}:${port} - address not available. Check if the host address is correct.`
          );
        }

        throw error;
      });

    // Setup graceful shutdown
    this.setupGracefulShutdown();
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    if (this.server) {
      this.server.close(() => {
        logger.success('ServerService stopped');
      });
    }
  }

  /**
   * Get the Socket.IO instance
   */
  public getSocketIO(): SocketIOServer {
    return this.socketIO;
  }

  /**
   * Get the HTTP server instance
   */
  public getServer(): http.Server {
    return this.server;
  }

  // ===============================
  // Private Helper Methods
  // ===============================

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async () => {
      logger.info('Received shutdown signal, initiating graceful shutdown...');

      // Stop all agents first
      logger.debug('Stopping all agents...');
      for (const [id, agent] of this.agents.entries()) {
        try {
          await agent.stop();
          logger.debug(`Stopped agent ${id}`);
        } catch (error) {
          logger.error(`Error stopping agent ${id}:`, error);
        }
      }

      // Close server
      this.server.close(() => {
        logger.success('Server closed successfully');
        process.exit(0);
      });

      // Force close after timeout
      setTimeout(() => {
        logger.error('Could not close connections in time, forcing shutdown');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    logger.debug('Shutdown handlers registered');
  }
}