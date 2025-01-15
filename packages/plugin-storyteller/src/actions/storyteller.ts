import { z } from "zod";
import {
    ActionExample,
    IAgentRuntime,
    Memory,
    State,
    type Action,
    composeContext,
    generateObject,
    ModelClass,
    elizaLogger,
    HandlerCallback,
} from "@elizaos/core";
import { storytellerTemplate } from "../templates/storytellerTemplate";
import { StoryStructure } from "../types";

export const storytellerAction: Action = {
    name: "STORYTELLER",
    similes: [
        "STORY",
    ],
    suppressInitialMessage: true,
    validate: async (_runtime: IAgentRuntime, message: Memory, state?: State) => {
        // Require either a direct prompt or a story structure
        return (message?.content?.text?.length > 0) || (state?.storyStructure !== undefined);
    },
    description:
        "Call this when you want to tell a story set within the world of the Emergence Universe. The story must be in line with Emergence canon. Do not call this action if the conversation does not call for a story.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            elizaLogger.info("Starting storyteller handler with:", {
                messageText: message?.content?.text,
                hasState: !!state,
                storyStructure: state?.storyStructure
            });

            const context = composeContext({
                state: {
                    ...state,
                    userPrompt: message?.content?.text,
                    storyStructure: state?.storyStructure as StoryStructure,
                    recentMessages: state?.recentMessages,
                    storyContext: state?.providers || ""
                },
                template: storytellerTemplate,
            });

            elizaLogger.debug("Generated context:", context);

            const StoryResponseSchema = z.object({ story: z.string() });
            type StoryResponse = z.infer<typeof StoryResponseSchema>;

            const storyContent = await generateObject({
                runtime,
                context,
                modelClass: ModelClass.LARGE,
                schema: StoryResponseSchema,
            });

            elizaLogger.debug("Generated story content:", storyContent);

            // Log the raw response first
            elizaLogger.info("Raw story response:", {
                type: typeof storyContent.object,
                content: storyContent.object
            });

            if (state) {
                // Clean up the story text by removing extra newlines
                const story = (storyContent.object as StoryResponse).story.trim();
                state.generatedStory = story;
                state.lastStoryGeneratedAt = new Date().toISOString();
                elizaLogger.info("Story saved to state:", { 
                    storyLength: story.length,
                });

                // Use the callback to directly send the story response
                if (callback) {
                    callback({
                        type: "story",
                        text: story
                    });
                    elizaLogger.info("Story sent via callback");
                }
            }

            elizaLogger.info("Successfully generated story");
            return true;
        } catch (error) {
            elizaLogger.error("Error generating story:", error);
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Tell me a story about a magical forest" },
            },
            {
                user: "{{user2}}",
                content: { text: "I'd love to share a tale about the Whispering Woods...", action: "STORYTELLING" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "What happened to the dragon after the great battle?" },
            },
            {
                user: "{{user2}}",
                content: { 
                    text: "After the battle, the dragon retreated to the Crystal Mountains where...",
                    action: "STORYTELLING"
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Can you tell me about the ancient prophecy?" },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "The prophecy speaks of three chosen warriors who...",
                    action: "STORYTELLING"
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "What's the origin story of the magic sword?" },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "The Blade of Dawn was forged in the fires of...",
                    action: "STORYTELLING"
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Tell me about the hidden city beneath the ocean" },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Deep beneath the waves lies Aquapolis, a marvel of...",
                    action: "STORYTELLING"
                },
            },
        ]
    ] as ActionExample[][],
} as Action;
