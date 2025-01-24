import type { IAgentRuntime, Memory, State } from "@elizaos/core";
import {
    composeContext,
    generateObjectDeprecated,
    ModelClass,
} from "@elizaos/core";
import type { Address, Hash } from "viem";
import { parseEther } from "viem";
import { initWalletProvider, WalletProvider } from "../providers/wallet";
import type { SupportedChain, SwapParams, Transaction } from "../types";
import { swapTemplate } from "../templates";

const PARASWAP_API_URL = "https://api.paraswap.io";

export class SwapAction {
    private tokenDecimals: Map<string, number> = new Map();

    constructor(private walletProvider: WalletProvider) {}

    private async getSwapData(params: SwapParams) {
        const inputTokenDecimals =
            this.tokenDecimals.get(params.fromToken.toLowerCase()) || 18;
        const amount = (
            Number(params.amount) * Math.pow(10, inputTokenDecimals)
        ).toString();

        const queryParams = {
            srcToken: params.fromToken,
            destToken: params.toToken,
            amount: amount,
            userAddress: this.walletProvider.getAddress(),
            network: this.walletProvider
                .getChainConfigs(params.chain)
                .id.toString(),
            version: "6.2",
            side: "SELL",
            slippage: "250",
        };

        // console.log("queryParams", queryParams);

        const response = await fetch(
            `${PARASWAP_API_URL}/swap?${new URLSearchParams(queryParams)}`
        );

        // console.log("response", response);

        if (!response.ok)
            throw new Error(
                (await response.json()).message || "Failed to get swap quote"
            );
        return response.json();
    }

    public async validateTokens(
        inputToken: string,
        outputToken: string
    ): Promise<boolean> {
        const chainId = this.walletProvider.getCurrentChain().id;
        const response = await fetch(`${PARASWAP_API_URL}/tokens/${chainId}`);

        if (!response.ok) {
            throw new Error("Failed to fetch token list");
        }

        const { tokens } = await response.json();

        // Store token symbols (lowercase) and their decimals in the map
        tokens.forEach((token: { symbol: string; decimals: number }) => {
            this.tokenDecimals.set(token.symbol.toLowerCase(), token.decimals);
        });

        // console.log("tokenDecimals", this.tokenDecimals);

        return (
            this.tokenDecimals.has(inputToken.toLowerCase()) &&
            this.tokenDecimals.has(outputToken.toLowerCase())
        );
    }

    async swap(params: SwapParams): Promise<Transaction> {
        const walletClient = this.walletProvider.getWalletClient(params.chain);
        const chainConfig = this.walletProvider.getChainConfigs(params.chain);
        const [fromAddress] = await walletClient.getAddresses();
        const swapData = await this.getSwapData(params);

        const txResponse = await walletClient.sendTransaction({
            account: walletClient.account,
            to: swapData.txParams.to as Address,
            data: swapData.txParams.data as `0x${string}`,
            value: BigInt(swapData.txParams.value || "0"),
            chain: chainConfig,
            kzg: undefined,
        });

        return {
            hash: txResponse,
            from: fromAddress,
            to: swapData.txParams.to as Address,
            value: BigInt(swapData.txParams.value || "0"),
            data: swapData.txParams.data as `0x${string}`,
            chainId: chainConfig.id,
        };
    }

    async approveTokenIfNeeded(
        amount: string,
        tokenAddress: string
    ): Promise<Hash | null> {
        const chainId = this.walletProvider.getCurrentChain().id;
        const allowanceResp = await fetch(
            `${PARASWAP_API_URL}/tokens/${tokenAddress}/allowance/${this.walletProvider.getAddress()}?network=${chainId}`
        );
        if (!allowanceResp.ok) throw new Error("Failed to check allowance");
        const { allowance } = await allowanceResp.json();

        if (BigInt(allowance) < BigInt(amount)) {
            const contractsResp = await fetch(
                `${PARASWAP_API_URL}/adapters/contracts?network=${chainId}`
            );
            const { tokenTransferProxy } = await contractsResp.json();
            const walletClient = this.walletProvider.getWalletClient(
                this.walletProvider
                    .getCurrentChain()
                    .name.toLowerCase() as SupportedChain
            );

            return walletClient.sendTransaction({
                account: walletClient.account,
                to: tokenAddress as Address,
                data: `0x095ea7b3${tokenTransferProxy.slice(2).padStart(64, "0")}${"f".repeat(64)}` as `0x${string}`,
                value: 0n,
                chain: this.walletProvider.getCurrentChain(),
                kzg: undefined,
            });
        }
        return null;
    }
}

export const swapAction = {
    name: "swap",
    description: "Swap tokens using ParaSwap v6.2",
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: any,
        callback?: any
    ) => {
        try {
            const walletProvider = await initWalletProvider(runtime);
            const action = new SwapAction(walletProvider);
            const content = await generateObjectDeprecated({
                runtime,
                context: composeContext({ state, template: swapTemplate }),
                modelClass: ModelClass.LARGE,
            });

            if (
                !(await action.validateTokens(
                    content.inputToken,
                    content.outputToken
                ))
            ) {
                if (callback) {
                    callback({
                        text: `Error: One or both tokens are not supported on ParaSwap`,
                    });
                }
                return false;
            }

            // if (content.inputToken !== "ETH") {
            //     await action.approveTokenIfNeeded(
            //         parseEther(content.amount).toString(),
            //         content.inputToken
            //     );
            // }

            const swapResp = await action.swap({
                chain: content.chain,
                fromToken: content.inputToken,
                toToken: content.outputToken,
                amount: content.amount,
            });

            if (callback) {
                callback({
                    text: `Successfully swapped ${content.amount} tokens\nTransaction Hash: ${swapResp.hash}`,
                    content: {
                        success: true,
                        hash: swapResp.hash,
                        recipient: swapResp.to,
                        chain: content.chain,
                    },
                });
            }
            return true;
        } catch (error) {
            if (callback)
                callback({
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                });
            return false;
        }
    },
    template: swapTemplate,
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Swap 1 ETH for USDC on Base",
                    action: "TOKEN_SWAP",
                },
            },
        ],
    ],
    similes: ["TOKEN_SWAP", "EXCHANGE_TOKENS", "TRADE_TOKENS"],
};
