import {
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    ModelClass,
    composeContext,
    generateObject,
    Content
} from "@elizaos/core";
import { ChainId, approveIfRequired, fetchEvmQuote, formatStringEstimation, NativeToken } from "@shogun/sdk";
import { ethers } from "ethers";
import { isAddress } from "viem";
import { z } from "zod";
import {
    LitPKPResource,
    createSiweMessageWithRecaps,
    generateAuthSig,
    LitActionResource,
} from "@lit-protocol/auth-helpers";
import { LIT_RPC, LIT_ABILITY } from "@lit-protocol/constants";
import { LitNodeClient } from "@lit-protocol/lit-node-client";

interface SwapContent extends Content {
    srcToken: string;
    destToken: string;
    amount: string;
}

interface LitState {
    nodeClient: LitNodeClient;
    evmWallet?: ethers.Wallet;
    pkp?: {
        publicKey: string;
        ethAddress: string;
    };
    capacityCredit?: {
        tokenId: string;
    };
}

const swapTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "srcToken": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "destToken": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    "amount": "1"
}
\`\`\`

{{recentMessages}}

Given the recent messages and wallet information below:

{{walletInfo}}

Extract the following information about the requested token swap:
- srcToken (the token being sold)
- destToken (the token being bought)
- amount (the amount of the token being sold)

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined. The result should be a valid JSON object with the following schema:
\`\`\`json
{
    "srcToken": string | null,
    "destToken": string | null,
    "amount":  number | string | null
}
\`\`\``;

const TOKEN_ADDRESSES = {
    "ETH": NativeToken,
    "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Example Base USDC address
    "WETH": "0x4200000000000000000000000000000000000006",
    "LBTC": "0x8236a87084f8b84306f72007f36f2618a5634494",
    "cbBTC": "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf" //coinbase BTC
};

const TOKEN_DECIMALS = {
    "ETH": 18,
    "USDC": 6,
    "WETH": 18,
    "LBTC": 8,
    "cbBTC": 8
};

// Define the schema before the handler
const swapSchema = z.object({
    srcToken: z.string().nullable(),
    destToken: z.string().nullable(),
    amount: z.union([z.string(), z.number()]).nullable()
});

export const evmSwap: Action = {
    name: "EVM_EXECUTE_SWAP",
    similes: ["EVM_SWAP_TOKENS", "EVM_TOKEN_SWAP", "EVM_TRADE_TOKENS"],
    validate: async (runtime: IAgentRuntime) => true,
    description: "Execute a token swap using Shogun SDK",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
        _options: { [key: string]: unknown; } | undefined,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            if (!state) {
                state = await runtime.composeState(message);
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            // Generate content with the schema
            const content = await generateObject({
                runtime,
                context: composeContext({ state, template: swapTemplate }),
                schema: swapSchema as any,
                modelClass: ModelClass.LARGE,
            });

            const swapContent = content.object as SwapContent;

            if (!swapContent.amount) {
                console.log("Amount is not a number, skipping swap");
                const responseMsg = {
                    text: "The amount must be a number",
                };
                callback?.(responseMsg);
                return true;
            }

            if (!swapContent.srcToken) {
                console.log("srcToken is no data, skipping swap");
                const responseMsg = {
                    text: "The srcToken must be a valid token",
                };
                callback?.(responseMsg);
                return true;
            }

            if (!swapContent.destToken) {
                console.log("destToken is no data, skipping swap");
                const responseMsg = {
                    text: "The destToken must be a valid token",
                };
                callback?.(responseMsg);
                return true;
            }

            const srcToken = !isAddress(swapContent.srcToken) ? TOKEN_ADDRESSES[swapContent.srcToken as keyof typeof TOKEN_ADDRESSES] : swapContent.srcToken;
            const destToken = !isAddress(swapContent.destToken) ? TOKEN_ADDRESSES[swapContent.destToken as keyof typeof TOKEN_ADDRESSES] : swapContent.destToken;
            const amount = ethers.utils.parseUnits(
                swapContent.amount,
                TOKEN_DECIMALS[swapContent.srcToken as keyof typeof TOKEN_DECIMALS]
            );

            const litState = (state.lit || {}) as LitState;
            if (
                !litState.nodeClient ||
                !litState.pkp ||
                !litState.evmWallet ||
                !litState.capacityCredit?.tokenId
            ) {
                throw new Error(
                    "Lit environment not fully initialized - missing nodeClient, pkp, evmWallet, or capacityCredit"
                );
            }

            // Get RPC URL from runtime settings
            const rpcUrl = runtime.getSetting("EVM_RPC_URL");
            if (!rpcUrl) {
                throw new Error("No RPC URL provided");
            }

            // Set up provider with configured RPC URL
            const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

            // Create funding wallet for capacity delegation
            const fundingPrivateKey = runtime.getSetting("FUNDING_PRIVATE_KEY");
            if (!fundingPrivateKey) {
                throw new Error("No funding private key provided");
            }

            const fundingWallet = new ethers.Wallet(
                fundingPrivateKey,
                new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
            );

            // Add capacity delegation
            const { capacityDelegationAuthSig } = 
                await litState.nodeClient.createCapacityDelegationAuthSig({
                    dAppOwnerWallet: fundingWallet,
                    capacityTokenId: litState.capacityCredit.tokenId,
                    delegateeAddresses: [litState.pkp.ethAddress],
                    uses: "1",
                    expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
                });

            // Update the session signatures code with capacity delegation
            const sessionSigs = await litState.nodeClient.getSessionSigs({
                pkpPublicKey: litState.pkp.publicKey,
                chain: "base",
                capabilityAuthSigs: [capacityDelegationAuthSig],
                expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours
                resourceAbilityRequests: [
                    {
                        resource: new LitPKPResource("*"),
                        ability: LIT_ABILITY.PKPSigning,
                    },
                    {
                        resource: new LitActionResource("*"),
                        ability: LIT_ABILITY.LitActionExecution,
                    }
                ],
                authNeededCallback: async ({
                    resourceAbilityRequests,
                    expiration,
                    uri
                }) => {
                    const toSign = await createSiweMessageWithRecaps({
                        uri: uri!,
                        expiration: expiration!,
                        resources: resourceAbilityRequests!,
                        walletAddress: litState.evmWallet!.address,
                        nonce: await litState.nodeClient.getLatestBlockhash(),
                        litNodeClient: litState.nodeClient,
                    });

                    return await generateAuthSig({
                        signer: litState.evmWallet!,
                        toSign,
                    });
                },
            });

            const quote = await fetchEvmQuote({
                senderAddress: litState.pkp.ethAddress,
                amount: amount.toString(),
                srcToken: srcToken,
                destToken: destToken,
                srcChain: ChainId.BASE,
                destChain: ChainId.BASE,
            });
            
            console.log(`Expected to receive: ${
            formatStringEstimation(quote.outputAmount.value, quote.outputAmount.decimals)
            } ${quote.outputAmount.symbol}`);
            
            await approveIfRequired(
                litState.evmWallet as any,
                srcToken,
                quote.calldatas.to,
                amount.toString()
            );
            
            const swapTx = await litState.evmWallet.sendTransaction({
                to: quote.calldatas.to,
                data: quote.calldatas.data,
                value: quote.calldatas.value,
            });

            await swapTx.wait();
            
            console.log(`https://basescan.org/tx/${swapTx.hash}`);

            return true;
        } catch (error: any) {
            console.error("Swap error:", error);
            callback?.({ text: `Error: ${error.message}` });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Swap 1 ETH for USDC"
                }
            },
            {
                user: "{{user1}}",
                content: {
                    srcToken: "ETH",
                    destToken: "USDC",
                    amount: 1,
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Processing swap: 1 ETH -> USDC",
                    action: "EVM_EXECUTE_SWAP"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Swap complete! Transaction: [tx_hash]"
                }
            },
        ]
    ] as ActionExample[][]
};

export default evmSwap;