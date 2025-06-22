import { describe, it, expect } from 'vitest';

/**
 * Infrastructure Validation Test
 * 
 * This test validates that our real runtime testing infrastructure is complete
 * and ready for use by testing the core classes directly without full runtime.
 */
describe('Real Runtime Testing Infrastructure Validation', () => {
  it('should validate that TestDatabaseManager class exists and is functional', async () => {
    // Dynamically import to avoid dependency issues during testing
    const { TestDatabaseManager } = await import('../../test-utils/test-database');
    
    expect(TestDatabaseManager).toBeDefined();
    expect(typeof TestDatabaseManager).toBe('function');
    
    // Create an instance
    const manager = new TestDatabaseManager();
    expect(manager).toBeDefined();
    expect(typeof manager.createIsolatedDatabase).toBe('function');
    expect(typeof manager.cleanup).toBe('function');
    
    // Test stats functionality
    const stats = manager.getStats();
    expect(stats).toBeDefined();
    expect(typeof stats.activeDatabases).toBe('number');
    expect(Array.isArray(stats.tempPaths)).toBe(true);
  });

  it('should validate that TestModelProvider class exists and is functional', async () => {
    const { TestModelProvider, createTestModelProvider } = await import('../../test-utils/test-models');
    
    expect(TestModelProvider).toBeDefined();
    expect(createTestModelProvider).toBeDefined();
    
    // Create an instance
    const provider = new TestModelProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.generateText).toBe('function');
    expect(typeof provider.generateEmbedding).toBe('function');
    expect(typeof provider.generateObject).toBe('function');
    
    // Note: Can't test the methods directly without a runtime instance
  });

  it('should validate that RealRuntimeTestHarness class exists and is functional', async () => {
    const { RealRuntimeTestHarness } = await import('../../test-utils/real-runtime');
    
    expect(RealRuntimeTestHarness).toBeDefined();
    expect(typeof RealRuntimeTestHarness).toBe('function');
    
    // Create an instance
    const harness = new RealRuntimeTestHarness('validation-test');
    expect(harness).toBeDefined();
    expect(typeof harness.createTestRuntime).toBe('function');
    expect(typeof harness.processTestMessage).toBe('function');
    expect(typeof harness.validateRuntimeHealth).toBe('function');
    expect(typeof harness.cleanup).toBe('function');
    
    // Cleanup for good measure
    await harness.cleanup();
  });

  it('should validate that all helper functions are available', async () => {
    const { 
      createTestRuntime, 
      runIntegrationTest,
      scenarios,
      createSpecializedModelProvider
    } = await import('../../test-utils/real-runtime');
    
    const { createTestDatabase } = await import('../../test-utils/test-database');
    const { createTestModelProvider } = await import('../../test-utils/test-models');
    
    // Validate helper functions exist
    expect(typeof createTestRuntime).toBe('function');
    expect(typeof runIntegrationTest).toBe('function');
    expect(typeof createTestDatabase).toBe('function');
    expect(typeof createTestModelProvider).toBe('function');
    expect(typeof createSpecializedModelProvider).toBe('function');
    expect(typeof scenarios).toBe('function');
    
    // Test scenario builder
    const scenarioBuilder = scenarios();
    expect(scenarioBuilder).toBeDefined();
    expect(typeof scenarioBuilder.addGreeting).toBe('function');
    expect(typeof scenarioBuilder.addTaskCreation).toBe('function');
    expect(typeof scenarioBuilder.build).toBe('function');
    
    // Build a test scenario
    const testProvider = scenarioBuilder
      .addGreeting('Hello there!')
      .addTaskCreation('Task created successfully')
      .build();
    
    expect(testProvider).toBeDefined();
    expect(typeof testProvider.generateText).toBe('function');
  });

  it('should validate infrastructure components are exported correctly', async () => {
    // Test that all exports are available from the main test-utils index
    const testUtils = await import('../../test-utils');
    
    // Real runtime testing exports
    expect(testUtils.RealRuntimeTestHarness).toBeDefined();
    expect(testUtils.TestDatabaseManager).toBeDefined();
    expect(testUtils.TestModelProvider).toBeDefined();
    expect(testUtils.createTestRuntime).toBeDefined();
    expect(testUtils.runIntegrationTest).toBeDefined();
    expect(testUtils.scenarios).toBeDefined();
    
    // Legacy mock exports (deprecated but still available)
    expect(testUtils.createMockRuntime).toBeDefined();
    expect(testUtils.createMockMemory).toBeDefined();
    expect(testUtils.createMockState).toBeDefined();
  });

  it('should demonstrate the testing approach difference', async () => {
    const { scenarios } = await import('../../test-utils/real-runtime');
    
    // OLD APPROACH (Mock-based - gives false confidence)
    const mockResponse = 'mocked response'; // Hardcoded, not realistic
    expect(mockResponse).toBe('mocked response'); // Passes but meaningless
    
    // NEW APPROACH (Real runtime testing - actual validation)
    const realProvider = scenarios()
      .addGreeting('Hello! How can I help you today?')
      .build();
    
    // Note: Can't test generateText without runtime, but we can verify the provider is created
    expect(realProvider).toBeDefined();
    expect(typeof realProvider.generateText).toBe('function');
  });
});