import { assetTransferPlugin } from "./plugins/assetTransfer";
import { crossChainMessagingPlugin } from "./plugins/crossChainMessaging";
import { deployWarpRoutePlugin } from "./plugins/deployWarpRoute";

export const plugins = {
    crossChainMessagingPlugin,
    assetTransferPlugin,
    deployWarpRoutePlugin,
};

export * from "./plugins/crossChainMessaging";
export * from "./plugins/assetTransfer";
export * from "./plugins/deployWarpRoute";
