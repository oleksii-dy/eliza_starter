
import { IAgentRuntime, logger, ModelType } from '@elizaos/core';
import { EvaluationSchema } from './schema';
import { z } from 'zod';

export type Evaluation = z.infer<typeof EvaluationSchema>;

export interface ScenarioResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

export interface Evaluator {
    evaluate(runtime: IAgentRuntime, result: ScenarioResult): Promise<boolean>;
}

class StringContainsEvaluator implements Evaluator {
    constructor(private expected: string, private output: 'stdout' | 'stderr') {}

    async evaluate(_runtime: IAgentRuntime, result: ScenarioResult): Promise<boolean> {
        const actual = this.output === 'stdout' ? result.stdout : result.stderr;
        return actual ? actual.includes(this.expected) : false;
    }
}

class RegexMatchEvaluator implements Evaluator {
    constructor(private pattern: string, private output: 'stdout' | 'stderr') {}

    async evaluate(_runtime: IAgentRuntime, result: ScenarioResult): Promise<boolean> {
        const regex = new RegExp(this.pattern);
        const actual = this.output === 'stdout' ? result.stdout : result.stderr;
        return actual ? regex.test(actual) : false;
    }
}

class FileExistsEvaluator implements Evaluator {
    constructor(private path: string) {}

    async evaluate(runtime: IAgentRuntime, _result: ScenarioResult): Promise<boolean> {
        const e2b = runtime.getService('e2b') as any;
        if (!e2b) {
            return false;
        }
        try {
            const result = await e2b.executeCode(`test -f ${this.path}`, 'bash');
            return !result.error;
        } catch (error) {
            return false;
        }
    }
}

class TrajectoryContainsActionEvaluator implements Evaluator {
    constructor(private action: string) {}

    async evaluate(runtime: IAgentRuntime, _result: ScenarioResult): Promise<boolean> {
        const db = runtime.getService('database') as any;
        if (!db) {
            return false;
        }
        const logs = await db.getLogs({
            type: 'action',
        });
        return logs.some((log: any) => log.body.action === this.action);
    }
}

class LLMJudgeEvaluator implements Evaluator {
    constructor(private prompt: string, private expected: string) {}

    async evaluate(runtime: IAgentRuntime, result: ScenarioResult): Promise<boolean> {
        const response = await runtime.useModel(ModelType.TEXT_LARGE, {
            prompt: `${this.prompt}\n\nAgent Output:\n${result.stdout}\n\nDoes the agent's output meet the expectation? (yes/no)`,
        });
        return response.toLowerCase().includes(this.expected.toLowerCase());
    }
}

export class EvaluationEngine {
    private evaluators: Evaluator[] = [];

    constructor(evaluations: Evaluation[]) {
        for (const evaluation of evaluations) {
            switch (evaluation.type) {
                case 'stdout_contains':
                    this.evaluators.push(new StringContainsEvaluator(evaluation.value, 'stdout'));
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
            if (!(await evaluator.evaluate(runtime, result))) {
                return false;
            }
        }
        return true;
    }
} 