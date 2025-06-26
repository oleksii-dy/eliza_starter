/**
 * Test Setup Configuration
 * Loads environment variables and sets up test isolation
 */

import { enableTestMode } from './test-isolation';

// Set up test environment
process.env.NODE_ENV = 'test';
process.env.RESEARCH_MOCK_MODE = 'true';
process.env.RESEARCH_TIMEOUT = '5000';

// Enable test mode by default
enableTestMode();

// Suppress verbose logging in tests
if (!process.env.DEBUG) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

// Keep warnings and errors for debugging
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  if (args[0]?.includes?.('Missing API keys') || args[0]?.includes?.('⚠️')) {
    // Suppress API key warnings in tests
    return;
  }
  originalWarn(...args);
};

console.error = (...args) => {
  if (args[0]?.includes?.('API key') && process.env.NODE_ENV === 'test') {
    // Suppress API key errors in tests
    return;
  }
  originalError(...args);
};

console.log('🧪 Test environment configured with mock providers');
