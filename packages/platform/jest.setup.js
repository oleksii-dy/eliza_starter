// Jest setup file
require('dotenv/config');

// Set test environment
process.env.NODE_ENV = 'test';

// Mock import.meta for ESM compatibility
global.importMeta = {
  url: 'file:///test',
  resolve: (path) => new URL(path, 'file:///test').href,
};

// Polyfill import.meta.url for Jest
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      url: 'file:///test',
      resolve: (path) => new URL(path, 'file:///test').href,
    },
  },
  writable: true,
});

// Add fetch polyfill for Node.js
if (!global.fetch) {
  global.fetch = require('node-fetch');
  global.FormData = require('form-data');
  global.Blob = require('node-fetch').Blob;
}

// Mock browser APIs
global.localStorage = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(() => null),
};

global.sessionStorage = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(() => null),
};

global.window = {
  localStorage: global.localStorage,
  sessionStorage: global.sessionStorage,
  location: {
    href: 'http://localhost:3333',
    origin: 'http://localhost:3333',
    pathname: '/',
    search: '',
    hash: '',
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Tauri mocks are handled in jest.config.js moduleNameMapper

// Mock OpenAI API
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: 'Test response from mocked OpenAI'
              }
            }]
          })
        }
      },
      embeddings: {
        create: jest.fn().mockResolvedValue({
          data: [{
            embedding: new Array(1536).fill(0).map(() => Math.random())
          }]
        })
      }
    }))
  };
});

// Mock external APIs that might not be available in test environment
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    scan: jest.fn().mockResolvedValue(['0', []]),
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn().mockResolvedValue(undefined),
  }));
});

// Test database configuration
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://shawwalters@localhost:5432/elizaos_platform_test';
}

// Test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-32-chars';
process.env.WORKOS_API_KEY = 'test-workos-key';
process.env.WORKOS_CLIENT_ID = 'test-client-id';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key';
process.env.R2_ACCESS_KEY_ID = 'test-r2-key';
process.env.R2_SECRET_ACCESS_KEY = 'test-r2-secret';
process.env.R2_BUCKET_NAME = 'test-bucket';
process.env.OPENAI_API_KEY = 'sk-test-fake-openai-key';

// Mock TEXT_EMBEDDING model for tests
process.env.EMBEDDING_MODEL = 'text-embedding-ada-002';

// Global test timeout
jest.setTimeout(30000);

// Load test utilities and mocks
const { resetMockCreditBalance } = require('./tests/test-utils');

// Reset mock state before each test
beforeEach(() => {
  resetMockCreditBalance();
});
