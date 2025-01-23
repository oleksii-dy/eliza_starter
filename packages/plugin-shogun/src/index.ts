import { elizaLogger } from "@elizaos/core";
import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    Plugin,
    State,
} from "@elizaos/core";
import { evmQuote, evmSwap} from "./actions";

export const shogunPlugin: Plugin = {
    name: "ShogunSDK",
    description: "Shogun SDK",
    actions: [evmQuote, evmSwap],
    evaluators: [],
    providers: [],
};
