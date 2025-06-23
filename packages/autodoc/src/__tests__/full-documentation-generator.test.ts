import { describe, it, expect, vi } from 'vitest';

vi.mock('../AIService/AIService.js', () => ({
  AIService: class {
    generateComment = vi.fn().mockResolvedValue('ai');
  },
}));

vi.mock('../DiscordScraper.js', () => ({
  DiscordScraper: {
    fetchKnownIssues: vi.fn().mockResolvedValue([{ issue: 'bug', solution: 'fix' }]),
  },
}));

vi.mock('../GitManager.js', () => ({
  GitManager: class {
    createIssue = vi.fn().mockResolvedValue(1);
  },
}));

vi.mock('../../GitManager.js', () => ({
  GitManager: class {
    createIssue = vi.fn().mockResolvedValue(1);
  },
}));

import { FullDocumentationGenerator } from '../AIService/generators/FullDocumentationGenerator.js';
import { Configuration } from '../Configuration.js';
import { GitManager } from '../GitManager.js';

function createConfig() {
  process.env.INPUT_ROOT_DIRECTORY = 'packages/autodoc/src';
  process.env.OPENAI_API_KEY = 'test';
  process.env.CREATE_TODO_ISSUES = 'true';
  return new Configuration();
}

describe('FullDocumentationGenerator', () => {
  it('appends discord issues and creates github issues', async () => {
    const config = createConfig();
    const gitManager = new GitManager({ owner: 'o', name: 'n' });
    const gen = new FullDocumentationGenerator(config, gitManager);

    const todoItems = [
      { comment: 'fix bug', fullContext: 'code', type: 'todo' } as any,
    ];

    const result: any = await (gen as any).generateTodoSection(todoItems);
    expect(result.todoCount).toBe(1);
    expect(gitManager.createIssue).toHaveBeenCalled();

    const trouble = await (gen as any).generateTroubleshooting(
      {} as any,
      { name: 'pkg' }
    );
    expect(trouble).toContain('Known Issues from Discord');
  });
});
