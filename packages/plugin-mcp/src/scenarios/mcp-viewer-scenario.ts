import type { Scenario } from '@elizaos/core';

export const mcpViewerScenario: Scenario = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  name: 'MCP Viewer Functionality',
  description: 'Tests the MCP viewer UI and API integration for managing MCP servers',
  category: 'integration',
  tags: ['mcp', 'ui', 'api', 'viewer'],

  actors: [
    {
      id: 'f1e2d3c4-b5a6-7890-abcd-ef1234567890',
      name: 'MCP Admin',
      role: 'subject',
      bio: 'An administrator who manages MCP server connections and monitors their status',
      system: 'You are an MCP administrator helping users manage their Model Context Protocol server connections. You can view server status, execute tools, and read resources.',
      plugins: ['@elizaos/plugin-mcp'],
      script: {
        steps: [
          {
            type: 'message',
            content: 'Show me the status of all connected MCP servers.',
            description: 'Request server status information'
          },
          {
            type: 'wait',
            waitTime: 2000,
            description: 'Wait for MCP data to be retrieved'
          },
          {
            type: 'message',
            content: 'Can you list the available tools from the connected servers?',
            description: 'Request tool listing'
          },
          {
            type: 'wait',
            waitTime: 2000,
            description: 'Wait for tool information'
          },
          {
            type: 'message',
            content: 'Please execute the "list-files" tool if available.',
            description: 'Request tool execution'
          },
          {
            type: 'action',
            actionName: 'CALL_TOOL',
            actionParams: {},
            description: 'Execute MCP tool'
          },
          {
            type: 'wait',
            waitTime: 3000,
            description: 'Wait for tool execution'
          },
          {
            type: 'message',
            content: 'Now show me the available resources.',
            description: 'Request resource listing'
          },
          {
            type: 'wait',
            waitTime: 2000,
            description: 'Wait for resource information'
          },
          {
            type: 'message',
            content: 'Can you read the first available resource?',
            description: 'Request resource reading'
          },
          {
            type: 'action',
            actionName: 'READ_MCP_RESOURCE',
            actionParams: {},
            description: 'Read MCP resource'
          }
        ]
      }
    },
    {
      id: 'a2b3c4d5-e6f7-8901-bcde-f23456789012',
      name: 'MCP Observer',
      role: 'observer',
      bio: 'An observer monitoring the MCP operations',
      system: 'You observe and verify MCP operations are working correctly.',
      plugins: ['@elizaos/plugin-mcp']
    }
  ],

  setup: {
    environment: {
      mcp: {
        servers: {
          'test-server': {
            type: 'stdio',
            command: 'echo',
            args: ['MCP test server']
          }
        }
      }
    }
  },

  execution: {
    maxDuration: 60000,
    maxSteps: 20
  },

  verification: {
    rules: [
      {
        id: 'server-status-check',
        type: 'llm',
        description: 'Verify MCP server status is retrieved',
        config: {
          successCriteria: 'The agent should successfully retrieve and display MCP server status information',
          priority: 'high',
          category: 'functionality'
        }
      },
      {
        id: 'tool-listing-check',
        type: 'llm',
        description: 'Verify tools are listed correctly',
        config: {
          successCriteria: 'The agent should list available tools from connected MCP servers',
          priority: 'high',
          category: 'functionality'
        }
      },
      {
        id: 'tool-execution-check',
        type: 'llm',
        description: 'Verify tool execution works',
        config: {
          successCriteria: 'The agent should attempt to execute the requested tool or explain why it cannot',
          priority: 'medium',
          category: 'functionality'
        }
      },
      {
        id: 'resource-listing-check',
        type: 'llm',
        description: 'Verify resources are listed',
        config: {
          successCriteria: 'The agent should list available resources from MCP servers',
          priority: 'medium',
          category: 'functionality'
        }
      },
      {
        id: 'resource-reading-check',
        type: 'llm',
        description: 'Verify resource reading works',
        config: {
          successCriteria: 'The agent should attempt to read a resource or explain why it cannot',
          priority: 'medium',
          category: 'functionality'
        }
      },
      {
        id: 'api-integration-check',
        type: 'llm',
        description: 'Verify API routes are functioning',
        config: {
          successCriteria: 'The MCP viewer API routes should be accessible and return appropriate responses',
          priority: 'high',
          category: 'integration'
        }
      },
      {
        id: 'error-handling-check',
        type: 'llm',
        description: 'Verify graceful error handling',
        config: {
          successCriteria: 'The system should handle missing servers or failed connections gracefully',
          priority: 'medium',
          category: 'reliability'
        }
      }
    ]
  }
}; 