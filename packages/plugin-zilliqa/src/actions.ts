import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { sendETH } from "@goat-sdk/wallet-evm";
import { WalletClientBase } from "@goat-sdk/core";
import { plunderswap } from "@goat-sdk/plugin-plunderswap";
import { zilliqa } from "@goat-sdk/plugin-zilliqa";
import { ZilliqaWalletClientViemOnly } from "@goat-sdk/wallet-zilliqa";

import {
    generateText,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    composeContext,
    elizaLogger,
} from "@elizaos/core";

export async function getOnChainActions(
    evmWallet: WalletClientBase,
    zilliqaWallet: WalletClientBase,
    zilliqaEvmWallet: ZilliqaWalletClientViemOnly
) {
    const actionsWithoutHandler = [
        {
            name: "GET_BALANCE",
            description:
                "Retrieve the balance of a zilliqa account using the GET_ZILLIQA_ADDRESS_BALANCE tool or an evm account using the GET_BALANCE tool. Addresses may be expressed as a hex or bech32 address",
            similes: [],
            validate: async () => true,
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "Tell me the balance of account 0xf0cb24ac66ba7375bf9b9c4fa91e208d9eaabd2e",
                        },
                    },
                    {
                        user: "{{agentName}}",
                        content: {
                            text: "The balance of account 0xf0cb24ac66ba7375bf9b9c4fa91e208d9eaabd2e is 2.01 zil",
                            action: "GET_BALANCE",
                        },
                    },
                ],
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "Tell me the balance of the account zil17r9jftrxhfeht0umn386j83q3k0240fwn7g70g",
                        },
                    },
                    {
                        user: "{{agentName}}",
                        content: {
                            text: "The balance of account zil17r9jftrxhfeht0umn386j83q3k0240fwn7g70g is 18.05 zil",
                            action: "GET_BALANCE",
                        },
                    },
                ],
            ],
        },
        {
            name: "CONVERT",
            description:
                "Convert address formats from bech32 to hex using the CONVERT_FROM_BECH32 tool or from hex to bech32 using the CONVERT_TO_BECH32 tool. The addresses to be converted may be either evm or zilliqa",
            similes: [],
            validate: async () => true,
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "Convert 0xf0cb24ac66ba7375bf9b9c4fa91e208d9eaabd2e to bech32",
                        },
                    },
                    {
                        user: "{{agentName}}",
                        content: {
                            text: "The bech32 address for 0xf0cb24ac66ba7375bf9b9c4fa91e208d9eaabd2e is zil17r9jftrxhfeht0umn386j83q3k0240fwn7g70g",
                            action: "CONVERT",
                        },
                    },
                ],
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "Convert zil17r9jftrxhfeht0umn386j83q3k0240fwn7g70g to hex",
                        },
                    },
                    {
                        user: "{{agentName}}",
                        content: {
                            text: "The hex address for zil17r9jftrxhfeht0umn386j83q3k0240fwn7g70g is 0xf0cb24ac66ba7375bf9b9c4fa91e208d9eaabd2e",
                            action: "CONVERT",
                        },
                    },
                ],
            ],
        },
        {
            name: "TRANSFER",
            description:
                "Transfer funds from a Zilliqa address using TRANSFER_FROM_ZILLIQA_ADDRESS or from an EVM address using TRANSFER_FROM_EVM_ADDRESS. Addresses may be in either bech32 or hex format. Both kinds of transfer return the transaction id in hex.",
            similes: [],
            validate: async () => true,
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "Transfer 2 ZIL from the EVM address zil17r9jftrxhfeht0umn386j83q3k0240fwn7g70g to 0xf0cb24ac66ba7375bf9b9c4fa91e208d9eaabd2e",
                            action: "TRANSFER",
                        },
                    },
                ],
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "Transfer 2 ZIL from the Zilliqa address zil17r9jftrxhfeht0umn386j83q3k0240fwn7g70g to 0xf0cb24ac66ba7375bf9b9c4fa91e208d9eaabd2e",
                            action: "TRANSFER",
                        },
                    },
                ],
            ],
        },
        // 1. Add your actions here
    ];

    const actionsEvmWithoutHandler = [
        {
            name: "GET_SWAP_TOKENS",
            description:
                "Find out which tokens can be swapped using the GET_SWAP_QUOTE action.",
            similes: [],
            validate: async () => true,
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "Which tokens can I swap for other tokens?",
                        },
                    },
                    {
                        user: "{{agentName}}",
                        content: {
                            text: "You can ask for quotes on swapping zETH, FPS, HRSE, SEED, kUSD, stZIL, WZIL, and gZIL.",
                            action: "GET_SWAP_TOKENS",
                        },
                    },
                ],
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "Which tokens can I trade using PlunderSwap?",
                        },
                    },
                    {
                        user: "{{agentName}}",
                        content: {
                            text: "Liquidity may be available for exchanging zETH, FPS, HRSE, SEED, kUSD, stZIL, WZIL, and gZIL.",
                            action: "GET_SWAP_TOKENS",
                        },
                    },
                ],
            ],
        },
        {
            name: "GET_SWAP_BALANCE",
            description:
                "Find out how much I have of a token that I can swap using the GET_SWAP_QUOTE action.",
            similes: [],
            validate: async () => true,
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "How much SEED do I have for swapping?",
                        },
                    },
                    {
                        user: "{{agentName}}",
                        content: {
                            text: "You have 350.25 SEED that you could swap.",
                            action: "GET_SWAP_BALANCE",
                        },
                    },
                ],
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "What is all the tradable WZIL in my wallet?",
                        },
                    },
                    {
                        user: "{{agentName}}",
                        content: {
                            text: "You have 2,800 WZIL available for trading for another kind of coin.",
                            action: "GET_SWAP_BALANCE",
                        },
                    },
                ],
            ],
        },
         {
            name: "GET_SWAP_QUOTE",
            description:
                "Get a quote for swapping one token for another using the GET_SWAP_QUOTE action. Tokens must be as provided from the GET_SWAP_TOKENS tool and a quantity of the from token must be provided.",
            similes: [],
            validate: async () => true,
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "Tell me how many SEED I would get in exchange for 240 WZIL.",
                        },
                    },
                    {
                        user: "{{agentName}}",
                        content: {
                            text: "If you exchange 240 WZIL at the moment then you would expect to receive around 18.77584 SEED if you convert WZIL directly to SEED",
                            action: "GET_SWAP_QUOTE",
                        },
                    },
                ],
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "I want to swap 1500 HRSE for FPS. How many would I get?",
                        },
                    },
                    {
                        user: "{{agentName}}",
                        content: {
                            text: "At this time, you should get around 320.9 FPS for your HRSE if you convert HRSE to WZIL to FPS.",
                            action: "GET_SWAP_QUOTE",
                        },
                    },
                ],
            ],
        },
        {
            name: "PERFORM_SWAP",
            description:
                "Swapping one token for another using the PERFORM_SWAP action. Specify a minimum number of tokens to receive and where to deposit them to.",
            similes: [],
            validate: async () => true,
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "Please make the trade.",
                        },
                    },
                    {
                        user: "{{agentName}}",
                        content: {
                            text: "Your zUSDT has been swapped in exchange for 117.25 gZIL which are now in your wallet.",
                            action: "PERFORM_SWAP",
                        },
                    },
                ],
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "Within the next ten minutes, please swap 200 of my WZIL directly in exchange for at least 15 SEED.",
                        },
                    },
                    {
                        user: "{{agentName}}",
                        content: {
                            text: "Your WZIL has been swapped in exchange for 17.25 SEED which are now in your wallet.",
                            action: "PERFORM_SWAP",
                        },
                    },
                ],
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "Trade 1500 of my HRSE via WZIL for a minimum of 300 FPS in the next five minutes.",
                        },
                    },
                    {
                        user: "{{agentName}}",
                        content: {
                            text: "Your HRSE was swapped to WZIL then to 318.5 FPS which you have now received.",
                            action: "PERFORM_SWAP",
                        },
                    },
                ],
            ],
        },
        {
            name: "WRAP_ZIL",
            description:
                "Wrap native ZIL in the WZIL ERC-20 contract so that it may be traded on PlunderSwap.",
            similes: [],
            validate: async () => true,
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "Please wrap 200 of my native ZIL so I can trade it.",
                        },
                    },
                    {
                        user: "{{agentName}}",
                        content: {
                            text: "You have now used 200 ZIL to give you 200 more WZIL.",
                            action: "WRAP_ZIL",
                        },
                    },
                ],
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "Please convert 500 ZIL to WZIL ready for swapping.",
                        },
                    },
                    {
                        user: "{{agentName}}",
                        content: {
                            text: "You have now spent 500 of your native ZIL to buy 500 WZIL.",
                            action: "WRAP_ZIL",
                        },
                    },
                ],
            ],
        },
        {
            name: "UNWRAP_ZIL",
            description:
                "Unwrap WZIL from its ERC-20 contract to obtain native ZIL back.",
            similes: [],
            validate: async () => true,
            examples: [
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "Please unwrap 250 of my ZIL, I don't need to trade it any more.",
                        },
                    },
                    {
                        user: "{{agentName}}",
                        content: {
                            text: "250 of your WZIL has been converted and received in your wallet as native ZIL.",
                            action: "UNWRAP_ZIL",
                        },
                    },
                ],
                [
                    {
                        user: "{{user1}}",
                        content: {
                            text: "Please turn 100 of my WZIL back to native ZIL.",
                        },
                    },
                    {
                        user: "{{agentName}}",
                        content: {
                            text: "You have now exchanged 100 WZIL for the same amount of native ZIL.",
                            action: "UNWRAP_ZIL",
                        },
                    },
                ],
            ],
        },
    ];

    const tools = await getOnChainTools({
        wallet: evmWallet,
        // 2. Configure the plugins you need to perform those actions
        plugins: [sendETH()],
    });

    const zilTools = await getOnChainTools({
        wallet: zilliqaWallet,
        plugins: [zilliqa()],
    });

    const zilEvmTools = await getOnChainTools({
        wallet: zilliqaEvmWallet,
        plugins: [plunderswap()],
    });

    const allTools = { ...zilTools, ...tools };
    const allEvmTools = { ...zilEvmTools };
    // 3. Let GOAT handle all the actions
    return [
        ... actionsWithoutHandler.map((action) => ({
            ...action,
            handler: getActionHandler(action.name, action.description, allTools),
        })),
        ...actionsEvmWithoutHandler.map((action) => ({
            ...action,
            handler: getActionHandler(action.name, action.description, allEvmTools),
        }))];
}

function getActionHandler(
    actionName: string,
    actionDescription: string,
    tools
) {
    return async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        options?: Record<string, unknown>,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        let currentState = state ?? (await runtime.composeState(message));
        currentState = await runtime.updateRecentMessageState(currentState);

        try {
            // 1. Call the tools needed
            const context = composeActionContext(
                actionName,
                actionDescription,
                currentState
            );
            const result = await generateText({
                runtime,
                context,
                tools,
                maxSteps: 10,
                // Uncomment to see the log each tool call when debugging
                onStepFinish: (step) => {
                    console.log(step.toolResults);
                },
                modelClass: ModelClass.LARGE,
            });

            // 2. Compose the response
            const response = composeResponseContext(result, currentState);
            const responseText = await generateResponse(runtime, response);

            callback?.({
                text: responseText,
                content: {},
            });
            return true;
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);

            // 3. Compose the error response
            const errorResponse = composeErrorResponseContext(
                errorMessage,
                currentState
            );
            const errorResponseText = await generateResponse(
                runtime,
                errorResponse
            );

            callback?.({
                text: errorResponseText,
                content: { error: errorMessage },
            });
            return false;
        }
    };
}

function composeActionContext(
    actionName: string,
    actionDescription: string,
    state: State
): string {
    const actionTemplate = `
# Knowledge
{{knowledge}}

About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}


# Action: ${actionName}
${actionDescription}

{{recentMessages}}

Based on the action chosen and the previous messages, execute the action and respond to the user using the tools you were given.
`;
    return composeContext({ state, template: actionTemplate });
}

function composeResponseContext(result: unknown, state: State): string {
    const responseTemplate = `
    # Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

Here is the result:
${JSON.stringify(result)}

{{actions}}

Respond to the message knowing that the action was successful and these were the previous messages:
{{recentMessages}}
  `;
    return composeContext({ state, template: responseTemplate });
}

function composeErrorResponseContext(
    errorMessage: string,
    state: State
): string {
    const errorResponseTemplate = `
# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{actions}}

Respond to the message knowing that the action failed.
The error was:
${errorMessage}

These were the previous messages:
{{recentMessages}}
    `;
    return composeContext({ state, template: errorResponseTemplate });
}

async function generateResponse(
    runtime: IAgentRuntime,
    context: string
): Promise<string> {
    return generateText({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
    });
}
