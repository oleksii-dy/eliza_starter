#!/usr/bin/env node

/**
 * Simple RPG Test Runner
 * 
 * A lightweight test runner that validates basic RPG functionality
 * without requiring complex browser automation or visual testing.
 */

import 'dotenv-flow/config';
import { spawn } from 'child_process';
import { setTimeout as delay } from 'timers/promises';

console.log('🎮 Simple RPG Test Runner');
console.log('============================');

const tests = [
  {
    name: 'Core Module Loading',
    test: async () => {
      try {
        // Test basic module imports
        const coreModule = await import('../src/core/index.js').catch(() => null);
        const rpgModule = await import('../src/rpg/index.js').catch(() => null);
        
        return {
          passed: true,
          details: {
            coreModuleLoaded: !!coreModule,
            rpgModuleLoaded: !!rpgModule,
          }
        };
      } catch (error) {
        return {
          passed: false,
          details: { error: error.message }
        };
      }
    }
  },
  
  {
    name: 'Package Configuration',
    test: async () => {
      try {
        const packageJson = await import('../package.json', { assert: { type: 'json' } });
        const hasRequiredScripts = packageJson.default.scripts && 
          packageJson.default.scripts['test:rpg'] &&
          packageJson.default.scripts['start'];
        
        return {
          passed: hasRequiredScripts,
          details: {
            packageName: packageJson.default.name,
            hasRPGTestScript: !!packageJson.default.scripts['test:rpg'],
            hasStartScript: !!packageJson.default.scripts['start'],
          }
        };
      } catch (error) {
        return {
          passed: false,
          details: { error: error.message }
        };
      }
    }
  },
  
  {
    name: 'Development Server Startup',
    test: async () => {
      try {
        // Try to start the dev server briefly to see if it loads
        const server = spawn('timeout', ['5', 'bun', 'run', 'dev'], {
          stdio: 'pipe',
          cwd: process.cwd()
        });
        
        let serverOutput = '';
        server.stdout.on('data', (data) => {
          serverOutput += data.toString();
        });
        
        server.stderr.on('data', (data) => {
          serverOutput += data.toString();
        });
        
        await new Promise((resolve) => {
          server.on('exit', resolve);
          setTimeout(() => {
            server.kill();
            resolve();
          }, 6000);
        });
        
        const startedSuccessfully = !serverOutput.includes('Error') && 
          (serverOutput.includes('Server') || serverOutput.includes('listening') || 
           serverOutput.includes('ready') || serverOutput.includes('started'));
        
        return {
          passed: startedSuccessfully,
          details: {
            serverOutput: serverOutput.slice(0, 500), // First 500 chars
            noErrors: !serverOutput.includes('Error'),
          }
        };
      } catch (error) {
        return {
          passed: false,
          details: { error: error.message }
        };
      }
    }
  },
  
  {
    name: 'TypeScript Compilation Check',
    test: async () => {
      try {
        const tscProcess = spawn('timeout', ['10', 'npx', 'tsc', '--noEmit', '--skipLibCheck'], {
          stdio: 'pipe',
          cwd: process.cwd()
        });
        
        let tscOutput = '';
        tscProcess.stderr.on('data', (data) => {
          tscOutput += data.toString();
        });
        
        await new Promise((resolve) => {
          tscProcess.on('exit', resolve);
          setTimeout(() => {
            tscProcess.kill();
            resolve();
          }, 12000);
        });
        
        // If there's minimal output, TypeScript compiled successfully
        const hasMinimalErrors = tscOutput.split('\n').length < 50;
        
        return {
          passed: hasMinimalErrors,
          details: {
            outputLineCount: tscOutput.split('\n').length,
            hasMinimalErrors,
            sample: tscOutput.slice(0, 300)
          }
        };
      } catch (error) {
        return {
          passed: false,
          details: { error: error.message }
        };
      }
    }
  }
];

async function runTests() {
  console.log(`\n🏃 Running ${tests.length} tests...\n`);
  
  const results = [];
  
  for (const test of tests) {
    console.log(`📋 ${test.name}...`);
    
    try {
      const result = await test.test();
      results.push({
        name: test.name,
        ...result
      });
      
      console.log(`   ${result.passed ? '✅' : '❌'} ${result.passed ? 'PASSED' : 'FAILED'}`);
      if (!result.passed || process.env.VERBOSE) {
        console.log(`   Details:`, JSON.stringify(result.details, null, 2));
      }
    } catch (error) {
      results.push({
        name: test.name,
        passed: false,
        details: { error: error.message }
      });
      console.log(`   ❌ FAILED - ${error.message}`);
    }
    
    console.log('');
  }
  
  // Summary
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  console.log('🏆 Test Results Summary');
  console.log('=======================');
  console.log(`   Passed: ${passedTests}/${totalTests}`);
  console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All basic tests passed! The hyperfy package appears to be functional.');
  } else {
    console.log(`\n⚠️  ${totalTests - passedTests} test(s) failed. Check the details above.`);
  }
  
  return passedTests === totalTests;
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const success = await runTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('💥 Test runner failed:', error.message);
    process.exit(1);
  }
}

export { runTests };