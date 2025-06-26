/**
 * Test setup file to configure the test environment
 * This runs before any tests to ensure proper isolation
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Add global error handler for database errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('[TEST SETUP] Unhandled Rejection at:', promise, 'reason:', reason);
  if (reason instanceof Error && reason.message.includes('connect')) {
    console.error('[TEST SETUP] Database connection error detected - ensure PostgreSQL is running');
  }
});

console.log('[TEST SETUP] Tests will use PostgreSQL for database operations');
console.log('[TEST SETUP] PostgreSQL URL:', process.env.POSTGRES_URL ? 'Set' : 'Not set');
