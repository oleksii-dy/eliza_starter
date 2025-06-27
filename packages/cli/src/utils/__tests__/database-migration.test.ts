import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addVectorColumnsToMemories, runDatabaseMigrations } from '../database-migration';

describe('Database Migration', () => {
  let mockManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a mock database manager
    mockManager = {
      query: vi.fn()
    };
  });

  describe('addVectorColumnsToMemories', () => {
    it('should check if table exists before adding columns', async () => {
      // Mock table exists check - table doesn't exist
      mockManager.query.mockResolvedValueOnce([{ exists: false }]);

      await addVectorColumnsToMemories({ manager: mockManager });

      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('information_schema.tables'),
        ['memories']
      );
      expect(mockManager.query).toHaveBeenCalledTimes(1); // Should stop after table check
    });

    it('should add missing vector columns', async () => {
      // Mock table exists check - table exists
      mockManager.query.mockResolvedValueOnce([{ exists: true }]);
      
      // Mock existing columns check - no columns exist
      mockManager.query.mockResolvedValueOnce([]);
      
      // Mock successful column additions
      const dimensions = [384, 512, 768, 1024, 1536, 3072];
      dimensions.forEach(() => {
        mockManager.query.mockResolvedValueOnce([]);
      });

      await addVectorColumnsToMemories({ manager: mockManager });

      // Should have called: table exists, existing columns, and 6 alter table commands
      expect(mockManager.query).toHaveBeenCalledTimes(8);
      
      // Check that each dimension column was added
      dimensions.forEach(dim => {
        expect(mockManager.query).toHaveBeenCalledWith(
          expect.stringContaining(`ADD COLUMN IF NOT EXISTS dim_${dim} vector(${dim})`)
        );
      });
    });

    it('should skip columns that already exist', async () => {
      // Mock table exists check
      mockManager.query.mockResolvedValueOnce([{ exists: true }]);
      
      // Mock existing columns check - some columns exist
      mockManager.query.mockResolvedValueOnce([
        { column_name: 'dim_384' },
        { column_name: 'dim_1536' }
      ]);
      
      // Mock successful column additions for missing columns
      mockManager.query.mockResolvedValueOnce([]); // dim_512
      mockManager.query.mockResolvedValueOnce([]); // dim_768
      mockManager.query.mockResolvedValueOnce([]); // dim_1024
      mockManager.query.mockResolvedValueOnce([]); // dim_3072

      await addVectorColumnsToMemories({ manager: mockManager });

      // Should not try to add existing columns
      expect(mockManager.query).not.toHaveBeenCalledWith(
        expect.stringContaining('dim_384')
      );
      expect(mockManager.query).not.toHaveBeenCalledWith(
        expect.stringContaining('dim_1536')
      );
      
      // Should add missing columns
      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('dim_512')
      );
      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('dim_768')
      );
    });

    it('should handle pgvector extension not installed error', async () => {
      // Mock table exists check
      mockManager.query.mockResolvedValueOnce([{ exists: true }]);
      
      // Mock existing columns check
      mockManager.query.mockResolvedValueOnce([]);
      
      // Mock error when trying to add column
      mockManager.query.mockRejectedValueOnce(
        new Error('type "vector" does not exist')
      );

      await expect(addVectorColumnsToMemories({ manager: mockManager }))
        .rejects.toThrow('pgvector extension is required but not installed');
    });

    it('should throw error if manager is not provided', async () => {
      await expect(addVectorColumnsToMemories({ manager: null }))
        .rejects.toThrow('Database manager with query method is required');
    });

    it('should use custom table name if provided', async () => {
      // Mock table exists check
      mockManager.query.mockResolvedValueOnce([{ exists: true }]);
      
      // Mock existing columns check
      mockManager.query.mockResolvedValueOnce([]);

      await addVectorColumnsToMemories({ 
        manager: mockManager, 
        tableName: 'custom_memories' 
      });

      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('information_schema.tables'),
        ['custom_memories']
      );
    });
  });

  describe('runDatabaseMigrations', () => {
    it('should run all migrations', async () => {
      // Mock successful migration
      mockManager.query.mockResolvedValueOnce([{ exists: true }]); // table exists
      mockManager.query.mockResolvedValueOnce([]); // no existing columns
      
      // Mock successful column additions
      for (let i = 0; i < 6; i++) {
        mockManager.query.mockResolvedValueOnce([]);
      }

      await runDatabaseMigrations(mockManager);

      // Should have run the vector columns migration
      expect(mockManager.query).toHaveBeenCalled();
    });

    it('should handle migration errors', async () => {
      // Mock error
      mockManager.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(runDatabaseMigrations(mockManager))
        .rejects.toThrow('Database error');
    });
  });
}); 