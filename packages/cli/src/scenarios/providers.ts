import { Scenario } from '../scenarios/schema';
import { Service } from '@elizaos/core';
/**
 * The result of executing the 'run' block in a scenario.
 */
export interface ExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  // We may add more fields later, like file outputs.
}
/**
 * Defines the contract for an environment where a scenario can be executed.
 */
export interface EnvironmentProvider {
  /**
   * Prepares the environment for the run. This includes creating temporary
   * directories and seeding the file system.
   * @param scenario The full scenario definition object.
   */
  setup(scenario: Scenario): Promise<void>;
  /**
   * Executes the primary run command of the scenario.
   * @param scenario The full scenario definition object.
   */
  run(scenario: Scenario): Promise<ExecutionResult>;
  /**
   * Cleans up any resources created during the setup and run phases.
   */
  teardown(): Promise<void>;
}

/**
 * Defines the shape of the E2B service we expect from the runtime.
 * Based on the @elizaos/plugin-e2b documentation.
 */
export interface E2BService extends Service {
  createSandbox(config: { template?: string; timeoutMs?: number }): Promise<string>; // Returns sandboxId
  executeCode(code: string, language?: string): Promise<{ stdout: string; stderr: string; exitCode: number }>;
  writeFileToSandbox(sandboxId: string, path: string, content: string): Promise<void>;
  killSandbox(sandboxId: string): Promise<void>;
} 