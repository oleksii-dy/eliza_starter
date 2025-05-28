import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Get the CLI version from package.json
 */
export function getVersion(): string {
  // For ESM modules we need to use import.meta.url instead of __dirname
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Find package.json relative to the current file
  const packageJsonPath = path.resolve(__dirname, '../package.json');

  // Add a simple check in case the path is incorrect
  let version = '0.0.0'; // Fallback version
  if (!fs.existsSync(packageJsonPath)) {
    console.error(`Warning: package.json not found at ${packageJsonPath}`);
  } else {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      version = packageJson.version || '0.0.0';
    } catch (error) {
      console.error(`Error reading or parsing package.json at ${packageJsonPath}:`, error);
    }
  }
  return version;
}

/**
 * Get install tag based on CLI version
 */
export function getCliInstallTag(): string {
  const version = getVersion();
  if (version.includes('-alpha')) {
    return 'alpha';
  } else if (version.includes('-beta')) {
    return 'beta';
  }
  return ''; // Return empty string for stable or non-tagged versions (implies latest)
}
