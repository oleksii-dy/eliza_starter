import { UserEnvironment } from '@/src/utils';
import { RuntimeSettings } from '@elizaos/core';
import dotenv from 'dotenv';

/**
 * Load environment configuration for runtime
 *
 * Loads environment variables from the project's .env file and returns them as runtime settings.
 */
export async function loadEnvConfig(): Promise<RuntimeSettings> {
  const envInfo = await UserEnvironment.getInstanceInfo();
  if (envInfo.paths.envFilePath) {
    dotenv.config({ path: envInfo.paths.envFilePath });
  }

  const settings = { ...process.env } as RuntimeSettings;

  // For E2E tests, force PGLite usage by removing PostgreSQL URLs
  if (process.env.FORCE_PGLITE === 'true') {
    delete settings.POSTGRES_URL;
    delete settings.DATABASE_URL;
  }

  return settings;
}
