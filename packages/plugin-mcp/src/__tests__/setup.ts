import { expect, afterEach, mock } from 'bun:test';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { JSDOM } from 'jsdom';

// Set up jsdom environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable',
});

// Make DOM globals available
global.window = dom.window as any;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.DocumentFragment = dom.window.DocumentFragment;
global.Node = dom.window.Node;
global.Text = dom.window.Text;
global.Comment = dom.window.Comment;

// Additional globals needed by React
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  DocumentFragment: dom.window.DocumentFragment,
  Node: dom.window.Node,
  Text: dom.window.Text,
  Comment: dom.window.Comment,
});

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
  mock.restore();
});

// Mock window.matchMedia
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

// Mock other window properties that might be needed
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
  }),
});

Object.defineProperty(window, 'ResizeObserver', {
  value: class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

// Mock CSS if needed
if (!window.CSS) {
  Object.defineProperty(window, 'CSS', {
    value: { supports: () => false },
  });
}

// Set up testing library configuration
import { configure } from '@testing-library/react';
configure({ testIdAttribute: 'data-testid' });
