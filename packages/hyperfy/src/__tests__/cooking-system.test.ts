// @ts-nocheck
/**
 * Cooking System Tests
 * Tests food preparation, burn chances, cooking methods, and level progression
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createTestWorld } from './createTestWorld';
import { CookingSystem, CookingMethod, FoodType } from '../rpg/systems/production/CookingSystem';
import { EnhancedSkillsSystem } from '../rpg/systems/EnhancedSkillsSystem';
import { InventorySystem } from '../rpg/systems/InventorySystem';
import { SkillType } from '../rpg/systems/skills/SkillDefinitions';

describe('Cooking System Tests', () => {
  let world: any;
  let cookingSystem: CookingSystem;
  let skillsSystem: EnhancedSkillsSystem;
  let inventorySystem: InventorySystem;

  beforeEach(async () => {
    // Create test world
    world = createTestWorld();
    
    // Add systems
    cookingSystem = new CookingSystem(world);
    skillsSystem = new EnhancedSkillsSystem(world);
    inventorySystem = new InventorySystem(world);
    
    world.addSystem(cookingSystem);
    world.addSystem(skillsSystem);
    world.addSystem(inventorySystem);
    
    // Initialize systems
    await cookingSystem.initialize();
    await skillsSystem.initialize();
    await inventorySystem.initialize();
  });

  afterEach(() => {
    if (world && world.cleanup) {
      world.cleanup();
    }
  });

  describe('Component Creation', () => {
    it('should create cooking components for players', () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_player_cooking',
        components: []
      });

      const cooking = cookingSystem.createCookingComponent(player.id);
      
      expect(cooking).not.toBeNull();
      expect(cooking.type).toBe('cooking');
      expect(cooking.nearFire).toBe(false);
      expect(cooking.nearRange).toBe(false);
      expect(cooking.nearOven).toBe(false);
      expect(cooking.activeCooking).toBeUndefined();
    });
  });

  describe('Recipe System', () => {
    it('should have all basic cooking recipes', () => {
      const recipes = cookingSystem.getAllCookingRecipes();
      
      expect(recipes.length).toBeGreaterThan(10);
      
      // Check for key recipes
      const shrimpRecipe = recipes.find(r => r.id === 'cook_shrimp');
      expect(shrimpRecipe).toBeDefined();
      expect(shrimpRecipe.levelRequired).toBe(1);
      expect(shrimpRecipe.canUseFire).toBe(true);
      expect(shrimpRecipe.canUseRange).toBe(true);
      expect(shrimpRecipe.canUseOven).toBe(false);

      const sharkRecipe = recipes.find(r => r.id === 'cook_shark');
      expect(sharkRecipe).toBeDefined();
      expect(sharkRecipe.levelRequired).toBe(80);
      expect(sharkRecipe.canUseFire).toBe(false);
      expect(sharkRecipe.canUseRange).toBe(true);

      const breadRecipe = recipes.find(r => r.id === 'bake_bread');
      expect(breadRecipe).toBeDefined();
      expect(breadRecipe.canUseOven).toBe(true);
      expect(breadRecipe.canUseFire).toBe(false);
    });

    it('should calculate success rates correctly', () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_player_success',
        components: []
      });

      skillsSystem.createPlayerSkills(player);
      cookingSystem.createCookingComponent(player.id);

      // Set cooking level to 15
      skillsSystem.setSkillLevel(player.id, SkillType.COOKING, 15);

      // Test shrimp success rate (requires level 1)
      const shrimpRate = cookingSystem.calculateSuccessRate(player.id, 'cook_shrimp', CookingMethod.FIRE);
      expect(shrimpRate).toBeGreaterThan(0.5);

      // Test with range bonus
      const shrimpRangeRate = cookingSystem.calculateSuccessRate(player.id, 'cook_shrimp', CookingMethod.RANGE);
      expect(shrimpRangeRate).toBeGreaterThan(shrimpRate);

      // Test trout success rate (requires level 15)
      const troutRate = cookingSystem.calculateSuccessRate(player.id, 'cook_trout', CookingMethod.FIRE);
      expect(troutRate).toBeGreaterThan(0);
      expect(troutRate).toBeLessThan(1);
    });
  });

  describe('Cooking Station Interaction', () => {
    it('should handle fire interaction correctly', () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_player_fire',
        components: []
      });

      skillsSystem.createPlayerSkills(player);
      cookingSystem.createCookingComponent(player.id);

      let interfaceShown = false;
      world.events.on('cooking:show_interface', (data) => {
        interfaceShown = true;
        expect(data.type).toBe('fire');
        expect(data.playerId).toBe(player.id);
        expect(data.availableRecipes).toBeDefined();
      });

      // Simulate fire interaction
      world.events.emit('cooking:fire_interaction', { playerId: player.id });

      expect(interfaceShown).toBe(true);
      expect(cookingSystem.isNearFire(player.id)).toBe(true);
    });

    it('should handle range interaction correctly', () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_player_range',
        components: []
      });

      skillsSystem.createPlayerSkills(player);
      cookingSystem.createCookingComponent(player.id);

      let interfaceShown = false;
      world.events.on('cooking:show_interface', (data) => {
        interfaceShown = true;
        expect(data.type).toBe('range');
        expect(data.playerId).toBe(player.id);
      });

      // Simulate range interaction
      world.events.emit('cooking:range_interaction', { playerId: player.id });

      expect(interfaceShown).toBe(true);
      expect(cookingSystem.isNearRange(player.id)).toBe(true);
    });

    it('should handle oven interaction correctly', () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_player_oven',
        components: []
      });

      skillsSystem.createPlayerSkills(player);
      cookingSystem.createCookingComponent(player.id);

      let interfaceShown = false;
      world.events.on('cooking:show_interface', (data) => {
        interfaceShown = true;
        expect(data.type).toBe('oven');
        expect(data.playerId).toBe(player.id);
      });

      // Simulate oven interaction
      world.events.emit('cooking:oven_interaction', { playerId: player.id });

      expect(interfaceShown).toBe(true);
      expect(cookingSystem.isNearOven(player.id)).toBe(true);
    });
  });

  describe('Cooking Process', () => {
    it('should fail cooking without required level', async () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_player_level',
        components: []
      });

      skillsSystem.createPlayerSkills(player);
      const cooking = cookingSystem.createCookingComponent(player.id);
      inventorySystem.createInventory(player.id);

      // Set low cooking level
      skillsSystem.setSkillLevel(player.id, SkillType.COOKING, 1);
      
      // Add raw ingredients
      inventorySystem.addItem(player.id, 'raw_shark', 5);
      
      // Try to cook shark (requires level 80)
      cooking.nearRange = true;
      
      let errorReceived = false;
      world.events.on('cooking:error', (data) => {
        errorReceived = true;
        expect(data.message).toContain('level 80');
      });

      const result = cookingSystem.startCooking(player.id, 'cook_shark', 1, CookingMethod.RANGE);
      
      expect(result).toBe(false);
      expect(errorReceived).toBe(true);
    });

    it('should fail cooking without required cooking station', async () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_player_station',
        components: []
      });

      skillsSystem.createPlayerSkills(player);
      const cooking = cookingSystem.createCookingComponent(player.id);
      inventorySystem.createInventory(player.id);

      // Set high cooking level
      skillsSystem.setSkillLevel(player.id, SkillType.COOKING, 90);
      
      // Add raw ingredients
      inventorySystem.addItem(player.id, 'raw_shark', 5);
      
      // Try to cook shark on fire (not allowed)
      cooking.nearFire = true;
      
      let errorReceived = false;
      world.events.on('cooking:error', (data) => {
        errorReceived = true;
        expect(data.message).toContain('cannot be cooked on a fire');
      });

      const result = cookingSystem.startCooking(player.id, 'cook_shark', 1, CookingMethod.FIRE);
      
      expect(result).toBe(false);
      expect(errorReceived).toBe(true);
    });

    it('should fail cooking without ingredients', async () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_player_ingredients',
        components: []
      });

      skillsSystem.createPlayerSkills(player);
      const cooking = cookingSystem.createCookingComponent(player.id);
      inventorySystem.createInventory(player.id);

      // Set cooking level
      skillsSystem.setSkillLevel(player.id, SkillType.COOKING, 1);
      
      // Try to cook without ingredients
      cooking.nearFire = true;
      
      let errorReceived = false;
      world.events.on('cooking:error', (data) => {
        errorReceived = true;
        expect(data.message).toContain('raw_shrimp');
      });

      const result = cookingSystem.startCooking(player.id, 'cook_shrimp', 1, CookingMethod.FIRE);
      
      expect(result).toBe(false);
      expect(errorReceived).toBe(true);
    });

    it('should successfully start cooking with valid conditions', async () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_player_valid',
        components: []
      });

      skillsSystem.createPlayerSkills(player);
      const cooking = cookingSystem.createCookingComponent(player.id);
      inventorySystem.createInventory(player.id);

      // Set cooking level
      skillsSystem.setSkillLevel(player.id, SkillType.COOKING, 1);
      
      // Add raw ingredients
      inventorySystem.addItem(player.id, 'raw_shrimp', 10);
      
      // Set near fire
      cooking.nearFire = true;
      
      let cookingStarted = false;
      world.events.on('cooking:cooking_started', (data) => {
        cookingStarted = true;
        expect(data.playerId).toBe(player.id);
        expect(data.recipeId).toBe('cook_shrimp');
        expect(data.quantity).toBe(5);
        expect(data.cookingMethod).toBe(CookingMethod.FIRE);
      });

      const result = cookingSystem.startCooking(player.id, 'cook_shrimp', 5, CookingMethod.FIRE);
      
      expect(result).toBe(true);
      expect(cookingStarted).toBe(true);
      expect(cooking.activeCooking).toBeDefined();
      expect(cooking.activeCooking.quantity).toBe(5);
    });
  });

  describe('Cooking Methods and Bonuses', () => {
    it('should provide range bonus for success rate', () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_player_bonus',
        components: []
      });

      skillsSystem.createPlayerSkills(player);
      cookingSystem.createCookingComponent(player.id);
      skillsSystem.setSkillLevel(player.id, SkillType.COOKING, 15);

      const fireRate = cookingSystem.calculateSuccessRate(player.id, 'cook_trout', CookingMethod.FIRE);
      const rangeRate = cookingSystem.calculateSuccessRate(player.id, 'cook_trout', CookingMethod.RANGE);
      const ovenRate = cookingSystem.calculateSuccessRate(player.id, 'bake_bread', CookingMethod.OVEN);

      expect(rangeRate).toBeGreaterThan(fireRate);
      expect(ovenRate).toBeGreaterThan(fireRate);
    });

    it('should only allow appropriate cooking methods for recipes', () => {
      const recipes = cookingSystem.getAllCookingRecipes();
      
      // Shark should only work on range
      const sharkRecipe = recipes.find(r => r.id === 'cook_shark');
      expect(sharkRecipe.canUseFire).toBe(false);
      expect(sharkRecipe.canUseRange).toBe(true);
      expect(sharkRecipe.canUseOven).toBe(false);

      // Bread should only work in oven
      const breadRecipe = recipes.find(r => r.id === 'bake_bread');
      expect(breadRecipe.canUseFire).toBe(false);
      expect(breadRecipe.canUseRange).toBe(false);
      expect(breadRecipe.canUseOven).toBe(true);

      // Most fish should work on fire and range
      const troutRecipe = recipes.find(r => r.id === 'cook_trout');
      expect(troutRecipe.canUseFire).toBe(true);
      expect(troutRecipe.canUseRange).toBe(true);
      expect(troutRecipe.canUseOven).toBe(false);
    });
  });

  describe('Food Quality and Healing', () => {
    it('should have proper healing values for cooked foods', () => {
      const recipes = cookingSystem.getAllCookingRecipes();
      
      // Higher level foods should heal more
      const shrimpRecipe = recipes.find(r => r.id === 'cook_shrimp');
      const sharkRecipe = recipes.find(r => r.id === 'cook_shark');
      
      expect(sharkRecipe.healAmount).toBeGreaterThan(shrimpRecipe.healAmount);
      expect(shrimpRecipe.healAmount).toBe(3);
      expect(sharkRecipe.healAmount).toBe(20);
    });

    it('should produce burnt food on failure', () => {
      const recipes = cookingSystem.getAllCookingRecipes();
      
      for (const recipe of recipes) {
        expect(recipe.burntItemId).toBeDefined();
        expect(recipe.burntItemId).toContain('burnt');
      }
    });
  });

  describe('Experience and Progression', () => {
    it('should award appropriate experience for different foods', () => {
      const recipes = cookingSystem.getAllCookingRecipes();
      
      // Higher level foods should give more XP
      const shrimpRecipe = recipes.find(r => r.id === 'cook_shrimp');
      const sharkRecipe = recipes.find(r => r.id === 'cook_shark');
      
      expect(sharkRecipe.experience).toBeGreaterThan(shrimpRecipe.experience);
      expect(shrimpRecipe.experience).toBe(30);
      expect(sharkRecipe.experience).toBe(210);
    });

    it('should improve success rate with higher cooking levels', () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_player_progression',
        components: []
      });

      skillsSystem.createPlayerSkills(player);
      cookingSystem.createCookingComponent(player.id);

      // Test at minimum level
      skillsSystem.setSkillLevel(player.id, SkillType.COOKING, 15);
      const lowLevelRate = cookingSystem.calculateSuccessRate(player.id, 'cook_trout', CookingMethod.FIRE);

      // Test at higher level
      skillsSystem.setSkillLevel(player.id, SkillType.COOKING, 50);
      const highLevelRate = cookingSystem.calculateSuccessRate(player.id, 'cook_trout', CookingMethod.FIRE);

      expect(highLevelRate).toBeGreaterThan(lowLevelRate);
    });
  });

  describe('Recipe Filtering', () => {
    it('should filter recipes by cooking method', () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_player_filter',
        components: []
      });

      skillsSystem.createPlayerSkills(player);
      cookingSystem.createCookingComponent(player.id);
      skillsSystem.setSkillLevel(player.id, SkillType.COOKING, 99);

      const fireRecipes = cookingSystem['getAvailableCookingRecipes'](player.id, CookingMethod.FIRE);
      const rangeRecipes = cookingSystem['getAvailableCookingRecipes'](player.id, CookingMethod.RANGE);
      const ovenRecipes = cookingSystem['getAvailableCookingRecipes'](player.id, CookingMethod.OVEN);

      // All fire recipes should support fire cooking
      for (const recipe of fireRecipes) {
        expect(recipe.canUseFire).toBe(true);
      }

      // All range recipes should support range cooking
      for (const recipe of rangeRecipes) {
        expect(recipe.canUseRange).toBe(true);
      }

      // All oven recipes should support oven cooking
      for (const recipe of ovenRecipes) {
        expect(recipe.canUseOven).toBe(true);
      }

      // Should have different counts
      expect(fireRecipes.length).toBeGreaterThan(0);
      expect(rangeRecipes.length).toBeGreaterThan(0);
      expect(ovenRecipes.length).toBeGreaterThan(0);
      expect(ovenRecipes.length).toBeLessThan(fireRecipes.length);
    });

    it('should filter recipes by player cooking level', () => {
      const player = world.createEntity({
        type: 'player',
        id: 'test_player_level_filter',
        components: []
      });

      skillsSystem.createPlayerSkills(player);
      cookingSystem.createCookingComponent(player.id);

      // Test with low level
      skillsSystem.setSkillLevel(player.id, SkillType.COOKING, 1);
      const lowLevelRecipes = cookingSystem['getAvailableCookingRecipes'](player.id, CookingMethod.FIRE);

      // Test with high level
      skillsSystem.setSkillLevel(player.id, SkillType.COOKING, 99);
      const highLevelRecipes = cookingSystem['getAvailableCookingRecipes'](player.id, CookingMethod.FIRE);

      expect(highLevelRecipes.length).toBeGreaterThan(lowLevelRecipes.length);

      // All low level recipes should be available at level 1
      for (const recipe of lowLevelRecipes) {
        expect(recipe.levelRequired).toBeLessThanOrEqual(1);
      }
    });
  });
});