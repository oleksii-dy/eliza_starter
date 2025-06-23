/**
 * Test setup file to configure the test environment
 * This runs before any tests to ensure proper isolation
 */

// Ensure WebAssembly is available
if (typeof WebAssembly === 'undefined') {
  console.error('[TEST SETUP] WebAssembly is not available in this environment');
  throw new Error('WebAssembly is required for PGLite');
}

// Clear any PostgreSQL environment variables to ensure tests use PGLite
// Commented out to allow PostgreSQL testing when POSTGRES_URL is set
// process.env.POSTGRES_URL = '';
// process.env.POSTGRES_USER = '';
// process.env.POSTGRES_PASSWORD = '';
// process.env.POSTGRES_HOST = '';
// process.env.POSTGRES_PORT = '';
// process.env.POSTGRES_DATABASE = '';

// Set test environment
process.env.NODE_ENV = 'test';

// Ensure we're using PGLite for tests
process.env.USE_PGLITE_FOR_TESTS = 'true';

// Add global error handler for WebAssembly errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('[TEST SETUP] Unhandled Rejection at:', promise, 'reason:', reason);
  if (reason instanceof Error && reason.message.includes('Aborted()')) {
    console.error('[TEST SETUP] WebAssembly abort detected - this may be due to concurrent PGLite instances');
  }
});

// console.log('[TEST SETUP] Cleared PostgreSQL environment variables');
console.log('[TEST SETUP] Tests will use', process.env.POSTGRES_URL ? 'PostgreSQL' : 'PGLite', 'for database operations'); 
console.log('[TEST SETUP] WebAssembly is available:', typeof WebAssembly !== 'undefined'); 