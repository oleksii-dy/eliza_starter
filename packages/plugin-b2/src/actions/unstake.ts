import {
    Action,
    ActionExample,
    IAgentRuntime,
    generateObjectDeprecated,
    Memory,
    State,
    HandlerCallback,
    elizaLogger,
    composeContext,
    ModelClass,
} from "@elizaos/core";
import { getTxReceipt, unstake } from "../utils";
import { Hash } from "viem";
import { validateB2NetworkConfig } from "../environment";
import { unstakeTemplate } from "../templates";
import { WalletProvider } from "../providers";
import { UnstakeParams } from "../types";
import { initWalletProvider } from "../providers";
import { FARM_ADDRESS } from "../utils/constants";

// Exported for tests
export class UnstakeAction {

    constructor(private walletProvider: WalletProvider) {}

    async unstake(params: UnstakeParams): Promise<Hash> {
        try {
            let balance = await this.walletProvider.getNativeBalance(this.walletProvider.getAddress());
            if ( balance == 0 ) {
                throw new Error(`The total cost (gas * gas fee + value) of executing this transaction exceeds the balance of the account.`);
            }
            let txHash = await unstake(
                this.walletProvider,
                FARM_ADDRESS,
                params.amount,
            );
            return txHash;
        } catch(error) {
            console.log(`Unstake failed: ${error.message}`);
            throw new Error(`Unstake failed: ${error.message}`);
            // throw new Error(`Unstake failed: The total cost (gas * gas fee + value) of executing this transaction exceeds the balance of the account.`)
        }
    }

    async txReceipt(tx: Hash) {
        const receipt = await getTxReceipt(this.walletProvider, tx);
        if (receipt.status === "success") {
            return true;
        } else {
            return false;
        }
    }

    async buildUnstakeDetails(
        state: State,
        runtime: IAgentRuntime,
        wp: WalletProvider
    ): Promise<UnstakeParams> {
        const context = composeContext({
            state,
            template: unstakeTemplate,
        });

        const unstakeDetails = (await generateObjectDeprecated({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
        })) as UnstakeParams;

        return unstakeDetails;
    }
}

export const unstakeAction: Action = {
    name: "UNSTAKE",
    similes: [
        "UNSTAKE_BTC_ON_B2",
        "UNSTAKE_NATIVE_BTC_ON_B2",
        "UNSTAKE_BTC_ON_B2",
        "UNSTAKE_NATIVE_BTC_ON_B2",
    ],
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        await validateB2NetworkConfig(runtime);
        return true;
    },
    description:
        "unstake native btc.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting UNSTAKE handler...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        console.log("unstake action handler called");
        const walletProvider = await initWalletProvider(runtime);
        const action = new UnstakeAction(walletProvider);

        // Compose unstake context
        const paramOptions = await action.buildUnstakeDetails(
            state,
            runtime,
            walletProvider
        );

        elizaLogger.debug("Unstake paramOptions:", paramOptions);

        let txHash = await action.unstake(paramOptions);
        if (txHash) {
            let result = await action.txReceipt(txHash);
            if (result) {
                callback?.({
                    text: "unstake successful",
                    content: { success: true, txHash: txHash },
                });
            } else {
                callback?.({
                    text: "unstake failed",
                    content: { error: "Unstake failed" },
                });
            }
        } else {
            callback?.({
                text: "unstake failed",
                content: { error: "Unstake failed" },
            });
        }
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Unstake 1 B2-BTC",
                },
            },
        ],
    ] as ActionExample[][],
};
