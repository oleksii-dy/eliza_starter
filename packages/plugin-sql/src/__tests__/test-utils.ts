import { logger } from '@elizaos/core';
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
    registerDatabaseAdapter: jest.fn ? jest.fn() : () => {},
    services,
    adapter: null,
    databaseAdapter: null,
  };
}
