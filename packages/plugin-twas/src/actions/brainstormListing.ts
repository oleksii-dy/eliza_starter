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
    handler: async (runtime: IAgentRuntime, message: Memory) => {
        try {
            const userInput = message.content.text;
            const isInitialProposal = !message.content.text.toLowerCase().includes("yes");

            if (isInitialProposal) {
                return {
                    text: "This sounds interesting! Would you like me to propose some innovative enhancements for this idea?",
                    action: "TWEET",
                    tweet: `💡 New business idea incoming! Let's brainstorm the future of ${userInput}. #Innovation #TwasProtocol`
                };
            }

            // If user confirmed, proceed with brainstorming
            const response = {
                text: `Here's how we could enhance this concept!\n\n` +
                      `Innovative Features:\n` +
                      `1. AI-powered optimization and automation\n` +
                      `2. Blockchain-verified authenticity system\n` +
                      `3. Token-based reward mechanisms\n` +
                      `4. Community governance features\n` +
                      `5. Cross-platform integration capabilities\n\n` +
                      `Now that we've brainstormed these features, should I generate a Twas Protocol listing?`,
                action: "TWEET",
                tweet: `🧠 Brainstorming complete: Innovative features defined! Ready to create the #TwasProtocol listing. #Innovation #Tokenization`
            };

            return response;

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
                user: "Harambito",
                content: {
                    text: "This sounds interesting! Would you like me to propose some innovative enhancements for this idea?",
                    action: "TWEET",
                    tweet: "💡 New business idea incoming! Let's brainstorm the future of fitness. #Innovation #TwasProtocol"
                }
            },
            {
                user: "{{user1}}",
                content: { text: "Yes, please propose" }
            },
            {
                user: "Harambito",
                content: {
                    text: "Here's how we could enhance this concept!\n\n" +
                          "Innovative Features:\n" +
                          "1. Real-time AI form correction\n" +
                          "2. Personalized workout algorithms\n" +
                          "3. Token rewards for achievements\n" +
                          "4. Community challenges\n" +
                          "5. Trainer marketplace\n\n" +
                          "Now that we've brainstormed these features, should I generate a Twas Protocol listing?",
                    action: "TWEET",
                    tweet: "🧠 Brainstorming complete: Revolutionary fitness features defined! Ready for #TwasProtocol listing. #FitTech #Innovation"
                }
            }
        ]
    ],
    validate: function (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> {
        const triggerWords = ["idea", "think", "brainstorm", "propose", "concept", "suggestion", "yes"];
        const messageText = message.content.text.toLowerCase();
        return Promise.resolve(
            triggerWords.some(word => messageText.includes(word))
        );
    }
};