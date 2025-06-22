import { describe, it, expect } from 'vitest';
import { stringToUuid } from '@elizaos/core';

describe('Infrastructure Test', () => {
  it('should have access to ElizaOS core functions', () => {
    const uuid = stringToUuid('test');
    expect(uuid).toBeDefined();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('should be able to import types', () => {
    const testData = {
      id: stringToUuid('test'),
      name: 'Test Entity',
    };
    expect(testData).toBeDefined();
    expect(testData.name).toBe('Test Entity');
  });
}); 