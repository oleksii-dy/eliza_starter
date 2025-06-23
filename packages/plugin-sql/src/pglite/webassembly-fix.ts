import { PGlite, type PGliteOptions } from '@electric-sql/pglite';
import { logger } from '@elizaos/core';

/**
 * WebAssembly Memory Management for PGLite
 * 
 * This module provides fixes and workarounds for PGLite WebAssembly initialization issues
 * that can occur in certain runtime environments (especially Bun test runner).
 */

export interface PGLiteInitOptions extends PGliteOptions {
  retries?: number;
  retryDelay?: number;
  fallbackToPostgres?: boolean;
  skipExtensions?: boolean;
}

/**
 * Force garbage collection if available (helps with WebAssembly memory management)
 */
function forceGarbageCollection(): void {
  if (typeof global !== 'undefined' && typeof global.gc === 'function') {
    try {
      global.gc();
    } catch (error) {
      // Ignore gc errors
    }
  }
}

/**
 * Check if we're in a problematic runtime environment for WebAssembly
 */
function isProblematicRuntime(): boolean {
  // Check for Bun test environment
  if (process.env.BUN_ENV === 'test' || process.env.VITEST === 'true') {
    return true;
  }
  
  // Check for Node test environments  
  if (process.env.NODE_ENV === 'test' && typeof process.versions.bun !== 'undefined') {
    return true;
  }
  
  return false;
}

/**
 * Create a minimal PGLite configuration that's more likely to work
 */
function createMinimalConfig(options: PGLiteInitOptions): PGliteOptions {
  const minimal: PGliteOptions = {
    dataDir: options.dataDir || ':memory:',
    relaxedDurability: true,
    debug: 0,
    extensions: options.skipExtensions ? {} : options.extensions,
  };
  
  // Remove any potentially problematic options
  if (isProblematicRuntime()) {
    minimal.extensions = {};
    minimal.loadDataDir = undefined;
  }
  
  return minimal;
}

/**
 * Initialize PGLite with WebAssembly error handling and retries
 */
export async function initializePGLiteWithFix(options: PGLiteInitOptions = {}): Promise<PGlite> {
  const maxRetries = options.retries || 5;
  const retryDelay = options.retryDelay || 2000;
  let lastError: Error | null = null;
  
  // Force garbage collection before starting
  forceGarbageCollection();
  
  const config = createMinimalConfig(options);
  
  logger.info('[PGLite WebAssembly Fix] Attempting to initialize PGLite', {
    dataDir: config.dataDir,
    hasExtensions: Object.keys(config.extensions || {}).length > 0,
    isProblematicRuntime: isProblematicRuntime(),
    maxRetries,
  });
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`[PGLite WebAssembly Fix] Attempt ${attempt}/${maxRetries}`);
      
      // Add progressive delay between attempts
      if (attempt > 1) {
        const delay = retryDelay * Math.pow(1.5, attempt - 2);
        logger.debug(`[PGLite WebAssembly Fix] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Force garbage collection before retry
        forceGarbageCollection();
      }
      
      const instance = new PGlite(config);
      await instance.waitReady;
      
      logger.info('[PGLite WebAssembly Fix] Successfully initialized PGLite');
      return instance;
      
    } catch (error) {
      lastError = error as Error;
      
      logger.warn(`[PGLite WebAssembly Fix] Attempt ${attempt} failed:`, {
        error: error.message,
        isAbortError: error.message.includes('Aborted()'),
        isWebAssemblyError: error.message.includes('WebAssembly'),
      });
      
      // If this is a WebAssembly abort error, try different strategies
      if (error.message.includes('Aborted()')) {
        if (attempt === Math.floor(maxRetries / 2) && !options.skipExtensions) {
          logger.info('[PGLite WebAssembly Fix] Trying without extensions...');
          config.extensions = {};
        }
      }
    }
  }
  
  // All retries failed
  const errorMessage = `PGLite WebAssembly initialization failed after ${maxRetries} attempts. ` +
    `Last error: ${lastError?.message}. ` +
    `This appears to be a WebAssembly compatibility issue in the current runtime environment.`;
  
  logger.error('[PGLite WebAssembly Fix] All initialization attempts failed', {
    lastError: lastError?.message,
    runtime: process.versions,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      BUN_ENV: process.env.BUN_ENV,
      VITEST: process.env.VITEST,
    },
  });
  
  throw new Error(errorMessage);
}

/**
 * Check if PGLite can be initialized in the current environment
 */
export async function testPGLiteCompatibility(): Promise<{
  compatible: boolean;
  error?: string;
  extensions: {
    vector: boolean;
    fuzzystrmatch: boolean;
  };
}> {
  let testInstance: PGlite | null = null;
  
  try {
    // Test basic initialization
    testInstance = await initializePGLiteWithFix({
      dataDir: ':memory:',
      skipExtensions: true,
      retries: 2,
      retryDelay: 1000,
    });
    
    // Test basic functionality
    await testInstance.exec('CREATE TABLE test_compat (id INTEGER)');
    await testInstance.exec('INSERT INTO test_compat VALUES (1)');
    const result = await testInstance.query('SELECT COUNT(*) as count FROM test_compat');
    
    if (result.rows[0].count !== 1) {
      throw new Error('Basic functionality test failed');
    }
    
    await testInstance.close();
    testInstance = null;
    
    // Test extensions
    const extensions = {
      vector: false,
      fuzzystrmatch: false,
    };
    
    // Test vector extension
    try {
      const { vector } = await import('@electric-sql/pglite/vector');
      testInstance = new PGlite(':memory:', {
        relaxedDurability: true,
        extensions: { vector },
      });
      await testInstance.waitReady;
      await testInstance.exec('CREATE EXTENSION IF NOT EXISTS vector');
      extensions.vector = true;
      await testInstance.close();
      testInstance = null;
    } catch (error) {
      logger.debug('[PGLite Compatibility] Vector extension test failed:', error.message);
    }
    
    // Test fuzzystrmatch extension
    try {
      const { fuzzystrmatch } = await import('@electric-sql/pglite/contrib/fuzzystrmatch');
      testInstance = new PGlite(':memory:', {
        relaxedDurability: true,
        extensions: { fuzzystrmatch },
      });
      await testInstance.waitReady;
      await testInstance.exec('CREATE EXTENSION IF NOT EXISTS fuzzystrmatch');
      extensions.fuzzystrmatch = true;
      await testInstance.close();
      testInstance = null;
    } catch (error) {
      logger.debug('[PGLite Compatibility] Fuzzystrmatch extension test failed:', error.message);
    }
    
    return {
      compatible: true,
      extensions,
    };
    
  } catch (error) {
    return {
      compatible: false,
      error: error.message,
      extensions: {
        vector: false,
        fuzzystrmatch: false,
      },
    };
  } finally {
    if (testInstance) {
      try {
        await testInstance.close();
      } catch (error) {
        // Ignore close errors in compatibility test
      }
    }
  }
}