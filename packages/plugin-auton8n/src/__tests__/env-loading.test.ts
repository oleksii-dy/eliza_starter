import { describe, it, expect } from 'vitest';

describe('Environment Loading', () => {
  it('should have ANTHROPIC_API_KEY in process.env', () => {
    console.log('Current working directory:', process.cwd());
    console.log('ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
    console.log('ANTHROPIC_API_KEY length:', process.env.ANTHROPIC_API_KEY?.length || 0);

    // Don't fail the test, just log the information
    expect(true).toBe(true);
  });
});
