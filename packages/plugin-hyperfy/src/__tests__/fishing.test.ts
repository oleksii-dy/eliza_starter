/**
 * Fishing System Tests
 * ===================
 * Tests for RuneScape fishing mechanics implementation
 */

import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test';
import { FishingSystem } from '../rpg/systems/FishingSystem';
import { createMockWorld } from './test-utils';
import { GATHERING_CONSTANTS } from '../rpg/types/gathering';

describe('FishingSystem', () => {
  let fishingSystem: FishingSystem;
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
          fishing: { level: 30, currentXp: 13750, maxLevel: 99 },
          combat: { level: 3, currentXp: 0, maxLevel: 126 }
        },
        inventory: {
          items: [
            { itemId: 307, quantity: 1 }, // Fishing rod
            { itemId: 313, quantity: 100 }, // Fishing bait
            null, null, null, null, null, null, null, null,
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

    fishingSystem = new FishingSystem(mockWorld);
  });

  describe('System Initialization', () => {
    it('should initialize with correct name and enabled state', () => {
      expect(fishingSystem.name).toBe('FishingSystem');
      expect(fishingSystem.enabled).toBe(true);
    });

    it('should load fishing spots and tools during initialization', () => {
      const spots = fishingSystem.getFishingSpots();
      const tools = (fishingSystem as any).fishingTools;

      expect(spots.size).toBeGreaterThan(0);
      expect(tools.size).toBeGreaterThan(0);
      
      // Check for specific spots
      expect(spots.has('shrimp_spot')).toBe(true);
      expect(spots.has('trout_spot')).toBe(true);
      expect(spots.has('salmon_spot')).toBe(true);
      expect(spots.has('lobster_spot')).toBe(true);
    });

    it('should set up event listeners during init', async () => {
      await fishingSystem.init();
      
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:start_fishing', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:stop_fishing', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:fish_spot', expect.any(Function));
    });
  });

  describe('Fishing Spot Data', () => {
    it('should have correct shrimp spot configuration', () => {
      const spots = fishingSystem.getFishingSpots();
      const shrimpSpot = spots.get('shrimp_spot');
      
      expect(shrimpSpot).toBeDefined();
      expect(shrimpSpot!.name).toBe('Shrimp fishing spot');
      expect(shrimpSpot!.level).toBe(1);
      expect(shrimpSpot!.requiredTool).toBe('net');
      expect(shrimpSpot!.fishTypes).toHaveLength(1);
      expect(shrimpSpot!.fishTypes[0].itemId).toBe(317); // Raw shrimps
    });

    it('should have correct trout spot configuration', () => {
      const spots = fishingSystem.getFishingSpots();
      const troutSpot = spots.get('trout_spot');
      
      expect(troutSpot).toBeDefined();
      expect(troutSpot!.name).toBe('Trout fishing spot');
      expect(troutSpot!.level).toBe(20);
      expect(troutSpot!.requiredTool).toBe('rod');
      expect(troutSpot!.baitRequired).toBe(313); // Fishing bait
      expect(troutSpot!.fishTypes[0].itemId).toBe(335); // Raw trout
    });

    it('should have correct lobster spot configuration', () => {
      const spots = fishingSystem.getFishingSpots();
      const lobsterSpot = spots.get('lobster_spot');
      
      expect(lobsterSpot).toBeDefined();
      expect(lobsterSpot!.name).toBe('Lobster fishing spot');
      expect(lobsterSpot!.level).toBe(40);
      expect(lobsterSpot!.requiredTool).toBe('cage');
      expect(lobsterSpot!.fishTypes[0].itemId).toBe(377); // Raw lobster
    });
  });

  describe('Fishing Tool System', () => {
    it('should load fishing tools correctly', () => {
      const tools = (fishingSystem as any).fishingTools as Map<number, any>;
      
      expect(tools.has(303)).toBe(true); // Small fishing net
      expect(tools.has(307)).toBe(true); // Fishing rod
      expect(tools.has(311)).toBe(true); // Harpoon
      expect(tools.has(301)).toBe(true); // Lobster pot
    });

    it('should find player fishing tool in inventory', () => {
      const tool = (fishingSystem as any).getPlayerFishingTool('test-player', 'rod');
      
      expect(tool).toBeDefined();
      expect(tool.itemId).toBe(307); // Fishing rod
      expect(tool.name).toBe('Fishing rod');
    });

    it('should return undefined for missing tools', () => {
      const tool = (fishingSystem as any).getPlayerFishingTool('test-player', 'harpoon');
      expect(tool).toBeUndefined();
    });
  });

  describe('Fishing Mechanics', () => {
    beforeEach(async () => {
      await fishingSystem.init();
    });

    it('should successfully start fishing at shrimp spot', () => {
      const spotInstances = fishingSystem.getSpotInstances();
      const shrimpInstance = Array.from(spotInstances.values()).find(
        instance => instance.spotId === 'shrimp_spot'
      );
      
      expect(shrimpInstance).toBeDefined();
      
      // Give player a net for shrimp fishing
      mockPlayer.data.inventory.items[1] = { itemId: 303, quantity: 1 }; // Small fishing net
      
      const result = fishingSystem.startFishing('test-player', shrimpInstance!.id);
      expect(result).toBe(true);
      
      expect(fishingSystem.isPlayerFishing('test-player')).toBe(true);
    });

    it('should fail to start fishing without required tool', () => {
      const spotInstances = fishingSystem.getSpotInstances();
      const troutInstance = Array.from(spotInstances.values()).find(
        instance => instance.spotId === 'trout_spot'
      );
      
      // Remove fishing rod from inventory
      mockPlayer.data.inventory.items[0] = null;
      
      const result = fishingSystem.startFishing('test-player', troutInstance!.id);
      expect(result).toBe(false);
    });

    it('should fail to start fishing without required level', () => {
      const spotInstances = fishingSystem.getSpotInstances();
      const lobsterInstance = Array.from(spotInstances.values()).find(
        instance => instance.spotId === 'lobster_spot'
      );
      
      // Lower player fishing level
      mockPlayer.data.stats.fishing.level = 10;
      
      const result = fishingSystem.startFishing('test-player', lobsterInstance!.id);
      expect(result).toBe(false);
    });

    it('should stop fishing successfully', () => {
      const spotInstances = fishingSystem.getSpotInstances();
      const shrimpInstance = Array.from(spotInstances.values()).find(
        instance => instance.spotId === 'shrimp_spot'
      );
      
      // Give player a net
      mockPlayer.data.inventory.items[1] = { itemId: 303, quantity: 1 };
      
      fishingSystem.startFishing('test-player', shrimpInstance!.id);
      expect(fishingSystem.isPlayerFishing('test-player')).toBe(true);
      
      const stopResult = fishingSystem.stopFishing('test-player');
      expect(stopResult).toBe(true);
      expect(fishingSystem.isPlayerFishing('test-player')).toBe(false);
    });
  });

  describe('Fishing Calculations', () => {
    it('should calculate fishing duration correctly', () => {
      const spots = fishingSystem.getFishingSpots();
      const shrimpSpot = spots.get('shrimp_spot')!;
      const tool = { speedMultiplier: 1.0 } as any;
      
      const duration = (fishingSystem as any).calculateFishingDuration(10, shrimpSpot, tool);
      
      expect(duration).toBeGreaterThanOrEqual(1500); // Minimum 1.5 seconds
      expect(duration).toBeLessThan(10000); // Should be reasonable
    });

    it('should calculate catch rate correctly', () => {
      const spots = fishingSystem.getFishingSpots();
      const shrimpSpot = spots.get('shrimp_spot')!;
      const tool = { successBonus: 0.1 } as any;
      
      const catchRate = (fishingSystem as any).calculateCatchRate(10, shrimpSpot, tool);
      
      expect(catchRate).toBeGreaterThanOrEqual(0.05);
      expect(catchRate).toBeLessThanOrEqual(0.95);
      expect(catchRate).toBeGreaterThan(shrimpSpot.catchRate); // Should be higher with level and tool
    });

    it('should select fish type based on player level', () => {
      const spots = fishingSystem.getFishingSpots();
      const troutSpot = spots.get('trout_spot')!;
      
      const fishCaught = (fishingSystem as any).selectFishType(troutSpot, 25);
      expect(fishCaught).toBeDefined();
      expect(fishCaught.itemId).toBe(335); // Raw trout
      
      // Test with insufficient level
      const lowLevelFish = (fishingSystem as any).selectFishType(troutSpot, 10);
      expect(lowLevelFish).toBeNull();
    });
  });

  describe('Bait System', () => {
    it('should detect when player has required bait', () => {
      const hasBait = (fishingSystem as any).playerHasBait('test-player', 313);
      expect(hasBait).toBe(true);
    });

    it('should detect when player lacks required bait', () => {
      const hasBait = (fishingSystem as any).playerHasBait('test-player', 999);
      expect(hasBait).toBe(false);
    });

    it('should consume bait when fishing', () => {
      (fishingSystem as any).consumeBait('test-player', 313);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 313,
        quantity: 1,
      });
    });
  });

  describe('Spot Management', () => {
    beforeEach(async () => {
      await fishingSystem.init();
    });

    it('should spawn fishing spot instances', () => {
      const spotInstances = fishingSystem.getSpotInstances();
      expect(spotInstances.size).toBeGreaterThan(0);
    });

    it('should move spot when move chance triggers', () => {
      const spotInstances = fishingSystem.getSpotInstances();
      const testInstance = Array.from(spotInstances.values())[0];
      const spots = fishingSystem.getFishingSpots();
      const testSpot = spots.get(testInstance.spotId)!;
      
      const originalX = testInstance.position.x;
      
      (fishingSystem as any).moveSpot(testInstance, testSpot);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:fishing_spot_moved', expect.any(Object));
    });

    it('should deplete spot when deplete chance triggers', () => {
      const spotInstances = fishingSystem.getSpotInstances();
      const testInstance = Array.from(spotInstances.values())[0];
      const spots = fishingSystem.getFishingSpots();
      const testSpot = spots.get(testInstance.spotId)!;
      
      (fishingSystem as any).depleteSpot(testInstance, testSpot);
      
      expect(testInstance.depleted).toBe(true);
      expect(testInstance.respawnAt).toBeGreaterThan(Date.now());
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:fishing_spot_depleted', expect.any(Object));
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await fishingSystem.init();
    });

    it('should handle start fishing event', () => {
      const startSpy = spyOn(fishingSystem, 'startFishing');
      
      (fishingSystem as any).handleStartFishing({
        playerId: 'test-player',
        spotInstanceId: 'fishing_spot_0'
      });
      
      expect(startSpy).toHaveBeenCalledWith('test-player', 'fishing_spot_0');
    });

    it('should handle stop fishing event', () => {
      const stopSpy = spyOn(fishingSystem, 'stopFishing');
      
      (fishingSystem as any).handleStopFishing({
        playerId: 'test-player'
      });
      
      expect(stopSpy).toHaveBeenCalledWith('test-player');
    });

    it('should handle fish spot event', () => {
      const startSpy = spyOn(fishingSystem, 'startFishing');
      
      (fishingSystem as any).handleFishSpot({
        playerId: 'test-player',
        spotId: 'shrimp_spot'
      });
      
      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('XP and Item Rewards', () => {
    it('should grant fish to player when caught', () => {
      const fishType = { itemId: 317, name: 'Raw shrimps' } as any;
      
      (fishingSystem as any).grantFish('test-player', fishType);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:add_item', {
        playerId: 'test-player',
        itemId: 317,
        quantity: 1,
        noted: false,
      });
    });

    it('should grant fishing XP when fish is caught', () => {
      (fishingSystem as any).grantFishingXP('test-player', 50);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'fishing',
        amount: 50,
        source: 'fishing',
      });
    });
  });

  describe('System Cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      fishingSystem.destroy();
      
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:start_fishing');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:stop_fishing');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:fish_spot');
    });
  });
});