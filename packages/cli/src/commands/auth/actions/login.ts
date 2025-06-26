/**
 * Login action for ElizaOS CLI
 */

import * as clack from '@clack/prompts';
import { logger } from '@elizaos/core';
import { getAuthService } from '../services';
import type { LoginCredentials } from '../types';

export async function loginAction(): Promise<void> {
  clack.intro('🔐 ElizaOS Platform Login');

  const authService = getAuthService();

  // Check if already logged in
  const status = await authService.getStatus();
  if (status.isAuthenticated) {
    const shouldContinue = await clack.confirm({
      message: `You are already logged in as ${status.email}. Do you want to login with a different account?`,
      initialValue: false,
    });

    if (clack.isCancel(shouldContinue) || !shouldContinue) {
      clack.outro('✓ Login cancelled');
      return;
    }
  }

  // Collect credentials
  const email = await clack.text({
    message: 'Email address:',
    placeholder: 'your@email.com',
    validate: (value) => {
      if (!value || value.trim() === '') {
        return 'Email is required';
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
    },
  });

  if (clack.isCancel(email)) {
    clack.cancel('Login cancelled');
    return;
  }

  const password = await clack.password({
    message: 'Password:',
    validate: (value) => {
      if (!value || value.trim() === '') {
        return 'Password is required';
      }
    },
  });

  if (clack.isCancel(password)) {
    clack.cancel('Login cancelled');
    return;
  }

  // Attempt login
  const spinner = clack.spinner();
  spinner.start('Logging in...');

  try {
    const credentials: LoginCredentials = {
      email: email.trim(),
      password,
    };

    const response = await authService.login(credentials);

    if (response.success && response.data) {
      spinner.stop('✓ Logged in successfully!');

      // Get API key
      const apiKey = await authService.getApiKey();
      if (apiKey) {
        clack.note(
          `Your API key: ${apiKey}\n\nThis key will be automatically used by elizaos-services plugin.`,
          'API Key Created'
        );
      }

      clack.outro(`Welcome, ${response.data.user.name}! 🎉`);
    } else {
      spinner.stop('✗ Login failed');

      if (response.code === 'INVALID_CREDENTIALS') {
        logger.error('Invalid email or password');
      } else {
        logger.error(response.error || 'Unknown error occurred');
      }

      // Ask if they want to register
      const shouldRegister = await clack.confirm({
        message: 'Would you like to create a new account instead?',
        initialValue: true,
      });

      if (!clack.isCancel(shouldRegister) && shouldRegister) {
        // Import dynamically to avoid circular dependencies
        const { registerAction } = await import('./register');
        await registerAction();
      }
    }
  } catch (error) {
    spinner.stop('✗ Login failed');
    logger.error('An unexpected error occurred:', error);
  }
}
