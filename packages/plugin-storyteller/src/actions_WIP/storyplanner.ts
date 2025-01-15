import {
    Action,
    ActionExample,
    IAgentRuntime,
    Memory,
    State,
    composeContext,
    elizaLogger,
    ModelClass,
    generateObject,
} from "@elizaos/core";
import { StoryStructureSchema, isStoryStructure } from "../types";
import { storyPlannerTemplate } from "../templates/storyPlannerTemplate";

async function generateStoryPlan(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
): Promise<boolean> {
    try {
        const context = composeContext({
            state: {
                ...state,
                userPrompt: message?.content?.text
            },
            template: storyPlannerTemplate,
        });

        const storyStructure = await generateObject({
            runtime,
            context,
            modelClass: ModelClass.LARGE,
            schema: StoryStructureSchema,
        });

        if (!isStoryStructure(storyStructure.object)) {
            elizaLogger.error(
                "Invalid story structure generated:",
                storyStructure.object
            );
            return false;
        }

        if (state) {
            state.storyStructure = storyStructure.object;
            state.lastGeneratedAt = new Date().toISOString();
        }

        elizaLogger.info("Successfully generated story structure");
        return true;
    } catch (error) {
        elizaLogger.error("Error generating story plan:", error);
        return false;
    }
}

export const storyPlannerAction: Action = {
    name: "STORY_PLANNER",
    similes: [
        "PLOT",
        "OUTLINE",
        "STORY_STRUCTURE",
        "NARRATIVE_DESIGN",
        "STORY_OUTLINE"
    ],
    description: "Create a detailed story outline including plot points, character arcs, and narrative structure. Break down the story into acts, identify key scenes, and highlight character development opportunities.",
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Basic validation to ensure we have some content to work with
        return message?.content?.text?.length > 0;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State
    ): Promise<boolean> => {
        return await generateStoryPlan(runtime, message, state);
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Help me plan a story about a detective who discovers magic is real" },
            },
            {
                user: "{{user2}}",
                content: { 
                    text: "I'll help you structure this story with a detailed outline including acts, character arcs, and themes.",
                    action: "STORY_PLANNER" 
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "I need help developing the character arc for my protagonist" },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll create a detailed character development plan with key growth points and arc progression.",
                    action: "STORY_PLANNER"
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Can you help me structure the plot points for my fantasy novel?" },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll create a comprehensive plot structure with key story beats and narrative progression.",
                    action: "STORY_PLANNER"
                },
            },
        ]
    ] as ActionExample[][],
} as Action;