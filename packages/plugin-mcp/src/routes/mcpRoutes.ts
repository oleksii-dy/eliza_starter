import type { Route, IAgentRuntime } from '@elizaos/core';
import type { Request, Response } from 'express';
import type { McpService } from '../service';
import { MCP_SERVICE_NAME } from '../types';
import type { McpServer } from '../types';

// API route to get MCP servers status
const getServersRoute: Route = {
  path: '/mcp/servers',
  type: 'GET',
  public: true,
  name: 'Get MCP Servers',
  handler: async (req: Request, res: Response, runtime: IAgentRuntime) => {
    try {
      const mcpService = runtime.getService(MCP_SERVICE_NAME) as McpService;
      if (!mcpService) {
        res.status(503).json({
          success: false,
          error: 'MCP service not available',
        });
        return;
      }

      const servers = mcpService.getServers();
      const serverDetails = servers.map((server: McpServer) => ({
        name: server.name,
        status: server.status,
        error: server.error,
        toolCount: server.tools?.length || 0,
        resourceCount: server.resources?.length || 0,
        tools:
          server.tools?.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          })) || [],
        resources:
          server.resources?.map((resource) => ({
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
          })) || [],
      }));

      res.json({
        success: true,
        data: {
          servers: serverDetails,
          totalServers: servers.length,
          connectedServers: servers.filter((s: McpServer) => s.status === 'connected').length,
        },
      });
      return;
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
      return;
    }
  },
};

// API route to call a tool
const callToolRoute: Route = {
  path: '/mcp/tools/:serverName/:toolName',
  type: 'POST',
  public: true,
  name: 'Call MCP Tool',
  handler: async (req: Request, res: Response, runtime: IAgentRuntime) => {
    try {
      const { serverName, toolName } = req.params;
      const { arguments: toolArgs } = req.body;

      const mcpService = runtime.getService(MCP_SERVICE_NAME) as McpService;
      if (!mcpService) {
        res.status(503).json({
          success: false,
          error: 'MCP service not available',
        });
        return;
      }

      const result = await mcpService.callTool(serverName, toolName, toolArgs || {});

      res.json({
        success: true,
        data: {
          result,
          serverName,
          toolName,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
      });
      return;
    }
  },
};

// API route to read a resource
const readResourceRoute: Route = {
  path: '/mcp/resources/:serverName',
  type: 'POST',
  public: true,
  name: 'Read MCP Resource',
  handler: async (req: Request, res: Response, runtime: IAgentRuntime) => {
    try {
      const { serverName } = req.params;
      const { uri } = req.body;

      if (!uri) {
        res.status(400).json({
          success: false,
          error: 'Resource URI is required',
        });
        return;
      }

      const mcpService = runtime.getService(MCP_SERVICE_NAME) as McpService;
      if (!mcpService) {
        res.status(503).json({
          success: false,
          error: 'MCP service not available',
        });
        return;
      }

      const result = await mcpService.readResource(serverName, uri);

      res.json({
        success: true,
        data: {
          contents: result.contents,
          serverName,
          uri,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Resource read failed',
      });
      return;
    }
  },
};

// API route to reconnect a server
const reconnectServerRoute: Route = {
  path: '/mcp/servers/:serverName/reconnect',
  type: 'POST',
  public: true,
  name: 'Reconnect MCP Server',
  handler: async (req: Request, res: Response, runtime: IAgentRuntime) => {
    try {
      const { serverName } = req.params;

      const mcpService = runtime.getService(MCP_SERVICE_NAME) as McpService;
      if (!mcpService) {
        res.status(503).json({
          success: false,
          error: 'MCP service not available',
        });
        return;
      }

      // Get current server config
      const servers = mcpService.getServers();
      const server = servers.find((s: McpServer) => s.name === serverName);

      if (!server) {
        res.status(404).json({
          success: false,
          error: `Server ${serverName} not found`,
        });
        return;
      }

      // Parse config and reconnect
      const config = JSON.parse(server.config);
      await mcpService.reconnectServer(serverName, config);

      res.json({
        success: true,
        data: {
          message: `Server ${serverName} reconnection initiated`,
          serverName,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Reconnection failed',
      });
      return;
    }
  },
};

// Route to serve the MCP viewer UI
const viewerRoute: Route = {
  path: '/mcp/viewer',
  type: 'GET',
  public: true,
  name: 'MCP Viewer',
  handler: async (req: Request, res: Response, runtime: IAgentRuntime) => {
    try {
      // Serve the HTML page that loads the React app
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Viewer - ElizaOS</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background-color: #f5f5f5;
    }
    #root {
      min-height: 100vh;
    }
    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-size: 1.2em;
      color: #666;
    }
  </style>
</head>
<body>
  <div id="root">
    <div class="loading">Loading MCP Viewer...</div>
  </div>
  <script type="module">
    import { renderMcpViewer } from '/api/mcp/viewer.js?agentId=${req.query.agentId}';
    renderMcpViewer('root', '${req.query.agentId}');
  </script>
</body>
</html>
      `;

      res.type('html').send(htmlContent);
      return;
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load viewer',
      });
      return;
    }
  },
};

// Route to serve the React bundle
const viewerBundleRoute: Route = {
  path: '/mcp/viewer.js',
  type: 'GET',
  public: true,
  name: 'MCP Viewer Bundle',
  handler: async (req: Request, res: Response, runtime: IAgentRuntime) => {
    try {
      // In production, this would serve the built React bundle
      // For development, we'll serve a module that dynamically imports the components
      const jsContent = `
import React from 'react';
import ReactDOM from 'react-dom/client';
import { McpViewer } from './frontend/McpViewer.js';

export function renderMcpViewer(elementId, agentId) {
  const container = document.getElementById(elementId);
  const root = ReactDOM.createRoot(container);
  root.render(React.createElement(McpViewer, { agentId }));
}
      `;

      res.type('application/javascript').send(jsContent);
      return;
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load viewer bundle',
      });
      return;
    }
  },
};

export const mcpRoutes: Route[] = [
  getServersRoute,
  callToolRoute,
  readResourceRoute,
  reconnectServerRoute,
  viewerRoute,
  viewerBundleRoute,
];
