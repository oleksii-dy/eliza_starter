import {
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    type Action,
    elizaLogger,
    composeContext,
    ModelClass,
    generateObject,
} from "@elizaos/core";
import { WalletProvider, walletProvider } from "../../providers/wallet";
import { transactionHashTemplate } from "../../templates";
import { z } from "zod";

export const transactionIdSchema = z.object({
    txid: z.string().toLowerCase(),
});

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
            elizaLogger.info(state.recentMessages);
            const wallet: WalletProvider = await walletProvider.get(
                runtime,
                message,
                state
            );

            const context = composeContext({
                state,
                template: transactionHashTemplate,
            });

            const content: { object: { txid?: string | null } } =
                await generateObject({
                    runtime,
                    context,
                    schema: transactionIdSchema,
                    modelClass: ModelClass.LARGE,
                });

            const txid = content?.object?.txid;

            if (!txid || txid?.length !== 64) {
                throw new Error("Unable to find the txid.");
            }

            const status = await wallet.getTransactionStatus(txid);
            const isConfirmed = status?.confirmed;

            callback({
                text: `The status of the transaction is: ${isConfirmed ? `✅ Confirmed @ block ${status?.block_height}` : "⏳ Unconfirmed"}`,
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
