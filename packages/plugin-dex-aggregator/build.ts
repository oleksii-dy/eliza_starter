import { promises as fs } from 'fs';
import path from 'path';

console.log('🏗️  Building @elizaos/plugin-dex-aggregator...');

const buildConfig = {
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'node',
  format: 'esm',
  splitting: false,
  sourcemap: 'none',
  external: [
    '@elizaos/core',
    'viem',
    'ethers', 
    'zod',
    'bignumber.js',
    'axios',
    '@1inch/fusion-sdk',
    '@paraswap/sdk'
  ],
  naming: '[dir]/[name].[ext]',
};

try {
  console.log('📦 Starting Bun build...');
  
  const output = await Bun.build(buildConfig);
  
  if (output.success) {
    console.log('✅ Built', output.outputs.length, 'files');
    
    // Write the output content to the file
    for (const file of output.outputs) {
      if (file.path.endsWith('index.js')) {
        const content = await file.text();
        const outputPath = path.join('./dist', 'index.js');
        await fs.writeFile(outputPath, content);
        console.log(`✅ Successfully wrote ${outputPath} (${content.length} bytes)`);
      }
    }
    
    console.log('✅ Build complete!');
  } else {
    console.error('❌ Build failed');
    for (const message of output.logs) {
      console.error(message);
    }
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Build error:', error);
  process.exit(1);
}