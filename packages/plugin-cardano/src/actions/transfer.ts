import { Assert, Assets, LucidEvolution } from "@lucid-evolution/lucid";
import {
    type Action,
    type ActionExample,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    generateTrueOrFalse,
    composeContext,
    booleanFooter,
    type State,
    elizaLogger,
    HandlerCallback,
    generateObjectDeprecated,
} from "@elizaos/core-plugin-v1";
import { transferTemplate } from "../templates";
import { SupportedChain, TransferParams, TransferResponse } from "../types";
import { cardanoWalletProvider, initWalletProvider } from "../providers";

export { transferTemplate };

export class TransferAction {
    constructor(private lucid: LucidEvolution) { }

    async transfer(params: TransferParams): Promise<TransferResponse> {
        elizaLogger.debug("Starting transfer with params:", JSON.stringify(params, null, 2));
        const { chain, toAddress, token, amount, data } = params;
        const resp: TransferResponse = {
            chain: params.chain,
            txHash: "0x",
            recipient: params.toAddress,
            amount: "",
            token: params.token,
        };

        const asset: Assets = { lovelace: BigInt(2_000_000) }
        const tx = await this.lucid
            .newTx()
            .pay.ToAddress(toAddress, asset)
            .complete()
        const signedTx = await tx.sign.withWallet().complete();
        const txHash = await signedTx.submit();
        resp.amount = amount;
        resp.txHash = txHash
        await this.lucid.awaitTx(txHash);
        return resp
    }
}

// Transfer 0.001 ADA to addr_test1qprwmyvl6wxchsh0kv88ycdjhz26ayahklzdsn47q734rgsxv77tvavhjleu635ak496qmuf0u7eqhmhlwkcuxh6zlcqh423ej
export const transferAction: Action = {
    name: "TRANSFER",
    similes: ["TRANSFER", "SEND_TOKENS", "TOKEN_TRANSFER", "MOVE_TOKENS"],
    description: "Transfer tokens between addresses on the same chain",
    suppressInitialMessage: true,
    template: transferTemplate,
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: Record<string, unknown>,
        callback?: HandlerCallback) => {
        elizaLogger.log("Starting transfer action...");

        callback?.({
            text: 'LOL'
        });

        // Initialize or update state
        let currentState = state;
        if (!currentState) {
            currentState = (await runtime.composeState(message)) as State;
        } else {
            currentState = await runtime.updateRecentMessageState(currentState);
        }

        // Compose transfer context
        const transferContext = composeContext({
            state: state,
            template: transferTemplate,
        });
        const content = await generateObjectDeprecated({
            runtime,
            context: transferContext,
            modelClass: ModelClass.LARGE,
        });

        try {
            currentState.chain = content.chain;
            state.walletInfo = await cardanoWalletProvider.get(
                runtime,
                message,
                currentState
            );
            elizaLogger.debug("Wallet info:", state.walletInfo);
        } catch (error) {
            elizaLogger.error("Error getting wallet info:", error.message);
        }

        console.log({ content });

        const token = content.token || 'ADA'
        const walletProvider: LucidEvolution = await initWalletProvider(runtime, content.chain);
        const action = new TransferAction(walletProvider);
        const paramOptions: TransferParams = {
            chain: content.chain,
            token: token,
            amount: content.amount,
            toAddress: content.toAddress,
            data: '0x',
        };

        try {
            elizaLogger.debug("Calling transfer with params:", JSON.stringify(paramOptions, null, 2));

            const transferResp = await action.transfer(paramOptions);
            callback?.({
                text: `Successfully transferred ${transferResp.amount} ${transferResp.token} to ${transferResp.recipient}\nTransaction Hash: ${transferResp.txHash}`,
                content: { ...transferResp },
            });

            return true;
        } catch (error) {
            elizaLogger.error("Error during transfer:", error.message);
            // Enhanced error diagnosis
            const errorMessage = error.message;
            callback?.({
                text: `Transfer failed: ${errorMessage}`,
                content: { error: errorMessage },
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Transfer 0.001 ADA to 0x2CE4EaF47CACFbC6590686f8f7521e0385822334",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you transfer 0.001 ADA to 0x2CE4EaF47CACFbC6590686f8f7521e0385822334 on Cardano",
                    action: "TRANSFER",
                    content: {
                        chain: "cardano",
                        token: "ADA",
                        amount: "1",
                        toAddress: "0x2CE4EaF47CACFbC6590686f8f7521e0385822334",
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Transfer 1 token of 0x1234 to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you transfer 1 token of 0x1234 to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Cardano",
                    action: "TRANSFER",
                    content: {
                        chain: "cardano",
                        token: "0x1234",
                        amount: "1",
                        toAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                    },
                },
            },
        ],
    ] as ActionExample[][],
} as Action;