import { logger, type LoggerConfig } from '@elizaos/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Load logger configuration from a dedicated file
 * @param dir Project directory
 * @returns LoggerConfig if found, null otherwise
 */
export async function loadLoggerConfig(dir: string): Promise<LoggerConfig | null> {
  const configPaths = [
    path.join(dir, 'logger.config.js'),
    path.join(dir, 'logger.config.ts'),
    path.join(dir, 'logger.config.mjs'),
    path.join(dir, 'config/logger.js'),
    path.join(dir, 'config/logger.ts'),
    path.join(dir, 'config/logger.mjs'),
  ];

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const importPath = path.resolve(configPath);
        const importUrl =
          process.platform === 'win32'
            ? 'file:///' + importPath.replace(/\\/g, '/')
            : 'file://' + importPath;

        const configModule = await import(importUrl);
        const config = configModule.default || configModule;

        if (config && typeof config === 'object') {
          logger.info(`Loaded logger configuration from ${configPath}`);
          return config as LoggerConfig;
        }
      } catch (error) {
        logger.warn(`Failed to load logger configuration from ${configPath}:`, error);
      }
    }
  }

  return null;
}

/**
 * Load logger configuration from various sources
 * @param dir Project directory
 * @returns LoggerConfig if found, null otherwise
 */
export async function loadProjectLoggerConfig(dir: string): Promise<LoggerConfig | null> {
  // First try dedicated logger config file
  const fileConfig = await loadLoggerConfig(dir);
  if (fileConfig) {
    return fileConfig;
  }

  // Then try package.json configuration
  const packageJsonPath = path.join(dir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.elizaos?.logger) {
        logger.info('Loaded logger configuration from package.json');
        return packageJson.elizaos.logger as LoggerConfig;
      }
    } catch (error) {
      logger.warn('Failed to parse package.json for logger configuration:', error);
    }
  }

  return null;
}
