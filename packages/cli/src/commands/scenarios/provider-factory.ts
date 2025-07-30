import { IAgentRuntime } from '@elizaos/core';
import { E2BEnvironmentProvider } from './e2b-provider';
import { LocalEnvironmentProvider } from './local-provider';
import { EnvironmentProvider } from './providers';
import { Scenario } from './schema';

export function createEnvironmentProvider(
  scenario: Scenario,
  runtime: IAgentRuntime,
): EnvironmentProvider {
  const { type } = scenario.environment;

  switch (type) {
    case 'e2b':
      return new E2BEnvironmentProvider(runtime);
    case 'local':
      return new LocalEnvironmentProvider();
    default:
      // This should be impossible if the schema validation is working
      throw new Error(`Unsupported environment type: ${type}`);
  }
} 