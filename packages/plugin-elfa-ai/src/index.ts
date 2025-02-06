import { Plugin } from "@elizaos/core";
import { elfaPingAction } from "./actions/ping";
import { elfaApiKeyStatusAction } from "./actions/apiKeyStatus";
import { elfaGetSmartMentions } from "./actions/getSmartMentions";
import { elfaGetTopMentionsAction } from "./actions/getTopMentions";
import { elfaGetSearchMentionsByKeywordsAction } from "./actions/getSearchMentionsByKeywords";
import { elfaGetTrendingTokens } from "./actions/getTrendingTokens";
import { elfaGetTwitterAccountStatsAction } from "./actions/getTwitterAccountStats";

export const elfaAiPlugin: Plugin = {
    name: "elfa-ai",
    description:
        "Integrates Elfa AI API into Eliza OS for social media analytics and insights.",
    actions: [
        elfaPingAction,
        elfaApiKeyStatusAction,
        elfaGetSmartMentions,
        elfaGetTopMentionsAction,
        elfaGetSearchMentionsByKeywordsAction,
        elfaGetTrendingTokens,
        elfaGetTwitterAccountStatsAction,
    ],
};

export default elfaAiPlugin;
