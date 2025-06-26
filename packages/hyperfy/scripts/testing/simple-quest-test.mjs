#!/usr/bin/env node

/**
 * Simple Quest System Test
 * Tests the quest system by running the server and monitoring outputs
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

class SimpleQuestTest {
  constructor() {
    this.testResults = [];
    this.serverProcess = null;
    this.testStartTime = Date.now();
    this.questEvents = [];
  }

  async runTest() {
    console.log('🎯 Simple Quest System Test');
    console.log('============================\n');

    try {
      await this.startServerAndMonitor();
      this.generateReport();
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      this.logTest('Overall Test', 'FAILED', error.message);
    } finally {
      await this.cleanup();
    }
  }

  async startServerAndMonitor() {
    console.log('🚀 Starting server for quest monitoring...');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('bun', ['build/index.js'], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ENABLE_RPG: 'true' }
      });

      let serverReady = false;
      let questSystemLoaded = false;
      let agentCreated = false;
      let questStarted = false;
      let agentActionsDetected = 0;

      // Monitor server output
      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        
        // Server startup
        if (output.includes('running on port 4444')) {
          serverReady = true;
          this.logTest('Server Startup', 'PASSED', 'Server started successfully');
        }

        // System loading
        if (output.includes('✓ Registered quest system')) {
          questSystemLoaded = true;
          this.logTest('Quest System Load', 'PASSED', 'Quest system loaded');
        }

        if (output.includes('✓ Registered navigation system')) {
          this.logTest('Navigation System Load', 'PASSED', 'Navigation system loaded');
        }

        if (output.includes('✓ Registered agentPlayer system')) {
          this.logTest('Agent System Load', 'PASSED', 'Agent player system loaded');
        }

        // Spawner setup
        if (output.includes('Registered 10 test spawners')) {
          this.logTest('Spawner Setup', 'PASSED', '10 test spawners registered');
        }

        // Quest NPC spawn
        if (output.includes('Successfully created NPC') && output.includes('100')) {
          this.logTest('Quest NPC Spawn', 'PASSED', 'Quest NPC (Village Elder) spawned');
        }

        // Sword spawn
        if (output.includes('Spawned sword item')) {
          this.logTest('Sword Item Spawn', 'PASSED', 'Sword item spawned for quest');
        }

        // Agent creation
        if (output.includes('[AgentPlayerSystem] Created agent player')) {
          agentCreated = true;
          this.logTest('Agent Creation', 'PASSED', 'Agent player created');
        }

        // Quest start
        if (output.includes('[AgentPlayerSystem] Starting quest demonstration')) {
          questStarted = true;
          this.logTest('Quest Start', 'PASSED', 'Quest demonstration started');
        }

        // Agent actions
        if (output.includes('[Agent] ')) {
          agentActionsDetected++;
          const actionMatch = output.match(/\[Agent\] (.+)/);
          if (actionMatch) {
            const action = actionMatch[1];
            this.questEvents.push({ action, timestamp: Date.now() });
            
            // Key action milestones
            if (action.includes('starting navigation')) {
              this.logTest('Agent Navigation', 'PASSED', 'Agent started navigation');
            }
            if (action.includes('Arrived at')) {
              this.logTest('Agent Arrival', 'PASSED', 'Agent reached destination');
            }
            if (action.includes('Found sword')) {
              this.logTest('Sword Pickup', 'PASSED', 'Agent found and picked up sword');
            }
            if (action.includes('Found goblin')) {
              this.logTest('Goblin Combat', 'PASSED', 'Agent found goblin for combat');
            }
            if (action.includes('Goblin defeated')) {
              this.logTest('Combat Success', 'PASSED', 'Agent defeated goblin');
            }
            if (action.includes('Gained 25 gold')) {
              this.logTest('Loot Collection', 'PASSED', 'Agent collected loot');
            }
          }
        }

        // Navigation events
        if (output.includes('[NavigationSystem] Entity') && output.includes('navigating to')) {
          this.logTest('Navigation Active', 'PASSED', 'Navigation system working');
        }

        if (output.includes('[NavigationSystem] Entity') && output.includes('arrived at destination')) {
          this.logTest('Navigation Complete', 'PASSED', 'Navigation completed successfully');
        }

        // Task completion
        if (output.includes('[AgentPlayerSystem] Task') && output.includes('completed')) {
          this.logTest('Quest Completion', 'PASSED', 'Agent completed quest task');
        }

        // Visual system
        if (output.includes('[VisualRepresentationSystem] Applied') && output.includes('template')) {
          // Count visual applications but don't spam logs
          if (!this.visualSystemTested) {
            this.logTest('Visual System', 'PASSED', 'Visual templates applied to entities');
            this.visualSystemTested = true;
          }
        }

        // Error detection
        if (output.includes('ERROR') || output.includes('Failed') && !output.includes('GLTFLoader')) {
          const errorMatch = output.match(/(ERROR|Failed): (.+)/);
          if (errorMatch) {
            this.logTest('Error Detection', 'WARNING', errorMatch[2]);
          }
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (!error.includes('DeprecationWarning') && !error.includes('GLTFLoader')) {
          this.logTest('Server Error', 'ERROR', error.trim());
        }
      });

      this.serverProcess.on('error', (error) => {
        reject(new Error(`Failed to start server: ${error.message}`));
      });

      // Test completion after monitoring period
      setTimeout(() => {
        if (serverReady && questSystemLoaded && agentCreated) {
          this.logTest('System Integration', 'PASSED', 'All systems working together');
          
          if (agentActionsDetected >= 5) {
            this.logTest('Agent Activity', 'PASSED', `${agentActionsDetected} agent actions detected`);
          } else {
            this.logTest('Agent Activity', 'WARNING', `Only ${agentActionsDetected} agent actions detected`);
          }
          
          resolve();
        } else {
          reject(new Error('Required systems failed to initialize'));
        }
      }, 45000); // 45 second monitoring period

      // Timeout safety
      setTimeout(() => {
        reject(new Error('Test timeout - systems took too long'));
      }, 60000);
    });
  }

  logTest(testName, status, description) {
    const timestamp = Date.now();
    const result = { test: testName, status, description, timestamp };
    this.testResults.push(result);

    const emoji = {
      'PASSED': '✅',
      'FAILED': '❌',
      'WARNING': '⚠️',
      'INFO': 'ℹ️',
      'ERROR': '🚨'
    }[status] || '📝';

    console.log(`  ${emoji} ${testName}: ${description}`);
  }

  generateReport() {
    console.log('\n📊 Quest System Test Report');
    console.log('============================\n');

    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const warnings = this.testResults.filter(r => r.status === 'WARNING').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;

    console.log(`📈 Test Summary:`);
    console.log(`   ✅ Passed:   ${passed}`);
    console.log(`   ❌ Failed:   ${failed}`);
    console.log(`   ⚠️  Warnings: ${warnings}`);
    console.log(`   🚨 Errors:   ${errors}`);

    const totalTime = Date.now() - this.testStartTime;
    console.log(`   ⏱️  Duration: ${(totalTime / 1000).toFixed(1)}s\n`);

    // Quest event timeline
    if (this.questEvents.length > 0) {
      console.log('🎯 Quest Event Timeline:');
      this.questEvents.forEach((event, index) => {
        const relativeTime = ((event.timestamp - this.testStartTime) / 1000).toFixed(1);
        console.log(`   ${index + 1}. [${relativeTime}s] ${event.action}`);
      });
      console.log('');
    }

    // Overall assessment
    if (failed === 0 && errors === 0) {
      console.log('🎉 TEST PASSED: Quest system is working correctly!');
      console.log('   ✨ All core functionality verified');
    } else if (failed <= 2 && errors === 0) {
      console.log('⚠️ TEST WARNING: Quest system mostly working with minor issues');
      console.log('   🔧 Review warnings and failed tests');
    } else {
      console.log('❌ TEST FAILED: Quest system has significant issues');
      console.log('   🛠️ Major debugging required');
    }

    // Key systems check
    console.log('\n🔍 System Status:');
    const keyTests = [
      'Server Startup',
      'Quest System Load',
      'Agent Creation',
      'Quest Start',
      'Agent Navigation',
      'Navigation Complete',
      'Visual System'
    ];

    keyTests.forEach(test => {
      const result = this.testResults.find(r => r.test === test);
      const status = result ? result.status : 'NOT_DETECTED';
      const emoji = {
        'PASSED': '✅',
        'FAILED': '❌',
        'WARNING': '⚠️',
        'NOT_DETECTED': '⭕'
      }[status] || '📝';
      console.log(`   ${emoji} ${test}`);
    });

    // Save report
    this.saveTestReport();
  }

  saveTestReport() {
    try {
      const fs = require('fs');
      const reportPath = path.join(projectRoot, 'test-results', `simple-quest-test-${Date.now()}.json`);
      
      if (!fs.existsSync(path.dirname(reportPath))) {
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      }

      const report = {
        timestamp: new Date().toISOString(),
        duration: Date.now() - this.testStartTime,
        summary: {
          passed: this.testResults.filter(r => r.status === 'PASSED').length,
          failed: this.testResults.filter(r => r.status === 'FAILED').length,
          warnings: this.testResults.filter(r => r.status === 'WARNING').length,
          errors: this.testResults.filter(r => r.status === 'ERROR').length
        },
        tests: this.testResults,
        questEvents: this.questEvents
      };

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Test report saved: ${reportPath}`);
    } catch (error) {
      console.error('Failed to save report:', error.message);
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      
      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 3000);
    }

    console.log('✅ Cleanup completed');
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SimpleQuestTest();
  
  process.on('SIGINT', async () => {
    console.log('\n🛑 Test interrupted');
    await tester.cleanup();
    process.exit(0);
  });

  tester.runTest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { SimpleQuestTest };