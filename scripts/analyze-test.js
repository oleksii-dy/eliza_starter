// Simple standalone script to analyze async functions in a test file
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the file to analyze
const testFile = path.join(__dirname, 'test-async.js');

// Read the file
try {
  const code = fs.readFileSync(testFile, 'utf8');
  console.log('=== Analyzing Test File ===\n');

  // Simple regex to find async functions
  const asyncFnPattern = /async\s+function\s+(\w+)\s*\([^)]*\)\s*\{([^}]*)\}/gs;
  const asyncExportPattern = /export\s+async\s+function\s+(\w+)\s*\([^)]*\)\s*\{([^}]*)\}/gs;
  const arrowAsyncPattern = /const\s+(\w+)\s*=\s*async\s*\([^)]*\)\s*=>\s*\{([^}]*)\}/gs;

  // Store all matches
  const asyncFunctions = [];

  // Standard async functions
  let match;
  while ((match = asyncFnPattern.exec(code)) !== null) {
    asyncFunctions.push({
      name: match[1],
      body: match[2],
      start: match.index,
      end: match.index + match[0].length,
      type: 'standard',
    });
  }

  // Exported async functions
  while ((match = asyncExportPattern.exec(code)) !== null) {
    asyncFunctions.push({
      name: match[1],
      body: match[2],
      start: match.index,
      end: match.index + match[0].length,
      type: 'export',
    });
  }

  // Arrow async functions
  while ((match = arrowAsyncPattern.exec(code)) !== null) {
    asyncFunctions.push({
      name: match[1],
      body: match[2],
      start: match.index,
      end: match.index + match[0].length,
      type: 'arrow',
    });
  }

  console.log(`Found ${asyncFunctions.length} async functions\n`);

  // Analyze each function for parallelizable operations
  asyncFunctions.forEach((fn) => {
    console.log(`Function: ${fn.name} (${fn.type})`);

    // Look for consecutive await expressions using the same function call
    const awaitCalls = {};
    const awaitPattern = /await\s+([a-zA-Z0-9_]+)\(([^)]*)\)/g;
    let awaitMatch;

    while ((awaitMatch = awaitPattern.exec(fn.body)) !== null) {
      const fnName = awaitMatch[1];
      if (!awaitCalls[fnName]) {
        awaitCalls[fnName] = [];
      }
      awaitCalls[fnName].push({
        fullMatch: awaitMatch[0],
        args: awaitMatch[2],
        position: awaitMatch.index,
      });
    }

    // Check for parallelization opportunities
    let hasParallelizable = false;

    for (const [calledFn, calls] of Object.entries(awaitCalls)) {
      if (calls.length > 1) {
        hasParallelizable = true;
        console.log(
          `  Potential parallelization opportunity: ${calls.length} calls to ${calledFn}()`
        );
        console.log(`  Sample calls:`);
        calls.forEach((call, index) => {
          if (index < 3) {
            // Just show the first few to keep output manageable
            console.log(`    ${call.fullMatch}`);
          }
        });

        // Generate optimization suggestion
        console.log(`\n  Optimization suggestion:`);
        const varNames = calls.map((_, i) => `result${i + 1}`);
        console.log(`  const [${varNames.join(', ')}] = await Promise.all([`);
        calls.forEach((call) => {
          console.log(`    ${call.fullMatch.replace('await ', '')},`);
        });
        console.log('  ]);\n');
      }
    }

    if (!hasParallelizable) {
      console.log('  No parallelization opportunities found');
    }

    console.log(''); // Add newline between functions
  });

  console.log('=== Analysis Complete ===');
} catch (error) {
  console.error('Error analyzing file:', error);
}
