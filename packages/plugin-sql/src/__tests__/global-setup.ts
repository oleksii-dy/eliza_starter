import { PGliteClientManager } from '../pglite/manager';

export async function setup() {
  console.log('[GLOBAL SETUP] Starting test environment setup...');

  // Force cleanup any existing PGLite instances
  await PGliteClientManager.forceCleanupAll();

  // Wait additional time for WebAssembly cleanup
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('[GLOBAL SETUP] Test environment ready');
}

export async function teardown() {
  console.log('[GLOBAL TEARDOWN] Cleaning up test environment...');

  // Force cleanup all PGLite instances
  await PGliteClientManager.forceCleanupAll();

  // Wait for complete cleanup
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('[GLOBAL TEARDOWN] Cleanup complete');
}
