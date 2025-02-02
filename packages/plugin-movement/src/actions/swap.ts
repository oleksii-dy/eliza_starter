import { elizaLogger } from "@elizaos/core";
import {
    type ActionExample,
    type Content,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    type Action,
} from "@elizaos/core";
import { composeContext } from "@elizaos/core";
import { generateObjectDeprecated } from "@elizaos/core";
import {
    Account,
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    Network,
    PrivateKey,
    PrivateKeyVariants,
} from "@aptos-labs/ts-sdk";
import { walletProvider } from "../providers/wallet";
import {
    MOVEMENT_NETWORK_CONFIG,
    MOVE_DECIMALS,
    MOVEMENT_EXPLORER_URL,
    SWAP_ADDRESS,
    SWAP_ADDRESS_MODULE,
    SWAP_ADDRESS_FUNCTION
} from "../constants";
import { formatTokenAmount } from "../types/token";

// Define Swap content interface
export interface SwapContent extends Content {
    inputToken: string;
    outputToken: string;
    inputAmount: string | number;
    outputAmount: string | number;
}

// Validate Swap content
function isSwapContent(content: unknown): content is SwapContent {
    elizaLogger.debug("Validating swap content:", content);
    return (
        typeof (content as SwapContent).inputToken === "string" &&
        typeof (content as SwapContent).outputToken === "string" &&
        (typeof (content as SwapContent).inputAmount === "string" ||
            typeof (content as SwapContent).inputAmount === "number") &&
        (typeof (content as SwapContent).outputAmount === "string" ||
            typeof (content as SwapContent).outputAmount === "number")
    );
}

// Swap template
const swapTemplate = `You are processing a token swap request. Extract the input token, output token, and amounts from the message.

Example request: "swap 1 move to yuzu"
Example response:
\`\`\`json
{
    "inputToken": "0x1::aptos_coin::AptosCoin",
    "outputToken": "0xbd9162ee6441fcf49652f0a50706279187e744aa4622a7c30bfeeaa18b7e4147::porto::YUZU",
    "inputAmount": "1",
    "outputAmount": "1"
}
\`\`\`

Rules:
1. The token addresses must be exact
2. The amounts are typically numbers less than 100
3. Return exact values found in the message

Recent messages:
{{recentMessages}}

Extract and return ONLY the following in a JSON block:
- inputToken: The input token address
- outputToken: The output token address
- inputAmount: The amount of input tokens
- outputAmount: The amount of output tokens

Return ONLY the JSON block with these fields.`;

export default {
    name: "SWAP_MOVE",
    similes: ["SWAP_TOKEN", "EXCHANGE_TOKEN", "TRADE_TOKEN"],
    triggers: [
        "swap move",
        "swap 1 move",
        "exchange move",
        "trade move",
        "swap token",
        "can you swap",
        "please swap",
        "swap",
    ],
    shouldHandle: (message: Memory) => {
        const text = message.content?.text?.toLowerCase() || "";
        return text.includes("swap") && text.includes("move");
    },
    validate: async (_runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.debug(
            "Starting swap validation for user:",
            message.userId
        );
        elizaLogger.debug("Message text:", message.content?.text);
        return true;
    },
    priority: 1000,
    description: "Swap Move tokens for other tokens on Movement Network",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.debug("Starting SWAP_MOVE handler...");
        elizaLogger.debug("Message:", {
            text: message.content?.text,
            userId: message.userId,
            action: message.content?.action,
        });

        try {
            const privateKey = runtime.getSetting("MOVEMENT_PRIVATE_KEY");
            elizaLogger.debug(
                "Got private key:",
                privateKey ? "Present" : "Missing"
            );

            const network = runtime.getSetting("MOVEMENT_NETWORK");
            elizaLogger.debug("Network config:", network);

            const movementAccount = Account.fromPrivateKey({
                privateKey: new Ed25519PrivateKey(
                    PrivateKey.formatPrivateKey(
                        privateKey,
                        PrivateKeyVariants.Ed25519
                    )
                ),
            });

            const aptosClient = new Aptos(
                new AptosConfig({
                    network: Network.CUSTOM,
                    fullnode: MOVEMENT_NETWORK_CONFIG[network].fullnode,
                })
            );

            const walletInfo = await walletProvider.get(
                runtime,
                message,
                state
            );
            state.walletInfo = walletInfo;

            // Initialize or update state
            let currentState: State;
            if (!state) {
                currentState = (await runtime.composeState(message)) as State;
            } else {
                currentState = await runtime.updateRecentMessageState(state);
            }

            // Compose swap context
            const swapContext = composeContext({
                state: currentState,
                template: swapTemplate,
            });

            // Generate swap content
            const content = await generateObjectDeprecated({
                runtime,
                context: swapContext,
                modelClass: ModelClass.SMALL,
            });

            // Validate swap content
            if (!isSwapContent(content)) {
                console.error("Invalid content for SWAP_MOVE action.");
                if (callback) {
                    callback({
                        text: "Unable to process swap request. Invalid content provided.",
                        content: { error: "Invalid swap content" },
                    });
                }
                return false;
            }

            // Build transaction
            const tx = await aptosClient.transaction.build.simple({
                sender: movementAccount.accountAddress.toStringLong(),
                data: {
                    function: `${SWAP_ADDRESS[network]}::${SWAP_ADDRESS_MODULE}::${SWAP_ADDRESS_FUNCTION}`,
                    typeArguments: [content.inputToken, content.outputToken],
                    functionArguments: [
                        formatTokenAmount(content.inputAmount, MOVE_DECIMALS),
                        formatTokenAmount(content.outputAmount, MOVE_DECIMALS)
                    ],
                },
            });

            // Sign and submit transaction
            const committedTransaction = await aptosClient.signAndSubmitTransaction({
                signer: movementAccount,
                transaction: tx,
            });

            // Wait for transaction completion
            const executedTransaction = await aptosClient.waitForTransaction({
                transactionHash: committedTransaction.hash,
            });

            const explorerUrl = `${MOVEMENT_EXPLORER_URL}/${executedTransaction.hash}?network=${MOVEMENT_NETWORK_CONFIG[network].explorerNetwork}`;
            elizaLogger.debug("Swap successful:", {
                hash: executedTransaction.hash,
                inputAmount: content.inputAmount,
                outputAmount: content.outputAmount,
                explorerUrl,
            });

            if (callback) {
                callback({
                    text: `Successfully swapped ${content.inputAmount} ${content.inputToken} for ${content.outputAmount} ${content.outputToken}\nTransaction: ${executedTransaction.hash}\nView on Explorer: ${explorerUrl}`,
                    content: {
                        success: true,
                        hash: executedTransaction.hash,
                        inputAmount: content.inputAmount,
                        outputAmount: content.outputAmount,
                        inputToken: content.inputToken,
                        outputToken: content.outputToken,
                        explorerUrl,
                    },
                });
            }

            return true;
        } catch (error) {
            console.error("Error during token swap:", error);
            if (callback) {
                callback({
                    text: `Error swapping tokens: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "can you swap 1 move to yuzu",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll help you swap 1 Move token for Yuzu...",
                    action: "SWAP_MOVE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "swap 1 move for yuzu",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Processing Move token swap...",
                    action: "SWAP_MOVE",
                },
            },
        ],
    ] as ActionExample[][],
} as Action; 