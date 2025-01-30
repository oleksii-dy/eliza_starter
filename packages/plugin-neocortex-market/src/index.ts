import type { Plugin } from "@elizaos/core";
import { trendingTokenAction } from "./actions/trending";
//import GoplusSecurityService from "./services/GoplusSecurityService";

//export * from "./services/GoplusSecurityService";

export const neoCortexMarketPlugin: Plugin = {
    name: "neocortex-market",
    description: "Neo Cortex for getting market insight",
    actions: [trendingTokenAction],
    evaluators: [],
    providers: [],
    //services: [new GoplusSecurityService()],
    services: [],
};
