import { describe, it, expect } from 'vitest';

describe('Simple Test', () => {
  it('should pass basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have document object in jsdom', () => {
    // This test runs in jsdom environment
    expect(document).toBeDefined();
    expect(document.body).toBeDefined();
  });
});
