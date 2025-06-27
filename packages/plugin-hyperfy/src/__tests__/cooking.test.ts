/**
 * Cooking System Tests
 * ===================
 * Tests for RuneScape cooking mechanics implementation
 */

import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test';
import { CookingSystem } from '../rpg/systems/CookingSystem';
import { createMockWorld } from './test-utils';

describe('CookingSystem', () => {
  let cookingSystem: CookingSystem;
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
          cooking: { level: 50, currentXp: 101333, maxLevel: 99 },
          combat: { level: 3, currentXp: 0, maxLevel: 126 }
        },
        inventory: {
          items: [
            { itemId: 317, quantity: 10 }, // Raw shrimps
            { itemId: 327, quantity: 8 }, // Raw sardine
            { itemId: 335, quantity: 5 }, // Raw trout
            { itemId: 331, quantity: 3 }, // Raw salmon
            { itemId: 359, quantity: 2 }, // Raw tuna
            { itemId: 377, quantity: 1 }, // Raw lobster
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

    cookingSystem = new CookingSystem(mockWorld);
  });

  describe('System Initialization', () => {
    it('should initialize with correct name and enabled state', () => {
      expect(cookingSystem.name).toBe('CookingSystem');
      expect(cookingSystem.enabled).toBe(true);
    });

    it('should load cooking recipes', () => {
      const cookingRecipes = cookingSystem.getCookingRecipes();

      expect(cookingRecipes.size).toBeGreaterThan(0);
      
      // Check for specific recipes
      expect(cookingRecipes.has('shrimps')).toBe(true);
      expect(cookingRecipes.has('salmon')).toBe(true);
      expect(cookingRecipes.has('tuna')).toBe(true);
      expect(cookingRecipes.has('lobster')).toBe(true);
      expect(cookingRecipes.has('shark')).toBe(true);
    });

    it('should set up event listeners during init', async () => {
      await cookingSystem.init();
      
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:start_cooking', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:stop_cooking', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:cook_food', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:light_fire', expect.any(Function));
    });

    it('should spawn ranges and fires', async () => {
      await cookingSystem.init();
      
      const ranges = cookingSystem.getRanges();
      const fires = cookingSystem.getFires();
      
      expect(ranges.size).toBeGreaterThan(0);
      expect(fires.size).toBeGreaterThan(0);
    });
  });

  describe('Cooking Recipes', () => {
    it('should have correct shrimps recipe', () => {
      const recipes = cookingSystem.getCookingRecipes();
      const shrimps = recipes.get('shrimps');
      
      expect(shrimps).toBeDefined();
      expect(shrimps!.name).toBe('Shrimps');
      expect(shrimps!.level).toBe(1);
      expect(shrimps!.xp).toBe(30);
      expect(shrimps!.rawItem).toBe(317); // Raw shrimps
      expect(shrimps!.cookedItem).toBe(315); // Shrimps
      expect(shrimps!.burntItem).toBe(7954); // Burnt shrimps
      expect(shrimps!.healAmount).toBe(3);
      expect(shrimps!.methods).toContain('fire');
      expect(shrimps!.methods).toContain('range');
    });

    it('should have correct salmon recipe', () => {
      const recipes = cookingSystem.getCookingRecipes();
      const salmon = recipes.get('salmon');
      
      expect(salmon).toBeDefined();
      expect(salmon!.name).toBe('Salmon');
      expect(salmon!.level).toBe(25);
      expect(salmon!.xp).toBe(90);
      expect(salmon!.rawItem).toBe(331); // Raw salmon
      expect(salmon!.cookedItem).toBe(329); // Salmon
      expect(salmon!.healAmount).toBe(9);
    });

    it('should have progressive level requirements', () => {
      const recipes = cookingSystem.getCookingRecipes();
      
      const shrimps = recipes.get('shrimps');
      const trout = recipes.get('trout');
      const salmon = recipes.get('salmon');
      const tuna = recipes.get('tuna');
      const shark = recipes.get('shark');
      
      expect(shrimps!.level).toBe(1);
      expect(trout!.level).toBe(15);
      expect(salmon!.level).toBe(25);
      expect(tuna!.level).toBe(30);
      expect(shark!.level).toBe(80);
      
      // XP should also progress
      expect(trout!.xp).toBeGreaterThan(shrimps!.xp);
      expect(salmon!.xp).toBeGreaterThan(trout!.xp);
      expect(tuna!.xp).toBeGreaterThan(salmon!.xp);
      expect(shark!.xp).toBeGreaterThan(tuna!.xp);
    });

    it('should have progressive heal amounts', () => {
      const recipes = cookingSystem.getCookingRecipes();
      
      const shrimps = recipes.get('shrimps');
      const salmon = recipes.get('salmon');
      const tuna = recipes.get('tuna');
      const shark = recipes.get('shark');
      
      expect(salmon!.healAmount).toBeGreaterThan(shrimps!.healAmount);
      expect(tuna!.healAmount).toBeGreaterThan(salmon!.healAmount);
      expect(shark!.healAmount).toBeGreaterThan(tuna!.healAmount);
    });
  });

  describe('Cooking Mechanics', () => {
    beforeEach(async () => {
      await cookingSystem.init();
    });

    it('should successfully start cooking shrimps on fire', () => {
      const fires = cookingSystem.getFires();
      const fireId = Array.from(fires.keys())[0];
      
      const result = cookingSystem.startCooking('test-player', 'shrimps', fireId, 'fire', 1);
      expect(result).toBe(true);
      
      expect(cookingSystem.isPlayerCooking('test-player')).toBe(true);
    });

    it('should successfully start cooking salmon on range', () => {
      const ranges = cookingSystem.getRanges();
      const rangeId = Array.from(ranges.keys())[0];
      
      const result = cookingSystem.startCooking('test-player', 'salmon', rangeId, 'range', 1);
      expect(result).toBe(true);
      
      expect(cookingSystem.isPlayerCooking('test-player')).toBe(true);
    });

    it('should fail to cook without required level', () => {
      // Lower player cooking level
      mockPlayer.data.stats.cooking.level = 10;
      
      const ranges = cookingSystem.getRanges();
      const rangeId = Array.from(ranges.keys())[0];
      
      const result = cookingSystem.startCooking('test-player', 'tuna', rangeId, 'range', 1);
      expect(result).toBe(false);
    });

    it('should fail to cook without raw food', () => {
      // Remove raw shrimps from inventory
      mockPlayer.data.inventory.items[0] = null;
      
      const fires = cookingSystem.getFires();
      const fireId = Array.from(fires.keys())[0];
      
      const result = cookingSystem.startCooking('test-player', 'shrimps', fireId, 'fire', 1);
      expect(result).toBe(false);
    });

    it('should fail to cook with wrong cooking method', () => {
      const ranges = cookingSystem.getRanges();
      const rangeId = Array.from(ranges.keys())[0];
      
      // Try to use a recipe that doesn't support the method (all current recipes support both, so we'll check validation)
      const recipes = cookingSystem.getCookingRecipes();
      const testRecipe = Array.from(recipes.values())[0];
      
      // Mock a recipe with limited methods
      const limitedRecipe = { ...testRecipe, methods: ['fire'] as ('fire' | 'range')[] };
      (cookingSystem as any).cookingRecipes.set('limited_test', limitedRecipe);
      
      const result = cookingSystem.startCooking('test-player', 'limited_test', rangeId, 'range', 1);
      expect(result).toBe(false);
    });

    it('should consume raw food when cooking', () => {
      const fires = cookingSystem.getFires();
      const fireId = Array.from(fires.keys())[0];
      
      cookingSystem.startCooking('test-player', 'shrimps', fireId, 'fire', 1);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 317, // Raw shrimps
        quantity: 1,
      });
    });

    it('should mark station as in use', () => {
      const fires = cookingSystem.getFires();
      const fireId = Array.from(fires.keys())[0];
      const fire = fires.get(fireId)!;
      
      expect(fire.inUse).toBe(false);
      
      cookingSystem.startCooking('test-player', 'shrimps', fireId, 'fire', 1);
      
      expect(fire.inUse).toBe(true);
      expect(fire.userId).toBe('test-player');
    });
  });

  describe('Burn Mechanics', () => {
    beforeEach(async () => {
      await cookingSystem.init();
    });

    it('should calculate burn chance correctly for low level', () => {
      // Set low cooking level
      mockPlayer.data.stats.cooking.level = 5;
      
      const burnChance = cookingSystem.getBurnChance('test-player', 'shrimps');
      expect(burnChance).toBeGreaterThan(20); // Should have significant burn chance
    });

    it('should calculate burn chance correctly for high level', () => {
      // Set high cooking level
      mockPlayer.data.stats.cooking.level = 80;
      
      const burnChance = cookingSystem.getBurnChance('test-player', 'shrimps');
      expect(burnChance).toBeLessThan(5); // Should have minimal burn chance
    });

    it('should have lower burn chance at burn level', () => {
      const recipes = cookingSystem.getCookingRecipes();
      const shrimps = recipes.get('shrimps')!;
      
      // Set level to burn level
      mockPlayer.data.stats.cooking.level = shrimps.burnLevel;
      
      const burnChance = cookingSystem.getBurnChance('test-player', 'shrimps');
      expect(burnChance).toBeLessThanOrEqual(1); // Should be minimal at burn level
    });

    it('should process cooking production with burn chance', () => {
      const fires = cookingSystem.getFires();
      const fireId = Array.from(fires.keys())[0];
      
      cookingSystem.startCooking('test-player', 'shrimps', fireId, 'fire', 1);
      
      const activeActions = cookingSystem.getActiveActions();
      const action = activeActions.get('test-player')!;
      
      // Mock burn chance calculation
      const originalCalculateBurnChance = (cookingSystem as any).calculateBurnChance;
      (cookingSystem as any).calculateBurnChance = mock(() => 0); // No burn
      
      // Simulate production
      (cookingSystem as any).processCookingProduction(action);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', {
        playerId: 'test-player',
        itemId: 315, // Cooked shrimps (not burnt)
        quantity: 1,
        noted: false,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'cooking',
        amount: 30,
        source: 'cooking',
      });
      
      // Restore original method
      (cookingSystem as any).calculateBurnChance = originalCalculateBurnChance;
    });

    it('should produce burnt food when burning occurs', () => {
      const fires = cookingSystem.getFires();
      const fireId = Array.from(fires.keys())[0];
      
      cookingSystem.startCooking('test-player', 'shrimps', fireId, 'fire', 1);
      
      const activeActions = cookingSystem.getActiveActions();
      const action = activeActions.get('test-player')!;
      
      // Mock burn chance calculation to always burn
      const originalCalculateBurnChance = (cookingSystem as any).calculateBurnChance;
      (cookingSystem as any).calculateBurnChance = mock(() => 1); // Always burn
      
      // Simulate production
      (cookingSystem as any).processCookingProduction(action);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', {
        playerId: 'test-player',
        itemId: 7954, // Burnt shrimps
        quantity: 1,
        noted: false,
      });
      
      // Should not grant XP for burnt food
      expect(mockWorld.events.emit).not.toHaveBeenCalledWith('rpg:xp_gain', expect.anything());
      
      // Restore original method
      (cookingSystem as any).calculateBurnChance = originalCalculateBurnChance;
    });
  });

  describe('Station Management', () => {
    beforeEach(async () => {
      await cookingSystem.init();
    });

    it('should prevent using occupied fire', () => {
      const fires = cookingSystem.getFires();
      const fireId = Array.from(fires.keys())[0];
      
      // First player starts cooking
      cookingSystem.startCooking('test-player', 'shrimps', fireId, 'fire', 1);
      
      // Add second player
      const secondPlayer = { ...mockPlayer };
      mockWorld.entities.players.set('test-player-2', secondPlayer);
      
      // Second player tries to use same fire
      const result = cookingSystem.startCooking('test-player-2', 'sardine', fireId, 'fire', 1);
      expect(result).toBe(false);
    });

    it('should prevent using occupied range', () => {
      const ranges = cookingSystem.getRanges();
      const rangeId = Array.from(ranges.keys())[0];
      
      // First player starts cooking
      cookingSystem.startCooking('test-player', 'salmon', rangeId, 'range', 1);
      
      // Add second player
      const secondPlayer = { ...mockPlayer };
      mockWorld.entities.players.set('test-player-2', secondPlayer);
      
      // Second player tries to use same range
      const result = cookingSystem.startCooking('test-player-2', 'tuna', rangeId, 'range', 1);
      expect(result).toBe(false);
    });

    it('should free station when stopping cooking', () => {
      const fires = cookingSystem.getFires();
      const fireId = Array.from(fires.keys())[0];
      const fire = fires.get(fireId)!;
      
      cookingSystem.startCooking('test-player', 'shrimps', fireId, 'fire', 1);
      expect(fire.inUse).toBe(true);
      
      cookingSystem.stopCooking('test-player');
      expect(fire.inUse).toBe(false);
      expect(fire.userId).toBeNull();
    });
  });

  describe('Validation Methods', () => {
    beforeEach(async () => {
      await cookingSystem.init();
    });

    it('should validate cooking capability correctly', () => {
      // Valid case
      const validResult = cookingSystem.canCookFood('test-player', 'shrimps', 'fire');
      expect(validResult.canCook).toBe(true);
      
      // Invalid level
      mockPlayer.data.stats.cooking.level = 5;
      const invalidLevelResult = cookingSystem.canCookFood('test-player', 'tuna', 'fire');
      expect(invalidLevelResult.canCook).toBe(false);
      expect(invalidLevelResult.reason).toContain('level');
      
      // Missing raw food
      mockPlayer.data.inventory.items[0] = null; // Remove raw shrimps
      const missingFoodResult = cookingSystem.canCookFood('test-player', 'shrimps', 'fire');
      expect(missingFoodResult.canCook).toBe(false);
      expect(missingFoodResult.reason).toContain('raw food');
    });

    it('should validate unknown recipes', () => {
      const unknownResult = cookingSystem.canCookFood('test-player', 'unknown_food', 'fire');
      expect(unknownResult.canCook).toBe(false);
      expect(unknownResult.reason).toContain('Unknown');
    });

    it('should validate cooking methods', () => {
      // Mock a recipe that only supports fire
      const recipes = cookingSystem.getCookingRecipes();
      const testRecipe = { ...Array.from(recipes.values())[0], methods: ['fire'] as ('fire' | 'range')[] };
      (cookingSystem as any).cookingRecipes.set('fire_only_test', testRecipe);
      
      const fireResult = cookingSystem.canCookFood('test-player', 'fire_only_test', 'fire');
      expect(fireResult.canCook).toBe(true);
      
      const rangeResult = cookingSystem.canCookFood('test-player', 'fire_only_test', 'range');
      expect(rangeResult.canCook).toBe(false);
      expect(rangeResult.reason).toContain('Cannot cook');
    });
  });

  describe('Food Healing', () => {
    it('should return correct heal amounts for cooked food', () => {
      const shrimpHeal = cookingSystem.getFoodHealAmount(315); // Cooked shrimps
      const salmonHeal = cookingSystem.getFoodHealAmount(329); // Cooked salmon
      const tunaHeal = cookingSystem.getFoodHealAmount(361); // Cooked tuna
      const sharkHeal = cookingSystem.getFoodHealAmount(385); // Cooked shark
      
      expect(shrimpHeal).toBe(3);
      expect(salmonHeal).toBe(9);
      expect(tunaHeal).toBe(10);
      expect(sharkHeal).toBe(20);
    });

    it('should return 0 for unknown food items', () => {
      const unknownHeal = cookingSystem.getFoodHealAmount(99999);
      expect(unknownHeal).toBe(0);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await cookingSystem.init();
    });

    it('should handle start cooking event', () => {
      const startCookingSpy = spyOn(cookingSystem, 'startCooking');
      
      (cookingSystem as any).handleStartCooking({
        playerId: 'test-player',
        recipeId: 'shrimps',
        stationId: 'fire_1',
        stationType: 'fire',
        quantity: 5
      });
      
      expect(startCookingSpy).toHaveBeenCalledWith('test-player', 'shrimps', 'fire_1', 'fire', 5);
    });

    it('should handle stop cooking event', () => {
      const stopCookingSpy = spyOn(cookingSystem, 'stopCooking');
      
      (cookingSystem as any).handleStopCooking({
        playerId: 'test-player'
      });
      
      expect(stopCookingSpy).toHaveBeenCalledWith('test-player');
    });

    it('should handle cook food event', () => {
      const startCookingSpy = spyOn(cookingSystem, 'startCooking');
      
      (cookingSystem as any).handleCookFood({
        playerId: 'test-player',
        foodType: 'salmon',
        method: 'range'
      });
      
      expect(startCookingSpy).toHaveBeenCalledWith('test-player', 'salmon', expect.any(String), 'range', 1);
    });

    it('should handle light fire event', () => {
      const consoleSpy = spyOn(console, 'log');
      
      (cookingSystem as any).handleLightFire({
        playerId: 'test-player',
        position: { x: 10, y: 0, z: 10 }
      });
      
      // Should log the fire lighting (simplified implementation)
      // In a full implementation, this might create a temporary fire station
    });
  });

  describe('Production Processing', () => {
    beforeEach(async () => {
      await cookingSystem.init();
    });

    it('should calculate appropriate duration for production', () => {
      const recipes = cookingSystem.getCookingRecipes();
      const shrimps = recipes.get('shrimps')!;
      
      const duration1 = (cookingSystem as any).calculateCookingDuration(shrimps, 1);
      const duration5 = (cookingSystem as any).calculateCookingDuration(shrimps, 5);
      
      expect(duration5).toBeGreaterThan(duration1);
      expect(duration1).toBeGreaterThanOrEqual(1000); // Minimum 1 second
    });

    it('should process multiple items in sequence', () => {
      const fires = cookingSystem.getFires();
      const fireId = Array.from(fires.keys())[0];
      
      cookingSystem.startCooking('test-player', 'shrimps', fireId, 'fire', 3);
      
      const activeActions = cookingSystem.getActiveActions();
      const action = activeActions.get('test-player')!;
      
      // Mock no burning for consistent testing
      const originalCalculateBurnChance = (cookingSystem as any).calculateBurnChance;
      (cookingSystem as any).calculateBurnChance = mock(() => 0);
      
      // Simulate production cycles
      (cookingSystem as any).processCookingProduction(action);
      expect(action.completed).toBe(1);
      
      (cookingSystem as any).processCookingProduction(action);
      expect(action.completed).toBe(2);
      
      (cookingSystem as any).processCookingProduction(action);
      expect(action.completed).toBe(3);
      
      // Should stop cooking after all items completed
      expect(cookingSystem.isPlayerCooking('test-player')).toBe(false);
      
      // Restore original method
      (cookingSystem as any).calculateBurnChance = originalCalculateBurnChance;
    });
  });

  describe('System Cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      cookingSystem.destroy();
      
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:start_cooking');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:stop_cooking');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:cook_food');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:light_fire');
    });
  });
});