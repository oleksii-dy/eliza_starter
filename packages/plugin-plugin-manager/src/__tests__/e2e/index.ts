/**
 * E2E Test Suite Exports for ElizaOS Test Runner
 *
 * These test suites are designed to be run by the `elizaos test` command,
 * not by vitest. They test the plugin in a live runtime environment.
 */

// Export all e2e test suites
export { pluginManagerScenariosSuite } from './pluginManagerScenarios.e2e.ts';
export { fullLifecycleE2ETest } from './fullLifecycle.e2e.ts';

// Export as e2e for elizaos test runner
export const e2e = [import('./pluginManagerScenarios.e2e.ts'), import('./fullLifecycle.e2e.ts')];
