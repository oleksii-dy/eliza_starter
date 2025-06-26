/**
 * Register action for ElizaOS CLI
 */

import * as clack from '@clack/prompts';
import { logger } from '@elizaos/core';
import { getAuthService } from '../services';
import type { RegisterCredentials } from '../types';

export async function registerAction(): Promise<void> {
  clack.intro('🔐 Create ElizaOS Account');

  const authService = getAuthService();

  // Check if already logged in
  const status = await authService.getStatus();
  if (status.isAuthenticated) {
    const shouldContinue = await clack.confirm({
      message: `You are already logged in as ${status.email}. Do you want to create a new account?`,
      initialValue: false,
    });

    if (clack.isCancel(shouldContinue) || !shouldContinue) {
      clack.outro('✓ Registration cancelled');
      return;
    }
  }

  // Collect registration details
  const name = await clack.text({
    message: 'Your name:',
    placeholder: 'John Doe',
    validate: (value) => {
      if (!value || value.trim() === '') {
        return 'Name is required';
      }
      if (value.trim().length < 2) {
        return 'Name must be at least 2 characters';
      }
    },
  });

  if (clack.isCancel(name)) {
    clack.cancel('Registration cancelled');
    return;
  }

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
    clack.cancel('Registration cancelled');
    return;
  }

  const password = await clack.password({
    message: 'Password (minimum 8 characters):',
    validate: (value) => {
      if (!value || value.trim() === '') {
        return 'Password is required';
      }
      if (value.length < 8) {
        return 'Password must be at least 8 characters';
      }
    },
  });

  if (clack.isCancel(password)) {
    clack.cancel('Registration cancelled');
    return;
  }

  const confirmPassword = await clack.password({
    message: 'Confirm password:',
    validate: (value) => {
      if (value !== password) {
        return 'Passwords do not match';
      }
    },
  });

  if (clack.isCancel(confirmPassword)) {
    clack.cancel('Registration cancelled');
    return;
  }

  // Show terms and conditions
  const acceptTerms = await clack.confirm({
    message: 'Do you accept the ElizaOS terms of service and privacy policy?',
    initialValue: false,
  });

  if (clack.isCancel(acceptTerms) || !acceptTerms) {
    clack.cancel('You must accept the terms to continue');
    return;
  }

  // Attempt registration
  const spinner = clack.spinner();
  spinner.start('Creating your account...');

  try {
    const credentials: RegisterCredentials = {
      name: name.trim(),
      email: email.trim(),
      password,
    };

    const response = await authService.register(credentials);

    if (response.success && response.data) {
      spinner.stop('✓ Account created successfully!');

      // Get API key
      const apiKey = await authService.getApiKey();
      if (apiKey) {
        clack.note(
          `Your API key: ${apiKey}\n\nThis key will be automatically used by elizaos-services plugin.`,
          'API Key Created'
        );
      }

      clack.outro(`Welcome to ElizaOS, ${response.data.user.name}! 🎉`);
    } else {
      spinner.stop('✗ Registration failed');

      if (response.code === 'USER_EXISTS') {
        logger.error('An account with this email already exists');

        // Ask if they want to login instead
        const shouldLogin = await clack.confirm({
          message: 'Would you like to login instead?',
          initialValue: true,
        });

        if (!clack.isCancel(shouldLogin) && shouldLogin) {
          // Import dynamically to avoid circular dependencies
          const { loginAction } = await import('./login');
          await loginAction();
        }
      } else {
        logger.error(response.error || 'Unknown error occurred');
      }
    }
  } catch (error) {
    spinner.stop('✗ Registration failed');
    logger.error('An unexpected error occurred:', error);
  }
}
