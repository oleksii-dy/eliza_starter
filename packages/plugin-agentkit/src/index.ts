import { AgentKitService } from "./services/AgentKitService";
import { CustodialWalletService } from "./services/CustodialWalletService";
import { walletProvider } from "./provider";
import { getAgentKitActions, createAgentKitActionsFromService } from "./actions";
import { custodialWalletActions } from "./actions/custodial-wallet";
import { custodialWalletRoutes } from "./api/walletRoutes";
import type { Plugin, IAgentRuntime } from "./types/core";
import { AgentKitTestSuite } from "./__tests__/e2e/agentkit.test";
import { CustodialWalletTestSuite } from "./__tests__/e2e/custodial-wallet.test";
import { AgentKitUserScenariosTestSuite } from "./__tests__/e2e/user-scenarios.test";
import { agentKitRoutes } from "./routes";

export const agentKitPlugin: Plugin = {
    name: "@elizaos/plugin-agentkit",
    description: "AgentKit plugin for ElizaOS",
    
    services: [AgentKitService],
    
    providers: [walletProvider],
    
    routes: custodialWalletRoutes,
    
    tests: [new AgentKitTestSuite(), new CustodialWalletTestSuite(), new AgentKitUserScenariosTestSuite()],
    
    actions: getAgentKitActions(),
    
    async init(config: Record<string, string>, runtime: IAgentRuntime): Promise<void> {
        console.log("\n┌════════════════════════════════════════┐");
        console.log("│          AGENTKIT PLUGIN               │");
        console.log("├────────────────────────────────────────┤");
        console.log("│  Initializing AgentKit Plugin...       │");
        console.log("│  Version: 0.0.1                        │");
        console.log("└════════════════════════════════════════┘");

        // Register custodial wallet service manually (it's optional)
        try {
            await runtime.registerService(CustodialWalletService);
        } catch (error) {
            console.warn("⚠️ Failed to register Custodial Wallet service:", error instanceof Error ? error.message : String(error));
            console.log("This is expected if wallet encryption passphrase is not configured");
        }

        // Register actions dynamically when service is available
        const agentKitService = runtime.getService<AgentKitService>("agentkit");
        if (agentKitService && agentKitService.isReady()) {
            const dynamicActions = await createAgentKitActionsFromService(runtime);
            dynamicActions.forEach(action => {
                runtime.registerAction(action);
            });
            console.log(`✅ Registered ${dynamicActions.length} AgentKit actions`);
        } else {
            console.warn("⚠️ AgentKit service not available - actions will not be registered");
        }

        // Register custodial wallet actions if service is available
        const custodialService = runtime.getService<CustodialWalletService>("custodial-wallet");
        if (custodialService && custodialService.isReady()) {
            custodialWalletActions.forEach(action => {
                runtime.registerAction(action);
            });
            console.log(`✅ Registered ${custodialWalletActions.length} custodial wallet actions`);
        } else {
            console.warn("⚠️ Custodial Wallet service not available - custodial actions will not be registered");
        }
    },
};

export default agentKitPlugin;
