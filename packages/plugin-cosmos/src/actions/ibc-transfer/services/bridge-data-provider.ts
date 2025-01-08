import { IBridgeDataProvider } from "../../../shared/interfaces";
import { BridgeDataFetcher } from "./bridge-data-fetcher";

export const bridgeDataProvider: IBridgeDataProvider = async (
    sourceAssetDenom: string,
    sourceAssetChainId: string
) => {
    const bridgeDataFetcher = BridgeDataFetcher.getInstance();
    const bridgeData = await bridgeDataFetcher.fetchBridgeData(
        sourceAssetDenom,
        sourceAssetChainId
    );

    const ibcAssetData = bridgeData.dest_assets[
        sourceAssetChainId
    ]?.assets?.find(({ origin_denom }) => origin_denom === sourceAssetDenom);

    if (!ibcAssetData) {
        throw new Error("No IBC asset data");
    }

    const channelId = ibcAssetData.trace.split("/")[0];

    if (!channelId) {
        throw new Error("No channel for bridge");
    }

    return {
        channelId,
        ibcDenom: ibcAssetData.denom,
        portId: "transfer",
    };
};
