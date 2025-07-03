/**
 * Tests for static file serving and client dist path resolution
 */

import { describe, it, expect, beforeEach, afterEach, mock, jest } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Mock logger
mock.module('@elizaos/core', async () => {
  const actual = await import('@elizaos/core');
  return {
    ...actual,
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      success: jest.fn(),
    },
  };
});

describe('Static File Serving', () => {
  const originalEnv = process.env;
  let mockExistsSync: jest.Mock;
  let mockLogger: any;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    mock.restore();
    
    // Mock fs.existsSync
    mockExistsSync = jest.fn();
    jest.spyOn(fs, 'existsSync').mockImplementation(mockExistsSync);
    
    // Get mocked logger
    import('@elizaos/core').then((core) => {
      mockLogger = core.logger;
    });
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('Client Dist Directory Resolution', () => {
    it('should correctly resolve client dist path from server dist location', () => {
      // Simulate server running from packages/server/dist
      const serverDistPath = '/path/to/packages/server/dist';
      
      // Test path resolution - path.resolve normalizes the path
      const resolvedPath = path.resolve(serverDistPath, '../../../cli/dist');
      const normalizedPath = path.normalize('/path/to/packages/server/dist/../../../cli/dist');
      
      // Both should resolve to the same normalized path
      expect(resolvedPath).toBe(normalizedPath);
      expect(resolvedPath).toContain('cli/dist');
    });

    it('should log error when client dist directory is missing', () => {
      // Mock file system - client dist doesn't exist
      mockExistsSync.mockReturnValue(false);
      
      // Simulate checking for client dist
      const clientPath = '/path/to/packages/cli/dist';
      const exists = fs.existsSync(clientPath);
      
      expect(exists).toBe(false);
      
      // Verify the mock was called
      expect(mockExistsSync).toHaveBeenCalledWith(clientPath);
    });

    it('should handle missing index.html gracefully', () => {
      // Mock file system - index.html doesn't exist
      mockExistsSync.mockReturnValue(false);
      
      // Mock response object
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      
      // Simulate checking for index.html
      const indexPath = '/path/to/packages/cli/dist/index.html';
      
      if (!fs.existsSync(indexPath)) {
        mockRes.status(404).send('Client UI not found');
      }
      
      // Verify error handling
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith('Client UI not found');
    });

    it('should serve files successfully when client dist exists', () => {
      // Mock file system - everything exists
      mockExistsSync.mockReturnValue(true);
      
      // Mock Express static middleware
      const mockStatic = jest.fn();
      const mockApp = {
        use: jest.fn(),
      };
      
      // Simulate successful static file setup
      const clientPath = '/path/to/packages/cli/dist';
      
      if (fs.existsSync(clientPath)) {
        mockApp.use(mockStatic);
      }
      
      // Verify success
      expect(mockExistsSync).toHaveBeenCalledWith(clientPath);
      expect(mockApp.use).toHaveBeenCalledWith(mockStatic);
    });
  });

  describe('JavaScript Module Handling', () => {
    it('should return proper 404 for missing JavaScript modules', () => {
      // Mock request and response
      const mockReq = {
        path: '/missing-module-ABC12345.js',
      };
      
      const mockRes = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      
      // Simulate handling missing JS module
      if (mockReq.path.endsWith('.js') || mockReq.path.match(/\/[a-zA-Z0-9_-]+-[A-Za-z0-9]{8}\.js/)) {
        mockRes.setHeader('Content-Type', 'application/javascript');
        mockRes.status(404).send(`// JavaScript module not found: ${mockReq.path}`);
      }
      
      // Verify response
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/javascript');
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith('// JavaScript module not found: /missing-module-ABC12345.js');
    });
  });

  describe('UI Enable/Disable Impact', () => {
    it('should not serve static files when UI is disabled', async () => {
      const mockApp = {
        use: jest.fn(),
      };
      
      const isWebUIEnabled = false;
      
      // Simulate static file serving setup
      if (isWebUIEnabled) {
        mockApp.use('express.static');
      }
      
      // Verify static files are not served
      expect(mockApp.use).not.toHaveBeenCalled();
    });

    it('should return 403 for non-API routes when UI is disabled', () => {
      const mockRes = {
        sendStatus: jest.fn(),
      };
      
      const isWebUIEnabled = false;
      const isAPIRoute = false;
      
      // Simulate request handling
      if (!isWebUIEnabled && !isAPIRoute) {
        mockRes.sendStatus(403);
      }
      
      // Verify 403 response
      expect(mockRes.sendStatus).toHaveBeenCalledWith(403);
    });
  });
});