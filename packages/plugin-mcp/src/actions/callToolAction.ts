import {
  type Action,
  type ActionExample,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';
import type { McpService } from '../service';
import { MCP_SERVICE_NAME } from '../types';
import { handleMcpError } from '../utils/error';
import { handleToolResponse, processToolResult } from '../utils/processing';
import { createToolSelectionArgument, createToolSelectionName } from '../utils/selection';
import { handleNoToolAvailable } from '../utils/handler';

export const callToolAction: Action = {
  name: 'CALL_TOOL',
  similes: [
    'CALL_MCP_TOOL',
    'USE_TOOL',
    'USE_MCP_TOOL',
    'EXECUTE_TOOL',
    'EXECUTE_MCP_TOOL',
    'RUN_TOOL',
    'RUN_MCP_TOOL',
    'INVOKE_TOOL',
    'INVOKE_MCP_TOOL',
  ],
  description:
    'Calls a tool from an MCP server to perform a specific task. Supports action chaining by returning structured results that can be used by subsequent actions for complex MCP workflows.',

  effects: {
    provides: ['toolResult', 'toolOutput', 'toolMetadata'],
    requires: ['mcpService'],
    modifies: ['workingMemory'],
  },

  validate: async (runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean> => {
    const mcpService = runtime.getService<McpService>(MCP_SERVICE_NAME);
    if (!mcpService) {
      return false;
    }

    const servers = mcpService.getServers();
    return (
      servers.length > 0 &&
      servers.some(
        (server: any) => server.status === 'connected' && server.tools && server.tools.length > 0
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
    const mcpService = runtime.getService<McpService>(MCP_SERVICE_NAME);
    if (!mcpService) {
      throw new Error('MCP service not available');
    }
    const mcpProvider = mcpService.getProviderData();

    try {
      // Select the tool with this servername and toolname
      const toolSelectionName = await createToolSelectionName({
        runtime,
        state: composedState,
        message,
        callback,
        mcpProvider,
      });
      if (!toolSelectionName || toolSelectionName.noToolAvailable) {
        logger.warn('[NO_TOOL_AVAILABLE] No appropriate tool available for the request');
        await handleNoToolAvailable(callback, toolSelectionName);
        return {
          text: 'No appropriate MCP tool available for this request',
          values: { noToolAvailable: true },
          data: { errorType: 'NO_TOOL_AVAILABLE' },
        };
      }
      const { serverName, toolName, reasoning } = toolSelectionName;
      logger.info(
        `[CALLING] Calling tool "${serverName}/${toolName}" on server with reasoning: "${reasoning}"`
      );

      // Create the tool selection "argument" based on the selected tool name
      const toolSelectionArgument = await createToolSelectionArgument({
        runtime,
        state: composedState,
        message,
        callback,
        mcpProvider,
        toolSelectionName,
      });
      if (!toolSelectionArgument) {
        logger.warn(
          '[NO_TOOL_SELECTION_ARGUMENT] No appropriate tool selection argument available'
        );
        await handleNoToolAvailable(callback, toolSelectionName);
        return {
          text: 'Unable to determine appropriate arguments for the selected tool',
          values: { noArgumentsAvailable: true },
          data: { errorType: 'NO_TOOL_ARGUMENTS', serverName, toolName },
        };
      }
      logger.info(
        `[SELECTED] Tool Selection result:\n${JSON.stringify(toolSelectionArgument, null, 2)}`
      );

      const result = await mcpService.callTool(
        serverName,
        toolName,
        toolSelectionArgument.toolArguments
      );

      const { toolOutput, hasAttachments, attachments } = processToolResult(
        result,
        serverName,
        toolName,
        runtime,
        message.entityId
      );

      await handleToolResponse(
        runtime,
        message,
        serverName,
        toolName,
        toolSelectionArgument.toolArguments,
        toolOutput,
        hasAttachments,
        attachments,
        composedState,
        mcpProvider,
        callback
      );

      return {
        text: `Successfully executed tool ${serverName}/${toolName}`,
        values: {
          toolResult: result,
          toolOutput,
          serverName,
          toolName,
          toolArguments: toolSelectionArgument.toolArguments,
          hasAttachments,
          success: true,
        },
        data: {
          mcpToolCall: {
            server: serverName,
            tool: toolName,
            arguments: toolSelectionArgument.toolArguments,
            output: toolOutput,
            attachments: hasAttachments ? attachments : undefined,
            timestamp: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      const _errorHandled = await handleMcpError(
        composedState,
        mcpProvider,
        error,
        runtime,
        message,
        'tool',
        callback
      );
      return {
        text: `Failed to execute MCP tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
        values: {
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        },
        data: {
          errorType: 'MCP_TOOL_ERROR',
          errorDetails: error instanceof Error ? error.stack : undefined,
        },
      };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Can you search for information about climate change?',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll search for climate change information using the available tools.",
          actions: ['CALL_TOOL'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'I found comprehensive information about climate change. Climate change refers to long-term shifts in temperatures and weather patterns. While climate variations can be natural, since the 1800s human activities have been the main driver, primarily through burning fossil fuels which produce greenhouse gases.',
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Get the latest stock price for AAPL and then calculate the percentage change from yesterday',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll get the current AAPL stock price first, then calculate the percentage change.",
          thought:
            'I need to chain two actions: first get the stock price data, then use that result to calculate the percentage change.',
          actions: ['CALL_TOOL'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Current AAPL price is $185.25. Now let me calculate the percentage change from yesterday.',
          thought:
            'Got the stock data successfully. The tool returned current price and previous close. I can now calculate the percentage change using this data.',
          actions: ['CALCULATE_PERCENTAGE'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "AAPL is currently trading at $185.25, which represents a 2.3% increase from yesterday's closing price of $181.09.",
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: "Create a new file with today's weather data and then send it via email",
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll fetch today's weather data first, then create a file and email it to you.",
          thought:
            'This requires a three-step workflow: 1) Get weather data via MCP tool, 2) Create file with the data, 3) Send email with attachment. The results from each step will inform the next.',
          actions: ['CALL_TOOL'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Retrieved weather data successfully. Now creating a file with this information.',
          thought:
            'Weather data obtained from MCP tool. The result contains temperature, humidity, and forecast data that I can now format into a file.',
          actions: ['CREATE_FILE'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "File created with today's weather data. Now sending it via email.",
          thought:
            'File successfully created with the weather data from the MCP tool result. Now I can attach and send this file via email.',
          actions: ['SEND_EMAIL'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I've successfully created a weather report file with today's data and sent it to your email. The file contains current temperature, humidity, wind conditions, and the 5-day forecast.",
        },
      },
    ],
  ] as ActionExample[][],
};
