/**
 * Simple test to verify MESSAGE_SENT event emission fix
 */

import { describe, it, expect } from 'bun:test';
import { EventType } from '@elizaos/core';

// Simplified TestSuite implementation for local use
class TestSuite {
  constructor(private name: string, private config: any) {}
  
  addTest(test: any) {
    it(test.name, async () => {
      const context = this.config.beforeEach ? this.config.beforeEach() : {};
      await test.fn(context);
    });
  }
  
  run() {
    // No-op, bun:test handles execution
  }
}

const createUnitTest = (config: { name: string; fn: (context?: any) => Promise<void> | void }) => config;

describe('MESSAGE_SENT Event Fix Verification', () => {
  const messageSentSuite = new TestSuite('MESSAGE_SENT Event Fix Verification', {});
  
  messageSentSuite.addTest(
    createUnitTest({
      name: 'should have MESSAGE_SENT event type defined',
      fn: () => {
        // Check that MESSAGE_SENT exists in EventType enum
        expect(EventType.MESSAGE_SENT).toBeDefined();
        expect(typeof EventType.MESSAGE_SENT).toBe('string');
      },
    })
  );

  messageSentSuite.addTest(
    createUnitTest({
      name: 'should have MESSAGE_SENT handlers in events module',
      fn: async () => {
        const { events } = await import('../events');

        expect(events[EventType.MESSAGE_SENT]).toBeDefined();
        expect(Array.isArray(events[EventType.MESSAGE_SENT])).toBe(true);
        expect(events[EventType.MESSAGE_SENT].length).toBeGreaterThan(0);
      },
    })
  );

  messageSentSuite.run();
});
