import { EnvironmentProvider, ExecutionResult, E2BService } from './providers';
import { Scenario } from './schema';
import { IAgentRuntime } from '@elizaos/core';

export class E2BEnvironmentProvider implements EnvironmentProvider {
  private runtime: IAgentRuntime;
  private e2bService: E2BService;
  private sandboxId: string | null = null;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
    // Attempt to get the service immediately to fail fast.
    const service = this.runtime.getService<E2BService>('e2b');
    if (!service) {
      throw new Error(
        "E2BEnvironmentProvider required, but 'e2b' service was not found in runtime. " +
        "Please ensure @elizaos/plugin-e2b is installed and configured."
      );
    }
    this.e2bService = service;
  }

  async setup(scenario: Scenario): Promise<void> {
    this.sandboxId = await this.e2bService.createSandbox({});
    
    const virtualFs = scenario.setup?.virtual_fs;
    if (this.sandboxId && virtualFs) {
      for (const [filePath, content] of Object.entries(virtualFs)) {
        await this.e2bService.writeFileToSandbox(this.sandboxId, filePath, content);
      }
    }
  }

  async run(scenario: Scenario): Promise<ExecutionResult> {
    if (!this.sandboxId) {
      throw new Error('Sandbox has not been set up. Call setup() before run().');
    }
    // For now, we'll just execute the first run step's input as a command.
    // This will evolve as the scenario definition becomes more complex.
    const command = scenario.run[0].input;

    return this.e2bService.executeCode(command);
  }

  async teardown(): Promise<void> {
    if (this.sandboxId) {
      await this.e2bService.killSandbox(this.sandboxId);
      this.sandboxId = null;
    }
  }
} 