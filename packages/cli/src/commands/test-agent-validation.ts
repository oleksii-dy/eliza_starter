#!/usr/bin/env node

/**
 * Command-line tool to run comprehensive agent validation tests
 * Ensures agents pass 100% of scenario tests with no cheating
 */

import { logger } from '@elizaos/core';
import {
  runComprehensiveValidationTest,
  runQuickValidationCheck,
  generateValidationReport,
  type ComprehensiveTestResult,
} from '../scenario-runner/comprehensive-validation-test.js';

interface ValidationOptions {
  mode: 'quick' | 'full';
  verbose: boolean;
  timeout?: number;
  outputFile?: string;
}

async function main() {
  const args = process.argv.slice(2);

  const options: ValidationOptions = {
    mode: 'full',
    verbose: false,
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--quick':
        options.mode = 'quick';
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--timeout':
        if (i + 1 < args.length) {
          options.timeout = parseInt(args[++i], 10);
        }
        break;
      case '--output':
      case '-o':
        if (i + 1 < args.length) {
          options.outputFile = args[++i];
        }
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }

  logger.info('🧪 ElizaOS Agent Validation Test Suite');
  logger.info('=====================================');
  logger.info(`Mode: ${options.mode}`);
  logger.info(`Verbose: ${options.verbose}`);
  if (options.timeout) {
    logger.info(`Timeout: ${options.timeout}ms`);
  }
  logger.info('');

  try {
    let success = false;
    let results: ComprehensiveTestResult | null = null;

    if (options.mode === 'quick') {
      logger.info('🚀 Running quick validation check...');
      success = await runQuickValidationCheck();

      if (success) {
        logger.info('✅ Quick validation check PASSED');
        logger.info('The agent validation system appears to be working correctly.');
      } else {
        logger.error('❌ Quick validation check FAILED');
        logger.error('There may be issues with the agent validation system.');
      }
    } else {
      logger.info('🚀 Running comprehensive validation test suite...');
      results = await runComprehensiveValidationTest({
        verbose: options.verbose,
        timeout: options.timeout || 30000,
      });

      success = results.summary.allTestsPassed;

      // Display results summary
      logger.info('');
      logger.info('📊 VALIDATION RESULTS SUMMARY');
      logger.info('==============================');
      logger.info(`Scenarios Passed: ${results.scenariosPassed}/${results.scenariosTotal}`);
      logger.info(
        `Success Rate: ${Math.round((results.scenariosPassed / results.scenariosTotal) * 100)}%`
      );
      logger.info(`Average Score: ${results.averageScore.toFixed(3)}`);
      logger.info(`All Tests Passed: ${success ? '✅ YES' : '❌ NO'}`);
      logger.info('');

      logger.info('📋 VERIFICATION TEST COVERAGE');
      logger.info('===============================');
      logger.info(`LLM Verification Tests: ${results.summary.llmVerificationTests}`);
      logger.info(`Response Quality Tests: ${results.summary.responseQualityTests}`);
      logger.info(`Message Processing Tests: ${results.summary.messageProcessingTests}`);
      logger.info(`Response Count Tests: ${results.summary.responseCountTests}`);
      logger.info('');

      // Display detailed results if verbose
      if (options.verbose) {
        logger.info('📝 DETAILED RESULTS');
        logger.info('===================');
        for (const result of results.detailedResults) {
          logger.info(
            `\n${result.scenarioName}: ${result.passed ? '✅ PASSED' : '❌ FAILED'} (score: ${result.score.toFixed(3)})`
          );

          for (const detail of result.verificationDetails) {
            const status = detail.passed ? '✅' : '❌';
            logger.info(
              `  ${status} ${detail.ruleType}: ${detail.reason} (score: ${detail.score.toFixed(3)})`
            );
          }
        }
        logger.info('');
      }

      // Generate and save report if requested
      if (options.outputFile && results) {
        logger.info(`📄 Generating validation report: ${options.outputFile}`);
        const report = generateValidationReport(results);

        try {
          const fs = await import('fs/promises');
          await fs.writeFile(options.outputFile, report, 'utf8');
          logger.info(`✅ Report saved to: ${options.outputFile}`);
        } catch (error) {
          logger.error(`❌ Failed to save report: ${error}`);
        }
      }
    }

    // Final status
    logger.info('');
    if (success) {
      logger.info('🎉 VALIDATION TEST SUITE: ✅ SUCCESS');
      logger.info('All agents are performing correctly with real verification!');
      process.exit(0);
    } else {
      logger.error('💥 VALIDATION TEST SUITE: ❌ FAILURE');
      logger.error('Some agents are not meeting the validation criteria.');
      logger.error('Please review the results and fix any issues before production deployment.');
      process.exit(1);
    }
  } catch (error) {
    logger.error('💥 VALIDATION TEST SUITE: ❌ CRITICAL ERROR');
    logger.error('Failed to run validation tests:', error);
    logger.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
ElizaOS Agent Validation Test Suite

USAGE:
  node test-agent-validation.js [OPTIONS]

OPTIONS:
  --quick               Run quick validation check only
  --verbose, -v         Enable verbose output with detailed results
  --timeout <ms>        Set timeout for each scenario (default: 30000)
  --output, -o <file>   Save detailed report to file
  --help, -h            Show this help message

EXAMPLES:
  # Run quick validation check
  node test-agent-validation.js --quick

  # Run full validation suite with verbose output
  node test-agent-validation.js --verbose

  # Run full validation and save report
  node test-agent-validation.js --output validation-report.md

  # Run with custom timeout
  node test-agent-validation.js --timeout 60000

DESCRIPTION:
  This tool runs comprehensive validation tests to ensure agents are
  passing 100% of scenario tests with legitimate behavior (no cheating).
  
  The validation system uses real LLM verification to check agent responses
  and behavior against expected criteria, ensuring production readiness.

EXIT CODES:
  0 - All validation tests passed
  1 - Some validation tests failed or critical error occurred
`);
}

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Unhandled error in validation test suite:', error);
    process.exit(1);
  });
}
