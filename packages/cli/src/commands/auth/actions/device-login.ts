/**
 * Device Flow Login Action for ElizaOS CLI
 * Implements industry-standard device authorization (OAuth 2.0 Device Authorization Grant)
 * Similar to Vercel, Cloudflare, GitHub CLI, etc.
 */

import * as clack from '@clack/prompts';
import { logger } from '@elizaos/core';
import { getAuthService } from '../services';
import type { DeviceAuthInitResponse, DeviceAuthPollResponse } from '../types';

const POLL_INTERVAL = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 120; // 10 minutes total

export async function deviceLoginAction(): Promise<void> {
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

  // Check for local platform server first
  const localApiUrl = await checkLocalPlatform();
  if (localApiUrl) {
    const useLocal = await clack.confirm({
      message: `Found local ElizaOS platform running at ${localApiUrl}. Use local server?`,
      initialValue: true,
    });

    if (clack.isCancel(useLocal)) {
      clack.cancel('Login cancelled');
      return;
    }

    if (useLocal) {
      authService.setBaseUrl(localApiUrl);
    }
  }

  try {
    // Step 1: Initialize device authorization
    const deviceAuth = await initializeDeviceAuth(authService);
    if (!deviceAuth) {
      clack.outro('✗ Failed to initialize device authorization');
      return;
    }

    // Step 2: Display user code and instructions
    displayAuthInstructions(deviceAuth);

    // Step 3: Poll for authorization
    const authResult = await pollForAuthorization(authService, deviceAuth);
    if (!authResult) {
      clack.outro('✗ Authorization timed out or was cancelled');
      return;
    }

    // Step 4: Complete login
    await completeLogin(authService, authResult);
  } catch (error) {
    logger.error('Device login failed:', error);
    clack.outro('✗ Login failed');
  }
}

/**
 * Check if local platform server is running
 */
async function checkLocalPlatform(): Promise<string | null> {
  const commonPorts = [3333, 3000, 8080, 5173];

  for (const port of commonPorts) {
    try {
      const response = await fetch(`http://localhost:${port}/api/runtime/ping`, {
        signal: AbortSignal.timeout(2000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.pong) {
          return `http://localhost:${port}`;
        }
      }
    } catch {
      // Continue to next port
    }
  }

  return null;
}

/**
 * Initialize device authorization flow
 */
async function initializeDeviceAuth(authService: any): Promise<DeviceAuthInitResponse | null> {
  const spinner = clack.spinner();
  spinner.start('Initializing authentication...');

  try {
    const response = await authService.initiateDeviceAuth();
    spinner.stop('✓ Authentication initialized');
    return response;
  } catch (error) {
    spinner.stop('✗ Failed to initialize authentication');
    logger.error('Device auth initialization error:', error);
    return null;
  }
}

/**
 * Display authentication instructions to user
 */
function displayAuthInstructions(deviceAuth: DeviceAuthInitResponse): void {
  const authUrl =
    deviceAuth.verification_uri_complete ||
    `${deviceAuth.verification_uri}?user_code=${deviceAuth.user_code}`;

  clack.note(
    `1. Open your browser and go to:\n   ${authUrl}\n\n` +
      `2. Enter this code: ${deviceAuth.user_code}\n\n` +
      '3. Complete the authentication in your browser\n\n' +
      `This code expires in ${Math.round(deviceAuth.expires_in / 60)} minutes.`,
    '🔗 Authentication Required'
  );

  // Auto-open browser if possible
  if (process.platform !== 'linux' || process.env.DISPLAY || process.env.WAYLAND_DISPLAY) {
    try {
      const open = require('open');
      open(authUrl);
      clack.log.info('📱 Opening browser automatically...');
    } catch {
      // Fallback message if 'open' is not available
      clack.log.info('📱 Please manually open the URL above in your browser');
    }
  }
}

/**
 * Poll for authorization completion
 */
async function pollForAuthorization(
  authService: any,
  deviceAuth: DeviceAuthInitResponse
): Promise<DeviceAuthPollResponse | null> {
  const spinner = clack.spinner();
  spinner.start('Waiting for authentication...');

  let attempts = 0;

  while (attempts < MAX_POLL_ATTEMPTS) {
    try {
      const result = await authService.pollDeviceAuth(deviceAuth.device_code);

      if (result.success && result.data) {
        spinner.stop('✓ Authentication successful!');
        return result;
      }

      if (result.error === 'authorization_pending') {
        // Continue polling
        await new Promise((resolve) => setTimeout(resolve, deviceAuth.interval * 1000));
        attempts++;
        continue;
      }

      if (result.error === 'slow_down') {
        // Increase polling interval
        await new Promise((resolve) => setTimeout(resolve, (deviceAuth.interval + 5) * 1000));
        attempts++;
        continue;
      }

      if (result.error === 'expired_token') {
        spinner.stop('✗ Authentication code expired');
        return null;
      }

      if (result.error === 'access_denied') {
        spinner.stop('✗ Authentication was denied');
        return null;
      }

      // Unknown error
      spinner.stop('✗ Authentication failed');
      logger.error('Polling error:', result.error);
      return null;
    } catch (error) {
      logger.error('Polling error:', error);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      attempts++;
    }
  }

  spinner.stop('✗ Authentication timed out');
  return null;
}

/**
 * Complete the login process
 */
async function completeLogin(authService: any, authResult: DeviceAuthPollResponse): Promise<void> {
  // Store credentials
  await authService.storeDeviceAuthResult(authResult);

  // Get API key
  const apiKey = await authService.getApiKey();
  if (apiKey) {
    clack.note(
      `Your API key: ${apiKey}\n\nThis key will be automatically used by elizaos-services plugin.`,
      'API Key Created'
    );
  }

  clack.outro(`Welcome, ${authResult.data?.user?.name || 'User'}! 🎉`);
}
