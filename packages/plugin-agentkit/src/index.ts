import type { Plugin } from "@ai16z/eliza";
import { walletProvider } from "./provider";

export const agentKitPlugin: Plugin = {
    name: "[AgentKit] Integration",
    description: "AgentKit integration plugin",
    providers: [walletProvider],
    evaluators: [],
    services: [],
    actions: [],
};

export default agentKitPlugin;
