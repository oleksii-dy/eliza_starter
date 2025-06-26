#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// {{TOOL_IMPORTS}}

// {{RESOURCE_IMPORTS}}

const server = new Server(
  {
    name: '{{PROJECT_NAME}}',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// {{REGISTER_TOOLS}}

// {{REGISTER_RESOURCES}}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('{{PROJECT_NAME}} MCP server running on stdio');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Server failed to start:', error);
    process.exit(1);
  });
}