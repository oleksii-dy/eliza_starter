/**
 * Fletching System Tests
 * =====================
 * Tests for RuneScape fletching mechanics implementation
 */

import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test';
import { FletchingSystem } from '../rpg/systems/FletchingSystem';
import { createMockWorld } from './test-utils';

describe('FletchingSystem', () => {
  let fletchingSystem: FletchingSystem;
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
          fletching: { level: 50, currentXp: 101333, maxLevel: 99 },
          combat: { level: 3, currentXp: 0, maxLevel: 126 }
        },
        inventory: {
          items: [
            { itemId: 946, quantity: 1 }, // Knife
            { itemId: 1511, quantity: 10 }, // Logs
            { itemId: 1521, quantity: 8 }, // Oak logs
            { itemId: 1519, quantity: 5 }, // Willow logs
            { itemId: 1517, quantity: 3 }, // Maple logs
            { itemId: 1515, quantity: 2 }, // Yew logs
            { itemId: 1513, quantity: 1 }, // Magic logs
            { itemId: 1777, quantity: 5 }, // Bow string
            { itemId: 314, quantity: 50 }, // Feather
            { itemId: 52, quantity: 20 }, // Arrow shaft
            { itemId: 53, quantity: 15 }, // Headless arrow
            { itemId: 39, quantity: 10 }, // Bronze arrowheads
            { itemId: 40, quantity: 8 }, // Iron arrowheads
            { itemId: 41, quantity: 5 }, // Steel arrowheads
            { itemId: 50, quantity: 3 }, // Shortbow (u)
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

    fletchingSystem = new FletchingSystem(mockWorld);
  });

  describe('System Initialization', () => {
    it('should initialize with correct name and enabled state', () => {
      expect(fletchingSystem.name).toBe('FletchingSystem');
      expect(fletchingSystem.enabled).toBe(true);
    });

    it('should load fletching recipes', () => {
      const fletchingRecipes = fletchingSystem.getFletchingRecipes();

      expect(fletchingRecipes.size).toBeGreaterThan(0);
      
      // Check for specific recipes
      expect(fletchingRecipes.has('shortbow_u')).toBe(true);
      expect(fletchingRecipes.has('yew_longbow_u')).toBe(true);
      expect(fletchingRecipes.has('headless_arrows')).toBe(true);
      expect(fletchingRecipes.has('iron_arrows')).toBe(true);
      expect(fletchingRecipes.has('bronze_bolts')).toBe(true);
      expect(fletchingRecipes.has('steel_darts')).toBe(true);
    });

    it('should set up event listeners during init', async () => {
      await fletchingSystem.init();
      
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:start_fletching', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:stop_fletching', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:fletch_item', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:cut_bow', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:string_bow', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:make_arrows', expect.any(Function));
    });
  });

  describe('Fletching Recipes', () => {
    it('should have correct shortbow recipe', () => {
      const recipes = fletchingSystem.getFletchingRecipes();
      const shortbow = recipes.get('shortbow_u');
      
      expect(shortbow).toBeDefined();
      expect(shortbow!.name).toBe('Shortbow (u)');
      expect(shortbow!.level).toBe(5);
      expect(shortbow!.xp).toBe(5);
      expect(shortbow!.primaryItem).toBe(1511); // Logs
      expect(shortbow!.outputItem).toBe(50); // Shortbow (u)
      expect(shortbow!.requiredTools).toContain(946); // Knife
      expect(shortbow!.category).toBe('bows');
    });

    it('should have correct yew longbow recipe', () => {
      const recipes = fletchingSystem.getFletchingRecipes();
      const yewLongbow = recipes.get('yew_longbow_u');
      
      expect(yewLongbow).toBeDefined();
      expect(yewLongbow!.name).toBe('Yew longbow (u)');
      expect(yewLongbow!.level).toBe(70);
      expect(yewLongbow!.xp).toBe(75);
      expect(yewLongbow!.primaryItem).toBe(1515); // Yew logs
      expect(yewLongbow!.outputItem).toBe(66); // Yew longbow (u)
      expect(yewLongbow!.category).toBe('bows');
    });

    it('should have correct arrow recipes', () => {
      const recipes = fletchingSystem.getFletchingRecipes();
      
      const headlessArrows = recipes.get('headless_arrows');
      const ironArrows = recipes.get('iron_arrows');
      
      expect(headlessArrows).toBeDefined();
      expect(headlessArrows!.level).toBe(1);
      expect(headlessArrows!.primaryItem).toBe(52); // Arrow shaft
      expect(headlessArrows!.secondaryItem).toBe(314); // Feather
      expect(headlessArrows!.category).toBe('arrows');
      
      expect(ironArrows).toBeDefined();
      expect(ironArrows!.level).toBe(15);
      expect(ironArrows!.primaryItem).toBe(53); // Headless arrow
      expect(ironArrows!.secondaryItem).toBe(40); // Iron arrowheads
      expect(ironArrows!.category).toBe('arrows');
    });

    it('should have progressive level requirements', () => {
      const recipes = fletchingSystem.getFletchingRecipes();
      
      const shortbow = recipes.get('shortbow_u');
      const oakShortbow = recipes.get('oak_shortbow_u');
      const willowShortbow = recipes.get('willow_shortbow_u');
      const yewShortbow = recipes.get('yew_shortbow_u');
      
      expect(shortbow!.level).toBe(5);
      expect(oakShortbow!.level).toBe(20);
      expect(willowShortbow!.level).toBe(35);
      expect(yewShortbow!.level).toBe(65);
      
      // XP should also progress
      expect(oakShortbow!.xp).toBeGreaterThan(shortbow!.xp);
      expect(willowShortbow!.xp).toBeGreaterThan(oakShortbow!.xp);
      expect(yewShortbow!.xp).toBeGreaterThan(willowShortbow!.xp);
    });

    it('should have recipes for different categories', () => {
      const recipes = fletchingSystem.getFletchingRecipes();
      
      const bowRecipes = Array.from(recipes.values()).filter(r => r.category === 'bows');
      const arrowRecipes = Array.from(recipes.values()).filter(r => r.category === 'arrows');
      const boltRecipes = Array.from(recipes.values()).filter(r => r.category === 'bolts');
      const dartRecipes = Array.from(recipes.values()).filter(r => r.category === 'darts');
      
      expect(bowRecipes.length).toBeGreaterThan(0);
      expect(arrowRecipes.length).toBeGreaterThan(0);
      expect(boltRecipes.length).toBeGreaterThan(0);
      expect(dartRecipes.length).toBeGreaterThan(0);
    });
  });

  describe('Fletching Mechanics', () => {
    beforeEach(async () => {
      await fletchingSystem.init();
    });

    it('should successfully start fletching shortbow', () => {
      const result = fletchingSystem.startFletching('test-player', 'shortbow_u', 1);
      expect(result).toBe(true);
      
      expect(fletchingSystem.isPlayerFletching('test-player')).toBe(true);
    });

    it('should successfully start fletching headless arrows', () => {
      const result = fletchingSystem.startFletching('test-player', 'headless_arrows', 10);
      expect(result).toBe(true);
      
      expect(fletchingSystem.isPlayerFletching('test-player')).toBe(true);
    });

    it('should successfully start fletching iron arrows', () => {
      const result = fletchingSystem.startFletching('test-player', 'iron_arrows', 5);
      expect(result).toBe(true);
      
      expect(fletchingSystem.isPlayerFletching('test-player')).toBe(true);
    });

    it('should fail to fletch without required level', () => {
      // Lower player fletching level
      mockPlayer.data.stats.fletching.level = 10;
      
      const result = fletchingSystem.startFletching('test-player', 'yew_longbow_u', 1);
      expect(result).toBe(false);
    });

    it('should fail to fletch without primary material', () => {
      // Remove logs from inventory
      mockPlayer.data.inventory.items[1] = null;
      
      const result = fletchingSystem.startFletching('test-player', 'shortbow_u', 1);
      expect(result).toBe(false);
    });

    it('should fail to fletch without secondary material', () => {
      // Remove feathers from inventory
      mockPlayer.data.inventory.items[8] = null;
      
      const result = fletchingSystem.startFletching('test-player', 'headless_arrows', 1);
      expect(result).toBe(false);
    });

    it('should fail to fletch without required tools', () => {
      // Remove knife from inventory
      mockPlayer.data.inventory.items[0] = null;
      
      const result = fletchingSystem.startFletching('test-player', 'shortbow_u', 1);
      expect(result).toBe(false);
    });

    it('should consume materials when fletching', () => {
      fletchingSystem.startFletching('test-player', 'shortbow_u', 1);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 1511, // Logs
        quantity: 1,
      });
    });

    it('should consume both primary and secondary materials', () => {
      fletchingSystem.startFletching('test-player', 'headless_arrows', 5);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 52, // Arrow shaft
        quantity: 5,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 314, // Feather
        quantity: 5,
      });
    });
  });

  describe('Success Mechanics', () => {
    beforeEach(async () => {
      await fletchingSystem.init();
    });

    it('should calculate success chance correctly for appropriate level', () => {
      // Set appropriate fletching level
      mockPlayer.data.stats.fletching.level = 25;
      
      const successChance = fletchingSystem.getSuccessChance('test-player', 'shortbow_u');
      expect(successChance).toBeGreaterThan(95); // Should have very high success chance
    });

    it('should calculate success chance correctly for exact level', () => {
      // Set level to exact requirement
      mockPlayer.data.stats.fletching.level = 5;
      
      const successChance = fletchingSystem.getSuccessChance('test-player', 'shortbow_u');
      expect(successChance).toBeGreaterThanOrEqual(95); // Should have high base success rate
    });

    it('should have lower success chance for complex items', () => {
      mockPlayer.data.stats.fletching.level = 50;
      
      // Add required materials for bolts
      mockPlayer.data.inventory.items.push({ itemId: 9375, quantity: 10 }); // Bronze bolt (unf)
      
      const simpleSuccess = fletchingSystem.getSuccessChance('test-player', 'shortbow_u');
      const complexSuccess = fletchingSystem.getSuccessChance('test-player', 'bronze_bolts');
      
      expect(complexSuccess).toBeLessThan(simpleSuccess);
    });

    it('should process fletching production with success chance', () => {
      fletchingSystem.startFletching('test-player', 'shortbow_u', 1);
      
      const activeActions = fletchingSystem.getActiveActions();
      const action = activeActions.get('test-player')!;
      
      // Mock success chance calculation to always succeed
      const originalCalculateSuccessChance = (fletchingSystem as any).calculateSuccessChance;
      (fletchingSystem as any).calculateSuccessChance = mock(() => 1); // Always succeed
      
      // Simulate production
      (fletchingSystem as any).processFletchingProduction(action);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', {
        playerId: 'test-player',
        itemId: 50, // Shortbow (u)
        quantity: 1,
        noted: false,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'fletching',
        amount: 5,
        source: 'fletching',
      });
      
      // Restore original method
      (fletchingSystem as any).calculateSuccessChance = originalCalculateSuccessChance;
    });

    it('should handle fletching failure correctly', () => {
      // Use a higher XP recipe so failure XP is > 0
      // First start with shortbow and verify the action exists
      fletchingSystem.startFletching('test-player', 'shortbow_u', 1);
      
      const activeActions = fletchingSystem.getActiveActions();
      const action = activeActions.get('test-player')!;
      
      // Manually set the recipe to a higher XP one for the test
      action.recipeId = 'yew_longbow_u';
      
      // Mock success chance calculation to always fail
      const originalCalculateSuccessChance = (fletchingSystem as any).calculateSuccessChance;
      (fletchingSystem as any).calculateSuccessChance = mock(() => 0); // Always fail
      
      // Simulate production
      (fletchingSystem as any).processFletchingProduction(action);
      
      // Should not produce item
      expect(mockWorld.events.emit).not.toHaveBeenCalledWith('rpg:add_item', expect.objectContaining({
        itemId: 66, // Yew longbow (u)
      }));
      
      // Should give small XP for attempt (75 * 0.1 = 7.5, floor = 7)
      const xpCalls = (mockWorld.events.emit as any).mock.calls.filter((call: any) => 
        call[0] === 'rpg:xp_gain' && call[1].skill === 'fletching'
      );
      expect(xpCalls.length).toBeGreaterThan(0);
      if (xpCalls.length > 0) {
        expect(xpCalls[0][1].amount).toBeLessThan(75); // Less than full XP
        expect(xpCalls[0][1].amount).toBeGreaterThan(0); // But greater than 0
      }
      
      // Restore original method
      (fletchingSystem as any).calculateSuccessChance = originalCalculateSuccessChance;
    });
  });

  describe('Validation Methods', () => {
    beforeEach(async () => {
      await fletchingSystem.init();
    });

    it('should validate fletching capability correctly', () => {
      // Valid case
      const validResult = fletchingSystem.canFletchItem('test-player', 'shortbow_u');
      expect(validResult.canFletch).toBe(true);
      
      // Invalid level
      mockPlayer.data.stats.fletching.level = 5;
      const invalidLevelResult = fletchingSystem.canFletchItem('test-player', 'yew_longbow_u');
      expect(invalidLevelResult.canFletch).toBe(false);
      expect(invalidLevelResult.reason).toContain('level');
      
      // Missing primary material
      mockPlayer.data.inventory.items[1] = null; // Remove logs
      const missingPrimaryResult = fletchingSystem.canFletchItem('test-player', 'shortbow_u');
      expect(missingPrimaryResult.canFletch).toBe(false);
      expect(missingPrimaryResult.reason).toContain('primary');
      
      // Missing secondary material
      mockPlayer.data.inventory.items[1] = { itemId: 1511, quantity: 10 }; // Add logs back
      mockPlayer.data.inventory.items[8] = null; // Remove feathers
      const missingSecondaryResult = fletchingSystem.canFletchItem('test-player', 'headless_arrows');
      expect(missingSecondaryResult.canFletch).toBe(false);
      expect(missingSecondaryResult.reason).toContain('secondary');
      
      // Missing tools
      mockPlayer.data.inventory.items[8] = { itemId: 314, quantity: 50 }; // Add feathers back
      mockPlayer.data.inventory.items[0] = null; // Remove knife
      const missingToolsResult = fletchingSystem.canFletchItem('test-player', 'shortbow_u');
      expect(missingToolsResult.canFletch).toBe(false);
      expect(missingToolsResult.reason).toContain('tools');
    });

    it('should validate unknown recipes', () => {
      const unknownResult = fletchingSystem.canFletchItem('test-player', 'unknown_item');
      expect(unknownResult.canFletch).toBe(false);
      expect(unknownResult.reason).toContain('Unknown');
    });

    it('should get recipes by category', () => {
      const bowRecipes = fletchingSystem.getRecipesByCategory('bows');
      const arrowRecipes = fletchingSystem.getRecipesByCategory('arrows');
      const boltRecipes = fletchingSystem.getRecipesByCategory('bolts');
      const dartRecipes = fletchingSystem.getRecipesByCategory('darts');
      
      expect(bowRecipes.length).toBeGreaterThan(0);
      expect(arrowRecipes.length).toBeGreaterThan(0);
      expect(boltRecipes.length).toBeGreaterThan(0);
      expect(dartRecipes.length).toBeGreaterThan(0);
      
      // All recipes should be of correct category
      expect(bowRecipes.every(r => r.category === 'bows')).toBe(true);
      expect(arrowRecipes.every(r => r.category === 'arrows')).toBe(true);
      expect(boltRecipes.every(r => r.category === 'bolts')).toBe(true);
      expect(dartRecipes.every(r => r.category === 'darts')).toBe(true);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await fletchingSystem.init();
    });

    it('should handle start fletching event', () => {
      const startFletchingSpy = spyOn(fletchingSystem, 'startFletching');
      
      (fletchingSystem as any).handleStartFletching({
        playerId: 'test-player',
        recipeId: 'shortbow_u',
        quantity: 5
      });
      
      expect(startFletchingSpy).toHaveBeenCalledWith('test-player', 'shortbow_u', 5);
    });

    it('should handle stop fletching event', () => {
      const stopFletchingSpy = spyOn(fletchingSystem, 'stopFletching');
      
      (fletchingSystem as any).handleStopFletching({
        playerId: 'test-player'
      });
      
      expect(stopFletchingSpy).toHaveBeenCalledWith('test-player');
    });

    it('should handle fletch item event', () => {
      const startFletchingSpy = spyOn(fletchingSystem, 'startFletching');
      
      (fletchingSystem as any).handleFletchItem({
        playerId: 'test-player',
        itemType: 'yew_longbow_u'
      });
      
      expect(startFletchingSpy).toHaveBeenCalledWith('test-player', 'yew_longbow_u', 1);
    });

    it('should handle cut bow event', () => {
      const startFletchingSpy = spyOn(fletchingSystem, 'startFletching');
      
      (fletchingSystem as any).handleCutBow({
        playerId: 'test-player',
        bowType: 'oak_longbow'
      });
      
      expect(startFletchingSpy).toHaveBeenCalledWith('test-player', 'oak_longbow_u', 1);
    });

    it('should handle string bow event', () => {
      const startFletchingSpy = spyOn(fletchingSystem, 'startFletching');
      
      (fletchingSystem as any).handleStringBow({
        playerId: 'test-player',
        bowType: 'willow_shortbow'
      });
      
      expect(startFletchingSpy).toHaveBeenCalledWith('test-player', 'willow_shortbow', 1);
    });

    it('should handle make arrows event', () => {
      const startFletchingSpy = spyOn(fletchingSystem, 'startFletching');
      
      (fletchingSystem as any).handleMakeArrows({
        playerId: 'test-player',
        arrowType: 'iron_arrows',
        quantity: 20
      });
      
      expect(startFletchingSpy).toHaveBeenCalledWith('test-player', 'iron_arrows', 20);
    });
  });

  describe('Production Processing', () => {
    beforeEach(async () => {
      await fletchingSystem.init();
    });

    it('should calculate appropriate duration for production', () => {
      const recipes = fletchingSystem.getFletchingRecipes();
      const shortbow = recipes.get('shortbow_u')!;
      
      const duration1 = (fletchingSystem as any).calculateFletchingDuration(shortbow, 1);
      const duration5 = (fletchingSystem as any).calculateFletchingDuration(shortbow, 5);
      
      expect(duration5).toBeGreaterThan(duration1);
      expect(duration1).toBeGreaterThanOrEqual(1000); // Minimum 1 second
    });

    it('should have different durations for different categories', () => {
      const recipes = fletchingSystem.getFletchingRecipes();
      const shortbow = recipes.get('shortbow_u')!; // Bows
      const headlessArrows = recipes.get('headless_arrows')!; // Arrows
      
      const bowDuration = (fletchingSystem as any).calculateFletchingDuration(shortbow, 1);
      const arrowDuration = (fletchingSystem as any).calculateFletchingDuration(headlessArrows, 1);
      
      // Arrows should be faster than bows
      expect(arrowDuration).toBeLessThan(bowDuration);
    });

    it('should process multiple items in sequence', () => {
      fletchingSystem.startFletching('test-player', 'shortbow_u', 3);
      
      const activeActions = fletchingSystem.getActiveActions();
      const action = activeActions.get('test-player')!;
      
      // Mock success for consistent testing
      const originalCalculateSuccessChance = (fletchingSystem as any).calculateSuccessChance;
      (fletchingSystem as any).calculateSuccessChance = mock(() => 1);
      
      // Simulate production cycles
      (fletchingSystem as any).processFletchingProduction(action);
      expect(action.completed).toBe(1);
      
      (fletchingSystem as any).processFletchingProduction(action);
      expect(action.completed).toBe(2);
      
      (fletchingSystem as any).processFletchingProduction(action);
      expect(action.completed).toBe(3);
      
      // Should stop fletching after all items completed
      expect(fletchingSystem.isPlayerFletching('test-player')).toBe(false);
      
      // Restore original method
      (fletchingSystem as any).calculateSuccessChance = originalCalculateSuccessChance;
    });
  });

  describe('System Cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      fletchingSystem.destroy();
      
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:start_fletching');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:stop_fletching');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:fletch_item');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:cut_bow');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:string_bow');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:make_arrows');
    });
  });
});