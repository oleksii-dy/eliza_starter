import { Plugin } from "@elizaos/core";
import { elfaPingAction } from "./actions/ping";
import { elfaApiKeyStatusAction } from "./actions/apiKeyStatus";
import { elfaGetSmartMentions } from "./actions/getSmartMentions";
export const elfaAiPlugin: Plugin = {
    name: "elfa-ai",
    description:
        "Integrates Elfa AI API into Eliza OS for social media analytics and insights.",
    actions: [elfaPingAction, elfaApiKeyStatusAction, elfaGetSmartMentions],
};

export default elfaAiPlugin;
