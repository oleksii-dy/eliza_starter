import {
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    type Action,
    elizaLogger,
} from "@elizaos/core";
import { WalletProvider, walletProvider } from "../../providers/wallet";
import { formatBitcoinBalance } from "../../utils";

export default {
    name: "ORDINALS_GET_BALANCE",
    similes: ["GET_ORDINALS_BALANCE", "RETRIEVE_ORDINALS_BALANCE"],
    validate: async () => {
        return true;
    },
    description:
        "Retrieves the agents Ordinals wallet's payment wallet's BTC balance.",
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
            const balance = await wallet.getBalance();
            const paymentWallet = addresses.nestedSegwitAddress;

            /** Format Bitcoin balance so it doesn't appear as sats */
            const formattedBalance = formatBitcoinBalance(balance);

            callback({
                text: `You have a balance of ${String(formattedBalance)} BTC on your payment wallet: ${paymentWallet}`,
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
                    text: "What is my ordinals balance?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Your ordinals balance is: 0.01 BTC.",
                    action: "ORDINALS_GET_BALANCE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Hey, what is my ordinals balance?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "The balance on your payment wallet is: 0.02 BTC.",
                    action: "ORDINALS_GET_BALANCE",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
