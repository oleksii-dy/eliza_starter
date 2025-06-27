import { describe, expect, it, mock } from 'bun:test';
import plugin from '../plugin';

describe('Plugin Routes', () => {
  it('should have routes defined', () => {
    expect(plugin.routes).toBeDefined();
    if (plugin.routes) {
      expect(Array.isArray(plugin.routes)).toBe(true);
      expect(plugin.routes.length).toBeGreaterThan(0);
    }
  });

  it('should have a route for /mr-tee-status', () => {
    if (plugin.routes) {
      const mrTeeRoute = plugin.routes.find((route) => route.path === '/mr-tee-status');
      expect(mrTeeRoute).toBeDefined();

      if (mrTeeRoute) {
        expect(mrTeeRoute.type).toBe('GET');
        expect(typeof mrTeeRoute.handler).toBe('function');
      }
    }
  });

  it('should handle route requests correctly', async () => {
    if (plugin.routes) {
      const mrTeeRoute = plugin.routes.find((route) => route.path === '/mr-tee-status');

      if (mrTeeRoute && mrTeeRoute.handler) {
        // Create mock request and response objects
        const mockReq = {
          method: 'GET',
          url: '/mr-tee-status',
          path: '/mr-tee-status',
          query: {},
          params: {},
          body: {},
          headers: {},
          get: mock(() => ''),
          header: mock(() => ''),
          accepts: mock(() => false),
          is: mock(() => false),
        } as any;

        const mockRes = {
          json: mock(),
          status: mock(() => mockRes),
          send: mock(() => mockRes),
          end: mock(),
          statusCode: 200,
          setHeader: mock(() => mockRes),
          getHeader: mock(),
          removeHeader: mock(() => mockRes),
          sendStatus: mock(() => mockRes),
          redirect: mock(() => mockRes),
          render: mock(() => mockRes),
          type: mock(() => mockRes),
        } as any;

        // Mock runtime object as third parameter
        const mockRuntime = {} as any;

        // Call the route handler
        await mrTeeRoute.handler(mockReq, mockRes, mockRuntime);

        // Verify response
        expect(mockRes.json).toHaveBeenCalledTimes(1);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Mr. TEE is operational, fool!',
          tee_mode: process.env.TEE_MODE || 'NOT SET',
          tee_vendor: process.env.TEE_VENDOR || 'NOT SET',
        });
      }
    }
  });

  it('should validate route structure', () => {
    if (plugin.routes) {
      // Validate each route
      plugin.routes.forEach((route) => {
        expect(route).toHaveProperty('path');
        expect(route).toHaveProperty('type');
        expect(route).toHaveProperty('handler');

        // Path should be a string starting with /
        expect(typeof route.path).toBe('string');
        expect(route.path.startsWith('/')).toBe(true);

        // Type should be a valid HTTP method
        expect(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).toContain(route.type);

        // Handler should be a function
        expect(typeof route.handler).toBe('function');
      });
    }
  });

  it('should have unique route paths', () => {
    if (plugin.routes) {
      const paths = plugin.routes.map((route) => route.path);
      const uniquePaths = new Set(paths);
      expect(paths.length).toBe(uniquePaths.size);
    }
  });
});
