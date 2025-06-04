import { githubComicsPlugin } from '../dist/index.js';
import type { Content, HandlerCallback } from '@elizaos/core';

interface TestSuite {
  name: string;
  tests: { name: string; fn: (runtime: any) => Promise<void> }[];
}

export const GithubComicsTestSuite: TestSuite = {
  name: 'plugin_github_comics_suite',
  tests: [
    {
      name: 'plugin_loaded',
      fn: async (runtime) => {
        if (!runtime.getService || !runtime.character) throw new Error('invalid runtime');
        const actionExists = githubComicsPlugin.actions?.some((a) => a.name === 'GITHUB_COMICS');
        if (!actionExists) throw new Error('Action missing');
      },
    },
  ],
};

export default GithubComicsTestSuite;
