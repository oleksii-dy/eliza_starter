/**
 * Test timeout utilities to prevent tests from hanging
 */

/**
 * Wraps an async function with a timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${errorMessage} after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}

/**
 * Runs a function with a timeout and returns a default value on timeout
 */
export async function runWithTimeoutOrDefault<T>(fn: () => Promise<T>, defaultValue: T, timeoutMs: number): Promise<T> {
  try {
    return await withTimeout(fn, timeoutMs);
  } catch (error) {
    console.warn('Operation timed out, using default value:', error);
    return defaultValue;
  }
}

/**
 * Test-specific timeout values
 */
export const TEST_TIMEOUTS = {
  SHORT: 1000, // 1 second
  MEDIUM: 3000, // 3 seconds
  LONG: 5000, // 5 seconds
  VERY_LONG: 10000, // 10 seconds
  SETUP: 15000, // 15 seconds for setup
};

/**
 * Sets up global test timeout handling
 */
export function setupGlobalTimeouts() {
  // Set BUN_ENV for test detection
  process.env.BUN_ENV = 'test';

  // Override console.warn for specific messages
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';

    // Suppress specific warnings in tests
    if (
      message.includes('No spatial index available') ||
      message.includes('Unknown NPC definition') ||
      message.includes('Attempting to spawn NPC')
    ) {
      return;
    }

    originalWarn.apply(console, args);
  };
}
