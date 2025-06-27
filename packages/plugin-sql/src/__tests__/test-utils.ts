import { logger } from '@elizaos/core';
import { beforeEach, afterEach } from 'bun:test';
import * as schema from '../schema';

/**
 * Initialize core tables for tests
 * This replaces the old ensureCoreTablesExist function
 */
export async function initializeTestTables(db: any): Promise<void> {
  logger.info('[test-utils] Initializing test tables...');

  try {
    // The adapter's init() method should handle table creation
    // If we have a db instance directly, we might need to run the schema creation
    if (db.init && typeof db.init === 'function') {
      await db.init();
    }

    logger.info('[test-utils] Test tables initialized');
  } catch (error) {
    logger.error('[test-utils] Failed to initialize test tables:', error);
    throw error;
  }
}

/**
 * Create a mock runtime with services for tests
 */
export function createMockRuntime(settings: Record<string, any> = {}): any {
  const services = new Map();

  return {
    agentId: settings.agentId || 'test-agent-id',
    getSetting: (key: string) => settings[key],
    registerDatabaseAdapter: () => {},
    services,
    adapter: null,
    databaseAdapter: null,
  };
}

// TestSuite class for unified testing structure
export class TestSuite {
  private tests: Array<{
    name: string;
    fn: (context: any) => Promise<void> | void;
  }> = [];
  private beforeEachFn?: (context: any) => Promise<void> | void;
  private afterEachFn?: (context: any) => Promise<void> | void;

  constructor(private name: string) {}

  beforeEach<T = any>(fn: (context: T) => Promise<void> | void): void {
    this.beforeEachFn = fn;
  }

  afterEach<T = any>(fn: (context: T) => Promise<void> | void): void {
    this.afterEachFn = fn;
  }

  addTest<T = any>(name: string, fn: (context: T) => Promise<void> | void): void {
    this.tests.push({ name, fn });
  }

  run(): void {
    // Set up the test suite using Bun's test framework
    const context: any = {};

    if (this.beforeEachFn) {
      beforeEach(() => {
        return this.beforeEachFn?.(context);
      });
    }

    if (this.afterEachFn) {
      afterEach(() => {
        return this.afterEachFn?.(context);
      });
    }

    // Register each test with Bun
    for (const test of this.tests) {
      const testFn = async () => {
        return test.fn(context);
      };

      // Use Bun's test function to register the test
      const { test: bunTest } = require('bun:test');
      bunTest(test.name, testFn);
    }
  }
}

// Helper function to create a TestSuite
export function createUnitTest(name: string): TestSuite {
  const testSuite = new TestSuite(name);

  // Auto-run the test suite
  setTimeout(() => {
    testSuite.run();
  }, 0);

  return testSuite;
}

// Additional helper functions for specific test types
export function createPluginTest(name: string): TestSuite {
  return createUnitTest(`Plugin: ${name}`);
}

export function createIntegrationTest(name: string): TestSuite {
  return createUnitTest(`Integration: ${name}`);
}
