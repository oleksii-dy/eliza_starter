import { Plugin } from "@elizaos/core";
import { hyperfeederAction } from "./actions";

export const hyperfeederPlugin: Plugin = {
    name: "hyperfeederPlugin",
    description: "Get access to hyperfeeder content engine",
    actions: [hyperfeederAction],
};

export default hyperfeederPlugin;
