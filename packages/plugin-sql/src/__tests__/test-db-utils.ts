import { v4 as uuidv4 } from 'uuid';
import { rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { logger } from '@elizaos/core';

/**
 * Centralized test database utilities to prevent path length issues
 * and ensure consistent test database management.
 */

// Base directory for all test databases - centralized location
const TEST_DB_BASE_DIR = path.join(process.cwd(), '.eliza', 'test-databases');

// Maximum path segment length to avoid filesystem issues
const MAX_SEGMENT_LENGTH = 32;

/**
 * Ensure the base test database directory exists
 */
async function ensureTestDbDirectory(): Promise<void> {
  if (!existsSync(TEST_DB_BASE_DIR)) {
    await mkdir(TEST_DB_BASE_DIR, { recursive: true });
  }
}

/**
 * Sanitize a test name to be filesystem-safe and reasonable length
 */
function sanitizeTestName(name: string): string {
  // Replace non-alphanumeric characters with underscores
  const sanitized = name.replace(/[^a-zA-Z0-9-_]/g, '_');

  // Truncate if too long
  if (sanitized.length > MAX_SEGMENT_LENGTH) {
    return sanitized.substring(0, MAX_SEGMENT_LENGTH);
  }

  return sanitized;
}

/**
 * Generate a unique test database path
 * @param testName - Name of the test (will be sanitized)
 * @param useMemory - If true, returns an in-memory database path
 */
export async function generateTestDbPath(
  testName: string,
  useMemory: boolean = false
): Promise<string> {
  if (useMemory) {
    // For in-memory databases, use a unique identifier
    const uniqueId = `${sanitizeTestName(testName)}-${Date.now()}-${uuidv4().substring(0, 8)}`;
    return `:memory:${uniqueId}`;
  }

  // Ensure base directory exists
  await ensureTestDbDirectory();

  // Create a unique subdirectory for this test
  const sanitizedName = sanitizeTestName(testName);
  const timestamp = Date.now();
  const uniqueId = uuidv4().substring(0, 8);

  // Keep path segments short to avoid filesystem limits
  const testDir = path.join(TEST_DB_BASE_DIR, `${sanitizedName}-${timestamp}-${uniqueId}`);

  return testDir;
}

/**
 * Clean up a test database directory
 * @param dbPath - Path to the database directory or in-memory identifier
 */
export async function cleanupTestDb(dbPath: string): Promise<void> {
  // Skip cleanup for in-memory databases
  if (dbPath.startsWith(':memory:')) {
    return;
  }

  // Only clean up if it's within our test directory
  if (!dbPath.startsWith(TEST_DB_BASE_DIR)) {
    logger.warn(`[TestDbUtils] Refusing to clean up path outside test directory: ${dbPath}`);
    return;
  }

  if (existsSync(dbPath)) {
    try {
      await rm(dbPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors during cleanup
      logger.debug(`[TestDbUtils] Failed to clean up ${dbPath}:`, error);
    }
  }
}

/**
 * Clean up all test databases (useful for global cleanup)
 */
export async function cleanupAllTestDbs(): Promise<void> {
  if (existsSync(TEST_DB_BASE_DIR)) {
    try {
      await rm(TEST_DB_BASE_DIR, { recursive: true, force: true });
    } catch (error) {
      logger.error('[TestDbUtils] Failed to clean up all test databases:', error);
    }
  }
}

/**
 * Get the base test database directory
 */
export function getTestDbBaseDir(): string {
  return TEST_DB_BASE_DIR;
}

/**
 * Test database manager class for managing multiple test databases in a test suite
 */
export class TestDbManager {
  private testDbs: Set<string> = new Set();

  /**
   * Create a new test database path and track it for cleanup
   */
  async createTestDb(testName: string, useMemory: boolean = false): Promise<string> {
    const dbPath = await generateTestDbPath(testName, useMemory);
    this.testDbs.add(dbPath);
    return dbPath;
  }

  /**
   * Clean up all tracked test databases
   */
  async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.testDbs).map((dbPath) => cleanupTestDb(dbPath));

    await Promise.all(cleanupPromises);
    this.testDbs.clear();
  }

  /**
   * Get all tracked database paths
   */
  getTrackedPaths(): string[] {
    return Array.from(this.testDbs);
  }
}
