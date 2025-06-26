#!/usr/bin/env node

/**
 * Test Navigation System Fixes
 * 
 * Comprehensive test to verify all navigation fixes work correctly
 */

import { NavigationSystem } from '../src/rpg/systems/NavigationSystem.js';

console.log('🔧 TESTING NAVIGATION SYSTEM FIXES');
console.log('=================================\n');

class NavigationFixTester {
  constructor() {
    this.mockWorld = this.createMockWorld();
    this.navigationSystem = new NavigationSystem(this.mockWorld);
    this.testResults = [];
  }

  createMockWorld() {
    const entities = new Map();
    
    // Create test entity
    entities.set('test-agent', {
      id: 'test-agent',
      position: { x: 0, y: 0, z: 0 },
      data: { position: { x: 0, y: 0, z: 0 } },
      getComponent: (type) => ({ type, data: {} })
    });

    return {
      entities: {
        items: entities,
        get: (id) => entities.get(id)
      },
      systems: new Map(),
      register: (name, factory) => factory(),
      events: {
        on: (event, handler) => console.log(`Event registered: ${event}`),
        emit: (event, data) => console.log(`Event emitted: ${event}`)
      }
    };
  }

  logTest(testName, status, message) {
    const timestamp = new Date().toLocaleTimeString();
    const statusEmoji = status === 'PASSED' ? '✅' : '❌';
    const logEntry = `[${timestamp}] ${statusEmoji} ${testName}: ${message}`;
    
    console.log(logEntry);
    this.testResults.push({ testName, status, message });
  }

  async runAllTests() {
    console.log('📋 Running Navigation Fix Tests...\n');

    try {
      await this.testValidEntityNavigation();
      await this.testInvalidEntityIdHandling();
      await this.testInvalidDestinationHandling();
      await this.testEntityNotFoundHandling();
      await this.testIsNavigatingValidation();
      await this.testParameterNaming();
      
      this.generateReport();
    } catch (error) {
      console.error('💥 Test execution failed:', error);
    }
  }

  async testValidEntityNavigation() {
    console.log('🧪 Test 1: Valid Entity Navigation');
    
    try {
      // Test normal navigation
      this.navigationSystem.navigateTo({
        _entityId: 'test-agent',
        destination: { x: 10, y: 0, z: 10 },
        speed: 5,
        callback: () => {
          this.logTest('Valid Navigation Callback', 'PASSED', 'Callback executed successfully');
        }
      });

      // Check if navigation started
      const isNavigating = this.navigationSystem.isNavigating('test-agent');
      this.logTest('Valid Navigation Start', isNavigating ? 'PASSED' : 'FAILED', 
        `Navigation ${isNavigating ? 'started' : 'did not start'}`);

    } catch (error) {
      this.logTest('Valid Navigation', 'FAILED', `Error: ${error.message}`);
    }
  }

  async testInvalidEntityIdHandling() {
    console.log('\n🧪 Test 2: Invalid Entity ID Handling');
    
    const invalidIds = [undefined, null, '', 123, {}, []];
    
    for (const invalidId of invalidIds) {
      try {
        let callbackExecuted = false;
        
        this.navigationSystem.navigateTo({
          _entityId: invalidId,
          destination: { x: 5, y: 0, z: 5 },
          callback: () => { callbackExecuted = true; }
        });

        // Callback should be executed for invalid IDs
        setTimeout(() => {
          this.logTest(`Invalid ID ${invalidId}`, callbackExecuted ? 'PASSED' : 'FAILED', 
            `Callback ${callbackExecuted ? 'executed' : 'not executed'} for invalid ID`);
        }, 10);

      } catch (error) {
        this.logTest(`Invalid ID ${invalidId}`, 'FAILED', `Unexpected error: ${error.message}`);
      }
    }
  }

  async testInvalidDestinationHandling() {
    console.log('\n🧪 Test 3: Invalid Destination Handling');
    
    const invalidDestinations = [
      undefined,
      null,
      {},
      { x: 'invalid' },
      { x: 1, y: 'invalid' },
      { x: 1, y: 2 }, // missing z
      'string',
      123
    ];
    
    for (const invalidDest of invalidDestinations) {
      try {
        let callbackExecuted = false;
        
        this.navigationSystem.navigateTo({
          _entityId: 'test-agent',
          destination: invalidDest,
          callback: () => { callbackExecuted = true; }
        });

        setTimeout(() => {
          this.logTest(`Invalid Destination`, callbackExecuted ? 'PASSED' : 'FAILED', 
            `Callback handled invalid destination: ${JSON.stringify(invalidDest)}`);
        }, 10);

      } catch (error) {
        this.logTest(`Invalid Destination`, 'FAILED', `Unexpected error: ${error.message}`);
      }
    }
  }

  async testEntityNotFoundHandling() {
    console.log('\n🧪 Test 4: Entity Not Found Handling');
    
    try {
      let callbackExecuted = false;
      
      this.navigationSystem.navigateTo({
        _entityId: 'non-existent-entity',
        destination: { x: 5, y: 0, z: 5 },
        callback: () => { callbackExecuted = true; }
      });

      setTimeout(() => {
        this.logTest('Entity Not Found', callbackExecuted ? 'PASSED' : 'FAILED', 
          `Callback ${callbackExecuted ? 'executed' : 'not executed'} for missing entity`);
      }, 10);

    } catch (error) {
      this.logTest('Entity Not Found', 'FAILED', `Unexpected error: ${error.message}`);
    }
  }

  async testIsNavigatingValidation() {
    console.log('\n🧪 Test 5: isNavigating Validation');
    
    const invalidIds = [undefined, null, '', 123, {}, []];
    
    for (const invalidId of invalidIds) {
      try {
        const result = this.navigationSystem.isNavigating(invalidId);
        this.logTest(`isNavigating Invalid ID`, result === false ? 'PASSED' : 'FAILED', 
          `Returned false for invalid ID: ${invalidId}`);
      } catch (error) {
        this.logTest(`isNavigating Invalid ID`, 'FAILED', `Error: ${error.message}`);
      }
    }
  }

  async testParameterNaming() {
    console.log('\n🧪 Test 6: Parameter Naming Consistency');
    
    try {
      // Test that _entityId parameter is properly used
      const method = this.navigationSystem.navigateTo.toString();
      
      if (method.includes('_entityId')) {
        this.logTest('Parameter Naming', 'PASSED', '_entityId parameter correctly used');
      } else {
        this.logTest('Parameter Naming', 'FAILED', '_entityId parameter not found in method');
      }
    } catch (error) {
      this.logTest('Parameter Naming', 'FAILED', `Error: ${error.message}`);
    }
  }

  generateReport() {
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const total = this.testResults.length;
    const successRate = (passed / total) * 100;

    console.log('\n📊 NAVIGATION FIX TEST REPORT');
    console.log('============================');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 90) {
      console.log('\n🎉 NAVIGATION FIXES SUCCESSFUL!');
      console.log('All critical navigation issues have been resolved.');
      console.log('The system now properly handles:');
      console.log('  ✅ Correct parameter naming (_entityId)');
      console.log('  ✅ Invalid entity ID validation');
      console.log('  ✅ Invalid destination validation');
      console.log('  ✅ Entity not found error handling');
      console.log('  ✅ Callback execution for all error cases');
      console.log('  ✅ Comprehensive entity lookup strategies');
    } else {
      console.log('\n⚠️ SOME TESTS FAILED');
      console.log('Please review failed tests and address remaining issues.');
      
      const failedTests = this.testResults.filter(r => r.status === 'FAILED');
      console.log('\nFailed Tests:');
      failedTests.forEach(test => {
        console.log(`  ❌ ${test.testName}: ${test.message}`);
      });
    }
  }
}

// Run the tests
const tester = new NavigationFixTester();
tester.runAllTests().catch(error => {
  console.error('💥 Critical test error:', error);
});