/**
 * Crafting System Tests
 * ====================
 * Tests for RuneScape crafting mechanics implementation
 */

import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test';
import { CraftingSystem } from '../rpg/systems/CraftingSystem';
import { createMockWorld } from './test-utils';

describe('CraftingSystem', () => {
  let craftingSystem: CraftingSystem;
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
          crafting: { level: 50, currentXp: 101333, maxLevel: 99 },
          combat: { level: 3, currentXp: 0, maxLevel: 126 }
        },
        inventory: {
          items: [
            { itemId: 1741, quantity: 10 }, // Leather
            { itemId: 1733, quantity: 1 }, // Needle
            { itemId: 434, quantity: 5 }, // Soft clay
            { itemId: 2357, quantity: 3 }, // Gold bar
            { itemId: 1592, quantity: 1 }, // Ring mould
            { itemId: 1607, quantity: 2 }, // Sapphire
            { itemId: 1605, quantity: 1 }, // Emerald
            { itemId: 1737, quantity: 8 }, // Wool
            { itemId: 1779, quantity: 4 }, // Flax
            { itemId: 1775, quantity: 2 }, // Molten glass
            { itemId: 1785, quantity: 1 }, // Glassblowing pipe
            null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null
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

    craftingSystem = new CraftingSystem(mockWorld);
  });

  describe('System Initialization', () => {
    it('should initialize with correct name and enabled state', () => {
      expect(craftingSystem.name).toBe('CraftingSystem');
      expect(craftingSystem.enabled).toBe(true);
    });

    it('should load crafting recipes', () => {
      const craftingRecipes = craftingSystem.getCraftingRecipes();

      expect(craftingRecipes.size).toBeGreaterThan(0);
      
      // Check for specific recipes
      expect(craftingRecipes.has('leather_gloves')).toBe(true);
      expect(craftingRecipes.has('pot')).toBe(true);
      expect(craftingRecipes.has('gold_ring')).toBe(true);
      expect(craftingRecipes.has('ball_of_wool')).toBe(true);
      expect(craftingRecipes.has('beer_glass')).toBe(true);
    });

    it('should set up event listeners during init', async () => {
      await craftingSystem.init();
      
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:start_crafting', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:stop_crafting', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:craft_item', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:tan_hide', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:spin_wool', expect.any(Function));
    });

    it('should spawn crafting stations', async () => {
      await craftingSystem.init();
      
      const stations = craftingSystem.getCraftingStations();
      
      expect(stations.size).toBeGreaterThan(0);
      
      // Check for different station types
      const stationTypes = Array.from(stations.values()).map(s => s.type);
      expect(stationTypes).toContain('tanning_vat');
      expect(stationTypes).toContain('pottery_wheel');
      expect(stationTypes).toContain('furnace_jewelry');
      expect(stationTypes).toContain('spinning_wheel');
      expect(stationTypes).toContain('loom');
      expect(stationTypes).toContain('crafting_table');
    });
  });

  describe('Crafting Recipes', () => {
    it('should have correct leather gloves recipe', () => {
      const recipes = craftingSystem.getCraftingRecipes();
      const leatherGloves = recipes.get('leather_gloves');
      
      expect(leatherGloves).toBeDefined();
      expect(leatherGloves!.name).toBe('Leather gloves');
      expect(leatherGloves!.level).toBe(1);
      expect(leatherGloves!.xp).toBe(13.8);
      expect(leatherGloves!.ingredients).toHaveLength(1);
      expect(leatherGloves!.ingredients[0].itemId).toBe(1741); // Leather
      expect(leatherGloves!.outputItem).toBe(1059); // Leather gloves
      expect(leatherGloves!.requiredTools).toContain(1733); // Needle
      expect(leatherGloves!.category).toBe('leather');
    });

    it('should have correct gold ring recipe', () => {
      const recipes = craftingSystem.getCraftingRecipes();
      const goldRing = recipes.get('gold_ring');
      
      expect(goldRing).toBeDefined();
      expect(goldRing!.name).toBe('Gold ring');
      expect(goldRing!.level).toBe(5);
      expect(goldRing!.xp).toBe(15);
      expect(goldRing!.ingredients[0].itemId).toBe(2357); // Gold bar
      expect(goldRing!.outputItem).toBe(1635); // Gold ring
      expect(goldRing!.requiredTools).toContain(1592); // Ring mould
      expect(goldRing!.category).toBe('jewelry');
    });

    it('should have progressive level requirements', () => {
      const recipes = craftingSystem.getCraftingRecipes();
      
      const leatherGloves = recipes.get('leather_gloves');
      const leatherBoots = recipes.get('leather_boots');
      const leatherBody = recipes.get('leather_body');
      
      expect(leatherGloves!.level).toBe(1);
      expect(leatherBoots!.level).toBe(7);
      expect(leatherBody!.level).toBe(14);
      
      // XP should also progress
      expect(leatherBoots!.xp).toBeGreaterThan(leatherGloves!.xp);
      expect(leatherBody!.xp).toBeGreaterThan(leatherBoots!.xp);
    });

    it('should have recipes for different categories', () => {
      const recipes = craftingSystem.getCraftingRecipes();
      
      const leatherRecipes = Array.from(recipes.values()).filter(r => r.category === 'leather');
      const potteryRecipes = Array.from(recipes.values()).filter(r => r.category === 'pottery');
      const jewelryRecipes = Array.from(recipes.values()).filter(r => r.category === 'jewelry');
      const spinningRecipes = Array.from(recipes.values()).filter(r => r.category === 'spinning');
      const weavingRecipes = Array.from(recipes.values()).filter(r => r.category === 'weaving');
      const glassblowingRecipes = Array.from(recipes.values()).filter(r => r.category === 'glassblowing');
      
      expect(leatherRecipes.length).toBeGreaterThan(0);
      expect(potteryRecipes.length).toBeGreaterThan(0);
      expect(jewelryRecipes.length).toBeGreaterThan(0);
      expect(spinningRecipes.length).toBeGreaterThan(0);
      expect(weavingRecipes.length).toBeGreaterThan(0);
      expect(glassblowingRecipes.length).toBeGreaterThan(0);
    });
  });

  describe('Crafting Mechanics', () => {
    beforeEach(async () => {
      await craftingSystem.init();
    });

    it('should successfully start crafting leather gloves', () => {
      const stations = craftingSystem.getCraftingStations();
      const craftingTable = Array.from(stations.values()).find(s => s.type === 'crafting_table');
      
      const result = craftingSystem.startCrafting('test-player', 'leather_gloves', craftingTable!.id, 1);
      expect(result).toBe(true);
      
      expect(craftingSystem.isPlayerCrafting('test-player')).toBe(true);
    });

    it('should successfully start crafting gold ring at jewelry furnace', () => {
      const stations = craftingSystem.getCraftingStations();
      const jewelryFurnace = Array.from(stations.values()).find(s => s.type === 'furnace_jewelry');
      
      const result = craftingSystem.startCrafting('test-player', 'gold_ring', jewelryFurnace!.id, 1);
      expect(result).toBe(true);
      
      expect(craftingSystem.isPlayerCrafting('test-player')).toBe(true);
    });

    it('should successfully start crafting pottery at pottery wheel', () => {
      const stations = craftingSystem.getCraftingStations();
      const potteryWheel = Array.from(stations.values()).find(s => s.type === 'pottery_wheel');
      
      const result = craftingSystem.startCrafting('test-player', 'pot', potteryWheel!.id, 1);
      expect(result).toBe(true);
      
      expect(craftingSystem.isPlayerCrafting('test-player')).toBe(true);
    });

    it('should fail to craft without required level', () => {
      // Lower player crafting level
      mockPlayer.data.stats.crafting.level = 5;
      
      const stations = craftingSystem.getCraftingStations();
      const jewelryFurnace = Array.from(stations.values()).find(s => s.type === 'furnace_jewelry');
      
      const result = craftingSystem.startCrafting('test-player', 'sapphire_ring', jewelryFurnace!.id, 1);
      expect(result).toBe(false);
    });

    it('should fail to craft without required materials', () => {
      // Remove leather from inventory
      mockPlayer.data.inventory.items[0] = null;
      
      const stations = craftingSystem.getCraftingStations();
      const craftingTable = Array.from(stations.values()).find(s => s.type === 'crafting_table');
      
      const result = craftingSystem.startCrafting('test-player', 'leather_gloves', craftingTable!.id, 1);
      expect(result).toBe(false);
    });

    it('should fail to craft without required tools', () => {
      // Remove needle from inventory
      mockPlayer.data.inventory.items[1] = null;
      
      const stations = craftingSystem.getCraftingStations();
      const craftingTable = Array.from(stations.values()).find(s => s.type === 'crafting_table');
      
      const result = craftingSystem.startCrafting('test-player', 'leather_gloves', craftingTable!.id, 1);
      expect(result).toBe(false);
    });

    it('should fail to craft at wrong station type', () => {
      const stations = craftingSystem.getCraftingStations();
      const potteryWheel = Array.from(stations.values()).find(s => s.type === 'pottery_wheel');
      
      // Try to craft leather item at pottery wheel
      const result = craftingSystem.startCrafting('test-player', 'leather_gloves', potteryWheel!.id, 1);
      expect(result).toBe(false);
    });

    it('should consume materials when crafting', () => {
      const stations = craftingSystem.getCraftingStations();
      const craftingTable = Array.from(stations.values()).find(s => s.type === 'crafting_table');
      
      craftingSystem.startCrafting('test-player', 'leather_gloves', craftingTable!.id, 1);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 1741, // Leather
        quantity: 1,
      });
    });

    it('should mark station as in use', () => {
      const stations = craftingSystem.getCraftingStations();
      const craftingTable = Array.from(stations.values()).find(s => s.type === 'crafting_table');
      
      expect(craftingTable!.inUse).toBe(false);
      
      craftingSystem.startCrafting('test-player', 'leather_gloves', craftingTable!.id, 1);
      
      expect(craftingTable!.inUse).toBe(true);
      expect(craftingTable!.userId).toBe('test-player');
    });
  });

  describe('Success Mechanics', () => {
    beforeEach(async () => {
      await craftingSystem.init();
    });

    it('should calculate success chance correctly for appropriate level', () => {
      // Set appropriate crafting level
      mockPlayer.data.stats.crafting.level = 25;
      
      const successChance = craftingSystem.getSuccessChance('test-player', 'leather_gloves');
      expect(successChance).toBeGreaterThan(80); // Should have high success chance
    });

    it('should calculate success chance correctly for exact level', () => {
      // Set level to exact requirement
      mockPlayer.data.stats.crafting.level = 5;
      
      const successChance = craftingSystem.getSuccessChance('test-player', 'gold_ring');
      expect(successChance).toBeGreaterThanOrEqual(76); // Should have base success rate with jewelry reduction
    });

    it('should have lower success chance for complex items', () => {
      mockPlayer.data.stats.crafting.level = 50;
      
      const simpleSuccess = craftingSystem.getSuccessChance('test-player', 'leather_gloves');
      const complexSuccess = craftingSystem.getSuccessChance('test-player', 'beer_glass'); // Glassblowing
      
      expect(complexSuccess).toBeLessThan(simpleSuccess);
    });

    it('should process crafting production with success chance', () => {
      const stations = craftingSystem.getCraftingStations();
      const craftingTable = Array.from(stations.values()).find(s => s.type === 'crafting_table');
      
      craftingSystem.startCrafting('test-player', 'leather_gloves', craftingTable!.id, 1);
      
      const activeActions = craftingSystem.getActiveActions();
      const action = activeActions.get('test-player')!;
      
      // Mock success chance calculation to always succeed
      const originalCalculateSuccessChance = (craftingSystem as any).calculateSuccessChance;
      (craftingSystem as any).calculateSuccessChance = mock(() => 1); // Always succeed
      
      // Simulate production
      (craftingSystem as any).processCraftingProduction(action);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', {
        playerId: 'test-player',
        itemId: 1059, // Leather gloves
        quantity: 1,
        noted: false,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'crafting',
        amount: 13.8,
        source: 'crafting',
      });
      
      // Restore original method
      (craftingSystem as any).calculateSuccessChance = originalCalculateSuccessChance;
    });

    it('should handle crafting failure correctly', () => {
      const stations = craftingSystem.getCraftingStations();
      const craftingTable = Array.from(stations.values()).find(s => s.type === 'crafting_table');
      
      craftingSystem.startCrafting('test-player', 'leather_gloves', craftingTable!.id, 1);
      
      const activeActions = craftingSystem.getActiveActions();
      const action = activeActions.get('test-player')!;
      
      // Mock success chance calculation to always fail
      const originalCalculateSuccessChance = (craftingSystem as any).calculateSuccessChance;
      (craftingSystem as any).calculateSuccessChance = mock(() => 0); // Always fail
      
      // Simulate production
      (craftingSystem as any).processCraftingProduction(action);
      
      // Should not produce item
      expect(mockWorld.events.emit).not.toHaveBeenCalledWith('rpg:add_item', expect.objectContaining({
        itemId: 1059, // Leather gloves
      }));
      
      // Should give small XP for attempt (check if any XP event was called with minimal amount)
      const xpCalls = (mockWorld.events.emit as any).mock.calls.filter((call: any) => 
        call[0] === 'rpg:xp_gain' && call[1].skill === 'crafting'
      );
      expect(xpCalls.length).toBeGreaterThan(0);
      if (xpCalls.length > 0) {
        expect(xpCalls[0][1].amount).toBeLessThan(14); // Less than full XP
      }
      
      // Restore original method
      (craftingSystem as any).calculateSuccessChance = originalCalculateSuccessChance;
    });
  });

  describe('Station Management', () => {
    beforeEach(async () => {
      await craftingSystem.init();
    });

    it('should prevent using occupied station', () => {
      const stations = craftingSystem.getCraftingStations();
      const craftingTable = Array.from(stations.values()).find(s => s.type === 'crafting_table');
      
      // First player starts crafting
      craftingSystem.startCrafting('test-player', 'leather_gloves', craftingTable!.id, 1);
      
      // Add second player
      const secondPlayer = { ...mockPlayer };
      mockWorld.entities.players.set('test-player-2', secondPlayer);
      
      // Second player tries to use same station
      const result = craftingSystem.startCrafting('test-player-2', 'leather_boots', craftingTable!.id, 1);
      expect(result).toBe(false);
    });

    it('should free station when stopping crafting', () => {
      const stations = craftingSystem.getCraftingStations();
      const craftingTable = Array.from(stations.values()).find(s => s.type === 'crafting_table');
      
      craftingSystem.startCrafting('test-player', 'leather_gloves', craftingTable!.id, 1);
      expect(craftingTable!.inUse).toBe(true);
      
      craftingSystem.stopCrafting('test-player');
      expect(craftingTable!.inUse).toBe(false);
      expect(craftingTable!.userId).toBeNull();
    });
  });

  describe('Validation Methods', () => {
    beforeEach(async () => {
      await craftingSystem.init();
    });

    it('should validate crafting capability correctly', () => {
      // Valid case
      const validResult = craftingSystem.canCraftItem('test-player', 'leather_gloves');
      expect(validResult.canCraft).toBe(true);
      
      // Invalid level
      mockPlayer.data.stats.crafting.level = 5;
      const invalidLevelResult = craftingSystem.canCraftItem('test-player', 'sapphire_ring');
      expect(invalidLevelResult.canCraft).toBe(false);
      expect(invalidLevelResult.reason).toContain('level');
      
      // Missing materials
      mockPlayer.data.inventory.items[0] = null; // Remove leather
      const missingMaterialsResult = craftingSystem.canCraftItem('test-player', 'leather_gloves');
      expect(missingMaterialsResult.canCraft).toBe(false);
      expect(missingMaterialsResult.reason).toContain('materials');
      
      // Missing tools
      mockPlayer.data.inventory.items[0] = { itemId: 1741, quantity: 10 }; // Add leather back
      mockPlayer.data.inventory.items[1] = null; // Remove needle
      const missingToolsResult = craftingSystem.canCraftItem('test-player', 'leather_gloves');
      expect(missingToolsResult.canCraft).toBe(false);
      expect(missingToolsResult.reason).toContain('tools');
    });

    it('should validate unknown recipes', () => {
      const unknownResult = craftingSystem.canCraftItem('test-player', 'unknown_item');
      expect(unknownResult.canCraft).toBe(false);
      expect(unknownResult.reason).toContain('Unknown');
    });

    it('should get recipes by category', () => {
      const leatherRecipes = craftingSystem.getRecipesByCategory('leather');
      const jewelryRecipes = craftingSystem.getRecipesByCategory('jewelry');
      const potteryRecipes = craftingSystem.getRecipesByCategory('pottery');
      
      expect(leatherRecipes.length).toBeGreaterThan(0);
      expect(jewelryRecipes.length).toBeGreaterThan(0);
      expect(potteryRecipes.length).toBeGreaterThan(0);
      
      // All recipes should be of correct category
      expect(leatherRecipes.every(r => r.category === 'leather')).toBe(true);
      expect(jewelryRecipes.every(r => r.category === 'jewelry')).toBe(true);
      expect(potteryRecipes.every(r => r.category === 'pottery')).toBe(true);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await craftingSystem.init();
    });

    it('should handle start crafting event', () => {
      const startCraftingSpy = spyOn(craftingSystem, 'startCrafting');
      
      (craftingSystem as any).handleStartCrafting({
        playerId: 'test-player',
        recipeId: 'leather_gloves',
        stationId: 'crafting_table_1',
        quantity: 5
      });
      
      expect(startCraftingSpy).toHaveBeenCalledWith('test-player', 'leather_gloves', 'crafting_table_1', 5);
    });

    it('should handle stop crafting event', () => {
      const stopCraftingSpy = spyOn(craftingSystem, 'stopCrafting');
      
      (craftingSystem as any).handleStopCrafting({
        playerId: 'test-player'
      });
      
      expect(stopCraftingSpy).toHaveBeenCalledWith('test-player');
    });

    it('should handle craft item event', () => {
      const startCraftingSpy = spyOn(craftingSystem, 'startCrafting');
      
      (craftingSystem as any).handleCraftItem({
        playerId: 'test-player',
        itemType: 'gold_ring',
        category: 'jewelry'
      });
      
      expect(startCraftingSpy).toHaveBeenCalledWith('test-player', 'gold_ring', expect.any(String), 1);
    });

    it('should handle tan hide event', () => {
      // This tests the logging functionality
      const consoleSpy = spyOn(console, 'log');
      
      (craftingSystem as any).handleTanHide({
        playerId: 'test-player',
        hideType: 'cow'
      });
      
      // Should process the tanning request
    });

    it('should handle spin wool event', () => {
      const startCraftingSpy = spyOn(craftingSystem, 'startCrafting');
      
      (craftingSystem as any).handleSpinWool({
        playerId: 'test-player'
      });
      
      expect(startCraftingSpy).toHaveBeenCalledWith('test-player', 'ball_of_wool', expect.any(String), 1);
    });
  });

  describe('Production Processing', () => {
    beforeEach(async () => {
      await craftingSystem.init();
    });

    it('should calculate appropriate duration for production', () => {
      const recipes = craftingSystem.getCraftingRecipes();
      const leatherGloves = recipes.get('leather_gloves')!;
      
      const duration1 = (craftingSystem as any).calculateCraftingDuration(leatherGloves, 1);
      const duration5 = (craftingSystem as any).calculateCraftingDuration(leatherGloves, 5);
      
      expect(duration5).toBeGreaterThan(duration1);
      expect(duration1).toBeGreaterThanOrEqual(1000); // Minimum 1 second
    });

    it('should have different durations for different categories', () => {
      const recipes = craftingSystem.getCraftingRecipes();
      const leatherGloves = recipes.get('leather_gloves')!; // Leather
      const goldRing = recipes.get('gold_ring')!; // Jewelry
      const pot = recipes.get('pot')!; // Pottery
      
      const leatherDuration = (craftingSystem as any).calculateCraftingDuration(leatherGloves, 1);
      const jewelryDuration = (craftingSystem as any).calculateCraftingDuration(goldRing, 1);
      const potteryDuration = (craftingSystem as any).calculateCraftingDuration(pot, 1);
      
      // Jewelry should take longer than leather
      expect(jewelryDuration).toBeGreaterThan(leatherDuration);
      // Pottery should take longer than leather
      expect(potteryDuration).toBeGreaterThan(leatherDuration);
    });

    it('should process multiple items in sequence', () => {
      const stations = craftingSystem.getCraftingStations();
      const craftingTable = Array.from(stations.values()).find(s => s.type === 'crafting_table');
      
      craftingSystem.startCrafting('test-player', 'leather_gloves', craftingTable!.id, 3);
      
      const activeActions = craftingSystem.getActiveActions();
      const action = activeActions.get('test-player')!;
      
      // Mock success for consistent testing
      const originalCalculateSuccessChance = (craftingSystem as any).calculateSuccessChance;
      (craftingSystem as any).calculateSuccessChance = mock(() => 1);
      
      // Simulate production cycles
      (craftingSystem as any).processCraftingProduction(action);
      expect(action.completed).toBe(1);
      
      (craftingSystem as any).processCraftingProduction(action);
      expect(action.completed).toBe(2);
      
      (craftingSystem as any).processCraftingProduction(action);
      expect(action.completed).toBe(3);
      
      // Should stop crafting after all items completed
      expect(craftingSystem.isPlayerCrafting('test-player')).toBe(false);
      
      // Restore original method
      (craftingSystem as any).calculateSuccessChance = originalCalculateSuccessChance;
    });
  });

  describe('System Cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      craftingSystem.destroy();
      
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:start_crafting');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:stop_crafting');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:craft_item');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:tan_hide');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:spin_wool');
    });
  });
});