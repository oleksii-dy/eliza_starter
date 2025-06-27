import type { BuildConfig } from 'bun';

/**
 * Universal plugin build configuration for ElizaOS
 * Eliminates createRequire polyfills by properly externalizing all Node.js built-ins
 * 
 * @example
 * ```typescript
 * // In plugin build.config.ts
 * import { createPluginConfig } from '@elizaos/core';
 * export const buildConfig = createPluginConfig(['./src/index.ts']);
 * ```
 */

const nodeBuiltins = [
  // Core Node.js modules
  'fs', 'path', 'crypto', 'buffer', 'stream', 'util', 'events', 'url', 'os',
  'http', 'https', 'net', 'tls', 'dns', 'zlib', 'vm', 'child_process', 
  'readline', 'cluster', 'process', 'assert', 'querystring', 'string_decoder',
  'timers', 'tty', 'worker_threads', 'inspector', 'perf_hooks', 'trace_events',
  'module', 'v8', 'async_hooks', 'constants', 'domain', 'punycode',
  
  // Node.js prefixed versions
  'node:fs', 'node:path', 'node:crypto', 'node:buffer', 'node:stream', 
  'node:util', 'node:events', 'node:url', 'node:os', 'node:http', 'node:https',
  'node:net', 'node:tls', 'node:dns', 'node:zlib', 'node:vm', 'node:child_process',
  'node:readline', 'node:cluster', 'node:process', 'node:assert', 'node:querystring',
  'node:string_decoder', 'node:timers', 'node:tty', 'node:worker_threads',
  'node:inspector', 'node:perf_hooks', 'node:trace_events', 'node:module',
  'node:web', 'node:v8', 'node:async_hooks', 'node:constants', 'node:domain',
  'node:punycode',
];

const elizaPackages = [
  '@elizaos/core',
  '@elizaos/plugin-sql',
  '@elizaos/plugin-research', 
  '@elizaos/plugin-github',
  '@elizaos/plugin-payment',
  '@elizaos/plugin-rolodex',
  '@elizaos/plugin-solana',
  '@elizaos/plugin-evm',
  '@elizaos/plugin-trust',
  '@elizaos/plugin-tasks',
  '@elizaos/plugin-secrets-manager',
  '@elizaos/plugin-plugin-manager',
  '@elizaos/plugin-message-handling',
  '@elizaos/plugin-knowledge',
  '@elizaos/plugin-planning',
  '@elizaos/plugin-agentkit',
  '@elizaos/plugin-autonomy',
  '@elizaos/plugin-crossmint',
  '@elizaos/plugin-dummy-services',
  '@elizaos/plugin-e2b',
  '@elizaos/plugin-elizaos-services',
  '@elizaos/plugin-goals',
  '@elizaos/plugin-hyperfy',
  '@elizaos/plugin-mcp',
  '@elizaos/plugin-midnight',
  '@elizaos/plugin-ngrok',
  '@elizaos/plugin-personality',
  '@elizaos/plugin-robot',
  '@elizaos/plugin-shell',
  '@elizaos/plugin-stagehand',
  '@elizaos/plugin-starter',
  '@elizaos/plugin-todo',
  '@elizaos/plugin-training',
  '@elizaos/plugin-vision',
];

const commonExternals = [
  ...nodeBuiltins,
  ...elizaPackages,
  
  // Test and development tools
  'bun:test',
  'vitest',
  '@vitest/spy',
  '@vitest/expect',
  'jest',
  '@jest/types',
  
  // Configuration and environment
  'dotenv',
  'zod',
  'uuid',
  'handlebars',
  'sharp',
  'pino-pretty',
  '@hapi/shot',
  
  // Common crypto/blockchain dependencies
  '@solana/web3.js',
  '@solana/spl-token', 
  'ethers',
  'web3',
  'crypto-browserify',
  'js-sha1',
  'bs58',
  'bignumber.js',
  
  // HTTP and networking
  'axios',
  'node-fetch',
  'form-data',
  'combined-stream',
  'proxy-from-env',
  'follow-redirects',
  'undici',
  'ws',
  
  // React ecosystem (for frontend components)
  'react',
  'react-dom',
  '@tanstack/react-query',
  '@types/react',
  '@types/react-dom',
  
  // Database and storage
  'drizzle-orm',
  'drizzle-orm/pg-core',
  'drizzle-orm/node-postgres',
  'drizzle-orm/pglite',
  'pg',
  '@pglite/pg',
  '@electric-sql/pglite',
  'bcrypt',
  'bcryptjs',
  'argon2',
  'scrypt',
  
  // AI and ML libraries
  '@ai-sdk/anthropic',
  '@ai-sdk/google',
  '@ai-sdk/openai',
  '@ai-sdk/provider-utils',
  'ai',
  'openai',
  '@anthropic-ai/sdk',
  '@google/generative-ai',
  
  // Browser automation and scraping
  'playwright',
  'playwright-core',
  'puppeteer',
  'puppeteer-core',
  'cheerio',
  'jsdom',
  '@puppeteer/browsers',
  'chromium-bidi',
  
  // File processing
  'pdf-parse',
  '@types/pdf-parse',
  'lru-cache',
  'mime-types',
  '@types/mime-types',
];

/**
 * Creates a standardized build configuration for ElizaOS plugins
 * 
 * @param entrypoints Array of entry points for the build (default: ['./src/index.ts'])
 * @param additionalExternals Additional dependencies to externalize (optional)
 * @returns Complete Bun build configuration
 */
export function createPluginConfig(
  entrypoints: string[] = ['./src/index.ts'],
  additionalExternals: string[] = []
): BuildConfig {
  return {
    entrypoints,
    outdir: './dist',
    target: 'node',
    format: 'esm', // Always use ESM to avoid createRequire
    splitting: false,
    sourcemap: 'external',
    external: [...commonExternals, ...additionalExternals],
    naming: '[dir]/[name].[ext]',
    
    // Prevent any polyfills from being injected
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    
    // Ensure no CommonJS polyfills
    packages: 'external',
  };
}

/**
 * Predefined external lists for common plugin types
 */
export const externalLists = {
  nodeBuiltins,
  elizaPackages,
  commonExternals,
  
  // Specialized externals for specific plugin types
  database: [
    'drizzle-orm',
    'drizzle-orm/pg-core', 
    'drizzle-orm/node-postgres',
    'drizzle-orm/pglite',
    'pg',
    '@pglite/pg',
    '@electric-sql/pglite',
    'bcrypt',
    'bcryptjs',
    'argon2',
    'scrypt',
    '@reflink/reflink',
    'agentkeepalive',
  ],
  
  ai: [
    '@ai-sdk/anthropic',
    '@ai-sdk/google', 
    '@ai-sdk/openai',
    '@ai-sdk/provider-utils',
    'ai',
    'openai',
    '@anthropic-ai/sdk',
    '@google/generative-ai',
  ],
  
  web: [
    'playwright',
    'playwright-core',
    'puppeteer',
    'puppeteer-core',
    'cheerio',
    'jsdom',
    '@puppeteer/browsers',
    'chromium-bidi',
    'duck-duck-scrape',
    'lru-cache',
    'pdf-parse',
    '@types/pdf-parse',
  ],
  
  crypto: [
    '@solana/web3.js',
    '@solana/spl-token',
    'ethers', 
    'web3',
    'crypto-browserify',
    'js-sha1',
    'bs58',
    'bignumber.js',
  ],
};

/**
 * Creates a plugin config with predefined external lists
 * 
 * @param entrypoints Entry points for the build
 * @param externalTypes Types of externals to include ('database', 'ai', 'web', 'crypto')
 * @param additionalExternals Any additional externals to include
 */
export function createPluginConfigWithExternals(
  entrypoints: string[] = ['./src/index.ts'],
  externalTypes: (keyof typeof externalLists)[] = [],
  additionalExternals: string[] = []
): BuildConfig {
  const typeExternals = externalTypes.flatMap(type => 
    type in externalLists ? externalLists[type] : []
  );
  
  return createPluginConfig(entrypoints, [...typeExternals, ...additionalExternals]);
}