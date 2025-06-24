import { mock  } from 'bun:test';

// Mock Socket.IO client
const mockSocket = {
  on: mock(),
  emit: mock(),
  close: mock(),
  connect: mock(),
  disconnect: mock(),
  connected: false,
  id: 'mock-socket-id',
};

// Mock console.error to reduce noise in tests
global.console.error = mock();

// Only setup window.matchMedia if window is defined (jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mock().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: mock(), // deprecated
      removeListener: mock(), // deprecated
      addEventListener: mock(),
      removeEventListener: mock(),
      dispatchEvent: mock(),
    })),
  });
}

// Export mock socket for tests to use
export { mockSocket };
