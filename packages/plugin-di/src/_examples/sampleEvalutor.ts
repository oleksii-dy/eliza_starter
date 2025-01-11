import { IAgentRuntime, Memory, State, elizaLogger } from "@elizaos/core";
import { injectable } from "inversify";
import { BaseInjectableEvaluator } from "../evaluators";
import { EvaluatorOptions } from "../types";
import { globalContainer } from "../di";

const options: EvaluatorOptions = {
    alwaysRun: false,
    name: "sampleEvaluator",
    description: "Sample evaluator for checking important content in memory",
    similes: ["content checker", "memory evaluator"],
    examples: [
        {
            context: "Checking if memory contains important content",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "This is an important message",
                    },
                },
            ],
            outcome: `\`\`\`json
[
  {
    "score": 1,
    "reason": "Memory contains important content."
  }
]
\`\`\``,
        },
    ],
};

@injectable()
export class SampleEvaluator extends BaseInjectableEvaluator {
    constructor() {
        super(options);
    }

    async handler(runtime: IAgentRuntime, memory: Memory, _state?: State) {
        // Evaluation logic for the evaluator
        elizaLogger.log("Evaluating data in sampleEvaluator...");

        // Example evaluation logic
        if (memory.content && memory.content.text.includes("important")) {
            elizaLogger.log("Important content found in memory.");
            return {
                score: 1,
                reason: "Memory contains important content.",
            };
        } else {
            elizaLogger.log("No important content found in memory.");
            return {
                score: 0,
                reason: "Memory does not contain important content.",
            };
        }
    }
}

// Register the sample evaluator with the global container
globalContainer.bind(SampleEvaluator).toSelf().inRequestScope();
