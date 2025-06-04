import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import * as plugin from '../src/index';
import { createMockRuntime, setupLoggerSpies, setupTest } from './test-utils';

beforeAll(() => {
  setupLoggerSpies();
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('Integration: githubComicsPlugin', () => {
  it('initializes with config and executes action', async () => {
    const mockRuntime = createMockRuntime();
    if (plugin.githubComicsPlugin.init) {
      await plugin.githubComicsPlugin.init({ OPENAI_API_KEY: 'key' });
    }

    const { mockMessage, mockState, callbackFn } = setupTest();

    vi.spyOn(plugin, 'fetchRepositories').mockResolvedValue([{ name: 'repo', description: 'desc' }]);
    vi.spyOn(plugin, 'generateComicImage').mockResolvedValue({ url: 'http://image' });

    const action = plugin.githubComicsPlugin.actions?.[0];
    if (!action) throw new Error('action missing');
    await action.handler!(mockRuntime as any, mockMessage as any, mockState as any, { user: 'octocat' }, callbackFn, []);
    expect(callbackFn).toHaveBeenCalled();
  });
});
