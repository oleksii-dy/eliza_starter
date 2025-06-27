/**
 * Smithing System Tests
 * ====================
 * Tests for RuneScape smithing mechanics implementation
 */

import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test';
import { SmithingSystem } from '../rpg/systems/SmithingSystem';
import { createMockWorld } from './test-utils';

describe('SmithingSystem', () => {
  let smithingSystem: SmithingSystem;
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
          smithing: { level: 50, currentXp: 101333, maxLevel: 99 },
          combat: { level: 3, currentXp: 0, maxLevel: 126 }
        },
        inventory: {
          items: [
            { itemId: 2347, quantity: 1 }, // Hammer
            { itemId: 436, quantity: 10 }, // Copper ore
            { itemId: 438, quantity: 10 }, // Tin ore
            { itemId: 440, quantity: 15 }, // Iron ore
            { itemId: 453, quantity: 20 }, // Coal
            { itemId: 2349, quantity: 5 }, // Bronze bar
            { itemId: 2351, quantity: 3 }, // Iron bar
            { itemId: 2353, quantity: 2 }, // Steel bar
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null
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

    smithingSystem = new SmithingSystem(mockWorld);
  });

  describe('System Initialization', () => {
    it('should initialize with correct name and enabled state', () => {
      expect(smithingSystem.name).toBe('SmithingSystem');
      expect(smithingSystem.enabled).toBe(true);
    });

    it('should load smelting and smithing recipes', () => {
      const smeltingRecipes = smithingSystem.getSmeltingRecipes();
      const smithingRecipes = smithingSystem.getSmithingRecipes();

      expect(smeltingRecipes.size).toBeGreaterThan(0);
      expect(smithingRecipes.size).toBeGreaterThan(0);
      
      // Check for specific recipes
      expect(smeltingRecipes.has('bronze_bar')).toBe(true);
      expect(smeltingRecipes.has('iron_bar')).toBe(true);
      expect(smeltingRecipes.has('steel_bar')).toBe(true);
      expect(smithingRecipes.has('bronze_dagger')).toBe(true);
      expect(smithingRecipes.has('iron_sword')).toBe(true);
    });

    it('should set up event listeners during init', async () => {
      await smithingSystem.init();
      
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:start_smelting', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:start_smithing', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:stop_smithing', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:smelt_ore', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:smith_item', expect.any(Function));
    });

    it('should spawn furnaces and anvils', async () => {
      await smithingSystem.init();
      
      const furnaces = smithingSystem.getFurnaces();
      const anvils = smithingSystem.getAnvils();
      
      expect(furnaces.size).toBeGreaterThan(0);
      expect(anvils.size).toBeGreaterThan(0);
    });
  });

  describe('Smelting Recipes', () => {
    it('should have correct bronze bar recipe', () => {
      const recipes = smithingSystem.getSmeltingRecipes();
      const bronzeBar = recipes.get('bronze_bar');
      
      expect(bronzeBar).toBeDefined();
      expect(bronzeBar!.name).toBe('Bronze bar');
      expect(bronzeBar!.level).toBe(1);
      expect(bronzeBar!.xp).toBe(6.25);
      expect(bronzeBar!.outputItem).toBe(2349); // Bronze bar
      expect(bronzeBar!.ingredients).toHaveLength(2); // Copper + tin
    });

    it('should have correct steel bar recipe', () => {
      const recipes = smithingSystem.getSmeltingRecipes();
      const steelBar = recipes.get('steel_bar');
      
      expect(steelBar).toBeDefined();
      expect(steelBar!.name).toBe('Steel bar');
      expect(steelBar!.level).toBe(30);
      expect(steelBar!.xp).toBe(17.5);
      expect(steelBar!.outputItem).toBe(2353); // Steel bar
      expect(steelBar!.ingredients).toHaveLength(2); // Iron + coal
      
      // Check coal requirement (2 coal per steel bar)
      const coalRequirement = steelBar!.ingredients.find(ing => ing.itemId === 453);
      expect(coalRequirement?.quantity).toBe(2);
    });

    it('should have correct rune bar recipe', () => {
      const recipes = smithingSystem.getSmeltingRecipes();
      const runeBar = recipes.get('rune_bar');
      
      expect(runeBar).toBeDefined();
      expect(runeBar!.name).toBe('Runite bar');
      expect(runeBar!.level).toBe(85);
      expect(runeBar!.xp).toBe(50);
      expect(runeBar!.outputItem).toBe(2363); // Runite bar
      
      // Check coal requirement (8 coal per rune bar)
      const coalRequirement = runeBar!.ingredients.find(ing => ing.itemId === 453);
      expect(coalRequirement?.quantity).toBe(8);
    });
  });

  describe('Smithing Recipes', () => {
    it('should have correct bronze dagger recipe', () => {
      const recipes = smithingSystem.getSmithingRecipes();
      const bronzeDagger = recipes.get('bronze_dagger');
      
      expect(bronzeDagger).toBeDefined();
      expect(bronzeDagger!.name).toBe('Bronze dagger');
      expect(bronzeDagger!.level).toBe(1);
      expect(bronzeDagger!.xp).toBe(12.5);
      expect(bronzeDagger!.outputItem).toBe(1205); // Bronze dagger
      expect(bronzeDagger!.category).toBe('weapons');
    });

    it('should have progressive level requirements', () => {
      const recipes = smithingSystem.getSmithingRecipes();
      
      const bronzeDagger = recipes.get('bronze_dagger');
      const ironDagger = recipes.get('iron_dagger');
      const steelDagger = recipes.get('steel_dagger');
      const mithrilDagger = recipes.get('mithril_dagger');
      
      expect(bronzeDagger!.level).toBe(1);
      expect(ironDagger!.level).toBe(15);
      expect(steelDagger!.level).toBe(30);
      expect(mithrilDagger!.level).toBe(50);
      
      // XP should also progress
      expect(ironDagger!.xp).toBeGreaterThan(bronzeDagger!.xp);
      expect(steelDagger!.xp).toBeGreaterThan(ironDagger!.xp);
      expect(mithrilDagger!.xp).toBeGreaterThan(steelDagger!.xp);
    });
  });

  describe('Smelting Mechanics', () => {
    beforeEach(async () => {
      await smithingSystem.init();
    });

    it('should successfully start smelting bronze bars', () => {
      const furnaces = smithingSystem.getFurnaces();
      const furnaceId = Array.from(furnaces.keys())[0];
      
      const result = smithingSystem.startSmelting('test-player', 'bronze_bar', furnaceId, 1);
      expect(result).toBe(true);
      
      expect(smithingSystem.isPlayerSmithing('test-player')).toBe(true);
    });

    it('should fail to smelt without required ingredients', () => {
      // Remove copper ore from inventory
      mockPlayer.data.inventory.items[1] = null;
      
      const furnaces = smithingSystem.getFurnaces();
      const furnaceId = Array.from(furnaces.keys())[0];
      
      const result = smithingSystem.startSmelting('test-player', 'bronze_bar', furnaceId, 1);
      expect(result).toBe(false);
    });

    it('should fail to smelt without required level', () => {
      // Lower player smithing level
      mockPlayer.data.stats.smithing.level = 20;
      
      const furnaces = smithingSystem.getFurnaces();
      const furnaceId = Array.from(furnaces.keys())[0];
      
      const result = smithingSystem.startSmelting('test-player', 'steel_bar', furnaceId, 1);
      expect(result).toBe(false);
    });

    it('should consume ingredients when smelting', () => {
      const furnaces = smithingSystem.getFurnaces();
      const furnaceId = Array.from(furnaces.keys())[0];
      
      smithingSystem.startSmelting('test-player', 'bronze_bar', furnaceId, 1);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 436, // Copper ore
        quantity: 1,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 438, // Tin ore
        quantity: 1,
      });
    });

    it('should mark furnace as in use', () => {
      const furnaces = smithingSystem.getFurnaces();
      const furnaceId = Array.from(furnaces.keys())[0];
      const furnace = furnaces.get(furnaceId)!;
      
      expect(furnace.inUse).toBe(false);
      
      smithingSystem.startSmelting('test-player', 'bronze_bar', furnaceId, 1);
      
      expect(furnace.inUse).toBe(true);
      expect(furnace.userId).toBe('test-player');
    });
  });

  describe('Smithing Mechanics', () => {
    beforeEach(async () => {
      await smithingSystem.init();
    });

    it('should successfully start smithing bronze dagger', () => {
      const anvils = smithingSystem.getAnvils();
      const anvilId = Array.from(anvils.keys())[0];
      
      const result = smithingSystem.startSmithing('test-player', 'bronze_dagger', anvilId, 1);
      expect(result).toBe(true);
      
      expect(smithingSystem.isPlayerSmithing('test-player')).toBe(true);
    });

    it('should fail to smith without hammer', () => {
      // Remove hammer from inventory
      mockPlayer.data.inventory.items[0] = null;
      
      const anvils = smithingSystem.getAnvils();
      const anvilId = Array.from(anvils.keys())[0];
      
      const result = smithingSystem.startSmithing('test-player', 'bronze_dagger', anvilId, 1);
      expect(result).toBe(false);
    });

    it('should fail to smith without required bars', () => {
      // Remove bronze bars from inventory
      mockPlayer.data.inventory.items[5] = null;
      
      const anvils = smithingSystem.getAnvils();
      const anvilId = Array.from(anvils.keys())[0];
      
      const result = smithingSystem.startSmithing('test-player', 'bronze_dagger', anvilId, 1);
      expect(result).toBe(false);
    });

    it('should consume bars when smithing', () => {
      const anvils = smithingSystem.getAnvils();
      const anvilId = Array.from(anvils.keys())[0];
      
      smithingSystem.startSmithing('test-player', 'bronze_dagger', anvilId, 1);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 2349, // Bronze bar
        quantity: 1,
      });
    });
  });

  describe('Station Management', () => {
    beforeEach(async () => {
      await smithingSystem.init();
    });

    it('should prevent using occupied furnace', () => {
      const furnaces = smithingSystem.getFurnaces();
      const furnaceId = Array.from(furnaces.keys())[0];
      
      // First player starts smelting
      smithingSystem.startSmelting('test-player', 'bronze_bar', furnaceId, 1);
      
      // Add second player
      const secondPlayer = { ...mockPlayer };
      mockWorld.entities.players.set('test-player-2', secondPlayer);
      
      // Second player tries to use same furnace
      const result = smithingSystem.startSmelting('test-player-2', 'iron_bar', furnaceId, 1);
      expect(result).toBe(false);
    });

    it('should prevent using occupied anvil', () => {
      const anvils = smithingSystem.getAnvils();
      const anvilId = Array.from(anvils.keys())[0];
      
      // First player starts smithing
      smithingSystem.startSmithing('test-player', 'bronze_dagger', anvilId, 1);
      
      // Add second player
      const secondPlayer = { ...mockPlayer };
      mockWorld.entities.players.set('test-player-2', secondPlayer);
      
      // Second player tries to use same anvil
      const result = smithingSystem.startSmithing('test-player-2', 'iron_dagger', anvilId, 1);
      expect(result).toBe(false);
    });

    it('should free station when stopping smithing', () => {
      const furnaces = smithingSystem.getFurnaces();
      const furnaceId = Array.from(furnaces.keys())[0];
      const furnace = furnaces.get(furnaceId)!;
      
      smithingSystem.startSmelting('test-player', 'bronze_bar', furnaceId, 1);
      expect(furnace.inUse).toBe(true);
      
      smithingSystem.stopSmithing('test-player');
      expect(furnace.inUse).toBe(false);
      expect(furnace.userId).toBeNull();
    });
  });

  describe('Validation Methods', () => {
    beforeEach(async () => {
      await smithingSystem.init();
    });

    it('should validate smelting capability correctly', () => {
      // Valid case
      const validResult = smithingSystem.canSmeltBar('test-player', 'bronze');
      expect(validResult.canSmelt).toBe(true);
      
      // Invalid level
      mockPlayer.data.stats.smithing.level = 10;
      const invalidLevelResult = smithingSystem.canSmeltBar('test-player', 'steel');
      expect(invalidLevelResult.canSmelt).toBe(false);
      expect(invalidLevelResult.reason).toContain('level');
      
      // Missing ingredients
      mockPlayer.data.inventory.items[1] = null; // Remove copper ore
      const missingIngredientsResult = smithingSystem.canSmeltBar('test-player', 'bronze');
      expect(missingIngredientsResult.canSmelt).toBe(false);
      expect(missingIngredientsResult.reason).toContain('ores');
    });

    it('should validate smithing capability correctly', () => {
      // Valid case
      const validResult = smithingSystem.canSmithItem('test-player', 'bronze_dagger');
      expect(validResult.canSmith).toBe(true);
      
      // Missing hammer
      mockPlayer.data.inventory.items[0] = null; // Remove hammer
      const noHammerResult = smithingSystem.canSmithItem('test-player', 'bronze_dagger');
      expect(noHammerResult.canSmith).toBe(false);
      expect(noHammerResult.reason).toContain('hammer');
      
      // Missing bars
      mockPlayer.data.inventory.items[0] = { itemId: 2347, quantity: 1 }; // Add hammer back
      mockPlayer.data.inventory.items[5] = null; // Remove bronze bars
      const missingBarsResult = smithingSystem.canSmithItem('test-player', 'bronze_dagger');
      expect(missingBarsResult.canSmith).toBe(false);
      expect(missingBarsResult.reason).toContain('bars');
    });

    it('should validate unknown recipes', () => {
      const unknownSmeltResult = smithingSystem.canSmeltBar('test-player', 'unknown');
      expect(unknownSmeltResult.canSmelt).toBe(false);
      expect(unknownSmeltResult.reason).toContain('Unknown');
      
      const unknownSmithResult = smithingSystem.canSmithItem('test-player', 'unknown_item');
      expect(unknownSmithResult.canSmith).toBe(false);
      expect(unknownSmithResult.reason).toContain('Unknown');
    });
  });

  describe('Production Processing', () => {
    beforeEach(async () => {
      await smithingSystem.init();
    });

    it('should calculate appropriate duration for production', () => {
      const recipes = smithingSystem.getSmeltingRecipes();
      const bronzeBar = recipes.get('bronze_bar')!;
      
      const duration1 = (smithingSystem as any).calculateSmithingDuration(bronzeBar, 1);
      const duration5 = (smithingSystem as any).calculateSmithingDuration(bronzeBar, 5);
      
      expect(duration5).toBeGreaterThan(duration1);
      expect(duration1).toBeGreaterThanOrEqual(1000); // Minimum 1 second
    });

    it('should process production and grant rewards', () => {
      const furnaces = smithingSystem.getFurnaces();
      const furnaceId = Array.from(furnaces.keys())[0];
      
      smithingSystem.startSmelting('test-player', 'bronze_bar', furnaceId, 1);
      
      const activeActions = smithingSystem.getActiveActions();
      const action = activeActions.get('test-player')!;
      
      // Simulate production
      (smithingSystem as any).processSmithingProduction(action);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', {
        playerId: 'test-player',
        itemId: 2349, // Bronze bar
        quantity: 1,
        noted: false,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'smithing',
        amount: 6.25,
        source: 'smithing',
      });
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await smithingSystem.init();
    });

    it('should handle start smelting event', () => {
      const startSmeltingSpy = spyOn(smithingSystem, 'startSmelting');
      
      (smithingSystem as any).handleStartSmelting({
        playerId: 'test-player',
        recipeId: 'bronze_bar',
        furnaceId: 'furnace_1',
        quantity: 5
      });
      
      expect(startSmeltingSpy).toHaveBeenCalledWith('test-player', 'bronze_bar', 'furnace_1', 5);
    });

    it('should handle start smithing event', () => {
      const startSmithingSpy = spyOn(smithingSystem, 'startSmithing');
      
      (smithingSystem as any).handleStartSmithing({
        playerId: 'test-player',
        recipeId: 'bronze_dagger',
        anvilId: 'anvil_1',
        quantity: 3
      });
      
      expect(startSmithingSpy).toHaveBeenCalledWith('test-player', 'bronze_dagger', 'anvil_1', 3);
    });

    it('should handle stop smithing event', () => {
      const stopSmithingSpy = spyOn(smithingSystem, 'stopSmithing');
      
      (smithingSystem as any).handleStopSmithing({
        playerId: 'test-player'
      });
      
      expect(stopSmithingSpy).toHaveBeenCalledWith('test-player');
    });

    it('should handle smelt ore event', () => {
      const startSmeltingSpy = spyOn(smithingSystem, 'startSmelting');
      
      (smithingSystem as any).handleSmeltOre({
        playerId: 'test-player',
        barType: 'iron'
      });
      
      expect(startSmeltingSpy).toHaveBeenCalledWith('test-player', 'iron_bar', expect.any(String), 1);
    });

    it('should handle smith item event', () => {
      const startSmithingSpy = spyOn(smithingSystem, 'startSmithing');
      
      (smithingSystem as any).handleSmithItem({
        playerId: 'test-player',
        itemType: 'bronze_sword'
      });
      
      expect(startSmithingSpy).toHaveBeenCalledWith('test-player', 'bronze_sword', expect.any(String), 1);
    });
  });

  describe('System Cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      smithingSystem.destroy();
      
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:start_smelting');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:start_smithing');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:stop_smithing');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:smelt_ore');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:smith_item');
    });
  });
});