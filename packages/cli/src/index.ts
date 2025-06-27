#!/usr/bin/env node
process.env.NODE_OPTIONS = '--no-deprecation';
process.env.NODE_NO_WARNINGS = '1';

import { Command } from 'commander';
import { existsSync, readFileSync } from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

/**
 * Asynchronous function that serves as the main entry point for the application.
 * It loads environment variables, initializes the CLI program, and parses the command line arguments.
 * @returns {Promise<void>}
 */
async function main() {
  // Check for --no-emoji flag early (before command parsing)
  if (process.argv.includes('--no-emoji')) {
    const { configureEmojis } = await import('./utils/emoji-handler.js');
    configureEmojis({ forceDisable: true });
  }

  // Check for --no-auto-install flag early (before command parsing)
  if (process.argv.includes('--no-auto-install')) {
    process.env.ELIZA_NO_AUTO_INSTALL = 'true';
  }

  // For ESM modules we need to use import.meta.url instead of __dirname
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Find package.json relative to the current file
  const packageJsonPath = path.resolve(__dirname, '../package.json');

  // Add a simple check in case the path is incorrect
  let version = '0.0.0'; // Fallback version
  if (!existsSync(packageJsonPath)) {
    // Use default version if package.json not found
  } else {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    version = packageJson.version;
  }

  // Check for built-in flags that exit early (before preAction hook runs)
  const args = process.argv.slice(2);
  const isUpdateCommand = args.includes('update');
  const willShowBanner = args.length === 0;

  // Show update notification for all commands except:
  // - when banner will show (it handles its own notification)
  // - when running update command
  if (!willShowBanner && !isUpdateCommand) {
    const { getVersion, checkAndShowUpdateNotification } = await import('./utils/index.js');
    const currentVersion = getVersion();
    await checkAndShowUpdateNotification(currentVersion);
  }

  const program = new Command()
    .name('elizaos')
    .version(version, '-v, --version', 'output the version number')
    .option('--no-emoji', 'Disable emoji output')
    .option('--no-auto-install', 'Disable automatic Bun installation');

  // Add global options but hide them from global help
  // They will still be passed to all commands for backward compatibility
  // Note: Removed --remote-url global option as it conflicts with subcommand options

  // Add commands dynamically to avoid static imports that trigger schema loading
  const commands = [
    { name: 'create', path: './commands/create/index.js' },
    { name: 'plugins', path: './commands/plugins/index.js' },
    { name: 'agent', path: './commands/agent/index.js' },
    { name: 'auth', path: './commands/auth/index.js' },
    { name: 'start', path: './commands/start/index.js' },
    { name: 'update', path: './commands/update/index.js' },
    { name: 'test', path: './commands/test/index.js' },
    { name: 'scenario', path: './commands/scenario/index.js' },
    { name: 'benchmark', path: './commands/benchmark.js' },
    { name: 'test-production-verification', path: './commands/test-production-verification.js' },
    { name: 'stress-test-verification', path: './commands/stress-test-verification.js' },
    { name: 'env', path: './commands/env/index.js' },
    { name: 'cleanup', path: './commands/cleanup/index.js' },
    { name: 'publish', path: './commands/publish.js' },
  ];

  // For test environments (scenario, test commands, or NODE_ENV=test), set database type early
  const isTestCommand =
    process.argv.includes('scenario') ||
    process.argv.includes('test') ||
    process.env.NODE_ENV === 'test' ||
    process.env.VITEST === 'true' ||
    process.env.ELIZA_TEST_MODE === 'true';

  if (isTestCommand) {
    console.log('🔧 CLI: Detected test environment, setting database type to PGLite...');
    try {
      const sqlModule = (await import('@elizaos/plugin-sql')) as any;
      if ('setDatabaseType' in sqlModule && typeof sqlModule.setDatabaseType === 'function') {
        sqlModule.setDatabaseType('pglite');
        console.log('✅ CLI: Set database type to PGLite for testing');
      } else {
        console.warn(
          '⚠️  CLI: setDatabaseType not found in plugin-sql exports:',
          Object.keys(sqlModule)
        );
      }
    } catch (error) {
      console.warn('⚠️  CLI: Failed to set database type for testing:', error);
    }
  }

  for (const cmd of commands) {
    try {
      const commandModule = await import(cmd.path);
      
      // Try multiple ways to find the command export
      let command = null;
      
      // First, check for default export
      if (commandModule.default) {
        command = commandModule.default;
      }
      // Then check for named export matching the command name
      else if (commandModule[cmd.name]) {
        command = commandModule[cmd.name];
      }
      // Check for Command suffix
      else if (commandModule[`${cmd.name}Command`]) {
        command = commandModule[`${cmd.name}Command`];
      }
      // For specific commands, check alternative names
      else if (cmd.name === 'auth' && commandModule.auth_default) {
        command = commandModule.auth_default;
      }
      else if (cmd.name === 'plugins' && commandModule.addPlugin) {
        // For plugins command, we might need to construct the command
        // This is a special case where the module exports actions instead of a command
        continue; // Skip for now, will need special handling
      }
      else if (cmd.name === 'env' && commandModule.editEnvVars) {
        // Similar to plugins, env might export functions instead of a command
        continue; // Skip for now
      }
      
      if (command && typeof command === 'object' && command._name) {
        // It's a Commander command object
        program.addCommand(command);
      }
    } catch (error) {
      console.warn(`Failed to load command ${cmd.name}:`, error);
    }
  }

  // if no args are passed, display the banner (it will handle its own update check)
  if (process.argv.length === 2) {
    const { displayBanner } = await import('./utils/index.js');
    await displayBanner(false); // Let banner handle update check and show enhanced notification
  }

  await program.parseAsync();
}

main().catch((error) => {
  console.error('An error occurred:', error);
  process.exit(1);
});
