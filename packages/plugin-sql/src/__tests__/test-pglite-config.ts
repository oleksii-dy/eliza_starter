import { PGlite, type PGliteOptions } from '@electric-sql/pglite';

/**
 * Create a minimal PGLite configuration optimized for testing.
 * This avoids complex extensions that can cause WebAssembly initialization issues.
 */
export function createTestPGLiteConfig(dataDir?: string): PGliteOptions {
  return {
    dataDir: dataDir || ':memory:',
    // Disable extensions in tests to avoid WebAssembly issues
    extensions: {},
    relaxedDurability: true,
    debug: 0,
  };
}

/**
 * Create a test PGLite instance with retry logic
 */
export async function createTestPGLiteInstance(options: PGliteOptions): Promise<PGlite> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[TEST] Creating PGLite instance (attempt ${attempt}/${maxRetries})`);

      // Force garbage collection before creation
      if (global.gc) {
        global.gc();
      }

      // Add delay between attempts
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }

      const instance = new PGlite(options);
      await instance.waitReady;

      console.log('[TEST] PGLite instance created successfully');
      return instance;
    } catch (error) {
      lastError = error as Error;
      console.warn(`[TEST] PGLite creation attempt ${attempt} failed:`, error.message);
    }
  }

  throw new Error(
    `Test PGLite initialization failed after ${maxRetries} attempts. ` +
    `Last error: ${lastError?.message}`
  );
}
