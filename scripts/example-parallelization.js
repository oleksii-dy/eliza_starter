/**
 * Example Implementation: Parallelizing Async Operations
 *
 * This file demonstrates how to implement one of the parallelization opportunities
 * identified in the codebase analysis.
 */

/**
 * Original implementation from packages/cli/scripts/copy-templates.js
 */
async function copyTemplatesOriginal() {
  console.log('Copying templates...');

  // These operations run sequentially
  console.time('sequential');

  // First operation
  await copyDir(projectStarterSrc, projectStarterDest);

  // Second operation
  await copyDir(pluginStarterSrc, pluginStarterDest);

  console.timeEnd('sequential');
  console.log('Templates copied successfully');
}

/**
 * Optimized implementation using Promise.all()
 */
async function copyTemplatesOptimized() {
  console.log('Copying templates in parallel...');

  // These operations run in parallel
  console.time('parallel');

  // Run both operations concurrently
  const [projectCopyResult, pluginCopyResult] = await Promise.all([
    copyDir(projectStarterSrc, projectStarterDest),
    copyDir(pluginStarterSrc, pluginStarterDest),
  ]);

  console.timeEnd('parallel');
  console.log('Templates copied successfully in parallel');
}

/**
 * Example of error handling with Promise.all()
 * Note: Promise.all() fails fast if any promise rejects
 */
async function copyTemplatesWithErrorHandling() {
  console.log('Copying templates with error handling...');

  try {
    const [projectCopyResult, pluginCopyResult] = await Promise.all([
      copyDir(projectStarterSrc, projectStarterDest),
      copyDir(pluginStarterSrc, pluginStarterDest),
    ]);

    console.log('All templates copied successfully');
  } catch (error) {
    console.error('Error during parallel copy operations:', error);

    // Fallback to sequential operations if parallel fails
    console.log('Falling back to sequential operations...');

    try {
      await copyDir(projectStarterSrc, projectStarterDest);
      await copyDir(pluginStarterSrc, pluginStarterDest);
      console.log('Templates copied successfully using sequential fallback');
    } catch (fallbackError) {
      console.error('Sequential fallback also failed:', fallbackError);
    }
  }
}

/**
 * Alternative using Promise.allSettled() which waits for all promises
 * to complete, regardless of whether they are fulfilled or rejected
 */
async function copyTemplatesWithAllSettled() {
  console.log('Copying templates with Promise.allSettled()...');

  const results = await Promise.allSettled([
    copyDir(projectStarterSrc, projectStarterDest),
    copyDir(pluginStarterSrc, pluginStarterDest),
  ]);

  // Process the results individually
  results.forEach((result, index) => {
    const operation = index === 0 ? 'Project template' : 'Plugin template';

    if (result.status === 'fulfilled') {
      console.log(`${operation} copied successfully`);
    } else {
      console.error(`${operation} copy failed:`, result.reason);
    }
  });
}

/**
 * Mock implementation of copyDir function for this example
 */
async function copyDir(src, dest) {
  console.log(`Copying from ${src} to ${dest}`);
  // Simulate async file operation
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { source: src, destination: dest };
}

// Mock paths for the example
const projectStarterSrc = './project-starter-src';
const projectStarterDest = './project-starter-dest';
const pluginStarterSrc = './plugin-starter-src';
const pluginStarterDest = './plugin-starter-dest';

/**
 * Performance comparison
 */
async function comparePerformance() {
  console.log('\n=== Performance Comparison ===\n');

  console.log('Running sequential implementation:');
  await copyTemplatesOriginal();

  console.log('\nRunning parallel implementation:');
  await copyTemplatesOptimized();

  console.log('\n=== Comparison Complete ===');
  console.log('Notice how the parallel implementation completes both operations');
  console.log('in roughly the same time as a single operation in the sequential implementation.');
}

// Uncomment one of these to run the desired example:
// comparePerformance();
// copyTemplatesWithErrorHandling();
// copyTemplatesWithAllSettled();
