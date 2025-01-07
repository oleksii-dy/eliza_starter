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

        if (result) {
            callback?.({
                text: `Successfully create contract - ${result?.address}`,
                content: { ...result },
            });
        } else {
            callback?.({
                text: `Unsuccessfully create contract`,
                content: { ...result },
            });
        }

        try {
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
