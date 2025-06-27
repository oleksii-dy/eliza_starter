/**
 * Herblore System Tests
 * ====================
 * Tests for RuneScape herblore mechanics implementation
 */

import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test';
import { HerbloreSystem } from '../rpg/systems/HerbloreSystem';
import { createMockWorld } from './test-utils';

describe('HerbloreSystem', () => {
  let herbloreSystem: HerbloreSystem;
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
          herblore: { level: 50, currentXp: 101333, maxLevel: 99 },
          combat: { level: 3, currentXp: 0, maxLevel: 126 }
        },
        inventory: {
          items: [
            { itemId: 227, quantity: 10 }, // Vial of water
            { itemId: 200, quantity: 5 }, // Guam leaf (clean)
            { itemId: 202, quantity: 4 }, // Marrentill (clean)
            { itemId: 204, quantity: 3 }, // Tarromin (clean)
            { itemId: 208, quantity: 2 }, // Ranarr weed (clean)
            { itemId: 210, quantity: 2 }, // Irit leaf (clean)
            { itemId: 212, quantity: 1 }, // Kwuarm (clean)
            { itemId: 221, quantity: 10 }, // Eye of newt
            { itemId: 225, quantity: 8 }, // Limpwurt root
            { itemId: 235, quantity: 5 }, // Unicorn horn dust
            { itemId: 239, quantity: 3 }, // White berries
            { itemId: 231, quantity: 2 }, // Snape grass
            { itemId: 2428, quantity: 1 }, // Attack potion(3)
            { itemId: 113, quantity: 1 }, // Strength potion(3)
            { itemId: 199, quantity: 5 }, // Grimy guam
            null, null, null, null, null, null, null, null,
            null, null, null, null
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

    herbloreSystem = new HerbloreSystem(mockWorld);
  });

  describe('System Initialization', () => {
    it('should initialize with correct name and enabled state', () => {
      expect(herbloreSystem.name).toBe('HerbloreSystem');
      expect(herbloreSystem.enabled).toBe(true);
    });

    it('should load herblore recipes', () => {
      const herbloreRecipes = herbloreSystem.getHerbloreRecipes();

      expect(herbloreRecipes.size).toBeGreaterThan(0);
      
      // Check for specific recipes
      expect(herbloreRecipes.has('attack_potion')).toBe(true);
      expect(herbloreRecipes.has('strength_potion')).toBe(true);
      expect(herbloreRecipes.has('defence_potion')).toBe(true);
      expect(herbloreRecipes.has('prayer_potion')).toBe(true);
      expect(herbloreRecipes.has('super_attack')).toBe(true);
      expect(herbloreRecipes.has('antipoison')).toBe(true);
    });

    it('should set up event listeners during init', async () => {
      await herbloreSystem.init();
      
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:start_herblore', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:stop_herblore', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:make_potion', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:drink_potion', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:clean_herbs', expect.any(Function));
    });
  });

  describe('Herblore Recipes', () => {
    it('should have correct attack potion recipe', () => {
      const recipes = herbloreSystem.getHerbloreRecipes();
      const attackPotion = recipes.get('attack_potion');
      
      expect(attackPotion).toBeDefined();
      expect(attackPotion!.name).toBe('Attack potion');
      expect(attackPotion!.level).toBe(3);
      expect(attackPotion!.xp).toBe(25);
      expect(attackPotion!.primaryHerb).toBe(200); // Guam leaf (clean)
      expect(attackPotion!.secondaryIngredient).toBe(221); // Eye of newt
      expect(attackPotion!.outputItem).toBe(2428); // Attack potion(3)
      expect(attackPotion!.category).toBe('attack');
      expect(attackPotion!.effect.type).toBe('boost');
      expect(attackPotion!.effect.skill).toBe('attack');
    });

    it('should have correct prayer potion recipe', () => {
      const recipes = herbloreSystem.getHerbloreRecipes();
      const prayerPotion = recipes.get('prayer_potion');
      
      expect(prayerPotion).toBeDefined();
      expect(prayerPotion!.name).toBe('Prayer potion');
      expect(prayerPotion!.level).toBe(38);
      expect(prayerPotion!.xp).toBe(87.5);
      expect(prayerPotion!.primaryHerb).toBe(208); // Ranarr weed (clean)
      expect(prayerPotion!.secondaryIngredient).toBe(231); // Snape grass
      expect(prayerPotion!.effect.type).toBe('restore');
      expect(prayerPotion!.effect.skill).toBe('prayer');
    });

    it('should have progressive level requirements', () => {
      const recipes = herbloreSystem.getHerbloreRecipes();
      
      const attackPotion = recipes.get('attack_potion');
      const strengthPotion = recipes.get('strength_potion');
      const defencePotion = recipes.get('defence_potion');
      const superAttack = recipes.get('super_attack');
      
      expect(attackPotion!.level).toBe(3);
      expect(strengthPotion!.level).toBe(12);
      expect(defencePotion!.level).toBe(30);
      expect(superAttack!.level).toBe(45);
      
      // XP should also progress
      expect(strengthPotion!.xp).toBeGreaterThan(attackPotion!.xp);
      expect(defencePotion!.xp).toBeGreaterThan(strengthPotion!.xp);
      expect(superAttack!.xp).toBeGreaterThan(defencePotion!.xp);
    });

    it('should have recipes for different categories', () => {
      const recipes = herbloreSystem.getHerbloreRecipes();
      
      const attackRecipes = Array.from(recipes.values()).filter(r => r.category === 'attack');
      const strengthRecipes = Array.from(recipes.values()).filter(r => r.category === 'strength');
      const defenceRecipes = Array.from(recipes.values()).filter(r => r.category === 'defence');
      const restoreRecipes = Array.from(recipes.values()).filter(r => r.category === 'restore');
      const antipoisonRecipes = Array.from(recipes.values()).filter(r => r.category === 'antipoison');
      
      expect(attackRecipes.length).toBeGreaterThan(0);
      expect(strengthRecipes.length).toBeGreaterThan(0);
      expect(defenceRecipes.length).toBeGreaterThan(0);
      expect(restoreRecipes.length).toBeGreaterThan(0);
      expect(antipoisonRecipes.length).toBeGreaterThan(0);
    });
  });

  describe('Herblore Mechanics', () => {
    beforeEach(async () => {
      await herbloreSystem.init();
    });

    it('should successfully start making attack potion', () => {
      const result = herbloreSystem.startHerblore('test-player', 'attack_potion', 1);
      expect(result).toBe(true);
      
      expect(herbloreSystem.isPlayerMakingPotions('test-player')).toBe(true);
    });

    it('should successfully start making strength potion', () => {
      const result = herbloreSystem.startHerblore('test-player', 'strength_potion', 1);
      expect(result).toBe(true);
      
      expect(herbloreSystem.isPlayerMakingPotions('test-player')).toBe(true);
    });

    it('should fail to make potion without required level', () => {
      // Lower player herblore level
      mockPlayer.data.stats.herblore.level = 10;
      
      const result = herbloreSystem.startHerblore('test-player', 'super_attack', 1);
      expect(result).toBe(false);
    });

    it('should fail to make potion without herbs', () => {
      // Remove guam leaf from inventory
      mockPlayer.data.inventory.items[1] = null;
      
      const result = herbloreSystem.startHerblore('test-player', 'attack_potion', 1);
      expect(result).toBe(false);
    });

    it('should fail to make potion without secondary ingredient', () => {
      // Remove eye of newt from inventory
      mockPlayer.data.inventory.items[7] = null;
      
      const result = herbloreSystem.startHerblore('test-player', 'attack_potion', 1);
      expect(result).toBe(false);
    });

    it('should fail to make potion without vials of water', () => {
      // Remove vials of water from inventory
      mockPlayer.data.inventory.items[0] = null;
      
      const result = herbloreSystem.startHerblore('test-player', 'attack_potion', 1);
      expect(result).toBe(false);
    });

    it('should consume materials when making potions', () => {
      herbloreSystem.startHerblore('test-player', 'attack_potion', 1);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 200, // Guam leaf (clean)
        quantity: 1,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 221, // Eye of newt
        quantity: 1,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 227, // Vial of water
        quantity: 1,
      });
    });
  });

  describe('Herb Cleaning', () => {
    beforeEach(async () => {
      await herbloreSystem.init();
    });

    it('should successfully clean grimy herbs', () => {
      const result = herbloreSystem.cleanHerbs('test-player', 199, 3); // Grimy guam
      expect(result).toBe(true);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 199, // Grimy guam
        quantity: 3,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', {
        playerId: 'test-player',
        itemId: 200, // Clean guam
        quantity: 3,
        noted: false,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'herblore',
        amount: 7.5, // 2.5 XP per herb * 3
        source: 'herblore',
      });
    });

    it('should fail to clean herbs without grimy herbs', () => {
      // Remove grimy herbs
      mockPlayer.data.inventory.items[14] = null;
      
      const result = herbloreSystem.cleanHerbs('test-player', 199, 1);
      expect(result).toBe(false);
    });
  });

  describe('Potion Effects', () => {
    beforeEach(async () => {
      await herbloreSystem.init();
    });

    it('should successfully drink attack potion', () => {
      const result = herbloreSystem.drinkPotion('test-player', 2428); // Attack potion(3)
      expect(result).toBe(true);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 2428, // Attack potion(3)
        quantity: 1,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', {
        playerId: 'test-player',
        itemId: 229, // Empty vial
        quantity: 1,
        noted: false,
      });
    });

    it('should apply potion effect when drinking', () => {
      herbloreSystem.drinkPotion('test-player', 2428); // Attack potion(3)
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:stat_boost', {
        playerId: 'test-player',
        skill: 'attack',
        amount: 3,
        percentage: true,
        duration: expect.any(Number),
      });
    });

    it('should track active potion effects', () => {
      herbloreSystem.drinkPotion('test-player', 2428); // Attack potion(3)
      
      const effects = herbloreSystem.getPlayerEffects('test-player');
      expect(effects.length).toBe(1);
      expect(effects[0].effect.skill).toBe('attack');
      expect(effects[0].effect.type).toBe('boost');
    });

    it('should fail to drink potion not in inventory', () => {
      // Remove attack potion
      mockPlayer.data.inventory.items[12] = null;
      
      const result = herbloreSystem.drinkPotion('test-player', 2428);
      expect(result).toBe(false);
    });
  });

  describe('Success Mechanics', () => {
    beforeEach(async () => {
      await herbloreSystem.init();
    });

    it('should calculate success chance correctly for appropriate level', () => {
      // Set appropriate herblore level
      mockPlayer.data.stats.herblore.level = 25;
      
      const successChance = herbloreSystem.getSuccessChance('test-player', 'attack_potion');
      expect(successChance).toBeGreaterThan(98); // Should have very high success chance
    });

    it('should calculate success chance correctly for exact level', () => {
      // Set level to exact requirement
      mockPlayer.data.stats.herblore.level = 3;
      
      const successChance = herbloreSystem.getSuccessChance('test-player', 'attack_potion');
      expect(successChance).toBeGreaterThanOrEqual(98); // Should have high base success rate
    });

    it('should process herblore production with success chance', () => {
      herbloreSystem.startHerblore('test-player', 'attack_potion', 1);
      
      const activeActions = herbloreSystem.getActiveActions();
      const action = activeActions.get('test-player')!;
      
      // Mock success chance calculation to always succeed
      const originalCalculateSuccessChance = (herbloreSystem as any).calculateSuccessChance;
      (herbloreSystem as any).calculateSuccessChance = mock(() => 1); // Always succeed
      
      // Simulate production
      (herbloreSystem as any).processHerbloreProduction(action);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', {
        playerId: 'test-player',
        itemId: 2428, // Attack potion(3)
        quantity: 1,
        noted: false,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'herblore',
        amount: 25,
        source: 'herblore',
      });
      
      // Restore original method
      (herbloreSystem as any).calculateSuccessChance = originalCalculateSuccessChance;
    });

    it('should handle herblore failure correctly', () => {
      herbloreSystem.startHerblore('test-player', 'super_attack', 1);
      
      const activeActions = herbloreSystem.getActiveActions();
      const action = activeActions.get('test-player')!;
      
      // Manually set the recipe to a higher XP one for the test
      action.recipeId = 'super_attack';
      
      // Mock success chance calculation to always fail
      const originalCalculateSuccessChance = (herbloreSystem as any).calculateSuccessChance;
      (herbloreSystem as any).calculateSuccessChance = mock(() => 0); // Always fail
      
      // Simulate production
      (herbloreSystem as any).processHerbloreProduction(action);
      
      // Should produce barbarian herblore
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', {
        playerId: 'test-player',
        itemId: 97, // Barbarian herblore
        quantity: 1,
        noted: false,
      });
      
      // Restore original method
      (herbloreSystem as any).calculateSuccessChance = originalCalculateSuccessChance;
    });
  });

  describe('Validation Methods', () => {
    beforeEach(async () => {
      await herbloreSystem.init();
    });

    it('should validate potion making capability correctly', () => {
      // Valid case
      const validResult = herbloreSystem.canMakePotion('test-player', 'attack_potion');
      expect(validResult.canMake).toBe(true);
      
      // Invalid level
      mockPlayer.data.stats.herblore.level = 5;
      const invalidLevelResult = herbloreSystem.canMakePotion('test-player', 'super_attack');
      expect(invalidLevelResult.canMake).toBe(false);
      expect(invalidLevelResult.reason).toContain('level');
      
      // Missing herbs
      mockPlayer.data.inventory.items[1] = null; // Remove guam leaf
      const missingHerbsResult = herbloreSystem.canMakePotion('test-player', 'attack_potion');
      expect(missingHerbsResult.canMake).toBe(false);
      expect(missingHerbsResult.reason).toContain('herbs');
      
      // Missing secondary ingredient
      mockPlayer.data.inventory.items[1] = { itemId: 200, quantity: 5 }; // Add guam back
      mockPlayer.data.inventory.items[7] = null; // Remove eye of newt
      const missingSecondaryResult = herbloreSystem.canMakePotion('test-player', 'attack_potion');
      expect(missingSecondaryResult.canMake).toBe(false);
      expect(missingSecondaryResult.reason).toContain('secondary');
      
      // Missing vials
      mockPlayer.data.inventory.items[7] = { itemId: 221, quantity: 10 }; // Add eye of newt back
      mockPlayer.data.inventory.items[0] = null; // Remove vials
      const missingVialsResult = herbloreSystem.canMakePotion('test-player', 'attack_potion');
      expect(missingVialsResult.canMake).toBe(false);
      expect(missingVialsResult.reason).toContain('vials');
    });

    it('should validate unknown recipes', () => {
      const unknownResult = herbloreSystem.canMakePotion('test-player', 'unknown_potion');
      expect(unknownResult.canMake).toBe(false);
      expect(unknownResult.reason).toContain('Unknown');
    });

    it('should get recipes by category', () => {
      const attackRecipes = herbloreSystem.getRecipesByCategory('attack');
      const strengthRecipes = herbloreSystem.getRecipesByCategory('strength');
      const restoreRecipes = herbloreSystem.getRecipesByCategory('restore');
      
      expect(attackRecipes.length).toBeGreaterThan(0);
      expect(strengthRecipes.length).toBeGreaterThan(0);
      expect(restoreRecipes.length).toBeGreaterThan(0);
      
      // All recipes should be of correct category
      expect(attackRecipes.every(r => r.category === 'attack')).toBe(true);
      expect(strengthRecipes.every(r => r.category === 'strength')).toBe(true);
      expect(restoreRecipes.every(r => r.category === 'restore')).toBe(true);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await herbloreSystem.init();
    });

    it('should handle start herblore event', () => {
      const startHerbloreSpy = spyOn(herbloreSystem, 'startHerblore');
      
      (herbloreSystem as any).handleStartHerblore({
        playerId: 'test-player',
        recipeId: 'attack_potion',
        quantity: 5
      });
      
      expect(startHerbloreSpy).toHaveBeenCalledWith('test-player', 'attack_potion', 5);
    });

    it('should handle stop herblore event', () => {
      const stopHerbloreSpy = spyOn(herbloreSystem, 'stopHerblore');
      
      (herbloreSystem as any).handleStopHerblore({
        playerId: 'test-player'
      });
      
      expect(stopHerbloreSpy).toHaveBeenCalledWith('test-player');
    });

    it('should handle make potion event', () => {
      const startHerbloreSpy = spyOn(herbloreSystem, 'startHerblore');
      
      (herbloreSystem as any).handleMakePotion({
        playerId: 'test-player',
        potionType: 'strength_potion'
      });
      
      expect(startHerbloreSpy).toHaveBeenCalledWith('test-player', 'strength_potion', 1);
    });

    it('should handle drink potion event', () => {
      const drinkPotionSpy = spyOn(herbloreSystem, 'drinkPotion');
      
      (herbloreSystem as any).handleDrinkPotion({
        playerId: 'test-player',
        potionId: 2428
      });
      
      expect(drinkPotionSpy).toHaveBeenCalledWith('test-player', 2428);
    });

    it('should handle clean herbs event', () => {
      const cleanHerbsSpy = spyOn(herbloreSystem, 'cleanHerbs');
      
      (herbloreSystem as any).handleCleanHerbs({
        playerId: 'test-player',
        grimyHerbId: 199,
        quantity: 5
      });
      
      expect(cleanHerbsSpy).toHaveBeenCalledWith('test-player', 199, 5);
    });
  });

  describe('System Cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      herbloreSystem.destroy();
      
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:start_herblore');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:stop_herblore');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:make_potion');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:drink_potion');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:clean_herbs');
    });
  });
});