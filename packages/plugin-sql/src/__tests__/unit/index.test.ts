import { describe, expect, it } from 'bun:test';

// Import the plugin exports
import { plugin, createDatabaseAdapter } from '../../index';

describe('SQL Plugin Structure', () => {
  it('should have correct plugin metadata', () => {
    expect(plugin.name).toBe('@elizaos/plugin-sql');
    expect(plugin.description).toBe('A plugin for SQL database access with Drizzle ORM');
    expect(plugin.priority).toBe(0);
  });

  it('should have init function', () => {
    expect(plugin.init).toBeDefined();
    expect(typeof plugin.init).toBe('function');
  });

  it('should export createDatabaseAdapter function', () => {
    expect(createDatabaseAdapter).toBeDefined();
    expect(typeof createDatabaseAdapter).toBe('function');
  });

  it('should have valid plugin structure', () => {
    expect(plugin).toHaveProperty('name');
    expect(plugin).toHaveProperty('description');
    expect(plugin).toHaveProperty('init');
  });
});

describe('createDatabaseAdapter Function', () => {
  const agentId = '00000000-0000-0000-0000-000000000000';

  it('should create adapter with postgres config', async () => {
    const config = {
      postgresUrl: 'postgresql://localhost:5432/test',
    };

    const adapter = await createDatabaseAdapter(config, agentId);
    expect(adapter).toBeDefined();
    expect(adapter.constructor.name).toBe('PgAdapter');
  });

  it('should require postgres config when no environment variables are set', async () => {
    const config = {};

    try {
      await createDatabaseAdapter(config, agentId);
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error.message).toContain('PostgreSQL connection string');
    }
  });
});
