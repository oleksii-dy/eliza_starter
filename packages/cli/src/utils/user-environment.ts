import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '@elizaos/core';
import { existsSync } from 'node:fs';

// Types
interface OSInfo {
  platform: string;
  release: string;
  arch: string;
  type: string;
  version: string;
  homedir: string;
}

interface CLIInfo {
  version: string;
  name: string;
  path: string;
}

interface PackageManagerInfo {
  name: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'unknown';
  version: string | null;
  global: boolean;
  isNpx: boolean;
  isBunx: boolean;
}

interface PathInfo {
  elizaDir: string;
  envFilePath: string;
  configPath: string;
  pluginsDir: string;
}

interface EnvInfo {
  GITHUB_USERNAME?: string;
  GITHUB_TOKEN?: string;
  [key: string]: string | undefined;
}

export interface UserEnvironmentInfo {
  os: OSInfo;
  cli: CLIInfo;
  packageManager: PackageManagerInfo;
  timestamp: string;
  paths: PathInfo;
  env: EnvInfo;
}

/**
 * Provides information about the user's environment including OS, CLI, and package manager details.
 * Uses singleton pattern to cache results.
 */
export class UserEnvironment {
  private static instance: UserEnvironment;
  private cachedInfo: UserEnvironmentInfo | null = null;

  private constructor() {}

  public static getInstance(): UserEnvironment {
    if (!UserEnvironment.instance) {
      UserEnvironment.instance = new UserEnvironment();
    }
    return UserEnvironment.instance;
  }

  /**
   * Gets operating system information
   */
  private async getOSInfo(): Promise<OSInfo> {
    logger.debug('[UserEnvironment] Detecting OS information');
    return {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      type: os.type(),
      version: os.version(),
      homedir: os.homedir(),
    };
  }

  /**
   * Gets CLI version and package information
   */
  private async getCLIInfo(): Promise<CLIInfo> {
    logger.debug('[UserEnvironment] Getting CLI information');
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const packageJsonPath = path.resolve(__dirname, '../../package.json');

      if (!existsSync(packageJsonPath)) {
        throw new Error(`CLI package.json not found at ${packageJsonPath}`);
      }

      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      return {
        version: packageJson.version || '0.0.0',
        name: packageJson.name || '@elizaos/cli',
        path: process.argv[1] || '',
      };
    } catch (error) {
      logger.warn(
        `[UserEnvironment] Error getting CLI info: ${error instanceof Error ? error.message : String(error)}`
      );
      return {
        version: '0.0.0',
        name: '@elizaos/cli',
        path: process.argv[1] || '',
      };
    }
  }

  /**
   * Detects the active package manager
   */
  private async getPackageManagerInfo(): Promise<PackageManagerInfo> {
    logger.debug('[UserEnvironment] Detecting package manager');

    const isNpx =
      process.env.npm_execpath?.includes('npx') ||
      process.argv[1]?.includes('npx') ||
      process.env.NPX_COMMAND !== undefined;

    const isBunx =
      process.argv[1]?.includes('bunx') ||
      process.env.BUN_INSTALL === '1' ||
      process.argv[0]?.includes('bun');

    // Check for lock files in current directory
    const lockFiles = {
      'bun.lockb': 'bun',
      'pnpm-lock.yaml': 'pnpm',
      'yarn.lock': 'yarn',
      'package-lock.json': 'npm',
    } as const;

    let detectedPM: PackageManagerInfo['name'] = 'unknown';
    let version: string | null = null;

    try {
      // Check lock files
      for (const [file, pm] of Object.entries(lockFiles)) {
        if (existsSync(path.join(process.cwd(), file))) {
          detectedPM = pm as PackageManagerInfo['name'];
          break;
        }
      }

      // If no lock file found, try environment detection
      if (detectedPM === 'unknown') {
        if (isNpx) detectedPM = 'npm';
        else if (isBunx) detectedPM = 'bun';
        else if (process.env.npm_config_user_agent?.startsWith('pnpm')) detectedPM = 'pnpm';
        else if (process.env.npm_config_user_agent?.startsWith('yarn')) detectedPM = 'yarn';
        else if (process.env.npm_config_user_agent?.startsWith('npm')) detectedPM = 'npm';
      }

      // Try to get version
      if (detectedPM !== 'unknown') {
        try {
          const { stdout } = await import('execa').then(({ execa }) =>
            execa(detectedPM, ['--version'])
          );
          version = stdout.trim();
        } catch (e) {
          logger.debug(
            `[UserEnvironment] Could not get ${detectedPM} version: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
    } catch (error) {
      logger.warn(
        `[UserEnvironment] Error detecting package manager: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const cliPath = process.argv[1];
    const isGlobal =
      cliPath?.includes('/usr/local/') ||
      cliPath?.includes('/usr/bin/') ||
      process.env.NODE_ENV === 'global' ||
      (cliPath && process.cwd().indexOf(path.dirname(cliPath)) !== 0);

    return {
      name: detectedPM,
      version,
      global: isGlobal,
      isNpx,
      isBunx,
    };
  }

  /**
   * Gets all environment information
   */
  private async getPathInfo(): Promise<PathInfo> {
    const homedir = os.homedir();
    const elizaDir = path.join(homedir, '.eliza');

    return {
      elizaDir,
      envFilePath: path.join(elizaDir, '.env'),
      configPath: path.join(elizaDir, 'config.json'),
      pluginsDir: path.join(elizaDir, 'plugins'),
    };
  }

  private async getEnvInfo(): Promise<EnvInfo> {
    // Return a copy of process.env as EnvInfo
    return { ...process.env } as EnvInfo;
  }

  public async getInfo(): Promise<UserEnvironmentInfo> {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    logger.debug('[UserEnvironment] Gathering environment information');

    const [os, cli, packageManager, paths, env] = await Promise.all([
      this.getOSInfo(),
      this.getCLIInfo(),
      this.getPackageManagerInfo(),
      this.getPathInfo(),
      this.getEnvInfo(),
    ]);

    this.cachedInfo = {
      os,
      cli,
      packageManager,
      timestamp: new Date().toISOString(),
      paths,
      env,
    };

    return this.cachedInfo;
  }

  /**
   * Clears the cached information
   */
  public clearCache(): void {
    this.cachedInfo = null;
  }
}
