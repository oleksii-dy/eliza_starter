import { execa } from 'execa';

// Global flag to prevent recursion
let isUpdating = false;

/**
 * Get latest CLI version from npm
 */
async function getLatestCliVersion(): Promise<string | null> {
  try {
    // Get the time data for all published versions to find the most recent
    const { stdout } = await execa('npm', ['view', '@elizaos/cli', 'time', '--json']);
    const timeData = JSON.parse(stdout);

    // Remove metadata entries like 'created' and 'modified'
    delete timeData.created;
    delete timeData.modified;

    // Find the most recently published version
    let latestVersion = '';
    let latestDate = new Date(0); // Start with epoch time

    for (const [version, dateString] of Object.entries(timeData)) {
      const publishDate = new Date(dateString as string);
      if (publishDate > latestDate) {
        latestDate = publishDate;
        latestVersion = version;
      }
    }

    return latestVersion || null;
  } catch {
    return null;
  }
}

/**
 * Check for CLI update and show notification (for banner display)
 */
export async function checkForCliUpdate(currentVersion: string): Promise<void> {
  try {
    const latestVersion = await getLatestCliVersion();

    // If already at the latest version or couldn't determine latest, exit
    if (!latestVersion || latestVersion === currentVersion) return;

    console.log(
      `\x1b[33m\nA new version of elizaOS CLI is available: ${latestVersion} (current: ${currentVersion})\x1b[0m`
    );
    console.log(`\x1b[32mUpdate with: elizaos update\x1b[0m\n`);
  } catch {
    /* silent: update check failure must not block banner */
  }
}

/**
 * Check if CLI needs update
 */
async function checkIfUpdateNeeded(): Promise<{
  needsUpdate: boolean;
  currentVersion: string;
  latestVersion: string | null;
}> {
  try {
    // Get current version
    const { getVersion } = await import('./display-banner');
    const currentVersion = getVersion();

    // Get latest version from npm
    const latestVersion = await getLatestCliVersion();

    const needsUpdate = latestVersion && latestVersion !== currentVersion;

    return {
      needsUpdate: !!needsUpdate,
      currentVersion,
      latestVersion: latestVersion || null,
    };
  } catch {
    return {
      needsUpdate: false,
      currentVersion: '',
      latestVersion: null,
    };
  }
}

/**
 * Perform automatic CLI update
 */
export async function performAutoUpdate(): Promise<void> {
  // Prevent recursion
  if (isUpdating) {
    return;
  }

  try {
    isUpdating = true;

    const { needsUpdate, currentVersion, latestVersion } = await checkIfUpdateNeeded();

    if (!needsUpdate || !latestVersion) {
      return;
    }

    // Check installation type
    const { isRunningViaNpx, isRunningViaBunx, isGlobalInstallation } = await import(
      './package-manager'
    );

    // Check if we're in development mode
    const cwd = process.cwd();
    const isDevelopment = cwd.includes('eliza') && currentVersion.includes('beta');

    // Development mode: show notification only
    if (isDevelopment) {
      console.log(
        `\x1b[33m\nA new version of elizaOS CLI is available: ${latestVersion} (current: ${currentVersion})\x1b[0m`
      );
      console.log(`\x1b[32mTo update, run: npm install -g @elizaos/cli@beta\x1b[0m\n`);
      return;
    }

    // npx/bunx: show notification only
    if ((await isRunningViaNpx()) || (await isRunningViaBunx())) {
      console.log(
        `\x1b[33m\nA new version of elizaOS CLI is available: ${latestVersion} (current: ${currentVersion})\x1b[0m`
      );
      console.log(`\x1b[32mTo update, run: npm install -g @elizaos/cli@beta\x1b[0m\n`);
      return;
    }

    const isGlobal = await isGlobalInstallation();

    // Non-global: show notification only
    if (!isGlobal) {
      console.log(
        `\x1b[33m\nA new version of elizaOS CLI is available: ${latestVersion} (current: ${currentVersion})\x1b[0m`
      );
      console.log(`\x1b[32mTo update, run: npm install -g @elizaos/cli@beta\x1b[0m\n`);
      return;
    }

    // Global installation: perform auto-update
    console.log(
      `\x1b[36m\nAuto-updating elizaOS CLI from ${currentVersion} to ${latestVersion}...\x1b[0m`
    );

    try {
      const { performCliUpdate } = await import('../commands/update');
      const success = await performCliUpdate();

      if (success) {
        console.log(`\x1b[32m✓ Successfully updated to ${latestVersion}!\x1b[0m`);

        // Re-execute the original command with the updated CLI
        const originalArgs = process.argv.slice(2);
        if (originalArgs.length > 0) {
          console.log(`\x1b[36mRe-executing command with updated CLI...\x1b[0m\n`);

          try {
            await execa('elizaos', ['--noupdate', ...originalArgs], {
              stdio: 'inherit',
            });
          } catch (error) {
            console.log(`\x1b[31m✗ Failed to re-execute command: ${error.message}\x1b[0m`);
            console.log(`\x1b[32mPlease run your command again manually.\x1b[0m\n`);
          }
        } else {
          console.log(`\x1b[32mPlease restart your terminal to use the updated CLI.\x1b[0m\n`);
        }

        process.exit(0);
      }
    } catch (error) {
      console.log(`\x1b[31m✗ Auto-update failed: ${error.message}\x1b[0m`);
      console.log(`\x1b[32mPlease update manually with: elizaos update --cli\x1b[0m\n`);
    }
  } catch (error) {
    // Silent failure - don't block command execution
  } finally {
    isUpdating = false;
  }
}
