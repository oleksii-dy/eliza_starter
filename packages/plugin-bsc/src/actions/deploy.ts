import {
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    HandlerCallback,
    ModelClass,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";

import { WalletProvider } from "../providers/wallet";
import { ercContractTemplate } from "../templates";
import { deploy1155, deployNFT, deployToken } from "../utils";

export { ercContractTemplate };

export class DeployAction {
    constructor(private walletProvider: WalletProvider) {}

    // async getBalance(params: GetBalanceParams): Promise<GetBalanceResponse> {
    //     let { chain, address, token } = params;

    //     elizaLogger.log("params", params);
    //     if (chain == "bscTestnet") {
    //         throw new Error("Testnet is not supported");
    //     }

    //     if (!address) {
    //         address = this.walletProvider.getAddress();
    //     }

    //     this.walletProvider.switchChain(chain);
    //     const nativeSymbol =
    //         this.walletProvider.getChainConfigs(chain).nativeCurrency.symbol;
    //     const chainId = this.walletProvider.getChainConfigs(chain).id;

    //     try {
    //         // If specific token is requested and it's not the native token
    //         if (token && token !== nativeSymbol) {
    //             const balance = await this.getTokenBalance(
    //                 chainId,
    //                 address,
    //                 token
    //             );
    //             return {
    //                 chain,
    //                 address,
    //                 balances: [{ token, balance }],
    //             };
    //         }

    //         // If no specific token is requested, get all token balances
    //         if (!token) {
    //             const balances = await this.getTokenBalances(chainId, address);
    //             return {
    //                 chain,
    //                 address,
    //                 balances,
    //             };
    //         }

    //         // If native token is requested
    //         const nativeBalanceWei = await this.walletProvider
    //             .getPublicClient(chain)
    //             .getBalance({ address });
    //         return {
    //             chain,
    //             address,
    //             balances: [
    //                 {
    //                     token: nativeSymbol,
    //                     balance: formatEther(nativeBalanceWei),
    //                 },
    //             ],
    //         };
    //     } catch (error) {
    //         throw new Error(`Get balance failed: ${error.message}`);
    //     }
    // }

    // async getTokenBalance(
    //     chainId: ChainId,
    //     address: Address,
    //     tokenSymbol: string
    // ): Promise<string> {
    //     const token = await getToken(chainId, tokenSymbol);
    //     const tokenBalance = await getTokenBalance(address, token);
    //     return formatUnits(tokenBalance?.amount ?? 0n, token.decimals);
    // }

    // async getTokenBalances(
    //     chainId: ChainId,
    //     address: Address
    // ): Promise<Balance[]> {
    //     const tokensResponse = await getTokens();
    //     const tokens = tokensResponse.tokens[chainId];

    //     const tokenBalances = await getTokenBalances(address, tokens);
    //     return tokenBalances
    //         .filter((balance) => balance.amount && balance.amount !== 0n)
    //         .map((balance) => ({
    //             token: balance.symbol,
    //             balance: formatUnits(balance.amount!, balance.decimals),
    //         }));
    // }
}

export const deployAction = {
    name: "deployToken",
    description: "",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback?: HandlerCallback
    ) => {
        elizaLogger.log("Starting deploy action...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose swap context
        const context = composeContext({
            state,
            template: ercContractTemplate,
        });
        const content = await generateObjectDeprecated({
            runtime,
            context: context,
            modelClass: ModelClass.LARGE,
        });

        elizaLogger.log("content", typeof content);
        elizaLogger.log("content", content);

        const privateKey = runtime.getSetting("BSC_PRIVATE_KEY");
        const rpcUrl = runtime.getSetting("BSC_TESTNET_PROVIDER_URL");

        let result;
        if (
            content.contractType.toLocaleLowerCase() ===
            "ERC20".toLocaleLowerCase()
        ) {
            elizaLogger.log("start deploy token....");
            result = await deployToken(
                runtime,
                {
                    privateKey,
                    rpcUrl,
                },
                {
                    decimals: content.decimals,
                    symbol: content.symbol,
                    name: content.name,
                    totalSupply: content.totalSupply,
                }
            );

            elizaLogger.log("result: ", result);
        } else if (
            content.contractType.toLocaleLowerCase() ===
            "ERC721".toLocaleLowerCase()
        ) {
            result = await deployNFT(
                {
                    privateKey,
                    rpcUrl,
                },
                {
                    name: content.name,
                    symbol: content.symbol,
                    baseURI: content.baseURI,
                }
            );

            elizaLogger.log("result: ", result);
        } else if (
            content.contractType.toLocaleLowerCase() ===
            "ERC1155".toLocaleLowerCase()
        ) {
            result = await deploy1155(
                {
                    privateKey,
                    rpcUrl,
                },
                {
                    name: content.name,
                    baseURI: content.baseURI,
                }
            );

            elizaLogger.log("result: ", result);
        }

        callback?.({
            text: `Successfully create contract - ${result?.address}`,
            content: { ...result },
        });

        // const deployOptions: DeployParams = {
        //     chain: content.chain,
        //     name: content.name,
        //     contractType: content.contractType,
        //     decimals: content.decimals,
        //     symbol: content.symbol,
        //     totalSupply: content.totalSupply,
        // };

        // const walletProvider = initWalletProvider(runtime);
        // const action = new DeployAction(walletProvider);

        // const {
        //     contractType,
        //     name,
        //     symbol,
        //     network,
        //     baseURI,
        //     totalSupply,
        // } = contractDetails.object;

        try {
            // const getBalanceResp = await action.getBalance(getBalanceOptions);
            // if (callback) {
            //     let text = `No balance found for ${getBalanceOptions.address} on ${getBalanceOptions.chain}`;
            //     if (getBalanceResp.balances.length > 0) {
            //         text = `Balance of ${getBalanceResp.address} on ${getBalanceResp.chain}:\n${getBalanceResp.balances
            //             .map(({ token, balance }) => `${token}: ${balance}`)
            //             .join("\n")}`;
            //     }
            //     callback({
            //         text,
            //         content: { ...getBalanceResp },
            //     });
            // }
            return true;
        } catch (error) {
            elizaLogger.error("Error in get balance:", error.message);
            callback?.({
                text: `Getting balance failed`,
                content: { error: error.message },
            });
            return false;
        }
    },
    template: ercContractTemplate,
    validate: async (_runtime: IAgentRuntime) => {
        return true;
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Deploy a erc20 token",
                    action: "DEPLOY_ERC20",
                },
            },
        ],
    ],
    similes: ["DEPLOY_ERC20"],
};
