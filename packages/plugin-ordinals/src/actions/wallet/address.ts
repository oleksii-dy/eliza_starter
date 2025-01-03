import {
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    type Action,
    elizaLogger,
    generateObject,
    ModelClass,
    composeContext,
    Content,
} from "@elizaos/core";
import { WalletProvider, walletProvider } from "../../providers/wallet";

export default {
    name: "ORDINALS_GET_ADDRESS",
    similes: ["GET_ORDINALS_ADDRESS", "RETRIEVE_ORDINALS_TAPROOT_ADDRESS"],
    validate: async () => {
        return true;
    },
    description: "Retrieves the agents Ordinals taproot address",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            const wallet: WalletProvider = await walletProvider.get(
                runtime,
                message,
                state
            );
            const addresses = wallet.getAddresses();

            elizaLogger.success(
                `Retrieved ordinals taproot address: ${addresses.taprootAddress}`
            );

            const taprootAddress = addresses?.taprootAddress;
            const paymentWallet = addresses.nestedSegwitAddress;

            callback({
                text: `Your ordinals/taproot address is: ${taprootAddress} and your payment wallet is: ${paymentWallet}`,
            });

            return true;
        } catch (error) {
            elizaLogger.error("Error during address retrieval:", error);
            callback({
                text: `Error during address retrieval: ${error.message}`,
                error: true,
                content: { error: error.message },
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What is my ordinals address?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Your ordinals address is: bc1p7sqrqnu55k4xedm5585vg8du3jueldvkps8nc96sqv353punzdhq4yg0ke.",
                    action: "ORDINALS_GET_ADDRESS",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Hey, what is my taproot address?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Your taproot address is: bc1p7sqrqnu55k4xedm5585vg8du3jueldvkps8nc96sqv353punzdhq4yg0ke.",
                    action: "ORDINALS_GET_ADDRESS",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
