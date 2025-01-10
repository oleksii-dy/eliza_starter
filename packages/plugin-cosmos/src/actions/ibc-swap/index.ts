import {
    composeContext,
    generateObjectDeprecated,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State
} from "@elizaos/core";

import { initWalletChainsData } from "../../providers/wallet/utils";
import {
    cosmosIBCSwapTemplate,
    cosmosTransferTemplate,
} from "../../templates";
import type {
    ICosmosPluginOptions,
    ICosmosWalletChains,
} from "../../shared/interfaces";
import {IBCSwapActionParams} from "./types.ts";
import {IBCSwapAction} from "./services/ibc-swap-action-service.ts";

export const createIBCSwapAction = (
    pluginOptions: ICosmosPluginOptions
) => ({
    name: "COSMOS_IBC_SWAP",
    description: "Swaps tokens between addresses on  cosmos chains",
    handler: async (
        _runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        _callback?: HandlerCallback
    ) => {
        const cosmosIBCTransferContext = composeContext({
            state: state,
            template: cosmosIBCSwapTemplate,
            templatingEngine: "handlebars",
        });

        const cosmosIBCSwapContent = await generateObjectDeprecated({
            runtime: _runtime,
            context: cosmosIBCTransferContext,
            modelClass: ModelClass.SMALL,
        });

        const paramOptions: IBCSwapActionParams = {
            fromChainName: cosmosIBCSwapContent.fromChainName,
            fromTokenSymbol: cosmosIBCSwapContent.fromTokenSymbol,
            fromTokenAmount: cosmosIBCSwapContent.fromTokenAmount,
            toTokenSymbol: cosmosIBCSwapContent.toTokenSymbol,
            toChainName: cosmosIBCSwapContent.toChainName,
        };

        console.log('ParamOptions: ',JSON.stringify(paramOptions, null, 2));

        try {
            const walletProvider: ICosmosWalletChains =
                await initWalletChainsData(_runtime);

            const action = new IBCSwapAction(walletProvider)

            const customAssets = (pluginOptions?.customChainData ?? []).map(
                (chainData) => chainData.assets
            );

            const transferResp = await action.execute(
                paramOptions,
                customAssets,
                _callback
            );

            if (_callback) {
                await _callback({
                    text: `Successfully swapped ${transferResp.fromTokenAmount} ${transferResp.fromTokenSymbol} tokens to ${transferResp.toTokenAmount} ${transferResp.toTokenSymbol} on chain ${transferResp.toChainName} \nGas paid: ${transferResp.gasPaid}\nTransaction Hash: ${transferResp.txHash}`,
                    content: {
                        success: true,
                        hash: transferResp.txHash,
                        fromTokenAmount: paramOptions.fromTokenAmount,
                        fromToken: paramOptions.fromTokenSymbol,
                        toTokenAmount: 'not provided yet',
                        toToken: paramOptions.toTokenSymbol,
                        fromChain: paramOptions.fromChainName,
                        toChain: paramOptions.toChainName,
                    },
                });

                const newMemory: Memory = {
                    userId: _message.agentId,
                    agentId: _message.agentId,
                    roomId: _message.roomId,
                    content: {
                        text: `Swap of ${transferResp.fromTokenAmount} ${transferResp.fromTokenSymbol} to address ${transferResp.toTokenAmount} ${transferResp.toTokenSymbol} on chain ${transferResp.toChainName} was successful.\n Gas paid: ${transferResp.gasPaid}. Tx hash: ${transferResp.txHash}`,
                    },
                };

                await _runtime.messageManager.createMemory(newMemory);
            }
            return true;
        } catch (error) {
            console.error("Error during ibc token swap:", error);

            if (_callback) {
                await _callback({
                    text: `Error ibc swapping tokens: ${error.message}`,
                    content: { error: error.message },
                });
            }

            const newMemory: Memory = {
                userId: _message.agentId,
                agentId: _message.agentId,
                roomId: _message.roomId,
                content: {
                    text: `Swap of ${paramOptions.fromTokenAmount} ${paramOptions.fromTokenSymbol} to ${paramOptions.toTokenSymbol} on chain ${paramOptions.toChainName} was unsuccessful.`,
                },
            };

            await _runtime.messageManager.createMemory(newMemory);

            return false;
        }
    },
    template: cosmosTransferTemplate,
    validate: async (runtime: IAgentRuntime) => {
        const mnemonic = runtime.getSetting("COSMOS_RECOVERY_PHRASE");
        const availableChains = runtime.getSetting("COSMOS_AVAILABLE_CHAINS");
        const availableChainsArray = availableChains?.split(",");

        return !(mnemonic && availableChains && availableChainsArray.length);
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Swap {{0.0001 ATOM}} from {{cosmoshub}} to {{OM}} on {{mantrachain1}}",
                    action: "COSMOS_IBC_SWAP",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Do you confirm the swap?",
                    action: "COSMOS_IBC_SWAP",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "Yes",
                    action: "COSMOS_IBC_SWAP",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Starting swap transaction. Keep in mind that it might take couple of minutes",
                    action: "COSMOS_IBC_SWAP",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Swap {{0.0001 OM}} from {{mantrachain}} to {{OSMO}} on {{osmosis}}",
                    action: "COSMOS_IBC_SWAP",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Do you confirm the swap?",
                    action: "COSMOS_IBC_SWAP",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "Yes",
                    action: "COSMOS_IBC_SWAP",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Starting swap transaction. Keep in mind that it might take couple of minutes",
                    action: "COSMOS_IBC_SWAP",
                },
            },
        ],
    ],
    similes: [
        "COSMOS_SWAP",
        "COSMOS_SWAP_IBC",
    ],
});
