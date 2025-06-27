// Simple test to validate StatsSystem implementation
import { StatsSystem } from './src/rpg/systems/StatsSystem.js';

// Mock world
const mockWorld = {
  entities: {
    players: new Map(),
    items: new Map(),
  },
  events: {
    emit: (event, data) => console.log('Event:', event, data),
    on: () => {},
    off: () => {},
  },
};

async function runTests() {
  console.log('🧪 Testing StatsSystem implementation...\n');
  
  const statsSystem = new StatsSystem(mockWorld);
  await statsSystem.init();
  
  // Test 1: XP table generation
  console.log('Test 1: XP Table Generation');
  console.log('  Level 1 XP:', statsSystem.getXPForLevel(1)); // Expected: 0
  console.log('  Level 2 XP:', statsSystem.getXPForLevel(2)); // Expected: 83
  console.log('  Level 10 XP:', statsSystem.getXPForLevel(10)); // Expected: 1154
  console.log('  Level 50 XP:', statsSystem.getXPForLevel(50)); // Expected: 101333
  console.log('  Level 99 XP:', statsSystem.getXPForLevel(99)); // Expected: 13034431
  console.log('');
  
  // Test 2: XP to level conversion
  console.log('Test 2: XP to Level Conversion');
  console.log('  0 XP = Level:', statsSystem.getLevelForXP(0)); // Expected: 1
  console.log('  83 XP = Level:', statsSystem.getLevelForXP(83)); // Expected: 2
  console.log('  1154 XP = Level:', statsSystem.getLevelForXP(1154)); // Expected: 10
  console.log('  13034431 XP = Level:', statsSystem.getLevelForXP(13034431)); // Expected: 99
  console.log('');
  
  // Test 3: Initial stats creation
  console.log('Test 3: Initial Stats Creation');
  const stats = statsSystem.createInitialStats();
  console.log('  Hitpoints level:', stats.hitpoints.level); // Expected: 10
  console.log('  Hitpoints current/max:', stats.hitpoints.current, '/', stats.hitpoints.max); // Expected: 100/100
  console.log('  Attack level:', stats.attack.level); // Expected: 1
  console.log('  Defence level:', stats.defence.level); // Expected: 1
  console.log('  Combat level:', stats.combatLevel); // Expected: 3
  console.log('  Total level:', stats.totalLevel); // Expected: 32
  console.log('');
  
  // Test 4: XP granting and level ups
  console.log('Test 4: XP Granting and Level Ups');
  const playerId = 'test-player';
  mockWorld.entities.players.set(playerId, { data: {} });
  
  // Grant enough XP to level up attack from 1 to 2
  statsSystem.grantXP(playerId, 'attack', 83, 'testing');
  
  const playerStats = statsSystem.getPlayerStats(playerId);
  console.log('  Attack level after XP:', playerStats?.attack.level); // Expected: 2
  console.log('  Attack XP:', playerStats?.attack.xp); // Expected: 83
  console.log('');
  
  // Test 5: Skill requirements
  console.log('Test 5: Skill Requirements');
  statsSystem.grantXP(playerId, 'mining', 1000, 'testing');
  statsSystem.grantXP(playerId, 'smithing', 500, 'testing');
  
  const requirements = { mining: 15, smithing: 10 };
  const meetsReqs = statsSystem.meetsRequirements(playerId, requirements);
  console.log('  Player stats after XP:');
  const finalStats = statsSystem.getPlayerStats(playerId);
  console.log('    Mining level:', finalStats?.mining.level);
  console.log('    Smithing level:', finalStats?.smithing.level);
  console.log('  Meets requirements:', meetsReqs);
  console.log('');
  
  console.log('✅ All tests completed!');
}

runTests().catch(console.error);