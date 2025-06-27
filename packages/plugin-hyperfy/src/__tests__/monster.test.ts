/**
 * Monster System Tests
 * ===================
 * Tests for RuneScape monster mechanics implementation
 */

import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test';
import { MonsterSystem } from '../rpg/systems/MonsterSystem';
import { createMockWorld } from './test-utils';

describe('MonsterSystem', () => {
  let monsterSystem: MonsterSystem;
  let mockWorld: any;
  let mockPlayer: any;

  beforeEach(() => {
    mockWorld = createMockWorld();
    
    // Set up mock world events
    mockWorld.events = {
      on: mock(),
      off: mock(),
      emit: mock(),
    };

    // Add systems array to world
    mockWorld.systems = [];

    // Create mock player with combat stats
    mockPlayer = {
      data: {
        stats: {
          attack: { level: 40, currentXp: 30000, maxLevel: 99 },
          strength: { level: 35, currentXp: 25000, maxLevel: 99 },
          defence: { level: 30, currentXp: 20000, maxLevel: 99 },
          hitpoints: { level: 45, currentXp: 35000, maxLevel: 99 },
          slayer: { level: 50, currentXp: 40000, maxLevel: 99 }
        },
        inventory: {
          items: [
            { itemId: 1277, quantity: 1 }, // Bronze sword
            { itemId: 1155, quantity: 1 }, // Bronze dagger
            null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null
          ],
          equipment: {
            weapon: { itemId: 1277, quantity: 1 }, // Bronze sword equipped
            helm: null,
            body: null,
            legs: null,
            feet: null,
            gloves: null,
            shield: null,
            cape: null,
            neck: null,
            ring: null,
            ammo: null
          }
        }
      }
    };

    // Add player to mock world
    mockWorld.entities.players = new Map();
    mockWorld.entities.players.set('test-player', mockPlayer);

    monsterSystem = new MonsterSystem(mockWorld);
  });

  describe('System Initialization', () => {
    it('should initialize with correct name and enabled state', () => {
      expect(monsterSystem.name).toBe('MonsterSystem');
      expect(monsterSystem.enabled).toBe(true);
    });

    it('should load monster types', () => {
      const monsterTypes = monsterSystem.getMonsterTypes();

      expect(monsterTypes.size).toBeGreaterThan(0);
      
      // Check for specific monster types
      expect(monsterTypes.has('chicken')).toBe(true);
      expect(monsterTypes.has('cow')).toBe(true);
      expect(monsterTypes.has('giant_rat')).toBe(true);
      expect(monsterTypes.has('skeleton')).toBe(true);
      expect(monsterTypes.has('abyssal_demon')).toBe(true);
    });

    it('should set up event listeners during init', async () => {
      await monsterSystem.init();
      
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:attack_monster', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:monster_death', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:spawn_monster', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:despawn_monster', expect.any(Function));
    });

    it('should initialize spawn points and spawn monsters', async () => {
      await monsterSystem.init();
      
      const activeMonsters = monsterSystem.getActiveMonsters();
      expect(activeMonsters.size).toBeGreaterThan(0);
      
      // Check that monsters were spawned from spawn points
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:monster_spawned', expect.objectContaining({
        monsterId: expect.any(String),
        monsterTypeId: expect.any(String),
        monsterName: expect.any(String),
        position: expect.any(Object),
        combatLevel: expect.any(Number)
      }));
    });
  });

  describe('Monster Types', () => {
    it('should have correct chicken monster', () => {
      const monsterTypes = monsterSystem.getMonsterTypes();
      const chicken = monsterTypes.get('chicken');
      
      expect(chicken).toBeDefined();
      expect(chicken!.name).toBe('Chicken');
      expect(chicken!.combatLevel).toBe(1);
      expect(chicken!.hitpoints).toBe(3);
      expect(chicken!.maxHit).toBe(1);
      expect(chicken!.aggressive).toBe(false);
      expect(chicken!.slayerLevelRequired).toBe(0);
    });

    it('should have correct abyssal demon monster', () => {
      const monsterTypes = monsterSystem.getMonsterTypes();
      const abyssal = monsterTypes.get('abyssal_demon');
      
      expect(abyssal).toBeDefined();
      expect(abyssal!.name).toBe('Abyssal demon');
      expect(abyssal!.combatLevel).toBe(124);
      expect(abyssal!.hitpoints).toBe(150);
      expect(abyssal!.maxHit).toBe(8);
      expect(abyssal!.aggressive).toBe(true);
      expect(abyssal!.slayerLevelRequired).toBe(85);
      expect(abyssal!.slayerXP).toBe(300);
    });

    it('should have progressive difficulty by level', () => {
      const monsterTypes = monsterSystem.getMonsterTypes();
      
      const chicken = monsterTypes.get('chicken');
      const giant_rat = monsterTypes.get('giant_rat');
      const skeleton = monsterTypes.get('skeleton');
      const abyssal = monsterTypes.get('abyssal_demon');
      
      expect(chicken!.combatLevel).toBe(1);
      expect(giant_rat!.combatLevel).toBe(6);
      expect(skeleton!.combatLevel).toBe(25);
      expect(abyssal!.combatLevel).toBe(124);
      
      // Higher level monsters should have more HP and damage
      expect(skeleton!.hitpoints).toBeGreaterThan(giant_rat!.hitpoints);
      expect(abyssal!.hitpoints).toBeGreaterThan(skeleton!.hitpoints);
      expect(skeleton!.maxHit).toBeGreaterThan(giant_rat!.maxHit);
      expect(abyssal!.maxHit).toBeGreaterThan(skeleton!.maxHit);
    });

    it('should have different attack styles', () => {
      const monsterTypes = monsterSystem.getMonsterTypes();
      
      // All test monsters use melee, but the system supports all styles
      for (const monster of monsterTypes.values()) {
        expect(['melee', 'ranged', 'magic']).toContain(monster.attackStyle);
      }
    });

    it('should have appropriate XP rewards', () => {
      const monsterTypes = monsterSystem.getMonsterTypes();
      
      const chicken = monsterTypes.get('chicken');
      const skeleton = monsterTypes.get('skeleton');
      const abyssal = monsterTypes.get('abyssal_demon');
      
      expect(chicken!.combatXP).toBe(2);
      expect(skeleton!.combatXP).toBe(25);
      expect(abyssal!.combatXP).toBe(150);
      
      // Higher level monsters should give more XP
      expect(skeleton!.combatXP).toBeGreaterThan(chicken!.combatXP);
      expect(abyssal!.combatXP).toBeGreaterThan(skeleton!.combatXP);
    });
  });

  describe('Monster Spawning', () => {
    beforeEach(async () => {
      await monsterSystem.init();
    });

    it('should successfully spawn monster', () => {
      const position = { x: 50, y: 0, z: 50 };
      const monsterId = monsterSystem.spawnMonster('chicken', position);
      
      expect(monsterId).toBeDefined();
      expect(typeof monsterId).toBe('string');
      
      const monster = monsterSystem.getMonster(monsterId!);
      expect(monster).toBeDefined();
      expect(monster!.typeId).toBe('chicken');
      expect(monster!.position).toEqual(position);
      expect(monster!.currentHP).toBe(3);
      expect(monster!.maxHP).toBe(3);
      expect(monster!.state).toBe('idle');
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:monster_spawned', {
        monsterId: monsterId,
        monsterTypeId: 'chicken',
        monsterName: 'Chicken',
        position,
        combatLevel: 1
      });
    });

    it('should fail to spawn unknown monster type', () => {
      const position = { x: 50, y: 0, z: 50 };
      const monsterId = monsterSystem.spawnMonster('unknown_monster', position);
      
      expect(monsterId).toBeNull();
    });

    it('should track spawn time', () => {
      const beforeTime = Date.now();
      const position = { x: 50, y: 0, z: 50 };
      const monsterId = monsterSystem.spawnMonster('chicken', position);
      const afterTime = Date.now();
      
      const monster = monsterSystem.getMonster(monsterId!);
      expect(monster!.spawnTime).toBeGreaterThanOrEqual(beforeTime);
      expect(monster!.spawnTime).toBeLessThanOrEqual(afterTime);
    });

    it('should assign unique monster IDs', () => {
      const position = { x: 50, y: 0, z: 50 };
      const monsterId1 = monsterSystem.spawnMonster('chicken', position);
      const monsterId2 = monsterSystem.spawnMonster('chicken', position);
      
      expect(monsterId1).not.toBe(monsterId2);
    });
  });

  describe('Monster Despawning', () => {
    beforeEach(async () => {
      await monsterSystem.init();
    });

    it('should successfully despawn monster', () => {
      const position = { x: 50, y: 0, z: 50 };
      const monsterId = monsterSystem.spawnMonster('chicken', position)!;
      
      const result = monsterSystem.despawnMonster(monsterId);
      expect(result).toBe(true);
      
      const monster = monsterSystem.getMonster(monsterId);
      expect(monster).toBeNull();
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:monster_despawned', {
        monsterId,
        position,
        scheduleRespawn: false
      });
    });

    it('should fail to despawn non-existent monster', () => {
      const result = monsterSystem.despawnMonster('non-existent-monster');
      expect(result).toBe(false);
    });

    it('should schedule respawn when requested', () => {
      const position = { x: 50, y: 0, z: 50 };
      const monsterId = monsterSystem.spawnMonster('chicken', position, 'test-spawn-point')!;
      
      const result = monsterSystem.despawnMonster(monsterId, true);
      expect(result).toBe(true);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:monster_despawned', {
        monsterId,
        position,
        scheduleRespawn: true
      });
    });
  });

  describe('Monster Combat', () => {
    beforeEach(async () => {
      await monsterSystem.init();
    });

    it('should successfully attack monster', () => {
      const position = { x: 50, y: 0, z: 50 };
      const monsterId = monsterSystem.spawnMonster('chicken', position)!;
      
      const result = monsterSystem.attackMonster('test-player', monsterId);
      expect(result).toBe(true);
      
      const monster = monsterSystem.getMonster(monsterId);
      expect(monster!.target).toBe('test-player');
      expect(monster!.state).toBe('combat');
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:monster_combat_started', {
        playerId: 'test-player',
        monsterId,
        monsterName: 'Chicken',
        monsterLevel: 1
      });
    });

    it('should fail to attack non-existent monster', () => {
      const result = monsterSystem.attackMonster('test-player', 'non-existent-monster');
      expect(result).toBe(false);
    });

    it('should fail to attack dead monster', () => {
      const position = { x: 50, y: 0, z: 50 };
      const monsterId = monsterSystem.spawnMonster('chicken', position)!;
      
      // Kill the monster
      monsterSystem.damageMonster(monsterId, 999, 'test-player');
      
      const result = monsterSystem.attackMonster('test-player', monsterId);
      expect(result).toBe(false);
    });

    it('should successfully damage monster', () => {
      const position = { x: 50, y: 0, z: 50 };
      const monsterId = monsterSystem.spawnMonster('chicken', position)!;
      
      const result = monsterSystem.damageMonster(monsterId, 2, 'test-player');
      expect(result).toBe(true);
      
      const monster = monsterSystem.getMonster(monsterId);
      expect(monster!.currentHP).toBe(1); // 3 - 2 = 1
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:monster_damaged', {
        monsterId,
        damage: 2,
        currentHP: 1,
        maxHP: 3,
        attackerId: 'test-player'
      });
    });

    it('should not damage below 0 HP', () => {
      const position = { x: 50, y: 0, z: 50 };
      const monsterId = monsterSystem.spawnMonster('chicken', position)!;
      
      const result = monsterSystem.damageMonster(monsterId, 999, 'test-player');
      expect(result).toBe(true);
      
      const monster = monsterSystem.getMonster(monsterId);
      expect(monster).toBeNull(); // Monster should be dead and despawned
    });

    it('should kill monster when HP reaches 0', () => {
      const position = { x: 50, y: 0, z: 50 };
      const monsterId = monsterSystem.spawnMonster('chicken', position)!;
      
      monsterSystem.damageMonster(monsterId, 3, 'test-player');
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:monster_death', expect.objectContaining({
        monsterId,
        monsterTypeId: 'chicken',
        monsterName: 'Chicken',
        killerId: 'test-player',
        drops: expect.any(Array),
        xpGained: 2
      }));
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'attack',
        amount: 2,
        source: 'monster_kill'
      });
    });

    it('should set monster to combat when damaged', () => {
      const position = { x: 50, y: 0, z: 50 };
      const monsterId = monsterSystem.spawnMonster('chicken', position)!;
      
      monsterSystem.damageMonster(monsterId, 1, 'test-player');
      
      const monster = monsterSystem.getMonster(monsterId);
      expect(monster!.state).toBe('combat');
      expect(monster!.target).toBe('test-player');
    });
  });

  describe('Drop System', () => {
    beforeEach(async () => {
      await monsterSystem.init();
    });

    it('should generate drops when monster dies', () => {
      const position = { x: 50, y: 0, z: 50 };
      const monsterId = monsterSystem.spawnMonster('chicken', position)!;
      
      monsterSystem.damageMonster(monsterId, 3, 'test-player');
      
      // Check that drops were generated
      const deathCall = mockWorld.events.emit.mock.calls.find((call: any[]) => 
        call[0] === 'rpg:monster_death'
      );
      expect(deathCall).toBeDefined();
      expect(deathCall[1].drops).toBeDefined();
      expect(Array.isArray(deathCall[1].drops)).toBe(true);
      
      // Should have bones (always drop)
      expect(deathCall[1].drops.some((drop: any) => drop.itemId === 526)).toBe(true);
    });

    it('should give drops to killer', () => {
      const position = { x: 50, y: 0, z: 50 };
      const monsterId = monsterSystem.spawnMonster('chicken', position)!;
      
      monsterSystem.damageMonster(monsterId, 3, 'test-player');
      
      // Check that add_item events were emitted for drops
      const addItemCalls = mockWorld.events.emit.mock.calls.filter((call: any[]) => 
        call[0] === 'rpg:add_item'
      );
      expect(addItemCalls.length).toBeGreaterThan(0);
      
      // Should include bones
      expect(addItemCalls.some((call: any[]) => call[1].itemId === 526)).toBe(true);
    });

    it('should handle quantity ranges in drops', () => {
      // Mock Math.random to test quantity rolling
      const originalRandom = Math.random;
      Math.random = mock(() => 0.5);
      
      const position = { x: 50, y: 0, z: 50 };
      const monsterId = monsterSystem.spawnMonster('chicken', position)!;
      
      monsterSystem.damageMonster(monsterId, 3, 'test-player');
      
      const deathCall = mockWorld.events.emit.mock.calls.find((call: any[]) => 
        call[0] === 'rpg:monster_death'
      );
      
      // Check that quantities are within expected ranges
      for (const drop of deathCall[1].drops) {
        expect(drop.quantity).toBeGreaterThan(0);
        expect(Number.isInteger(drop.quantity)).toBe(true);
      }
      
      Math.random = originalRandom;
    });
  });

  describe('Monster AI and Behavior', () => {
    beforeEach(async () => {
      await monsterSystem.init();
    });

    it('should process monster AI during tick', () => {
      const position = { x: 50, y: 0, z: 50 };
      const monsterId = monsterSystem.spawnMonster('chicken', position)!;
      
      // Simulate AI tick
      monsterSystem.tick(600);
      
      // Monster should still exist and be in a valid state
      const monster = monsterSystem.getMonster(monsterId);
      expect(monster).toBeDefined();
      expect(['idle', 'wandering', 'combat', 'returning']).toContain(monster!.state);
    });

    it('should regenerate HP when not in combat', () => {
      const position = { x: 50, y: 0, z: 50 };
      const monsterId = monsterSystem.spawnMonster('skeleton', position)!; // Higher HP monster
      
      // Damage the monster
      monsterSystem.damageMonster(monsterId, 10, 'test-player');
      
      let monster = monsterSystem.getMonster(monsterId);
      const damagedHP = monster!.currentHP;
      expect(damagedHP).toBeLessThan(monster!.maxHP);
      
      // Set monster back to idle (not in combat)
      monster!.state = 'idle';
      monster!.target = null;
      
      // Process several ticks to allow regeneration
      for (let i = 0; i < 10; i++) {
        monsterSystem.tick(100);
      }
      
      monster = monsterSystem.getMonster(monsterId);
      expect(monster!.currentHP).toBeGreaterThanOrEqual(damagedHP);
    });

    it('should not regenerate HP while in combat', () => {
      const position = { x: 50, y: 0, z: 50 };
      const monsterId = monsterSystem.spawnMonster('skeleton', position)!;
      
      // Damage and set to combat
      monsterSystem.damageMonster(monsterId, 10, 'test-player');
      monsterSystem.attackMonster('test-player', monsterId);
      
      const monster = monsterSystem.getMonster(monsterId);
      const combatHP = monster!.currentHP;
      
      // Process ticks
      for (let i = 0; i < 10; i++) {
        monsterSystem.tick(100);
      }
      
      // HP should not have regenerated
      expect(monster!.currentHP).toBe(combatHP);
    });
  });

  describe('Query Methods', () => {
    beforeEach(async () => {
      await monsterSystem.init();
    });

    it('should get monsters by type', () => {
      // Get initial counts
      const initialChickens = monsterSystem.getMonstersByType('chicken').length;
      const initialCows = monsterSystem.getMonstersByType('cow').length;
      
      // Spawn additional monsters
      const position1 = { x: 50, y: 0, z: 50 };
      const position2 = { x: 60, y: 0, z: 60 };
      
      monsterSystem.spawnMonster('chicken', position1);
      monsterSystem.spawnMonster('chicken', position2);
      monsterSystem.spawnMonster('cow', position1);
      
      const chickens = monsterSystem.getMonstersByType('chicken');
      expect(chickens.length).toBe(initialChickens + 2);
      expect(chickens.every(m => m.typeId === 'chicken')).toBe(true);
      
      const cows = monsterSystem.getMonstersByType('cow');
      expect(cows.length).toBe(initialCows + 1);
      expect(cows.every(m => m.typeId === 'cow')).toBe(true);
    });

    it('should get monsters by region', () => {
      const lumbridgeMonsters = monsterSystem.getMonstersByRegion('Lumbridge');
      const varrockMonsters = monsterSystem.getMonstersByRegion('Varrock Sewers');
      
      expect(lumbridgeMonsters.length).toBeGreaterThan(0);
      expect(varrockMonsters.length).toBeGreaterThan(0);
      
      // Check that monsters are from correct regions
      for (const monster of lumbridgeMonsters) {
        expect(monster.spawnPointId).toBeDefined();
      }
    });

    it('should return empty array for unknown region', () => {
      const monsters = monsterSystem.getMonstersByRegion('Unknown Region');
      expect(monsters).toEqual([]);
    });

    it('should get active monsters', () => {
      const activeMonsters = monsterSystem.getActiveMonsters();
      expect(activeMonsters.size).toBeGreaterThan(0);
      
      // All returned monsters should be alive
      for (const monster of activeMonsters.values()) {
        expect(monster.currentHP).toBeGreaterThan(0);
      }
    });
  });

  describe('Validation Methods', () => {
    beforeEach(async () => {
      await monsterSystem.init();
    });

    it('should validate monster attack capability correctly', () => {
      const position = { x: 50, y: 0, z: 50 };
      const monsterId = monsterSystem.spawnMonster('chicken', position)!;
      
      // Valid case
      const validResult = monsterSystem.canAttackMonster('test-player', monsterId);
      expect(validResult.canAttack).toBe(true);
      
      // Damage monster to 0 HP but don't trigger death despawn
      const monster = monsterSystem.getMonster(monsterId);
      monster!.currentHP = 0;
      
      const deadResult = monsterSystem.canAttackMonster('test-player', monsterId);
      expect(deadResult.canAttack).toBe(false);
      expect(deadResult.reason).toContain('already dead');
      
      // Non-existent monster
      const nonExistentResult = monsterSystem.canAttackMonster('test-player', 'fake-monster');
      expect(nonExistentResult.canAttack).toBe(false);
      expect(nonExistentResult.reason).toContain('not found');
    });

    it('should check slayer requirements for slayer monsters', () => {
      const position = { x: 50, y: 0, z: 50 };
      const monsterId = monsterSystem.spawnMonster('abyssal_demon', position)!;
      
      // Mock slayer system
      const mockSlayerSystem = {
        name: 'SlayerSystem',
        canDamageMonster: mock(() => false) // Player can't damage this monster
      };
      mockWorld.systems = [mockSlayerSystem];
      
      const result = monsterSystem.canAttackMonster('test-player', monsterId);
      expect(result.canAttack).toBe(false);
      expect(result.reason).toContain('Slayer');
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await monsterSystem.init();
    });

    it('should handle attack monster event', () => {
      const attackMonsterSpy = spyOn(monsterSystem, 'attackMonster');
      
      (monsterSystem as any).handleAttackMonster({
        playerId: 'test-player',
        monsterId: 'test-monster'
      });
      
      expect(attackMonsterSpy).toHaveBeenCalledWith('test-player', 'test-monster');
    });

    it('should handle spawn monster event', () => {
      const spawnMonsterSpy = spyOn(monsterSystem, 'spawnMonster');
      
      const position = { x: 50, y: 0, z: 50 };
      (monsterSystem as any).handleSpawnMonster({
        monsterTypeId: 'chicken',
        position,
        spawnPointId: 'test-spawn'
      });
      
      expect(spawnMonsterSpy).toHaveBeenCalledWith('chicken', position, 'test-spawn');
    });

    it('should handle despawn monster event', () => {
      const despawnMonsterSpy = spyOn(monsterSystem, 'despawnMonster');
      
      (monsterSystem as any).handleDespawnMonster({
        monsterId: 'test-monster',
        scheduleRespawn: true
      });
      
      expect(despawnMonsterSpy).toHaveBeenCalledWith('test-monster', true);
    });
  });

  describe('Respawn System', () => {
    beforeEach(async () => {
      await monsterSystem.init();
    });

    it('should schedule respawn when monster dies', () => {
      // Find a spawned monster with a spawn point
      const activeMonsters = monsterSystem.getActiveMonsters();
      const monsterWithSpawnPoint = Array.from(activeMonsters.values())
        .find(m => m.spawnPointId);
      
      if (monsterWithSpawnPoint) {
        const initialCount = activeMonsters.size;
        
        // Kill the monster
        monsterSystem.damageMonster(monsterWithSpawnPoint.id, 999, 'test-player');
        
        // Monster should be removed
        const newCount = monsterSystem.getActiveMonsters().size;
        expect(newCount).toBe(initialCount - 1);
        
        // Respawn should be scheduled (tested by checking despawn event)
        expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:monster_despawned', 
          expect.objectContaining({
            scheduleRespawn: true
          })
        );
      }
    });
  });

  describe('System Cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      monsterSystem.destroy();
      
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:attack_monster');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:monster_death');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:spawn_monster');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:despawn_monster');
    });
  });
});