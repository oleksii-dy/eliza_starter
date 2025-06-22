import { describe, it, expect, afterEach } from 'vitest';
import { 
  RealRuntimeTestHarness
} from '../../test-utils/real-runtime';
import { TestDatabaseManager } from '../../test-utils/test-database';
import { TestModelProvider } from '../../test-utils/test-models';

/**
 * Direct Real Runtime Test - bypasses all mock systems
 */
describe('Direct Real Runtime Infrastructure Test', () => {
  let harness: RealRuntimeTestHarness | undefined;

  afterEach(async () => {
    if (harness) {
      await harness.cleanup();
      harness = undefined;
    }
  });

  it('should create database manager', async () => {
    const dbManager = new TestDatabaseManager();
    const adapter = await dbManager.createIsolatedDatabase('test-direct');
    
    expect(adapter).toBeDefined();
    expect(typeof adapter.init).toBe('function');
    expect(typeof adapter.createMemory).toBe('function');
    
    await dbManager.cleanup();
  });

  it('should create model provider', () => {
    const modelProvider = new TestModelProvider();
    
    expect(modelProvider).toBeDefined();
    expect(typeof modelProvider.generateText).toBe('function');
    expect(typeof modelProvider.generateEmbedding).toBe('function');
    
    // Model provider methods require runtime, so we can't test them directly here
  });

  it('should create test harness', () => {
    harness = new RealRuntimeTestHarness('test-harness');
    
    expect(harness).toBeDefined();
    expect(typeof harness.createTestRuntime).toBe('function');
    expect(typeof harness.cleanup).toBe('function');
  });
});