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
    generateObject,
    ModelClass,
    Content,
} from "@elizaos/core";
import { getTxReceipt, sendNativeAsset, sendToken } from "../utils";
import { Address, Hash } from "viem";
import { validateB2NetworkConfig } from "../environment";
import { transferTemplate } from "../templates";
import { B2WalletProvider } from "../providers";
import { Transaction, TransferParams } from "../types";
import { initWalletProvider } from "../providers";

// Exported for tests
export class TransferAction {

    constructor(private walletProvider: B2WalletProvider) {}

    async transfer(params: TransferParams): Promise<Transaction> {
        let txHash;
        if (params.tokenAddress === "0x0000000000000000000000000000000000000000") {
            txHash = await sendNativeAsset(
                this.walletProvider,
                params.recipient as Address,
                params.amount as number
            );
        } else {
            txHash = await sendToken(
                this.walletProvider,
                params.tokenAddress as Address,
                params.recipient as Address,
                params.amount as number
            );
        }
        return {
            hash: txHash,
            from: this.walletProvider.getAddress(),
            tokenAddress: params.tokenAddress,
            recipient: params.recipient,
            amount: params.amount,
        };
    }

    async transferTxReceipt(tx: Hash) {
        const receipt = await getTxReceipt(this.walletProvider, tx);
        if (receipt.status === "success") {
            return true;
        } else {
            return false;
        }
    }

    async isTransferContent(content: any): Promise<boolean> {
        elizaLogger.debug("Content for transfer", content);
        return (
            typeof content.tokenAddress === "string" &&
            typeof content.recipient === "string" &&
            (typeof content.amount === "string" ||
                typeof content.amount === "number")
        );
    }
}


export const buildTransferDetails = async (
    state: State,
    runtime: IAgentRuntime,
    wp: B2WalletProvider
): Promise<TransferParams> => {
    const context = composeContext({
        state,
        template: transferTemplate,
    });

    const transferDetails = (await generateObjectDeprecated({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
    })) as TransferParams;

    return transferDetails;
};

export interface TransferContent extends Content {
    tokenAddress: string;
    recipient: string;
    amount: string | number;
}

export const transferAction: Action = {
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

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        console.log("Transfer action handler called");
        const walletProvider = await initWalletProvider(runtime);
        const action = new TransferAction(walletProvider);

        // Compose transfer context
        const paramOptions = await buildTransferDetails(
            state,
            runtime,
            walletProvider
        );

        elizaLogger.debug("Transfer paramOptions:", paramOptions);

        let tx = await action.transfer(paramOptions);
        if (tx) {
            let result = await action.transferTxReceipt(tx.hash);
            if (result) {
                callback?.({
                    text: "transfer successful",
                    content: { success: true, txHash: tx.hash },
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
};
