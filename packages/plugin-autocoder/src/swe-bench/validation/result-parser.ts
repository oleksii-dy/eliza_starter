import { elizaLogger } from '@elizaos/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { TestResults, TestFailure } from '../types';
import { DEFAULT_VALIDATION_CONFIG, type ValidationConfig } from '../config/validation-config';

/**
 * Enhanced test result parsing metadata
 */
interface ParsedResult {
  results: TestResults;
  confidence: number;
  parseMethod: 'json' | 'text' | 'hybrid' | 'fallback';
  framework: string;
  warnings: string[];
  rawData?: any;
}

/**
 * Framework-specific result format definitions
 */
interface FrameworkParser {
  name: string;
  jsonFormat: string;
  textPatterns: RegExp[];
  metadataExtractors: Array<(data: any) => Record<string, any>>;
  failureExtractor: (data: any) => TestFailure[];
}

/**
 * Parsing diagnostics and confidence metrics
 */
interface ParsingDiagnostics {
  totalAttempts: number;
  successfulParsing: boolean;
  confidence: number;
  method: string;
  dataQuality: 'high' | 'medium' | 'low' | 'corrupt';
  frameworks: string[];
  warnings: string[];
  errors: string[];
  executionTime: number;
}

/**
 * Enhanced result parser with comprehensive framework support and robust parsing
 */
export class ResultParser {
  private config: ValidationConfig;
  private frameworkParsers: Map<string, FrameworkParser>;

  constructor(config: ValidationConfig = DEFAULT_VALIDATION_CONFIG) {
    this.config = config;
    this.frameworkParsers = new Map();
    this.initializeFrameworkParsers();
  }

  /**
   * Parse test results with enhanced reliability and comprehensive diagnostics
   */
  async parseResults(
    repoPath: string,
    resultFile?: string,
    stdout?: string,
    stderr?: string,
    framework?: string
  ): Promise<ParsedResult> {
    const startTime = Date.now();
    elizaLogger.info('[RESULT-PARSER] Starting enhanced result parsing');

    try {
      const diagnostics: ParsingDiagnostics = {
        totalAttempts: 0,
        successfulParsing: false,
        confidence: 0,
        method: 'unknown',
        dataQuality: 'low',
        frameworks: [],
        warnings: [],
        errors: [],
        executionTime: 0,
      };

      // Attempt JSON parsing first if result file provided
      if (resultFile && framework) {
        const jsonResult = await this.parseJsonResults(
          repoPath,
          resultFile,
          framework,
          diagnostics
        );
        if (jsonResult.confidence > 0.8) {
          diagnostics.executionTime = Date.now() - startTime;
          return this.finalizeResult(jsonResult, diagnostics);
        }
      }

      // Attempt text parsing
      if (stdout || stderr) {
        const textResult = await this.parseTextResults(
          stdout || '',
          stderr || '',
          framework,
          diagnostics
        );
        if (textResult.confidence > 0.6) {
          diagnostics.executionTime = Date.now() - startTime;
          return this.finalizeResult(textResult, diagnostics);
        }
      }

      // Hybrid parsing attempt
      const hybridResult = await this.attemptHybridParsing(
        repoPath,
        resultFile,
        stdout,
        stderr,
        diagnostics
      );
      if (hybridResult.confidence > 0.4) {
        diagnostics.executionTime = Date.now() - startTime;
        return this.finalizeResult(hybridResult, diagnostics);
      }

      // Fallback parsing
      elizaLogger.warn('[RESULT-PARSER] Using fallback parsing - low confidence results');
      const fallbackResult = this.createFallbackResult(stdout, stderr, diagnostics);
      diagnostics.executionTime = Date.now() - startTime;
      return this.finalizeResult(fallbackResult, diagnostics);
    } catch (error) {
      elizaLogger.error('[RESULT-PARSER] Result parsing failed:', error);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown parsing error'
      );
    }
  }

  /**
   * Parse JSON results with framework-specific handling
   */
  private async parseJsonResults(
    repoPath: string,
    resultFile: string,
    framework: string,
    diagnostics: ParsingDiagnostics
  ): Promise<ParsedResult> {
    diagnostics.totalAttempts++;

    try {
      const resultsPath = path.join(repoPath, resultFile);
      const fileExists = await fs
        .access(resultsPath)
        .then(() => true)
        .catch(() => false);

      if (!fileExists) {
        diagnostics.warnings.push(`Result file not found: ${resultsPath}`);
        return {
          results: this.createEmptyResults(),
          confidence: 0,
          parseMethod: 'json',
          framework,
          warnings: diagnostics.warnings,
        };
      }

      const resultsData = await fs.readFile(resultsPath, 'utf-8');
      if (!resultsData.trim()) {
        diagnostics.warnings.push('Empty result file');
        return {
          results: this.createEmptyResults(),
          confidence: 0,
          parseMethod: 'json',
          framework,
          warnings: diagnostics.warnings,
        };
      }

      // Attempt to parse JSON with error recovery
      let jsonResults: any;
      try {
        jsonResults = JSON.parse(resultsData);
      } catch (parseError) {
        // Attempt JSON repair for common malformations
        const repairedJson = this.repairMalformedJson(resultsData);
        if (repairedJson) {
          try {
            jsonResults = JSON.parse(repairedJson);
            diagnostics.warnings.push('JSON was malformed but repaired');
          } catch {
            const errorMsg =
              parseError instanceof Error ? parseError.message : 'JSON parsing failed';
            diagnostics.errors.push(`JSON parsing failed: ${errorMsg}`);
            return {
              results: this.createEmptyResults(),
              confidence: 0,
              parseMethod: 'json',
              framework,
              warnings: diagnostics.warnings,
            };
          }
        } else {
          const errorMsg = parseError instanceof Error ? parseError.message : 'JSON parsing failed';
          diagnostics.errors.push(`JSON parsing failed: ${errorMsg}`);
          return {
            results: this.createEmptyResults(),
            confidence: 0,
            parseMethod: 'json',
            framework,
            warnings: diagnostics.warnings,
          };
        }
      }

      // Parse using framework-specific parser
      const parser = this.frameworkParsers.get(framework);
      if (parser) {
        const results = this.parseWithFrameworkParser(parser, jsonResults, diagnostics);
        const confidence = this.calculateJsonConfidence(results, jsonResults, framework);

        // Clean up results file
        await fs.unlink(resultsPath).catch(() => {});

        return {
          results: this.enhanceResultsWithMetadata(results, framework),
          confidence,
          parseMethod: 'json',
          framework,
          warnings: diagnostics.warnings,
          rawData: this.config.parsing.preserveOutput ? jsonResults : undefined,
        };
      } else {
        // Generic JSON parsing
        const results = this.parseGenericJson(jsonResults, framework);
        const confidence = this.calculateJsonConfidence(results, jsonResults, framework);

        await fs.unlink(resultsPath).catch(() => {});

        return {
          results: this.enhanceResultsWithMetadata(results, framework),
          confidence,
          parseMethod: 'json',
          framework,
          warnings: diagnostics.warnings,
          rawData: this.config.parsing.preserveOutput ? jsonResults : undefined,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'JSON parsing error';
      diagnostics.errors.push(`JSON parsing error: ${errorMsg}`);
      return {
        results: this.createEmptyResults(),
        confidence: 0,
        parseMethod: 'json',
        framework,
        warnings: diagnostics.warnings,
      };
    }
  }

  /**
   * Parse text results with enhanced pattern matching
   */
  private async parseTextResults(
    stdout: string,
    stderr: string,
    framework: string | undefined,
    diagnostics: ParsingDiagnostics
  ): Promise<ParsedResult> {
    diagnostics.totalAttempts++;

    const combinedOutput = `${stdout}\n${stderr}`;
    const detectedFramework = framework || this.detectFrameworkFromOutput(combinedOutput);
    diagnostics.frameworks.push(detectedFramework);

    const results = this.createEmptyResults();
    results.frameworkDetected = detectedFramework;

    // Enhanced pattern matching with framework-specific patterns
    const patterns = this.getFrameworkPatterns(detectedFramework);
    let matchFound = false;

    // Parse test counts
    const testCountResult = this.parseTestCounts(combinedOutput, patterns);
    if (testCountResult.found) {
      Object.assign(results, testCountResult.data);
      matchFound = true;
    }

    // Parse failures with stack traces
    const failuresResult = this.parseFailureDetails(combinedOutput, detectedFramework);
    if (failuresResult.length > 0) {
      results.failures = failuresResult;
      matchFound = true;
    }

    // Parse execution metadata
    const metadataResult = this.parseExecutionMetadata(combinedOutput);
    if (metadataResult.duration) {
      results.duration = metadataResult.duration;
    }

    // Calculate confidence based on parsing success
    const confidence = this.calculateTextConfidence(results, combinedOutput, matchFound);

    // Detect edge cases
    this.detectEdgeCases(combinedOutput, results, diagnostics);

    return {
      results: this.enhanceResultsWithMetadata(results, detectedFramework),
      confidence,
      parseMethod: 'text',
      framework: detectedFramework,
      warnings: diagnostics.warnings,
      rawData: this.config.parsing.preserveOutput ? { stdout, stderr } : undefined,
    };
  }

  /**
   * Attempt hybrid parsing combining JSON and text analysis
   */
  private async attemptHybridParsing(
    repoPath: string,
    resultFile?: string,
    stdout?: string,
    stderr?: string,
    diagnostics?: ParsingDiagnostics
  ): Promise<ParsedResult> {
    diagnostics!.totalAttempts++;

    try {
      // Try to extract partial JSON from text output
      const combinedOutput = `${stdout || ''}\n${stderr || ''}`;
      const extractedJson = this.extractJsonFromText(combinedOutput);

      if (extractedJson) {
        const framework = this.detectFrameworkFromOutput(combinedOutput);
        const results = this.parseGenericJson(extractedJson, framework);
        const confidence = this.calculateJsonConfidence(results, extractedJson, framework) * 0.8; // Reduce confidence for hybrid

        return {
          results: this.enhanceResultsWithMetadata(results, framework),
          confidence,
          parseMethod: 'hybrid',
          framework,
          warnings: diagnostics!.warnings,
        };
      }

      // Try parsing structured text output
      const structuredResult = this.parseStructuredText(combinedOutput);
      if (structuredResult.confidence > 0.6) {
        return {
          results: structuredResult.results,
          confidence: structuredResult.confidence * 0.9,
          parseMethod: 'hybrid',
          framework: structuredResult.framework,
          warnings: diagnostics!.warnings,
        };
      }

      return {
        results: this.createEmptyResults(),
        confidence: 0,
        parseMethod: 'hybrid',
        framework: 'unknown',
        warnings: diagnostics!.warnings,
      };
    } catch (error) {
      diagnostics!.errors.push(
        `Hybrid parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return {
        results: this.createEmptyResults(),
        confidence: 0,
        parseMethod: 'hybrid',
        framework: 'unknown',
        warnings: diagnostics!.warnings,
      };
    }
  }

  /**
   * Initialize framework-specific parsers
   */
  private initializeFrameworkParsers(): void {
    // Jest parser
    this.frameworkParsers.set('jest', {
      name: 'jest',
      jsonFormat: 'jest',
      textPatterns: [
        /Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed/i,
        /(\d+)\s+passing/i,
        /(\d+)\s+failing/i,
      ],
      metadataExtractors: [
        (data) => ({
          coverageThreshold: data.coverageMap?.total?.functions?.pct,
          snapshotSummary: data.snapshot,
        }),
      ],
      failureExtractor: (data) => {
        const failures: TestFailure[] = [];
        if (data.testResults) {
          for (const testFile of data.testResults) {
            if (testFile.assertionResults) {
              for (const assertion of testFile.assertionResults) {
                if (assertion.status === 'failed') {
                  failures.push({
                    test_name: assertion.fullName || assertion.title || 'Unknown test',
                    error_message: assertion.failureMessages?.join('\n') || 'Test failed',
                    stack_trace: assertion.failureDetails?.map((d) => d.stack).join('\n'),
                  });
                }
              }
            }
          }
        }
        return failures;
      },
    });

    // Mocha parser
    this.frameworkParsers.set('mocha', {
      name: 'mocha',
      jsonFormat: 'mocha',
      textPatterns: [/(\d+)\s+passing/i, /(\d+)\s+failing/i, /(\d+)\s+pending/i],
      metadataExtractors: [
        (data) => ({
          duration: data.stats?.duration,
          suites: data.stats?.suites,
        }),
      ],
      failureExtractor: (data) => {
        const failures: TestFailure[] = [];
        if (data.failures && Array.isArray(data.failures)) {
          for (const failure of data.failures) {
            failures.push({
              test_name: failure.fullTitle || failure.title || 'Unknown test',
              error_message: failure.err?.message || 'Test failed',
              stack_trace: failure.err?.stack,
            });
          }
        }
        return failures;
      },
    });

    // Bun test parser
    this.frameworkParsers.set('bun:test', {
      name: 'bun:test',
      jsonFormat: 'bun:test',
      textPatterns: [/✓\s+(\d+)\s+passed/i, /✗\s+(\d+)\s+failed/i, /Test Files\s+(\d+)\s+passed/i],
      metadataExtractors: [
        (data) => ({
          coverage: data.coverage,
          browser: data.config?.browser,
        }),
      ],
      failureExtractor: (data) => {
        const failures: TestFailure[] = [];
        if (data.testResults) {
          for (const testResult of data.testResults) {
            if (testResult.status === 'failed' && testResult.errors) {
              for (const error of testResult.errors) {
                failures.push({
                  test_name: testResult.name || 'Unknown test',
                  error_message: error.message || 'Test failed',
                  stack_trace: error.stack,
                });
              }
            }
          }
        }
        return failures;
      },
    });

    // Karma parser
    this.frameworkParsers.set('karma', {
      name: 'karma',
      jsonFormat: 'karma',
      textPatterns: [/(\d+)\s+specs?,\s+(\d+)\s+failures?/i, /Executed\s+(\d+)\s+of\s+(\d+)/i],
      metadataExtractors: [
        (data) => ({
          browsers: data.browsers,
          disconnected: data.disconnected,
        }),
      ],
      failureExtractor: (data) => {
        const failures: TestFailure[] = [];
        if (data.result && data.result.failed) {
          for (const browser in data.result.failed) {
            const browserFailures = data.result.failed[browser];
            for (const failure of browserFailures) {
              failures.push({
                test_name: failure.description || 'Unknown test',
                error_message: failure.log?.join('\n') || 'Test failed',
                stack_trace: failure.stack,
              });
            }
          }
        }
        return failures;
      },
    });

    // Tape parser
    this.frameworkParsers.set('tape', {
      name: 'tape',
      jsonFormat: 'tap',
      textPatterns: [/# pass\s+(\d+)/i, /# fail\s+(\d+)/i, /(\d+)\.\.(\d+)/i],
      metadataExtractors: [
        (data) => ({
          plan: data.plan,
          version: data.version,
        }),
      ],
      failureExtractor: (data) => {
        const failures: TestFailure[] = [];
        if (data.failures) {
          for (const failure of data.failures) {
            failures.push({
              test_name: failure.name || 'Unknown test',
              error_message: failure.message || 'Test failed',
              stack_trace: failure.stack,
            });
          }
        }
        return failures;
      },
    });

    // Jasmine parser
    this.frameworkParsers.set('jasmine', {
      name: 'jasmine',
      jsonFormat: 'jasmine',
      textPatterns: [
        /(\d+)\s+specs?,\s+(\d+)\s+failures?/i,
        /Executed\s+(\d+)\s+of\s+(\d+)\s+specs?/i,
      ],
      metadataExtractors: [
        (data) => ({
          random: data.random,
          seed: data.seed,
        }),
      ],
      failureExtractor: (data) => {
        const failures: TestFailure[] = [];
        if (data.failedExpectations) {
          for (const expectation of data.failedExpectations) {
            failures.push({
              test_name: expectation.fullName || 'Unknown test',
              error_message: expectation.message || 'Test failed',
              stack_trace: expectation.stack,
            });
          }
        }
        return failures;
      },
    });
  }

  /**
   * Parse using framework-specific parser
   */
  private parseWithFrameworkParser(
    parser: FrameworkParser,
    jsonData: any,
    diagnostics: ParsingDiagnostics
  ): TestResults {
    const results = this.createEmptyResults();

    try {
      // Extract basic test counts based on framework
      switch (parser.name) {
        case 'jest':
          results.total = jsonData.numTotalTests || 0;
          results.passed = jsonData.numPassedTests || 0;
          results.failed = jsonData.numFailedTests || 0;
          results.skipped = jsonData.numPendingTests || jsonData.numTodoTests || 0;
          break;

        case 'mocha':
          if (jsonData.stats) {
            results.total = jsonData.stats.tests || 0;
            results.passed = jsonData.stats.passes || 0;
            results.failed = jsonData.stats.failures || 0;
            results.skipped = jsonData.stats.pending || 0;
            results.duration = jsonData.stats.duration || 0;
          }
          break;

        case 'bun:test':
          results.total = jsonData.numTotalTests || jsonData.testResults?.length || 0;
          results.passed = jsonData.numPassedTests || 0;
          results.failed = jsonData.numFailedTests || 0;
          results.skipped = jsonData.numPendingTests || 0;
          break;

        case 'karma':
          if (jsonData.result) {
            results.total = jsonData.result.total || 0;
            results.passed = jsonData.result.success || 0;
            results.failed = jsonData.result.failed || 0;
            results.skipped = jsonData.result.skipped || 0;
          }
          break;

        case 'tape':
          if (jsonData.plan) {
            results.total = jsonData.plan.end || 0;
            results.passed = (jsonData.pass || []).length;
            results.failed = (jsonData.fail || []).length;
          }
          break;

        case 'jasmine':
          results.total = jsonData.totalSpecsDefined || 0;
          results.passed = results.total - (jsonData.failedExpectations?.length || 0) || 0;
          results.failed = jsonData.failedExpectations?.length || 0;
          break;
      }

      // Extract failures using framework-specific extractor
      results.failures = parser.failureExtractor(jsonData);

      // Extract metadata
      for (const extractor of parser.metadataExtractors) {
        const metadata = extractor(jsonData);
        Object.assign(results, metadata);
      }

      diagnostics.successfulParsing = true;
      return results;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Framework parser error';
      diagnostics.errors.push(`Framework parser error (${parser.name}): ${errorMsg}`);
      return results;
    }
  }

  /**
   * Parse generic JSON when no specific parser is available
   */
  private parseGenericJson(jsonData: any, framework: string): TestResults {
    const results = this.createEmptyResults();

    // Try common property patterns
    const totalProps = ['total', 'numTotal', 'totalTests', 'tests', 'numTotalTests'];
    const passedProps = ['passed', 'numPassed', 'passes', 'numPassedTests', 'success'];
    const failedProps = ['failed', 'numFailed', 'failures', 'numFailedTests', 'fail'];
    const skippedProps = ['skipped', 'pending', 'numPending', 'numPendingTests', 'numTodoTests'];

    results.total = this.extractFromProps(jsonData, totalProps) || 0;
    results.passed = this.extractFromProps(jsonData, passedProps) || 0;
    results.failed = this.extractFromProps(jsonData, failedProps) || 0;
    results.skipped = this.extractFromProps(jsonData, skippedProps) || 0;

    // Extract duration
    const durationProps = ['duration', 'time', 'elapsed', 'executionTime'];
    results.duration = this.extractFromProps(jsonData, durationProps) || 0;

    // Try to extract failures
    const failureArrays = ['failures', 'failed', 'failedTests', 'errors'];
    for (const prop of failureArrays) {
      if (jsonData[prop] && Array.isArray(jsonData[prop])) {
        results.failures = jsonData[prop].map((failure: any) => ({
          test_name: failure.name || failure.title || failure.fullName || 'Unknown test',
          error_message: failure.message || failure.error || failure.err?.message || 'Test failed',
          stack_trace: failure.stack || failure.err?.stack,
        }));
        break;
      }
    }

    return results;
  }

  /**
   * Extract value from object using multiple possible property names
   */
  private extractFromProps(obj: any, props: string[]): any {
    for (const prop of props) {
      if (obj && obj[prop] !== undefined) {
        return obj[prop];
      }
    }
    return null;
  }

  /**
   * Parse test counts from text output
   */
  private parseTestCounts(
    output: string,
    patterns: RegExp[]
  ): { found: boolean; data: Partial<TestResults> } {
    const data: any = {};
    let found = false;

    // Enhanced pattern matching for different frameworks
    const enhancedPatterns = [
      // Jest patterns
      {
        regex: /Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/i,
        map: [null, 'failed', 'passed', 'total'],
      },
      { regex: /(\d+)\s+passing,\s+(\d+)\s+failing/i, map: ['passed', 'failed'] },
      { regex: /(\d+)\s+passed,\s+(\d+)\s+failed/i, map: ['passed', 'failed'] },

      // Mocha patterns
      { regex: /(\d+)\s+passing/i, map: ['passed'] },
      { regex: /(\d+)\s+failing/i, map: ['failed'] },
      { regex: /(\d+)\s+pending/i, map: ['skipped'] },

      // Vitest patterns
      { regex: /✓\s+(\d+)\s+passed/i, map: ['passed'] },
      { regex: /✗\s+(\d+)\s+failed/i, map: ['failed'] },
      { regex: /Test Files\s+(\d+)\s+passed,\s+(\d+)\s+failed/i, map: ['passed', 'failed'] },

      // Karma patterns
      { regex: /(\d+)\s+specs?,\s+(\d+)\s+failures?/i, map: ['total', 'failed'] },
      { regex: /Executed\s+(\d+)\s+of\s+(\d+)/i, map: ['passed', 'total'] },

      // Tape patterns
      { regex: /# pass\s+(\d+)/i, map: ['passed'] },
      { regex: /# fail\s+(\d+)/i, map: ['failed'] },
      { regex: /(\d+)\.\.(\d+)/i, map: [null, 'total'] },

      // Generic patterns
      { regex: /(\d+)\s+tests?\s+passed/i, map: ['passed'] },
      { regex: /(\d+)\s+tests?\s+failed/i, map: ['failed'] },
      { regex: /(\d+)\s+tests?\s+skipped/i, map: ['skipped'] },
    ];

    for (const pattern of enhancedPatterns) {
      const match = output.match(pattern.regex);
      if (match) {
        for (let i = 0; i < pattern.map.length; i++) {
          const key = pattern.map[i];
          if (key && match[i + 1]) {
            data[key] = parseInt(match[i + 1]);
            found = true;
          }
        }
      }
    }

    // Calculate total if not found but passed/failed are available
    if (!data.total && (data.passed || data.failed)) {
      data.total = (data.passed || 0) + (data.failed || 0) + (data.skipped || 0);
    }

    return { found, data };
  }

  /**
   * Parse failure details with stack traces
   */
  private parseFailureDetails(output: string, framework: string): TestFailure[] {
    const failures: TestFailure[] = [];

    // Framework-specific failure patterns
    const failurePatterns = {
      jest: [/● (.+?)\n\s+(.+?)\n\s+(at .+?)$/gm, /FAIL (.+?)\n(.+?)\n([\s\S]*?)(?=\n\s*\d+\)|$)/g],
      mocha: [
        /\d+\)\s+(.+?)\n\s+(.+?)\n\s+(at .+?)$/gm,
        /Error:\s+(.+?)\n([\s\S]*?)(?=\n\s*\d+\)|$)/g,
      ],
      'bun:test': [/❯ (.+?)\n(.+?)\n([\s\S]*?)(?=❯|$)/g, /FAIL (.+?)\n(.+?)\n([\s\S]*?)(?=\n\s*❯|$)/g],
      karma: [/(\w+) (.+?) FAILED\n(.+?)\n([\s\S]*?)(?=\n\w+|$)/g],
      tape: [/not ok \d+ (.+?)\n\s+(.+?)\n\s+(at .+?)$/gm],
      jasmine: [/(\d+)\)\s+(.+?)\n\s+Message:\n\s+(.+?)\n\s+Stack:\n([\s\S]*?)(?=\n\s*\d+\)|$)/g],
    };

    const patterns = failurePatterns[framework] || failurePatterns.jest;

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        const failure: TestFailure = {
          test_name: match[1]?.trim() || 'Unknown test',
          error_message: match[2]?.trim() || 'Test failed',
          stack_trace: match[3]?.trim(),
        };

        // Clean up stack trace
        if (failure.stack_trace) {
          failure.stack_trace = this.cleanStackTrace(failure.stack_trace);
        }

        failures.push(failure);
      }
    }

    // Generic error extraction if framework-specific patterns don't match
    if (failures.length === 0) {
      const genericErrors = this.extractGenericErrors(output);
      failures.push(...genericErrors);
    }

    return failures;
  }

  /**
   * Parse execution metadata (duration, coverage, etc.)
   */
  private parseExecutionMetadata(output: string): {
    duration?: number;
    coverage?: any;
    [key: string]: any;
  } {
    const metadata: any = {};

    // Duration patterns
    const durationPatterns = [
      /Time:\s+(\d+\.?\d*)\s*s/i,
      /Duration:\s+(\d+\.?\d*)\s*ms/i,
      /Ran .+ in (\d+\.?\d*)s/i,
      /Test Suites:.+Time:\s+(\d+\.?\d*)s/i,
    ];

    for (const pattern of durationPatterns) {
      const match = output.match(pattern);
      if (match) {
        let duration = parseFloat(match[1]);
        // Convert to milliseconds if in seconds
        if (pattern.source.includes('\\s*s')) {
          duration *= 1000;
        }
        metadata.duration = duration;
        break;
      }
    }

    // Coverage patterns
    const coverageMatch = output.match(/All files[^|]*\|\s*(\d+\.?\d*)/);
    if (coverageMatch) {
      metadata.coverage = {
        overall: parseFloat(coverageMatch[1]),
      };
    }

    return metadata;
  }

  /**
   * Calculate confidence score for JSON parsing
   */
  private calculateJsonConfidence(results: TestResults, jsonData: any, framework: string): number {
    let confidence = 0;

    // Base confidence for valid JSON
    confidence += 40;

    // Framework match bonus
    if (this.frameworkParsers.has(framework)) {
      confidence += 20;
    }

    // Data completeness check
    if (results.total > 0) {confidence += 20;}
    if (results.passed >= 0) {confidence += 5;}
    if (results.failed >= 0) {confidence += 5;}
    if (results.failures && results.failures.length > 0) {confidence += 10;}

    // Data consistency check
    const calculatedTotal = results.passed + results.failed + results.skipped;
    if (Math.abs(calculatedTotal - results.total) <= 1) {
      confidence += 15;
    } else if (results.total === 0 && calculatedTotal === 0) {
      confidence += 10;
    }

    // Reduce confidence for suspicious data
    if (results.total < 0 || results.passed < 0 || results.failed < 0) {
      confidence -= 30;
    }

    return Math.min(100, Math.max(0, confidence)) / 100;
  }

  /**
   * Calculate confidence score for text parsing
   */
  private calculateTextConfidence(
    results: TestResults,
    output: string,
    matchFound: boolean
  ): number {
    let confidence = 0;

    // Base confidence for finding matches
    if (matchFound) {confidence += 50;}

    // Output quality assessment
    if (output.length > 100) {confidence += 10;}
    if (output.includes('passed') || output.includes('failed')) {confidence += 15;}
    if (output.includes('Test') || output.includes('test')) {confidence += 10;}

    // Data consistency
    const total = results.passed + results.failed + results.skipped;
    if (total === results.total && total > 0) {
      confidence += 20;
    }

    // Reduce confidence for poor quality indicators
    if (output.length < 50) {confidence -= 20;}
    if (!output.includes('test') && !output.includes('Test')) {confidence -= 15;}

    return Math.min(100, Math.max(0, confidence)) / 100;
  }

  /**
   * Detect framework from output text
   */
  private detectFrameworkFromOutput(output: string): string {
    const frameworkIndicators = {
      jest: ['jest', 'Tests:', 'Test Suites:', '● ', 'PASS ', 'FAIL '],
      mocha: ['mocha', '✓', '✗', 'passing', 'failing'],
      'bun:test': ['bun test', '❯', 'Test Files', 'RERUN', 'BENCH'],
      karma: ['karma', 'Executed', 'Chrome', 'Firefox', 'PhantomJS'],
      tape: ['TAP', 'ok ', 'not ok', '# pass', '# fail'],
      jasmine: ['jasmine', 'Specs:', 'expectations'],
    };

    for (const [framework, indicators] of Object.entries(frameworkIndicators)) {
      if (indicators.some((indicator) => output.includes(indicator))) {
        return framework;
      }
    }

    return 'unknown';
  }

  /**
   * Get framework-specific patterns
   */
  private getFrameworkPatterns(framework: string): RegExp[] {
    const parser = this.frameworkParsers.get(framework);
    return parser?.textPatterns || [];
  }

  /**
   * Extract JSON from mixed text output
   */
  private extractJsonFromText(output: string): any | null {
    // Look for JSON blocks in output
    const jsonMatches = output.match(/\{[\s\S]*\}/g);
    if (!jsonMatches) {return null;}

    for (const match of jsonMatches) {
      try {
        const parsed = JSON.parse(match);
        // Validate it looks like test results
        if (this.looksLikeTestResults(parsed)) {
          return parsed;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Check if object looks like test results
   */
  private looksLikeTestResults(obj: any): boolean {
    if (!obj || typeof obj !== 'object') {return false;}

    const testProps = ['tests', 'passed', 'failed', 'total', 'numTotal', 'stats', 'testResults'];
    return testProps.some((prop) => prop in obj);
  }

  /**
   * Parse structured text output
   */
  private parseStructuredText(output: string): {
    results: TestResults;
    confidence: number;
    framework: string;
  } {
    const results = this.createEmptyResults();
    const framework = this.detectFrameworkFromOutput(output);

    // Implementation for parsing well-structured text output
    // This is a simplified version - could be expanded significantly

    return {
      results,
      confidence: 0.3,
      framework,
    };
  }

  /**
   * Repair malformed JSON
   */
  private repairMalformedJson(jsonString: string): string | null {
    try {
      // Common JSON repairs
      let repaired = jsonString
        .replace(/,\s*}/g, '}') // Remove trailing commas in objects
        .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
        .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double
        .replace(/\\'/g, "'") // Fix escaped single quotes
        .trim();

      // Try to find a complete JSON object
      const openBrace = repaired.indexOf('{');
      const closeBrace = repaired.lastIndexOf('}');

      if (openBrace !== -1 && closeBrace !== -1 && closeBrace > openBrace) {
        repaired = repaired.substring(openBrace, closeBrace + 1);
      }

      // Test if it's valid JSON now
      JSON.parse(repaired);
      return repaired;
    } catch {
      return null;
    }
  }

  /**
   * Clean stack trace for better readability
   */
  private cleanStackTrace(stackTrace: string): string {
    return stackTrace
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.trim())
      .filter((line) => !line.includes('node_modules'))
      .slice(0, 10) // Limit to first 10 lines
      .join('\n');
  }

  /**
   * Extract generic errors from output
   */
  private extractGenericErrors(output: string): TestFailure[] {
    const failures: TestFailure[] = [];
    const errorLines = output
      .split('\n')
      .filter(
        (line) =>
          line.includes('Error') ||
          line.includes('failed') ||
          line.includes('✗') ||
          line.includes('FAIL')
      );

    for (const line of errorLines.slice(0, 5)) {
      if (line.trim()) {
        failures.push({
          test_name: 'Extracted from output',
          error_message: line.trim(),
        });
      }
    }

    return failures;
  }

  /**
   * Detect edge cases in test output
   */
  private detectEdgeCases(
    output: string,
    results: TestResults,
    diagnostics: ParsingDiagnostics
  ): void {
    // No tests found
    if (
      output.includes('No tests found') ||
      output.includes('0 tests') ||
      (output.length < 50 && !output.includes('test'))
    ) {
      results.noTestsFound = true;
      diagnostics.warnings.push('No tests found in output');
    }

    // Timeout detection
    if (output.includes('timeout') || output.includes('TIMEOUT')) {
      diagnostics.warnings.push('Test execution timeout detected');
    }

    // Compilation errors
    if (
      output.includes('compilation error') ||
      output.includes('SyntaxError') ||
      output.includes('Cannot resolve')
    ) {
      diagnostics.warnings.push('Compilation errors detected');
    }

    // Framework not found
    if (output.includes('command not found') || output.includes('No such file')) {
      diagnostics.warnings.push('Test framework not found');
    }
  }

  /**
   * Enhance results with validation metadata
   */
  private enhanceResultsWithMetadata(results: TestResults, framework: string): TestResults {
    return {
      ...results,
      frameworkDetected: framework,
      executionReliable: true,
      parsingSuccessful: true,
      validationScore: this.calculateValidationScore(results),
    };
  }

  /**
   * Calculate overall validation score
   */
  private calculateValidationScore(results: TestResults): number {
    if (results.noTestsFound) {return 0;}
    if (results.total === 0) {return 10;}

    const passRate = results.total > 0 ? results.passed / results.total : 0;
    let score = 60 + passRate * 30;

    // Bonus for having detailed failure information
    if (results.failures && results.failures.length > 0) {
      const hasStackTraces = results.failures.some((f) => f.stack_trace);
      if (hasStackTraces) {score += 5;}
    }

    return Math.min(95, Math.max(0, score));
  }

  /**
   * Create empty results template
   */
  private createEmptyResults(): TestResults & {
    noTestsFound?: boolean;
    frameworkDetected?: string;
    executionReliable?: boolean;
    parsingSuccessful?: boolean;
    validationScore?: number;
    } {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      failures: [],
      noTestsFound: false,
      frameworkDetected: 'unknown',
      executionReliable: false,
      parsingSuccessful: false,
      validationScore: 0,
    };
  }

  /**
   * Create fallback result when all parsing fails
   */
  private createFallbackResult(
    stdout?: string,
    stderr?: string,
    diagnostics?: ParsingDiagnostics
  ): ParsedResult {
    const results = this.createEmptyResults();
    results.noTestsFound = true;
    results.parsingSuccessful = false;
    results.validationScore = 0;

    if (diagnostics) {
      diagnostics.warnings.push('Using fallback parsing - low confidence');
    }

    return {
      results,
      confidence: 0.1,
      parseMethod: 'fallback',
      framework: 'unknown',
      warnings: diagnostics?.warnings || ['Fallback parsing used'],
      rawData: this.config.parsing.preserveOutput ? { stdout, stderr } : undefined,
    };
  }

  /**
   * Create error result for parsing failures
   */
  private createErrorResult(errorMessage: string): ParsedResult {
    return {
      results: {
        ...this.createEmptyResults(),
        failures: [
          {
            test_name: 'Result parsing',
            error_message: errorMessage,
          },
        ],
      },
      confidence: 0,
      parseMethod: 'fallback',
      framework: 'unknown',
      warnings: [`Parsing failed: ${errorMessage}`],
    };
  }

  /**
   * Finalize result with diagnostics
   */
  private finalizeResult(result: ParsedResult, diagnostics: ParsingDiagnostics): ParsedResult {
    // Add diagnostic information
    result.warnings = result.warnings || [];
    result.warnings.push(...diagnostics.warnings);

    // Log parsing summary
    elizaLogger.info(
      `[RESULT-PARSER] Parsing completed: method=${result.parseMethod}, confidence=${result.confidence.toFixed(2)}, framework=${result.framework}`
    );

    if (diagnostics.errors.length > 0) {
      elizaLogger.warn('[RESULT-PARSER] Parsing errors encountered:', diagnostics.errors);
    }

    return result;
  }
}
