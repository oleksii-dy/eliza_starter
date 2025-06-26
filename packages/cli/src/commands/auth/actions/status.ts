/**
 * Status action for ElizaOS CLI
 */

import * as clack from '@clack/prompts';
import { logger } from '@elizaos/core';
import { getAuthService } from '../services';

export async function statusAction(): Promise<void> {
  const authService = getAuthService();

  const spinner = clack.spinner();
  spinner.start('Checking authentication status...');

  try {
    const status = await authService.getStatus();
    spinner.stop();

    if (status.isAuthenticated) {
      clack.log.success(`✓ Authenticated as ${status.email}`);

      // Try to get API key
      const apiKey = await authService.getApiKey();
      if (apiKey) {
        clack.note(
          `API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}\n` +
            `Last checked: ${status.lastChecked ? new Date(status.lastChecked).toLocaleString() : 'Never'}`,
          'Account Details'
        );
      } else {
        clack.log.warn('No API key found. Run "elizaos auth key" to create one.');
      }
    } else {
      clack.log.info('Not authenticated');

      if (status.skipAuth) {
        clack.log.info('Authentication has been skipped by user preference');
      } else {
        clack.log.info('Run "elizaos auth login" to authenticate');
      }
    }
  } catch (error) {
    spinner.stop('✗ Failed to check status');
    logger.error('An error occurred:', error);
  }
}
