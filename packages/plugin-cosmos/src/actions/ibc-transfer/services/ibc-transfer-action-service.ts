import {
    getAssetBySymbol,
    getChainByChainName,
    getChainIdByChainName,
} from "@chain-registry/utils";
import { assets, chains } from "chain-registry";
import type {
    ICosmosActionService,
    ICosmosPluginCustomChainData,
    ICosmosTransaction,
    ICosmosWalletChains,
} from "../../../shared/interfaces.ts";
import { getAvailableAssets } from "../../../shared/helpers/cosmos-assets.ts";
import { IBCTransferActionParams } from "../types.ts";

export class IBCTransferAction implements ICosmosActionService {
    constructor(private cosmosWalletChains: ICosmosWalletChains) {
        this.cosmosWalletChains = cosmosWalletChains;
    }

    async execute(
        params: IBCTransferActionParams,
        customChainAssets?: ICosmosPluginCustomChainData["assets"][]
    ): Promise<ICosmosTransaction> {
        const senderAddress = await this.cosmosWalletChains.getWalletAddress(
            params.chainName
        );

        const skipClient = this.cosmosWalletChains.getSkipClient(
            params.chainName
        );

        if (!senderAddress) {
            throw new Error(
                `Cannot get wallet address for chain ${params.chainName}`
            );
        }

        if (!params.toAddress) {
            throw new Error("No receiver address");
        }

        if (!params.targetChainName) {
            throw new Error("No target chain name");
        }

        if (!params.chainName) {
            throw new Error("No chain name");
        }

        if (!params.symbol) {
            throw new Error("No symbol");
        }

        const availableAssets = getAvailableAssets(assets, customChainAssets);

        const denom = getAssetBySymbol(
            availableAssets,
            params.symbol,
            params.chainName
        );

        const sourceChain = getChainByChainName(chains, params.chainName);
        const destChain = getChainByChainName(chains, params.targetChainName);

        if (!denom.base) {
            throw new Error("Cannot find asset");
        }
        if (!sourceChain) {
            throw new Error("Cannot find source chain");
        }

        if (!destChain) {
            throw new Error("Cannot find destination chain");
        }

        const route = await skipClient.route({
            destAssetChainID: destChain.chain_id,
            destAssetDenom: denom.base,
            sourceAssetChainID: sourceChain.chain_id,
            sourceAssetDenom: denom.base,
            amountOut: params.amount,
        });

        const userAddresses = await Promise.all(
            route.requiredChainAddresses.map(async (chainID) => {
                const chainName = getChainIdByChainName(chains, chainID);
                return {
                    chainID,
                    address:
                        await this.cosmosWalletChains.getWalletAddress(
                            chainName
                        ),
                };
            })
        );

        let txHash: string | undefined;

        await skipClient.executeRoute({
            route,
            userAddresses,
            onTransactionCompleted: async (_, executeRouteTxHash) => {
                txHash = executeRouteTxHash;
            },
        });

        return {
            from: senderAddress,
            to: params.toAddress,
            txHash,
        };
    }
}
