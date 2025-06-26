#!/usr/bin/env node

/**
 * Development Error Monitoring System
 * Comprehensive error tracking for live development and testing
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DevErrorMonitor {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.serverLogs = [];
    this.testResults = {};
    this.logFile = path.join(__dirname, 'dev-error-log.json');
    this.realTimeLog = path.join(__dirname, 'dev-realtime.log');
    
    // Ensure log files exist
    this.initializeLogFiles();
    
    // Setup monitoring
    this.setupErrorTracking();
  }

  initializeLogFiles() {
    // Initialize JSON log file
    if (!fs.existsSync(this.logFile)) {
      fs.writeFileSync(this.logFile, JSON.stringify({
        errors: [],
        warnings: [],
        serverLogs: [],
        testResults: {},
        lastUpdated: new Date().toISOString()
      }, null, 2));
    }

    // Initialize real-time log
    if (!fs.existsSync(this.realTimeLog)) {
      fs.writeFileSync(this.realTimeLog, '');
    }
  }

  setupErrorTracking() {
    // Capture uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logError('UNCAUGHT_EXCEPTION', error);
    });

    // Capture unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logError('UNHANDLED_REJECTION', { reason, promise });
    });
  }

  logError(type, error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      type,
      message: error.message || String(error),
      stack: error.stack || null,
      context,
      severity: this.determineSeverity(error)
    };

    this.errors.push(errorEntry);
    this.saveToLog();
    this.logToRealTime(`[ERROR] ${type}: ${errorEntry.message}`);
  }

  logWarning(type, message, context = {}) {
    const warningEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      context
    };

    this.warnings.push(warningEntry);
    this.saveToLog();
    this.logToRealTime(`[WARN] ${type}: ${message}`);
  }

  logServerEvent(event, details) {
    const serverEntry = {
      timestamp: new Date().toISOString(),
      event,
      details
    };

    this.serverLogs.push(serverEntry);
    this.saveToLog();
    this.logToRealTime(`[SERVER] ${event}: ${JSON.stringify(details, null, 2)}`);
  }

  logTestResult(testName, result) {
    this.testResults[testName] = {
      timestamp: new Date().toISOString(),
      result,
      passed: result.passed || false,
      failed: result.failed || false,
      skipped: result.skipped || false,
      errors: result.errors || []
    };

    this.saveToLog();
    this.logToRealTime(`[TEST] ${testName}: ${result.passed ? 'PASSED' : 'FAILED'}`);
  }

  determineSeverity(error) {
    const message = String(error.message || error).toLowerCase();
    
    if (message.includes('database') || message.includes('connection')) {
      return 'critical';
    }
    if (message.includes('auth') || message.includes('permission')) {
      return 'high';
    }
    if (message.includes('timeout') || message.includes('network')) {
      return 'medium';
    }
    return 'low';
  }

  saveToLog() {
    const data = {
      errors: this.errors.slice(-100), // Keep last 100 errors
      warnings: this.warnings.slice(-50), // Keep last 50 warnings
      serverLogs: this.serverLogs.slice(-50), // Keep last 50 server events
      testResults: this.testResults,
      lastUpdated: new Date().toISOString(),
      summary: this.generateSummary()
    };

    fs.writeFileSync(this.logFile, JSON.stringify(data, null, 2));
  }

  logToRealTime(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    fs.appendFileSync(this.realTimeLog, logEntry);
    console.log(logEntry.trim());
  }

  generateSummary() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const recentErrors = this.errors.filter(e => 
      new Date(e.timestamp).getTime() > oneHourAgo
    );
    
    const recentWarnings = this.warnings.filter(w => 
      new Date(w.timestamp).getTime() > oneHourAgo
    );

    const testsPassed = Object.values(this.testResults).filter(t => t.passed).length;
    const testsFailed = Object.values(this.testResults).filter(t => t.failed).length;

    return {
      recentErrors: recentErrors.length,
      recentWarnings: recentWarnings.length,
      criticalErrors: recentErrors.filter(e => e.severity === 'critical').length,
      testsPassed,
      testsFailed,
      overallHealth: this.calculateOverallHealth()
    };
  }

  calculateOverallHealth() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const recentErrors = this.errors.filter(e => 
      new Date(e.timestamp).getTime() > oneHourAgo
    );
    
    const criticalErrors = recentErrors.filter(e => e.severity === 'critical').length;
    const testsPassed = Object.values(this.testResults).filter(t => t.passed).length;
    const testsFailed = Object.values(this.testResults).filter(t => t.failed).length;
    
    if (criticalErrors > 0) return 'critical';
    if (recentErrors.length > 5) return 'poor';
    if (testsFailed > testsPassed) return 'degraded';
    if (this.warnings.filter(w => new Date(w.timestamp).getTime() > oneHourAgo).length > 10) return 'fair';
    return 'good';
  }

  async startDevServer() {
    this.logServerEvent('SERVER_STARTING', { port: 3333 });
    
    return new Promise((resolve, reject) => {
      const server = spawn('npm', ['run', 'dev'], {
        stdio: ['inherit', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'development' }
      });

      let serverReady = false;

      server.stdout.on('data', (data) => {
        const output = data.toString();
        this.logToRealTime(`[DEV_SERVER] ${output.trim()}`);
        
        // Check if server is ready
        if (output.includes('Ready') || output.includes('localhost:3333')) {
          if (!serverReady) {
            serverReady = true;
            this.logServerEvent('SERVER_READY', { message: 'Development server is ready' });
            resolve(server);
          }
        }

        // Check for errors
        if (output.toLowerCase().includes('error')) {
          this.logError('DEV_SERVER_ERROR', { message: output.trim() });
        }
      });

      server.stderr.on('data', (data) => {
        const output = data.toString();
        this.logToRealTime(`[DEV_SERVER_ERROR] ${output.trim()}`);
        this.logError('DEV_SERVER_STDERR', { message: output.trim() });
      });

      server.on('error', (error) => {
        this.logError('DEV_SERVER_SPAWN_ERROR', error);
        reject(error);
      });

      server.on('close', (code) => {
        this.logServerEvent('SERVER_CLOSED', { exitCode: code });
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!serverReady) {
          this.logError('DEV_SERVER_TIMEOUT', { message: 'Server failed to start within 30 seconds' });
          reject(new Error('Server start timeout'));
        }
      }, 30000);
    });
  }

  async runCypressTests() {
    this.logTestResult('CYPRESS_TESTS', { status: 'starting' });
    
    return new Promise((resolve) => {
      const cypress = spawn('npx', ['cypress', 'run', '--headless'], {
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let testOutput = '';

      cypress.stdout.on('data', (data) => {
        const output = data.toString();
        testOutput += output;
        this.logToRealTime(`[CYPRESS] ${output.trim()}`);
      });

      cypress.stderr.on('data', (data) => {
        const output = data.toString();
        testOutput += output;
        this.logToRealTime(`[CYPRESS_ERROR] ${output.trim()}`);
      });

      cypress.on('close', (code) => {
        const result = this.parseCypressOutput(testOutput);
        result.exitCode = code;
        
        this.logTestResult('CYPRESS_TESTS', result);
        resolve(result);
      });
    });
  }

  parseCypressOutput(output) {
    const lines = output.split('\n');
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    const errors = [];

    for (const line of lines) {
      if (line.includes('✓') || line.includes('passing')) {
        passed++;
      }
      if (line.includes('✗') || line.includes('failing')) {
        failed++;
      }
      if (line.includes('pending') || line.includes('skipped')) {
        skipped++;
      }
      if (line.includes('Error:') || line.includes('AssertionError:')) {
        errors.push(line.trim());
      }
    }

    return {
      passed: passed > 0,
      failed: failed > 0,
      skipped: skipped > 0,
      counts: { passed, failed, skipped },
      errors,
      output
    };
  }

  printSummary() {
    const summary = this.generateSummary();
    
    console.log('\n' + '='.repeat(60));
    console.log('DEVELOPMENT ERROR MONITORING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Overall Health: ${summary.overallHealth.toUpperCase()}`);
    console.log(`Recent Errors: ${summary.recentErrors}`);
    console.log(`Critical Errors: ${summary.criticalErrors}`);
    console.log(`Recent Warnings: ${summary.recentWarnings}`);
    console.log(`Tests Passed: ${summary.testsPassed}`);
    console.log(`Tests Failed: ${summary.testsFailed}`);
    console.log('='.repeat(60));
    
    if (summary.criticalErrors > 0) {
      console.log('\nCRITICAL ERRORS:');
      this.errors
        .filter(e => e.severity === 'critical')
        .slice(-5)
        .forEach(error => {
          console.log(`- ${error.message}`);
        });
    }
    
    console.log(`\nDetailed logs available at: ${this.logFile}`);
    console.log(`Real-time log: ${this.realTimeLog}`);
  }
}

// Export for use in other modules
export default DevErrorMonitor;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new DevErrorMonitor();
  
  async function runFullMonitoring() {
    try {
      console.log('Starting comprehensive development monitoring...');
      
      // Start dev server
      console.log('Starting development server...');
      const server = await monitor.startDevServer();
      
      // Wait for server to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Run Cypress tests
      console.log('Running Cypress tests...');
      const testResults = await monitor.runCypressTests();
      
      // Print summary
      monitor.printSummary();
      
      // Cleanup
      if (server) {
        server.kill();
      }
      
    } catch (error) {
      monitor.logError('MONITORING_ERROR', error);
      console.error('Monitoring failed:', error.message);
      process.exit(1);
    }
  }
  
  // Handle CLI arguments
  const args = process.argv.slice(2);
  if (args.includes('--server-only')) {
    monitor.startDevServer().catch(console.error);
  } else if (args.includes('--tests-only')) {
    monitor.runCypressTests().then(() => monitor.printSummary());
  } else {
    runFullMonitoring();
  }
}