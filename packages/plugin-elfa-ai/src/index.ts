import { Plugin } from "@elizaos/core";
import { elfaPingAction } from "./actions/ping";

export const elfaAiPlugin: Plugin = {
    name: "elfa-ai",
    description:
        "Integrates Elfa AI API into Eliza OS for social media analytics and insights.",
    actions: [elfaPingAction],
};

export default elfaAiPlugin;
