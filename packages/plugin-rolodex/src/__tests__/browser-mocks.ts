import { vi } from 'vitest';

/**
 * Browser mocks for testing
 * Sets up minimal window and document objects for tests
 */

// Only set up mocks if we're not already in a browser environment
if (typeof window === 'undefined') {
  // Create minimal window mock
  const mockWindow = {
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    location: {
      href: 'http://localhost',
      origin: 'http://localhost',
    },
    navigator: {
      userAgent: 'test',
    },
    document: {},
  };

  (global as any).window = mockWindow;

  // Create minimal document mock
  const mockHead = {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    style: {},
  };

  (global as any).document = {
    createElement: vi.fn(() => ({
      style: {},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      setAttribute: vi.fn(),
      getAttribute: vi.fn(),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(() => []),
    })),
    createTextNode: vi.fn((text: string) => ({
      nodeValue: text,
      textContent: text,
    })),
    head: mockHead,
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      style: {},
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    getElementsByTagName: vi.fn((tagName: string) => {
      if (tagName === 'head') return [mockHead];
      return [];
    }),
  };

  // Copy to global scope
  // Use Object.defineProperty to avoid setter issues
  Object.defineProperty(global, 'navigator', {
    value: mockWindow.navigator,
    writable: true,
    configurable: true
  });
  
  Object.defineProperty(global, 'location', {
    value: mockWindow.location,
    writable: true,
    configurable: true
  });
}

// Mock ResizeObserver
(global as any).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
(global as any).IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock requestAnimationFrame
(global as any).requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 0);
  return 0;
});

(global as any).cancelAnimationFrame = vi.fn();

export {};
