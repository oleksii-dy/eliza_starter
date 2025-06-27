/**
 * Farming System Tests
 * ===================
 * Tests for RuneScape farming mechanics implementation
 */

import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test';
import { FarmingSystem } from '../rpg/systems/FarmingSystem';
import { createMockWorld } from './test-utils';

describe('FarmingSystem', () => {
  let farmingSystem: FarmingSystem;
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
          farming: { level: 50, currentXp: 40000, maxLevel: 99 },
          combat: { level: 70, currentXp: 50000, maxLevel: 126 },
          hitpoints: { level: 60, currentXp: 45000, maxLevel: 99 }
        },
        inventory: {
          items: [
            { itemId: 5318, quantity: 10 }, // Potato seeds
            { itemId: 5291, quantity: 5 },  // Guam seeds
            { itemId: 5295, quantity: 3 },  // Ranarr seeds
            { itemId: 952, quantity: 1 },   // Spade
            { itemId: 5343, quantity: 1 },  // Seed dibber
            { itemId: 5331, quantity: 1 },  // Watering can
            { itemId: 6032, quantity: 20 }, // Compost
            { itemId: 6034, quantity: 10 }, // Supercompost
            null, null, null, null, null, null, null, null,
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

    farmingSystem = new FarmingSystem(mockWorld);
  });

  describe('System Initialization', () => {
    it('should initialize with correct name and enabled state', () => {
      expect(farmingSystem.name).toBe('FarmingSystem');
      expect(farmingSystem.enabled).toBe(true);
    });

    it('should load farming patches', () => {
      const patches = farmingSystem.getFarmingPatches();

      expect(patches.size).toBeGreaterThan(0);
      
      // Check for specific patches
      expect(patches.has('falador_allotment_north')).toBe(true);
      expect(patches.has('catherby_herb')).toBe(true);
      expect(patches.has('lumbridge_tree')).toBe(true);
      expect(patches.has('gnome_stronghold_fruit')).toBe(true);
      expect(patches.has('trollheim_herb')).toBe(true);
    });

    it('should load farming seeds', () => {
      const seeds = farmingSystem.getFarmingSeeds();

      expect(seeds.size).toBeGreaterThan(0);
      
      // Check for specific seeds
      expect(seeds.has('potato_seed')).toBe(true);
      expect(seeds.has('guam_seed')).toBe(true);
      expect(seeds.has('ranarr_seed')).toBe(true);
      expect(seeds.has('oak_sapling')).toBe(true);
      expect(seeds.has('apple_sapling')).toBe(true);
      expect(seeds.has('marigold_seed')).toBe(true);
    });

    it('should load plant products', () => {
      const products = farmingSystem.getPlantProducts();

      expect(products.size).toBeGreaterThan(0);
      
      // Check for specific products
      expect(products.has('potato')).toBe(true);
      expect(products.has('grimy_guam')).toBe(true);
      expect(products.has('oak_logs')).toBe(true);
      expect(products.has('cooking_apple')).toBe(true);
    });

    it('should set up event listeners during init', async () => {
      await farmingSystem.init();
      
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:plant_seed', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:harvest_crop', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:clear_patch', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:check_patch', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:water_crop', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:compost_patch', expect.any(Function));
    });
  });

  describe('Farming Patches', () => {
    it('should have correct falador allotment patch', () => {
      const patches = farmingSystem.getFarmingPatches();
      const faladorAllotment = patches.get('falador_allotment_north');
      
      expect(faladorAllotment).toBeDefined();
      expect(faladorAllotment!.name).toBe('Falador Allotment (North)');
      expect(faladorAllotment!.type).toBe('allotment');
      expect(faladorAllotment!.location).toBe('Falador');
      expect(faladorAllotment!.protectedByNPC).toBe(false);
      expect(faladorAllotment!.position).toBeDefined();
    });

    it('should have correct protected fruit tree patch', () => {
      const patches = farmingSystem.getFarmingPatches();
      const gnomeFruit = patches.get('gnome_stronghold_fruit');
      
      expect(gnomeFruit).toBeDefined();
      expect(gnomeFruit!.name).toBe('Tree Gnome Stronghold Fruit Tree');
      expect(gnomeFruit!.type).toBe('fruit_tree');
      expect(gnomeFruit!.location).toBe('Tree Gnome Stronghold');
      expect(gnomeFruit!.protectedByNPC).toBe(true);
    });

    it('should have different patch types', () => {
      const patches = farmingSystem.getFarmingPatches();
      const patchTypes = new Set(Array.from(patches.values()).map(p => p.type));
      
      expect(patchTypes.has('allotment')).toBe(true);
      expect(patchTypes.has('herb')).toBe(true);
      expect(patchTypes.has('tree')).toBe(true);
      expect(patchTypes.has('fruit_tree')).toBe(true);
      expect(patchTypes.has('flower')).toBe(true);
    });
  });

  describe('Farming Seeds', () => {
    it('should have correct potato seed', () => {
      const seeds = farmingSystem.getFarmingSeeds();
      const potatoSeed = seeds.get('potato_seed');
      
      expect(potatoSeed).toBeDefined();
      expect(potatoSeed!.name).toBe('Potato seed');
      expect(potatoSeed!.levelRequired).toBe(1);
      expect(potatoSeed!.patchType).toBe('allotment');
      expect(potatoSeed!.plantingXP).toBe(8);
      expect(potatoSeed!.harvestXP).toBe(9);
      expect(potatoSeed!.growthStages).toBe(4);
      expect(potatoSeed!.harvestYield).toBe(3);
    });

    it('should have correct ranarr seed', () => {
      const seeds = farmingSystem.getFarmingSeeds();
      const ranarrSeed = seeds.get('ranarr_seed');
      
      expect(ranarrSeed).toBeDefined();
      expect(ranarrSeed!.name).toBe('Ranarr seed');
      expect(ranarrSeed!.levelRequired).toBe(32);
      expect(ranarrSeed!.patchType).toBe('herb');
      expect(ranarrSeed!.plantingXP).toBe(27);
      expect(ranarrSeed!.harvestXP).toBe(30.5);
      expect(ranarrSeed!.productId).toBe(207); // Grimy ranarr
    });

    it('should have correct yew sapling', () => {
      const seeds = farmingSystem.getFarmingSeeds();
      const yewSapling = seeds.get('yew_sapling');
      
      expect(yewSapling).toBeDefined();
      expect(yewSapling!.name).toBe('Yew sapling');
      expect(yewSapling!.levelRequired).toBe(60);
      expect(yewSapling!.patchType).toBe('tree');
      expect(yewSapling!.plantingXP).toBe(81);
      expect(yewSapling!.harvestXP).toBe(7069.9);
      expect(yewSapling!.productId).toBe(1515); // Yew logs
    });

    it('should have progressive level requirements', () => {
      const seeds = farmingSystem.getFarmingSeeds();
      
      const potato = seeds.get('potato_seed');
      const sweetcorn = seeds.get('sweetcorn_seed');
      const watermelon = seeds.get('watermelon_seed');
      
      expect(potato!.levelRequired).toBe(1);
      expect(sweetcorn!.levelRequired).toBe(20);
      expect(watermelon!.levelRequired).toBe(47);
      
      // Higher level seeds should give more XP
      expect(sweetcorn!.plantingXP).toBeGreaterThan(potato!.plantingXP);
      expect(watermelon!.plantingXP).toBeGreaterThan(sweetcorn!.plantingXP);
    });
  });

  describe('Planting Mechanics', () => {
    beforeEach(async () => {
      await farmingSystem.init();
    });

    it('should successfully plant seed in appropriate patch', () => {
      const result = farmingSystem.plantSeed('test-player', 'falador_allotment_north', 'potato_seed');
      expect(result).toBe(true);
      
      const playerCrops = farmingSystem.getPlayerCrops('test-player');
      expect(playerCrops.has('falador_allotment_north')).toBe(true);
      
      const crop = playerCrops.get('falador_allotment_north');
      expect(crop!.seedId).toBe('potato_seed');
      expect(crop!.currentStage).toBe(0);
      expect(crop!.dead).toBe(false);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:seed_planted', {
        playerId: 'test-player',
        patchId: 'falador_allotment_north',
        patchName: 'Falador Allotment (North)',
        seedId: 'potato_seed',
        seedName: 'Potato seed',
        xpGained: 8,
        growthTime: expect.any(Number),
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 5318,
        quantity: 1,
      });
    });

    it('should fail to plant without required level', () => {
      // Lower player farming level
      mockPlayer.data.stats.farming.level = 5;
      
      const result = farmingSystem.plantSeed('test-player', 'catherby_herb', 'ranarr_seed');
      expect(result).toBe(false);
    });

    it('should fail to plant in wrong patch type', () => {
      const result = farmingSystem.plantSeed('test-player', 'falador_herb', 'potato_seed');
      expect(result).toBe(false);
    });

    it('should fail to plant in occupied patch', () => {
      // Plant first seed
      farmingSystem.plantSeed('test-player', 'falador_allotment_north', 'potato_seed');
      
      // Try to plant another seed in same patch
      const result = farmingSystem.plantSeed('test-player', 'falador_allotment_north', 'onion_seed');
      expect(result).toBe(false);
    });

    it('should fail to plant without seed in inventory', () => {
      // Remove all potato seeds from inventory
      mockPlayer.data.inventory.items[0] = null;
      
      const result = farmingSystem.plantSeed('test-player', 'falador_allotment_north', 'potato_seed');
      expect(result).toBe(false);
    });

    it('should fail to plant without seed dibber', () => {
      // Remove seed dibber from inventory
      mockPlayer.data.inventory.items[4] = null;
      
      const result = farmingSystem.plantSeed('test-player', 'falador_allotment_north', 'potato_seed');
      expect(result).toBe(false);
    });
  });

  describe('Harvesting Mechanics', () => {
    beforeEach(async () => {
      await farmingSystem.init();
    });

    it('should successfully harvest mature crop', () => {
      // Plant seed first
      farmingSystem.plantSeed('test-player', 'falador_allotment_north', 'potato_seed');
      
      // Manually set crop to mature stage
      const playerCrops = farmingSystem.getPlayerCrops('test-player');
      const crop = playerCrops.get('falador_allotment_north');
      crop!.currentStage = crop!.maxStage;
      
      const result = farmingSystem.harvestCrop('test-player', 'falador_allotment_north');
      expect(result).toBe(true);
      
      // Crop should be removed after harvest
      expect(playerCrops.has('falador_allotment_north')).toBe(false);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:crop_harvested', {
        playerId: 'test-player',
        patchId: 'falador_allotment_north',
        patchName: 'Falador Allotment (North)',
        seedId: 'potato_seed',
        seedName: 'Potato seed',
        productId: 1942,
        yield: expect.any(Number),
        xpGained: expect.any(Number),
      });
    });

    it('should fail to harvest immature crop', () => {
      // Plant seed
      farmingSystem.plantSeed('test-player', 'falador_allotment_north', 'potato_seed');
      
      // Try to harvest immediately (crop not mature)
      const result = farmingSystem.harvestCrop('test-player', 'falador_allotment_north');
      expect(result).toBe(false);
    });

    it('should fail to harvest dead crop', () => {
      // Plant seed
      farmingSystem.plantSeed('test-player', 'falador_allotment_north', 'potato_seed');
      
      // Kill the crop
      const playerCrops = farmingSystem.getPlayerCrops('test-player');
      const crop = playerCrops.get('falador_allotment_north');
      crop!.dead = true;
      
      const result = farmingSystem.harvestCrop('test-player', 'falador_allotment_north');
      expect(result).toBe(false);
    });

    it('should fail to harvest from empty patch', () => {
      const result = farmingSystem.harvestCrop('test-player', 'falador_allotment_north');
      expect(result).toBe(false);
    });

    it('should calculate bonus yield from good conditions', () => {
      // Plant and setup crop with good conditions
      farmingSystem.plantSeed('test-player', 'falador_allotment_north', 'potato_seed');
      
      const playerCrops = farmingSystem.getPlayerCrops('test-player');
      const crop = playerCrops.get('falador_allotment_north');
      crop!.currentStage = crop!.maxStage;
      crop!.waterLevel = 3; // Well watered
      crop!.compostLevel = 2; // Supercompost
      
      // Mock Math.random for consistent bonus
      const originalRandom = Math.random;
      Math.random = mock(() => 0.5);
      
      const result = farmingSystem.harvestCrop('test-player', 'falador_allotment_north');
      expect(result).toBe(true);
      
      // Should get bonus yield from good conditions
      const harvestCall = mockWorld.events.emit.mock.calls.find((call: any[]) => 
        call[0] === 'rpg:crop_harvested'
      );
      expect(harvestCall[1].yield).toBeGreaterThan(3); // Base yield is 3
      
      // Restore original Math.random
      Math.random = originalRandom;
    });
  });

  describe('Watering Mechanics', () => {
    beforeEach(async () => {
      await farmingSystem.init();
    });

    it('should successfully water crop', () => {
      // Plant seed first
      farmingSystem.plantSeed('test-player', 'falador_allotment_north', 'potato_seed');
      
      const result = farmingSystem.waterCrop('test-player', 'falador_allotment_north');
      expect(result).toBe(true);
      
      const playerCrops = farmingSystem.getPlayerCrops('test-player');
      const crop = playerCrops.get('falador_allotment_north');
      expect(crop!.waterLevel).toBe(1);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:crop_watered', {
        playerId: 'test-player',
        patchId: 'falador_allotment_north',
        patchName: 'Falador Allotment (North)',
        waterLevel: 1,
      });
    });

    it('should fail to water without watering can', () => {
      // Plant seed
      farmingSystem.plantSeed('test-player', 'falador_allotment_north', 'potato_seed');
      
      // Remove watering can
      mockPlayer.data.inventory.items[5] = null;
      
      const result = farmingSystem.waterCrop('test-player', 'falador_allotment_north');
      expect(result).toBe(false);
    });

    it('should fail to water empty patch', () => {
      const result = farmingSystem.waterCrop('test-player', 'falador_allotment_north');
      expect(result).toBe(false);
    });

    it('should not overwater crop', () => {
      // Plant seed
      farmingSystem.plantSeed('test-player', 'falador_allotment_north', 'potato_seed');
      
      // Water crop to maximum
      const playerCrops = farmingSystem.getPlayerCrops('test-player');
      const crop = playerCrops.get('falador_allotment_north');
      crop!.waterLevel = 3;
      
      const result = farmingSystem.waterCrop('test-player', 'falador_allotment_north');
      expect(result).toBe(false);
    });
  });

  describe('Composting Mechanics', () => {
    beforeEach(async () => {
      await farmingSystem.init();
    });

    it('should successfully apply compost to patch', () => {
      const result = farmingSystem.compostPatch('test-player', 'falador_allotment_north', 'compost');
      expect(result).toBe(true);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 6032,
        quantity: 1,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:patch_composted', {
        playerId: 'test-player',
        patchId: 'falador_allotment_north',
        patchName: 'Falador Allotment (North)',
        compostType: 'compost',
        compostLevel: 1,
      });
    });

    it('should successfully apply supercompost', () => {
      const result = farmingSystem.compostPatch('test-player', 'falador_allotment_north', 'supercompost');
      expect(result).toBe(true);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 6034,
        quantity: 1,
      });
    });

    it('should fail to compost without compost item', () => {
      // Remove compost from inventory
      mockPlayer.data.inventory.items[6] = null;
      
      const result = farmingSystem.compostPatch('test-player', 'falador_allotment_north', 'compost');
      expect(result).toBe(false);
    });

    it('should apply compost to existing crop', () => {
      // Plant seed first
      farmingSystem.plantSeed('test-player', 'falador_allotment_north', 'potato_seed');
      
      const result = farmingSystem.compostPatch('test-player', 'falador_allotment_north', 'supercompost');
      expect(result).toBe(true);
      
      const playerCrops = farmingSystem.getPlayerCrops('test-player');
      const crop = playerCrops.get('falador_allotment_north');
      expect(crop!.compostLevel).toBe(2);
    });
  });

  describe('Clearing Mechanics', () => {
    beforeEach(async () => {
      await farmingSystem.init();
    });

    it('should successfully clear patch with crop', () => {
      // Plant seed first
      farmingSystem.plantSeed('test-player', 'falador_allotment_north', 'potato_seed');
      
      const result = farmingSystem.clearPatch('test-player', 'falador_allotment_north');
      expect(result).toBe(true);
      
      const playerCrops = farmingSystem.getPlayerCrops('test-player');
      expect(playerCrops.has('falador_allotment_north')).toBe(false);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:patch_cleared', {
        playerId: 'test-player',
        patchId: 'falador_allotment_north',
        patchName: 'Falador Allotment (North)',
      });
    });

    it('should successfully clear empty patch', () => {
      const result = farmingSystem.clearPatch('test-player', 'falador_allotment_north');
      expect(result).toBe(true);
    });

    it('should fail to clear without spade', () => {
      // Remove spade from inventory
      mockPlayer.data.inventory.items[3] = null;
      
      const result = farmingSystem.clearPatch('test-player', 'falador_allotment_north');
      expect(result).toBe(false);
    });
  });

  describe('Growth Cycle Processing', () => {
    beforeEach(async () => {
      await farmingSystem.init();
    });

    it('should process growth cycles for planted crops', () => {
      // Plant seed
      farmingSystem.plantSeed('test-player', 'falador_allotment_north', 'potato_seed');
      
      // Get crop and simulate time passage
      const playerCrops = farmingSystem.getPlayerCrops('test-player');
      const crop = playerCrops.get('falador_allotment_north');
      const seeds = farmingSystem.getFarmingSeeds();
      const seed = seeds.get('potato_seed');
      
      // Simulate enough time for growth
      crop!.plantedTime = Date.now() - (seed!.growthTime / seed!.growthStages);
      
      // Process growth cycle
      (farmingSystem as any).processGrowthCycle();
      
      // Crop should have grown
      expect(crop!.currentStage).toBeGreaterThan(0);
    });

    it('should handle disease mechanics', () => {
      // Plant seed
      farmingSystem.plantSeed('test-player', 'falador_allotment_north', 'potato_seed');
      
      const playerCrops = farmingSystem.getPlayerCrops('test-player');
      const crop = playerCrops.get('falador_allotment_north');
      
      // Force disease
      crop!.diseased = true;
      
      // Mock Math.random to force death
      const originalRandom = Math.random;
      Math.random = mock(() => 0.05); // 5% chance, should cause death
      
      (farmingSystem as any).processGrowthCycle();
      
      expect(crop!.dead).toBe(true);
      
      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should reduce water level over time', () => {
      // Plant and water crop
      farmingSystem.plantSeed('test-player', 'falador_allotment_north', 'potato_seed');
      farmingSystem.waterCrop('test-player', 'falador_allotment_north');
      
      const playerCrops = farmingSystem.getPlayerCrops('test-player');
      const crop = playerCrops.get('falador_allotment_north');
      expect(crop!.waterLevel).toBe(1);
      
      // Simulate time passage (more than 30 minutes)
      crop!.lastWatered = Date.now() - 1900000;
      
      (farmingSystem as any).processGrowthCycle();
      
      expect(crop!.waterLevel).toBe(0);
    });
  });

  describe('Validation Methods', () => {
    beforeEach(async () => {
      await farmingSystem.init();
    });

    it('should validate planting capability correctly', () => {
      // Valid case
      const validResult = farmingSystem.canPlantSeed('test-player', 'falador_allotment_north', 'potato_seed');
      expect(validResult.canPlant).toBe(true);
      
      // Invalid level
      mockPlayer.data.stats.farming.level = 5;
      const invalidLevelResult = farmingSystem.canPlantSeed('test-player', 'catherby_herb', 'ranarr_seed');
      expect(invalidLevelResult.canPlant).toBe(false);
      expect(invalidLevelResult.reason).toContain('level');
      
      // Wrong patch type
      mockPlayer.data.stats.farming.level = 50; // Reset level
      const wrongPatchResult = farmingSystem.canPlantSeed('test-player', 'falador_herb', 'potato_seed');
      expect(wrongPatchResult.canPlant).toBe(false);
      expect(wrongPatchResult.reason).toContain('Cannot plant');
      
      // Occupied patch
      farmingSystem.plantSeed('test-player', 'falador_allotment_north', 'potato_seed');
      const occupiedResult = farmingSystem.canPlantSeed('test-player', 'falador_allotment_north', 'onion_seed');
      expect(occupiedResult.canPlant).toBe(false);
      expect(occupiedResult.reason).toContain('occupied');
    });

    it('should validate harvesting capability correctly', () => {
      // No crop case
      const noCropResult = farmingSystem.canHarvestCrop('test-player', 'falador_allotment_north');
      expect(noCropResult.canHarvest).toBe(false);
      expect(noCropResult.reason).toContain('No crop');
      
      // Plant seed and test immature crop
      farmingSystem.plantSeed('test-player', 'falador_allotment_north', 'potato_seed');
      const immatureResult = farmingSystem.canHarvestCrop('test-player', 'falador_allotment_north');
      expect(immatureResult.canHarvest).toBe(false);
      expect(immatureResult.reason).toContain('not ready');
      
      // Test mature crop
      const playerCrops = farmingSystem.getPlayerCrops('test-player');
      const crop = playerCrops.get('falador_allotment_north');
      crop!.currentStage = crop!.maxStage;
      const matureResult = farmingSystem.canHarvestCrop('test-player', 'falador_allotment_north');
      expect(matureResult.canHarvest).toBe(true);
      
      // Test dead crop
      crop!.dead = true;
      const deadResult = farmingSystem.canHarvestCrop('test-player', 'falador_allotment_north');
      expect(deadResult.canHarvest).toBe(false);
      expect(deadResult.reason).toContain('dead');
    });

    it('should validate clearing capability correctly', () => {
      // Valid case
      const validResult = farmingSystem.canClearPatch('test-player', 'falador_allotment_north');
      expect(validResult.canClear).toBe(true);
      
      // No spade case
      mockPlayer.data.inventory.items[3] = null; // Remove spade
      const noSpadeResult = farmingSystem.canClearPatch('test-player', 'falador_allotment_north');
      expect(noSpadeResult.canClear).toBe(false);
      expect(noSpadeResult.reason).toContain('spade');
    });

    it('should get patches by type', () => {
      const allotmentPatches = farmingSystem.getPatchesByType('allotment');
      const herbPatches = farmingSystem.getPatchesByType('herb');
      const treePatches = farmingSystem.getPatchesByType('tree');
      
      expect(allotmentPatches.length).toBeGreaterThan(0);
      expect(herbPatches.length).toBeGreaterThan(0);
      expect(treePatches.length).toBeGreaterThan(0);
      
      expect(allotmentPatches.every(p => p.type === 'allotment')).toBe(true);
      expect(herbPatches.every(p => p.type === 'herb')).toBe(true);
      expect(treePatches.every(p => p.type === 'tree')).toBe(true);
    });

    it('should get seeds by level', () => {
      const lowLevelSeeds = farmingSystem.getSeedsByLevel(1, 10);
      const midLevelSeeds = farmingSystem.getSeedsByLevel(11, 50);
      const highLevelSeeds = farmingSystem.getSeedsByLevel(51, 99);
      
      expect(lowLevelSeeds.length).toBeGreaterThan(0);
      expect(midLevelSeeds.length).toBeGreaterThan(0);
      expect(highLevelSeeds.length).toBeGreaterThan(0);
      
      expect(lowLevelSeeds.every(s => s.levelRequired >= 1 && s.levelRequired <= 10)).toBe(true);
      expect(midLevelSeeds.every(s => s.levelRequired >= 11 && s.levelRequired <= 50)).toBe(true);
      expect(highLevelSeeds.every(s => s.levelRequired >= 51 && s.levelRequired <= 99)).toBe(true);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await farmingSystem.init();
    });

    it('should handle plant seed event', () => {
      const plantSeedSpy = spyOn(farmingSystem, 'plantSeed');
      
      (farmingSystem as any).handlePlantSeed({
        playerId: 'test-player',
        patchId: 'falador_allotment_north',
        seedId: 'potato_seed'
      });
      
      expect(plantSeedSpy).toHaveBeenCalledWith('test-player', 'falador_allotment_north', 'potato_seed');
    });

    it('should handle harvest crop event', () => {
      const harvestCropSpy = spyOn(farmingSystem, 'harvestCrop');
      
      (farmingSystem as any).handleHarvestCrop({
        playerId: 'test-player',
        patchId: 'falador_allotment_north'
      });
      
      expect(harvestCropSpy).toHaveBeenCalledWith('test-player', 'falador_allotment_north');
    });

    it('should handle clear patch event', () => {
      const clearPatchSpy = spyOn(farmingSystem, 'clearPatch');
      
      (farmingSystem as any).handleClearPatch({
        playerId: 'test-player',
        patchId: 'falador_allotment_north'
      });
      
      expect(clearPatchSpy).toHaveBeenCalledWith('test-player', 'falador_allotment_north');
    });

    it('should handle water crop event', () => {
      const waterCropSpy = spyOn(farmingSystem, 'waterCrop');
      
      (farmingSystem as any).handleWaterCrop({
        playerId: 'test-player',
        patchId: 'falador_allotment_north'
      });
      
      expect(waterCropSpy).toHaveBeenCalledWith('test-player', 'falador_allotment_north');
    });

    it('should handle compost patch event', () => {
      const compostPatchSpy = spyOn(farmingSystem, 'compostPatch');
      
      (farmingSystem as any).handleCompostPatch({
        playerId: 'test-player',
        patchId: 'falador_allotment_north',
        compostType: 'supercompost'
      });
      
      expect(compostPatchSpy).toHaveBeenCalledWith('test-player', 'falador_allotment_north', 'supercompost');
    });
  });

  describe('System Cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      farmingSystem.destroy();
      
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:plant_seed');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:harvest_crop');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:clear_patch');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:check_patch');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:water_crop');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:compost_patch');
    });
  });
});