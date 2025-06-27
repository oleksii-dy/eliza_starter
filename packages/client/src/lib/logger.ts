// Test-safe logger that prevents initialization issues

// Check if we're in a test environment
const isTestEnv =
  typeof process !== 'undefined' &&
  (process.env.NODE_ENV === 'test' ||
    typeof (globalThis as any).Bun?.jest !== 'undefined' ||
    (typeof window !== 'undefined' && (window as any).__TESTING__));

// Create mock logger for tests
const mockLogger = {
  info: (..._args: unknown[]) => {}, // Silent in tests to avoid noise
  error: (...args: unknown[]) => console.error('[CLIENT ERROR]', ...args),
  warn: (..._args: unknown[]) => {}, // Silent in tests to avoid noise
  debug: (..._args: unknown[]) => {},
  setLevel: (_level: string) => {}, // Mock setLevel method
  getLevel: () => 'info',
  child: () => mockLogger,
};

let clientLogger: any;

if (isTestEnv) {
  // Use mock logger in test environment
  clientLogger = mockLogger;
} else {
  // Use real logger in production - import synchronously
  try {
    const { elizaLogger } = require('@elizaos/core');
    clientLogger = {
      info: (msg: string, ...args: unknown[]) => {
        elizaLogger.info({ source: 'client' }, msg, ...args);
      },
      error: (msg: string, ...args: unknown[]) => {
        elizaLogger.error({ source: 'client' }, msg, ...args);
      },
      warn: (msg: string, ...args: unknown[]) => {
        elizaLogger.warn({ source: 'client' }, msg, ...args);
      },
      debug: (msg: string, ...args: unknown[]) => {
        elizaLogger.debug({ source: 'client' }, msg, ...args);
      },
      setLevel: (level: string) => {
        if (elizaLogger.setLevel) {
          elizaLogger.setLevel(level);
        }
      },
      getLevel: () => elizaLogger.getLevel?.() || 'info',
      child: () => clientLogger,
    };
  } catch (_error) {
    // Fallback if core import fails
    console.warn('Failed to load elizaLogger from @elizaos/core, using console fallback');
    clientLogger = {
      info: (...args: unknown[]) => console.log('[CLIENT]', ...args),
      error: (...args: unknown[]) => console.error('[CLIENT]', ...args),
      warn: (...args: unknown[]) => console.warn('[CLIENT]', ...args),
      debug: (...args: unknown[]) => console.debug('[CLIENT]', ...args),
      setLevel: (_level: string) => {},
      getLevel: () => 'info',
      child: () => clientLogger,
    };
  }
}

export default clientLogger;
