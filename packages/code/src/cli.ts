#!/usr/bin/env node
// CLI entry point for Claude CLI

import { createProgram } from './cli/index';

async function main() {
  const program = createProgram();
  
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  main();
} 