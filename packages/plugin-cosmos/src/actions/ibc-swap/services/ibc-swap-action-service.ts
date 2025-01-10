import {assets, chains } from "chain-registry";
import {
    ICosmosActionService, ICosmosPluginCustomChainData,
    ICosmosSwap,
    ICosmosWalletChains,
} from "../../../shared/interfaces.ts";
import { IBCSwapActionParams } from "../types.ts";
import {
    getAssetBySymbol,
    getChainByChainName,
    getChainNameByChainId
} from "@chain-registry/utils";
import { getAvailableAssets } from "../../../shared/helpers/cosmos-assets.ts";
import {HandlerCallback} from "@elizaos/core";

export class IBCSwapAction implements ICosmosActionService {
    constructor(private cosmosWalletChains: ICosmosWalletChains) {
        this.cosmosWalletChains = cosmosWalletChains;
    }

    async execute(
        params: IBCSwapActionParams,
        customChainAssets?: ICosmosPluginCustomChainData["assets"][],
        _callback?: HandlerCallback
    ): Promise<ICosmosSwap> {
        const fromChain = getChainByChainName(chains, params.fromChainName);
        const toChain = getChainByChainName(chains, params.toChainName);

        const availableAssets = getAvailableAssets(assets, customChainAssets)

        const denomFrom = getAssetBySymbol(
            availableAssets,
            params.fromTokenSymbol,
            params.fromChainName
        );

        const denomTo = getAssetBySymbol(
            availableAssets,
            params.toTokenSymbol,
            params.toChainName
        );

        console.log('denomFrom: ',JSON.stringify(denomFrom.base, null, 2));
        console.log('denomTo: ',JSON.stringify(denomTo.base, null, 2));

        if( !denomFrom ) {
            //TODO: use skip endpoint
        }

        if( !denomTo ) {
            //TODO: use skip endpoint
        }

        console.log('denomFrom: ',JSON.stringify(denomFrom.base, null, 2));
        console.log('denomTo: ',JSON.stringify(denomTo.base, null, 2));



        const skipClient = this.cosmosWalletChains.getSkipClient(
            params.fromChainName
        );


        const route = await skipClient.route({
            smartSwapOptions: {},
            amountIn: params.fromTokenAmount,
            sourceAssetDenom: denomFrom.base,
            sourceAssetChainID: fromChain.chain_id,
            destAssetDenom: denomTo.base,
            destAssetChainID: toChain.chain_id,
        });

        // const route = await skipClient.route({
        //     amountIn: params.fromTokenAmount,
        //     sourceAssetDenom: "uosmo",
        //     sourceAssetChainID: "osmo-test-5",
        //     destAssetDenom: "ibc/6D3D88AFE4BFF8F478277916EFEB6CD4507E1E791CB7847A9F42264BA236B6F7",
        //     destAssetChainID: "pion-1",
        //     cumulativeAffiliateFeeBPS: "0",
        // });

        // TODO: remember to add chain to available chains in .env !!
        const userAddresses = await Promise.all(
            route.requiredChainAddresses.map(async (chainID) => {
                const chainName = getChainNameByChainId(chains, chainID);
                return {
                    chainID,
                    address:
                        await this.cosmosWalletChains.getWalletAddress(
                            chainName
                        ),
                };
            })
        );

        // console.log('addresses: ',JSON.stringify(userAddresses, null, 2));

        // const userAddresses: UserAddress[] = [
        //     {
        //         chainID: "osmo-test-5",
        //         address: "osmo16cnsf5txawpde3wgycz83ukxlthsucdwhkgztv",
        //     },
        //     {
        //         chainID: "pion-1",
        //         address: "neutron16cnsf5txawpde3wgycz83ukxlthsucdwmjjs8e",
        //     },
        // ];

        if (_callback) {
            await _callback({
                text: `Expected swap result: ${route.estimatedAmountOut} ${params.toTokenSymbol}, \nEstimated Fee: ${route.estimatedFees}. \nEstimated time: ${route.estimatedRouteDurationSeconds}`,
            });
        }

        let result: ICosmosSwap;

        await skipClient.executeRoute({
            route,
            userAddresses,
            onTransactionCompleted: async (chainID, txHash, status) => {
                console.log(
                    `Route completed with tx hash: ${txHash} & status: ${status.state}`
                );

                //if state != STATE_COMPLETED || STATE_COMPLETED_SUCCESS
                //throw error ??

                result = {
                    fromChainName: params.fromChainName,
                    fromTokenAmount: params.fromTokenAmount,
                    fromTokenSymbol: params.fromTokenSymbol,
                    gasPaid: 0,
                    toChainName: params.toChainName,
                    toTokenAmount: "ile??", //todo: get exchange result
                    toTokenSymbol: params.toTokenSymbol,
                    txHash,
                };
            },
        });

        return result;
    }
}
