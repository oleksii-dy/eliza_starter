import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    elizaLogger,
    composeContext,
    generateMessageResponse,
    messageCompletionFooter,
} from "@elizaos/core";
import { agentKnowledgeBase } from "@elizaos/client-twitter/src/knowledgebase";

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

// Match Twitter's template structure exactly
const perplexityTwitterTemplate =
    `
# Areas of Expertise
{{knowledge}}

# About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}
{{topics}}

{{providers}}

{{characterPostExamples}}

{{postDirections}}

Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

{{recentPosts}}

# Real-time Information:
{{perplexityData}}

# TASK: Generate a post/reply in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}) while using the thread of tweets as additional context:

Current Post:
{{currentPost}}
Here is the descriptions of images in the Current post.
{{imageDescriptions}}

Thread of Tweets You Are Replying To:
{{formattedConversation}}

# INSTRUCTIONS: Generate a post in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}). You MUST include an action if the current post text includes a prompt that is similar to one of the available actions mentioned here:
{{actionNames}}
{{actions}}

Here is the current post text again. Remember to include an action if the current post text includes a prompt that asks for one of the available actions mentioned above (does not need to be exact)
{{currentPost}}` + messageCompletionFooter;

async function getPerplexityData(
    runtime: IAgentRuntime,
    message: Memory
): Promise<string> {
    const apiKey = runtime.getSetting("PERPLEXITY_API_KEY");
    if (!apiKey) {
        throw new Error("Perplexity API key not found in runtime settings");
    }

    elizaLogger.info(
        "Fetching perplexity data for message:",
        message.content.text
    );

    const response = await fetch(PERPLEXITY_API_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            modelClass: ModelClass.LARGE,
            messages: [
                {
                    role: "user",
                    content: `Get real-time information about: ${message.content.text}`,
                },
            ],
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        elizaLogger.error("Perplexity API error:", error);
        throw new Error(
            `Perplexity API error: ${error.message || "Unknown error"}`
        );
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

export const perplexityReplyAction: Action = {
    name: "PERPLEXITY_REPLY",
    similes: ["REPLY_WITH_DATA", "ANSWER_WITH_FACTS", "REAL_TIME_REPLY"],
    description:
        "Use this action to get real-time information when users ask about current events, prices, or other time-sensitive data.",

    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        const apiKey = runtime.getSetting("PERPLEXITY_API_KEY");
        if (!apiKey) {
            elizaLogger.error("Missing PERPLEXITY_API_KEY in runtime settings");
            return false;
        }
        return true;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ): Promise<boolean> => {
        try {
            elizaLogger.info("Starting perplexity reply handler");

            // Get real-time data
            const perplexityData = await getPerplexityData(runtime, message);
            elizaLogger.info("Got perplexity data");

            // Get relevant knowledge
            const relevantKnowledge = agentKnowledgeBase.getRelevant(
                message.content.text
            );

            // Use Twitter's context composition
            const context = composeContext({
                state: {
                    ...state,
                    perplexityData,
                    agentKnowledge: relevantKnowledge,
                    currentPost: message.content.text,
                    formattedConversation: message.content.thread || "",
                    imageDescriptions: message.content.imageDescriptions || "",
                    twitterUserName: runtime.getSetting("TWITTER_USERNAME"),
                    recentPostInteractions: state.recentPostInteractions || "",
                    recentPosts: state.recentPosts || "",
                    actionNames: state.actionNames || "",
                },
                template: perplexityTwitterTemplate,
            });

            const response = await generateMessageResponse({
                runtime,
                context,
                modelClass: ModelClass.LARGE,
            });

            await callback({
                text: response.text,
                inReplyTo: message.id,
                action: "PERPLEXITY_REPLY",
                source: "twitter",
            });

            elizaLogger.info("Successfully completed perplexity reply");
            return true;
        } catch (error) {
            elizaLogger.error("Perplexity handler error:", error);
            return false;
        }
    },

    examples: [
        [
            {
                user: "user",
                content: {
                    text: "What's the latest news about AI?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "Just saw some fascinating developments in neural networks! The way they're mimicking human learning patterns is mind-blowing. Always exciting to see how far we can push the boundaries of machine intelligence.",
                    action: "PERPLEXITY_REPLY",
                },
            },
        ],
        [
            {
                user: "user",
                content: {
                    text: "What's happening with crypto prices today?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "Been watching the markets closely - seeing some interesting moves in the crypto space. The volatility never fails to keep us on our toes!",
                    action: "PERPLEXITY_REPLY",
                },
            },
        ],
    ],
} as Action;
