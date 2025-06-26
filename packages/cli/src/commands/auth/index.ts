/**
 * Auth command for ElizaOS CLI
 * Manages platform authentication and API keys
 */

import { Command } from 'commander';
import {
  loginAction,
  deviceLoginAction,
  registerAction,
  logoutAction,
  statusAction,
  keyAction,
} from './actions';

export function createAuthCommand(): Command {
  const auth = new Command('auth')
    .description('Manage ElizaOS platform authentication')
    .addHelpText(
      'after',
      `
Examples:
  $ elizaos auth login          # Login to your account
  $ elizaos auth register        # Create a new account
  $ elizaos auth status          # Check authentication status
  $ elizaos auth key             # Display your API key
  $ elizaos auth key --reset     # Regenerate your API key
  $ elizaos auth logout          # Logout from your account
    `
    );

  // Login subcommands
  auth
    .command('login')
    .description('Login to your ElizaOS account (username/password)')
    .action(loginAction);

  auth
    .command('device-login')
    .description('Login using device authorization flow (recommended)')
    .action(deviceLoginAction);

  // Register subcommand
  auth.command('register').description('Create a new ElizaOS account').action(registerAction);

  // Logout subcommand
  auth.command('logout').description('Logout from your ElizaOS account').action(logoutAction);

  // Status subcommand
  auth.command('status').description('Check authentication status').action(statusAction);

  // Key subcommand
  auth
    .command('key')
    .description('Manage your API key')
    .option('-r, --reset', 'Regenerate your API key')
    .action((options) => keyAction(options));

  // Providers subcommand for AI provider management
  const providers = auth
    .command('providers')
    .description('Manage AI provider API keys (OpenAI, Groq, Anthropic)');

  providers
    .command('status')
    .description('Check AI provider authentication status')
    .action(async () => {
      const { providersStatusAction } = await import('./actions/providers');
      await providersStatusAction();
    });

  providers
    .command('setup')
    .description('Interactive AI provider API key setup')
    .action(async () => {
      const { providersSetupAction } = await import('./actions/providers');
      await providersSetupAction();
    });

  providers
    .command('test')
    .description('Test AI provider API functionality')
    .option('-p, --provider <provider>', 'Test specific provider (openai, groq, anthropic)')
    .action(async (options) => {
      const { providersTestAction } = await import('./actions/providers');
      await providersTestAction(options);
    });

  providers
    .command('keys')
    .description('Show available test keys for development')
    .action(async () => {
      const { providersKeysAction } = await import('./actions/providers');
      await providersKeysAction();
    });

  // Default action shows status
  auth.action(statusAction);

  return auth;
}

// Export for CLI integration
export default createAuthCommand();
