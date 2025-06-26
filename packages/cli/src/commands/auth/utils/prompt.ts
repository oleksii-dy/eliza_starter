/**
 * Authentication prompt utilities for project creation
 */

import * as clack from '@clack/prompts';
import { logger } from '@elizaos/core';
import { getAuthService } from '../services';
import { loginAction } from '../actions/login';
import { registerAction } from '../actions/register';

export async function promptForAuth(): Promise<boolean> {
  const authService = getAuthService();

  // Check if user has already skipped auth
  if (await authService.shouldSkipAuth()) {
    return false;
  }

  // Check if already authenticated
  const status = await authService.getStatus();
  if (status.isAuthenticated) {
    clack.log.success(`✓ Already authenticated as ${status.email}`);
    return true;
  }

  clack.intro('🔐 ElizaOS Platform Authentication');

  clack.note(
    'ElizaOS platform provides managed services, analytics, and more.\\n' +
      'Create an account to get an API key that will be automatically configured.',
    'Platform Benefits'
  );

  const choice = await clack.select({
    message: 'Would you like to authenticate with ElizaOS platform?',
    options: [
      { value: 'login', label: 'Login with existing account' },
      { value: 'register', label: 'Create new account' },
      { value: 'skip', label: 'Skip (configure manually later)' },
    ],
  });

  if (clack.isCancel(choice)) {
    return false;
  }

  switch (choice) {
    case 'login':
      await loginAction();
      break;
    case 'register':
      await registerAction();
      break;
    case 'skip':
      await authService.setSkipAuth(true);
      clack.log.info('Authentication skipped. You can login later with "elizaos auth login"');
      clack.log.info('You will need to manually configure API keys for services.');
      return false;
  }

  // Check if authentication was successful
  const newStatus = await authService.getStatus();
  return newStatus.isAuthenticated;
}

/**
 * Get the API key for automatic configuration
 */
export async function getApiKeyForConfig(): Promise<string | null> {
  const authService = getAuthService();

  const status = await authService.getStatus();
  if (!status.isAuthenticated) {
    return null;
  }

  try {
    return await authService.getApiKey();
  } catch (error) {
    logger.error('Failed to get API key:', error);
    return null;
  }
}

/**
 * Check if user is authenticated without prompting
 */
export async function isAuthenticated(): Promise<boolean> {
  const authService = getAuthService();
  const status = await authService.getStatus();
  return status.isAuthenticated;
}
