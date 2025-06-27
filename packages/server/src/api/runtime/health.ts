import type { IAgentRuntime, UUID } from '@elizaos/core';
import { logger } from '@elizaos/core';
import express from 'express';
import type { AgentServer } from '../../index';

/**
 * Health monitoring and status endpoints
 */
export function createHealthRouter(
  agents: Map<UUID, IAgentRuntime>,
  serverInstance: AgentServer
): express.Router {
  const router = express.Router();

  // Health check
  router.get('/ping', (_req, res) => {
    res.json({ pong: true, timestamp: Date.now() });
  });

  // Hello world endpoint
  router.get('/hello', (_req, res) => {
    logger.info('Hello endpoint hit');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ message: 'Hello World!' }));
  });

  // System status endpoint
  router.get('/status', (_req, res) => {
    logger.info('Status endpoint hit');
    res.setHeader('Content-Type', 'application/json');
    res.send(
      JSON.stringify({
        status: 'ok',
        agentCount: agents.size,
        timestamp: new Date().toISOString(),
      })
    );
  });

  // Comprehensive health check
  router.get('/health', (_req, res) => {
    try {
      // Log the access
      logger.info('Health check route hit', { apiRoute: '/health' });

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
        version: process.version,
      });
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
      });
    }
  });

  // Server stop endpoint
  router.post('/stop', (_req, res) => {
    logger.info('Server stopping...', { apiRoute: '/stop' });
    res.json({ message: 'Server stopping...' });
    serverInstance?.stop();
  });

  return router;
}
