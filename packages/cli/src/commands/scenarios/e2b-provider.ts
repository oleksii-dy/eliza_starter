import { EnvironmentProvider, ExecutionResult } from './providers';
import { E2BService } from '@elizaos/plugin-e2b';
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
        await this.e2bService.writeFileToSandbox(this.sandboxId, filePath, content as string);
      }
    }
  }

  async run(scenario: Scenario): Promise<ExecutionResult> {
    if (!this.sandboxId) {
      throw new Error('Sandbox has not been set up. Call setup() before run().');
    }
    const command = scenario.run[0].input;

    const result = await this.e2bService.executeCode(command, 'bash', { sandboxId: this.sandboxId });

    // The E2BService returns a complex object; we need to adapt it to the simple ExecutionResult
    const stdout = result.logs?.stdout?.join('\n') || '';
    const stderr = result.logs?.stderr?.join('\n') || result.error?.value || '';
    const exitCode = result.error ? 1 : 0; // Simplistic; could be improved if e2b provides exit codes

    return {
      stdout,
      stderr,
      exitCode,
    };
  }

  async teardown(): Promise<void> {
    if (this.sandboxId) {
      await this.e2bService.killSandbox(this.sandboxId);
      this.sandboxId = null;
    }
  }
} 