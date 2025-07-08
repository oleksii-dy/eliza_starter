import express from 'express';
import packageJson from '../../../package.json';

interface VersionInfo {
  version: string;
  source: string;
  timestamp: string;
  environment: string;
  uptime: number;
  error?: string;
}

/**
 * Gets version information using the package.json version
 * This is embedded at build time, so it works in all environments:
 * - Development (reading actual package.json)
 * - Production (bundled into dist)
 * - NPM installs (version is part of the published package)
 *
 * When the release workflow runs:
 * 1. Lerna updates all package.json files to the new version
 * 2. The packages are built with the new version embedded
 * 3. The new packages are published to npm
 * 4. Users get the correct version whether running from source or npm
 */
function getVersionInfo(): VersionInfo {
  const timestamp = new Date().toISOString();

  try {
    return {
      version: packageJson.version,
      source: 'server',
      timestamp,
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
    };
  } catch (error) {
    console.error('Error getting version info:', error);

    return {
      version: 'unknown',
      source: 'server',
      timestamp,
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      error: 'Failed to retrieve version information',
    };
  }
}

/**
 * Creates the version router for system version information
 */
export function createVersionRouter(): express.Router {
  const router = express.Router();

  // GET /api/system/version - Returns version information
  router.get('/', (_, res) => {
    const versionInfo = getVersionInfo();
    const statusCode = versionInfo.error ? 500 : 200;

    res.status(statusCode).json(versionInfo);
  });

  return router;
}
