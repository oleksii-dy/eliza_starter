/**
 * Runecrafting System Tests
 * ========================
 * Tests for RuneScape runecrafting mechanics implementation
 */

import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test';
import { RunecraftingSystem } from '../rpg/systems/RunecraftingSystem';
import { createMockWorld } from './test-utils';

describe('RunecraftingSystem', () => {
  let runecraftingSystem: RunecraftingSystem;
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
          runecrafting: { level: 50, currentXp: 101333, maxLevel: 99 },
          combat: { level: 3, currentXp: 0, maxLevel: 126 }
        },
        inventory: {
          items: [
            { itemId: 1436, quantity: 50 }, // Rune essence
            { itemId: 7936, quantity: 30 }, // Pure essence
            { itemId: 1438, quantity: 1 }, // Air talisman
            { itemId: 1448, quantity: 1 }, // Mind talisman
            { itemId: 1444, quantity: 1 }, // Water talisman
            { itemId: 1440, quantity: 1 }, // Earth talisman
            { itemId: 1442, quantity: 1 }, // Fire talisman
            { itemId: 1446, quantity: 1 }, // Body talisman
            { itemId: 1454, quantity: 1 }, // Cosmic talisman
            { itemId: 1452, quantity: 1 }, // Chaos talisman
            { itemId: 1462, quantity: 1 }, // Nature talisman
            { itemId: 1458, quantity: 1 }, // Law talisman
            { itemId: 1456, quantity: 1 }, // Death talisman
            { itemId: 556, quantity: 100 }, // Air runes
            { itemId: 555, quantity: 80 }, // Water runes
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

    runecraftingSystem = new RunecraftingSystem(mockWorld);
  });

  describe('System Initialization', () => {
    it('should initialize with correct name and enabled state', () => {
      expect(runecraftingSystem.name).toBe('RunecraftingSystem');
      expect(runecraftingSystem.enabled).toBe(true);
    });

    it('should load runecrafting recipes', () => {
      const runecraftingRecipes = runecraftingSystem.getRunecraftingRecipes();

      expect(runecraftingRecipes.size).toBeGreaterThan(0);
      
      // Check for specific recipes
      expect(runecraftingRecipes.has('air_runes')).toBe(true);
      expect(runecraftingRecipes.has('water_runes')).toBe(true);
      expect(runecraftingRecipes.has('fire_runes')).toBe(true);
      expect(runecraftingRecipes.has('nature_runes')).toBe(true);
      expect(runecraftingRecipes.has('law_runes')).toBe(true);
      expect(runecraftingRecipes.has('death_runes')).toBe(true);
      expect(runecraftingRecipes.has('blood_runes')).toBe(true);
      expect(runecraftingRecipes.has('soul_runes')).toBe(true);
    });

    it('should set up event listeners during init', async () => {
      await runecraftingSystem.init();
      
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:start_runecrafting', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:stop_runecrafting', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:craft_runes', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:enter_altar', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:exit_altar', expect.any(Function));
    });

    it('should initialize altar locations', () => {
      const altarLocations = runecraftingSystem.getAltarLocations();
      
      expect(altarLocations.size).toBeGreaterThan(0);
      expect(altarLocations.has('air_altar')).toBe(true);
      expect(altarLocations.has('nature_altar')).toBe(true);
      expect(altarLocations.has('law_altar')).toBe(true);
      expect(altarLocations.has('blood_altar')).toBe(true);
      
      // Check altar location structure
      const airAltar = altarLocations.get('air_altar');
      expect(airAltar).toBeDefined();
      expect(typeof airAltar!.x).toBe('number');
      expect(typeof airAltar!.y).toBe('number');
      expect(typeof airAltar!.z).toBe('number');
    });
  });

  describe('Runecrafting Recipes', () => {
    it('should have correct air rune recipe', () => {
      const recipes = runecraftingSystem.getRunecraftingRecipes();
      const airRunes = recipes.get('air_runes');
      
      expect(airRunes).toBeDefined();
      expect(airRunes!.name).toBe('Air runes');
      expect(airRunes!.level).toBe(1);
      expect(airRunes!.xp).toBe(5);
      expect(airRunes!.essenceType).toBe('rune');
      expect(airRunes!.outputItem).toBe(556); // Air rune
      expect(airRunes!.requiredTalisman).toBe(1438); // Air talisman
      expect(airRunes!.altarId).toBe('air_altar');
    });

    it('should have correct nature rune recipe', () => {
      const recipes = runecraftingSystem.getRunecraftingRecipes();
      const natureRunes = recipes.get('nature_runes');
      
      expect(natureRunes).toBeDefined();
      expect(natureRunes!.name).toBe('Nature runes');
      expect(natureRunes!.level).toBe(44);
      expect(natureRunes!.xp).toBe(9);
      expect(natureRunes!.essenceType).toBe('pure');
      expect(natureRunes!.outputItem).toBe(561); // Nature rune
      expect(natureRunes!.requiredTalisman).toBe(1462); // Nature talisman
    });

    it('should have progressive level requirements', () => {
      const recipes = runecraftingSystem.getRunecraftingRecipes();
      
      const airRunes = recipes.get('air_runes');
      const waterRunes = recipes.get('water_runes');
      const fireRunes = recipes.get('fire_runes');
      const natureRunes = recipes.get('nature_runes');
      const lawRunes = recipes.get('law_runes');
      const deathRunes = recipes.get('death_runes');
      
      expect(airRunes!.level).toBe(1);
      expect(waterRunes!.level).toBe(5);
      expect(fireRunes!.level).toBe(14);
      expect(natureRunes!.level).toBe(44);
      expect(lawRunes!.level).toBe(54);
      expect(deathRunes!.level).toBe(65);
      
      // XP should also progress
      expect(waterRunes!.xp).toBeGreaterThan(airRunes!.xp);
      expect(fireRunes!.xp).toBeGreaterThan(waterRunes!.xp);
      expect(natureRunes!.xp).toBeGreaterThan(fireRunes!.xp);
      expect(lawRunes!.xp).toBeGreaterThan(natureRunes!.xp);
      expect(deathRunes!.xp).toBeGreaterThan(lawRunes!.xp);
    });

    it('should have multiple rune levels for basic runes', () => {
      const recipes = runecraftingSystem.getRunecraftingRecipes();
      const airRunes = recipes.get('air_runes');
      const mindRunes = recipes.get('mind_runes');
      
      expect(airRunes!.multipleRuneLevels).toBeDefined();
      expect(airRunes!.multipleRuneLevels!.length).toBeGreaterThan(0);
      expect(mindRunes!.multipleRuneLevels).toBeDefined();
      expect(mindRunes!.multipleRuneLevels!.length).toBeGreaterThan(0);
      
      // Check structure of multiple rune levels
      const firstLevel = airRunes!.multipleRuneLevels![0];
      expect(Array.isArray(firstLevel)).toBe(true);
      expect(firstLevel.length).toBe(2);
      expect(typeof firstLevel[0]).toBe('number'); // Level
      expect(typeof firstLevel[1]).toBe('number'); // Quantity
    });

    it('should separate rune and pure essence recipes', () => {
      const recipes = runecraftingSystem.getRunecraftingRecipes();
      
      const runeEssenceRecipes = Array.from(recipes.values()).filter(r => r.essenceType === 'rune');
      const pureEssenceRecipes = Array.from(recipes.values()).filter(r => r.essenceType === 'pure');
      
      expect(runeEssenceRecipes.length).toBeGreaterThan(0);
      expect(pureEssenceRecipes.length).toBeGreaterThan(0);
      
      // Basic elemental runes should use rune essence
      expect(runeEssenceRecipes.some(r => r.id === 'air_runes')).toBe(true);
      expect(runeEssenceRecipes.some(r => r.id === 'water_runes')).toBe(true);
      expect(runeEssenceRecipes.some(r => r.id === 'fire_runes')).toBe(true);
      
      // High-level runes should use pure essence
      expect(pureEssenceRecipes.some(r => r.id === 'nature_runes')).toBe(true);
      expect(pureEssenceRecipes.some(r => r.id === 'law_runes')).toBe(true);
      expect(pureEssenceRecipes.some(r => r.id === 'death_runes')).toBe(true);
    });
  });

  describe('Runecrafting Mechanics', () => {
    beforeEach(async () => {
      await runecraftingSystem.init();
    });

    it('should successfully start crafting air runes', () => {
      const result = runecraftingSystem.startRunecrafting('test-player', 'air_runes', 1);
      expect(result).toBe(true);
      
      expect(runecraftingSystem.isPlayerRunecrafting('test-player')).toBe(true);
    });

    it('should successfully start crafting nature runes', () => {
      const result = runecraftingSystem.startRunecrafting('test-player', 'nature_runes', 1);
      expect(result).toBe(true);
      
      expect(runecraftingSystem.isPlayerRunecrafting('test-player')).toBe(true);
    });

    it('should fail to craft runes without required level', () => {
      // Lower player runecrafting level
      mockPlayer.data.stats.runecrafting.level = 10;
      
      const result = runecraftingSystem.startRunecrafting('test-player', 'death_runes', 1);
      expect(result).toBe(false);
    });

    it('should fail to craft runes without essence', () => {
      // Remove rune essence from inventory
      mockPlayer.data.inventory.items[0] = null;
      
      const result = runecraftingSystem.startRunecrafting('test-player', 'air_runes', 1);
      expect(result).toBe(false);
    });

    it('should fail to craft pure essence runes without pure essence', () => {
      // Remove pure essence from inventory
      mockPlayer.data.inventory.items[1] = null;
      
      const result = runecraftingSystem.startRunecrafting('test-player', 'nature_runes', 1);
      expect(result).toBe(false);
    });

    it('should fail to craft runes without required talisman', () => {
      // Remove air talisman from inventory
      mockPlayer.data.inventory.items[2] = null;
      
      const result = runecraftingSystem.startRunecrafting('test-player', 'air_runes', 1);
      expect(result).toBe(false);
    });

    it('should consume essence when runecrafting', () => {
      runecraftingSystem.startRunecrafting('test-player', 'air_runes', 1);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 1436, // Rune essence
        quantity: 1,
      });
    });

    it('should not consume talisman when runecrafting', () => {
      runecraftingSystem.startRunecrafting('test-player', 'air_runes', 1);
      
      // Should NOT remove talisman (it's reusable)
      expect(mockWorld.events.emit).not.toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 1438, // Air talisman
        quantity: 1,
      });
    });
  });

  describe('Rune Quantity Mechanics', () => {
    beforeEach(async () => {
      await runecraftingSystem.init();
    });

    it('should calculate correct rune quantities at different levels', () => {
      // Test air runes at different levels
      mockPlayer.data.stats.runecrafting.level = 1;
      expect(runecraftingSystem.getRuneQuantityAtLevel('test-player', 'air_runes')).toBe(1);
      
      mockPlayer.data.stats.runecrafting.level = 11;
      expect(runecraftingSystem.getRuneQuantityAtLevel('test-player', 'air_runes')).toBe(2);
      
      mockPlayer.data.stats.runecrafting.level = 22;
      expect(runecraftingSystem.getRuneQuantityAtLevel('test-player', 'air_runes')).toBe(3);
      
      mockPlayer.data.stats.runecrafting.level = 99;
      expect(runecraftingSystem.getRuneQuantityAtLevel('test-player', 'air_runes')).toBe(10);
    });

    it('should handle runes without multiple levels correctly', () => {
      // Law and death runes always produce 1 per essence
      mockPlayer.data.stats.runecrafting.level = 99;
      expect(runecraftingSystem.getRuneQuantityAtLevel('test-player', 'law_runes')).toBe(1);
      expect(runecraftingSystem.getRuneQuantityAtLevel('test-player', 'death_runes')).toBe(1);
    });

    it('should process runecrafting production with correct quantities', () => {
      // Set level for multiple runes
      mockPlayer.data.stats.runecrafting.level = 22;
      
      runecraftingSystem.startRunecrafting('test-player', 'air_runes', 1);
      
      const activeActions = runecraftingSystem.getActiveActions();
      const action = activeActions.get('test-player')!;
      
      // Simulate production
      (runecraftingSystem as any).processRunecraftingProduction(action);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', {
        playerId: 'test-player',
        itemId: 556, // Air rune
        quantity: 3, // Should be 3 at level 22
        noted: false,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'runecrafting',
        amount: 5,
        source: 'runecrafting',
      });
    });
  });

  describe('Validation Methods', () => {
    beforeEach(async () => {
      await runecraftingSystem.init();
    });

    it('should validate runecrafting capability correctly', () => {
      // Valid case
      const validResult = runecraftingSystem.canCraftRunes('test-player', 'air_runes');
      expect(validResult.canCraft).toBe(true);
      
      // Invalid level
      mockPlayer.data.stats.runecrafting.level = 5;
      const invalidLevelResult = runecraftingSystem.canCraftRunes('test-player', 'death_runes');
      expect(invalidLevelResult.canCraft).toBe(false);
      expect(invalidLevelResult.reason).toContain('level');
      
      // Missing essence
      mockPlayer.data.inventory.items[0] = null; // Remove rune essence
      const missingEssenceResult = runecraftingSystem.canCraftRunes('test-player', 'air_runes');
      expect(missingEssenceResult.canCraft).toBe(false);
      expect(missingEssenceResult.reason).toContain('essence');
      
      // Missing talisman
      mockPlayer.data.inventory.items[0] = { itemId: 1436, quantity: 50 }; // Add essence back
      mockPlayer.data.inventory.items[2] = null; // Remove air talisman
      const missingTalismanResult = runecraftingSystem.canCraftRunes('test-player', 'air_runes');
      expect(missingTalismanResult.canCraft).toBe(false);
      expect(missingTalismanResult.reason).toContain('talisman');
    });

    it('should validate unknown recipes', () => {
      const unknownResult = runecraftingSystem.canCraftRunes('test-player', 'unknown_runes');
      expect(unknownResult.canCraft).toBe(false);
      expect(unknownResult.reason).toContain('Unknown');
    });

    it('should get recipes by essence type', () => {
      const runeEssenceRecipes = runecraftingSystem.getRecipesByEssenceType('rune');
      const pureEssenceRecipes = runecraftingSystem.getRecipesByEssenceType('pure');
      
      expect(runeEssenceRecipes.length).toBeGreaterThan(0);
      expect(pureEssenceRecipes.length).toBeGreaterThan(0);
      
      // All recipes should be of correct essence type
      expect(runeEssenceRecipes.every(r => r.essenceType === 'rune')).toBe(true);
      expect(pureEssenceRecipes.every(r => r.essenceType === 'pure')).toBe(true);
    });

    it('should get recipes by level range', () => {
      const lowLevelRecipes = runecraftingSystem.getRecipesByLevel(1, 20);
      const midLevelRecipes = runecraftingSystem.getRecipesByLevel(21, 50);
      const highLevelRecipes = runecraftingSystem.getRecipesByLevel(51, 99);
      
      expect(lowLevelRecipes.length).toBeGreaterThan(0);
      expect(midLevelRecipes.length).toBeGreaterThan(0);
      expect(highLevelRecipes.length).toBeGreaterThan(0);
      
      // All recipes should be in correct level range
      expect(lowLevelRecipes.every(r => r.level >= 1 && r.level <= 20)).toBe(true);
      expect(midLevelRecipes.every(r => r.level >= 21 && r.level <= 50)).toBe(true);
      expect(highLevelRecipes.every(r => r.level >= 51 && r.level <= 99)).toBe(true);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await runecraftingSystem.init();
    });

    it('should handle start runecrafting event', () => {
      const startRunecraftingSpy = spyOn(runecraftingSystem, 'startRunecrafting');
      
      (runecraftingSystem as any).handleStartRunecrafting({
        playerId: 'test-player',
        recipeId: 'air_runes',
        quantity: 5
      });
      
      expect(startRunecraftingSpy).toHaveBeenCalledWith('test-player', 'air_runes', 5);
    });

    it('should handle stop runecrafting event', () => {
      const stopRunecraftingSpy = spyOn(runecraftingSystem, 'stopRunecrafting');
      
      (runecraftingSystem as any).handleStopRunecrafting({
        playerId: 'test-player'
      });
      
      expect(stopRunecraftingSpy).toHaveBeenCalledWith('test-player');
    });

    it('should handle craft runes event', () => {
      const startRunecraftingSpy = spyOn(runecraftingSystem, 'startRunecrafting');
      
      (runecraftingSystem as any).handleCraftRunes({
        playerId: 'test-player',
        runeType: 'nature_runes'
      });
      
      expect(startRunecraftingSpy).toHaveBeenCalledWith('test-player', 'nature_runes', 1);
    });

    it('should handle enter altar event', () => {
      (runecraftingSystem as any).handleEnterAltar({
        playerId: 'test-player',
        altarId: 'fire_altar'
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:altar_entered', {
        playerId: 'test-player',
        altarId: 'fire_altar',
        location: expect.any(Object),
      });
    });

    it('should handle exit altar event', () => {
      (runecraftingSystem as any).handleExitAltar({
        playerId: 'test-player',
        altarId: 'fire_altar'
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:altar_exited', {
        playerId: 'test-player',
        altarId: 'fire_altar',
      });
    });
  });

  describe('Production Processing', () => {
    beforeEach(async () => {
      await runecraftingSystem.init();
    });

    it('should calculate appropriate duration for production', () => {
      const recipes = runecraftingSystem.getRunecraftingRecipes();
      const airRunes = recipes.get('air_runes')!;
      
      const duration1 = (runecraftingSystem as any).calculateRunecraftingDuration(airRunes, 1);
      const duration5 = (runecraftingSystem as any).calculateRunecraftingDuration(airRunes, 5);
      
      expect(duration5).toBeGreaterThan(duration1);
      expect(duration1).toBeGreaterThanOrEqual(1000); // Minimum 1 second
    });

    it('should process multiple batches in sequence', () => {
      runecraftingSystem.startRunecrafting('test-player', 'air_runes', 3);
      
      const activeActions = runecraftingSystem.getActiveActions();
      const action = activeActions.get('test-player')!;
      
      // Simulate production cycles
      (runecraftingSystem as any).processRunecraftingProduction(action);
      expect(action.completed).toBe(1);
      
      (runecraftingSystem as any).processRunecraftingProduction(action);
      expect(action.completed).toBe(2);
      
      (runecraftingSystem as any).processRunecraftingProduction(action);
      expect(action.completed).toBe(3);
      
      // Should stop runecrafting after all batches completed
      expect(runecraftingSystem.isPlayerRunecrafting('test-player')).toBe(false);
    });

    it('should always succeed in runecrafting (no failure mechanics)', () => {
      runecraftingSystem.startRunecrafting('test-player', 'air_runes', 1);
      
      const activeActions = runecraftingSystem.getActiveActions();
      const action = activeActions.get('test-player')!;
      
      // Simulate production
      (runecraftingSystem as any).processRunecraftingProduction(action);
      
      // Should always produce runes (no failure in runecrafting)
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', {
        playerId: 'test-player',
        itemId: 556, // Air rune
        quantity: expect.any(Number),
        noted: false,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'runecrafting',
        amount: 5,
        source: 'runecrafting',
      });
    });
  });

  describe('System Cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      runecraftingSystem.destroy();
      
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:start_runecrafting');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:stop_runecrafting');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:craft_runes');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:enter_altar');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:exit_altar');
    });
  });
});