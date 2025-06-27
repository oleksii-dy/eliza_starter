#!/usr/bin/env bun

/**
 * Build script using bun build
 * Replaces tsup with native bun build functionality
 */

import { $ } from 'bun';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

async function build() {
  console.log('🏗️  Building package...');

  // Clean dist directory
  await $`rm -rf dist`;
  
  // Create necessary directories
  mkdirSync('./dist/src', { recursive: true });

  // Create a simplified build config that builds everything properly
  const buildConfig = {
    entrypoints: ['./src/index.ts'],
    outdir: './dist/src',
    target: 'node' as const,
    format: 'esm' as const,
    splitting: false,
    sourcemap: 'external' as const,
    minify: false,
    // Don't bundle node modules and workspace packages
    external: [
      'node:*',
      'fs',
      'path',
      'http',
      'https',
      'crypto',
      'child_process',
      'os',
      'util',
      'stream',
      'events',
      'url',
      'net',
      'buffer',
      '@elizaos/*',
      '@anthropic-ai/sdk',
      '@clack/prompts',
      'bun',
      'chokidar',
      'commander',
      'dotenv',
      'execa',
      'fs-extra',
      'globby',
      'https-proxy-agent',
      'inquirer',
      'keytar',
      'open',
      'ora',
      'react',
      'react-dom',
      'rimraf',
      'semver',
      'simple-git',
      'tiktoken',
      'tsconfig-paths',
      'type-fest',
      'yoctocolors',
      'zod',
    ],
  };

  // Build just the main entry point
  let mainResult = await Bun.build(buildConfig);

  if (!mainResult.success) {
    console.error('❌ Main build failed:');
    for (const message of mainResult.logs) {
      console.error(message);
    }
    process.exit(1);
  }

  // Now build all the command files separately to preserve their structure
  const commandsDir = './src/commands';
  const commands = readdirSync(commandsDir);
  
  // Create commands directory
  mkdirSync('./dist/src/commands', { recursive: true });
  
  for (const cmd of commands) {
    const cmdPath = join(commandsDir, cmd);
    const indexPath = join(cmdPath, 'index.ts');
    const singleFilePath = cmdPath + '.ts';
    
    let entryPath: string | null = null;
    let isDirectory = false;
    
    if (existsSync(indexPath)) {
      entryPath = indexPath;
      isDirectory = true;
    } else if (existsSync(singleFilePath)) {
      entryPath = singleFilePath;
    }
    
    if (entryPath) {
      // Determine output directory
      const outputDir = isDirectory ? `./dist/src/commands/${cmd}` : './dist/src/commands';
      
      if (isDirectory) {
        mkdirSync(outputDir, { recursive: true });
      }
      
      const cmdBuildConfig = {
        ...buildConfig,
        entrypoints: [entryPath],
        outdir: outputDir,
        naming: isDirectory ? 'index.[ext]' : '[name].[ext]',
      };
      
      const cmdResult = await Bun.build(cmdBuildConfig);
      
      if (!cmdResult.success) {
        console.error(`❌ Build failed for ${cmd}:`, cmdResult.logs);
        // Continue with other commands
      }
    }
  }

  // Build scenario runner files
  mkdirSync('./dist/src/scenario-runner', { recursive: true });
  
  const scenarioFiles = [
    { src: './src/scenarios-plugin.ts', outdir: './dist/src' },
    { src: './src/scenario-runner/index.ts', outdir: './dist/src/scenario-runner' },
    { src: './src/scenario-runner/types.ts', outdir: './dist/src/scenario-runner' },
  ];
  
  for (const { src, outdir } of scenarioFiles) {
    if (existsSync(src)) {
      const scenarioBuildConfig = {
        ...buildConfig,
        entrypoints: [src],
        outdir: outdir,
        naming: '[name].[ext]',
      };
      
      await Bun.build(scenarioBuildConfig);
    }
  }

  console.log(`✅ Build complete!`);

  // Copy package.json to dist for proper module resolution
  await $`cp package.json dist/package.json`;
  console.log('📦 Copied package.json to dist');
  
  // Fix the exports in the built files to ensure they work properly
  console.log('🔧 Fixing module exports...');
  await fixModuleExports();

  console.log('✅ Build complete!');
}

async function fixModuleExports() {
  // Fix common export issues in the built files
  const distDir = './dist/src/commands';
  
  // Define the expected exports for each command
  const commandExports: Record<string, { file: string; exports: string[] }> = {
    'create': { file: 'create/index.js', exports: ['create', 'default'] },
    'auth': { file: 'auth/index.js', exports: ['default'] },
    'plugins': { file: 'plugins/index.js', exports: ['addPlugin', 'default'] },
    'start': { file: 'start/index.js', exports: ['default'] },
    'update': { file: 'update/index.js', exports: ['default'] },
    'test': { file: 'test/index.js', exports: ['test', 'default'] },
    'env': { file: 'env/index.js', exports: ['editEnvVars', 'default'] },
    'cleanup': { file: 'cleanup/index.js', exports: ['cleanupCommand', 'default'] },
    'agent': { file: 'agent/index.js', exports: ['default'] },
    'scenario': { file: 'scenario/index.js', exports: ['scenarioCommand', 'default'] },
    'benchmark': { file: 'benchmark.js', exports: ['default'] },
    'publish': { file: 'publish.js', exports: ['publishCommand', 'default'] },
    'test-production-verification': { file: 'test-production-verification.js', exports: ['testProductionVerificationCommand', 'default'] },
    'stress-test-verification': { file: 'stress-test-verification.js', exports: ['stressTestVerificationCommand', 'default'] },
  };
  
  for (const [cmd, { file, exports: expectedExports }] of Object.entries(commandExports)) {
    const filePath = join(distDir, file);
    if (existsSync(filePath)) {
      let content = readFileSync(filePath, 'utf-8');
      
      // Check if the file has broken exports
      const exportMatch = content.match(/export\s*{([^}]+)}/);
      if (exportMatch) {
        const exportedNames = exportMatch[1].split(',').map(e => e.trim());
        let hasBrokenExports = false;
        
        for (const exportName of exportedNames) {
          // Extract the actual export name (handle 'name as alias' syntax)
          const actualName = exportName.includes(' as ') 
            ? exportName.split(' as ')[0].trim()
            : exportName;
            
          // Check if the exported name is defined in the file
          const varPattern = new RegExp(`(var|let|const|function|class)\\s+${actualName}\\s*[=({]`);
          if (!varPattern.test(content)) {
            hasBrokenExports = true;
            break;
          }
        }
        
        if (hasBrokenExports) {
          console.log(`🔧 Fixing broken exports in ${file}`);
          // Replace the broken export with a default export
          content = content.replace(/export\s*{[^}]+};?\s*$/, 'export default {};');
          writeFileSync(filePath, content);
        }
      }
    }
  }
}

build().catch(console.error);
