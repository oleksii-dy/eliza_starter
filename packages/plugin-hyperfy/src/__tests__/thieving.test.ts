/**
 * Thieving System Tests
 * ====================
 * Tests for RuneScape thieving mechanics implementation
 */

import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test';
import { ThievingSystem } from '../rpg/systems/ThievingSystem';
import { createMockWorld } from './test-utils';

describe('ThievingSystem', () => {
  let thievingSystem: ThievingSystem;
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

    // Create mock player with stats and inventory
    mockPlayer = {
      data: {
        stats: {
          thieving: { level: 30, currentXp: 20000, maxLevel: 99 },
          hitpoints: { level: 35, currentXp: 25000, maxLevel: 99 },
          combat: { level: 3, currentXp: 0, maxLevel: 126 }
        },
        inventory: {
          items: [
            { itemId: 1523, quantity: 5 }, // Lockpicks
            null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null
          ],
          equipment: {
            weapon: null,
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

    thievingSystem = new ThievingSystem(mockWorld);
  });

  describe('System Initialization', () => {
    it('should initialize with correct name and enabled state', () => {
      expect(thievingSystem.name).toBe('ThievingSystem');
      expect(thievingSystem.enabled).toBe(true);
    });

    it('should load pickpocket targets', () => {
      const targets = thievingSystem.getPickpocketTargets();

      expect(targets.size).toBeGreaterThan(0);
      
      // Check for specific targets
      expect(targets.has('man')).toBe(true);
      expect(targets.has('woman')).toBe(true);
      expect(targets.has('farmer')).toBe(true);
      expect(targets.has('warrior')).toBe(true);
      expect(targets.has('guard')).toBe(true);
      expect(targets.has('knight')).toBe(true);
      expect(targets.has('paladin')).toBe(true);
      expect(targets.has('hero')).toBe(true);
    });

    it('should load thieving stalls', () => {
      const stalls = thievingSystem.getStalls();

      expect(stalls.size).toBeGreaterThan(0);
      
      // Check for specific stalls
      expect(stalls.has('vegetable_stall')).toBe(true);
      expect(stalls.has('baker_stall')).toBe(true);
      expect(stalls.has('tea_stall')).toBe(true);
      expect(stalls.has('silk_stall')).toBe(true);
      expect(stalls.has('wine_stall')).toBe(true);
      expect(stalls.has('seed_stall')).toBe(true);
      expect(stalls.has('fur_stall')).toBe(true);
      expect(stalls.has('fish_stall')).toBe(true);
      expect(stalls.has('gem_stall')).toBe(true);
    });

    it('should load lockpick targets', () => {
      const targets = thievingSystem.getLockpickTargets();

      expect(targets.size).toBeGreaterThan(0);
      
      // Check for specific targets
      expect(targets.has('chest_lumbridge')).toBe(true);
      expect(targets.has('door_chaos_druid')).toBe(true);
      expect(targets.has('chest_ardougne')).toBe(true);
      expect(targets.has('door_yanille_dungeon')).toBe(true);
      expect(targets.has('chest_rogues_den')).toBe(true);
    });

    it('should set up event listeners during init', async () => {
      await thievingSystem.init();
      
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:start_pickpocket', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:start_steal_stall', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:start_lockpick', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:stop_thieving', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:thieving_detected', expect.any(Function));
    });
  });

  describe('Pickpocket Targets', () => {
    it('should have correct man target', () => {
      const targets = thievingSystem.getPickpocketTargets();
      const man = targets.get('man');
      
      expect(man).toBeDefined();
      expect(man!.name).toBe('Man');
      expect(man!.levelRequired).toBe(1);
      expect(man!.xpReward).toBe(8);
      expect(man!.baseSuccessRate).toBe(0.85);
      expect(man!.duration).toBe(1500);
      expect(man!.stunDuration).toBe(4000);
      expect(man!.failureDamage).toBe(1);
      expect(man!.lootTable.length).toBeGreaterThan(0);
    });

    it('should have correct guard target', () => {
      const targets = thievingSystem.getPickpocketTargets();
      const guard = targets.get('guard');
      
      expect(guard).toBeDefined();
      expect(guard!.name).toBe('Guard');
      expect(guard!.levelRequired).toBe(40);
      expect(guard!.xpReward).toBe(46.8);
      expect(guard!.baseSuccessRate).toBe(0.55);
      expect(guard!.duration).toBe(3000);
      expect(guard!.stunDuration).toBe(8000);
      expect(guard!.failureDamage).toBe(4);
    });

    it('should have progressive difficulty by level', () => {
      const targets = thievingSystem.getPickpocketTargets();
      
      const man = targets.get('man');
      const farmer = targets.get('farmer');
      const warrior = targets.get('warrior');
      const guard = targets.get('guard');
      
      expect(man!.levelRequired).toBe(1);
      expect(farmer!.levelRequired).toBe(10);
      expect(warrior!.levelRequired).toBe(25);
      expect(guard!.levelRequired).toBe(40);
      
      // Higher level targets should give more XP
      expect(farmer!.xpReward).toBeGreaterThan(man!.xpReward);
      expect(warrior!.xpReward).toBeGreaterThan(farmer!.xpReward);
      expect(guard!.xpReward).toBeGreaterThan(warrior!.xpReward);
      
      // And be more difficult
      expect(guard!.baseSuccessRate).toBeLessThan(man!.baseSuccessRate);
      expect(guard!.duration).toBeGreaterThan(man!.duration);
      expect(guard!.failureDamage).toBeGreaterThan(man!.failureDamage);
    });
  });

  describe('Thieving Stalls', () => {
    it('should have correct vegetable stall', () => {
      const stalls = thievingSystem.getStalls();
      const vegetable = stalls.get('vegetable_stall');
      
      expect(vegetable).toBeDefined();
      expect(vegetable!.name).toBe('Vegetable stall');
      expect(vegetable!.levelRequired).toBe(2);
      expect(vegetable!.xpReward).toBe(10);
      expect(vegetable!.baseSuccessRate).toBe(0.9);
      expect(vegetable!.duration).toBe(2000);
      expect(vegetable!.respawnTime).toBe(3000);
      expect(vegetable!.lootTable.length).toBeGreaterThan(0);
    });

    it('should have correct gem stall', () => {
      const stalls = thievingSystem.getStalls();
      const gem = stalls.get('gem_stall');
      
      expect(gem).toBeDefined();
      expect(gem!.name).toBe('Gem stall');
      expect(gem!.levelRequired).toBe(75);
      expect(gem!.xpReward).toBe(160);
      expect(gem!.baseSuccessRate).toBe(0.4);
      expect(gem!.duration).toBe(6000);
      expect(gem!.respawnTime).toBe(180000); // 3 minutes
      expect(gem!.lootTable.length).toBeGreaterThan(0);
    });

    it('should have progressive difficulty and rewards', () => {
      const stalls = thievingSystem.getStalls();
      
      const vegetable = stalls.get('vegetable_stall');
      const baker = stalls.get('baker_stall');
      const silk = stalls.get('silk_stall');
      const gem = stalls.get('gem_stall');
      
      expect(vegetable!.levelRequired).toBe(2);
      expect(baker!.levelRequired).toBe(5);
      expect(silk!.levelRequired).toBe(20);
      expect(gem!.levelRequired).toBe(75);
      
      // Higher level stalls should give more XP
      expect(baker!.xpReward).toBeGreaterThan(vegetable!.xpReward);
      expect(silk!.xpReward).toBeGreaterThan(baker!.xpReward);
      expect(gem!.xpReward).toBeGreaterThan(silk!.xpReward);
      
      // And be more difficult
      expect(gem!.baseSuccessRate).toBeLessThan(vegetable!.baseSuccessRate);
      expect(gem!.duration).toBeGreaterThan(vegetable!.duration);
      expect(gem!.respawnTime).toBeGreaterThan(vegetable!.respawnTime);
    });
  });

  describe('Lockpick Targets', () => {
    it('should have correct lumbridge chest', () => {
      const targets = thievingSystem.getLockpickTargets();
      const chest = targets.get('chest_lumbridge');
      
      expect(chest).toBeDefined();
      expect(chest!.name).toBe('Chest');
      expect(chest!.levelRequired).toBe(13);
      expect(chest!.xpReward).toBe(7.8);
      expect(chest!.baseSuccessRate).toBe(0.8);
      expect(chest!.duration).toBe(3000);
      expect(chest!.lockpickBreakChance).toBe(0.1);
      expect(chest!.cooldownTime).toBe(60000); // 1 minute
      expect(chest!.lootTable).toBeDefined();
      expect(chest!.lootTable!.length).toBeGreaterThan(0);
    });

    it('should have correct rogues den chest', () => {
      const targets = thievingSystem.getLockpickTargets();
      const chest = targets.get('chest_rogues_den');
      
      expect(chest).toBeDefined();
      expect(chest!.name).toBe("Rogues' den chest");
      expect(chest!.levelRequired).toBe(84);
      expect(chest!.xpReward).toBe(125);
      expect(chest!.baseSuccessRate).toBe(0.3);
      expect(chest!.duration).toBe(8000);
      expect(chest!.lockpickBreakChance).toBe(0.3);
      expect(chest!.cooldownTime).toBe(1800000); // 30 minutes
    });

    it('should have progressive difficulty', () => {
      const targets = thievingSystem.getLockpickTargets();
      
      const lumbridge = targets.get('chest_lumbridge');
      const ardougne = targets.get('chest_ardougne');
      const rogues = targets.get('chest_rogues_den');
      
      expect(lumbridge!.levelRequired).toBe(13);
      expect(ardougne!.levelRequired).toBe(43);
      expect(rogues!.levelRequired).toBe(84);
      
      // Higher level targets should give more XP
      expect(ardougne!.xpReward).toBeGreaterThan(lumbridge!.xpReward);
      expect(rogues!.xpReward).toBeGreaterThan(ardougne!.xpReward);
      
      // And be more difficult
      expect(rogues!.baseSuccessRate).toBeLessThan(lumbridge!.baseSuccessRate);
      expect(rogues!.duration).toBeGreaterThan(lumbridge!.duration);
      expect(rogues!.lockpickBreakChance).toBeGreaterThan(lumbridge!.lockpickBreakChance);
      expect(rogues!.cooldownTime).toBeGreaterThan(lumbridge!.cooldownTime);
    });
  });

  describe('Pickpocket Mechanics', () => {
    beforeEach(async () => {
      await thievingSystem.init();
    });

    it('should successfully start pickpocket', () => {
      const result = thievingSystem.startPickpocket('test-player', 'farmer');
      expect(result).toBe(true);
      
      expect(thievingSystem.isPlayerThieving('test-player')).toBe(true);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:pickpocket_started', {
        playerId: 'test-player',
        targetId: 'farmer',
        targetName: 'Farmer',
        duration: 2000,
        successChance: expect.any(Number),
      });
    });

    it('should fail to pickpocket without required level', () => {
      // Lower player thieving level
      mockPlayer.data.stats.thieving.level = 5;
      
      const result = thievingSystem.startPickpocket('test-player', 'guard');
      expect(result).toBe(false);
    });

    it('should fail to pickpocket if already thieving', () => {
      thievingSystem.startPickpocket('test-player', 'farmer');
      
      const result = thievingSystem.startPickpocket('test-player', 'man');
      expect(result).toBe(false);
    });

    it('should fail to pickpocket stunned NPC', () => {
      // Start pickpocket to stun the NPC
      thievingSystem.startPickpocket('test-player', 'farmer');
      
      // Complete the action to stun the NPC
      const originalRandom = Math.random;
      Math.random = mock(() => 0.1); // Ensure success
      thievingSystem.completeThievingAction('test-player');
      Math.random = originalRandom;
      
      // Try to pickpocket the same NPC again
      const result = thievingSystem.startPickpocket('test-player', 'farmer');
      expect(result).toBe(false);
    });

    it('should complete pickpocket successfully', () => {
      thievingSystem.startPickpocket('test-player', 'farmer');
      
      // Mock success
      const originalRandom = Math.random;
      Math.random = mock(() => 0.1); // Ensure success
      
      const result = thievingSystem.completeThievingAction('test-player');
      expect(result).toBe(true);
      
      expect(thievingSystem.isPlayerThieving('test-player')).toBe(false);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:pickpocket_success', {
        playerId: 'test-player',
        targetId: 'farmer',
        targetName: 'Farmer',
        xpGained: 14.5,
        loot: expect.any(Array),
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'thieving',
        amount: 14.5,
        source: 'thieving',
      });
      
      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should handle pickpocket failure correctly', () => {
      thievingSystem.startPickpocket('test-player', 'farmer');
      
      // Mock failure
      const originalRandom = Math.random;
      Math.random = mock(() => 0.95); // Ensure failure
      
      const result = thievingSystem.completeThievingAction('test-player');
      expect(result).toBe(true);
      
      expect(thievingSystem.isPlayerThieving('test-player')).toBe(false);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:pickpocket_failure', {
        playerId: 'test-player',
        targetId: 'farmer',
        targetName: 'Farmer',
        xpGained: expect.any(Number), // Small failure XP
        damage: 2,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:take_damage', {
        playerId: 'test-player',
        damage: 2,
        source: 'pickpocket_failure',
        damageType: 'physical',
      });
      
      // Restore original Math.random
      Math.random = originalRandom;
    });
  });

  describe('Stall Theft Mechanics', () => {
    beforeEach(async () => {
      await thievingSystem.init();
    });

    it('should successfully start stall theft', () => {
      const result = thievingSystem.startStealStall('test-player', 'silk_stall');
      expect(result).toBe(true);
      
      expect(thievingSystem.isPlayerThieving('test-player')).toBe(true);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:stall_theft_started', {
        playerId: 'test-player',
        stallId: 'silk_stall',
        stallName: 'Silk stall',
        duration: 3500,
        successChance: expect.any(Number),
      });
    });

    it('should fail to steal from stall without required level', () => {
      // Lower player thieving level
      mockPlayer.data.stats.thieving.level = 5;
      
      const result = thievingSystem.startStealStall('test-player', 'gem_stall');
      expect(result).toBe(false);
    });

    it('should fail to steal from empty stall', () => {
      // Start theft to empty the stall
      thievingSystem.startStealStall('test-player', 'silk_stall');
      
      // Complete the action to empty the stall
      const originalRandom = Math.random;
      Math.random = mock(() => 0.1); // Ensure success
      thievingSystem.completeThievingAction('test-player');
      Math.random = originalRandom;
      
      // Try to steal from the same stall again
      const result = thievingSystem.startStealStall('test-player', 'silk_stall');
      expect(result).toBe(false);
    });

    it('should complete stall theft successfully', () => {
      thievingSystem.startStealStall('test-player', 'silk_stall');
      
      // Mock success
      const originalRandom = Math.random;
      Math.random = mock(() => 0.1); // Ensure success
      
      const result = thievingSystem.completeThievingAction('test-player');
      expect(result).toBe(true);
      
      expect(thievingSystem.isPlayerThieving('test-player')).toBe(false);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:stall_theft_success', {
        playerId: 'test-player',
        stallId: 'silk_stall',
        stallName: 'Silk stall',
        xpGained: 24,
        loot: expect.any(Array),
      });
      
      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should handle stall theft failure correctly', () => {
      thievingSystem.startStealStall('test-player', 'silk_stall');
      
      // Mock failure
      const originalRandom = Math.random;
      Math.random = mock(() => 0.95); // Ensure failure
      
      const result = thievingSystem.completeThievingAction('test-player');
      expect(result).toBe(true);
      
      expect(thievingSystem.isPlayerThieving('test-player')).toBe(false);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:stall_theft_failure', {
        playerId: 'test-player',
        stallId: 'silk_stall',
        stallName: 'Silk stall',
        xpGained: expect.any(Number), // Small failure XP
      });
      
      // Restore original Math.random
      Math.random = originalRandom;
    });
  });

  describe('Lockpick Mechanics', () => {
    beforeEach(async () => {
      await thievingSystem.init();
    });

    it('should successfully start lockpick', () => {
      const result = thievingSystem.startLockpick('test-player', 'chest_lumbridge');
      expect(result).toBe(true);
      
      expect(thievingSystem.isPlayerThieving('test-player')).toBe(true);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:lockpick_started', {
        playerId: 'test-player',
        targetId: 'chest_lumbridge',
        targetName: 'Chest',
        duration: 3000,
        successChance: expect.any(Number),
      });
    });

    it('should fail to lockpick without required level', () => {
      // Lower player thieving level
      mockPlayer.data.stats.thieving.level = 5;
      
      const result = thievingSystem.startLockpick('test-player', 'chest_ardougne');
      expect(result).toBe(false);
    });

    it('should fail to lockpick without lockpick', () => {
      // Remove lockpicks from inventory
      mockPlayer.data.inventory.items[0] = null;
      
      const result = thievingSystem.startLockpick('test-player', 'chest_lumbridge');
      expect(result).toBe(false);
    });

    it('should fail to lockpick target on cooldown', () => {
      // Start lockpick to set cooldown
      thievingSystem.startLockpick('test-player', 'chest_lumbridge');
      
      // Complete the action to set cooldown
      const originalRandom = Math.random;
      Math.random = mock(() => 0.1); // Ensure success
      thievingSystem.completeThievingAction('test-player');
      Math.random = originalRandom;
      
      // Try to lockpick the same target again
      const result = thievingSystem.startLockpick('test-player', 'chest_lumbridge');
      expect(result).toBe(false);
    });

    it('should complete lockpick successfully', () => {
      thievingSystem.startLockpick('test-player', 'chest_lumbridge');
      
      // Mock success
      const originalRandom = Math.random;
      Math.random = mock(() => 0.1); // Ensure success
      
      const result = thievingSystem.completeThievingAction('test-player');
      expect(result).toBe(true);
      
      expect(thievingSystem.isPlayerThieving('test-player')).toBe(false);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:lockpick_success', {
        playerId: 'test-player',
        targetId: 'chest_lumbridge',
        targetName: 'Chest',
        xpGained: 7.8,
        loot: expect.any(Array),
      });
      
      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should handle lockpick failure with potential lockpick break', () => {
      thievingSystem.startLockpick('test-player', 'chest_lumbridge');
      
      // Mock failure
      const originalRandom = Math.random;
      Math.random = mock(() => 0.95); // Ensure failure
      
      const result = thievingSystem.completeThievingAction('test-player');
      expect(result).toBe(true);
      
      expect(thievingSystem.isPlayerThieving('test-player')).toBe(false);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:lockpick_failure', {
        playerId: 'test-player',
        targetId: 'chest_lumbridge',
        targetName: 'Chest',
        xpGained: expect.any(Number), // Small failure XP
        lockpickBroken: expect.any(Boolean),
      });
      
      // Restore original Math.random
      Math.random = originalRandom;
    });
  });

  describe('Validation Methods', () => {
    beforeEach(async () => {
      await thievingSystem.init();
    });

    it('should validate pickpocket capability correctly', () => {
      // Valid case
      const validResult = thievingSystem.canPickpocket('test-player', 'farmer');
      expect(validResult.canPickpocket).toBe(true);
      
      // Invalid level
      mockPlayer.data.stats.thieving.level = 5;
      const invalidLevelResult = thievingSystem.canPickpocket('test-player', 'guard');
      expect(invalidLevelResult.canPickpocket).toBe(false);
      expect(invalidLevelResult.reason).toContain('level');
      
      // Already thieving
      mockPlayer.data.stats.thieving.level = 30; // Reset level
      thievingSystem.startPickpocket('test-player', 'farmer');
      const alreadyThievingResult = thievingSystem.canPickpocket('test-player', 'man');
      expect(alreadyThievingResult.canPickpocket).toBe(false);
      expect(alreadyThievingResult.reason).toContain('Already thieving');
    });

    it('should validate stall theft capability correctly', () => {
      // Valid case
      const validResult = thievingSystem.canStealStall('test-player', 'silk_stall');
      expect(validResult.canSteal).toBe(true);
      
      // Invalid level
      mockPlayer.data.stats.thieving.level = 5;
      const invalidLevelResult = thievingSystem.canStealStall('test-player', 'gem_stall');
      expect(invalidLevelResult.canSteal).toBe(false);
      expect(invalidLevelResult.reason).toContain('level');
      
      // Already thieving
      mockPlayer.data.stats.thieving.level = 30; // Reset level
      thievingSystem.startPickpocket('test-player', 'farmer');
      const alreadyThievingResult = thievingSystem.canStealStall('test-player', 'silk_stall');
      expect(alreadyThievingResult.canSteal).toBe(false);
      expect(alreadyThievingResult.reason).toContain('Already thieving');
    });

    it('should validate lockpick capability correctly', () => {
      // Valid case
      const validResult = thievingSystem.canLockpick('test-player', 'chest_lumbridge');
      expect(validResult.canLockpick).toBe(true);
      
      // Invalid level
      mockPlayer.data.stats.thieving.level = 5;
      const invalidLevelResult = thievingSystem.canLockpick('test-player', 'chest_ardougne');
      expect(invalidLevelResult.canLockpick).toBe(false);
      expect(invalidLevelResult.reason).toContain('level');
      
      // No lockpick
      mockPlayer.data.stats.thieving.level = 30; // Reset level
      mockPlayer.data.inventory.items[0] = null; // Remove lockpick
      const noLockpickResult = thievingSystem.canLockpick('test-player', 'chest_lumbridge');
      expect(noLockpickResult.canLockpick).toBe(false);
      expect(noLockpickResult.reason).toContain('lockpick');
      
      // Already thieving
      mockPlayer.data.inventory.items[0] = { itemId: 1523, quantity: 5 }; // Restore lockpick
      thievingSystem.startPickpocket('test-player', 'farmer');
      const alreadyThievingResult = thievingSystem.canLockpick('test-player', 'chest_lumbridge');
      expect(alreadyThievingResult.canLockpick).toBe(false);
      expect(alreadyThievingResult.reason).toContain('Already thieving');
    });

    it('should validate unknown targets', () => {
      const unknownPickpocket = thievingSystem.canPickpocket('test-player', 'unknown_target');
      expect(unknownPickpocket.canPickpocket).toBe(false);
      expect(unknownPickpocket.reason).toContain('Unknown');
      
      const unknownStall = thievingSystem.canStealStall('test-player', 'unknown_stall');
      expect(unknownStall.canSteal).toBe(false);
      expect(unknownStall.reason).toContain('Unknown');
      
      const unknownLockpick = thievingSystem.canLockpick('test-player', 'unknown_target');
      expect(unknownLockpick.canLockpick).toBe(false);
      expect(unknownLockpick.reason).toContain('Unknown');
    });

    it('should get targets by level', () => {
      const lowLevelTargets = thievingSystem.getTargetsByLevel(1, 10);
      const midLevelTargets = thievingSystem.getTargetsByLevel(11, 30);
      const highLevelTargets = thievingSystem.getTargetsByLevel(70, 99);
      
      expect(lowLevelTargets.length).toBeGreaterThan(0);
      expect(midLevelTargets.length).toBeGreaterThan(0);
      expect(highLevelTargets.length).toBeGreaterThan(0);
      
      expect(lowLevelTargets.every(t => t.levelRequired >= 1 && t.levelRequired <= 10)).toBe(true);
      expect(midLevelTargets.every(t => t.levelRequired >= 11 && t.levelRequired <= 30)).toBe(true);
      expect(highLevelTargets.every(t => t.levelRequired >= 70 && t.levelRequired <= 99)).toBe(true);
    });
  });

  describe('Success Chance Calculation', () => {
    it('should calculate success chance based on level difference', () => {
      const targets = thievingSystem.getPickpocketTargets();
      const farmer = targets.get('farmer')!;
      
      // Test with exact level requirement
      mockPlayer.data.stats.thieving.level = 10;
      const exactLevelChance = (thievingSystem as any).calculatePickpocketSuccessChance('test-player', farmer);
      expect(exactLevelChance).toBe(0.75); // Base success rate
      
      // Test with higher level
      mockPlayer.data.stats.thieving.level = 20;
      const higherLevelChance = (thievingSystem as any).calculatePickpocketSuccessChance('test-player', farmer);
      expect(higherLevelChance).toBeGreaterThan(exactLevelChance);
      expect(higherLevelChance).toBe(0.75 + 10 * 0.005); // +0.5% per level above requirement
    });

    it('should apply detection history penalty', () => {
      const targets = thievingSystem.getPickpocketTargets();
      const farmer = targets.get('farmer')!;
      
      // Add detection history
      (thievingSystem as any).addDetectionHistory('test-player', 'farmer');
      (thievingSystem as any).addDetectionHistory('test-player', 'farmer');
      
      const penalizedChance = (thievingSystem as any).calculatePickpocketSuccessChance('test-player', farmer);
      expect(penalizedChance).toBeLessThan(farmer.baseSuccessRate);
      expect(penalizedChance).toBeGreaterThanOrEqual(0.05); // Minimum 5%
    });

    it('should respect minimum and maximum success rates', () => {
      const targets = thievingSystem.getPickpocketTargets();
      const farmer = targets.get('farmer')!;
      
      // Test minimum (add lots of detection history)
      for (let i = 0; i < 10; i++) {
        (thievingSystem as any).addDetectionHistory('test-player', 'farmer');
      }
      const minChance = (thievingSystem as any).calculatePickpocketSuccessChance('test-player', farmer);
      expect(minChance).toBeGreaterThanOrEqual(0.05); // Minimum 5%
      
      // Test maximum (very high level)
      mockPlayer.data.stats.thieving.level = 99;
      const maxChance = (thievingSystem as any).calculatePickpocketSuccessChance('test-player', farmer);
      expect(maxChance).toBeLessThanOrEqual(0.95); // Maximum 95%
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await thievingSystem.init();
    });

    it('should handle start pickpocket event', () => {
      const startPickpocketSpy = spyOn(thievingSystem, 'startPickpocket');
      
      (thievingSystem as any).handleStartPickpocket({
        playerId: 'test-player',
        targetId: 'farmer'
      });
      
      expect(startPickpocketSpy).toHaveBeenCalledWith('test-player', 'farmer');
    });

    it('should handle start steal stall event', () => {
      const startStealStallSpy = spyOn(thievingSystem, 'startStealStall');
      
      (thievingSystem as any).handleStartStealStall({
        playerId: 'test-player',
        stallId: 'silk_stall'
      });
      
      expect(startStealStallSpy).toHaveBeenCalledWith('test-player', 'silk_stall');
    });

    it('should handle start lockpick event', () => {
      const startLockpickSpy = spyOn(thievingSystem, 'startLockpick');
      
      (thievingSystem as any).handleStartLockpick({
        playerId: 'test-player',
        targetId: 'chest_lumbridge'
      });
      
      expect(startLockpickSpy).toHaveBeenCalledWith('test-player', 'chest_lumbridge');
    });

    it('should handle stop thieving event', () => {
      thievingSystem.startPickpocket('test-player', 'farmer');
      expect(thievingSystem.isPlayerThieving('test-player')).toBe(true);
      
      (thievingSystem as any).handleStopThieving({
        playerId: 'test-player'
      });
      
      expect(thievingSystem.isPlayerThieving('test-player')).toBe(false);
    });

    it('should handle thieving detected event', () => {
      const addDetectionHistorySpy = spyOn(thievingSystem as any, 'addDetectionHistory');
      
      (thievingSystem as any).handleThievingDetected({
        playerId: 'test-player',
        targetId: 'farmer'
      });
      
      expect(addDetectionHistorySpy).toHaveBeenCalledWith('test-player', 'farmer');
    });
  });

  describe('System Cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      thievingSystem.destroy();
      
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:start_pickpocket');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:start_steal_stall');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:start_lockpick');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:stop_thieving');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:thieving_detected');
    });
  });
});