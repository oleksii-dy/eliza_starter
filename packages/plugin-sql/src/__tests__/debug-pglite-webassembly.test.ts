import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { fuzzystrmatch } from '@electric-sql/pglite/contrib/fuzzystrmatch';

describe('PGLite WebAssembly Debug Tests', () => {
  it('should create PGLite instance without extensions', async () => {
    console.log('Testing PGLite without extensions...');
    let instance: PGlite | null = null;
    
    try {
      instance = new PGlite(':memory:', {
        relaxedDurability: true,
        debug: 0,
        extensions: {}, // No extensions
      });
      
      await instance.waitReady;
      console.log('✅ PGLite without extensions works');
      
      // Test basic functionality
      await instance.exec('CREATE TABLE test (id INTEGER)');
      await instance.exec('INSERT INTO test VALUES (1)');
      const result = await instance.query('SELECT * FROM test');
      expect(result.rows.length).toBe(1);
      
    } catch (error) {
      console.error('❌ PGLite without extensions failed:', error.message);
      throw error;
    } finally {
      if (instance) {
        try {
          await instance.close();
        } catch (e) {
          console.warn('Close error:', e);
        }
      }
    }
  });

  it('should create PGLite instance with vector extension only', async () => {
    console.log('Testing PGLite with vector extension only...');
    let instance: PGlite | null = null;
    
    try {
      instance = new PGlite(':memory:', {
        relaxedDurability: true,
        debug: 0,
        extensions: {
          vector, // Only vector extension
        },
      });
      
      await instance.waitReady;
      console.log('✅ PGLite with vector extension works');
      
      // Test vector functionality
      await instance.exec('CREATE EXTENSION IF NOT EXISTS vector');
      await instance.exec('CREATE TABLE test_vector (id INTEGER, vec vector(3))');
      await instance.exec('INSERT INTO test_vector VALUES (1, \'[1,2,3]\')');
      const result = await instance.query('SELECT * FROM test_vector');
      expect(result.rows.length).toBe(1);
      
    } catch (error) {
      console.error('❌ PGLite with vector extension failed:', error.message);
      throw error;
    } finally {
      if (instance) {
        try {
          await instance.close();
        } catch (e) {
          console.warn('Close error:', e);
        }
      }
    }
  });

  it('should create PGLite instance with fuzzystrmatch extension only', async () => {
    console.log('Testing PGLite with fuzzystrmatch extension only...');
    let instance: PGlite | null = null;
    
    try {
      instance = new PGlite(':memory:', {
        relaxedDurability: true,
        debug: 0,
        extensions: {
          fuzzystrmatch, // Only fuzzystrmatch extension
        },
      });
      
      await instance.waitReady;
      console.log('✅ PGLite with fuzzystrmatch extension works');
      
      // Test fuzzystrmatch functionality
      await instance.exec('CREATE EXTENSION IF NOT EXISTS fuzzystrmatch');
      const result = await instance.query('SELECT levenshtein(\'hello\', \'world\')');
      expect(result.rows.length).toBe(1);
      
    } catch (error) {
      console.error('❌ PGLite with fuzzystrmatch extension failed:', error.message);
      throw error;
    } finally {
      if (instance) {
        try {
          await instance.close();
        } catch (e) {
          console.warn('Close error:', e);
        }
      }
    }
  });

  it('should create PGLite instance with both extensions', async () => {
    console.log('Testing PGLite with both extensions...');
    let instance: PGlite | null = null;
    
    try {
      instance = new PGlite(':memory:', {
        relaxedDurability: true,
        debug: 0,
        extensions: {
          vector,
          fuzzystrmatch,
        },
      });
      
      await instance.waitReady;
      console.log('✅ PGLite with both extensions works');
      
      // Test both extensions
      await instance.exec('CREATE EXTENSION IF NOT EXISTS vector');
      await instance.exec('CREATE EXTENSION IF NOT EXISTS fuzzystrmatch');
      await instance.exec('CREATE TABLE test_both (id INTEGER, vec vector(3))');
      await instance.exec('INSERT INTO test_both VALUES (1, \'[1,2,3]\')');
      
      const vectorResult = await instance.query('SELECT * FROM test_both');
      const fuzzyResult = await instance.query('SELECT levenshtein(\'hello\', \'world\')');
      
      expect(vectorResult.rows.length).toBe(1);
      expect(fuzzyResult.rows.length).toBe(1);
      
    } catch (error) {
      console.error('❌ PGLite with both extensions failed:', error.message);
      throw error;
    } finally {
      if (instance) {
        try {
          await instance.close();
        } catch (e) {
          console.warn('Close error:', e);
        }
      }
    }
  });

  it('should test rapid instance creation and destruction', async () => {
    console.log('Testing rapid instance creation/destruction...');
    const instances: PGlite[] = [];
    
    try {
      // Create multiple instances rapidly
      for (let i = 0; i < 3; i++) {
        console.log(`Creating instance ${i + 1}/3...`);
        const instance = new PGlite(':memory:', {
          relaxedDurability: true,
          debug: 0,
          extensions: {}, // Start with no extensions
        });
        
        await instance.waitReady;
        instances.push(instance);
        
        // Add small delay between instances
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('✅ Rapid instance creation works');
      
    } catch (error) {
      console.error('❌ Rapid instance creation failed:', error.message);
      throw error;
    } finally {
      // Clean up all instances
      for (const instance of instances) {
        try {
          await instance.close();
        } catch (e) {
          console.warn('Instance close error:', e);
        }
      }
    }
  });
});