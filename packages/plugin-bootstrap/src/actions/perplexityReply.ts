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

export const perplexityReplyAction: Action = {
    name: "PERPLEXITY_REPLY",
    similes: ["REPLY_WITH_DATA", "ANSWER_WITH_FACTS", "REAL_TIME_REPLY"],
    description:
        "ONLY use this action when the message necessitates a follow up. Do not use this action when the conversation is finished or the user does not wish to speak (use IGNORE instead). If the last message action was PERPLEXITY_REPLY, and the user has not responded. Use sparingly.",
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        const apiKey = runtime.getSetting("PERPLEXITY_API_KEY");
        return Boolean(apiKey);
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ): Promise<boolean> => {
        try {
            const apiKey = runtime.getSetting("PERPLEXITY_API_KEY");
            if (!apiKey) {
                elizaLogger.error(
                    "Perplexity API key not found in runtime settings"
                );
                return false;
            }

            // Get real-time data from Perplexity
            const perplexityResponse = await fetch(PERPLEXITY_API_URL, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "pplx-7b-chat",
                    messages: [
                        {
                            role: "user",
                            content: message.content.text,
                        },
                    ],
                }),
            });

            const data = await perplexityResponse.json();
            const perplexityData = data.choices[0].message.content;

            // Use Twitter's context composition with all required fields
            const context = composeContext({
                state: {
                    ...state,
                    perplexityData,
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

            // Generate response using Twitter's formatting
            const response = await generateMessageResponse({
                runtime,
                context,
                modelClass: ModelClass.LARGE,
            });

            // Use Twitter's callback mechanism
            await callback({
                text: response.text,
                inReplyTo: message.id,
                action: "PERPLEXITY_REPLY",
                source: "twitter",
                thread: message.content.thread,
                imageDescriptions: message.content.imageDescriptions,
            });

            return true;
        } catch (error) {
            elizaLogger.error("Perplexity API error:", error);
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
