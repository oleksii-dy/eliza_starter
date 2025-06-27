import { createPluginConfigWithExternals } from '@elizaos/core';

// SQL plugin uses database externals plus some specific ones
const additionalExternals = [
  '@reflink/reflink',
  '@node-llama-cpp', 
  'agentkeepalive',
];

export const buildConfig = createPluginConfigWithExternals(
  ['./src/index.ts'],
  ['database'],
  additionalExternals
);
