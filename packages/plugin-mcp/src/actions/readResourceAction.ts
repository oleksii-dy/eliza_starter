import {
  type Action,
  type ActionExample,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type State,
  composePromptFromState,
  logger,
} from '@elizaos/core';
import type { McpService } from '../service';
import { resourceSelectionTemplate } from '../templates/resourceSelectionTemplate';
import { MCP_SERVICE_NAME } from '../types';
import { handleMcpError } from '../utils/error';
import {
  handleResourceAnalysis,
  processResourceResult,
  sendInitialResponse,
} from '../utils/processing';
import {
  createResourceSelectionFeedbackPrompt,
  validateResourceSelection,
} from '../utils/validation';
import type { ResourceSelection } from '../utils/validation';
import { withModelRetry } from '../utils/wrapper';

function createResourceSelectionPrompt(composedState: State, userMessage: string): string {
  const mcpData = composedState.values.mcp || {};
  const serverNames = Object.keys(mcpData);

  let resourcesDescription = '';
  for (const serverName of serverNames) {
    const server = mcpData[serverName];
    if (server.status !== 'connected') {
      continue;
    }

    const resourceUris = Object.keys(server.resources || {});
    for (const uri of resourceUris) {
      const resource = server.resources[uri];
      resourcesDescription += `Resource: ${uri} (Server: ${serverName})\n`;
      resourcesDescription += `Name: ${resource.name || 'No name available'}\n`;
      resourcesDescription += `Description: ${
        resource.description || 'No description available'
      }\n`;
      resourcesDescription += `MIME Type: ${resource.mimeType || 'Not specified'}\n\n`;
    }
  }

  const enhancedState: State = {
    ...composedState,
    values: {
      ...composedState.values,
      resourcesDescription,
      userMessage,
    },
  };

  return composePromptFromState({
    state: enhancedState,
    template: resourceSelectionTemplate,
  });
}

export const readResourceAction: Action = {
  name: 'READ_RESOURCE',
  similes: [
    'READ_MCP_RESOURCE',
    'GET_RESOURCE',
    'GET_MCP_RESOURCE',
    'FETCH_RESOURCE',
    'FETCH_MCP_RESOURCE',
    'ACCESS_RESOURCE',
    'ACCESS_MCP_RESOURCE',
  ],
  description: 'Reads a resource from an MCP server and returns its content for further processing. Supports action chaining by providing structured resource data that can be analyzed, transformed, or used by subsequent actions.',

  effects: {
    provides: ['resourceContent', 'resourceMetadata', 'resourceUri'],
    requires: ['mcpService'],
    modifies: ['workingMemory']
  },

  validate: async (runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean> => {
    const mcpService = runtime.getService(MCP_SERVICE_NAME) as McpService;
    if (!mcpService) {
      return false;
    }

    const servers = mcpService.getServers();
    return (
      servers.length > 0 &&
      servers.some(
        (server: any) =>
          server.status === 'connected' && server.resources && server.resources.length > 0
      )
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    const composedState = await runtime.composeState(message, ['RECENT_MESSAGES', 'MCP']);

    const mcpService = runtime.getService(MCP_SERVICE_NAME) as McpService;
    if (!mcpService) {
      throw new Error('MCP service not available');
    }

    const mcpProvider = mcpService.getProviderData();

    try {
      await sendInitialResponse(callback);

      const resourceSelectionPrompt = createResourceSelectionPrompt(
        composedState,
        message.content.text || ''
      );

      const resourceSelection = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: resourceSelectionPrompt,
      });

      const parsedSelection = await withModelRetry<ResourceSelection>({
        runtime,
        state: composedState,
        message,
        callback,
        input: resourceSelection,
        validationFn: (data) => validateResourceSelection(data),
        createFeedbackPromptFn: (originalResponse, errorMessage, state, userMessage) =>
          createResourceSelectionFeedbackPrompt(
            originalResponse as string,
            errorMessage,
            state,
            userMessage
          ),
        failureMsg:
          "I'm having trouble finding the resource you're looking for. Could you provide more details about what you need?",
        retryCount: 0,
      });

      if (!parsedSelection || parsedSelection.noResourceAvailable) {
        if (callback && parsedSelection?.noResourceAvailable) {
          await callback({
            text: "I don't have a specific resource that contains the information you're looking for. Let me try to assist you directly instead.",
            thought:
              'No appropriate MCP resource available for this request. Falling back to direct assistance.',
            actions: ['REPLY'],
          });
        }
        return {
          text: 'No appropriate MCP resource available for this request',
          values: { noResourceAvailable: true },
          data: { errorType: 'NO_RESOURCE_AVAILABLE' }
        };
      }

      const { serverName, uri, reasoning } = parsedSelection;

      logger.debug(`Selected resource "${uri}" on server "${serverName}" because: ${reasoning}`);

      const result = await mcpService.readResource(serverName, uri);
      logger.debug(`Read resource ${uri} from server ${serverName}`);

      const { resourceContent, resourceMeta } = processResourceResult(result, uri);

      await handleResourceAnalysis(
        runtime,
        message,
        uri,
        serverName,
        resourceContent,
        resourceMeta,
        callback
      );

      return {
        text: `Successfully read resource from ${serverName}: ${uri}`,
        values: {
          resourceContent,
          resourceUri: uri,
          serverName,
          resourceMetadata: resourceMeta,
          success: true
        },
        data: {
          mcpResourceRead: {
            server: serverName,
            uri: uri,
            contentLength: resourceContent.length,
            metadata: resourceMeta,
            timestamp: new Date().toISOString()
          }
        }
      };
    } catch (error) {
      const errorHandled = await handleMcpError(
        composedState,
        mcpProvider,
        error,
        runtime,
        message,
        'resource',
        callback
      );
      return {
        text: `Failed to read MCP resource: ${error instanceof Error ? error.message : 'Unknown error'}`,
        values: {
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        },
        data: {
          errorType: 'MCP_RESOURCE_ERROR',
          errorDetails: error instanceof Error ? error.stack : undefined
        }
      };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Can you get the documentation about installing ElizaOS?',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll retrieve the ElizaOS installation documentation for you.",
          actions: ['READ_RESOURCE'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "Based on the documentation, ElizaOS installation requires Node.js 23+ and Git. For Windows users, WSL 2 is required. The quickest setup is: `git clone https://github.com/elizaos/eliza-starter.git && cd eliza-starter && cp .env.example .env && bun i && bun run build && bun start`. Access the web interface at http://localhost:3000 once started.",
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Read the API documentation and then create a summary of the authentication endpoints',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll read the API documentation first, then create a summary of the authentication endpoints.",
          thought: 'I need to chain two actions: first read the API documentation resource, then analyze and summarize the authentication-related content.',
          actions: ['READ_RESOURCE'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Retrieved the API documentation successfully. Now analyzing the authentication endpoints to create a summary.',
          thought: 'The resource content contains comprehensive API documentation. I can now extract and summarize the authentication-related endpoints from this data.',
          actions: ['ANALYZE_TEXT'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Here\'s a summary of the authentication endpoints from the API documentation:\n\n**Authentication Endpoints:**\n- POST /auth/login - User login with credentials\n- POST /auth/refresh - Refresh access token\n- POST /auth/logout - User logout\n- GET /auth/me - Get current user profile\n- POST /auth/register - New user registration\n\nAll endpoints except registration require Bearer token authentication in the Authorization header.',
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Get the configuration file, update the database settings, and then save it back',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll retrieve the configuration file, update the database settings, and save the changes.",
          thought: 'This requires a three-step workflow: 1) Read the config resource, 2) Modify database settings, 3) Write back the updated config. Each step depends on the previous one.',
          actions: ['READ_RESOURCE'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Configuration file retrieved successfully. Now updating the database settings.',
          thought: 'Got the config resource content. I can now parse and modify the database settings within this configuration data.',
          actions: ['UPDATE_CONFIG'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Database settings updated in the configuration. Now saving the updated configuration back.',
          thought: 'Configuration has been modified with new database settings. Now I need to save this updated content back to the resource or file system.',
          actions: ['SAVE_RESOURCE'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Successfully updated and saved the configuration file with new database settings. The changes include updated connection string, timeout values, and pool size configurations.',
        },
      },
    ],
  ] as ActionExample[][],
};
