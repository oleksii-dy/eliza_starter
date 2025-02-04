import { Plugin } from "@elizaos/core";
import { copilotProvider } from "./providers/copilot.ts";

export * as providers from "./providers";

export const messariCopilotPlugin: Plugin = {
    name: "messari-copilot",
    description: "Messari Copilot",
    actions: [],
    providers: [copilotProvider],
};
