import { describe, it, expect } from 'vitest';
import { createComicPrompt } from '../src/index';

describe('createComicPrompt', () => {
  it('creates prompt from repositories', () => {
    const prompt = createComicPrompt(
      [
        { name: 'repo1', description: 'first repo' },
        { name: 'repo2', description: 'second repo' },
      ],
      'octocat',
    );
    expect(prompt).toContain('octocat');
    expect(prompt).toContain('repo1');
    expect(prompt).toContain('first repo');
  });
});
