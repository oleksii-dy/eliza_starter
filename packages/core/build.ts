#!/usr/bin/env bun

/**
 * Build script for @elizaos/core using bun build
 */

import { $ } from 'bun';
import { buildConfig } from './build.config';
import { promises as fs } from 'fs';
import { join } from 'path';

async function build() {
  console.log('🏗️  Building @elizaos/core...');

  // Clean dist directory
  await $`rm -rf dist`;

  // Build with bun
  const result = await Bun.build(buildConfig);

  if (!result.success) {
    console.error('❌ Build failed:');
    for (const message of result.logs) {
      console.error(message);
    }
    process.exit(1);
  }

  console.log(`✅ Built ${result.outputs.length} files`);

  // Post-process the index.js to remove createRequire import and handlebars extensions
  console.log('🔧 Post-processing for browser compatibility...');
  const indexPath = join(import.meta.dir, 'dist/index.js');
  let content = await fs.readFile(indexPath, 'utf-8');

  // Remove createRequire import
  content = content.replace(
    /import\s*{\s*createRequire\s*}\s*from\s*["']node:module["'];?\s*\n?/g,
    ''
  );

  // Also remove any usage of createRequire if present
  content = content.replace(/const\s+require\s*=\s*createRequire\([^)]*\);?\s*\n?/g, '');

  // Remove direct createRequire usage (the problematic line)
  content = content.replace(
    /var __require = \/\* @__PURE__ \*\/ createRequire\(import\.meta\.url\);?\s*\n?/g,
    ''
  );
  content = content.replace(
    /createRequire\(import\.meta\.url\)/g,
    '(() => { throw new Error("createRequire not available in browser"); })'
  );

  // Replace any remaining standalone createRequire references with a browser-safe version
  content = content.replace(
    /\bcreateRequire\s*\(/g,
    '(() => { throw new Error("createRequire not available in browser"); })('
  );

  // Handle __require calls for Node.js built-in modules
  const nodeModules = [
    'os',
    'path',
    'fs',
    'url',
    'util',
    'stream',
    'buffer',
    'events',
    'net',
    'http',
    'https',
    'child_process',
    'cluster',
    'dns',
    'readline',
    'zlib',
    'vm',
  ];
  const usedNodeModules = new Set<string>();

  // First, collect all the node modules that are being required
  nodeModules.forEach((moduleName) => {
    if (content.includes(`__require("node:${moduleName}")`)) {
      usedNodeModules.add(moduleName);
    }
  });

  // Check for existing imports
  const existingImports = new Map<string, string>();



  // Check for other node module imports
  nodeModules.forEach((moduleName) => {
    const importMatch = content.match(
      new RegExp(`import\\s+(\\w+)\\s+from\\s+["'](?:node:)?${moduleName}["'];?`)
    );
    if (importMatch) {
      existingImports.set(moduleName, importMatch[1]);
    }
  });

  // Add imports for used modules that don't already have imports
  const importsToAdd: string[] = [];
  usedNodeModules.forEach((moduleName) => {
    if (!existingImports.has(moduleName)) {
      importsToAdd.push(`import ${moduleName} from 'node:${moduleName}';`);
      existingImports.set(moduleName, moduleName);
    }
  });

  // Add the imports at the top of the file
  if (importsToAdd.length > 0) {
    const importStatement = importsToAdd.join('\n') + '\n';
    const firstImportMatch = content.match(/^import\s+.+$/m);
    if (firstImportMatch) {
      const insertIndex = firstImportMatch.index! + firstImportMatch[0].length;
      content = content.slice(0, insertIndex) + '\n' + importStatement + content.slice(insertIndex);
    } else {
      content = importStatement + content;
    }
  }

  // Replace __require calls with the appropriate module references
  existingImports.forEach((varName, moduleName) => {
    content = content.replace(
      new RegExp(`__require\\(["']node:${moduleName}["']\\)`, 'g'),
      varName
    );
  });

  // Handle any remaining __require calls by replacing them with dynamic imports or throwing errors
  content = content.replace(
    /__require\(/g,
    '((m) => { throw new Error(`Dynamic require of ${m} is not supported in ESM`); })('
  );

  // Remove handlebars require.extensions code
  content = content.replace(
    /if\s*\(\s*__require\.extensions\s*\)\s*{[^}]*__require\.extensions\[["']\.handlebars["']\][^}]*}/g,
    ''
  );

  await fs.writeFile(indexPath, content);
  console.log('✅ Removed Node.js specific imports and handlebars extensions');

  // Generate TypeScript declarations
  console.log('📝 Generating TypeScript declarations...');
  try {
    await $`tsc --project tsconfig.build.json`;
    console.log('✅ Individual TypeScript declarations generated');

    // Instead of using dts-bundle-generator which has issues with external types,
    // we'll just ensure the main index.d.ts exists
    const indexDtsPath = join(import.meta.dir, 'dist/index.d.ts');
    const srcIndexDtsPath = join(import.meta.dir, 'dist/index.d.ts');

    // Check if index.d.ts was generated
    try {
      await fs.access(indexDtsPath);
      console.log('✅ TypeScript declarations available at dist/index.d.ts');
    } catch {
      console.warn('⚠️ Main index.d.ts not found, build may have issues');
    }

    console.log('✅ TypeScript declarations completed');
  } catch (error) {
    console.warn('⚠️ TypeScript declaration generation had issues, but continuing...');
    console.warn(error);
  }

  console.log('✅ Build complete!');
}

build().catch(console.error);
