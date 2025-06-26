export async function setup() {
  console.log('[GLOBAL SETUP] Starting test environment setup...');

  // Check PostgreSQL environment
  if (!process.env.POSTGRES_URL && !process.env.TEST_POSTGRES_URL) {
    console.warn('[GLOBAL SETUP] Warning: No PostgreSQL URL configured');
  }

  console.log('[GLOBAL SETUP] Test environment ready');
}

export async function teardown() {
  console.log('[GLOBAL TEARDOWN] Cleaning up test environment...');

  // No specific cleanup needed for PostgreSQL connections
  // Connections are managed by individual test adapters

  console.log('[GLOBAL TEARDOWN] Cleanup complete');
}
