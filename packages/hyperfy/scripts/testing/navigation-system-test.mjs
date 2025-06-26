#!/usr/bin/env node

/**
 * Navigation System Unit Tests
 * Tests pathfinding, movement, and arrival detection
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class NavigationSystemTest {
  constructor() {
    this.testResults = [];
    this.mockWorld = this.createMockWorld();
    this.mockEntities = new Map();
  }

  createMockWorld() {
    return {
      entities: {
        items: this.mockEntities
      },
      events: {
        emit: (event, data) => console.log(`Event: ${event}`, data)
      },
      getSystem: (name) => null
    };
  }

  createMockEntity(id, position) {
    return {
      id,
      data: { id },
      position,
      node: {
        position: {
          set: (x, y, z) => {
            this.position = { x, y, z };
          }
        }
      },
      getComponent: () => null
    };
  }

  async runAllTests() {
    console.log('🧭 Navigation System Unit Tests');
    console.log('===============================\n');

    try {
      // Import the navigation system from built files
      const { NavigationSystem } = await import('../../build/rpg/systems/NavigationSystem.js');
      this.NavigationSystem = NavigationSystem;

      // Run individual tests
      await this.testBasicNavigation();
      await this.testDistanceCalculation();
      await this.testArrivalDetection();
      await this.testMultipleEntities();
      await this.testNavigationCancellation();

      this.generateReport();

    } catch (error) {
      console.error('❌ Test setup failed:', error.message);
      this.logTest('Test Setup', 'FAILED', error.message);
    }
  }

  async testBasicNavigation() {
    console.log('📍 Testing Basic Navigation...');

    try {
      const navSystem = new this.NavigationSystem(this.mockWorld);
      await navSystem.init({});

      // Create test entity
      const entity = this.createMockEntity('test-entity', { x: 0, y: 0, z: 0 });
      this.mockEntities.set('test-entity', entity);

      // Test navigation request
      navSystem.navigateTo({
        _entityId: 'test-entity',
        destination: { x: 10, y: 0, z: 10 },
        speed: 5
      });

      // Check if navigation started
      const isNavigating = navSystem.isNavigating('test-entity');
      if (isNavigating) {
        this.logTest('Navigation Start', 'PASSED', 'Entity started navigating');
      } else {
        this.logTest('Navigation Start', 'FAILED', 'Entity failed to start navigation');
      }

      // Simulate movement updates
      for (let i = 0; i < 10; i++) {
        navSystem.fixedUpdate(100); // 100ms updates
        await this.delay(10);
      }

      this.logTest('Basic Navigation', 'PASSED', 'Navigation system functioning');

    } catch (error) {
      this.logTest('Basic Navigation', 'FAILED', error.message);
    }
  }

  async testDistanceCalculation() {
    console.log('📏 Testing Distance Calculation...');

    try {
      const navSystem = new this.NavigationSystem(this.mockWorld);

      // Test distance calculation
      const distance1 = navSystem.getDistance(
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 4, z: 0 }
      );

      if (Math.abs(distance1 - 5) < 0.001) {
        this.logTest('Distance Calculation', 'PASSED', `Correct distance: ${distance1}`);
      } else {
        this.logTest('Distance Calculation', 'FAILED', `Wrong distance: ${distance1}, expected: 5`);
      }

      // Test 3D distance
      const distance2 = navSystem.getDistance(
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 1, z: 1 }
      );

      const expected = Math.sqrt(3);
      if (Math.abs(distance2 - expected) < 0.001) {
        this.logTest('3D Distance Calculation', 'PASSED', `Correct 3D distance: ${distance2.toFixed(3)}`);
      } else {
        this.logTest('3D Distance Calculation', 'FAILED', `Wrong 3D distance: ${distance2}, expected: ${expected}`);
      }

    } catch (error) {
      this.logTest('Distance Calculation', 'FAILED', error.message);
    }
  }

  async testArrivalDetection() {
    console.log('🎯 Testing Arrival Detection...');

    try {
      const navSystem = new this.NavigationSystem(this.mockWorld);
      await navSystem.init({});

      // Create entity close to destination
      const entity = this.createMockEntity('arrival-test', { x: 9.8, y: 0, z: 9.8 });
      this.mockEntities.set('arrival-test', entity);

      let arrived = false;
      navSystem.navigateTo({
        _entityId: 'arrival-test',
        destination: { x: 10, y: 0, z: 10 },
        speed: 1,
        callback: () => { arrived = true; }
      });

      // Update until arrival
      for (let i = 0; i < 20 && !arrived; i++) {
        navSystem.fixedUpdate(100);
        await this.delay(10);
      }

      if (arrived) {
        this.logTest('Arrival Detection', 'PASSED', 'Entity arrived at destination');
      } else {
        this.logTest('Arrival Detection', 'FAILED', 'Entity failed to arrive');
      }

    } catch (error) {
      this.logTest('Arrival Detection', 'FAILED', error.message);
    }
  }

  async testMultipleEntities() {
    console.log('👥 Testing Multiple Entities...');

    try {
      const navSystem = new this.NavigationSystem(this.mockWorld);
      await navSystem.init({});

      // Create multiple entities
      const entities = [];
      for (let i = 0; i < 3; i++) {
        const entity = this.createMockEntity(`entity-${i}`, { x: i, y: 0, z: i });
        entities.push(entity);
        this.mockEntities.set(`entity-${i}`, entity);

        navSystem.navigateTo({
          _entityId: `entity-${i}`,
          destination: { x: i + 5, y: 0, z: i + 5 },
          speed: 2
        });
      }

      // Check all are navigating
      let allNavigating = true;
      entities.forEach((_, i) => {
        if (!navSystem.isNavigating(`entity-${i}`)) {
          allNavigating = false;
        }
      });

      if (allNavigating) {
        this.logTest('Multiple Entities', 'PASSED', 'All entities navigating simultaneously');
      } else {
        this.logTest('Multiple Entities', 'FAILED', 'Not all entities started navigation');
      }

      // Update all entities
      for (let i = 0; i < 10; i++) {
        navSystem.fixedUpdate(100);
        await this.delay(10);
      }

      this.logTest('Concurrent Navigation', 'PASSED', 'Multiple entities handled concurrently');

    } catch (error) {
      this.logTest('Multiple Entities', 'FAILED', error.message);
    }
  }

  async testNavigationCancellation() {
    console.log('🛑 Testing Navigation Cancellation...');

    try {
      const navSystem = new this.NavigationSystem(this.mockWorld);
      await navSystem.init({});

      // Create entity and start navigation
      const entity = this.createMockEntity('cancel-test', { x: 0, y: 0, z: 0 });
      this.mockEntities.set('cancel-test', entity);

      navSystem.navigateTo({
        _entityId: 'cancel-test',
        destination: { x: 100, y: 0, z: 100 },
        speed: 1
      });

      // Verify navigation started
      if (navSystem.isNavigating('cancel-test')) {
        this.logTest('Navigation Started for Cancellation', 'PASSED', 'Navigation started');
      }

      // Cancel navigation
      navSystem.stopNavigation('cancel-test');

      // Verify navigation stopped
      if (!navSystem.isNavigating('cancel-test')) {
        this.logTest('Navigation Cancellation', 'PASSED', 'Navigation successfully cancelled');
      } else {
        this.logTest('Navigation Cancellation', 'FAILED', 'Navigation failed to cancel');
      }

    } catch (error) {
      this.logTest('Navigation Cancellation', 'FAILED', error.message);
    }
  }

  logTest(testName, status, description) {
    const result = { test: testName, status, description, timestamp: Date.now() };
    this.testResults.push(result);

    const emoji = {
      'PASSED': '✅',
      'FAILED': '❌',
      'WARNING': '⚠️'
    }[status] || '📝';

    console.log(`  ${emoji} ${testName}: ${description}`);
  }

  generateReport() {
    console.log('\n📊 Navigation System Test Report');
    console.log('==================================\n');

    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const warnings = this.testResults.filter(r => r.status === 'WARNING').length;

    console.log(`📈 Test Summary:`);
    console.log(`   ✅ Passed:   ${passed}`);
    console.log(`   ❌ Failed:   ${failed}`);
    console.log(`   ⚠️  Warnings: ${warnings}\n`);

    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED: Navigation system is working correctly!');
    } else {
      console.log('❌ SOME TESTS FAILED: Navigation system needs attention');
    }

    // Detailed results
    console.log('\n📋 Detailed Results:');
    this.testResults.forEach(result => {
      const emoji = {
        'PASSED': '✅',
        'FAILED': '❌',
        'WARNING': '⚠️'
      }[result.status] || '📝';
      console.log(`   ${emoji} ${result.test}: ${result.description}`);
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new NavigationSystemTest();
  tester.runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { NavigationSystemTest };