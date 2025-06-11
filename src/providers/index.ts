import { type Provider, type IAgentRuntime } from "@elizaos/core";

interface LevvaProvider extends Provider {}

export const levvaProvider: LevvaProvider = {
  name: "levva",
  description: "Levva provider",
  dynamic: true,
  async get(runtime, message, state) {
    return {};
  },
};
