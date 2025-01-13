import { Plugin } from "@elizaos/core";
import createToken from "./actions/createToken.ts";
import openPerpTrade from "./actions/openPerpTrade.ts";

export const solanaAgentkitPlguin: Plugin = {
    name: "solana",
    description: "Solana Plugin with solana agent kit for Eliza",
    actions: [
        createToken,
        openPerpTrade
    ],
    evaluators: [],
    providers: [],
};

export default solanaAgentkitPlguin;
