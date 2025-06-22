import type { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import type { McpService } from "./service";
import { MCP_SERVICE_NAME } from "./types";

export const provider: Provider = {
  name: "MCP",
  description: "Information about connected MCP servers, tools, and resources",

  get: async (runtime: IAgentRuntime, _message: Memory, _state: State) => {
    const mcpService = runtime.getService(MCP_SERVICE_NAME) as McpService;
    if (!mcpService) {
      return {
        values: { mcp: {} },
        data: { mcp: {} },
        text: "No MCP servers are available.",
      };
    }

    return mcpService.getProviderData();
  },
};
