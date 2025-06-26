/**
 * Logout action for ElizaOS CLI
 */

import * as clack from '@clack/prompts';
import { logger } from '@elizaos/core';
import { getAuthService } from '../services';

export async function logoutAction(): Promise<void> {
  const authService = getAuthService();

  // Check if logged in
  const status = await authService.getStatus();
  if (!status.isAuthenticated) {
    clack.log.warn('You are not currently logged in');
    return;
  }

  // Confirm logout
  const shouldLogout = await clack.confirm({
    message: `Are you sure you want to logout from ${status.email}?`,
    initialValue: true,
  });

  if (clack.isCancel(shouldLogout) || !shouldLogout) {
    clack.outro('✓ Logout cancelled');
    return;
  }

  // Perform logout
  const spinner = clack.spinner();
  spinner.start('Logging out...');

  try {
    await authService.logout();
    spinner.stop('✓ Logged out successfully');
    clack.outro('See you next time! 👋');
  } catch (error) {
    spinner.stop('✗ Logout failed');
    logger.error('An error occurred while logging out:', error);
  }
}
