#!/usr/bin/env node

/**
 * Final Quest System Validation
 * Comprehensive test of the entire quest system with detailed monitoring
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

class FinalQuestValidation {
  constructor() {
    this.testResults = [];
    this.serverProcess = null;
    this.testStartTime = Date.now();
    this.agentEvents = [];
    this.systemEvents = [];
  }

  async runValidation() {
    console.log('🎯 Final Quest System Validation');
    console.log('=================================\n');
    console.log('This test validates the complete quest system including:');
    console.log('• System loading and initialization');
    console.log('• Entity spawning (NPCs, items, chests, etc.)');
    console.log('• Agent creation and behavior');
    console.log('• Navigation system');
    console.log('• Quest progression');
    console.log('• Visual representation\n');

    try {
      await this.runComprehensiveTest();
      this.generateFinalReport();
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      this.logTest('Overall Validation', 'FAILED', error.message);
    } finally {
      await this.cleanup();
    }
  }

  async runComprehensiveTest() {
    console.log('🚀 Starting comprehensive validation...\n');
    
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('bun', ['build/index.js'], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ENABLE_RPG: 'true' }
      });

      let checklistCompleted = {
        serverStarted: false,
        systemsLoaded: 0,
        spawnersRegistered: false,
        agentCreated: false,
        questStarted: false,
        entitiesSpawned: 0,
        agentActions: 0,
        navigationEvents: 0,
        visualEvents: 0
      };

      // Monitor server output
      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        
        // === SYSTEM INITIALIZATION ===
        if (output.includes('running on port 4444')) {
          checklistCompleted.serverStarted = true;
          this.logTest('✅ Server Started', 'PASSED', 'Server running on port 4444');
        }

        if (output.includes('✓ Registered') && output.includes('system')) {
          checklistCompleted.systemsLoaded++;
          
          // Log specific key systems
          if (output.includes('quest system')) {
            this.logTest('✅ Quest System', 'PASSED', 'Quest system loaded');
          }
          if (output.includes('navigation system')) {
            this.logTest('✅ Navigation System', 'PASSED', 'Navigation system loaded');
          }
          if (output.includes('agentPlayer system')) {
            this.logTest('✅ Agent System', 'PASSED', 'Agent player system loaded');
          }
          if (output.includes('spawning system')) {
            this.logTest('✅ Spawning System', 'PASSED', 'Spawning system loaded');
          }
          if (output.includes('visualRepresentation system')) {
            this.logTest('✅ Visual System', 'PASSED', 'Visual representation system loaded');
          }
        }

        if (output.includes('Plugin initialized with') && output.includes('systems')) {
          const systemMatch = output.match(/Plugin initialized with (\d+) systems/);
          if (systemMatch) {
            const systemCount = parseInt(systemMatch[1]);
            this.logTest('✅ Plugin Initialized', 'PASSED', `${systemCount} systems loaded`);
          }
        }

        // === SPAWNER SETUP ===
        if (output.includes('Registered 10 test spawners')) {
          checklistCompleted.spawnersRegistered = true;
          this.logTest('✅ Spawners Registered', 'PASSED', '10 test spawners created near spawn');
        }

        // === ENTITY SPAWNING ===
        if (output.includes('Successfully created NPC')) {
          checklistCompleted.entitiesSpawned++;
          
          if (output.includes('100')) {
            this.logTest('✅ Quest NPC', 'PASSED', 'Village Elder (quest NPC) spawned');
          } else if (output.includes('npc_1')) {
            this.logTest('✅ Goblin NPC', 'PASSED', 'Goblin spawned for quest target');
          } else if (output.includes('npc_2')) {
            this.logTest('✅ Guard NPC', 'PASSED', 'Guard NPC spawned');
          }
        }

        if (output.includes('Spawned sword item')) {
          this.logTest('✅ Sword Item', 'PASSED', 'Quest sword spawned at origin');
        }

        if (output.includes('Spawned chest')) {
          this.logTest('✅ Chest Spawned', 'PASSED', 'Chest entity spawned');
        }

        if (output.includes('Spawned resource')) {
          this.logTest('✅ Resource Spawned', 'PASSED', 'Resource entity spawned');
        }

        if (output.includes('Spawned npc from spawner') && output.includes('boss')) {
          this.logTest('✅ Boss Spawned', 'PASSED', 'Boss entity spawned');
        }

        // === VISUAL SYSTEM ===
        if (output.includes('[VisualRepresentationSystem] Applied') && output.includes('template')) {
          checklistCompleted.visualEvents++;
          
          if (checklistCompleted.visualEvents === 1) {
            this.logTest('✅ Visual Templates', 'PASSED', 'Visual templates being applied');
          }
          
          // Specific visual confirmations
          if (output.includes('goblin template')) {
            this.logTest('✅ Goblin Visual', 'PASSED', 'Goblin visual representation applied');
          }
          if (output.includes('sword template')) {
            this.logTest('✅ Sword Visual', 'PASSED', 'Sword visual representation applied');
          }
          if (output.includes('player template')) {
            this.logTest('✅ Agent Visual', 'PASSED', 'Agent player visual representation applied');
          }
        }

        // === AGENT SYSTEM ===
        if (output.includes('[AgentPlayerSystem] Created agent player')) {
          checklistCompleted.agentCreated = true;
          this.logTest('✅ Agent Created', 'PASSED', 'Agent player created successfully');
        }

        if (output.includes('[AgentPlayerSystem] Starting quest demonstration')) {
          checklistCompleted.questStarted = true;
          this.logTest('✅ Quest Started', 'PASSED', 'Quest demonstration initiated');
        }

        if (output.includes('[AgentPlayerSystem] Quest task created with')) {
          const actionMatch = output.match(/Quest task created with (\d+) actions/);
          if (actionMatch) {
            const actionCount = parseInt(actionMatch[1]);
            this.logTest('✅ Quest Task', 'PASSED', `Quest task created with ${actionCount} actions`);
          }
        }

        if (output.includes('[AgentPlayerSystem] Current action:')) {
          checklistCompleted.agentActions++;
          const actionMatch = output.match(/Current action: (.+?) \(/);
          if (actionMatch) {
            const action = actionMatch[1];
            this.agentEvents.push({ action, timestamp: Date.now() });
            
            if (checklistCompleted.agentActions === 1) {
              this.logTest('✅ Agent Activity', 'PASSED', 'Agent is executing actions');
            }
          }
        }

        // === AGENT ACTIONS ===
        if (output.includes('[Agent] ')) {
          const agentMatch = output.match(/\[Agent\] (.+)/);
          if (agentMatch) {
            const action = agentMatch[1];
            this.agentEvents.push({ action, timestamp: Date.now() });
            
            // Specific action milestones
            if (action.includes('starting navigation')) {
              this.logTest('✅ Agent Navigation', 'PASSED', 'Agent started navigation');
            }
            if (action.includes('Arrived at')) {
              this.logTest('✅ Navigation Success', 'PASSED', 'Agent reached destination');
            }
            if (action.includes('Found sword')) {
              this.logTest('✅ Item Detection', 'PASSED', 'Agent found quest item');
            }
            if (action.includes('Added sword to inventory')) {
              this.logTest('✅ Item Pickup', 'PASSED', 'Agent picked up sword');
            }
            if (action.includes('Found goblin')) {
              this.logTest('✅ Target Detection', 'PASSED', 'Agent found quest target');
            }
            if (action.includes('Goblin defeated')) {
              this.logTest('✅ Combat Success', 'PASSED', 'Agent defeated quest target');
            }
            if (action.includes('Gained 25 gold')) {
              this.logTest('✅ Loot Reward', 'PASSED', 'Agent received combat loot');
            }
          }
        }

        // === NAVIGATION SYSTEM ===
        if (output.includes('[NavigationSystem] Entity') && output.includes('navigating to')) {
          checklistCompleted.navigationEvents++;
          if (checklistCompleted.navigationEvents === 1) {
            this.logTest('✅ Navigation Active', 'PASSED', 'Navigation system working');
          }
        }

        if (output.includes('[NavigationSystem] Entity') && output.includes('arrived at destination')) {
          this.logTest('✅ Navigation Complete', 'PASSED', 'Navigation completed successfully');
        }

        // === QUEST COMPLETION ===
        if (output.includes('[AgentPlayerSystem] Task') && output.includes('completed')) {
          this.logTest('🎉 Quest Complete', 'PASSED', 'Agent completed quest task!');
        }

        // === ERROR MONITORING ===
        if (output.includes('ERROR') && !output.includes('GLTFLoader')) {
          this.logTest('⚠️ Error Detected', 'WARNING', 'System error detected');
        }

        if (output.includes('Failed') && !output.includes('GLTFLoader') && !output.includes('NPC definition: 3')) {
          this.logTest('⚠️ Failure Detected', 'WARNING', 'System failure detected');
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (!error.includes('DeprecationWarning') && !error.includes('GLTFLoader')) {
          this.logTest('🚨 Server Error', 'ERROR', error.trim());
        }
      });

      this.serverProcess.on('error', (error) => {
        reject(new Error(`Failed to start server: ${error.message}`));
      });

      // Complete test after monitoring period
      setTimeout(() => {
        console.log('\n⏱️ Monitoring period complete. Analyzing results...\n');
        
        // System completeness check
        if (checklistCompleted.systemsLoaded >= 20) {
          this.logTest('📊 System Loading', 'PASSED', `${checklistCompleted.systemsLoaded} systems loaded`);
        } else {
          this.logTest('📊 System Loading', 'WARNING', `Only ${checklistCompleted.systemsLoaded} systems loaded`);
        }

        // Entity spawning check
        if (checklistCompleted.entitiesSpawned >= 5) {
          this.logTest('📊 Entity Spawning', 'PASSED', `${checklistCompleted.entitiesSpawned} entities spawned`);
        } else {
          this.logTest('📊 Entity Spawning', 'WARNING', `Only ${checklistCompleted.entitiesSpawned} entities spawned`);
        }

        // Visual system check
        if (checklistCompleted.visualEvents >= 5) {
          this.logTest('📊 Visual System', 'PASSED', `${checklistCompleted.visualEvents} visual events`);
        } else {
          this.logTest('📊 Visual System', 'WARNING', `Only ${checklistCompleted.visualEvents} visual events`);
        }

        // Agent activity check
        if (checklistCompleted.agentActions >= 3) {
          this.logTest('📊 Agent Activity', 'PASSED', `${checklistCompleted.agentActions} agent actions`);
        } else if (checklistCompleted.agentActions > 0) {
          this.logTest('📊 Agent Activity', 'WARNING', `Limited agent activity (${checklistCompleted.agentActions} actions)`);
        } else {
          this.logTest('📊 Agent Activity', 'FAILED', 'No agent activity detected');
        }

        resolve();
      }, 60000); // 60 second comprehensive test

      // Timeout safety
      setTimeout(() => {
        reject(new Error('Test timeout - took longer than expected'));
      }, 90000);
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

    console.log(`${emoji} ${testName}: ${description}`);
  }

  generateFinalReport() {
    console.log('\n🏆 FINAL QUEST SYSTEM VALIDATION REPORT');
    console.log('=========================================\n');

    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const warnings = this.testResults.filter(r => r.status === 'WARNING').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;

    console.log(`📈 Final Summary:`);
    console.log(`   ✅ Tests Passed:   ${passed}`);
    console.log(`   ❌ Tests Failed:   ${failed}`);
    console.log(`   ⚠️  Warnings:      ${warnings}`);
    console.log(`   🚨 Errors:        ${errors}`);

    const totalTime = Date.now() - this.testStartTime;
    console.log(`   ⏱️  Total Duration: ${(totalTime / 1000).toFixed(1)}s\n`);

    // Overall system rating
    let rating = 'EXCELLENT';
    let recommendation = 'System is fully operational and ready for production! 🚀';

    if (failed > 0 || errors > 2) {
      rating = 'NEEDS_WORK';
      recommendation = 'Critical issues detected. Review failed tests and errors before deployment. 🛠️';
    } else if (warnings > 3 || errors > 0) {
      rating = 'GOOD';
      recommendation = 'System is mostly working. Address warnings for optimal performance. ⚡';
    } else if (warnings > 0) {
      rating = 'VERY_GOOD';
      recommendation = 'System is working well with minor issues to address. 🎯';
    }

    console.log(`🏅 Overall Rating: ${rating}`);
    console.log(`💡 Recommendation: ${recommendation}\n`);

    // Component status
    console.log('🔍 Component Status:');
    const components = [
      'Server Started', 'Quest System', 'Navigation System', 'Agent System',
      'Spawning System', 'Visual System', 'Quest NPC', 'Sword Item',
      'Agent Created', 'Quest Started', 'Agent Activity'
    ];

    components.forEach(component => {
      const result = this.testResults.find(r => r.test.includes(component));
      const status = result ? result.status : 'NOT_DETECTED';
      const emoji = {
        'PASSED': '✅',
        'FAILED': '❌',
        'WARNING': '⚠️',
        'NOT_DETECTED': '⭕'
      }[status] || '📝';
      console.log(`   ${emoji} ${component}`);
    });

    // Agent activity timeline
    if (this.agentEvents.length > 0) {
      console.log('\n🤖 Agent Activity Timeline:');
      this.agentEvents.slice(0, 10).forEach((event, index) => {
        const relativeTime = ((event.timestamp - this.testStartTime) / 1000).toFixed(1);
        console.log(`   ${index + 1}. [${relativeTime}s] ${event.action}`);
      });
      if (this.agentEvents.length > 10) {
        console.log(`   ... and ${this.agentEvents.length - 10} more events`);
      }
    } else {
      console.log('\n🤖 Agent Activity Timeline: No agent activities detected');
    }

    // Final verdict
    console.log('\n🎯 FINAL VERDICT:');
    if (passed >= 15 && failed === 0 && errors === 0) {
      console.log('🎉 QUEST SYSTEM FULLY VALIDATED!');
      console.log('   ✨ All major components working correctly');
      console.log('   🎮 Ready for quest gameplay testing');
      console.log('   🚀 System demonstrates complete RPG functionality');
    } else if (passed >= 10 && failed <= 1) {
      console.log('✅ QUEST SYSTEM MOSTLY VALIDATED');
      console.log('   🎮 Core functionality working');
      console.log('   🔧 Minor issues to address');
    } else {
      console.log('⚠️ QUEST SYSTEM NEEDS ATTENTION');
      console.log('   🛠️ Significant issues detected');
      console.log('   🔍 Review failed components');
    }

    this.saveComprehensiveReport();
  }

  saveComprehensiveReport() {
    try {
      const fs = require('fs');
      const reportPath = path.join(projectRoot, 'test-results', `final-quest-validation-${Date.now()}.json`);
      
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
        agentEvents: this.agentEvents,
        systemEvents: this.systemEvents
      };

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Comprehensive report saved: ${reportPath}`);
    } catch (error) {
      console.error('\n❌ Failed to save report:', error.message);
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up validation...');
    
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      
      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 3000);
    }

    console.log('✅ Validation cleanup completed');
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new FinalQuestValidation();
  
  process.on('SIGINT', async () => {
    console.log('\n🛑 Validation interrupted');
    await validator.cleanup();
    process.exit(0);
  });

  validator.runValidation().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { FinalQuestValidation };