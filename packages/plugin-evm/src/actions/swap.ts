import type { IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { ChainId, executeRoute, getRoutes } from "@lifi/sdk";

import { BaseLifiAction } from "./baseLifi";
import { getChainConfigs, WalletProvider } from "../providers/wallet";
import { swapTemplate } from "../templates";
import type { SwapParams, Transaction } from "../types";

export { swapTemplate };

export class SwapAction extends BaseLifiAction {
    async swap(params: SwapParams): Promise<Transaction> {
        const walletClient = this.walletProvider.getWalletClient();
        const [fromAddress] = await walletClient.getAddresses();

        const routes = await getRoutes({
            fromChainId: getChainConfigs(this.walletProvider.runtime)[
                params.chain
            ].chainId as ChainId,
            toChainId: getChainConfigs(this.walletProvider.runtime)[
                params.chain
            ].chainId as ChainId,
            fromTokenAddress: params.fromToken,
            toTokenAddress: params.toToken,
            fromAmount: params.amount,
            fromAddress: fromAddress,
            options: {
                slippage: params.slippage || 0.5,
                order: "RECOMMENDED",
            },
        });

        if (!routes.routes.length) throw new Error("No routes found");

        const execution = await executeRoute(routes.routes[0], this.config);
        const process = execution.steps[0]?.execution?.process[0];

        if (!process?.status || process.status === "FAILED") {
            throw new Error("Transaction failed");
        }

        return {
            hash: process.txHash as `0x${string}`,
            from: fromAddress,
            to: routes.routes[0].steps[0].estimate
                .approvalAddress as `0x${string}`,
            value: BigInt(params.amount),
            data: process.data as `0x${string}`,
            chainId: getChainConfigs(this.walletProvider.runtime)[params.chain]
                .chainId,
        };
    }
}

export const swapAction = {
    name: "swap",
    description: "Swap tokens on the same chain",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback?: any
    ) => {
        try {
            const walletProvider = new WalletProvider(runtime);
            const action = new SwapAction(walletProvider);
            return await action.swap(options);
        } catch (error) {
            console.error("Error in swap handler:", error.message);
            if (callback) {
                callback({ text: `Error: ${error.message}` });
            }
            return false;
        }
    },
    template: swapTemplate,
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Swap 1 ETH for USDC on Base",
                    action: "TOKEN_SWAP",
                },
            },
        ],
    ],
    similes: ["TOKEN_SWAP", "EXCHANGE_TOKENS", "TRADE_TOKENS"],
}; // TODO: add more examples
