import { describe, it, expect } from 'vitest';

/**
 * Basic test to validate test infrastructure is working
 */
describe('Basic Test Infrastructure', () => {
  it('should run a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should validate that the test environment works', () => {
    expect(typeof describe).toBe('function');
    expect(typeof it).toBe('function');
    expect(typeof expect).toBe('function');
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });
});