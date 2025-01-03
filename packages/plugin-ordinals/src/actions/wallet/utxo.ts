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
    name: "ORDINALS_GET_UTXOS",
    similes: ["GET_ORDINALS_UTXO", "RETRIEVE_ORDINALS_UTXO"],
    validate: async () => {
        return true;
    },
    description:
        "Retrieves the amount of UTXOs and their sats available in the Agents ordinals payment address",
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
            const paymentWallet = addresses.nestedSegwitAddress;

            const utxos = await wallet.getUtxos(paymentWallet);

            callback({
                text: `In your payments wallet: ${paymentWallet}\n\nYou currently have the following UTXO's:\n\n${utxos.map((item, idx) => `${idx}: ${item.vout} - ${item.value} sats\n\n`)}`,
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
                    text: "How many utxos do I have?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "You have the following utxo's available:",
                    action: "ORDINALS_GET_UTXOS",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Hey, what utxos do I have available?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "You have the following utxo's available:",
                    action: "ORDINALS_GET_UTXOS",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
