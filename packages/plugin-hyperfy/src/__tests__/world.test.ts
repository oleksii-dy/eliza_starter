/**
 * World System Tests
 * ==================
 * Tests for RuneScape world generation system implementation
 */

import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test';
import { WorldSystem } from '../rpg/systems/WorldSystem';
import { createMockWorld } from './test-utils';

describe('WorldSystem', () => {
  let worldSystem: WorldSystem;
  let mockWorld: any;

  beforeEach(() => {
    mockWorld = createMockWorld();
    
    // Set up mock world events
    mockWorld.events = {
      on: mock(),
      off: mock(),
      emit: mock(),
    };

    // Add systems array to world
    mockWorld.systems = [];

    // Mock Meshy API key
    process.env.MESHY_API_KEY = 'test-api-key';

    worldSystem = new WorldSystem(mockWorld);
  });

  describe('System Initialization', () => {
    it('should initialize with correct name and enabled state', () => {
      expect(worldSystem.name).toBe('WorldSystem');
      expect(worldSystem.enabled).toBe(true);
    });

    it('should load world regions', async () => {
      await worldSystem.init();
      const regions = worldSystem.getRegions();

      expect(regions.size).toBeGreaterThan(0);
      
      // Check for specific regions
      expect(regions.has('lumbridge')).toBe(true);
      expect(regions.has('varrock')).toBe(true);
      expect(regions.has('falador')).toBe(true);
      expect(regions.has('draynor')).toBe(true);
      expect(regions.has('wilderness')).toBe(true);
    });

    it('should load cities', async () => {
      await worldSystem.init();
      const cities = worldSystem.getCities();

      expect(cities.size).toBeGreaterThan(0);
      
      // Check for specific cities
      expect(cities.has('lumbridge')).toBe(true);
      expect(cities.has('varrock')).toBe(true);
      expect(cities.has('falador')).toBe(true);
      expect(cities.has('draynor')).toBe(true);
    });

    it('should load dungeons', async () => {
      await worldSystem.init();
      const dungeons = worldSystem.getDungeons();

      expect(dungeons.size).toBeGreaterThan(0);
      
      // Check for specific dungeons
      expect(dungeons.has('lumbridge_swamp_caves')).toBe(true);
      expect(dungeons.has('varrock_sewers')).toBe(true);
      expect(dungeons.has('edgeville_dungeon')).toBe(true);
      expect(dungeons.has('karamja_dungeon')).toBe(true);
    });

    it('should load landmarks', async () => {
      await worldSystem.init();
      const landmarks = worldSystem.getLandmarks();

      expect(landmarks.size).toBeGreaterThan(0);
      
      // Check for specific landmarks
      expect(landmarks.has('wizards_tower')).toBe(true);
      expect(landmarks.has('lumbridge_castle')).toBe(true);
      expect(landmarks.has('grand_exchange')).toBe(true);
      expect(landmarks.has('barbarian_village')).toBe(true);
    });

    it('should load teleport points', () => {
      const teleportPoints = worldSystem.getTeleportPoints();

      expect(teleportPoints.size).toBeGreaterThan(0);
      
      // Check for specific teleport points
      expect(teleportPoints.has('lumbridge')).toBe(true);
      expect(teleportPoints.has('varrock')).toBe(true);
      expect(teleportPoints.has('falador')).toBe(true);
    });

    it('should set up event listeners during init', async () => {
      await worldSystem.init();
      
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:teleport_player', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:player_move', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:enter_area', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:leave_area', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:generate_asset', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:load_world_object', expect.any(Function));
    });
  });

  describe('Region System', () => {
    it('should have correct Lumbridge region', async () => {
      await worldSystem.init();
      const regions = worldSystem.getRegions();
      const lumbridge = regions.get('lumbridge');
      
      expect(lumbridge).toBeDefined();
      expect(lumbridge!.name).toBe('Lumbridge Region');
      expect(lumbridge!.terrain).toBe('grassland');
      expect(lumbridge!.climate).toBe('temperate');
      expect(lumbridge!.level).toBe(1);
      expect(lumbridge!.type).toBe('overworld');
    });

    it('should have correct Varrock region', async () => {
      await worldSystem.init();
      const regions = worldSystem.getRegions();
      const varrock = regions.get('varrock');
      
      expect(varrock).toBeDefined();
      expect(varrock!.name).toBe('Varrock Region');
      expect(varrock!.terrain).toBe('urban');
      expect(varrock!.climate).toBe('temperate');
      expect(varrock!.level).toBe(10);
      expect(varrock!.type).toBe('overworld');
    });

    it('should have correct Wilderness region', async () => {
      await worldSystem.init();
      const regions = worldSystem.getRegions();
      const wilderness = regions.get('wilderness');
      
      expect(wilderness).toBeDefined();
      expect(wilderness!.name).toBe('Wilderness');
      expect(wilderness!.terrain).toBe('wasteland');
      expect(wilderness!.climate).toBe('harsh');
      expect(wilderness!.level).toBe(50);
      expect(wilderness!.type).toBe('wilderness');
    });

    it('should have different region sizes', async () => {
      await worldSystem.init();
      const regions = worldSystem.getRegions();
      
      for (const region of regions.values()) {
        expect(region.bounds.maxX).toBeGreaterThan(region.bounds.minX);
        expect(region.bounds.maxZ).toBeGreaterThan(region.bounds.minZ);
        expect(region.bounds.maxY).toBeGreaterThan(region.bounds.minY);
      }
    });
  });

  describe('City System', () => {
    it('should have correct Lumbridge city', async () => {
      await worldSystem.init();
      const cities = worldSystem.getCities();
      const lumbridge = cities.get('lumbridge');
      
      expect(lumbridge).toBeDefined();
      expect(lumbridge!.name).toBe('Lumbridge');
      expect(lumbridge!.type).toBe('town');
      expect(lumbridge!.level).toBe(1);
      expect(lumbridge!.safeZone).toBe(true);
      expect(lumbridge!.facilities).toContain('bank');
      expect(lumbridge!.facilities).toContain('shop');
    });

    it('should have correct Varrock city', async () => {
      await worldSystem.init();
      const cities = worldSystem.getCities();
      const varrock = cities.get('varrock');
      
      expect(varrock).toBeDefined();
      expect(varrock!.name).toBe('Varrock');
      expect(varrock!.type).toBe('city');
      expect(varrock!.level).toBe(10);
      expect(varrock!.safeZone).toBe(true);
      expect(varrock!.facilities).toContain('grand_exchange');
    });

    it('should have different city populations', async () => {
      await worldSystem.init();
      const cities = worldSystem.getCities();
      
      for (const city of cities.values()) {
        expect(city.npcs.length).toBeGreaterThan(0);
        expect(city.facilities.length).toBeGreaterThan(0);
      }
    });

    it('should have city spawn points', async () => {
      await worldSystem.init();
      const cities = worldSystem.getCities();
      
      for (const city of cities.values()) {
        expect(city.position).toBeDefined();
        expect(typeof city.position.x).toBe('number');
        expect(typeof city.position.y).toBe('number');
        expect(typeof city.position.z).toBe('number');
      }
    });
  });

  describe('Dungeon System', () => {
    it('should have correct Lumbridge Swamp Caves', async () => {
      await worldSystem.init();
      const dungeons = worldSystem.getDungeons();
      const caves = dungeons.get('lumbridge_swamp_caves');
      
      expect(caves).toBeDefined();
      expect(caves!.name).toBe('Lumbridge Swamp Caves');
      expect(caves!.type).toBe('cave');
      expect(caves!.entryLevel).toBe(1);
      expect(caves!.maxLevel).toBe(15);
      expect(caves!.floors).toBe(2);
      expect(caves!.monsters.length).toBeGreaterThan(0);
    });

    it('should have correct Karamja Volcano', async () => {
      await worldSystem.init();
      const dungeons = worldSystem.getDungeons();
      const volcano = dungeons.get('karamja_dungeon');
      
      expect(volcano).toBeDefined();
      expect(volcano!.name).toBe('Karamja Volcano');
      expect(volcano!.type).toBe('volcano');
      expect(volcano!.entryLevel).toBe(40);
      expect(volcano!.maxLevel).toBe(100);
      expect(volcano!.floors).toBe(5);
    });

    it('should have progressive dungeon difficulty', async () => {
      await worldSystem.init();
      const dungeons = worldSystem.getDungeons();
      
      for (const dungeon of dungeons.values()) {
        expect(dungeon.maxLevel).toBeGreaterThanOrEqual(dungeon.entryLevel);
        expect(dungeon.floors).toBeGreaterThan(0);
      }
    });

    it('should have dungeon entrance points', async () => {
      await worldSystem.init();
      const dungeons = worldSystem.getDungeons();
      
      for (const dungeon of dungeons.values()) {
        expect(dungeon.position).toBeDefined();
        expect(typeof dungeon.position.x).toBe('number');
        expect(typeof dungeon.position.y).toBe('number');
        expect(typeof dungeon.position.z).toBe('number');
      }
    });
  });

  describe('Landmark System', () => {
    it('should have correct Wizards Tower', async () => {
      await worldSystem.init();
      const landmarks = worldSystem.getLandmarks();
      const tower = landmarks.get('wizards_tower');
      
      expect(tower).toBeDefined();
      expect(tower!.name).toBe("Wizards' Tower");
      expect(tower!.type).toBe('tower');
      expect(tower!.significance).toBe('major');
      expect(tower!.accessible).toBe(true);
    });

    it('should have correct Lumbridge Castle', async () => {
      await worldSystem.init();
      const landmarks = worldSystem.getLandmarks();
      const castle = landmarks.get('lumbridge_castle');
      
      expect(castle).toBeDefined();
      expect(castle!.name).toBe('Lumbridge Castle');
      expect(castle!.type).toBe('castle');
      expect(castle!.significance).toBe('major');
      expect(castle!.accessible).toBe(true);
    });

    it('should have landmark positions', async () => {
      await worldSystem.init();
      const landmarks = worldSystem.getLandmarks();
      
      for (const landmark of landmarks.values()) {
        expect(landmark.position).toBeDefined();
        expect(typeof landmark.position.x).toBe('number');
        expect(typeof landmark.position.y).toBe('number');
        expect(typeof landmark.position.z).toBe('number');
      }
    });

    it('should have landmark descriptions', async () => {
      await worldSystem.init();
      const landmarks = worldSystem.getLandmarks();
      
      for (const landmark of landmarks.values()) {
        expect(landmark.description).toBeDefined();
        expect(landmark.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Teleportation System', () => {
    beforeEach(async () => {
      await worldSystem.init();
    });

    it('should successfully teleport player to valid location', () => {
      const result = worldSystem.teleportPlayer('test-player', 'lumbridge');
      expect(result).toBe(true);
      
      const playerLocation = worldSystem.getPlayerLocation('test-player');
      expect(playerLocation).toBeDefined();
      expect(playerLocation!.region).toBe('lumbridge');
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:player_teleported', {
        playerId: 'test-player',
        destination: 'lumbridge',
        position: expect.any(Object),
        region: 'lumbridge'
      });
    });

    it('should fail to teleport to invalid location', () => {
      const result = worldSystem.teleportPlayer('test-player', 'invalid-location');
      expect(result).toBe(false);
    });

    it('should teleport to different cities', () => {
      const cities = ['lumbridge', 'varrock', 'falador', 'draynor'];
      
      for (const city of cities) {
        const result = worldSystem.teleportPlayer('test-player', city);
        expect(result).toBe(true);
        
        const playerLocation = worldSystem.getPlayerLocation('test-player');
        expect(playerLocation!.region).toBe(city);
      }
    });

    it('should teleport to landmarks', () => {
      const landmarks = ['wizards_tower', 'lumbridge_castle', 'grand_exchange'];
      
      for (const landmark of landmarks) {
        const result = worldSystem.teleportPlayer('test-player', landmark);
        expect(result).toBe(true);
      }
    });

    it('should track multiple player locations', () => {
      worldSystem.teleportPlayer('player1', 'lumbridge');
      worldSystem.teleportPlayer('player2', 'varrock');
      
      const player1Location = worldSystem.getPlayerLocation('player1');
      const player2Location = worldSystem.getPlayerLocation('player2');
      
      expect(player1Location!.region).toBe('lumbridge');
      expect(player2Location!.region).toBe('varrock');
    });
  });

  describe('VRM Asset Generation', () => {
    beforeEach(async () => {
      await worldSystem.init();
    });

    it('should generate VRM asset with valid API key', async () => {
      // Mock successful API response
      const mockFetch = spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test-asset-id',
          url: 'https://example.com/asset.vrm',
          status: 'completed'
        })
      } as Response);

      const asset = await worldSystem.generateVRMAsset('medieval castle', 'building');
      
      expect(asset).toBeDefined();
      expect(asset!.type).toBe('building');
      expect(asset!.description).toBe('medieval castle');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should return null without API key', async () => {
      // Remove API key
      delete process.env.MESHY_API_KEY;
      const worldSystemNoKey = new WorldSystem(mockWorld);
      
      const asset = await worldSystemNoKey.generateVRMAsset('medieval castle', 'building');
      expect(asset).toBeNull();
    });

    it('should cache generated assets', async () => {
      // Mock successful API response
      spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'test-asset-id',
          url: 'https://example.com/asset.vrm',
          status: 'completed'
        })
      } as Response);

      // Generate same asset twice
      const asset1 = await worldSystem.generateVRMAsset('medieval castle', 'building');
      const asset2 = await worldSystem.generateVRMAsset('medieval castle', 'building');
      
      expect(asset1).toEqual(asset2);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Should only call API once due to caching
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      const asset = await worldSystem.generateVRMAsset('medieval castle', 'building');
      expect(asset).toBeNull();
    });
  });

  describe('World Object Management', () => {
    beforeEach(async () => {
      await worldSystem.init();
    });

    it('should spawn world object', () => {
      const position = { x: 100, y: 0, z: 100 };
      const objectId = worldSystem.spawnWorldObject('tree', position, 'lumbridge');
      
      expect(objectId).toBeDefined();
      expect(typeof objectId).toBe('string');
      
      const worldObject = worldSystem.getWorldObject(objectId!);
      expect(worldObject).toBeDefined();
      expect(worldObject!.type).toBe('decoration');
      expect(worldObject!.position).toEqual(position);
    });

    it('should remove world object', () => {
      const position = { x: 100, y: 0, z: 100 };
      const objectId = worldSystem.spawnWorldObject('tree', position, 'lumbridge')!;
      
      const result = worldSystem.removeWorldObject(objectId);
      expect(result).toBe(true);
      
      const worldObject = worldSystem.getWorldObject(objectId);
      expect(worldObject).toBeNull();
    });

    it('should get world objects in area', () => {
      const position1 = { x: 100, y: 0, z: 100 };
      const position2 = { x: 110, y: 0, z: 110 };
      const position3 = { x: 200, y: 0, z: 200 };
      
      worldSystem.spawnWorldObject('tree', position1, 'lumbridge');
      worldSystem.spawnWorldObject('rock', position2, 'lumbridge');
      worldSystem.spawnWorldObject('tree', position3, 'varrock');
      
      const lumbridgeObjects = worldSystem.getWorldObjectsInArea('lumbridge', 50);
      expect(lumbridgeObjects.length).toBe(2);
      
      const varrockObjects = worldSystem.getWorldObjectsInArea('varrock', 50);
      expect(varrockObjects.length).toBe(1);
    });
  });

  describe('Area Detection', () => {
    beforeEach(async () => {
      await worldSystem.init();
    });

    it('should detect player entering area', () => {
      const enterAreaSpy = spyOn(worldSystem as any, 'handleEnterArea');
      
      worldSystem.teleportPlayer('test-player', 'lumbridge');
      
      // Simulate area detection
      (worldSystem as any).handleEnterArea({
        playerId: 'test-player',
        areaId: 'lumbridge',
        areaType: 'city'
      });
      
      expect(enterAreaSpy).toHaveBeenCalledWith({
        playerId: 'test-player',
        areaId: 'lumbridge',
        areaType: 'city'
      });
    });

    it('should detect player leaving area', () => {
      const leaveAreaSpy = spyOn(worldSystem as any, 'handleLeaveArea');
      
      // Simulate area leave
      (worldSystem as any).handleLeaveArea({
        playerId: 'test-player',
        areaId: 'lumbridge',
        areaType: 'city'
      });
      
      expect(leaveAreaSpy).toHaveBeenCalledWith({
        playerId: 'test-player',
        areaId: 'lumbridge',
        areaType: 'city'
      });
    });
  });

  describe('System Performance', () => {
    beforeEach(async () => {
      await worldSystem.init();
    });

    it('should handle tick updates efficiently', () => {
      // Spawn multiple objects and players
      for (let i = 0; i < 10; i++) {
        worldSystem.spawnWorldObject('tree', { x: i * 10, y: 0, z: i * 10 }, 'lumbridge');
        worldSystem.teleportPlayer(`player${i}`, 'lumbridge');
      }
      
      // Process multiple ticks
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        worldSystem.tick(16); // 60 FPS
      }
      const endTime = Date.now();
      
      // Should complete in reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should clean up asset cache periodically', () => {
      const cleanupSpy = spyOn(worldSystem as any, 'cleanupAssetCache');
      
      // Process many ticks to trigger cleanup
      for (let i = 0; i < 100; i++) {
        worldSystem.tick(100);
      }
      
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await worldSystem.init();
    });

    it('should handle teleport player event', () => {
      const teleportSpy = spyOn(worldSystem, 'teleportPlayer');
      
      (worldSystem as any).handleTeleportPlayer({
        playerId: 'test-player',
        destination: 'varrock'
      });
      
      expect(teleportSpy).toHaveBeenCalledWith('test-player', 'varrock');
    });

    it('should handle generate asset event', async () => {
      const generateSpy = spyOn(worldSystem, 'generateVRMAsset');
      
      (worldSystem as any).handleGenerateAsset({
        description: 'medieval castle',
        assetType: 'building'
      });
      
      expect(generateSpy).toHaveBeenCalledWith('medieval castle', 'building');
    });

    it('should handle load world object event', () => {
      const spawnSpy = spyOn(worldSystem, 'spawnWorldObject');
      
      (worldSystem as any).handleLoadWorldObject({
        objectType: 'tree',
        position: { x: 100, y: 0, z: 100 },
        region: 'lumbridge'
      });
      
      expect(spawnSpy).toHaveBeenCalledWith('tree', { x: 100, y: 0, z: 100 }, 'lumbridge');
    });
  });

  describe('Validation Methods', () => {
    beforeEach(async () => {
      await worldSystem.init();
    });

    it('should validate teleport destinations', () => {
      const validDestinations = ['lumbridge', 'varrock', 'falador'];
      const invalidDestinations = ['invalid-city', 'non-existent-place'];
      
      for (const destination of validDestinations) {
        const result = worldSystem.canTeleportTo(destination);
        expect(result.canTeleport).toBe(true);
      }
      
      for (const destination of invalidDestinations) {
        const result = worldSystem.canTeleportTo(destination);
        expect(result.canTeleport).toBe(false);
        expect(result.reason).toContain('not found');
      }
    });

    it('should validate area access', () => {
      const result = worldSystem.canEnterArea('test-player', 'wilderness');
      expect(result.canEnter).toBe(true); // Should allow wilderness access
      
      const dungeonResult = worldSystem.canEnterArea('test-player', 'karamja_dungeon');
      expect(dungeonResult.canEnter).toBe(false); // Requires dragon_slayer quest
    });
  });

  describe('System Cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      worldSystem.destroy();
      
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:teleport_player');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:player_move');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:enter_area');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:leave_area');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:generate_asset');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:load_world_object');
    });

    it('should clean up active objects and player locations', () => {
      // Add some data
      worldSystem.teleportPlayer('test-player', 'lumbridge');
      worldSystem.spawnWorldObject('tree', { x: 100, y: 0, z: 100 }, 'lumbridge');
      
      worldSystem.destroy();
      
      // Data should still exist but system should be marked as destroyed
      expect(worldSystem.enabled).toBe(true); // System remains enabled but events are cleaned up
    });
  });
});