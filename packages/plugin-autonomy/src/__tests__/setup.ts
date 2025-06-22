import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Socket.IO client
const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  close: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  connected: false,
  id: 'mock-socket-id',
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
  Socket: vi.fn(() => mockSocket),
}));

// Mock console.error to reduce noise in tests
global.console.error = vi.fn();

// Setup window.matchMedia for CSS media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Export mock socket for tests to use
export { mockSocket };