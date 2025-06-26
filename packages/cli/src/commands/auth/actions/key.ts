/**
 * API Key management action for ElizaOS CLI
 */

import * as clack from '@clack/prompts';
import { logger } from '@elizaos/core';
import { getAuthService } from '../services';

interface KeyActionOptions {
  reset?: boolean;
}

export async function keyAction(options: KeyActionOptions): Promise<void> {
  const authService = getAuthService();

  // Check if logged in
  const status = await authService.getStatus();
  if (!status.isAuthenticated) {
    clack.log.warn('You need to be logged in to manage API keys');
    clack.log.info('Run "elizaos auth login" to authenticate');
    return;
  }

  if (options.reset) {
    // Reset API key
    await resetApiKey(authService);
  } else {
    // Get current API key
    await displayApiKey(authService);
  }
}

async function displayApiKey(authService: any): Promise<void> {
  const spinner = clack.spinner();
  spinner.start('Retrieving API key...');

  try {
    const apiKey = await authService.getApiKey();
    spinner.stop();

    if (apiKey) {
      clack.note(
        `Your API key:\n${apiKey}\n\n` +
          'This key is automatically used by the elizaos-services plugin.\n' +
          'Keep this key secure and do not share it publicly.',
        '🔑 API Key'
      );

      // Offer to copy to clipboard if available
      if (process.platform !== 'linux') {
        const shouldCopy = await clack.confirm({
          message: 'Copy API key to clipboard?',
          initialValue: true,
        });

        if (!clack.isCancel(shouldCopy) && shouldCopy) {
          try {
            const { execSync } = await import('child_process');
            if (process.platform === 'darwin') {
              execSync(`echo "${apiKey}" | pbcopy`, { stdio: 'ignore' });
            } else if (process.platform === 'win32') {
              execSync(`echo ${apiKey} | clip`, { stdio: 'ignore' });
            }
            clack.log.success('API key copied to clipboard');
          } catch (_error) {
            clack.log.warn('Failed to copy to clipboard');
          }
        }
      }
    } else {
      clack.log.error('No API key found');

      const shouldCreate = await clack.confirm({
        message: 'Would you like to create a new API key?',
        initialValue: true,
      });

      if (!clack.isCancel(shouldCreate) && shouldCreate) {
        await createNewApiKey(authService);
      }
    }
  } catch (_error) {
    spinner.stop('✗ Failed to retrieve API key');
    logger.error('An error occurred:', _error);
  }
}

async function resetApiKey(authService: any): Promise<void> {
  // Confirm reset
  const shouldReset = await clack.confirm({
    message:
      'Are you sure you want to regenerate your API key? The old key will stop working immediately.',
    initialValue: false,
  });

  if (clack.isCancel(shouldReset) || !shouldReset) {
    clack.outro('✓ API key reset cancelled');
    return;
  }

  const spinner = clack.spinner();
  spinner.start('Regenerating API key...');

  try {
    const newKey = await authService.resetApiKey();
    spinner.stop();

    if (newKey) {
      clack.note(
        `Your new API key:\n${newKey}\n\n` +
          'Your old API key has been invalidated.\n' +
          'Update any applications using the old key.',
        '🔑 New API Key'
      );

      clack.log.success('API key regenerated successfully');
    } else {
      clack.log.error('Failed to regenerate API key');
    }
  } catch (error) {
    spinner.stop('✗ Failed to regenerate API key');
    logger.error('An error occurred:', error);
  }
}

async function createNewApiKey(authService: any): Promise<void> {
  const spinner = clack.spinner();
  spinner.start('Creating API key...');

  try {
    const apiKey = await authService.createApiKey();
    spinner.stop();

    if (apiKey) {
      clack.note(
        `Your new API key:\n${apiKey}\n\n` +
          'This key is automatically used by the elizaos-services plugin.\n' +
          'Keep this key secure and do not share it publicly.',
        '🔑 API Key Created'
      );

      clack.log.success('API key created successfully');
    } else {
      clack.log.error('Failed to create API key');
    }
  } catch (error) {
    spinner.stop('✗ Failed to create API key');
    logger.error('An error occurred:', error);
  }
}
