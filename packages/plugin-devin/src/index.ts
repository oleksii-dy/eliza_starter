import { type Plugin } from "@elizaos/core";
import { startSessionAction } from "./actions/startSession";
import { devinProvider } from "./providers/devinProvider";
import { validateDevinConfig } from "./environment";

const plugin: Plugin = {
    name: "devinPlugin",
    description: "Integrates Devin API with Eliza for task automation and session management",
    actions: [startSessionAction],
    providers: [devinProvider],
    validate: validateDevinConfig,
};

export default plugin;
