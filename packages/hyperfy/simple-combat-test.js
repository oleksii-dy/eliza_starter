// Simple test to validate CombatSystem integration with StatsSystem
import { CombatSystem } from './src/rpg/systems/CombatSystem.js';
import { StatsSystem } from './src/rpg/systems/StatsSystem.js';

// Mock RPGEntity
const createMockRPGEntity = (id, data = {}) => {
  const components = new Map();
  
  const entity = {
    data: { id, ...data },
    components,
    position: data.position || { x: 0, y: 0, z: 0 },
    
    getComponent(type) {
      return components.get(type) || null;
    },
    
    hasComponent(type) {
      return components.has(type);
    },
    
    addComponent(type, componentData) {
      const component = componentData.type ? componentData : { type, entityId: id, ...componentData };
      components.set(type, component);
      return component;
    },
    
    removeComponent(type) {
      components.delete(type);
    }
  };
  
  return entity;
};

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
  systems: [],
};

async function runIntegrationTests() {
  console.log('⚔️ Testing CombatSystem + StatsSystem integration...\n');
  
  const combatSystem = new CombatSystem(mockWorld);
  const statsSystem = new StatsSystem(mockWorld);
  
  await combatSystem.init();
  await statsSystem.init();
  
  // Test 1: Combat component creation
  console.log('Test 1: Combat Component Creation');
  const entityId = 'test-combatant';
  const entity = createMockRPGEntity(entityId);
  mockWorld.entities.players.set(entityId, entity);
  
  const combat = combatSystem.getOrCreateCombatComponent(entityId);
  console.log('  Combat component created:', !!combat);
  console.log('  In combat:', combat.inCombat);
  console.log('  Auto retaliate:', combat.autoRetaliate);
  console.log('  Special attack energy:', combat.specialAttackEnergy);
  console.log('');
  
  // Test 2: Combat mechanics with stats
  console.log('Test 2: Combat Mechanics with Stats');
  const attackerId = 'attacker';
  const targetId = 'target';
  
  const attackerStats = statsSystem.createInitialStats();
  const targetStats = statsSystem.createInitialStats();
  
  // Boost attacker stats
  attackerStats.attack.level = 50;
  attackerStats.strength.level = 50;
  
  const attacker = createMockRPGEntity(attackerId, { 
    position: { x: 200, y: 0, z: 200 } // Outside safe zones
  });
  const target = createMockRPGEntity(targetId, { 
    position: { x: 201, y: 0, z: 200 } // Within attack range
  });
  
  // Add required components
  attacker.addComponent('stats', attackerStats);
  target.addComponent('stats', targetStats);
  
  attacker.addComponent('movement', {
    position: { x: 200, y: 0, z: 200 }
  });
  target.addComponent('movement', {
    position: { x: 201, y: 0, z: 200 }
  });
  
  attacker.addComponent('combat', {
    inCombat: false,
    target: null,
    lastAttackTime: 0,
    attackSpeed: 4,
    combatStyle: 'accurate',
    autoRetaliate: true,
    hitSplatQueue: [],
    animationQueue: [],
    specialAttackEnergy: 100,
    specialAttackActive: false,
    protectionPrayers: { melee: false, ranged: false, magic: false },
  });
  
  target.addComponent('combat', {
    inCombat: false,
    target: null,
    lastAttackTime: 0,
    attackSpeed: 4,
    combatStyle: 'accurate',
    autoRetaliate: true,
    hitSplatQueue: [],
    animationQueue: [],
    specialAttackEnergy: 100,
    specialAttackActive: false,
    protectionPrayers: { melee: false, ranged: false, magic: false },
  });
  
  // Add entities to world
  mockWorld.entities.players.set(attackerId, attacker);
  mockWorld.entities.players.set(targetId, target);
  mockWorld.entities.items.set(attackerId, attacker);
  mockWorld.entities.items.set(targetId, target);
  
  // Test combat initiation
  const combatResult = combatSystem.initiateAttack(attackerId, targetId);
  console.log('  Combat initiated:', combatResult);
  console.log('  Attacker in combat:', attacker.getComponent('combat').inCombat);
  console.log('');
  
  // Test 3: Combat calculations
  console.log('Test 3: Combat Calculations');
  const hit = combatSystem.calculateHit(attacker, target);
  console.log('  Hit result:', {
    damage: hit.damage,
    attackType: hit.attackType,
    attackerId: hit.attackerId,
    targetId: hit.targetId
  });
  console.log('');
  
  // Test 4: Combat XP
  console.log('Test 4: Combat XP Distribution');
  combatSystem.grantCombatXP(attackerId, 10, 'melee');
  console.log('  Combat XP events emitted (check above for rpg:xp_gain events)');
  console.log('');
  
  // Test 5: Special attack
  console.log('Test 5: Special Attack');
  const initialEnergy = attacker.getComponent('combat').specialAttackEnergy;
  console.log('  Initial special attack energy:', initialEnergy);
  
  // Regenerate special attack
  combatSystem.regenerateSpecialAttack();
  const regenEnergy = attacker.getComponent('combat').specialAttackEnergy;
  console.log('  Energy after regeneration:', regenEnergy);
  console.log('');
  
  console.log('✅ All integration tests completed!');
}

runIntegrationTests().catch(console.error);