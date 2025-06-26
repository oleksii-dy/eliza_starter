/**
 * Simple test to verify MESSAGE_SENT event emission fix
 */

import { describe, it, expect } from 'bun:test';
import { EventType } from '@elizaos/core';

describe('MESSAGE_SENT Event Fix Verification', () => {
  it('should have MESSAGE_SENT event type defined', () => {
    // Check that MESSAGE_SENT exists in EventType enum
    expect(EventType.MESSAGE_SENT).toBeDefined();
    expect(typeof EventType.MESSAGE_SENT).toBe('string');
  });

  it('should have MESSAGE_SENT handlers in events module', async () => {
    const { events } = await import('../events');

    expect(events[EventType.MESSAGE_SENT]).toBeDefined();
    expect(Array.isArray(events[EventType.MESSAGE_SENT])).toBe(true);
    expect(events[EventType.MESSAGE_SENT].length).toBeGreaterThan(0);
  });
});
