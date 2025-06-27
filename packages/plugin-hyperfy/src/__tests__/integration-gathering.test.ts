/**
 * Gathering Skills Integration Tests
 * =================================
 * Tests to ensure all gathering systems work together seamlessly
 */

import { describe, expect, it, beforeEach, mock } from 'bun:test';
import { MiningSystem } from '../rpg/systems/MiningSystem';
import { FishingSystem } from '../rpg/systems/FishingSystem';
import { WoodcuttingSystem } from '../rpg/systems/WoodcuttingSystem';
import { HunterSystem } from '../rpg/systems/HunterSystem';
import { StatsSystem } from '../rpg/systems/StatsSystem';
import { InventorySystem } from '../rpg/systems/InventorySystem';
import { createMockWorld } from './test-utils';

describe('Gathering Skills Integration', () => {
  let mockWorld: any;
  let mockPlayer: any;
  let miningSystem: MiningSystem;
  let fishingSystem: FishingSystem;
  let woodcuttingSystem: WoodcuttingSystem;
  let hunterSystem: HunterSystem;
  let statsSystem: StatsSystem;
  let inventorySystem: InventorySystem;

  beforeEach(() => {
    mockWorld = createMockWorld();
    
    // Set up mock world events
    mockWorld.events = {
      on: mock(),
      off: mock(),
      emit: mock(),
    };

    // Create comprehensive mock player with all skills
    mockPlayer = {
      data: {
        stats: {
          mining: { level: 50, currentXp: 101333, maxLevel: 99 },
          fishing: { level: 45, currentXp: 62000, maxLevel: 99 },
          woodcutting: { level: 40, currentXp: 40000, maxLevel: 99 },
          hunter: { level: 35, currentXp: 25000, maxLevel: 99 },
          // Other skills
          attack: { level: 50, currentXp: 101333, maxLevel: 99 },
          strength: { level: 50, currentXp: 101333, maxLevel: 99 },
          defence: { level: 50, currentXp: 101333, maxLevel: 99 },
          hitpoints: { level: 50, current: 500, max: 500, currentXp: 101333, maxLevel: 99 },
          ranged: { level: 40, currentXp: 40000, maxLevel: 99 },
          prayer: { level: 30, currentXp: 13750, maxLevel: 99 },
          magic: { level: 45, currentXp: 62000, maxLevel: 99 },
          cooking: { level: 35, currentXp: 25000, maxLevel: 99 },
          smithing: { level: 30, currentXp: 13750, maxLevel: 99 },
          crafting: { level: 25, currentXp: 8000, maxLevel: 99 },
          fletching: { level: 20, currentXp: 5000, maxLevel: 99 },
          herblore: { level: 15, currentXp: 2500, maxLevel: 99 },
          agility: { level: 30, currentXp: 13750, maxLevel: 99 },
          thieving: { level: 25, currentXp: 8000, maxLevel: 99 },
          slayer: { level: 35, currentXp: 25000, maxLevel: 99 },
          farming: { level: 20, currentXp: 5000, maxLevel: 99 },
          runecrafting: { level: 15, currentXp: 2500, maxLevel: 99 },
          construction: { level: 10, currentXp: 1500, maxLevel: 99 },
          summoning: { level: 5, currentXp: 500, maxLevel: 99 },
          dungeoneering: { level: 1, currentXp: 0, maxLevel: 120 }
        },
        inventory: {
          items: [
            { itemId: 1275, quantity: 1 }, // Rune pickaxe
            { itemId: 309, quantity: 1 }, // Fly fishing rod
            { itemId: 313, quantity: 100 }, // Fishing bait
            { itemId: 1359, quantity: 1 }, // Rune axe
            { itemId: 10006, quantity: 10 }, // Bird snare
            { itemId: 10008, quantity: 5 }, // Box trap
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null
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

    // Initialize all systems
    miningSystem = new MiningSystem(mockWorld);
    fishingSystem = new FishingSystem(mockWorld);
    woodcuttingSystem = new WoodcuttingSystem(mockWorld);
    hunterSystem = new HunterSystem(mockWorld);
    statsSystem = new StatsSystem(mockWorld);
    inventorySystem = new InventorySystem(mockWorld);
  });

  describe('Cross-System Tool Detection', () => {
    it('should detect mining tools across systems', () => {
      const miningTool = (miningSystem as any).getPlayerPickaxe('test-player');
      expect(miningTool).toBeDefined();
      expect(miningTool.itemId).toBe(1275); // Rune pickaxe
      expect(miningTool.name).toBe('Rune pickaxe');
    });

    it('should detect fishing tools across systems', () => {
      const fishingTool = (fishingSystem as any).getPlayerFishingTool('test-player', 'rod');
      expect(fishingTool).toBeDefined();
      expect(fishingTool.itemId).toBe(309); // Fly fishing rod
      expect(fishingTool.name).toBe('Fly fishing rod');
    });

    it('should detect woodcutting tools across systems', () => {
      const woodcuttingTool = (woodcuttingSystem as any).getPlayerAxe('test-player');
      expect(woodcuttingTool).toBeDefined();
      expect(woodcuttingTool.itemId).toBe(1359); // Rune axe
      expect(woodcuttingTool.name).toBe('Rune axe');
    });

    it('should detect hunter tools across systems', () => {
      const hasSnare = (hunterSystem as any).playerHasRequiredItems('test-player', [10006]);
      const hasBoxTrap = (hunterSystem as any).playerHasRequiredItems('test-player', [10008]);
      
      expect(hasSnare).toBe(true);
      expect(hasBoxTrap).toBe(true);
    });
  });

  describe('Event System Integration', () => {
    beforeEach(async () => {
      await miningSystem.init();
      await fishingSystem.init();
      await woodcuttingSystem.init();
      await hunterSystem.init();
      await statsSystem.init();
      await inventorySystem.init();
    });

    it('should emit XP gain events for all gathering skills', () => {
      // Test mining XP
      (miningSystem as any).grantMiningXP('test-player', 35);
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'mining',
        amount: 35,
        source: 'mining',
      });

      // Test fishing XP
      (fishingSystem as any).grantFishingXP('test-player', 70);
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'fishing',
        amount: 70,
        source: 'fishing',
      });

      // Test woodcutting XP
      (woodcuttingSystem as any).grantWoodcuttingXP('test-player', 100);
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'woodcutting',
        amount: 100,
        source: 'woodcutting',
      });

      // Test hunter XP
      (hunterSystem as any).grantHunterXP('test-player', 198);
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'hunter',
        amount: 198,
        source: 'hunting',
      });
    });

    it('should emit item addition events for all gathering skills', () => {
      // Test mining item grant
      (miningSystem as any).grantOre('test-player', { oreId: 440 }); // Iron ore
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', {
        playerId: 'test-player',
        itemId: 440,
        quantity: 1,
        noted: false,
      });

      // Test fishing item grant
      (fishingSystem as any).grantFish('test-player', { itemId: 335 }); // Raw trout
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', {
        playerId: 'test-player',
        itemId: 335,
        quantity: 1,
        noted: false,
      });

      // Test woodcutting item grant
      (woodcuttingSystem as any).grantLog('test-player', { logId: 1521 }); // Oak logs
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', {
        playerId: 'test-player',
        itemId: 1521,
        quantity: 1,
        noted: false,
      });

      // Test hunter item grant
      (hunterSystem as any).grantLoot('test-player', 10033, 1); // Chinchompa
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', {
        playerId: 'test-player',
        itemId: 10033,
        quantity: 1,
        noted: false,
      });
    });
  });

  describe('Multi-Skill Resource Requirements', () => {
    beforeEach(async () => {
      await fishingSystem.init();
      await hunterSystem.init();
    });

    it('should handle bait consumption for fishing', () => {
      const hasBait = (fishingSystem as any).playerHasBait('test-player', 313);
      expect(hasBait).toBe(true);

      (fishingSystem as any).consumeBait('test-player', 313);
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 313,
        quantity: 1,
      });
    });

    it('should handle trap item consumption for hunter', () => {
      (hunterSystem as any).consumeRequiredItems('test-player', [10006]);
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 10006,
        quantity: 1,
      });
    });

    it('should verify complex item requirements', () => {
      // Red salamander requires net and rope
      const hasNetAndRope = (hunterSystem as any).playerHasRequiredItems('test-player', [303, 954]);
      
      // Player doesn't have these items, so should be false
      expect(hasNetAndRope).toBe(false);
      
      // Add the items to inventory
      mockPlayer.data.inventory.items[6] = { itemId: 303, quantity: 1 }; // Small fishing net
      mockPlayer.data.inventory.items[7] = { itemId: 954, quantity: 10 }; // Rope
      
      const hasItemsAfterAdd = (hunterSystem as any).playerHasRequiredItems('test-player', [303, 954]);
      expect(hasItemsAfterAdd).toBe(true);
    });
  });

  describe('Simultaneous Skill Usage', () => {
    beforeEach(async () => {
      await miningSystem.init();
      await fishingSystem.init();
      await woodcuttingSystem.init();
      await hunterSystem.init();
    });

    it('should prevent multiple gathering activities simultaneously', () => {
      // Start mining
      const miningNodes = miningSystem.getMiningNodes();
      const ironNode = Array.from(miningNodes.values()).find(node => node.rockId === 'iron');
      
      if (ironNode) {
        const miningResult = miningSystem.startMining('test-player', ironNode.id);
        expect(miningResult).toBe(true);
        expect(miningSystem.isPlayerMining('test-player')).toBe(true);
      }

      // Try to start fishing while mining - should stop mining first
      const fishingSpots = fishingSystem.getSpotInstances();
      const troutSpot = Array.from(fishingSpots.values()).find(spot => spot.spotId === 'trout_spot');
      
      if (troutSpot) {
        const fishingResult = fishingSystem.startFishing('test-player', troutSpot.id);
        expect(fishingResult).toBe(true);
        expect(fishingSystem.isPlayerFishing('test-player')).toBe(true);
        
        // Mining should have been stopped
        expect(miningSystem.isPlayerMining('test-player')).toBe(false);
      }
    });

    it('should allow hunter traps while doing other activities', () => {
      // Set a trap (passive activity)
      const trapResult = hunterSystem.setTrap('test-player', 'rabbit', { x: 70, y: 0, z: 0 });
      expect(trapResult).toBe(true);
      
      const playerTraps = hunterSystem.getPlayerTraps('test-player');
      expect(playerTraps.length).toBe(1);

      // Should be able to start fishing while having traps
      const fishingSpots = fishingSystem.getSpotInstances();
      const shrimpSpot = Array.from(fishingSpots.values()).find(spot => spot.spotId === 'shrimp_spot');
      
      if (shrimpSpot) {
        // Give player a net for shrimp fishing
        mockPlayer.data.inventory.items[8] = { itemId: 303, quantity: 1 }; // Small fishing net
        
        const fishingResult = fishingSystem.startFishing('test-player', shrimpSpot.id);
        expect(fishingResult).toBe(true);
        
        // Should still have traps while fishing
        const trapsAfterFishing = hunterSystem.getPlayerTraps('test-player');
        expect(trapsAfterFishing.length).toBe(1);
      }
    });
  });

  describe('Level Progression Integration', () => {
    it('should verify level requirements across all systems', () => {
      // Test mining level requirements
      const miningRocks = miningSystem.getMiningRocks();
      const coalRock = miningRocks.get('coal');
      expect(coalRock?.level).toBe(30);
      expect(mockPlayer.data.stats.mining.level).toBeGreaterThanOrEqual(coalRock?.level || 0);

      // Test fishing level requirements
      const fishingSpots = fishingSystem.getFishingSpots();
      const salmonSpot = fishingSpots.get('salmon_spot');
      expect(salmonSpot?.level).toBe(30);
      expect(mockPlayer.data.stats.fishing.level).toBeGreaterThanOrEqual(salmonSpot?.level || 0);

      // Test woodcutting level requirements
      const trees = woodcuttingSystem.getTrees();
      const mapleTree = trees.get('maple');
      expect(mapleTree?.level).toBe(45);
      expect(mockPlayer.data.stats.woodcutting.level).toBeLessThan(mapleTree?.level || 0);

      // Test hunter level requirements
      const creatures = hunterSystem.getCreatures();
      const chinchompa = creatures.get('chinchompa');
      expect(chinchompa?.level).toBe(53);
      expect(mockPlayer.data.stats.hunter.level).toBeLessThan(chinchompa?.level || 0);
    });

    it('should handle level-based tool restrictions', () => {
      // Test if player can use their high-level tools
      const runePickaxe = (miningSystem as any).getPlayerPickaxe('test-player');
      expect(runePickaxe?.level).toBe(41); // Rune pickaxe requirement
      expect(mockPlayer.data.stats.mining.level).toBeGreaterThanOrEqual(runePickaxe?.level || 0);

      const flyRod = (fishingSystem as any).getPlayerFishingTool('test-player', 'rod');
      expect(flyRod?.level).toBe(20); // Fly fishing rod requirement
      expect(mockPlayer.data.stats.fishing.level).toBeGreaterThanOrEqual(flyRod?.level || 0);

      const runeAxe = (woodcuttingSystem as any).getPlayerAxe('test-player');
      expect(runeAxe?.level).toBe(41); // Rune axe requirement
      expect(mockPlayer.data.stats.woodcutting.level).toBeLessThan(runeAxe?.level || 0); // Player can't use it yet
    });
  });

  describe('Resource Node Management', () => {
    beforeEach(async () => {
      await miningSystem.init();
      await fishingSystem.init();
      await woodcuttingSystem.init();
      await hunterSystem.init();
    });

    it('should manage resource node states independently', () => {
      // Check mining nodes
      const miningNodes = miningSystem.getMiningNodes();
      expect(miningNodes.size).toBeGreaterThan(0);
      
      const firstMiningNode = Array.from(miningNodes.values())[0];
      expect(firstMiningNode.depleted).toBe(false);

      // Check fishing spots
      const fishingSpots = fishingSystem.getSpotInstances();
      expect(fishingSpots.size).toBeGreaterThan(0);
      
      const firstFishingSpot = Array.from(fishingSpots.values())[0];
      expect(firstFishingSpot.depleted).toBe(false);

      // Check tree nodes
      const treeNodes = woodcuttingSystem.getTreeNodes();
      expect(treeNodes.size).toBeGreaterThan(0);
      
      const firstTreeNode = Array.from(treeNodes.values())[0];
      expect(firstTreeNode.chopped).toBe(false);

      // Check creature instances
      const creatureInstances = hunterSystem.getCreatureInstances();
      expect(creatureInstances.size).toBeGreaterThan(0);
      
      const firstCreature = Array.from(creatureInstances.values())[0];
      expect(firstCreature.state).toBe('roaming');
    });

    it('should handle resource respawn timers correctly', () => {
      const now = Date.now();
      
      // Test mining respawn
      const miningNodes = miningSystem.getMiningNodes();
      const testMiningNode = Array.from(miningNodes.values())[0];
      testMiningNode.depleted = true;
      testMiningNode.respawnAt = now - 1000; // Should respawn
      
      (miningSystem as any).checkRockRespawns(now);
      expect(testMiningNode.depleted).toBe(false);

      // Test tree regrowth
      const treeNodes = woodcuttingSystem.getTreeNodes();
      const testTreeNode = Array.from(treeNodes.values())[0];
      testTreeNode.chopped = true;
      testTreeNode.regrowAt = now - 1000; // Should regrow
      
      (woodcuttingSystem as any).checkTreeRegrowth(now);
      expect(testTreeNode.chopped).toBe(false);

      // Test fishing spot respawn
      const fishingSpots = fishingSystem.getSpotInstances();
      const testFishingSpot = Array.from(fishingSpots.values())[0];
      testFishingSpot.depleted = true;
      testFishingSpot.respawnAt = now - 1000; // Should respawn
      
      (fishingSystem as any).updateFishingSpots(now);
      expect(testFishingSpot.depleted).toBe(false);
    });
  });

  describe('Performance and Memory Management', () => {
    beforeEach(async () => {
      await miningSystem.init();
      await fishingSystem.init();
      await woodcuttingSystem.init();
      await hunterSystem.init();
    });

    it('should properly clean up systems without memory leaks', () => {
      // Start activities in all systems
      const miningNodes = miningSystem.getMiningNodes();
      const fishingSpots = fishingSystem.getSpotInstances();
      const treeNodes = woodcuttingSystem.getTreeNodes();
      
      // Start mining
      const ironNode = Array.from(miningNodes.values()).find(node => node.rockId === 'iron');
      if (ironNode) {
        miningSystem.startMining('test-player', ironNode.id);
      }

      // Set trap
      hunterSystem.setTrap('test-player', 'rabbit', { x: 70, y: 0, z: 0 });

      // Track initial state
      const initialTraps = hunterSystem.getPlayerTraps('test-player').length;
      const initialMiningActions = miningSystem.getActiveActions().size;

      // Clean up systems
      miningSystem.destroy();
      fishingSystem.destroy();
      woodcuttingSystem.destroy();
      hunterSystem.destroy();

      // Verify event listeners were removed
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:start_mining');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:start_fishing');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:start_woodcutting');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:start_hunting');
    });

    it('should handle concurrent system operations efficiently', () => {
      const startTime = Date.now();
      
      // Simulate concurrent operations
      const miningNodes = miningSystem.getMiningNodes();
      const fishingSpots = fishingSystem.getSpotInstances();
      const treeNodes = woodcuttingSystem.getTreeNodes();
      const creatureInstances = hunterSystem.getCreatureInstances();

      // Process all system ticks
      miningSystem.tick(16); // 60 FPS delta
      fishingSystem.tick(16);
      woodcuttingSystem.tick(16);
      hunterSystem.tick(16);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process quickly (under 50ms for all systems)
      expect(processingTime).toBeLessThan(50);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent item IDs across systems', () => {
      // Verify that item IDs are consistent and don't conflict
      const miningRocks = miningSystem.getMiningRocks();
      const fishingSpots = fishingSystem.getFishingSpots();
      const trees = woodcuttingSystem.getTrees();
      const creatures = hunterSystem.getCreatures();

      // Collect all item IDs from all systems
      const allItemIds = new Set<number>();
      
      // Mining ore IDs
      for (const rock of miningRocks.values()) {
        allItemIds.add(rock.oreId);
      }
      
      // Fishing item IDs
      for (const spot of fishingSpots.values()) {
        for (const fish of spot.fishTypes) {
          allItemIds.add(fish.itemId);
        }
      }
      
      // Woodcutting log IDs
      for (const tree of trees.values()) {
        allItemIds.add(tree.logId);
      }
      
      // Hunter loot IDs
      for (const creature of creatures.values()) {
        allItemIds.add(creature.primaryLoot);
        if (creature.secondaryLoot) {
          for (const loot of creature.secondaryLoot) {
            allItemIds.add(loot.itemId);
          }
        }
      }

      // Verify we have a reasonable number of unique items
      expect(allItemIds.size).toBeGreaterThan(20);
      expect(allItemIds.size).toBeLessThan(100);
    });

    it('should have consistent XP values across skill levels', () => {
      const miningRocks = miningSystem.getMiningRocks();
      const fishingSpots = fishingSystem.getFishingSpots();
      const trees = woodcuttingSystem.getTrees();
      const creatures = hunterSystem.getCreatures();

      // Verify XP progression makes sense
      const copperXP = miningRocks.get('copper')?.xp || 0;
      const ironXP = miningRocks.get('iron')?.xp || 0;
      const coalXP = miningRocks.get('coal')?.xp || 0;
      
      expect(ironXP).toBeGreaterThan(copperXP);
      expect(coalXP).toBeGreaterThan(ironXP);

      // Check fishing XP progression
      const shrimpSpot = fishingSpots.get('shrimp_spot');
      const troutSpot = fishingSpots.get('trout_spot');
      
      if (shrimpSpot && troutSpot) {
        const shrimpXP = shrimpSpot.fishTypes[0]?.xp || 0;
        const troutXP = troutSpot.fishTypes[0]?.xp || 0;
        expect(troutXP).toBeGreaterThan(shrimpXP);
      }

      // Check woodcutting XP progression
      const normalXP = trees.get('normal')?.xp || 0;
      const oakXP = trees.get('oak')?.xp || 0;
      const magicXP = trees.get('magic')?.xp || 0;
      
      expect(oakXP).toBeGreaterThan(normalXP);
      expect(magicXP).toBeGreaterThan(oakXP);
    });
  });
});