import { buildConfig } from './build.config';

await Bun.build(buildConfig);
console.log('Build completed for @elizaos/plugin-e2b');