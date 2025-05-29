import { LucidEvolution } from "@lucid-evolution/lucid";
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
import { getBalanceTemplate } from "../templates";
import { GetBalanceParams, GetBalanceResponse } from "../types";
import { cardanoWalletProvider, initWalletProvider } from "../providers";
import { DEFAULT_SUPPORT_CHAINS } from "../environment";

export { getBalanceTemplate };

export class GetBalanceAction {
    constructor(private lucid: LucidEvolution) { }

    async getBalance(params: GetBalanceParams): Promise<GetBalanceResponse> {
        elizaLogger.debug("Get balance params:", params);
        const { chain, address, token } = params;
        if (!address) {
            throw new Error("Address is required for getting balance");
        }
        const resp: GetBalanceResponse = {
            chain,
            address,
        };
        const utxos = await this.lucid.utxosAt(address)
        const totalLovelace = utxos.reduce((sum, utxo) => sum + utxo.assets.lovelace, 0n);
        resp.balance = { token, amount: (Number(totalLovelace) / 10 ** 6).toString() };
        return resp;
    }
}

// Get the ADA balance of 0x1234567890 on Cardano.
export const getBalanceAction: Action = {
    name: "GET_BALANCE",
    similes: ["GET_BALANCE", "CHECK_BALANCE"],
    description: "Get balance of a token or all tokens for the given address",
    suppressInitialMessage: true,
    template: getBalanceTemplate,
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: Record<string, unknown>,
        callback?: HandlerCallback) => {
        elizaLogger.log("Starting getBalance action...");

        // Initialize or update state
        let currentState = state;
        if (!currentState) {
            currentState = (await runtime.composeState(message)) as State;
        } else {
            currentState = await runtime.updateRecentMessageState(currentState);
        }

        // Compose get balance context
        const getBalanceContext = composeContext({
            state: state,
            template: getBalanceTemplate,
        });
        const content = await generateObjectDeprecated({
            runtime,
            context: getBalanceContext,
            modelClass: ModelClass.LARGE,
        });
        currentState.chain = content.chain;

        state.walletInfo = await cardanoWalletProvider.get(
            runtime,
            message,
            currentState
        );
        elizaLogger.debug("Wallet info:", state.walletInfo);

        console.log({ content });
        const walletProvider: LucidEvolution = await initWalletProvider(runtime, content.chain);
        const action = new GetBalanceAction(walletProvider);
        const getBalanceOptions: GetBalanceParams = {
            chain: content.chain,
            address: content.address,
            token: content.token,
        };

        try {
            const getBalanceResponse = await action.getBalance(getBalanceOptions);
            const textNetwork = content.chain === DEFAULT_SUPPORT_CHAINS.CARDANO
                ? 'Cardano Mainnet'
                : 'Cardano Preprod';
            let text = `No balance found for ${getBalanceOptions.address} on ${textNetwork}`;
            if (getBalanceResponse.balance) {
                text = `Balance of ${getBalanceResponse.address} on ${textNetwork}:\n${getBalanceResponse.balance.amount} ${getBalanceResponse.balance.token}`;
            }

            callback?.({
                text,
                content: { ...getBalanceResponse },
            });
            return true
        } catch (error) {
            elizaLogger.error("Error during get balance:", error);
            // Provide more user-friendly error messages based on error type
            const userMessage = `Get balance failed: ${error.message}`;
            callback?.({
                text: userMessage,
                content: {
                    error: error.message,
                    chain: getBalanceOptions.chain,
                    token: getBalanceOptions.token
                },
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Check my balance of ADA",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you check your balance of ADA",
                    action: "GET_BALANCE",
                    content: {
                        chain: "cardano",
                        address: "{{walletAddress}}",
                        token: "ADA",
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Check my balance of token ADA",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you check your balance of token ADA",
                    action: "GET_BALANCE",
                    content: {
                        chain: "cardano",
                        address: "{{walletAddress}}",
                        token: "ADA",
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Get ADA balance of 0x1234",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you check ADA balance of 0x1234",
                    action: "GET_BALANCE",
                    content: {
                        chain: "cardano",
                        address: "0x1234",
                        token: "ADA",
                    },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Check my wallet balance on Cardano",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "I'll help you check your wallet balance on Cardano",
                    action: "GET_BALANCE",
                    content: {
                        chain: "cardano",
                        address: "{{walletAddress}}",
                        token: undefined,
                    },
                },
            },
        ],
    ] as ActionExample[][],
} as Action;