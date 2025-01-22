import type { Plugin } from "@elizaos/core";
import { createAndRegisterAgent } from "./actions/createAndRegisterAgent";
import { verifyData } from "./actions/verifyData";
import { priceQuery } from "./actions/priceQuery";

export const aproPlugin: Plugin = {
    name: "apro",
    description: "Apro Plugin for Eliza",
    actions: [
        priceQuery,
        createAndRegisterAgent,
        verifyData,
    ],
    evaluators: [],
    providers: [],
};

export default aproPlugin;