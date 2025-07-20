import chalk from 'chalk';
import type { Scenario } from './schema';
import type { EvaluationResult } from './EvaluationEngine';

export class Reporter {
    private stepResults: { [key: number]: EvaluationResult[] } = {};

    startScenario(scenario: Scenario) {
        console.log(chalk.bold.blue(`Running scenario: ${scenario.name}`));
        if (scenario.description) {
            console.log(chalk.gray(scenario.description));
        }
        console.log('');
    }

    startStep(index: number, input: string) {
        console.log(chalk.bold(`Step ${index + 1}: ${input}`));
    }

    endStep(index: number, results: EvaluationResult[]) {
        this.stepResults[index] = results;
        for (const result of results) {
            if (result.success) {
                console.log(chalk.green(`  ✓ ${result.message}`));
            } else {
                console.log(chalk.red(`  ✗ ${result.message}`));
            }
        }
        console.log('');
    }

    endScenario(judgment?: { pass?: { all?: boolean, any?: boolean }, fail?: { all?: boolean, any?: boolean } }) {
        let passed = false;
        const j = judgment || { pass: { all: true } };

        const allSteps = Object.values(this.stepResults);
        const allEvals = allSteps.flat();

        if (j.pass?.all) {
            passed = allEvals.every(r => r.success);
        } else if (j.pass?.any) {
            passed = allEvals.some(r => r.success);
        } else if (j.fail?.all) {
            passed = !allEvals.every(r => !r.success);
        } else if (j.fail?.any) {
            passed = !allEvals.some(r => !r.success);
        }

        if (passed) {
            console.log(chalk.bold.green('Scenario passed'));
        } else {
            console.log(chalk.bold.red('Scenario failed'));
        }

        return passed;
    }
} 