import {
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    HandlerCallback,
    ModelClass,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";
import { parseEther, type Hex } from "viem";

import { initWalletProvider, WalletProvider } from "../providers/wallet";
import { faucetTemplate } from "../templates";
import { type FaucetParams } from "../types";

export { faucetTemplate };

// Exported for tests
export class FaucetAction {
    constructor(private walletProvider: WalletProvider) {}

    async faucet(params: FaucetParams): Promise<Hex> {
        if (params.chain !== "bscTestnet" && params.chain !== "opBNBTestnet") {
            throw new Error("Invalid chain");
        }

        this.walletProvider.switchChain(params.chain);
        try {
            const hash = await this.walletProvider.transfer(
                params.chain,
                params.toAddress,
                parseEther("0.3")
            );
            return hash;
        } catch (error) {
            throw new Error(`Transfer failed: ${error.message}`);
        }
    }
}

export const faucetAction = {
    name: "faucet",
    description: "Get test tokens from the faucet",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting faucet action...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose faucet context
        const faucetContext = composeContext({
            state,
            template: faucetTemplate,
        });
        const content = await generateObjectDeprecated({
            runtime,
            context: faucetContext,
            modelClass: ModelClass.LARGE,
        });

        const paramOptions: FaucetParams = {
            chain: content.chain,
            toAddress: content.toAddress,
        };

        const walletProvider = initWalletProvider(runtime);
        const action = new FaucetAction(walletProvider);
        try {
            const faucetResp = await action.faucet(paramOptions);
            callback?.({
                text: `Successfully transferred 0.3 tBNB to ${paramOptions.toAddress}\nTransaction Hash: ${faucetResp}`,
                content: {
                    hash: faucetResp,
                    recipient: paramOptions.toAddress,
                    chain: content.chain,
                },
            });

            return true;
        } catch (error) {
            elizaLogger.error("Error during get test tokens:", error);
            callback?.({
                text: `Error during get test tokens: ${error.message}`,
                content: { error: error.message },
            });
            return false;
        }
    },
    template: faucetTemplate,
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("BSC_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Request some test tokens from the faucet on BSC Testnet",
                    action: "FAUCET",
                },
            },
        ],
    ],
    similes: ["FAUCET", "GET_TEST_TOKENS"],
};
