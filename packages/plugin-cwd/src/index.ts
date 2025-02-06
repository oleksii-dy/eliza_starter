import { Plugin } from "@elizaos/core";
import { getAssetsAction } from "./actions/getAssets";

export * as actions from "./actions";

export const cwdPlugin: Plugin = {
    name: "cwd",
    description: "CryptoWalletDashboard (CWD) plugin for Eliza",
    actions: [getAssetsAction],
    evaluators: [],
    providers: [],
};
export default cwdPlugin;
