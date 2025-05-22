import {
    elizaLogger,
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";
import { validateTwitterConfig } from "../environment";
import { getFeedExamples} from "../examples";
import { createTwitterService } from "../services";

export const getFeedAction: Action = {
    name: "GET_FEED",
    similes: [
        "timeline"
    ],
    description: "Pull the feed from the target twitter accounts",
    validate: async (runtime: IAgentRuntime) => {
        await validateTwitterConfig(runtime);
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback: HandlerCallback
    ) => {

        const config = await validateTwitterConfig(runtime);
        const twitterService = createTwitterService(
            config.TWITTER_USERNAME,
            config.TWITTER_PASSWORD,
            config.TWITTER_EMAIL
        );

        try {
            // const TwitterData = await twitterService.();
            elizaLogger.success(
                `Successfully fetched target twitter account feeds!`
            );
            if (callback) {
                callback({
                    text: `
                    Here is the latest in all things Milli, Sei, and more...
                    
                    ${TwitterData.topics}
                    `
                });
                return true;
            }
        } catch (error:any) {
            elizaLogger.error("Error in twitter plugin handler:", error);
            callback({
                text: `Error fetching twitter feed: ${error.message}`,
                content: { error: error.message },
            });
            return false;
        }
    },
    examples: getFeedExamples as ActionExample[][],
} as Action;