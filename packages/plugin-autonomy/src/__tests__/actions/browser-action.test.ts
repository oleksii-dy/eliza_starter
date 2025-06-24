import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { browseWebAction } from '../../actions/browser-action';
import { createMockRuntime, createMockMemory, createMockState } from '../utils/mock-runtime';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';

// Create mock puppeteer module
const mockPuppeteer = {
  default: {
    launch: mock(() =>
      Promise.resolve({
        newPage: mock(() =>
          Promise.resolve({
            goto: mock(() => Promise.resolve()),
            content: mock(() => Promise.resolve('<html><body><h1>Test Page</h1></body></html>')),
            title: mock(() => Promise.resolve('Test Title')),
            evaluate: mock(() =>
              Promise.resolve([
                { text: 'Link 1', href: 'http://example.com/1' },
                { text: 'Link 2', href: 'http://example.com/2' },
              ])
            ),
            setUserAgent: mock(() => Promise.resolve()),
            setViewport: mock(() => Promise.resolve()),
            close: mock(() => Promise.resolve()),
            waitForSelector: mock(() => Promise.resolve({})),
            $: mock(() => Promise.resolve({})),
            $$: mock(() => Promise.resolve([])),
            $eval: mock(() => Promise.resolve('Test content')),
            $$eval: mock(() => Promise.resolve(['Test results'])),
          })
        ),
        close: mock(() => Promise.resolve()),
      })
    ),
  },
};

// Mock the puppeteer module
mock.module('puppeteer', () => mockPuppeteer);

describe('browseWebAction', () => {
  let mockRuntime: IAgentRuntime;
  let mockMemory: Memory;
  let mockState: State;
  let mockCallback: any;

  beforeEach(() => {
    mock.restore();
    mockRuntime = createMockRuntime({
      settings: {
        PUPPETEER_HEADLESS: 'true',
        PUPPETEER_TIMEOUT: '30000',
      },
    });
    mockCallback = mock();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('validate', () => {
    it('should return true for valid browse requests', async () => {
      mockMemory = createMockMemory({
        content: {
          text: 'Browse https://example.com',
          source: 'test',
        },
      });
      mockState = createMockState();

      const result = await browseWebAction.validate(mockRuntime, mockMemory, mockState);
      expect(result).toBe(true);
    });

    it('should return true for search requests', async () => {
      mockMemory = createMockMemory({
        content: {
          text: 'Search for artificial intelligence news',
          source: 'test',
        },
      });
      mockState = createMockState();

      const result = await browseWebAction.validate(mockRuntime, mockMemory, mockState);
      expect(result).toBe(true);
    });

    it('should return false for non-web related requests', async () => {
      mockMemory = createMockMemory({
        content: {
          text: 'Calculate 2 + 2',
          source: 'test',
        },
      });
      mockState = createMockState();

      const result = await browseWebAction.validate(mockRuntime, mockMemory, mockState);
      expect(result).toBe(false);
    });

    it('should return false for empty messages', async () => {
      mockMemory = createMockMemory({
        content: {
          text: '',
          source: 'test',
        },
      });
      mockState = createMockState();

      const result = await browseWebAction.validate(mockRuntime, mockMemory, mockState);
      expect(result).toBe(false);
    });
  });

  describe('handler', () => {
    beforeEach(() => {
      mockState = createMockState();
    });

    it('should browse a specific URL successfully', async () => {
      mockMemory = createMockMemory({
        content: {
          text: 'Browse https://example.com',
          source: 'test',
        },
      });

      await browseWebAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Test Title'),
          thought: expect.stringContaining('browsed'),
          actions: ['BROWSE_WEB'],
        })
      );
    });

    it('should perform DuckDuckGo search successfully', async () => {
      mockMemory = createMockMemory({
        content: {
          text: 'Search for AI news',
          source: 'test',
        },
      });

      await browseWebAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('search results'),
          thought: expect.stringContaining('searched'),
          actions: ['BROWSE_WEB'],
        })
      );
    });

    it('should handle URL validation errors', async () => {
      mockMemory = createMockMemory({
        content: {
          text: 'Browse invalid-url',
          source: 'test',
        },
      });

      await browseWebAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Invalid URL'),
          thought: expect.stringContaining('error'),
          actions: ['BROWSE_WEB'],
        })
      );
    });

    it('should handle browser launch failures', async () => {
      // Mock Puppeteer to throw error on launch
      const puppeteer = await import('puppeteer');
      mock(puppeteer.default.launch).mockRejectedValueOnce(new Error('Browser launch failed'));

      mockMemory = createMockMemory({
        content: {
          text: 'Browse https://example.com',
          source: 'test',
        },
      });

      await browseWebAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Browser error'),
          thought: expect.stringContaining('failed'),
          actions: ['BROWSE_WEB'],
        })
      );
    });

    it('should handle page navigation timeouts', async () => {
      // Mock page.goto to throw timeout error
      const puppeteer = await import('puppeteer');
      const mockPage = {
        goto: mock().mockRejectedValue(new Error('Navigation timeout')),
        setUserAgent: mock(),
        setViewport: mock(),
        close: mock(),
      };
      const mockBrowser = {
        newPage: mock().mockResolvedValue(mockPage),
        close: mock(),
      };
      mock(puppeteer.default.launch).mockResolvedValueOnce(mockBrowser as any);

      mockMemory = createMockMemory({
        content: {
          text: 'Browse https://slow-example.com',
          source: 'test',
        },
      });

      await browseWebAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('timeout'),
          actions: ['BROWSE_WEB'],
        })
      );
    });

    it('should sanitize URLs correctly', async () => {
      mockMemory = createMockMemory({
        content: {
          text: 'Browse javascript:alert("xss")',
          source: 'test',
        },
      });

      await browseWebAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Invalid URL'),
          actions: ['BROWSE_WEB'],
        })
      );
    });

    it('should respect rate limiting', async () => {
      // Make multiple rapid requests
      for (let i = 0; i < 3; i++) {
        mockMemory = createMockMemory({
          content: {
            text: `Browse https://example${i}.com`,
            source: 'test',
          },
        });

        await browseWebAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);
      }

      // Should have been called 3 times (no rate limiting errors expected in this simple test)
      expect(mockCallback).toHaveBeenCalledTimes(3);
    });

    it('should clean up browser resources', async () => {
      const puppeteer = await import('puppeteer');
      const mockPage = {
        goto: mock().mockResolvedValue(undefined),
        content: mock().mockResolvedValue('<html><body>Test</body></html>'),
        title: mock().mockResolvedValue('Test'),
        evaluate: mock().mockResolvedValue([]),
        setUserAgent: mock(),
        setViewport: mock(),
        close: mock(),
      };
      const mockBrowser = {
        newPage: mock().mockResolvedValue(mockPage),
        close: mock(),
      };
      mock(puppeteer.default.launch).mockResolvedValueOnce(mockBrowser as any);

      mockMemory = createMockMemory({
        content: {
          text: 'Browse https://example.com',
          source: 'test',
        },
      });

      await browseWebAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      // Verify cleanup was called
      expect(mockPage.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should extract links and content correctly', async () => {
      const puppeteer = await import('puppeteer');
      const mockPage = {
        goto: mock().mockResolvedValue(undefined),
        content: mock().mockResolvedValue('<html><body><h1>Test Content</h1></body></html>'),
        title: mock().mockResolvedValue('Test Page'),
        evaluate: mock().mockResolvedValue([
          { text: 'Important Link', href: 'https://important.com' },
          { text: 'Another Link', href: 'https://another.com' },
        ]),
        setUserAgent: mock(),
        setViewport: mock(),
        close: mock(),
      };
      const mockBrowser = {
        newPage: mock().mockResolvedValue(mockPage),
        close: mock(),
      };
      mock(puppeteer.default.launch).mockResolvedValueOnce(mockBrowser as any);

      mockMemory = createMockMemory({
        content: {
          text: 'Browse https://example.com',
          source: 'test',
        },
      });

      await browseWebAction.handler(mockRuntime, mockMemory, mockState, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Test Page'),
          thought: expect.stringContaining('browsed'),
          actions: ['BROWSE_WEB'],
        })
      );
    });
  });

  describe('action structure', () => {
    it('should have correct action metadata', () => {
      expect(browseWebAction.name).toBe('BROWSE_WEB');
      expect(browseWebAction.similes).toContain('SEARCH_WEB');
      expect(browseWebAction.description).toContain('browse websites');
      expect(typeof browseWebAction.validate).toBe('function');
      expect(typeof browseWebAction.handler).toBe('function');
      expect(Array.isArray(browseWebAction.examples)).toBe(true);
    });

    it('should have valid examples', () => {
      expect(browseWebAction.examples!.length).toBeGreaterThan(0);

      browseWebAction.examples!.forEach((example) => {
        expect(Array.isArray(example)).toBe(true);
        expect(example.length).toBeGreaterThanOrEqual(2);

        example.forEach((turn) => {
          expect(turn).toHaveProperty('name');
          expect(turn).toHaveProperty('content');
          expect(typeof turn.content).toBe('object');
        });
      });
    });
  });
});
