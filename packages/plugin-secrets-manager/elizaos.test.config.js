/**
 * Special configuration for ElizaOS test mode
 * This tells the CLI to import from the test version which includes test suites
 */
export default {
  // Use the test version of the plugin for E2E testing
  importPath: './dist/index.js', // Test version with test suites
  
  // Test configuration
  testTimeout: 60000,
  
  // Plugin configuration
  plugin: {
    entry: './dist/index.js', // Use test version
    tests: true, // Enable test discovery
  }
};