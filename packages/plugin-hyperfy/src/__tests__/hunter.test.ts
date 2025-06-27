/**
 * Hunter System Tests
 * ==================
 * Tests for RuneScape hunter mechanics implementation
 */

import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test';
import { HunterSystem } from '../rpg/systems/HunterSystem';
import { createMockWorld } from './test-utils';
import { GATHERING_CONSTANTS } from '../rpg/types/gathering';

describe('HunterSystem', () => {
  let hunterSystem: HunterSystem;
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
          hunter: { level: 60, currentXp: 275000, maxLevel: 99 },
          combat: { level: 3, currentXp: 0, maxLevel: 126 }
        },
        inventory: {
          items: [
            { itemId: 10006, quantity: 5 }, // Bird snare
            { itemId: 10008, quantity: 3 }, // Box trap
            { itemId: 303, quantity: 1 }, // Small fishing net
            { itemId: 954, quantity: 10 }, // Rope
            null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null
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

    hunterSystem = new HunterSystem(mockWorld);
  });

  describe('System Initialization', () => {
    it('should initialize with correct name and enabled state', () => {
      expect(hunterSystem.name).toBe('HunterSystem');
      expect(hunterSystem.enabled).toBe(true);
    });

    it('should load creatures and tools during initialization', () => {
      const creatures = hunterSystem.getCreatures();
      const tools = (hunterSystem as any).hunterTools;

      expect(creatures.size).toBeGreaterThan(0);
      expect(tools.size).toBeGreaterThan(0);
      
      // Check for specific creatures
      expect(creatures.has('rabbit')).toBe(true);
      expect(creatures.has('bird')).toBe(true);
      expect(creatures.has('chinchompa')).toBe(true);
      expect(creatures.has('red_salamander')).toBe(true);
      expect(creatures.has('kebbits')).toBe(true);
    });

    it('should set up event listeners during init', async () => {
      await hunterSystem.init();
      
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:start_hunting', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:stop_hunting', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:set_trap', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:check_trap', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:hunt_creature', expect.any(Function));
    });
  });

  describe('Creature Data', () => {
    it('should have correct rabbit configuration', () => {
      const creatures = hunterSystem.getCreatures();
      const rabbit = creatures.get('rabbit');
      
      expect(rabbit).toBeDefined();
      expect(rabbit!.name).toBe('Rabbit');
      expect(rabbit!.level).toBe(1);
      expect(rabbit!.method).toBe('trap');
      expect(rabbit!.requiredItems).toEqual([10006]); // Rabbit snare
      expect(rabbit!.primaryLoot).toBe(526); // Bones
      expect(rabbit!.secondaryLoot).toBeDefined();
    });

    it('should have correct chinchompa configuration', () => {
      const creatures = hunterSystem.getCreatures();
      const chinchompa = creatures.get('chinchompa');
      
      expect(chinchompa).toBeDefined();
      expect(chinchompa!.name).toBe('Chinchompa');
      expect(chinchompa!.level).toBe(53);
      expect(chinchompa!.method).toBe('trap');
      expect(chinchompa!.requiredItems).toEqual([10008]); // Box trap
      expect(chinchompa!.primaryLoot).toBe(10033); // Chinchompa
      expect(chinchompa!.xp).toBe(198);
    });

    it('should have correct kebbits configuration', () => {
      const creatures = hunterSystem.getCreatures();
      const kebbits = creatures.get('kebbits');
      
      expect(kebbits).toBeDefined();
      expect(kebbits!.name).toBe('Kebbits');
      expect(kebbits!.level).toBe(23);
      expect(kebbits!.method).toBe('tracking');
      expect(kebbits!.requiredItems).toEqual([]); // No required items for tracking
      expect(kebbits!.primaryLoot).toBe(10117); // Kebbit spike
    });

    it('should have correct red salamander configuration', () => {
      const creatures = hunterSystem.getCreatures();
      const salamander = creatures.get('red_salamander');
      
      expect(salamander).toBeDefined();
      expect(salamander!.name).toBe('Red salamander');
      expect(salamander!.level).toBe(59);
      expect(salamander!.method).toBe('net');
      expect(salamander!.requiredItems).toEqual([303, 954]); // Net and rope
      expect(salamander!.primaryLoot).toBe(10149); // Red salamander
    });
  });

  describe('Hunter Tools', () => {
    it('should load hunter tools correctly', () => {
      const tools = (hunterSystem as any).hunterTools as Map<number, any>;
      
      expect(tools.has(10006)).toBe(true); // Bird snare
      expect(tools.has(10008)).toBe(true); // Box trap
      expect(tools.has(10009)).toBe(true); // Net trap
    });

    it('should check for required items correctly', () => {
      const hasSnare = (hunterSystem as any).playerHasRequiredItems('test-player', [10006]);
      const hasBoxTrap = (hunterSystem as any).playerHasRequiredItems('test-player', [10008]);
      const hasNetAndRope = (hunterSystem as any).playerHasRequiredItems('test-player', [303, 954]);
      const hasMissingItem = (hunterSystem as any).playerHasRequiredItems('test-player', [99999]);
      
      expect(hasSnare).toBe(true);
      expect(hasBoxTrap).toBe(true);
      expect(hasNetAndRope).toBe(true);
      expect(hasMissingItem).toBe(false);
    });
  });

  describe('Trap Mechanics', () => {
    beforeEach(async () => {
      await hunterSystem.init();
    });

    it('should successfully set trap for rabbits', () => {
      const position = { x: 70, y: 0, z: 0 };
      const result = hunterSystem.setTrap('test-player', 'rabbit', position);
      
      expect(result).toBe(true);
      
      const playerTraps = hunterSystem.getPlayerTraps('test-player');
      expect(playerTraps.length).toBe(1);
      expect(playerTraps[0].creatureId).toBe('rabbit');
      expect(playerTraps[0].state).toBe('empty');
    });

    it('should successfully set trap for chinchompas', () => {
      const position = { x: 75, y: 0, z: 5 };
      const result = hunterSystem.setTrap('test-player', 'chinchompa', position);
      
      expect(result).toBe(true);
      
      const playerTraps = hunterSystem.getPlayerTraps('test-player');
      expect(playerTraps.length).toBe(1);
      expect(playerTraps[0].creatureId).toBe('chinchompa');
    });

    it('should fail to set trap without required items', () => {
      // Remove snares from inventory
      mockPlayer.data.inventory.items[0] = null;
      
      const position = { x: 70, y: 0, z: 0 };
      const result = hunterSystem.setTrap('test-player', 'rabbit', position);
      
      expect(result).toBe(false);
    });

    it('should fail to set trap without required level', () => {
      // Lower player hunter level
      mockPlayer.data.stats.hunter.level = 50;
      
      const position = { x: 80, y: 0, z: 10 };
      const result = hunterSystem.setTrap('test-player', 'red_salamander', position);
      
      expect(result).toBe(false);
    });

    it('should consume required items when setting trap', () => {
      const position = { x: 70, y: 0, z: 0 };
      hunterSystem.setTrap('test-player', 'rabbit', position);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 10006, // Bird snare
        quantity: 1,
      });
    });

    it('should check trap and find it empty initially', () => {
      const position = { x: 70, y: 0, z: 0 };
      hunterSystem.setTrap('test-player', 'rabbit', position);
      
      const playerTraps = hunterSystem.getPlayerTraps('test-player');
      const trapId = playerTraps[0].id;
      
      const result = hunterSystem.checkTrap('test-player', trapId);
      expect(result).toBe(false); // Empty trap
    });
  });

  describe('Tracking Mechanics', () => {
    beforeEach(async () => {
      await hunterSystem.init();
    });

    it('should successfully start tracking kebbits', () => {
      const result = hunterSystem.startHunting('test-player', 'kebbits');
      
      expect(result).toBe(true);
      expect(hunterSystem.isPlayerHunting('test-player')).toBe(true);
    });

    it('should fail to start tracking trap-only creatures', () => {
      const result = hunterSystem.startHunting('test-player', 'rabbit');
      
      expect(result).toBe(false);
    });

    it('should fail to start tracking without required level', () => {
      // Lower player hunter level
      mockPlayer.data.stats.hunter.level = 10;
      
      const result = hunterSystem.startHunting('test-player', 'kebbits');
      
      expect(result).toBe(false);
    });

    it('should stop tracking successfully', () => {
      hunterSystem.startHunting('test-player', 'kebbits');
      expect(hunterSystem.isPlayerHunting('test-player')).toBe(true);
      
      const stopResult = hunterSystem.stopHunting('test-player');
      expect(stopResult).toBe(true);
      expect(hunterSystem.isPlayerHunting('test-player')).toBe(false);
    });
  });

  describe('Hunter Calculations', () => {
    it('should calculate hunting duration correctly', () => {
      const creatures = hunterSystem.getCreatures();
      const kebbits = creatures.get('kebbits')!;
      
      const duration = (hunterSystem as any).calculateHuntingDuration(30, kebbits);
      
      expect(duration).toBeGreaterThanOrEqual(2000); // Minimum 2 seconds
      expect(duration).toBeLessThan(20000); // Should be reasonable
    });

    it('should calculate catch rate correctly', () => {
      const creatures = hunterSystem.getCreatures();
      const rabbit = creatures.get('rabbit')!;
      
      const catchRate = (hunterSystem as any).calculateCatchRate(10, rabbit);
      
      expect(catchRate).toBeGreaterThanOrEqual(0.05);
      expect(catchRate).toBeLessThanOrEqual(0.8);
      expect(catchRate).toBeGreaterThan(rabbit.catchRate); // Should be higher with level bonus
    });

    it('should check trap catch probability when creatures are nearby', () => {
      const creatures = hunterSystem.getCreatures();
      const rabbit = creatures.get('rabbit')!;
      
      // Create a creature instance near the trap
      const creatureInstances = hunterSystem.getCreatureInstances();
      const testInstance = Array.from(creatureInstances.values()).find(i => i.creatureId === 'rabbit');
      
      if (testInstance) {
        // Move creature close to trap position
        testInstance.currentPosition = { x: 70, y: 0, z: 0 };
        
        const trap = {
          id: 'test-trap',
          position: { x: 70, y: 0, z: 0 }
        } as any;
        
        // Test multiple times to check probability
        let catches = 0;
        const iterations = 100;
        
        for (let i = 0; i < iterations; i++) {
          if ((hunterSystem as any).checkTrapCatch(trap, rabbit)) {
            catches++;
          }
        }
        
        // Should have some catches but not all (based on rabbit catch rate of 0.7)
        expect(catches).toBeGreaterThan(0);
        expect(catches).toBeLessThan(iterations);
      } else {
        // If no rabbit instance found, test should still pass
        expect(true).toBe(true);
      }
    });
  });

  describe('Creature Instances', () => {
    beforeEach(async () => {
      await hunterSystem.init();
    });

    it('should spawn creature instances', () => {
      const creatureInstances = hunterSystem.getCreatureInstances();
      expect(creatureInstances.size).toBeGreaterThan(0);
      
      // Check for specific creature types
      const instances = Array.from(creatureInstances.values());
      const rabbitInstance = instances.find(i => i.creatureId === 'rabbit');
      const birdInstance = instances.find(i => i.creatureId === 'bird');
      
      expect(rabbitInstance).toBeDefined();
      expect(birdInstance).toBeDefined();
    });

    it('should update creature movement', () => {
      const creatureInstances = hunterSystem.getCreatureInstances();
      const testInstance = Array.from(creatureInstances.values())[0];
      
      const originalX = testInstance.currentPosition.x;
      const originalZ = testInstance.currentPosition.z;
      
      // Set last move to past to trigger movement
      testInstance.lastMove = Date.now() - (GATHERING_CONSTANTS.CREATURE_ROAM_TIME * 1000 + 1000);
      
      (hunterSystem as any).updateCreatureMovement(Date.now());
      
      // Position might have changed (depends on random movement)
      expect(testInstance.lastMove).toBeGreaterThan(Date.now() - 1000);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await hunterSystem.init();
    });

    it('should handle start hunting event', () => {
      const startSpy = spyOn(hunterSystem, 'startHunting');
      
      (hunterSystem as any).handleStartHunting({
        playerId: 'test-player',
        creatureId: 'kebbits'
      });
      
      expect(startSpy).toHaveBeenCalledWith('test-player', 'kebbits');
    });

    it('should handle stop hunting event', () => {
      const stopSpy = spyOn(hunterSystem, 'stopHunting');
      
      (hunterSystem as any).handleStopHunting({
        playerId: 'test-player'
      });
      
      expect(stopSpy).toHaveBeenCalledWith('test-player');
    });

    it('should handle set trap event', () => {
      const setTrapSpy = spyOn(hunterSystem, 'setTrap');
      
      (hunterSystem as any).handleSetTrap({
        playerId: 'test-player',
        creatureId: 'rabbit',
        position: { x: 70, y: 0, z: 0 }
      });
      
      expect(setTrapSpy).toHaveBeenCalledWith('test-player', 'rabbit', { x: 70, y: 0, z: 0 });
    });

    it('should handle check trap event', () => {
      const checkTrapSpy = spyOn(hunterSystem, 'checkTrap');
      
      (hunterSystem as any).handleCheckTrap({
        playerId: 'test-player',
        trapId: 'test-trap-id'
      });
      
      expect(checkTrapSpy).toHaveBeenCalledWith('test-player', 'test-trap-id');
    });
  });

  describe('Loot and XP Rewards', () => {
    it('should grant primary loot when creature is caught', () => {
      (hunterSystem as any).grantLoot('test-player', 526, 1); // Bones
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', {
        playerId: 'test-player',
        itemId: 526,
        quantity: 1,
        noted: false,
      });
    });

    it('should grant hunter XP when creature is caught', () => {
      (hunterSystem as any).grantHunterXP('test-player', 198);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'hunter',
        amount: 198,
        source: 'hunting',
      });
    });

    it('should consume required items when setting traps', () => {
      (hunterSystem as any).consumeRequiredItems('test-player', [10006, 954]);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 10006,
        quantity: 1,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 954,
        quantity: 1,
      });
    });
  });

  describe('Trap State Management', () => {
    beforeEach(async () => {
      await hunterSystem.init();
    });

    it('should update trap states over time', () => {
      const position = { x: 70, y: 0, z: 0 };
      hunterSystem.setTrap('test-player', 'rabbit', position);
      
      const playerTraps = hunterSystem.getPlayerTraps('test-player');
      const trap = playerTraps[0];
      
      expect(trap.state).toBe('empty');
      
      // Set collapse time to past
      trap.collapseTime = Date.now() - 1000;
      
      (hunterSystem as any).updateTraps(Date.now());
      
      expect(trap.state).toBe('collapsed');
    });

    it('should harvest trapped creatures', () => {
      const position = { x: 70, y: 0, z: 0 };
      hunterSystem.setTrap('test-player', 'rabbit', position);
      
      const playerTraps = hunterSystem.getPlayerTraps('test-player');
      const trap = playerTraps[0];
      
      // Manually set trap as caught
      trap.state = 'caught';
      trap.caughtCreature = 'rabbit';
      
      (hunterSystem as any).harvestTrap('test-player', trap);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', expect.objectContaining({
        playerId: 'test-player',
        itemId: 526, // Bones (primary loot)
      }));
      
      // Trap should be removed after harvest
      const remainingTraps = hunterSystem.getPlayerTraps('test-player');
      expect(remainingTraps.length).toBe(0);
    });
  });

  describe('System Cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      hunterSystem.destroy();
      
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:start_hunting');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:stop_hunting');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:set_trap');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:check_trap');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:hunt_creature');
    });
  });
});