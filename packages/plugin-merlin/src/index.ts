import {btcfunMintAction} from "./actions/btcfun.ts";

export * from "./providers/btcfun";

import type { Plugin } from "@elizaos/core";

export const merlinPlugin: Plugin = {
    name: "merlin",
    description: "merlin plugin",
    providers: [],
    evaluators: [],
    services: [],
    actions: [btcfunMintAction],
};

export default merlinPlugin;
