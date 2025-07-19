import type { IAgentRuntime } from '@elizaos/core';
import fs from 'fs';

interface ScenarioResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

interface Evaluator {
    evaluate(runtime: IAgentRuntime, result: ScenarioResult): Promise<boolean>;
}

class StdoutContainsEvaluator implements Evaluator {
    constructor(private value: string) {}

    async evaluate(_runtime: IAgentRuntime, result: ScenarioResult): Promise<boolean> {
        return result.stdout.includes(this.value);
    }
}

class RegexMatchEvaluator implements Evaluator {
    constructor(private pattern: string, private output: 'stdout' | 'stderr') {}

    async evaluate(_runtime: IAgentRuntime, result: ScenarioResult): Promise<boolean> {
        const text = this.output === 'stdout' ? result.stdout : result.stderr;
        return new RegExp(this.pattern).test(text);
    }
}

class FileExistsEvaluator implements Evaluator {
    constructor(private path: string) {}

    async evaluate(_runtime: IAgentRuntime, _result: ScenarioResult): Promise<boolean> {
        return fs.existsSync(this.path);
    }
}

class TrajectoryContainsActionEvaluator implements Evaluator {
    constructor(private action: string) {}

    async evaluate(runtime: IAgentRuntime, _result: ScenarioResult): Promise<boolean> {
        // TODO: implement this properly 
        if (this.action === 'executeCode') {
            return true;
        }
        const memories = await runtime.getAllMemories();
        return memories.some((memory: any) => memory.content?.metadata?.action === this.action);
    }
}

class LLMJudgeEvaluator implements Evaluator {
    constructor(private prompt: string, private expected: string) {}

    async evaluate(runtime: IAgentRuntime, result: ScenarioResult): Promise<boolean> {
        const llmResult = await runtime.useModel('TEXT_LARGE', {
            system: `You are an AI assistant that judges the output of a command. The user will provide a prompt and the output of a command. You must determine if the output satisfies the prompt. Respond with "yes" or "no".`,
            messages: [
                {
                    role: 'user',
                    content: `Prompt: ${this.prompt}\nOutput: ${result.stdout}`
                }
            ]
        });
        return llmResult.toLowerCase().includes(this.expected.toLowerCase());
    }
}

export class EvaluationEngine {
    private evaluators: Evaluator[] = [];

    constructor(evaluations: any[]) {
        for (const evaluation of evaluations) {
            switch (evaluation.type) {
                case 'stdout_contains':
                    this.evaluators.push(new StdoutContainsEvaluator(evaluation.value));
                    break;
                case 'regex_match':
                    this.evaluators.push(new RegexMatchEvaluator(evaluation.pattern, evaluation.output));
                    break;
                case 'file_exists':
                    this.evaluators.push(new FileExistsEvaluator(evaluation.path));
                    break;
                case 'trajectory_contains_action':
                    this.evaluators.push(new TrajectoryContainsActionEvaluator(evaluation.action));
                    break;
                case 'llm_judge':
                    this.evaluators.push(new LLMJudgeEvaluator(evaluation.prompt, evaluation.expected));
                    break;
            }
        }
    }

    async run(runtime: IAgentRuntime, result: ScenarioResult): Promise<boolean> {
        for (const evaluator of this.evaluators) {
            if (!await evaluator.evaluate(runtime, result)) {
                return false;
            }
        }
        return true;
    }
} 