import type { Provider, IAgentRuntime, ProviderResult, Memory, State } from "./types/core";
import type { AgentKitService } from "./services/AgentKitService";

export const walletProvider: Provider = {
    name: "agentKitWallet",
    description: "Provides AgentKit wallet information",
    async get(runtime: IAgentRuntime, message: Memory, state: State): Promise<ProviderResult> {
        try {
            const agentKitService = runtime.getService<AgentKitService>("agentkit");
            
            if (!agentKitService || !agentKitService.isReady()) {
                return {
                    text: "[AgentKit] Service not initialized",
                    values: { walletAddress: null }
                };
            }

            const agentKit = agentKitService.getAgentKit();
            if (!agentKit) {
                return {
                    text: "[AgentKit] AgentKit not initialized",
                    values: { walletAddress: null }
                };
            }
            
            let address = "Unknown";
            let networkInfo = "";
            
            try {
                // The new SDK might expose wallet information differently
                // Try to access through various possible interfaces
                const agentKitAny = agentKit as any;
                
                if (agentKitAny.wallet?.address) {
                    address = agentKitAny.wallet.address;
                } else if (agentKitAny.walletProvider?.getAddress) {
                    address = await agentKitAny.walletProvider.getAddress();
                } else if (agentKitAny.getWalletAddress) {
                    address = await agentKitAny.getWalletAddress();
                }
                
                // Try to get network information
                if (agentKitAny.walletProvider?.getNetwork) {
                    const network = await agentKitAny.walletProvider.getNetwork();
                    networkInfo = `\nNetwork: ${network}`;
                }
            } catch (error) {
                console.log("[AgentKit Provider] Error accessing wallet info:", error);
            }

            return {
                text: `[AgentKit] Wallet address: ${address}${networkInfo}`,
                values: { 
                    walletAddress: address,
                    network: networkInfo ? networkInfo.replace('\nNetwork: ', '') : undefined
                }
            };
        } catch (error) {
            console.error("[AgentKit Provider] Error:", error);
            return {
                text: `[AgentKit] Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                values: { walletAddress: null, error: true }
            };
        }
    },
};
