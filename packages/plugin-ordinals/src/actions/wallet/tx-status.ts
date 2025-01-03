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
    name: "GET_BTC_TX_STATUS",
    similes: ["GET_TX_STATUS_BTC", "RETRIEVE_BTC_TX_STATUS"],
    validate: async () => {
        return true;
    },
    description: "Returns the status of a Bitcoin transaction hash",
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

            const txid =
                "06d39fa9ee4d864e602dcbee40fcbc78dff5fcfb65ec25cf3ac5c147be98d6c8";

            const status = await wallet.getTransactionStatus(txid);

            callback({
                text: `The status of the transaction is ${status?.confirmed ? `CONFIRMED @ [${status?.block_height}]` : "UNCONFIRMED"}`,
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
                    text: "What is the status of this Bitcoin transaction: 06d39fa9ee4d864e602dcbee40fcbc78dff5fcfb65ec25cf3ac5c147be98d6c8 ?",
                    action: "GET_BTC_TX_STATUS",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "The status of the transaction is: CONFIRMED",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Is this bitcoin transaction confirmed? 06d39fa9ee4d864e602dcbee40fcbc78dff5fcfb65ec25cf3ac5c147be98d6c8",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "The status of the transaction is: CONFIRMED",
                    action: "GET_BTC_TX_STATUS",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
