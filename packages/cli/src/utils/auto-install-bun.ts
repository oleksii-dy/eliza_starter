import { logger } from '@elizaos/core';
import { bunExec, bunExecInherit } from './bun-exec';
import os from 'node:os';
import path from 'node:path';
import { existsSync } from 'node:fs';

// Constants
const INSTALLATION_VERIFICATION_DELAY_MS = 2000; // 2 seconds delay to allow installation to complete

/**
 * Gets the default Bun installation directory based on platform
 */
function getBunInstallDir(): string {
  const home = os.homedir();

  if (process.platform === 'win32') {
    // Windows: %LOCALAPPDATA%\bun
    return path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'bun');
  } else {
    // macOS and Linux: ~/.bun
    return path.join(home, '.bun');
  }
}

/**
 * Updates the current process's PATH to include Bun installation directory
 */
function updateProcessPath(): void {
  const bunDir = getBunInstallDir();
  const binDir = path.join(bunDir, 'bin');

  // Check if the bin directory exists
  try {
    if (!existsSync(binDir)) {
      logger.debug(`[autoInstallBun] Bun bin directory does not exist: ${binDir}`);
      return;
    }
  } catch (error) {
    logger.debug(`[autoInstallBun] Could not check Bun bin directory: ${error}`);
    return;
  }

  // Add to PATH if not already present
  const currentPath = process.env.PATH || '';
  if (!currentPath.includes(binDir)) {
    // Prepend to PATH so our Bun installation takes precedence
    process.env.PATH = `${binDir}${process.platform === 'win32' ? ';' : ':'}${currentPath}`;
    logger.debug(`[autoInstallBun] Updated process PATH to include: ${binDir}`);
  } else {
    logger.debug(`[autoInstallBun] Bun bin directory already in PATH: ${binDir}`);
  }
}

/**
 * Attempts to refresh PATH from the shell environment
 * This is a best-effort approach that may not work in all scenarios
 */
async function refreshPathFromShell(): Promise<void> {
  try {
    if (process.platform === 'win32') {
      // On Windows, try to get PATH from PowerShell
      const result = await bunExec('powershell', ['-c', '$env:PATH'], { stdio: 'ignore' });
      if (result.success && result.stdout) {
        process.env.PATH = result.stdout.trim();
        logger.debug('[autoInstallBun] Refreshed PATH from PowerShell');
      }
    } else {
      // On Unix-like systems, try to get PATH from shell
      const shell = process.env.SHELL || '/bin/bash';
      const result = await bunExec(shell, ['-c', 'echo $PATH'], { stdio: 'ignore' });
      if (result.success && result.stdout) {
        process.env.PATH = result.stdout.trim();
        logger.debug(`[autoInstallBun] Refreshed PATH from ${shell}`);
      }
    }
  } catch (error) {
    logger.debug(`[autoInstallBun] Could not refresh PATH from shell: ${error}`);
    // Fall back to manual PATH update
    updateProcessPath();
  }
}

/**
 * Checks if Bun is already installed
 */
async function isBunInstalled(): Promise<boolean> {
  try {
    const result = await bunExec('bun', ['--version'], { stdio: 'ignore' });
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Attempts to automatically install Bun based on the platform
 */
export async function autoInstallBun(): Promise<boolean> {
  // Check if Bun is already installed
  if (await isBunInstalled()) {
    logger.info('Bun is already installed.');
    return true;
  }

  const platform = process.platform;

  try {
    if (platform === 'win32') {
      // Windows installation
      await bunExecInherit('powershell', ['-c', 'irm bun.sh/install.ps1 | iex']);
    } else {
      // macOS and Linux installation
      await bunExecInherit('sh', ['-c', 'curl -fsSL https://bun.sh/install | bash']);
    }

    logger.info('Bun installation script executed successfully.');

    // Update the current process's PATH to include the newly installed Bun
    logger.debug('[autoInstallBun] Updating process PATH after installation...');
    await refreshPathFromShell();

    // Verify installation
    // Sleep briefly to allow the installation to complete
    await new Promise((resolve) => setTimeout(resolve, INSTALLATION_VERIFICATION_DELAY_MS));

    // Check if Bun is now available
    if (await isBunInstalled()) {
      logger.success('Bun has been successfully installed!');
      return true;
    } else {
      logger.error('Bun installation completed but the command is not available in PATH.');
      logger.error('Please restart your terminal or source your shell profile.');
      return false;
    }
  } catch (error) {
    logger.error(
      `Failed to auto-install Bun: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

/**
 * Determines if auto-installation should be attempted
 */
export function shouldAutoInstall(): boolean {
  // Check environment variable
  const autoInstallEnv = process.env.ELIZA_AUTO_INSTALL_BUN;
  if (autoInstallEnv === 'false' || autoInstallEnv === '0') {
    return false;
  }

  // Check if running in CI/CD environment
  if (process.env.CI || process.env.CONTINUOUS_INTEGRATION) {
    return false;
  }

  // Check if running in a container
  if (process.env.CONTAINER || process.env.DOCKER_CONTAINER) {
    return false;
  }

  return true;
}
