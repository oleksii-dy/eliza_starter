import {
    Action,
    ActionExample,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    elizaLogger,
    composeContext,
    generateObject,
    ModelClass,
    Content,
} from "@elizaos/core";
import { getTxReceipt, sendNativeAsset, sendToken } from "../utils";
import { Address } from "viem";
import { validateB2NetworkConfig } from "../environment";
import { transferTemplate } from "../templates";


export interface TransferContent extends Content {
    tokenAddress: string;
    recipient: string;
    amount: string | number;
}

function isTransferContent(
    runtime: IAgentRuntime,
    content: any
): content is TransferContent {
    elizaLogger.debug("Content for transfer", content);
    return (
        typeof content.tokenAddress === "string" &&
        typeof content.recipient === "string" &&
        (typeof content.amount === "string" ||
            typeof content.amount === "number")
    );
}


export default {
    name: "SEND_TOKEN",
    similes: [
        "TRANSFER_TOKEN_ON_B2",
        "TRANSFER_TOKENS_ON_B2",
        "SEND_TOKENS_ON_B2",
        "SEND_AVAX_ON_B2",
        "PAY_ON_B2",
    ],
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        await validateB2NetworkConfig(runtime);
        return true;
    },
    description:
        "MUST use this action if the user requests send a token or transfer a token, the request might be varied, but it will always be a token transfer.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting SEND_TOKEN handler...");

        // Validate transfer
        if (message.content.source === "direct") {
            //
        } else {
            callback?.({
                text: "i can't do that for you.",
                content: { error: "Transfer not allowed" },
            });
            return false;
        }

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose transfer context
        const transferContext = composeContext({
            state,
            template: transferTemplate,
        });

        // Generate transfer content
        const content = await generateObject({
            runtime,
            context: transferContext,
            modelClass: ModelClass.SMALL,
        });

        elizaLogger.debug("Transfer content:", content);

        // Validate transfer content
        if (!isTransferContent(runtime, content)) {
            elizaLogger.error("Invalid content for TRANSFER_TOKEN action.");
            callback?.({
                text: "Unable to process transfer request. Invalid content provided.",
                content: { error: "Invalid transfer content" },
            });
            return false;
        }

        let tx;
        if (
            content.tokenAddress ===
            "0x0000000000000000000000000000000000000000"
        ) {
            tx = await sendNativeAsset(
                runtime,
                content.recipient as Address,
                content.amount as number
            );
        } else {
            tx = await sendToken(
                runtime,
                content.tokenAddress as Address,
                content.recipient as Address,
                content.amount as number
            );
        }

        if (tx) {
            const receipt = await getTxReceipt(runtime, tx);
            if (receipt.status === "success") {
                callback?.({
                    text: "transfer successful",
                    content: { success: true, txHash: tx },
                });
            } else {
                callback?.({
                    text: "transfer failed",
                    content: { error: "Transfer failed" },
                });
            }
        } else {
            callback?.({
                text: "transfer failed",
                content: { error: "Transfer failed" },
            });
        }

        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 1 B2-BTC to 0x4f9e2dc50B4Cd632CC2D24edaBa3Da2a9338832a",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
