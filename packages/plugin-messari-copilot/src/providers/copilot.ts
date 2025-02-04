import {
    AgentRuntime as IAgentRuntime,
    composeContext,
    generateTrueOrFalse,
    ModelClass,
    elizaLogger,
    generateText,
    booleanFooter,
} from "@elizaos/core";
import type { Memory, Provider, State } from "@elizaos/core";

const copilotProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        const shouldCopilotTemplate = `Messari Copilot is tool that answers any crypto question factually,
         Based on the most recent messages: {{recentMessages}}, does the Agent need to research a topic to answer the question? ${booleanFooter}`;
        const shouldCopilotContext = composeContext({
            state,
            template: shouldCopilotTemplate,
        });
        const shouldCopilot = await generateTrueOrFalse({
            runtime,
            context: shouldCopilotContext,
            modelClass: ModelClass.LARGE,
        });
        if (!shouldCopilot) {
            elizaLogger.info("Messari Copilot is not needed");
            return null;
        }

        const apiKey = process.env.MESSARI_API_KEY;
        if (!apiKey) {
            elizaLogger.error("Messari API key not found");
            return null;
        }

        const GetCopilotQuestionTemplate = `Messari Copilot is tool that answers any crypto question factually,
         Based on the most recent messages: {{recentMessages}}, can you output the open question that needs researching? Only output the question, no other text.`;
        const GetCopilotQuestionContext = composeContext({
            state,
            template: GetCopilotQuestionTemplate,
        });
        const copilotQuestion = await generateText({
            runtime,
            context: GetCopilotQuestionContext,
            modelClass: ModelClass.MEDIUM,
        });
        console.log({ copilotQuestion });

        try {
            const response = await fetch(
                "https://api.messari.io/copilot-api/v0/conversations",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-messari-api-key": apiKey,
                    },
                    body: JSON.stringify({
                        message: copilotQuestion,
                    }),
                }
            );
            if (!response.ok) {
                elizaLogger.error(
                    `Messari API error: ${response.status} ${response.statusText}. Response: ${await response.text()}`
                );
                return null;
            }

            const data = await response.json();
            return data.data.reply.message.content;
        } catch (error) {
            elizaLogger.error("Error calling Messari API:", error);
            return null;
        }
    },
};

export { copilotProvider };
