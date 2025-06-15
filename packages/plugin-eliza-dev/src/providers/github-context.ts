import {
  type Provider,
  type IAgentRuntime,
  type Memory,
  type State,
  logger
} from '@elizaos/core';
import type { GitHubIntegrationService } from '../services/github.js';

export const githubContextProvider: Provider = {
  name: 'GITHUB_CONTEXT',
  description: 'Provides GitHub repository context including recent issues and PRs',

  get: async (runtime: IAgentRuntime, _message: Memory, _state?: State) => {
    try {
      const githubService = runtime.getService('GITHUB_INTEGRATION') as GitHubIntegrationService;
      
      if (!githubService) {
        logger.warn('[GitHubContextProvider] GitHub service not available');
        return null;
      }

      // Get recent activity context
      const recentPRs = await githubService.getMergedPullRequests(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      );

      return {
        repository: {
          owner: runtime.getSetting('GITHUB_OWNER'),
          repo: runtime.getSetting('GITHUB_REPO'),
          url: `https://github.com/${runtime.getSetting('GITHUB_OWNER')}/${runtime.getSetting('GITHUB_REPO')}`
        },
        recentActivity: {
          mergedPRs: recentPRs.length,
          lastWeekActivity: recentPRs.slice(0, 5).map(pr => ({
            title: pr.title,
            number: pr.number,
            url: pr.html_url
          }))
        },
        capabilities: [
          'Issue creation and management',
          'Pull request automation',
          'Branch management',
          'Code review integration'
        ]
      };
    } catch (error) {
      logger.error('[GitHubContextProvider] Error fetching GitHub context:', error);
      return null;
    }
  }
};