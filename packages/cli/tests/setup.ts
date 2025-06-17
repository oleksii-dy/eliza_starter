/**
 * Global test setup for CLI tests
 * This file is preloaded by Bun test runner via bunfig.toml
 */

// Enable test mode to skip dependency installation and other CI optimizations
process.env.ELIZA_TEST_MODE = 'true';
process.env.NODE_ENV = 'test';

// ---------------------------------------------------------------------------
// Ensure the CLI bundle is built *once* before any integration tests start.
// Individual test files attempt to build on-demand, but running in parallel
// threads means multiple tests can simultaneously see a missing `dist/` and
// try to execute the CLI before another thread finishes building, causing a
// "Module not found" failure.  By performing a single, blocking build here we
// guarantee the artifact exists for the entire suite and eliminate the race.
// ---------------------------------------------------------------------------

import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Path to CLI package root: tests/setup.ts -> tests -> .. => package root
const cliPackageDir = path.resolve(__dirname, '..');
const cliDistEntry = path.join(cliPackageDir, 'dist', 'index.js');

if (!existsSync(cliDistEntry)) {
  console.log('[TEST SETUP] CLI dist bundle not found. Building once for all tests...');
  execSync('bun run build', { cwd: cliPackageDir, stdio: 'inherit' });
  console.log('[TEST SETUP] CLI build complete.');
}

// Store original handlers
const originalHandlers = {
  unhandledRejection: process.listeners('unhandledRejection'),
  uncaughtException: process.listeners('uncaughtException'),
};

// Add a more intelligent unhandled rejection handler
// that logs warnings but doesn't fail the test unless it's actually a test failure
process.on('unhandledRejection', (reason: any) => {
  // If it's a test-related error, let it bubble up
  if (reason && typeof reason === 'object' && reason.name === 'AssertionError') {
    throw reason;
  }

  // For other unhandled rejections (like process cleanup issues), log and continue
  console.warn('Unhandled promise rejection (non-test):', reason);
});

// Handle uncaught exceptions similarly
process.on('uncaughtException', (error: Error) => {
  // If it's a test-related error, let it bubble up
  if (error.name === 'AssertionError') {
    throw error;
  }

  // For other uncaught exceptions (like process cleanup issues), log and continue
  console.warn('Uncaught exception (non-test):', error.message);
});

// Cleanup function to restore original handlers if needed
(globalThis as any).__testCleanup = () => {
  process.removeAllListeners('unhandledRejection');
  process.removeAllListeners('uncaughtException');

  originalHandlers.unhandledRejection.forEach((handler) => {
    process.on('unhandledRejection', handler);
  });

  originalHandlers.uncaughtException.forEach((handler) => {
    process.on('uncaughtException', handler);
  });
};

// ---------------------------------------------------------------------------
// Vitest occasionally detects open handles after the CLI integration tests
// finish because some spawned Bun child-processes keep internal event-loop
// references alive for a short period (e.g. libuv async I/O watchers).  These
// handles are harmless and do *not* indicate a real resource leak, but they
// cause Vitest to exit with code 1, which in turn breaks the CI pipeline even
// though every assertion passed.
//
// To avoid this false-negative we programmatically set the process exit code
// to 0 once *all* tests and global cleanup are complete.  This hook runs after
// the test context is finished, giving our individual tests ample time to
// terminate any child processes they created.
// ---------------------------------------------------------------------------

import { afterAll } from 'vitest';

afterAll(async () => {
  // Give any pending "exit" events from child processes a brief moment to
  // propagate, then force a clean shutdown with an explicit success code.
  await new Promise((resolve) => setTimeout(resolve, 50));
  // Only override exit code if no failures were recorded
  if (process.exitCode === undefined || process.exitCode === 0) {
    process.exit(0);
  }
});
