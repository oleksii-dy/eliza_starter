// Script to analyze packages for async function parallelization opportunities
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.dirname(__dirname);
const packagesDir = path.join(workspaceRoot, 'packages');

// Configuration
const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];
const IGNORE_DIRS = ['node_modules', 'dist', 'build', '.git'];
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

// Analysis results counters
let totalFiles = 0;
let totalErrors = 0;
let totalAsyncFunctions = 0;
let totalParallelizableFunc = 0;
let totalParallelizableOpportunities = 0;

// Process all packages
async function analyzePackages() {
  console.log('=== Analyzing Packages for Parallelization Opportunities ===\n');

  // Special case for test file
  const testFile = path.join(workspaceRoot, 'scripts', 'test-async.js');
  if (fs.existsSync(testFile)) {
    console.log('Analyzing test file: scripts/test-async.js');
    await analyzeFile(testFile);
    console.log(); // Add an extra newline for separation
  }

  // Check if packages directory exists
  if (!fs.existsSync(packagesDir)) {
    console.error(`Packages directory not found: ${packagesDir}`);
    return;
  }

  // Get all packages
  const packages = fs.readdirSync(packagesDir).filter((item) => {
    const itemPath = path.join(packagesDir, item);
    return fs.statSync(itemPath).isDirectory() && !IGNORE_DIRS.includes(item);
  });

  console.log(`Found ${packages.length} packages to analyze\n`);

  // Process each package
  for (const pkg of packages) {
    const packagePath = path.join(packagesDir, pkg);
    console.log(`Analyzing package: ${pkg}`);
    await processDirectory(packagePath);
  }

  // Print summary
  console.log('\n=== Analysis Summary ===');
  console.log(`Total files analyzed: ${totalFiles}`);
  console.log(`Total async functions found: ${totalAsyncFunctions}`);
  console.log(`Total functions with parallelization opportunities: ${totalParallelizableFunc}`);
  console.log(`Total parallelization opportunities: ${totalParallelizableOpportunities}`);
  console.log(`Total errors encountered: ${totalErrors}`);
  console.log('=== Analysis Complete ===');
}

// Process a directory recursively
async function processDirectory(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      // Skip ignored directories
      if (IGNORE_DIRS.includes(item)) continue;

      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // Recursively process subdirectory
        await processDirectory(itemPath);
      } else if (stat.isFile() && FILE_EXTENSIONS.includes(path.extname(itemPath))) {
        // Process file if it's a JS/TS file
        if (stat.size <= MAX_FILE_SIZE) {
          await analyzeFile(itemPath);
        } else {
          console.log(`  Skipping large file: ${itemPath} (${Math.round(stat.size / 1024)}KB)`);
        }
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error);
    totalErrors++;
  }
}

// Analyze a single file
async function analyzeFile(filePath) {
  try {
    totalFiles++;

    // Read file content
    const code = fs.readFileSync(filePath, 'utf8');
    const relativeFilePath = path.relative(workspaceRoot, filePath);

    // Find async functions
    const asyncFunctions = [];

    // Regular async function pattern
    const asyncFnPattern =
      /async\s+function\s+(\w+)\s*\([^)]*\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/gs;
    // Exported async function pattern
    const asyncExportPattern =
      /export\s+async\s+function\s+(\w+)\s*\([^)]*\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/gs;
    // Arrow async function pattern
    const arrowAsyncPattern =
      /(?:const|let|var)?\s*(\w+)\s*=\s*async\s*\([^)]*\)\s*=>\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/gs;
    // Class method async pattern
    const classMethodPattern = /async\s+(\w+)\s*\([^)]*\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/gs;

    // Find all patterns
    let match;

    // Standard async functions
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

    // Class method async functions
    while ((match = classMethodPattern.exec(code)) !== null) {
      asyncFunctions.push({
        name: match[1],
        body: match[2],
        start: match.index,
        end: match.index + match[0].length,
        type: 'class',
      });
    }

    // If no async functions found, skip further analysis
    if (asyncFunctions.length === 0) return;

    totalAsyncFunctions += asyncFunctions.length;

    let fileHasParallelizable = false;
    let fileParallelizableCount = 0;

    // Analyze each function for parallelizable operations
    for (const fn of asyncFunctions) {
      // Look for consecutive await expressions using the same function call
      const awaitCalls = {};
      const awaitPattern = /await\s+([a-zA-Z0-9_.]+)\(([^)]*)\)/g;
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
          // Count this as a parallelization opportunity
          hasParallelizable = true;
          fileHasParallelizable = true;
          fileParallelizableCount++;
          totalParallelizableOpportunities++;

          // Get relative line number information
          const fnStartLine = code.substring(0, fn.start).split('\n').length;

          // Log opportunity details
          console.log(`\n  File: ${relativeFilePath}`);
          console.log(`  Function: ${fn.name} (line ~${fnStartLine})`);
          console.log(`  Parallelization opportunity: ${calls.length} calls to ${calledFn}()`);
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
    }

    // Update count if file had any parallelizable functions
    if (fileHasParallelizable) {
      totalParallelizableFunc += fileParallelizableCount;
    }
  } catch (error) {
    console.error(`Error analyzing file ${filePath}:`, error);
    totalErrors++;
  }
}

// Run the analysis
analyzePackages().catch((err) => {
  console.error('Analysis failed:', err);
  process.exit(1);
});
