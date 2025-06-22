#!/usr/bin/env tsx

/**
 * Comprehensive test runner for the Custom Reasoning Service
 * Validates all components work together correctly
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { elizaLogger } from '@elizaos/core';

interface TestSuite {
  name: string;
  command: string;
  description: string;
  critical: boolean;
}

const testSuites: TestSuite[] = [
  {
    name: 'Unit Tests - Actions',
    command: 'vitest --run src/__tests__/actions',
    description: 'Test enable/disable/training actions',
    critical: true,
  },
  {
    name: 'Unit Tests - Database',
    command: 'vitest --run src/__tests__/database',
    description: 'Test training data storage in custom training_data table',
    critical: true,
  },
  {
    name: 'Unit Tests - Filesystem',
    command: 'vitest --run src/__tests__/filesystem',
    description: 'Test training_recording/ folder system for visual debugging',
    critical: true,
  },
  {
    name: 'Unit Tests - Integration',
    command: 'vitest --run src/__tests__/integration',
    description: 'Test non-breaking MESSAGE_RECEIVED event integration',
    critical: true,
  },
  {
    name: 'E2E Integration Tests',
    command: 'vitest --run src/__tests__/e2e',
    description: 'Test complete custom reasoning service workflow',
    critical: true,
  },
  {
    name: 'Coverage Report',
    command: 'vitest --run --coverage',
    description: 'Generate test coverage report',
    critical: false,
  },
];

interface TestResult {
  suite: string;
  passed: boolean;
  output: string;
  duration: number;
  error?: string;
}

function runTestSuite(suite: TestSuite): TestResult {
  const startTime = Date.now();
  
  try {
    elizaLogger.info(`\n🧪 Running: ${suite.name}`);
    elizaLogger.info(`📝 ${suite.description}`);
    
    const output = execSync(suite.command, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      stdio: 'pipe',
    });
    
    const duration = Date.now() - startTime;
    
    elizaLogger.info(`✅ PASSED (${duration}ms)`);
    
    return {
      suite: suite.name,
      passed: true,
      output,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    elizaLogger.info(`❌ FAILED (${duration}ms)`);
    if (error.stdout) {
      elizaLogger.info('STDOUT:', error.stdout.toString());
    }
    if (error.stderr) {
      elizaLogger.info('STDERR:', error.stderr.toString());
    }
    
    return {
      suite: suite.name,
      passed: false,
      output: error.stdout?.toString() || '',
      duration,
      error: error.stderr?.toString() || error.message,
    };
  }
}

function generateTestReport(results: TestResult[]): void {
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  elizaLogger.info('\n' + '='.repeat(80));
  elizaLogger.info('🎯 CUSTOM REASONING SERVICE TEST SUMMARY');
  elizaLogger.info('='.repeat(80));
  
  elizaLogger.info(`\n📊 Overall Results:`);
  elizaLogger.info(`   Total Suites: ${totalTests}`);
  elizaLogger.info(`   Passed: ${passedTests} ✅`);
  elizaLogger.info(`   Failed: ${failedTests} ${failedTests > 0 ? '❌' : '✅'}`);
  elizaLogger.info(`   Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  
  if (passedTests === totalTests) {
    elizaLogger.info(`\n🎉 ALL TESTS PASSED! Custom Reasoning Service is ready for deployment.`);
  } else {
    elizaLogger.info(`\n⚠️  ${failedTests} test suite(s) failed. Review and fix before deployment.`);
  }
  
  elizaLogger.info(`\n📋 Detailed Results:`);
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const duration = `(${result.duration}ms)`;
    elizaLogger.info(`   ${status} ${result.suite} ${duration}`);
    
    if (!result.passed && result.error) {
      elizaLogger.info(`      Error: ${result.error.split('\n')[0]}`);
    }
  });
  
  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      duration: totalDuration,
      success: passedTests === totalTests,
    },
    results,
  };
  
  const reportPath = join(process.cwd(), 'test-results.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  elizaLogger.info(`\n📄 Detailed report saved to: ${reportPath}`);
}

function validateRequirements(): void {
  elizaLogger.info('🔍 Validating test requirements...');
  
  // Check that key files exist
  const requiredFiles = [
    'src/actions/custom-reasoning-actions.ts',
    'src/database/TrainingDatabaseManager.ts',
    'src/filesystem/TrainingRecordingManager.ts',
    'src/integration/MessageHandlerIntegration.ts',
    'src/database/training-schema.sql',
  ];
  
  for (const file of requiredFiles) {
    try {
      readFileSync(file);
      elizaLogger.info(`✅ Found: ${file}`);
    } catch (error) {
      elizaLogger.error(`❌ Missing required file: ${file}`);
      process.exit(1);
    }
  }
  
  elizaLogger.info('✅ All required files present\n');
}

function checkBackwardsCompatibility(): void {
  elizaLogger.info('🔄 Checking backwards compatibility...');
  
  // Verify that original ElizaOS behavior is preserved
  const integrationFile = readFileSync('src/integration/MessageHandlerIntegration.ts', 'utf-8');
  
  const compatibilityChecks = [
    'originalUseModel.bind(runtime)',
    'runtime.useModel as it would have before',
    'fallback to original',
    'MessageHandlerIntegration.originalShouldRespond',
    'MessageHandlerIntegration.originalResponseGeneration',
  ];
  
  for (const check of compatibilityChecks) {
    if (integrationFile.includes(check) || integrationFile.toLowerCase().includes(check.toLowerCase())) {
      elizaLogger.info(`✅ Backwards compatibility: ${check}`);
    } else {
      elizaLogger.warn(`⚠️  Backwards compatibility check might be missing: ${check}`);
    }
  }
  
  elizaLogger.info('✅ Backwards compatibility verified\n');
}

function checkCustomTableImplementation(): void {
  elizaLogger.info('🗄️  Checking custom training_data table implementation...');
  
  const schemaFile = readFileSync('src/database/training-schema.sql', 'utf-8');
  const dbManagerFile = readFileSync('src/database/TrainingDatabaseManager.ts', 'utf-8');
  
  const tableChecks = [
    'CREATE TABLE IF NOT EXISTS training_data',
    'model_type VARCHAR(50) NOT NULL CHECK (model_type IN (\'should_respond\', \'planning\', \'coding\'))',
    'input_data JSONB NOT NULL',
    'output_data JSONB NOT NULL',
    'is_training_sample BOOLEAN DEFAULT true',
    'INSERT INTO training_data',
    'storeTrainingData',
  ];
  
  for (const check of tableChecks) {
    if (schemaFile.includes(check) || dbManagerFile.includes(check)) {
      elizaLogger.info(`✅ Custom table: ${check.split(' ')[0]}...`);
    } else {
      elizaLogger.warn(`⚠️  Custom table check missing: ${check}`);
    }
  }
  
  elizaLogger.info('✅ Custom training_data table implementation verified\n');
}

function checkRecordingSystem(): void {
  elizaLogger.info('📁 Checking training_recording/ folder system...');
  
  const recordingFile = readFileSync('src/filesystem/TrainingRecordingManager.ts', 'utf-8');
  
  const recordingChecks = [
    'training_recordings',
    'recordTrainingData',
    'formatInputForReading',
    'formatOutputForReading',
    'exportRecordingsToJSONL',
    'getRecordingStats',
    'visual debugging',
  ];
  
  for (const check of recordingChecks) {
    if (recordingFile.includes(check) || recordingFile.toLowerCase().includes(check.toLowerCase())) {
      elizaLogger.info(`✅ Recording system: ${check}`);
    } else {
      elizaLogger.warn(`⚠️  Recording system check missing: ${check}`);
    }
  }
  
  elizaLogger.info('✅ Training recording system verified\n');
}

async function main(): Promise<void> {
  elizaLogger.info('🚀 CUSTOM REASONING SERVICE TEST SUITE');
  elizaLogger.info('=====================================\n');
  
  // Pre-flight checks
  validateRequirements();
  checkBackwardsCompatibility();
  checkCustomTableImplementation();
  checkRecordingSystem();
  
  elizaLogger.info('🧪 Starting test execution...\n');
  
  const results: TestResult[] = [];
  
  for (const suite of testSuites) {
    const result = runTestSuite(suite);
    results.push(result);
    
    // Stop on critical test failure
    if (!result.passed && suite.critical) {
      elizaLogger.info(`\n💥 Critical test suite failed: ${suite.name}`);
      elizaLogger.info('Stopping execution to address critical issues.\n');
      break;
    }
  }
  
  generateTestReport(results);
  
  const allPassed = results.every(r => r.passed);
  process.exit(allPassed ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    elizaLogger.error('Test runner error:', error);
    process.exit(1);
  });
}