import { describe, expect, it, beforeEach, afterEach, mock } from 'bun:test';
import { MigrationLockManager } from '../migration-lock-manager';
import { sql } from 'drizzle-orm';
import { migrationLockTable, migrationHistoryTable } from '../schema';

// Mock dependencies
const mockExecute = mock();
const mockInsert = mock();
const mockDelete = mock();
const mockSelect = mock();
const mockWhere = mock();
const mockLimit = mock();
const mockValues = mock();
const mockFrom = mock();
const mockWhereSelect = mock();

// Mock logger
const mockLogger = {
  info: mock(),
  warn: mock(),
  error: mock(),
  debug: mock(),
};

// Mock the @elizaos/core module
mock.module('@elizaos/core', () => ({
  logger: mockLogger,
}));

// Create mock database
const mockDb = {
  execute: mockExecute,
  insert: mockInsert,
  delete: mockDelete,
  select: mockSelect,
};

// Setup method chaining for insert
mockValues.mockReturnValue(Promise.resolve());
mockInsert.mockReturnValue({ values: mockValues });

// Setup method chaining for delete
mockWhere.mockReturnValue(Promise.resolve());
mockDelete.mockReturnValue({ where: mockWhere });

// Setup method chaining for select
mockLimit.mockReturnValue(Promise.resolve([]));
mockWhereSelect.mockReturnValue({ limit: mockLimit });
mockFrom.mockReturnValue({ where: mockWhereSelect });
mockSelect.mockReturnValue({ from: () => mockFrom });

describe('MigrationLockManager', () => {
  let lockManager: MigrationLockManager;

  beforeEach(() => {
    // Clear all mocks
    mockExecute.mockClear();
    mockInsert.mockClear();
    mockDelete.mockClear();
    mockSelect.mockClear();
    mockValues.mockClear();
    mockWhere.mockClear();
    mockLimit.mockClear();
    mockFrom.mockClear();
    mockWhereSelect.mockClear();
    Object.values(mockLogger).forEach(fn => fn.mockClear());

    // Create new instance
    lockManager = new MigrationLockManager(mockDb as any);
  });

  describe('acquireLock', () => {
    it('should acquire advisory lock successfully', async () => {
      // Mock successful table existence check
      mockExecute.mockResolvedValueOnce({
        rows: [{ history_exists: true, lock_exists: true }],
      });

      // Mock successful lock acquisition
      mockExecute.mockResolvedValueOnce({
        rows: [{ acquired: true }],
      });

      const result = await lockManager.acquireLock('test_lock');

      expect(result).toBe(true);
      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Acquired advisory lock')
      );
    });

    it('should return false when lock is already held', async () => {
      // Mock table existence check
      mockExecute.mockResolvedValueOnce({
        rows: [{ history_exists: true, lock_exists: true }],
      });

      // Mock failed lock acquisition
      mockExecute.mockResolvedValueOnce({
        rows: [{ acquired: false }],
      });

      const result = await lockManager.acquireLock('test_lock');

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to acquire advisory lock')
      );
    });

    it('should fall back to table-based locking when advisory lock fails', async () => {
      // Mock table existence check
      mockExecute.mockResolvedValueOnce({
        rows: [{ history_exists: true, lock_exists: true }],
      });

      // Mock advisory lock error
      mockExecute.mockRejectedValueOnce(new Error('Advisory lock not supported'));

      // Mock successful table insert
      mockValues.mockResolvedValueOnce(undefined);

      const result = await lockManager.acquireLock('test_lock');

      expect(result).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error acquiring lock')
      );
    });

    it('should create migration tables if they do not exist', async () => {
      // Mock tables don't exist
      mockExecute.mockResolvedValueOnce({
        rows: [{ history_exists: false, lock_exists: false }],
      });

      // Mock table creation
      mockExecute.mockResolvedValueOnce({ rows: [] }); // Create history table
      mockExecute.mockResolvedValueOnce({ rows: [] }); // Create history index
      mockExecute.mockResolvedValueOnce({ rows: [] }); // Create lock table

      // Mock successful lock acquisition
      mockExecute.mockResolvedValueOnce({
        rows: [{ acquired: true }],
      });

      const result = await lockManager.acquireLock('test_lock');

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[MigrationLockManager] Creating migration_history table'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[MigrationLockManager] Creating migration_lock table'
      );
    });
  });

  describe('releaseLock', () => {
    it('should release advisory lock successfully', async () => {
      // First acquire a lock
      mockExecute.mockResolvedValueOnce({
        rows: [{ history_exists: true, lock_exists: true }],
      });
      mockExecute.mockResolvedValueOnce({
        rows: [{ acquired: true }],
      });
      
      await lockManager.acquireLock('test_lock');

      // Mock lock release
      mockExecute.mockResolvedValueOnce({
        rows: [{ released: true }],
      });

      await lockManager.releaseLock('test_lock');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Released advisory lock')
      );
    });

    it('should handle release errors gracefully', async () => {
      // First acquire a lock
      mockExecute.mockResolvedValueOnce({
        rows: [{ history_exists: true, lock_exists: true }],
      });
      mockExecute.mockResolvedValueOnce({
        rows: [{ acquired: true }],
      });
      
      await lockManager.acquireLock('test_lock');

      // Mock lock release error
      mockExecute.mockRejectedValueOnce(new Error('Release failed'));

      await lockManager.releaseLock('test_lock');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error releasing lock')
      );
    });

    it('should do nothing if no lock is held', async () => {
      await lockManager.releaseLock('test_lock');

      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  describe('waitForLock', () => {
    it('should acquire lock immediately if available', async () => {
      // Mock table existence and successful lock
      mockExecute.mockResolvedValueOnce({
        rows: [{ history_exists: true, lock_exists: true }],
      });
      mockExecute.mockResolvedValueOnce({
        rows: [{ acquired: true }],
      });

      const result = await lockManager.waitForLock('test_lock', 1000);

      expect(result).toBe(true);
    });

    it('should timeout if lock cannot be acquired', async () => {
      // Always return lock not available
      mockExecute.mockImplementation(() => 
        Promise.resolve({ rows: [{ acquired: false }] })
      );

      const result = await lockManager.waitForLock('test_lock', 100);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Timeout waiting for migration lock')
      );
    });
  });

  describe('isMigrationExecuted', () => {
    it('should return true for executed migration', async () => {
      // Mock the select().from().where().limit() chain to return a result
      const mockLimitResult = mock().mockResolvedValue([{ id: 1 }]);
      const mockWhereResult = { limit: mockLimitResult };
      const mockFromResult = { where: mock().mockReturnValue(mockWhereResult) };
      mockSelect.mockReturnValueOnce({ from: mock().mockReturnValue(mockFromResult) });

      const result = await lockManager.isMigrationExecuted('test_plugin', 'v1.0.0');

      expect(result).toBe(true);
    });

    it('should return false for non-executed migration', async () => {
      // Mock the select().from().where().limit() chain to return empty result
      const mockLimitResult = mock().mockResolvedValue([]);
      const mockWhereResult = { limit: mockLimitResult };
      const mockFromResult = { where: mock().mockReturnValue(mockWhereResult) };
      mockSelect.mockReturnValueOnce({ from: mock().mockReturnValue(mockFromResult) });

      const result = await lockManager.isMigrationExecuted('test_plugin', 'v1.0.0');

      expect(result).toBe(false);
    });

    it('should handle query errors gracefully', async () => {
      // Mock the select() to throw error
      mockSelect.mockImplementationOnce(() => {
        throw new Error('Table does not exist');
      });

      const result = await lockManager.isMigrationExecuted('test_plugin', 'v1.0.0');

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Error checking migration history')
      );
    });
  });

  describe('recordMigration', () => {
    it('should record successful migration', async () => {
      mockValues.mockResolvedValueOnce(undefined);

      await lockManager.recordMigration(
        'test_plugin',
        'v1.0.0',
        'public',
        1234,
        'abc123'
      );

      expect(mockValues).toHaveBeenCalledWith({
        pluginName: 'test_plugin',
        version: 'v1.0.0',
        schemaName: 'public',
        success: true,
        durationMs: 1234,
        checksum: 'abc123',
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Recorded successful migration')
      );
    });

    it('should throw error on recording failure', async () => {
      mockValues.mockRejectedValueOnce(new Error('Insert failed'));

      await expect(
        lockManager.recordMigration('test_plugin', 'v1.0.0', 'public', 1234)
      ).rejects.toThrow('Insert failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error recording migration')
      );
    });
  });

  describe('recordFailedMigration', () => {
    it('should record failed migration', async () => {
      mockValues.mockResolvedValueOnce(undefined);

      await lockManager.recordFailedMigration(
        'test_plugin',
        'v1.0.0',
        'public',
        'Something went wrong',
        5678
      );

      expect(mockValues).toHaveBeenCalledWith({
        pluginName: 'test_plugin',
        version: 'v1.0.0',
        schemaName: 'public',
        success: false,
        errorMessage: 'Something went wrong',
        durationMs: 5678,
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Recorded failed migration')
      );
    });

    it('should truncate long error messages', async () => {
      mockValues.mockResolvedValueOnce(undefined);

      const longError = 'x'.repeat(2000);
      await lockManager.recordFailedMigration(
        'test_plugin',
        'v1.0.0',
        'public',
        longError,
        5678
      );

      const calledWith = mockValues.mock.calls[0][0];
      expect(calledWith.errorMessage.length).toBe(1000);
    });
  });

  describe('calculateSchemaChecksum', () => {
    it('should generate consistent checksum for same schema', () => {
      const schema = {
        table1: { name: 'test' },
        table2: { columns: ['a', 'b'] },
      };

      const checksum1 = MigrationLockManager.calculateSchemaChecksum(schema);
      const checksum2 = MigrationLockManager.calculateSchemaChecksum(schema);

      expect(checksum1).toBe(checksum2);
      expect(checksum1).toHaveLength(64); // SHA-256 produces 64 hex chars
    });

    it('should generate different checksums for different schemas', () => {
      const schema1 = { table1: { name: 'test1', columns: ['id', 'name'] } };
      const schema2 = { table2: { name: 'test2', columns: ['id', 'email'] } };

      const checksum1 = MigrationLockManager.calculateSchemaChecksum(schema1);
      const checksum2 = MigrationLockManager.calculateSchemaChecksum(schema2);

      expect(checksum1).not.toBe(checksum2);
    });
  });
});