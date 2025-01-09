import { IDenomProvider } from "../../../shared/interfaces";
import { BridgeDataFetcher } from "../../../shared/services/bridge-data-fetcher";

export const bridgeDenomProvider: IDenomProvider = async (
    sourceAssetDenom: string,
    sourceAssetChainId: string,
    destChainId: string
) => {
    const bridgeDataFetcher = BridgeDataFetcher.getInstance();
    const bridgeData = await bridgeDataFetcher.fetchBridgeData(
        sourceAssetDenom,
        sourceAssetChainId
    );

    const ibcAssetData = bridgeData.dest_assets[destChainId]?.assets?.find(
        ({ origin_denom }) => origin_denom === sourceAssetDenom
    );

    if (!ibcAssetData.denom) {
        throw new Error("No IBC asset data");
    }

    return {
        denom: ibcAssetData.denom,
    };
};
