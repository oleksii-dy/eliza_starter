/**
 * Validation tests for new RPG scenarios
 * Tests basic functionality without running full scenarios
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createRealTestWorld, RealTestScenario } from '../real-world-factory';
import { ScenarioTestFramework } from '../../rpg/testing/ScenarioTestFramework';
import { 
  AggroChaseEscapeScenario,
  DeathRespawnRecoveryScenario,
  HealingFoodCombatScenario,
  MagicSpellCombatScenario
} from '../../rpg/testing/scenarios';
import type { World } from '../../types';

describe('RPG Scenario Validation', () => {
  let scenario: RealTestScenario;
  let world: World;
  let framework: ScenarioTestFramework;

  beforeEach(async () => {
    scenario = new RealTestScenario();
    await scenario.setup({ enablePhysics: false });
    world = scenario.world;
    framework = new ScenarioTestFramework(world);
  });

  afterEach(async () => {
    if (framework) {
      await framework.cleanup();
    }
    if (scenario) {
      await scenario.cleanup();
    }
  });

  test('All scenarios should be properly structured', () => {
    console.log('📋 Testing scenario structure...');
    
    const scenarios = [
      AggroChaseEscapeScenario,
      DeathRespawnRecoveryScenario,
      HealingFoodCombatScenario,
      MagicSpellCombatScenario
    ];
    
    expect(scenarios).toHaveLength(4);
    
    scenarios.forEach(scenario => {
      expect(scenario.id).toBeDefined();
      expect(scenario.name).toBeDefined();
      expect(scenario.description).toBeDefined();
      expect(scenario.setup).toBeDefined();
      expect(scenario.condition).toBeDefined();
      expect(scenario.cleanup).toBeDefined();
      expect(typeof scenario.setup).toBe('function');
      expect(typeof scenario.condition).toBe('function');
      expect(typeof scenario.cleanup).toBe('function');
      
      // Check for unique IDs
      const uniqueIds = new Set(scenarios.map(s => s.id));
      expect(uniqueIds.size).toBe(scenarios.length);
    });
    
    console.log('✅ All scenarios are properly structured');
  });

  test('RPGTestHelpers should work correctly', () => {
    console.log('🔧 Testing RPG helpers...');
    
    const helpers = framework.getRPGHelpers();
    expect(helpers).toBeDefined();
    expect(typeof helpers.spawnPlayer).toBe('function');
    expect(typeof helpers.spawnNPC).toBe('function');
    expect(typeof helpers.spawnItem).toBe('function');
    expect(typeof helpers.getTestEntity).toBe('function');
    expect(typeof helpers.removeTestEntity).toBe('function');
    expect(typeof helpers.updateEntityVisual).toBe('function');
    expect(typeof helpers.startCombat).toBe('function');
    
    console.log('✅ RPG helpers are properly configured');
  });

  test('Player spawning should work without physics', () => {
    console.log('👤 Testing player spawning...');
    
    const helpers = framework.getRPGHelpers();
    const player = helpers.spawnPlayer('test_player', {
      position: { x: 0, y: 1, z: 0 },
      stats: {
        hitpoints: { current: 100, max: 100 },
        attack: { level: 10, xp: 0 }
      },
      visualOverride: {
        color: '#00FFFF',
        size: { width: 1, height: 2, depth: 1 }
      }
    });
    
    expect(player).toBeTruthy();
    expect(player.type).toBe('test_player');
    expect(player.position.x).toBe(0);
    expect(player.position.y).toBe(1);
    expect(player.position.z).toBe(0);
    
    // Test retrieval
    const retrieved = helpers.getTestEntity('test_player');
    expect(retrieved).toBe(player);
    
    // Test removal
    const removed = helpers.removeTestEntity('test_player');
    expect(removed).toBe(true);
    
    // Should not be findable after removal
    const notFound = helpers.getTestEntity('test_player');
    expect(notFound).toBeUndefined();
    
    console.log('✅ Player spawning works correctly');
  });

  test('NPC spawning should work', () => {
    console.log('👹 Testing NPC spawning...');
    
    const helpers = framework.getRPGHelpers();
    const npc = helpers.spawnNPC('goblin', {
      position: { x: 5, y: 1, z: 5 },
      behavior: 'aggressive'
    });
    
    expect(npc).toBeTruthy();
    expect(npc.type).toBe('npc');
    
    console.log('✅ NPC spawning works correctly');
  });

  test('Item spawning should work', () => {
    console.log('📦 Testing item spawning...');
    
    const helpers = framework.getRPGHelpers();
    const item = helpers.spawnItem('sword', {
      position: { x: 2, y: 1, z: 2 }
    });
    
    expect(item).toBeTruthy();
    
    console.log('✅ Item spawning works correctly');
  });

  test('Scenario setup should complete without errors', async () => {
    console.log('⚙️ Testing scenario setup...');
    
    // Test that we can at least run setup for each scenario without crashes
    const scenarios = [
      AggroChaseEscapeScenario,
      DeathRespawnRecoveryScenario,
      HealingFoodCombatScenario,
      MagicSpellCombatScenario
    ];
    
    for (const testScenario of scenarios) {
      console.log(`  Testing setup for: ${testScenario.name}`);
      
      // Create a fresh framework for each test
      const tempFramework = new ScenarioTestFramework(world);
      
      try {
        // This should complete without throwing errors
        await testScenario.setup(tempFramework);
        console.log(`  ✅ ${testScenario.name} setup completed`);
        
        // Run cleanup
        await testScenario.cleanup(tempFramework);
        console.log(`  ✅ ${testScenario.name} cleanup completed`);
        
      } catch (error) {
        console.error(`  ❌ ${testScenario.name} failed:`, error);
        // Still try cleanup
        try {
          await testScenario.cleanup(tempFramework);
        } catch (cleanupError) {
          console.error(`  ❌ ${testScenario.name} cleanup failed:`, cleanupError);
        }
        throw error;
      } finally {
        await tempFramework.cleanup();
      }
    }
    
    console.log('✅ All scenario setups work correctly');
  }, 60000); // 1 minute timeout for this test

  test('Visual verification system should work', async () => {
    console.log('👁️ Testing visual verification...');
    
    const testResult = await framework.checkEntityVisual(
      'nonexistent_entity',
      '#FF0000',
      { x: 0, y: 0, z: 0 }
    );
    
    // Should return false for non-existent entity
    expect(testResult).toBe(false);
    
    console.log('✅ Visual verification system works correctly');
  });
});