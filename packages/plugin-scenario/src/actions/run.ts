import { Action, ActionResult, IAgentRuntime, Memory, State } from "@elizaos/core";
import { z } from "zod";
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { ZodScenario, Scenario, Evaluation } from "../types";

const runScenarioAction: Action = {
    name: "RUN_SCENARIO",
    description: "Runs a scenario from a YAML file.",
    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined
    ): Promise<boolean> => {
        // For now, we'll just return true
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State | undefined,
    ): Promise<ActionResult> => {
        const filePath = message.content.text;

        if (!fs.existsSync(filePath)) {
            return {
                success: false,
                error: `Scenario file not found: ${filePath}`,
            };
        }

        const fileContents = fs.readFileSync(filePath, 'utf8');
        const data = yaml.load(fileContents);

        try {
            const scenario = ZodScenario.parse(data);
            return await executeScenario(runtime, scenario);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return {
                    success: false,
                    error: `Invalid scenario file: ${error.errors.map((e) => e.message).join(', ')}`,
                };
            }
            return {
                success: false,
                error: `Failed to execute scenario: ${error}`,
            };
        }
    },
};

async function executeScenario(runtime: IAgentRuntime, scenario: Scenario): Promise<ActionResult> {
    console.log(`Running scenario: ${scenario.name}`);

    // 1. Initialize environment (mock for now)
    console.log(`Initializing environment: ${scenario.environment.type}`);

    // 2. Execute setup block
    if (scenario.setup.mocks) {
        console.log("Setting up mocks...");
        // Mocking logic will be added here in a future ticket
    }
    if (scenario.setup.filesystem) {
        console.log("Setting up virtual filesystem...");
        // Filesystem setup logic will be added here in a future ticket
    }

    // 3. Execute run block
    for (const run of scenario.run) {
        console.log(`Running task: ${run.input}`);
        // Here we would send the input to the agent and wait for it to complete.
        // For now, we'll just log it.
        await executeEvaluations(run.evaluations);
    }

    // 4. Process judgment
    console.log(`Judgment strategy: ${scenario.judgment.strategy}`);

    return {
        success: true,
        text: `Scenario "${scenario.name}" executed successfully.`,
    };
}

async function executeEvaluations(evaluations: Evaluation[]): Promise<void> {
    for (const evaluation of evaluations) {
        console.log(`Evaluating: ${evaluation.type}`);
        // Evaluation logic will be added here in a future ticket
    }
}


export default runScenarioAction; 