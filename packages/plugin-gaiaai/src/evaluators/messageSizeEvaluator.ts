import {
    Evaluator,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
    ModelClass,
    generateText
} from '@elizaos/core';

export const messageSizeEvaluator: Evaluator = {
    alwaysRun: true,
    description: 'Monitors and optimizes message sizes by generating summaries of long messages',
    similes: ['size optimizer', 'memory compressor'],
    examples: [
        {
            context: 'Checking if memory exceeds size threshold',
            messages: [
                {
                    action: 'evaluate',
                    input: 'A very long message that exceeds the size limit...',
                    output: {
                        score: 1,
                        reason: 'Message exceeds size threshold and needs optimization'
                    }
                }
            ],
            outcome: 'Message should be summarized and stored as optimized memory'
        }
    ],
    handler: async (runtime: IAgentRuntime, memory: Memory, state: State) => {
        elizaLogger.log('Processing oversized message in messageSizeEvaluator...');

        const summary = await generateText({
            runtime,
            context: `Summarize this message concisely: ${memory.content.text}`,
            modelClass: ModelClass.SMALL
        });

        const optimizedMemory = {
            ...memory,
            content: {
                text: summary,
                metadata: {
                    originalSize: memory.content.text.length,
                    summarized: true
                }
            }
        };

        await runtime.messageManager.createMemory(optimizedMemory);
        elizaLogger.log('Created optimized memory version');

        return {
score: 1,
            reason: 'Message optimized and stored'
        };
    },
    name: 'messageSizeEvaluator',
    validate: async (runtime: IAgentRuntime, memory: Memory, state: State) => {
        const messageSize = JSON.stringify(memory).length;
        const threshold = Number(runtime.getSetting('maxMessageSize')) || 1000;
        return messageSize > threshold;
    }
};