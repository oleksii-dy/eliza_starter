import {
    Evaluator,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
} from "@elizaos/core";

export const sampleEvaluator: Evaluator = {
    alwaysRun: false,
    description: "Sample evaluator for checking important content in memory",
    similes: ["content checker", "memory evaluator"],
    examples: [
        {
            context: "Checking if memory contains important content",
            messages: [
                {
                    action: "evaluate",
                    input: "This is an important message",
                    output: {
                        score: 1,
                        reason: "Memory contains important content.",
                    },
                },
            ],
            outcome: "Memory should be evaluated as important",
        },
    ],
    handler: async (runtime: IAgentRuntime, memory: Memory, state: State) => {
        // Evaluation logic for the evaluator
        elizaLogger.log("Evaluating data in sampleEvaluator...");
        return true;

    },
    name: "sampleEvaluator",
    validate: async (runtime: IAgentRuntime, memory: Memory, state: State) => {
        // Validation logic for the evaluator
        return true;
    },
};
