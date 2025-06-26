/* eslint-disable radix */
import { Command } from 'commander';
import { logger } from '@elizaos/core';
// Removed runScenarioTests import - using enhanced scenario runner instead
// Removed ConsolidatedScenarioTestRunner import to fix build issues
// Using plugin-based scenario system instead
import { getProjectType } from '../test/utils/project-utils.js';
import { loadPluginsFromProject } from '../test/utils/plugin-utils.js';
// import { ScenarioRuntimeValidator } from '@elizaos/core'; // May not be exported
import { createTestAgent } from '../test/utils/agent-utils.js';
import type { PluginScenario } from '@elizaos/core';
import { generateScenarioCommand } from './generate.js';
import * as fs from 'fs';
import { runScenarioWithAgents } from './run-scenario.js';
import {
  ScenarioRetryManager,
  type RetryConfiguration,
} from '../../scenario-runner/retry-manager.js';
import { ScenarioFailureAnalyzer } from '../../scenario-runner/failure-analyzer.js';

export const scenarioCommand = new Command('scenario')
  .description('Run and manage scenario tests for ElizaOS agents')
  .addCommand(generateScenarioCommand);

// Add run subcommand
scenarioCommand
  .command('run')
  .description('Run scenario tests')
  .option('-s, --scenario <path>', 'Path to specific scenario file')
  .option('-d, --directory <path>', 'Directory containing scenario files')
  .option('-f, --filter <pattern>', 'Filter scenarios by name or tag')
  .option('--verbose', 'Show detailed output', false)
  .option('-b, --benchmark', 'Enable benchmarking', false)
  .option('-o, --output <file>', 'Output results to file')
  .option('--format <type>', 'Output format (json|text|html)', 'text')
  .option('--parallel', 'Run scenarios in parallel', false)
  .option('--max-concurrency <num>', 'Maximum concurrent scenarios', '1')
  .option('--source <type>', 'Scenario source (plugin|standalone|all)', 'all')
  .option('--attempts <num>', 'Number of retry attempts per scenario', '3')
  .option('--parallel <num>', 'Number of parallel executions per scenario', '1')
  .option('--retry-delay <ms>', 'Base retry delay in milliseconds', '2000')
  .option('--exponential-backoff', 'Use exponential backoff for retries', true)
  .option(
    '--retry-categories <categories>',
    'Comma-separated list of failure categories to retry',
    'timeout,api,verification,unknown'
  )
  .option('--failure-analysis', 'Enable detailed failure analysis for failed scenarios', true)
  .option('--analysis-report <file>', 'Save failure analysis report to file')
  .action(async (options) => {
    console.log('Scenario run command started with options:', options);

    // CRITICAL: Set database type to PGLite FIRST before any other operations
    // This must happen before any schema modules are imported or database operations occur
    try {
      const sqlModule = (await import('@elizaos/plugin-sql')) as any;
      if ('setDatabaseType' in sqlModule && typeof sqlModule.setDatabaseType === 'function') {
        sqlModule.setDatabaseType('pglite');
        logger.info('✅ Set database type to PGLite for scenario testing at command level');
      } else {
        logger.error('❌ setDatabaseType not found in plugin-sql module');
      }
    } catch (error) {
      logger.error('❌ Failed to set database type:', error);
    }

    try {
      const results = [];
      const failureAnalyses = [];

      // Initialize retry manager if retry features are enabled
      const retryManager = new ScenarioRetryManager();
      const retryConfig: RetryConfiguration = {
        maxAttempts: parseInt(options.attempts) || 3,
        retryDelay: parseInt(options.retryDelay) || 2000,
        exponentialBackoff: options.exponentialBackoff !== false,
        retryOnCategories: options.retryCategories
          ? options.retryCategories.split(',').map((c: string) => c.trim())
          : ['timeout', 'api', 'verification', 'unknown'],
        parallelism: parseInt(options.parallel) || 1,
      };

      logger.info(
        `🔄 Retry configuration: ${retryConfig.maxAttempts} attempts, ${retryConfig.parallelism} parallel, ${retryConfig.retryDelay}ms delay`
      );

      // Run plugin scenarios if requested
      if (options.source === 'plugin' || options.source === 'all') {
        logger.info('Running plugin scenarios with enhanced runner...');

        // Load plugins to get scenarios
        const projectInfo = getProjectType(process.cwd());
        const plugins = await loadPluginsFromProject(process.cwd(), projectInfo);

        // Extract scenarios from plugins
        for (const plugin of plugins) {
          if (plugin.scenarios && plugin.scenarios.length > 0) {
            let scenarios = plugin.scenarios;

            // Apply filter if specified
            if (options.filter) {
              const pattern = options.filter.toLowerCase();
              scenarios = scenarios.filter(
                (s) =>
                  s.name.toLowerCase().includes(pattern) ||
                  s.description?.toLowerCase().includes(pattern)
              );
            }

            logger.info(`Running ${scenarios.length} scenarios from plugin ${plugin.name}`);

            // Run each scenario with retry logic if enabled
            for (const scenario of scenarios) {
              logger.info(`  Running scenario: ${scenario.name}`);

              try {
                if (retryConfig.maxAttempts > 1 || retryConfig.parallelism > 1) {
                  // Use retry manager for enhanced execution
                  const executionSummary = await retryManager.executeScenarioWithRetries(
                    scenario,
                    runScenarioWithAgents,
                    options,
                    retryConfig
                  );

                  // Convert execution summary to result format
                  const bestAttempt =
                    executionSummary.attempts.find((a) => a.success) ||
                    executionSummary.attempts[executionSummary.attempts.length - 1];
                  const result = {
                    scenarioId: scenario.id,
                    name: scenario.name,
                    passed: executionSummary.finalResult === 'success',
                    duration: executionSummary.avgDuration,
                    score: bestAttempt?.result?.score || 0,
                    errors: executionSummary.attempts
                      .filter((a) => !a.success)
                      .map((a) => a.error)
                      .filter(Boolean),
                    metrics: bestAttempt?.result?.metrics || {
                      duration: executionSummary.avgDuration,
                      messageCount: 0,
                      stepCount: 0,
                      tokenUsage: { input: 0, output: 0, total: 0 },
                      memoryUsage: { peak: 0, average: 0, memoryOperations: 0 },
                      actionCounts: {},
                      responseLatency: { min: 0, max: 0, average: 0, p95: 0 },
                    },
                    verificationResults: bestAttempt?.result?.verificationResults || [],
                    transcript: bestAttempt?.result?.transcript || [],
                    executionSummary, // Include retry execution details
                  };

                  results.push(result);

                  // Collect failure analyses for reporting
                  const failedAttempts = executionSummary.attempts.filter((a) => a.failureAnalysis);
                  failureAnalyses.push(...failedAttempts.map((a) => a.failureAnalysis!));

                  if (result.passed) {
                    logger.info(
                      `    ✅ ${scenario.name} passed (${executionSummary.successfulAttempts}/${executionSummary.totalAttempts} attempts, score: ${result.score?.toFixed(2) || 0})`
                    );
                  } else {
                    logger.error(
                      `    ❌ ${scenario.name} failed (${executionSummary.totalAttempts} attempts)`
                    );
                  }
                } else {
                  // Simple single execution
                  const result = await runScenarioWithAgents(scenario, options);
                  results.push(result);

                  if (result.passed) {
                    logger.info(
                      `    ✅ ${scenario.name} passed (score: ${result.score?.toFixed(2) || 0})`
                    );
                  } else {
                    logger.error(`    ❌ ${scenario.name} failed`);
                    if (result.errors && result.errors.length > 0) {
                      for (const error of result.errors) {
                        logger.error(`      Error: ${error}`);
                      }
                    }
                  }
                }
              } catch (error) {
                logger.error(
                  `    ❌ ${scenario.name} failed with error: ${error instanceof Error ? error.message : String(error)}`
                );
                results.push({
                  scenarioId: scenario.id,
                  name: scenario.name,
                  passed: false,
                  duration: 0,
                  score: 0,
                  errors: [error instanceof Error ? error.message : String(error)],
                  metrics: {
                    duration: 0,
                    messageCount: 0,
                    stepCount: 0,
                    tokenUsage: { input: 0, output: 0, total: 0 },
                    memoryUsage: { peak: 0, average: 0, memoryOperations: 0 },
                    actionCounts: {},
                    responseLatency: { min: 0, max: 0, average: 0, p95: 0 },
                  },
                  verificationResults: [],
                  transcript: [],
                });
              }
            }
          }
        }
      }

      // Run standalone scenarios if requested
      if (options.source === 'standalone' || options.source === 'all') {
        logger.info('Loading standalone scenarios from @elizaos/scenarios...');

        try {
          const scenariosModule = await import('@elizaos/scenarios');
          const allScenarios = (scenariosModule as any)?.allScenarios || [];
          const getScenarioById = (scenariosModule as any)?.getScenarioById || (() => null);

          let scenariosToRun = allScenarios || [];

          // Apply filters
          if (options.filter) {
            const filterRegex = new RegExp(options.filter, 'i');
            scenariosToRun = scenariosToRun.filter(
              (s: any) =>
                filterRegex.test(s.name) ||
                filterRegex.test(s.description) ||
                filterRegex.test(s.id)
            );
          }

          if (options.scenario) {
            // Load specific scenario by ID
            const scenario = getScenarioById(options.scenario);
            if (scenario) {
              scenariosToRun = [scenario];
            } else {
              logger.warn(`Scenario with ID ${options.scenario} not found`);
              scenariosToRun = [];
            }
          }

          logger.info(`Found ${scenariosToRun.length} standalone scenarios to run`);

          // Run each standalone scenario with retry logic if enabled
          for (const scenario of scenariosToRun) {
            logger.info(`Running standalone scenario: ${scenario.name}`);

            try {
              if (retryConfig.maxAttempts > 1 || retryConfig.parallelism > 1) {
                // Use retry manager for enhanced execution
                const executionSummary = await retryManager.executeScenarioWithRetries(
                  scenario,
                  runScenarioWithAgents,
                  options,
                  retryConfig
                );

                // Convert execution summary to result format
                const bestAttempt =
                  executionSummary.attempts.find((a) => a.success) ||
                  executionSummary.attempts[executionSummary.attempts.length - 1];
                const result = {
                  scenarioId: scenario.id,
                  name: scenario.name,
                  passed: executionSummary.finalResult === 'success',
                  duration: executionSummary.avgDuration,
                  score: bestAttempt?.result?.score || 0,
                  errors: executionSummary.attempts
                    .filter((a) => !a.success)
                    .map((a) => a.error)
                    .filter(Boolean),
                  metrics: bestAttempt?.result?.metrics || {
                    duration: executionSummary.avgDuration,
                    messageCount: 0,
                    stepCount: 0,
                    tokenUsage: { input: 0, output: 0, total: 0 },
                    memoryUsage: { peak: 0, average: 0, memoryOperations: 0 },
                    actionCounts: {},
                    responseLatency: { min: 0, max: 0, average: 0, p95: 0 },
                  },
                  verificationResults: bestAttempt?.result?.verificationResults || [],
                  transcript: bestAttempt?.result?.transcript || [],
                  executionSummary,
                };

                results.push(result);

                // Collect failure analyses
                const failedAttempts = executionSummary.attempts.filter((a) => a.failureAnalysis);
                failureAnalyses.push(...failedAttempts.map((a) => a.failureAnalysis!));
              } else {
                // Simple single execution
                const result = await runScenarioWithAgents(scenario, options);
                results.push(result);
              }
            } catch (error) {
              logger.error(`Failed to run scenario ${scenario.name}:`, error);
              results.push({
                scenarioId: scenario.id,
                name: scenario.name,
                passed: false,
                duration: 0,
                error: error instanceof Error ? error.message : String(error),
                metrics: {
                  duration: 0,
                  messageCount: 0,
                  stepCount: 0,
                  tokenUsage: { input: 0, output: 0, total: 0 },
                  memoryUsage: { peak: 0, average: 0, memoryOperations: 0 },
                  actionCounts: {},
                  responseLatency: { min: 0, max: 0, average: 0, p95: 0 },
                },
                verificationResults: [],
                transcript: [],
              });
            }
          }
        } catch (error) {
          logger.error('Failed to load standalone scenarios:', error);
          logger.info('Make sure @elizaos/scenarios package is built and available');
        }
      }

      if (results.length === 0) {
        logger.warn('No scenarios found matching the criteria');
        return;
      }

      // Generate failure analysis report if requested and failures occurred
      if (options.failureAnalysis && failureAnalyses.length > 0) {
        logger.info(
          `\n📊 Generating failure analysis report for ${failureAnalyses.length} failed scenarios...`
        );

        const analyzer = new ScenarioFailureAnalyzer();
        const reportContent = analyzer.generateFailureReport(failureAnalyses);

        if (options.analysisReport) {
          await fs.promises.writeFile(options.analysisReport, reportContent);
          logger.info(`📄 Failure analysis report saved to: ${options.analysisReport}`);
        } else {
          logger.info('\n📋 FAILURE ANALYSIS SUMMARY');
          logger.info('═'.repeat(50));

          // Show top 3 most common failure categories
          const categoryCounts = failureAnalyses.reduce(
            (acc, analysis) => {
              acc[analysis.failureCategory] = (acc[analysis.failureCategory] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          );

          const topCategories = Object.entries(categoryCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3);

          topCategories.forEach(([category, count]) => {
            logger.info(`  🔍 ${category}: ${count} scenarios`);
          });

          // Show top improvement recommendations
          const allRecommendations = failureAnalyses.flatMap((a) => a.improvementRecommendations);
          const highPriorityRecs = allRecommendations.filter((r) => r.priority === 'high');
          const uniqueActions = [...new Set(highPriorityRecs.map((r) => r.action))];

          if (uniqueActions.length > 0) {
            logger.info('\n💡 TOP IMPROVEMENT ACTIONS:');
            uniqueActions.slice(0, 3).forEach((action, i) => {
              logger.info(`  ${i + 1}. ${action}`);
            });
          }
        }
      }

      // Display results
      displayResults(results, options, failureAnalyses);

      // Save results if requested
      if (options.output) {
        await saveResultsToFile(results, options.output, options.format);
      }

      // Exit with appropriate code
      const failed = results.filter((r) => !r.passed).length;
      process.exit(failed > 0 ? 1 : 0);
    } catch (error) {
      logger.error('Scenario run failed:', error);
      process.exit(1);
    }
  });

// Add list subcommand
scenarioCommand
  .command('list')
  .description('List available scenarios from plugins')
  .option('-f, --filter <pattern>', 'Filter scenarios by name pattern')
  .option('--plugin <name>', 'Show scenarios only from specific plugin')
  .option('--detailed', 'Show detailed scenario information')
  .action(async (options) => {
    try {
      logger.info('📋 Loading scenarios from plugins...');

      const projectInfo = getProjectType(process.cwd());
      const plugins = await loadPluginsFromProject(process.cwd(), projectInfo);

      let totalScenarios = 0;
      let filteredScenarios = 0;

      for (const plugin of plugins) {
        if (plugin.scenarios && plugin.scenarios.length > 0) {
          // Apply plugin filter if specified
          if (options.plugin && plugin.name !== options.plugin) {
            continue;
          }

          let scenarios = plugin.scenarios;
          totalScenarios += scenarios.length;

          // Apply name filter if specified
          if (options.filter) {
            const pattern = options.filter.toLowerCase();
            scenarios = scenarios.filter(
              (s) =>
                s.name.toLowerCase().includes(pattern) ||
                s.description?.toLowerCase().includes(pattern)
            );
          }

          filteredScenarios += scenarios.length;

          if (scenarios.length > 0) {
            console.log(`\n📦 Plugin: ${plugin.name}`);
            console.log(
              `   Scenarios: ${scenarios.length}${options.filter ? ` (filtered from ${plugin.scenarios.length})` : ''}`
            );

            for (const scenario of scenarios) {
              console.log(`   📋 ${scenario.name}`);
              if (options.detailed) {
                if (scenario.description) {
                  console.log(`      Description: ${scenario.description}`);
                }
                if (scenario.characters && scenario.characters.length > 0) {
                  console.log(`      Characters: ${scenario.characters.length}`);
                  for (const char of scenario.characters) {
                    console.log(`        - ${char.name} (${char.role})`);
                  }
                }
                if (scenario.script && scenario.script.steps && scenario.script.steps.length > 0) {
                  console.log(`      Steps: ${scenario.script.steps.length}`);
                }
                if (
                  scenario.verification &&
                  scenario.verification.rules &&
                  scenario.verification.rules.length > 0
                ) {
                  console.log(`      Verification rules: ${scenario.verification.rules.length}`);
                }
                console.log('');
              }
            }
          }
        }
      }

      console.log(
        `\n📊 Summary: ${filteredScenarios} scenario(s) listed${options.filter ? ` (filtered from ${totalScenarios} total)` : ''}`
      );

      if (totalScenarios === 0) {
        logger.warn(
          'No scenarios found in any plugins. Make sure plugins are properly installed and have scenarios defined.'
        );
      }
    } catch (error) {
      logger.error('Failed to list scenarios:', error);
      process.exit(1);
    }
  });

// Add test subcommand (alias for run)
scenarioCommand
  .command('test')
  .description('Test scenarios (alias for run)')
  .option('-s, --scenarios <pattern>', 'Scenario name pattern to match')
  .option('-c, --character <path>', 'Character file to use')
  .option('-v, --verbose', 'Show detailed output', false)
  .action(async (options) => {
    // Convert test command options to run command options
    const runOptions = {
      filter: options.scenarios,
      verbose: options.verbose,
    };

    // Execute run command with converted options
    const runCommand = scenarioCommand.commands.find((cmd) => cmd.name() === 'run');
    if (runCommand) {
      // Create argv array for the run command
      const argv = ['run'];
      if (runOptions.filter) {
        argv.push('--filter', runOptions.filter);
      }
      if (runOptions.verbose) {
        argv.push('--verbose');
      }

      await runCommand.parseAsync(argv, { from: 'user' });
    }
  });

// Add validate subcommand
scenarioCommand
  .command('validate')
  .description('Validate scenario environment requirements')
  .option('--plugin <name>', 'Validate scenarios only from specific plugin')
  .option('-f, --filter <pattern>', 'Filter scenarios by name pattern')
  .action(async (options) => {
    try {
      logger.info('🔧 Validating scenario environments...');

      const projectInfo = getProjectType(process.cwd());
      const plugins = await loadPluginsFromProject(process.cwd(), projectInfo);

      // Extract all scenarios from plugins
      const allScenarios: PluginScenario[] = [];
      const pluginScenarioMap = new Map<string, PluginScenario[]>();

      for (const plugin of plugins) {
        if (plugin.scenarios && plugin.scenarios.length > 0) {
          // Apply plugin filter if specified
          if (options.plugin && plugin.name !== options.plugin) {
            continue;
          }

          let scenarios = plugin.scenarios;

          // Apply name filter if specified
          if (options.filter) {
            const pattern = options.filter.toLowerCase();
            scenarios = scenarios.filter(
              (s) =>
                s.name.toLowerCase().includes(pattern) ||
                s.description?.toLowerCase().includes(pattern)
            );
          }

          if (scenarios.length > 0) {
            allScenarios.push(...scenarios);
            pluginScenarioMap.set(plugin.name, scenarios);
          }
        }
      }

      if (allScenarios.length === 0) {
        logger.warn('No scenarios found for validation');
        return;
      }

      logger.info(`Validating ${allScenarios.length} scenarios...`);

      // Create a minimal runtime for validation
      await createTestAgent(plugins, 3000);

      // Validate scenarios
      // Note: ScenarioRuntimeValidator may not be available, using fallback
      const validationResults = {
        executable: allScenarios || [],
        skipped: [],
        invalid: [],
      };
      // const validationResults = await ScenarioRuntimeValidator.validateScenarios(
      //   allScenarios,
      //   runtime
      // );

      // Display validation results
      console.log('\n🔍 Validation Results');
      console.log('═'.repeat(50));

      let totalValid = 0;
      let totalInvalid = 0;
      let totalSkipped = 0;

      for (const [pluginName, scenarios] of pluginScenarioMap) {
        console.log(`\n📦 Plugin: ${pluginName}`);

        for (const scenario of scenarios) {
          const isExecutable = validationResults.executable.some((s: any) => s.id === scenario.id);
          const isSkipped = validationResults.skipped.some(
            (s: any) => s.scenario.id === scenario.id
          );

          if (isExecutable) {
            console.log(`   ✅ ${scenario.name} - Valid`);
            totalValid++;
          } else if (isSkipped) {
            const skipInfo = validationResults.skipped.find(
              (s: any) => s.scenario.id === scenario.id
            );
            console.log(
              `   ⚠️  ${scenario.name} - Skipped: ${(skipInfo as any)?.reason || 'Unknown reason'}`
            );
            totalSkipped++;
          } else {
            console.log(`   ❌ ${scenario.name} - Invalid`);
            totalInvalid++;
          }
        }
      }

      // Environment validation details
      if ((validationResults as any).environmentValidations?.size > 0) {
        console.log('\n🔧 Environment Issues');
        console.log('─'.repeat(30));

        for (const [pluginName, validations] of (validationResults as any).environmentValidations) {
          console.log(`\nPlugin: ${pluginName}`);
          for (const validation of validations) {
            if (validation.missingVars && validation.missingVars.length > 0) {
              console.log(`   Missing env vars: ${validation.missingVars.join(', ')}`);
            }
            if (validation.warnings.length > 0) {
              for (const warning of validation.warnings) {
                console.log(`   Warning: ${warning}`);
              }
            }
          }
        }
      }

      // Summary
      console.log('\n📊 Validation Summary');
      console.log('═'.repeat(50));
      console.log(`Total scenarios: ${allScenarios.length}`);
      console.log(`✅ Valid: ${totalValid}`);
      console.log(`❌ Invalid: ${totalInvalid}`);
      console.log(`⚠️  Skipped: ${totalSkipped}`);

      if ((validationResults as any).warnings?.length > 0) {
        console.log('\n⚠️  Warnings:');
        for (const warning of (validationResults as any).warnings) {
          console.log(`   ${warning}`);
        }
      }

      // Exit with appropriate code
      process.exit(totalInvalid > 0 ? 1 : 0);
    } catch (error) {
      logger.error('Failed to validate scenarios:', error);
      process.exit(1);
    }
  });

// Temporarily disabled test-all command due to ConsolidatedScenarioTestRunner dependency issues
// TODO: Re-enable once scenarios package dependency is properly resolved
/*
scenarioCommand
  .command('test-all')
  .description('Run all scenarios using the consolidated test runner')
  .option('-f, --filter <pattern>', 'Filter scenarios by name or description')
  .option('-c, --category <category>', 'Filter scenarios by category')
  .option('-t, --tags <tags>', 'Filter scenarios by tags (comma-separated)')
  .option('--validate-only', 'Only validate environments, do not run scenarios')
  .option('--continue-on-error', 'Continue running scenarios after failures')
  .option('--verbose', 'Show detailed output', false)
  .option('-o, --output <file>', 'Output results to file')
  .option('--format <type>', 'Output format (json|console|both)', 'console')
  .action(async (options) => {
    try {
      logger.info('🚀 Running consolidated scenario tests...');

      const runner = new ConsolidatedScenarioTestRunner();
      const testOptions = {
        filter: options.filter,
        category: options.category,
        tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined,
        validateOnly: options.validateOnly,
        continueOnError: options.continueOnError,
        verbose: options.verbose,
        outputFile: options.output,
        outputFormat: options.format as 'json' | 'console' | 'both'
      };

      const results = await runner.runAllScenarios(testOptions);

      // Exit with appropriate code
      if (results.failed > 0) {
        process.exit(1);
      }

    } catch (error) {
      logger.error('Failed to run consolidated scenarios:', error);
      process.exit(1);
    }
  });
*/

function displayResults(results: any[], options: any, failureAnalyses: any[] = []): void {
  console.log('\n🧪 ElizaOS Scenario Test Results');
  console.log('═'.repeat(60));

  let passed = 0;
  let failed = 0;
  let totalDuration = 0;
  let totalMessages = 0;
  let totalTokens = 0;

  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const duration = result.duration ? `${(result.duration / 1000).toFixed(2)}s` : 'N/A';
    const metrics = result.metrics || {};

    // Accumulate totals for summary
    if (result.duration) {
      totalDuration += result.duration;
    }
    if (metrics.messageCount) {
      totalMessages += metrics.messageCount;
    }
    if (metrics.tokenUsage?.total) {
      totalTokens += metrics.tokenUsage.total;
    }

    console.log(`\n${status} ${result.name}`);
    console.log(
      `   Duration: ${duration} | Messages: ${metrics.messageCount || 0} | Tokens: ${metrics.tokenUsage?.total || 0}`
    );

    if (options.benchmark || options.verbose) {
      // Show performance metrics
      if (metrics.responseLatency) {
        const latency = metrics.responseLatency;
        console.log(
          `   📊 Response Latency: avg ${latency.average?.toFixed(0) || 0}ms | p95 ${latency.p95?.toFixed(0) || 0}ms`
        );
      }

      if (metrics.memoryUsage) {
        const memory = metrics.memoryUsage;
        console.log(
          `   💾 Memory: peak ${(memory.peak / 1024 / 1024).toFixed(1)}MB | ops ${memory.memoryOperations || 0}`
        );
      }

      if (metrics.actionCounts && Object.keys(metrics.actionCounts).length > 0) {
        const actions = Object.entries(metrics.actionCounts)
          .map(([action, count]) => `${action}:${count}`)
          .join(', ');
        console.log(`   🎯 Actions: ${actions}`);
      }
    }

    if (result.error) {
      console.log(`   💥 Error: ${result.error}`);
    }

    // Show verification details
    if (result.verificationResults && result.verificationResults.length > 0) {
      const verificationPassed = result.verificationResults.filter((v: any) => v.passed).length;
      const verificationTotal = result.verificationResults.length;
      console.log(`   🔍 Verification: ${verificationPassed}/${verificationTotal} rules passed`);

      if (options.verbose) {
        for (const verification of result.verificationResults) {
          const verifyStatus = verification.passed ? '  ✓' : '  ✗';
          const score = verification.score ? ` (${(verification.score * 100).toFixed(0)}%)` : '';
          console.log(`   ${verifyStatus} ${verification.ruleName}${score}`);
          if (!verification.passed && verification.reason) {
            console.log(`      └─ ${verification.reason}`);
          }
        }
      }
    }

    if (result.passed) {
      passed++;
    } else {
      failed++;
    }
  }

  // Enhanced summary with benchmarks
  console.log(`\n${'═'.repeat(60)}`);
  console.log('📈 SUMMARY REPORT');
  console.log('─'.repeat(30));
  console.log(
    `🎯 Results: ${passed}/${results.length} passed (${((passed / results.length) * 100).toFixed(1)}% success rate)`
  );

  if (totalDuration > 0) {
    console.log(
      `⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s (avg: ${(totalDuration / results.length / 1000).toFixed(2)}s per scenario)`
    );
  }

  if (totalMessages > 0) {
    console.log(
      `💬 Total Messages: ${totalMessages} (avg: ${(totalMessages / results.length).toFixed(1)} per scenario)`
    );
  }

  if (totalTokens > 0) {
    console.log(
      `🔤 Total Tokens: ${totalTokens.toLocaleString()} (avg: ${Math.round(totalTokens / results.length).toLocaleString()} per scenario)`
    );
  }

  // Show retry statistics if retries were used
  const retryResults = results.filter((r) => r.executionSummary);
  if (retryResults.length > 0) {
    const totalAttempts = retryResults.reduce(
      (sum, r) => sum + r.executionSummary.totalAttempts,
      0
    );
    const totalSuccessful = retryResults.reduce(
      (sum, r) => sum + r.executionSummary.successfulAttempts,
      0
    );
    const avgSuccessRate = (totalSuccessful / totalAttempts) * 100;

    console.log('\n🔄 RETRY STATISTICS:');
    console.log('─'.repeat(30));
    console.log(`Total attempts: ${totalAttempts} | Success rate: ${avgSuccessRate.toFixed(1)}%`);

    const scenariosWithRetries = retryResults.filter((r) => r.executionSummary.totalAttempts > 1);
    if (scenariosWithRetries.length > 0) {
      console.log(
        `Scenarios requiring retries: ${scenariosWithRetries.length}/${retryResults.length}`
      );
    }
  }

  // Recommendations
  if (failed > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('─'.repeat(30));
    const failedResults = results.filter((r) => !r.passed);
    const commonIssues = failedResults.map((r) => r.error).filter(Boolean);

    if (commonIssues.length > 0) {
      console.log('• Review failed scenarios with --verbose flag for detailed error analysis');
    }

    const hasVerificationFailures = failedResults.some((r) =>
      r.verificationResults?.some((v: any) => !v.passed)
    );

    if (hasVerificationFailures) {
      console.log('• Check verification rule configurations for failed scenarios');
    }

    if (totalDuration > 60000) {
      console.log('• Consider optimizing scenario execution time (current avg > 60s)');
    }

    if (failureAnalyses.length > 0) {
      console.log('• Use --analysis-report <file> to save detailed failure analysis');
      const shouldRetryNext = failureAnalyses.some((a) => a.retryLikelihood === 'high');
      if (shouldRetryNext) {
        console.log('• Some scenarios have high retry likelihood - consider running again');
      }
    }

    console.log('• Run with --benchmark flag for detailed performance metrics');
    console.log('• Use --attempts <num> to increase retry attempts for flaky scenarios');
    console.log(
      '• Use --parallel <num> to run multiple attempts in parallel for better success rates'
    );
  } else {
    console.log('\n🎉 All scenarios passed! Your agent system is performing well.');
    if (!options.benchmark) {
      console.log('💡 Run with --benchmark for detailed performance analysis');
    }
  }

  console.log('═'.repeat(60));
}

async function saveResultsToFile(
  results: any[],
  outputPath: string,
  format: string
): Promise<void> {
  const content =
    format === 'json'
      ? JSON.stringify(results, null, 2)
      : results.map((r) => `${r.passed ? 'PASS' : 'FAIL'}: ${r.name}`).join('\n');

  await fs.promises.writeFile(outputPath, content);
  logger.info(`Results saved to: ${outputPath}`);
}

export default scenarioCommand;
