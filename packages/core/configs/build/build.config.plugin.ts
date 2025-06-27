import { createPluginConfig } from '@elizaos/core';

/**
 * Standard plugin build configuration
 * Can be imported and used by any plugin package
 */
export const buildConfig = createPluginConfig(['./src/index.ts']);