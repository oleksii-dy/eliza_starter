#!/usr/bin/env node
import { loadProject } from '../packages/cli/src/project.js';
import { loadProjectLoggerConfig } from '../packages/cli/src/utils/logger-config.js';
import { initializeLogger, isLoggerCustomInitialized } from '../packages/core/src/logger.js';

async function testLoggerConfiguration() {
  console.log('Testing logger configuration loading...');
  
  try {
    // Test loading logger config from package.json
    console.log('\n1. Testing logger config from package.json...');
    const packageLoggerConfig = await loadProjectLoggerConfig('./test-logger-config');
    console.log('Package.json logger config:', packageLoggerConfig);
    
    // Test loading project with logger config
    console.log('\n2. Testing project loading with logger config...');
    const project = await loadProject('./test-logger-config');
    console.log('Project logger config:', project.logger);
    
    // Test initializing logger
    console.log('\n3. Testing logger initialization...');
    console.log('Logger initialized before:', isLoggerCustomInitialized());
    
    if (project.logger?.logger) {
      initializeLogger(project.logger.logger);
      console.log('Logger initialized after:', isLoggerCustomInitialized());
    }
    
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testLoggerConfiguration();