import { type Plugin } from "@elizaos/core";
import { startSessionAction } from "./actions/startSession";
import { devinProvider } from "./providers/devinProvider";

const plugin: Plugin = {
    name: "devinPlugin",
    description: "Integrates Devin API with Eliza via Discord",
    actions: [startSessionAction],
    providers: [devinProvider],
};

export default plugin;
