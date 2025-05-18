import type { Evaluator, IAgentRuntime, Memory, State } from '@elizaos/core';

export const answerEvaluator: Evaluator = {
  name: 'deepSearchAnswerEvaluator',
  description: 'Evaluates the context for a DeepSearch action call.',
  validate: async () => true, // Basic validation, always true for now
  handler: async (
    _runtime: IAgentRuntime,
    memory: Memory, // Input memory that triggered the action
    _state: State | undefined,
    options: { [key: string]: unknown } | undefined // Options passed to the action
  ) => {
    let score = 0.5; // Default score for invoking deepSearch
    let feedback = 'DeepSearch action called.';

    const questionProperty = options?.question;
    const questionText =
      memory.content.text || (typeof questionProperty === 'string' ? questionProperty : undefined);

    if (!questionText || questionText.trim().length === 0) {
      score = 0.2;
      feedback =
        'DeepSearch called without a clear question in memory content or as a string in options.question.';
    } else if (questionText.length < 10) {
      score = 0.4;
      feedback = 'Question for DeepSearch is very short, may lack detail for effective research.';
    } else {
      score = 0.8;
      feedback = 'DeepSearch called with a reasonable question.';
    }

    // Further evaluation could check options for depth/breadth, or runtime state.
    // This evaluator is now focused on the *input* to deepSearch, not its output.

    return { score, feedback };
  },
  examples: [], // Examples for evaluators might be less common or structured differently
};
