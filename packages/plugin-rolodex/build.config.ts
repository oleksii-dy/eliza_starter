import { createPluginConfig } from '@elizaos/core';

// Rolodex-specific externals
const rolodexExternals = [
  '@reflink/reflink',
  'agentkeepalive',
];

export const buildConfig = createPluginConfig(['./src/index.ts'], rolodexExternals);
