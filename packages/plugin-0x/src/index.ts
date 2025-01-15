import { Plugin } from "@elizaos/core";
import { getIndicativePrice } from "./actions/getIndicativePrice";
import { getQuote } from "./actions/getQuote";

export const zxPlugin: Plugin = {
    name: "0x",
    description: "0x Plugin for Eliza",
    actions: [
        getIndicativePrice,
        getQuote,
    ],
    evaluators: [],
    providers: [],
};

export default zxPlugin;
