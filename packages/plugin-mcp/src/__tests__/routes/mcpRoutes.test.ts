import { describe, it, expect, mock, beforeEach } from 'bun:test';
import type { Request, Response } from 'express';
import type { IAgentRuntime } from '@elizaos/core';
import { mcpRoutes } from '../../routes/mcpRoutes';
import type { McpService } from '../../service';

// Simplified TestSuite implementation for local use
class TestSuite {
  constructor(private name: string, private config: any) {}
  
  addTest(test: any) {
    it(test.name, async () => {
      const context = this.config.beforeEach ? this.config.beforeEach() : {};
      await test.fn(context);
    });
  }
  
  run() {
    // No-op, bun:test handles execution
  }
}

const createUnitTest = (config: { name: string; fn: (context?: any) => Promise<void> | void }) => config;

// Mock factories
function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as Request;
}

function createMockResponse(): Response & {
  _json?: any;
  _status?: number;
  _type?: string;
  _send?: string;
  // eslint-disable-next-line indent
} {
  const res: any = {
    _json: null,
    _status: 200,
    _type: null,
    _send: null,
    json: mock(function (this: any, data: any) {
      this._json = data;
      return this;
    }),
    status: mock(function (this: any, code: number) {
      this._status = code;
      return this;
    }),
    type: mock(function (this: any, type: string) {
      this._type = type;
      return this;
    }),
    send: mock(function (this: any, data: any) {
      this._send = data;
      return this;
    }),
  };
  return res;
}

function createMockRuntime(mcpService?: Partial<McpService>): IAgentRuntime {
  return {
    getService: mock((name: string) => {
      if (name === 'mcp' && mcpService) {
        return mcpService;
      }
      return null;
    }),
  } as unknown as IAgentRuntime;
}

describe('MCP Routes', () => {
  const mcpRoutesTestSuite = new TestSuite('MCP Routes', {
    beforeEach: () => {
      return {
        createMockRequest,
        createMockResponse,
        createMockRuntime,
      };
    },
  });

  mcpRoutesTestSuite.addTest(
    createUnitTest({
      name: 'should return servers list when MCP service is available',
      fn: async ({ createMockRequest, createMockResponse, createMockRuntime }: any) => {
        const getServersRoute = mcpRoutes.find(
          (r) => r.path === '/mcp/servers' && (r as any).type === 'GET'
        )!;

        const mockServers = [
          {
            name: 'test-server',
            status: 'connected',
            error: undefined,
            tools: [{ name: 'tool1', description: 'Test tool', inputSchema: {} }],
            resources: [
              {
                uri: 'resource1',
                name: 'Test Resource',
                description: 'Test',
                mimeType: 'text/plain',
              },
            ],
          },
        ];

        const mockService = {
          getServers: mock().mockReturnValue(mockServers),
        };

        const req = createMockRequest();
        const res = createMockResponse();
        const runtime = createMockRuntime(mockService);

        await getServersRoute.handler(req, res, runtime);

        expect(res._json).toEqual({
          success: true,
          data: {
            servers: expect.arrayContaining([
              expect.objectContaining({
                name: 'test-server',
                status: 'connected',
                toolCount: 1,
                resourceCount: 1,
              }),
            ]),
            totalServers: 1,
            connectedServers: 1,
          },
        });
      },
    })
  );

  mcpRoutesTestSuite.addTest(
    createUnitTest({
      name: 'should return 503 when MCP service is not available',
      fn: async ({ createMockRequest, createMockResponse, createMockRuntime }: any) => {
        const getServersRoute = mcpRoutes.find(
          (r) => r.path === '/mcp/servers' && (r as any).type === 'GET'
        )!;

        const req = createMockRequest();
        const res = createMockResponse();
        const runtime = createMockRuntime();

        await getServersRoute.handler(req, res, runtime);

        expect(res._status).toBe(503);
        expect(res._json).toEqual({
          success: false,
          error: 'MCP service not available',
        });
      },
    })
  );

  mcpRoutesTestSuite.addTest(
    createUnitTest({
      name: 'should handle errors gracefully',
      fn: async ({ createMockRequest, createMockResponse, createMockRuntime }: any) => {
        const getServersRoute = mcpRoutes.find(
          (r) => r.path === '/mcp/servers' && (r as any).type === 'GET'
        )!;

        const mockService = {
          getServers: mock().mockImplementation(() => {
            throw new Error('Test error');
          }),
        };

        const req = createMockRequest();
        const res = createMockResponse();
        const runtime = createMockRuntime(mockService);

        await getServersRoute.handler(req, res, runtime);

        expect(res._status).toBe(500);
        expect(res._json).toEqual({
          success: false,
          error: 'Test error',
        });
      },
    })
  );

  mcpRoutesTestSuite.addTest(
    createUnitTest({
      name: 'should call tool successfully',
      fn: async ({ createMockRequest, createMockResponse, createMockRuntime }: any) => {
        const callToolRoute = mcpRoutes.find(
          (r) => r.path === '/mcp/tools/:serverName/:toolName' && (r as any).type === 'POST'
        )!;

        const mockResult = { success: true, data: 'Tool executed' };
        const mockService = {
          callTool: mock().mockResolvedValue(mockResult),
        };

        const req = createMockRequest({
          params: { serverName: 'test-server', toolName: 'test-tool' },
          body: { arguments: { arg1: 'value1' } },
        });
        const res = createMockResponse();
        const runtime = createMockRuntime(mockService);

        await callToolRoute.handler(req, res, runtime);

        expect(mockService.callTool).toHaveBeenCalledWith('test-server', 'test-tool', {
          arg1: 'value1',
        });
        expect(res._json).toEqual({
          success: true,
          data: {
            result: mockResult,
            serverName: 'test-server',
            toolName: 'test-tool',
            timestamp: expect.any(String),
          },
        });
      },
    })
  );

  mcpRoutesTestSuite.addTest(
    createUnitTest({
      name: 'should handle tool execution errors',
      fn: async ({ createMockRequest, createMockResponse, createMockRuntime }: any) => {
        const callToolRoute = mcpRoutes.find(
          (r) => r.path === '/mcp/tools/:serverName/:toolName' && (r as any).type === 'POST'
        )!;

        const mockService = {
          callTool: mock().mockRejectedValue(new Error('Tool execution failed')),
        };

        const req = createMockRequest({
          params: { serverName: 'test-server', toolName: 'test-tool' },
          body: {},
        });
        const res = createMockResponse();
        const runtime = createMockRuntime(mockService);

        await callToolRoute.handler(req, res, runtime);

        expect(res._status).toBe(500);
        expect(res._json).toEqual({
          success: false,
          error: 'Tool execution failed',
        });
      },
    })
  );

  mcpRoutesTestSuite.addTest(
    createUnitTest({
      name: 'should read resource successfully',
      fn: async ({ createMockRequest, createMockResponse, createMockRuntime }: any) => {
        const readResourceRoute = mcpRoutes.find(
          (r) => r.path === '/mcp/resources/:serverName' && (r as any).type === 'POST'
        )!;

        const mockResult = {
          contents: [{ text: 'Resource content', mimeType: 'text/plain' }],
        };
        const mockService = {
          readResource: mock().mockResolvedValue(mockResult),
        };

        const req = createMockRequest({
          params: { serverName: 'test-server' },
          body: { uri: 'test://resource' },
        });
        const res = createMockResponse();
        const runtime = createMockRuntime(mockService);

        await readResourceRoute.handler(req, res, runtime);

        expect(mockService.readResource).toHaveBeenCalledWith('test-server', 'test://resource');
        expect(res._json).toEqual({
          success: true,
          data: {
            contents: mockResult.contents,
            serverName: 'test-server',
            uri: 'test://resource',
            timestamp: expect.any(String),
          },
        });
      },
    })
  );

  mcpRoutesTestSuite.addTest(
    createUnitTest({
      name: 'should return 400 when URI is missing',
      fn: async ({ createMockRequest, createMockResponse, createMockRuntime }: any) => {
        const readResourceRoute = mcpRoutes.find(
          (r) => r.path === '/mcp/resources/:serverName' && (r as any).type === 'POST'
        )!;

        const req = createMockRequest({
          params: { serverName: 'test-server' },
          body: {},
        });
        const res = createMockResponse();
        const runtime = createMockRuntime({});

        await readResourceRoute.handler(req, res, runtime);

        expect(res._status).toBe(400);
        expect(res._json).toEqual({
          success: false,
          error: 'Resource URI is required',
        });
      },
    })
  );

  mcpRoutesTestSuite.addTest(
    createUnitTest({
      name: 'should reconnect server successfully',
      fn: async ({ createMockRequest, createMockResponse, createMockRuntime }: any) => {
        const reconnectRoute = mcpRoutes.find(
          (r) => r.path === '/mcp/servers/:serverName/reconnect' && r.type === 'POST'
        )!;

        const mockServers = [
          {
            name: 'test-server',
            status: 'disconnected',
            config: JSON.stringify({ type: 'stdio', command: 'test' }),
          },
        ];
        const mockService = {
          getServers: mock().mockReturnValue(mockServers),
          reconnectServer: mock().mockResolvedValue(undefined),
        };

        const req = createMockRequest({
          params: { serverName: 'test-server' },
        });
        const res = createMockResponse();
        const runtime = createMockRuntime(mockService);

        await reconnectRoute.handler(req, res, runtime);

        expect(mockService.reconnectServer).toHaveBeenCalledWith('test-server', {
          type: 'stdio',
          command: 'test',
        });
        expect(res._json).toEqual({
          success: true,
          data: {
            message: 'Server test-server reconnection initiated',
            serverName: 'test-server',
            timestamp: expect.any(String),
          },
        });
      },
    })
  );

  mcpRoutesTestSuite.addTest(
    createUnitTest({
      name: 'should return 404 when server not found',
      fn: async ({ createMockRequest, createMockResponse, createMockRuntime }: any) => {
        const reconnectRoute = mcpRoutes.find(
          (r) => r.path === '/mcp/servers/:serverName/reconnect' && r.type === 'POST'
        )!;

        const mockService = {
          getServers: mock().mockReturnValue([]),
        };

        const req = createMockRequest({
          params: { serverName: 'non-existent' },
        });
        const res = createMockResponse();
        const runtime = createMockRuntime(mockService);

        await reconnectRoute.handler(req, res, runtime);

        expect(res._status).toBe(404);
        expect(res._json).toEqual({
          success: false,
          error: 'Server non-existent not found',
        });
      },
    })
  );

  mcpRoutesTestSuite.addTest(
    createUnitTest({
      name: 'should serve HTML page',
      fn: async ({ createMockRequest, createMockResponse, createMockRuntime }: any) => {
        const viewerRoute = mcpRoutes.find((r) => r.path === '/mcp/viewer' && r.type === 'GET')!;

        const req = createMockRequest({
          query: { agentId: 'test-agent-id' },
        });
        const res = createMockResponse();
        const runtime = createMockRuntime();

        await viewerRoute.handler(req, res, runtime);

        expect(res._type).toBe('html');
        expect(res._send).toContain('<!DOCTYPE html>');
        expect(res._send).toContain('MCP Viewer - ElizaOS');
        expect(res._send).toContain('test-agent-id');
      },
    })
  );

  mcpRoutesTestSuite.run();
});