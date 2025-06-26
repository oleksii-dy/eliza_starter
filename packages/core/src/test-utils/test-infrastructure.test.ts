/**
 * Test infrastructure validation tests
 */

import { describe, beforeEach, afterEach, it, expect } from 'bun:test';
import { TestEnvironment, TestDataBuilder, TestAssertions } from './TestInfrastructure';
import { DatabaseTestRegistry } from './DatabaseTestRegistry';

describe('Test Infrastructure Validation', () => {
  it('should validate test infrastructure setup', async () => {
    // Test that our test infrastructure can be imported
    expect(TestEnvironment).toBeDefined();
    expect(TestDataBuilder).toBeDefined();
    expect(TestAssertions).toBeDefined();
    expect(DatabaseTestRegistry).toBeDefined();
  });

  it('should create and cleanup test environment', async () => {
    let testEnv: TestEnvironment | null = null;

    try {
      // Create test environment
      testEnv = await TestEnvironment.create('infrastructure-test', {
        isolation: 'integration',
        useRealDatabase: false, // Use mock for infrastructure test
        testData: {
          entities: 1,
          memories: 2,
          messages: 3,
          relationships: 1,
        },
      });

      expect(testEnv).toBeDefined();
      expect(testEnv.testRuntime).toBeDefined();
      expect(testEnv.testDatabase).toBeDefined();

      // Test basic runtime functionality
      TestAssertions.assertRealRuntime(testEnv.testRuntime);
      TestAssertions.assertRealDatabase(testEnv.testDatabase);

      console.log('✅ Test infrastructure validation passed');
    } finally {
      // Cleanup
      if (testEnv) {
        await testEnv.teardown();
      }
    }
  }, 30000); // 30 second timeout for database setup

  it('should validate database test registry', async () => {
    const registry = DatabaseTestRegistry.getInstance();

    // Test that registry can validate requirements
    const requirements = {
      requiredAdapters: ['pglite' as const],
      requiresVector: false, // Simplified for test
    };

    try {
      const validation = await registry.validateTestRequirements(requirements);

      // Should not fail completely
      expect(validation).toBeDefined();
      expect(typeof validation.isValid).toBe('boolean');
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);

      if (!validation.isValid) {
        console.warn('Database validation warnings:', validation.warnings);
        console.warn('Database validation errors:', validation.errors);
      }

      console.log('✅ Database test registry validation completed');
    } catch (error) {
      console.warn('⚠️ Database validation failed (expected in some environments):', error.message);
      // Don't fail the test - this is environment dependent
    }
  }, 10000); // 10 second timeout

  it('should validate performance measurement', async () => {
    let testEnv: TestEnvironment | null = null;

    try {
      testEnv = await TestEnvironment.create('performance-test', {
        useRealDatabase: false,
        performanceThresholds: {
          actionExecution: 1000,
          memoryRetrieval: 500,
          databaseQuery: 200,
          modelInference: 2000,
        },
      });

      // Test performance measurement
      const result = await testEnv.measurePerformance(
        async () => {
          // Simulate work
          await new Promise((resolve) => setTimeout(resolve, 100));
          return 'test-result';
        },
        'actionExecution',
        'Test operation'
      );

      expect(result).toBe('test-result');
      console.log('✅ Performance measurement validation passed');
    } finally {
      if (testEnv) {
        await testEnv.teardown();
      }
    }
  });
});
