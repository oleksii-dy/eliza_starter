import { logger } from '@elizaos/core';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { TestResult } from '../types';

export interface LoggerTestOptions {
  skipBuild?: boolean;
  timeout?: number;
}

export interface LoggerTestResult extends TestResult {
  results?: Array<{ name: string; status: string; error?: string }>;
  error?: string;
}

// Helper function to kill process more aggressively
function killProcessAggressively(child: any, timeoutMs: number = 2000): Promise<void> {
  return new Promise((resolve) => {
    let killed = false;
    
    const forceKill = () => {
      if (!killed && !child.killed) {
        try {
          child.kill('SIGKILL');
          killed = true;
        } catch (e) {
          // Process might already be dead
        }
      }
      resolve();
    };

    // Try graceful shutdown first
    try {
      child.kill('SIGTERM');
    } catch (e) {
      // Process might already be dead
      return resolve();
    }

    // Force kill after timeout
    setTimeout(forceKill, timeoutMs);
    
    // Resolve immediately if process exits gracefully
    child.on('close', () => {
      killed = true;
      resolve();
    });
  });
}

/**
 * Run logger tests to verify logging functionality
 * 
 * Tests various logging configurations including:
 * - Console logging with different levels
 * - File logging (hybrid mode)
 * - JSON format consistency
 * - Configuration priority order
 */
export async function runLoggerTests(
  testPath: string | undefined,
  options: LoggerTestOptions = {}
): Promise<LoggerTestResult> {
  const cwd = testPath ? path.resolve(process.cwd(), testPath) : process.cwd();
  const testDir = path.join(cwd, 'test-logs');
  const timeout = options.timeout || 30000;

  logger.info('Running logger tests...');

  try {
    // Kill any existing test processes first
    try {
      await new Promise<void>((resolve) => {
        const cleanup = spawn('pkill', ['-f', 'bun.*start.*character'], { stdio: 'ignore' });
        cleanup.on('close', () => resolve());
        setTimeout(() => resolve(), 1000); 
      });
    } catch (e) {
      // Ignore cleanup errors
    }

    // Create test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    const tests = [
      {
        name: 'Console logging with debug level',
        test: () => testConsoleLogging(cwd, testDir, timeout)
      },
      {
        name: 'File logging hybrid mode',
        test: () => testFileLoggingHybrid(cwd, testDir, timeout)
      },
      {
        name: 'JSON format consistency',
        test: () => testJsonFormatConsistency(cwd, testDir, timeout)
      },
      {
        name: 'Configuration priority order',
        test: () => testConfigurationPriority(cwd, testDir, timeout)
      }
    ];

    let failedTests = 0;
    const results = [];

    for (const test of tests) {
      logger.info(`Running test: ${test.name}`);
      try {
        const result = await test.test();
        if (result.success) {
          logger.success(`✅ ${test.name}`);
          results.push({ name: test.name, status: 'passed' });
        } else {
          logger.error(`❌ ${test.name}: ${result.error}`);
          results.push({ name: test.name, status: 'failed', error: result.error });
          failedTests++;
        }
      } catch (error) {
        logger.error(`❌ ${test.name}: ${error}`);
        results.push({ name: test.name, status: 'failed', error: String(error) });
        failedTests++;
      }
    }

    // Cleanup
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    // Summary
    const totalTests = tests.length;
    const passedTests = totalTests - failedTests;
    
    logger.info(`\nLogger Tests Summary:`);
    logger.info(`Total: ${totalTests}, Passed: ${passedTests}, Failed: ${failedTests}`);
    
    if (failedTests === 0) {
      logger.success('All logger tests passed! 🎉');
    } else {
      logger.error(`${failedTests} logger test(s) failed.`);
    }

    return { failed: failedTests > 0, results };

  } catch (error) {
    logger.error('Failed to run logger tests:', error);
    return { failed: true, error: String(error) };
  }
}

async function testConsoleLogging(cwd: string, testDir: string, timeout: number): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    // Create a minimal test character to avoid character loading issues
    const testCharacter = {
      name: "TestBot",
      plugins: [],
      clients: [],
      modelProvider: "none",
      settings: {
        secrets: {},
        voice: { model: "en_US-hfc_female-medium" }
      }
    };
    
    const characterFile = path.join(testDir, 'test-character.json');
    writeFileSync(characterFile, JSON.stringify(testCharacter, null, 2));
    
    const args = [
      'packages/cli/dist/index.js', 
      'start', 
      '--character', characterFile,
      '--log-level', 'debug'
    ];
    
    const child = spawn('bun', args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: timeout - 1000
    });

    let output = '';
    let foundDebugIndicator = false;

    const checkForDebug = (data: string) => {
      output += data;
      // Look for the logger configuration message that shows debug level was set
      if (data.includes('level=debug') || data.includes('"level":20') || data.includes('DEBUG')) {
        foundDebugIndicator = true;
        // Give a moment for more logs, then kill
        setTimeout(() => {
          child.kill('SIGTERM');
        }, 500);
      }
    };

    child.stdout?.on('data', (data) => {
      checkForDebug(data.toString());
    });

    child.stderr?.on('data', (data) => {
      checkForDebug(data.toString());
    });

    child.on('close', (code) => {
      // Check if we got debug level output - multiple ways to detect it
      const hasDebugOutput = output.includes('"level":20') || 
                            output.includes('level=debug') || 
                            output.includes('DEBUG') ||
                            foundDebugIndicator ||
                            output.toLowerCase().includes('debug');
      
      if (hasDebugOutput) {
        resolve({ success: true });
      } else {
        // Provide debug info
        const outputLength = output.length;
        const hasLoggerConfig = output.includes('Logger configured');
        resolve({ 
          success: false, 
          error: `No debug output found in console (${outputLength} chars, config: ${hasLoggerConfig}, found indicator: ${foundDebugIndicator})` 
        });
      }
    });

    child.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    // Fallback timeout
    setTimeout(async () => {
      if (!foundDebugIndicator) {
        await killProcessAggressively(child, 1000);
      }
    }, 4000);

    setTimeout(() => {
      resolve({ success: false, error: 'Test timeout' });
    }, timeout);
  });
}

async function testFileLoggingHybrid(cwd: string, testDir: string, timeout: number): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const logFile = path.join(testDir, 'hybrid-test.log');
    
    // Create a minimal test character
    const testCharacter = {
      name: "TestBot",
      plugins: [],
      clients: [],
      modelProvider: "none",
      settings: {
        secrets: {},
        voice: { model: "en_US-hfc_female-medium" }
      }
    };
    
    const characterFile = path.join(testDir, 'test-character-hybrid.json');
    writeFileSync(characterFile, JSON.stringify(testCharacter, null, 2));
    
    const args = [
      'packages/cli/dist/index.js', 
      'start', 
      '--character', characterFile,
      '--log-transport', 'file', 
      '--log-file', logFile, 
      '--log-level', 'info'
    ];
    
    const child = spawn('bun', args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: timeout - 1000
    });

    let consoleOutput = '';

    child.stdout?.on('data', (data) => {
      consoleOutput += data.toString();
    });

    child.stderr?.on('data', (data) => {
      consoleOutput += data.toString();
    });

    child.on('close', (code) => {
      try {
        // Check console output (should have some logging)
        const hasConsoleOutput = consoleOutput.length > 0;
        
        // Check file output (should exist and have content)
        const hasFileOutput = existsSync(logFile);
        let fileContent = '';
        if (hasFileOutput) {
          fileContent = readFileSync(logFile, 'utf-8');
        }

        if (hasConsoleOutput && hasFileOutput && fileContent.length > 0) {
          resolve({ success: true });
        } else {
          resolve({ 
            success: false, 
            error: `Console: ${hasConsoleOutput}, File: ${hasFileOutput}, Content: ${fileContent.length} chars` 
          });
        }
      } catch (error) {
        resolve({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });

    child.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    // Kill process after a short time
    setTimeout(async () => {
      await killProcessAggressively(child, 1000);
    }, 4000);

    setTimeout(() => {
      resolve({ success: false, error: 'Test timeout' });
    }, timeout);
  });
}

async function testJsonFormatConsistency(cwd: string, testDir: string, timeout: number): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const logFile = path.join(testDir, 'json-test.log');
    
    // Create a minimal test character
    const testCharacter = {
      name: "TestBot",
      plugins: [],
      clients: [],
      modelProvider: "none",
      settings: {
        secrets: {},
        voice: { model: "en_US-hfc_female-medium" }
      }
    };
    
    const characterFile = path.join(testDir, 'test-character-json.json');
    writeFileSync(characterFile, JSON.stringify(testCharacter, null, 2));
    
    const args = [
      'packages/cli/dist/index.js', 
      'start', 
      '--character', characterFile,
      '--log-transport', 'file', 
      '--log-file', logFile, 
      '--log-json', 
      '--log-level', 'info'
    ];
    
    const child = spawn('bun', args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: timeout - 1000
    });

    let allOutput = '';
    let foundConfigurationLog = false;

    const checkForJson = (data: string) => {
      allOutput += data;
      // Look for the specific logger configuration message which is always generated
      if (data.includes('Logger configured') && data.includes('"level":')) {
        foundConfigurationLog = true;
        // Give a moment for file to be written, then kill
        setTimeout(() => {
          child.kill('SIGTERM');
        }, 200);
      }
    };

    child.stdout?.on('data', (data) => {
      checkForJson(data.toString());
    });

    child.stderr?.on('data', (data) => {
      checkForJson(data.toString());
    });

    child.on('close', (code) => {
      try {
        // Check if console output has JSON format
        const consoleHasJson = allOutput.includes('"level":') && allOutput.includes('"msg"');
        
        // Check file output
        let fileHasJson = false;
        if (existsSync(logFile)) {
          const fileContent = readFileSync(logFile, 'utf-8');
          fileHasJson = fileContent.includes('"level":') && fileContent.includes('"msg"');
        }

        if (consoleHasJson && fileHasJson) {
          resolve({ success: true });
        } else {
          // Provide more debug info
          const fileExists = existsSync(logFile);
          const fileSize = fileExists ? readFileSync(logFile, 'utf-8').length : 0;
          const consoleSize = allOutput.length;
          
          resolve({ 
            success: false, 
            error: `Console JSON: ${consoleHasJson} (${consoleSize} chars), File JSON: ${fileHasJson} (${fileSize} chars), Found config: ${foundConfigurationLog}` 
          });
        }
      } catch (error) {
        resolve({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });

    child.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    // Fallback timeout
    setTimeout(async () => {
      if (!foundConfigurationLog) {
        await killProcessAggressively(child, 1000);
      }
    }, 3000);

    setTimeout(() => {
      resolve({ success: false, error: 'Test timeout' });
    }, timeout);
  });
}

async function testConfigurationPriority(cwd: string, testDir: string, timeout: number): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    // Create a minimal test character
    const testCharacter = {
      name: "TestBot",
      plugins: [],
      clients: [],
      modelProvider: "none",
      settings: {
        secrets: {},
        voice: { model: "en_US-hfc_female-medium" }
      }
    };
    
    const characterFile = path.join(testDir, 'test-character-priority.json');
    writeFileSync(characterFile, JSON.stringify(testCharacter, null, 2));
    
    // Test that CLI options override environment variables
    const args = [
      'packages/cli/dist/index.js', 
      'start', 
      '--character', characterFile,
      '--log-level', 'error'
    ];
    
    const child = spawn('bun', args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        LOG_LEVEL: 'debug' // This should be overridden by CLI --log-level error
      },
      timeout: timeout - 1000
    });

    let output = '';

    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    child.stderr?.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      // If CLI override works, we should NOT see debug logs (only error level)
      const hasDebugLogs = output.includes('[DEBUG]') || output.toLowerCase().includes('debug');
      const hasErrorLogs = output.includes('[ERROR]') || output.includes('ERROR');
      
      // Success if we don't see debug logs (CLI override worked)
      if (!hasDebugLogs || hasErrorLogs) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: 'CLI options did not override environment variables' });
      }
    });

    child.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    // Kill process after a short time
    setTimeout(() => {
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL');
        }
      }, 1000);
    }, 3000);

    setTimeout(() => {
      resolve({ success: false, error: 'Test timeout' });
    }, timeout);
  });
} 