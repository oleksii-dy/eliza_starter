import { UserEnvironment } from '@/src/utils';
import { RuntimeSettings, logger } from '@elizaos/core';
import { initializeCLIConfig, resolveCLIEnvPath } from '@/src/utils/unified-config';

/**
 * Load environment configuration for runtime using unified configuration management
 *
 * @deprecated This function now delegates to the unified configuration system
 * Loads environment variables from the project's .env file and returns them as runtime settings.
 */
export async function loadEnvConfig(): Promise<RuntimeSettings> {
  try {
    // Use unified configuration to load environment
    const envPath = resolveCLIEnvPath();
    await initializeCLIConfig({ envPath });
    
    logger.debug(`Environment configuration loaded from: ${envPath}`);
    return process.env as RuntimeSettings;
  } catch (error) {
    // Fallback to legacy method if unified config fails
    logger.warn('Falling back to legacy environment loading');
    const envInfo = await UserEnvironment.getInstanceInfo();
    if (envInfo.paths.envFilePath) {
      const dotenv = await import('dotenv');
      dotenv.config({ path: envInfo.paths.envFilePath });
    }
    return process.env as RuntimeSettings;
  }
}

/**
 * Load environment configuration using the new unified system
 */
export async function loadUnifiedEnvConfig(): Promise<RuntimeSettings> {
  const envPath = resolveCLIEnvPath();
  await initializeCLIConfig({ envPath });
  
  logger.info(`Environment configuration loaded using unified config from: ${envPath}`);
  return process.env as RuntimeSettings;
}
