import { expect } from 'bun:test';
import { createUnitTest } from '../test-utils';

// Import the plugin exports
import { plugin, createDatabaseAdapter } from '../../index';

const testSuite = createUnitTest('SQL Plugin Tests');

// Test context for shared data
interface TestContext {
  agentId: string;
}

testSuite.beforeEach<TestContext>((context) => {
  context.agentId = '00000000-0000-0000-0000-000000000000';
});

testSuite.addTest<TestContext>('should have correct plugin metadata', async (context) => {
  expect(plugin.name).toBe('@elizaos/plugin-sql');
  expect(plugin.description).toBe('A plugin for SQL database access with Drizzle ORM');
  expect(plugin.priority).toBe(0);
});

testSuite.addTest<TestContext>('should have init function', async (context) => {
  expect(plugin.init).toBeDefined();
  expect(typeof plugin.init).toBe('function');
});

testSuite.addTest<TestContext>('should export createDatabaseAdapter function', async (context) => {
  expect(createDatabaseAdapter).toBeDefined();
  expect(typeof createDatabaseAdapter).toBe('function');
});

testSuite.addTest<TestContext>('should have valid plugin structure', async (context) => {
  expect(plugin).toHaveProperty('name');
  expect(plugin).toHaveProperty('description');
  expect(plugin).toHaveProperty('init');
});

testSuite.addTest<TestContext>('should create adapter with postgres config', async (context) => {
  const config = {
    postgresUrl: 'postgresql://localhost:5432/test',
  };

  const adapter = await createDatabaseAdapter(config, context.agentId);
  expect(adapter).toBeDefined();
  expect(adapter.constructor.name).toBe('PgAdapter');
});

testSuite.addTest<TestContext>('should require postgres config when no environment variables are set', async (context) => {
  const config = {};

  try {
    await createDatabaseAdapter(config, context.agentId);
    expect(false).toBe(true); // Should not reach here
  } catch (error) {
    expect(error.message).toContain('PostgreSQL connection string');
  }
});
