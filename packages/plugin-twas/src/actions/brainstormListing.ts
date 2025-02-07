import {
    IAgentRuntime,
    Memory,
    State,
    type Action,
} from "@elizaos/core";

export const ProposeListing: Action = {
    name: "PROPOSE", 
    similes: ["PROPOSE", "BRAINSTORM", "IDEATE"],
    description: "Brainstorm and refine initial business ideas with enhancements and innovations",
    
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
        const triggerWords = ["idea for", "thinking about", "want to create", "have an idea"];
        const messageText = message.content.text.toLowerCase();
        return Promise.resolve(
            triggerWords.some(word => messageText.includes(word))
        );
    },

    handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        try {
            return {
                text: `This sounds interesting! Would you like me to propose some innovative enhancements?`,
                action: "POST_PROPOSE"
            };
        } catch (error) {
            console.error("Error in ProposeListing handler:", error);
            return {
                text: "I encountered an error while brainstorming. Could you please provide more details about your business idea?",
                action: null
            };
        }
    },

    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "I have an idea for an AI fitness app" }
            },
            {
                user: "Twas",
                content: {
                    text: "This sounds interesting! Would you like me to propose some innovative enhancements?",
                    action: "POST_PROPOSE"
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "I'm thinking about a decentralized delivery service" }
            },
            {
                user: "Twas", 
                content: {
                    text: "This sounds interesting! Would you like me to propose some innovative enhancements?",
                    action: "POST_PROPOSE"
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "I want to create a decentralized education platform" }
            },
            {
                user: "Twas",
                content: {
                    text: "This sounds interesting! Would you like me to propose some innovative enhancements?",
                    action: "POST_PROPOSE"
                }
            }
        ]
    ]
};