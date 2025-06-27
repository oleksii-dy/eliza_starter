/**
 * Construction System Tests
 * ========================
 * Tests for RuneScape construction mechanics implementation
 */

import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test';
import { ConstructionSystem } from '../rpg/systems/ConstructionSystem';
import { createMockWorld } from './test-utils';

describe('ConstructionSystem', () => {
  let constructionSystem: ConstructionSystem;
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
          construction: { level: 50, currentXp: 40000, maxLevel: 99 },
          combat: { level: 70, currentXp: 50000, maxLevel: 126 },
          hitpoints: { level: 60, currentXp: 45000, maxLevel: 99 }
        },
        inventory: {
          items: [
            { itemId: 960, quantity: 100 },   // Logs
            { itemId: 2353, quantity: 50 },  // Steel bars
            { itemId: 1775, quantity: 30 },  // Molten glass
            { itemId: 2347, quantity: 1 },   // Hammer
            { itemId: 1751, quantity: 1 },   // Chisel
            { itemId: 1521, quantity: 20 },  // Oak logs
            { itemId: 1623, quantity: 10 },  // Uncut diamonds
            { itemId: 563, quantity: 20 },   // Water runes
            { itemId: 555, quantity: 20 },   // Fire runes
            null, null, null, null, null, null, null,
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

    constructionSystem = new ConstructionSystem(mockWorld);
  });

  describe('System Initialization', () => {
    it('should initialize with correct name and enabled state', () => {
      expect(constructionSystem.name).toBe('ConstructionSystem');
      expect(constructionSystem.enabled).toBe(true);
    });

    it('should load house plans', () => {
      const housePlans = constructionSystem.getHousePlans();

      expect(housePlans.size).toBeGreaterThan(0);
      
      // Check for specific house plans
      expect(housePlans.has('basic_house')).toBe(true);
      expect(housePlans.has('fancy_house')).toBe(true);
      expect(housePlans.has('mansion')).toBe(true);
    });

    it('should load room types', () => {
      const roomTypes = constructionSystem.getRoomTypes();

      expect(roomTypes.size).toBeGreaterThan(0);
      
      // Check for specific room types
      expect(roomTypes.has('entrance_hall')).toBe(true);
      expect(roomTypes.has('parlour')).toBe(true);
      expect(roomTypes.has('kitchen')).toBe(true);
      expect(roomTypes.has('dining_room')).toBe(true);
      expect(roomTypes.has('workshop')).toBe(true);
      expect(roomTypes.has('study')).toBe(true);
    });

    it('should load furniture blueprints', () => {
      const furniture = constructionSystem.getFurnitureBlueprints();

      expect(furniture.size).toBeGreaterThan(0);
      
      // Check for specific furniture
      expect(furniture.has('crude_chair')).toBe(true);
      expect(furniture.has('wooden_chair')).toBe(true);
      expect(furniture.has('rocking_chair')).toBe(true);
      expect(furniture.has('bookshelf')).toBe(true);
      expect(furniture.has('oak_table')).toBe(true);
      expect(furniture.has('fireplace')).toBe(true);
    });

    it('should set up event listeners during init', async () => {
      await constructionSystem.init();
      
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:build_house', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:build_room', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:place_furniture', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:remove_furniture', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:enter_house', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:exit_house', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:demolish_room', expect.any(Function));
    });
  });

  describe('House Plans', () => {
    it('should have correct basic house plan', () => {
      const housePlans = constructionSystem.getHousePlans();
      const basicHouse = housePlans.get('basic_house');
      
      expect(basicHouse).toBeDefined();
      expect(basicHouse!.name).toBe('Basic House');
      expect(basicHouse!.levelRequired).toBe(1);
      expect(basicHouse!.constructionXP).toBe(100);
      expect(basicHouse!.maxRooms).toBe(10);
      expect(basicHouse!.cost).toBe(1000);
    });

    it('should have correct mansion plan', () => {
      const housePlans = constructionSystem.getHousePlans();
      const mansion = housePlans.get('mansion');
      
      expect(mansion).toBeDefined();
      expect(mansion!.name).toBe('Mansion');
      expect(mansion!.levelRequired).toBe(50);
      expect(mansion!.constructionXP).toBe(1500);
      expect(mansion!.maxRooms).toBe(50);
      expect(mansion!.cost).toBe(25000);
    });

    it('should have progressive level requirements', () => {
      const housePlans = constructionSystem.getHousePlans();
      
      const basicHouse = housePlans.get('basic_house');
      const fancyHouse = housePlans.get('fancy_house');
      const mansion = housePlans.get('mansion');
      
      expect(basicHouse!.levelRequired).toBe(1);
      expect(fancyHouse!.levelRequired).toBe(25);
      expect(mansion!.levelRequired).toBe(50);
      
      // Higher level houses should give more XP
      expect(fancyHouse!.constructionXP).toBeGreaterThan(basicHouse!.constructionXP);
      expect(mansion!.constructionXP).toBeGreaterThan(fancyHouse!.constructionXP);
    });
  });

  describe('Room Types', () => {
    it('should have correct entrance hall', () => {
      const roomTypes = constructionSystem.getRoomTypes();
      const entranceHall = roomTypes.get('entrance_hall');
      
      expect(entranceHall).toBeDefined();
      expect(entranceHall!.name).toBe('Entrance Hall');
      expect(entranceHall!.levelRequired).toBe(1);
      expect(entranceHall!.constructionXP).toBe(0);
      expect(entranceHall!.hotspots).toContain('stairs');
      expect(entranceHall!.hotspots).toContain('chair');
    });

    it('should have correct kitchen', () => {
      const roomTypes = constructionSystem.getRoomTypes();
      const kitchen = roomTypes.get('kitchen');
      
      expect(kitchen).toBeDefined();
      expect(kitchen!.name).toBe('Kitchen');
      expect(kitchen!.levelRequired).toBe(5);
      expect(kitchen!.constructionXP).toBe(200);
      expect(kitchen!.hotspots).toContain('stove');
      expect(kitchen!.hotspots).toContain('table');
    });

    it('should have correct study', () => {
      const roomTypes = constructionSystem.getRoomTypes();
      const study = roomTypes.get('study');
      
      expect(study).toBeDefined();
      expect(study!.name).toBe('Study');
      expect(study!.levelRequired).toBe(20);
      expect(study!.constructionXP).toBe(500);
      expect(study!.hotspots).toContain('lectern');
      expect(study!.hotspots).toContain('telescope');
    });

    it('should have progressive level requirements', () => {
      const roomTypes = constructionSystem.getRoomTypes();
      
      const parlour = roomTypes.get('parlour');
      const kitchen = roomTypes.get('kitchen');
      const workshop = roomTypes.get('workshop');
      const study = roomTypes.get('study');
      
      expect(parlour!.levelRequired).toBe(1);
      expect(kitchen!.levelRequired).toBe(5);
      expect(workshop!.levelRequired).toBe(15);
      expect(study!.levelRequired).toBe(20);
      
      // Higher level rooms should give more XP
      expect(kitchen!.constructionXP).toBeGreaterThan(parlour!.constructionXP);
      expect(workshop!.constructionXP).toBeGreaterThan(kitchen!.constructionXP);
      expect(study!.constructionXP).toBeGreaterThan(workshop!.constructionXP);
    });
  });

  describe('Furniture Blueprints', () => {
    it('should have correct crude chair', () => {
      const furniture = constructionSystem.getFurnitureBlueprints();
      const crudeChair = furniture.get('crude_chair');
      
      expect(crudeChair).toBeDefined();
      expect(crudeChair!.name).toBe('Crude Chair');
      expect(crudeChair!.levelRequired).toBe(1);
      expect(crudeChair!.constructionXP).toBe(15);
      expect(crudeChair!.compatibleHotspots).toContain('chair');
      expect(crudeChair!.functionality).toContain('sit');
    });

    it('should have correct oak table', () => {
      const furniture = constructionSystem.getFurnitureBlueprints();
      const oakTable = furniture.get('oak_table');
      
      expect(oakTable).toBeDefined();
      expect(oakTable!.name).toBe('Oak Table');
      expect(oakTable!.levelRequired).toBe(15);
      expect(oakTable!.constructionXP).toBe(180);
      expect(oakTable!.compatibleHotspots).toContain('table');
      expect(oakTable!.functionality).toContain('craft');
    });

    it('should have correct fireplace', () => {
      const furniture = constructionSystem.getFurnitureBlueprints();
      const fireplace = furniture.get('fireplace');
      
      expect(fireplace).toBeDefined();
      expect(fireplace!.name).toBe('Fireplace');
      expect(fireplace!.levelRequired).toBe(20);
      expect(fireplace!.constructionXP).toBe(120);
      expect(fireplace!.compatibleHotspots).toContain('fireplace');
      expect(fireplace!.functionality).toContain('warmth');
      expect(fireplace!.functionality).toContain('cooking');
    });

    it('should have progressive level requirements', () => {
      const furniture = constructionSystem.getFurnitureBlueprints();
      
      const crudeChair = furniture.get('crude_chair');
      const woodenChair = furniture.get('wooden_chair');
      const rockingChair = furniture.get('rocking_chair');
      
      expect(crudeChair!.levelRequired).toBe(1);
      expect(woodenChair!.levelRequired).toBe(8);
      expect(rockingChair!.levelRequired).toBe(14);
      
      // Higher level furniture should give more XP
      expect(woodenChair!.constructionXP).toBeGreaterThan(crudeChair!.constructionXP);
      expect(rockingChair!.constructionXP).toBeGreaterThan(woodenChair!.constructionXP);
    });
  });

  describe('House Building Mechanics', () => {
    beforeEach(async () => {
      await constructionSystem.init();
    });

    it('should successfully build basic house', () => {
      const location = { region: 'Rimmington', coords: { x: 0, y: 0 } };
      const result = constructionSystem.buildHouse('test-player', 'basic_house', location);
      expect(result).toBe(true);
      
      const house = constructionSystem.getPlayerHouse('test-player');
      expect(house).toBeDefined();
      expect(house!.housePlanId).toBe('basic_house');
      expect(house!.location.region).toBe('Rimmington');
      expect(house!.rooms.has('entrance_hall')).toBe(true);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:house_built', {
        playerId: 'test-player',
        housePlanId: 'basic_house',
        houseName: 'Basic House',
        location,
        xpGained: 100,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:remove_item', {
        playerId: 'test-player',
        itemId: 960,
        quantity: 10,
      });
    });

    it('should fail to build house without required level', () => {
      // Lower player construction level
      mockPlayer.data.stats.construction.level = 5;
      
      const location = { region: 'Rimmington', coords: { x: 0, y: 0 } };
      const result = constructionSystem.buildHouse('test-player', 'mansion', location);
      expect(result).toBe(false);
    });

    it('should fail to build house without materials', () => {
      // Remove logs from inventory
      mockPlayer.data.inventory.items[0] = null;
      
      const location = { region: 'Rimmington', coords: { x: 0, y: 0 } };
      const result = constructionSystem.buildHouse('test-player', 'basic_house', location);
      expect(result).toBe(false);
    });

    it('should fail to build second house', () => {
      const location = { region: 'Rimmington', coords: { x: 0, y: 0 } };
      
      // Build first house
      constructionSystem.buildHouse('test-player', 'basic_house', location);
      
      // Try to build second house
      const result = constructionSystem.buildHouse('test-player', 'fancy_house', location);
      expect(result).toBe(false);
    });
  });

  describe('Room Building Mechanics', () => {
    beforeEach(async () => {
      await constructionSystem.init();
      
      // Build a house first
      const location = { region: 'Rimmington', coords: { x: 0, y: 0 } };
      constructionSystem.buildHouse('test-player', 'basic_house', location);
    });

    it('should successfully build parlour room', () => {
      const position = { x: 1, y: 0 };
      const result = constructionSystem.buildRoom('test-player', 'parlour', position);
      expect(result).toBe(true);
      
      const house = constructionSystem.getPlayerHouse('test-player');
      expect(house!.rooms.has('1_0')).toBe(true);
      
      const room = house!.rooms.get('1_0');
      expect(room!.roomTypeId).toBe('parlour');
      expect(room!.position).toEqual(position);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:room_built', {
        playerId: 'test-player',
        roomId: '1_0',
        roomTypeId: 'parlour',
        roomName: 'Parlour',
        position,
        xpGained: 100,
      });
    });

    it('should fail to build room without house', () => {
      // Remove house
      const emptyConstructionSystem = new ConstructionSystem(mockWorld);
      
      const position = { x: 1, y: 0 };
      const result = emptyConstructionSystem.buildRoom('test-player', 'parlour', position);
      expect(result).toBe(false);
    });

    it('should fail to build room without required level', () => {
      // Lower player construction level
      mockPlayer.data.stats.construction.level = 5;
      
      const position = { x: 1, y: 0 };
      const result = constructionSystem.buildRoom('test-player', 'study', position);
      expect(result).toBe(false);
    });

    it('should fail to build room in occupied position', () => {
      const position = { x: 1, y: 0 };
      
      // Build first room
      constructionSystem.buildRoom('test-player', 'parlour', position);
      
      // Try to build second room in same position
      const result = constructionSystem.buildRoom('test-player', 'kitchen', position);
      expect(result).toBe(false);
    });

    it('should fail to build room without materials', () => {
      // Remove logs from inventory
      mockPlayer.data.inventory.items[0] = null;
      
      const position = { x: 1, y: 0 };
      const result = constructionSystem.buildRoom('test-player', 'parlour', position);
      expect(result).toBe(false);
    });
  });

  describe('Furniture Placement Mechanics', () => {
    beforeEach(async () => {
      await constructionSystem.init();
      
      // Build a house and room first
      const location = { region: 'Rimmington', coords: { x: 0, y: 0 } };
      constructionSystem.buildHouse('test-player', 'basic_house', location);
      constructionSystem.buildRoom('test-player', 'parlour', { x: 1, y: 0 });
    });

    it('should successfully place furniture', () => {
      const result = constructionSystem.placeFurniture('test-player', '1_0', 'wooden_chair', 'chair');
      expect(result).toBe(true);
      
      const house = constructionSystem.getPlayerHouse('test-player');
      const room = house!.rooms.get('1_0');
      expect(room!.furniture.length).toBe(1);
      expect(room!.furniture[0].furnitureId).toBe('wooden_chair');
      expect(room!.furniture[0].hotspot).toBe('chair');
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:furniture_placed', {
        playerId: 'test-player',
        roomId: '1_0',
        furnitureId: 'wooden_chair',
        furnitureName: 'Wooden Chair',
        hotspot: 'chair',
        xpGained: 30,
      });
    });

    it('should fail to place furniture without required level', () => {
      // Lower player construction level
      mockPlayer.data.stats.construction.level = 5;
      
      const result = constructionSystem.placeFurniture('test-player', '1_0', 'fireplace', 'fireplace');
      expect(result).toBe(false);
    });

    it('should fail to place furniture on incompatible hotspot', () => {
      const result = constructionSystem.placeFurniture('test-player', '1_0', 'wooden_chair', 'fireplace');
      expect(result).toBe(false);
    });

    it('should fail to place furniture on occupied hotspot', () => {
      // Place first furniture
      constructionSystem.placeFurniture('test-player', '1_0', 'wooden_chair', 'chair');
      
      // Try to place second furniture on same hotspot
      const result = constructionSystem.placeFurniture('test-player', '1_0', 'rocking_chair', 'chair');
      expect(result).toBe(false);
    });

    it('should fail to place furniture without materials', () => {
      // Remove logs from inventory
      mockPlayer.data.inventory.items[0] = null;
      
      const result = constructionSystem.placeFurniture('test-player', '1_0', 'wooden_chair', 'chair');
      expect(result).toBe(false);
    });

    it('should fail to place furniture without tools', () => {
      // Remove hammer from inventory
      mockPlayer.data.inventory.items[3] = null;
      
      const result = constructionSystem.placeFurniture('test-player', '1_0', 'wooden_chair', 'chair');
      expect(result).toBe(false);
    });
  });

  describe('Furniture Removal Mechanics', () => {
    beforeEach(async () => {
      await constructionSystem.init();
      
      // Build a house, room, and place furniture first
      const location = { region: 'Rimmington', coords: { x: 0, y: 0 } };
      constructionSystem.buildHouse('test-player', 'basic_house', location);
      constructionSystem.buildRoom('test-player', 'parlour', { x: 1, y: 0 });
      constructionSystem.placeFurniture('test-player', '1_0', 'wooden_chair', 'chair');
    });

    it('should successfully remove furniture', () => {
      const result = constructionSystem.removeFurniture('test-player', '1_0', 'chair');
      expect(result).toBe(true);
      
      const house = constructionSystem.getPlayerHouse('test-player');
      const room = house!.rooms.get('1_0');
      expect(room!.furniture.length).toBe(0);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:furniture_removed', {
        playerId: 'test-player',
        roomId: '1_0',
        furnitureId: 'wooden_chair',
        furnitureName: 'Wooden Chair',
        hotspot: 'chair',
      });
    });

    it('should fail to remove furniture from empty hotspot', () => {
      // Remove furniture first
      constructionSystem.removeFurniture('test-player', '1_0', 'chair');
      
      // Try to remove again
      const result = constructionSystem.removeFurniture('test-player', '1_0', 'chair');
      expect(result).toBe(false);
    });

    it('should fail to remove furniture from non-existent room', () => {
      const result = constructionSystem.removeFurniture('test-player', 'non_existent', 'chair');
      expect(result).toBe(false);
    });
  });

  describe('Validation Methods', () => {
    beforeEach(async () => {
      await constructionSystem.init();
    });

    it('should validate house building capability correctly', () => {
      // Valid case
      const validResult = constructionSystem.canBuildHouse('test-player', 'basic_house');
      expect(validResult.canBuild).toBe(true);
      
      // Invalid level
      mockPlayer.data.stats.construction.level = 5;
      const invalidLevelResult = constructionSystem.canBuildHouse('test-player', 'mansion');
      expect(invalidLevelResult.canBuild).toBe(false);
      expect(invalidLevelResult.reason).toContain('level');
      
      // Already have house
      mockPlayer.data.stats.construction.level = 50; // Reset level
      const location = { region: 'Rimmington', coords: { x: 0, y: 0 } };
      constructionSystem.buildHouse('test-player', 'basic_house', location);
      const alreadyHaveHouseResult = constructionSystem.canBuildHouse('test-player', 'fancy_house');
      expect(alreadyHaveHouseResult.canBuild).toBe(false);
      expect(alreadyHaveHouseResult.reason).toContain('Already have');
    });

    it('should validate room building capability correctly', () => {
      // No house case
      const noHouseResult = constructionSystem.canBuildRoom('test-player', 'parlour');
      expect(noHouseResult.canBuild).toBe(false);
      expect(noHouseResult.reason).toContain('No house');
      
      // Build house and test valid case
      const location = { region: 'Rimmington', coords: { x: 0, y: 0 } };
      constructionSystem.buildHouse('test-player', 'basic_house', location);
      const validResult = constructionSystem.canBuildRoom('test-player', 'parlour');
      expect(validResult.canBuild).toBe(true);
      
      // Invalid level
      mockPlayer.data.stats.construction.level = 5;
      const invalidLevelResult = constructionSystem.canBuildRoom('test-player', 'study');
      expect(invalidLevelResult.canBuild).toBe(false);
      expect(invalidLevelResult.reason).toContain('level');
    });

    it('should validate furniture placement capability correctly', () => {
      // No house case
      const noHouseResult = constructionSystem.canPlaceFurniture('test-player', 'wooden_chair');
      expect(noHouseResult.canPlace).toBe(false);
      expect(noHouseResult.reason).toContain('No house');
      
      // Build house and test valid case
      const location = { region: 'Rimmington', coords: { x: 0, y: 0 } };
      constructionSystem.buildHouse('test-player', 'basic_house', location);
      const validResult = constructionSystem.canPlaceFurniture('test-player', 'wooden_chair');
      expect(validResult.canPlace).toBe(true);
      
      // Invalid level
      mockPlayer.data.stats.construction.level = 5;
      const invalidLevelResult = constructionSystem.canPlaceFurniture('test-player', 'fireplace');
      expect(invalidLevelResult.canPlace).toBe(false);
      expect(invalidLevelResult.reason).toContain('level');
    });

    it('should get rooms by type', () => {
      const kitchenRooms = constructionSystem.getRoomsByType('kitchen');
      const studyRooms = constructionSystem.getRoomsByType('study');
      
      expect(kitchenRooms.length).toBeGreaterThan(0);
      expect(studyRooms.length).toBeGreaterThan(0);
      
      expect(kitchenRooms.every(r => r.id.includes('kitchen'))).toBe(true);
      expect(studyRooms.every(r => r.id.includes('study'))).toBe(true);
    });

    it('should get furniture by level', () => {
      const lowLevelFurniture = constructionSystem.getFurnitureByLevel(1, 10);
      const midLevelFurniture = constructionSystem.getFurnitureByLevel(11, 20);
      
      expect(lowLevelFurniture.length).toBeGreaterThan(0);
      expect(midLevelFurniture.length).toBeGreaterThan(0);
      
      expect(lowLevelFurniture.every(f => f.levelRequired >= 1 && f.levelRequired <= 10)).toBe(true);
      expect(midLevelFurniture.every(f => f.levelRequired >= 11 && f.levelRequired <= 20)).toBe(true);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await constructionSystem.init();
    });

    it('should handle build house event', () => {
      const buildHouseSpy = spyOn(constructionSystem, 'buildHouse');
      
      const location = { region: 'Rimmington', coords: { x: 0, y: 0 } };
      (constructionSystem as any).handleBuildHouse({
        playerId: 'test-player',
        housePlanId: 'basic_house',
        location
      });
      
      expect(buildHouseSpy).toHaveBeenCalledWith('test-player', 'basic_house', location);
    });

    it('should handle build room event', () => {
      const buildRoomSpy = spyOn(constructionSystem, 'buildRoom');
      
      const position = { x: 1, y: 0 };
      (constructionSystem as any).handleBuildRoom({
        playerId: 'test-player',
        roomTypeId: 'parlour',
        position
      });
      
      expect(buildRoomSpy).toHaveBeenCalledWith('test-player', 'parlour', position);
    });

    it('should handle place furniture event', () => {
      const placeFurnitureSpy = spyOn(constructionSystem, 'placeFurniture');
      
      (constructionSystem as any).handlePlaceFurniture({
        playerId: 'test-player',
        roomId: '1_0',
        furnitureId: 'wooden_chair',
        hotspot: 'chair'
      });
      
      expect(placeFurnitureSpy).toHaveBeenCalledWith('test-player', '1_0', 'wooden_chair', 'chair');
    });

    it('should handle remove furniture event', () => {
      const removeFurnitureSpy = spyOn(constructionSystem, 'removeFurniture');
      
      (constructionSystem as any).handleRemoveFurniture({
        playerId: 'test-player',
        roomId: '1_0',
        hotspot: 'chair'
      });
      
      expect(removeFurnitureSpy).toHaveBeenCalledWith('test-player', '1_0', 'chair');
    });

    it('should handle enter house event', () => {
      // Build a house first
      const location = { region: 'Rimmington', coords: { x: 0, y: 0 } };
      constructionSystem.buildHouse('test-player', 'basic_house', location);
      
      (constructionSystem as any).handleEnterHouse({
        playerId: 'test-player'
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:house_entered', {
        playerId: 'test-player',
        houseOwnerId: 'test-player',
        housePlanId: 'basic_house',
      });
    });

    it('should handle exit house event', () => {
      (constructionSystem as any).handleExitHouse({
        playerId: 'test-player'
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:house_exited', {
        playerId: 'test-player',
      });
    });

    it('should handle demolish room event', () => {
      // Build a house and room first
      const location = { region: 'Rimmington', coords: { x: 0, y: 0 } };
      constructionSystem.buildHouse('test-player', 'basic_house', location);
      constructionSystem.buildRoom('test-player', 'parlour', { x: 1, y: 0 });
      
      (constructionSystem as any).handleDemolishRoom({
        playerId: 'test-player',
        roomId: '1_0'
      });
      
      const house = constructionSystem.getPlayerHouse('test-player');
      expect(house!.rooms.has('1_0')).toBe(false);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:room_demolished', {
        playerId: 'test-player',
        roomId: '1_0',
      });
    });

    it('should not demolish entrance hall', () => {
      // Build a house first
      const location = { region: 'Rimmington', coords: { x: 0, y: 0 } };
      constructionSystem.buildHouse('test-player', 'basic_house', location);
      
      (constructionSystem as any).handleDemolishRoom({
        playerId: 'test-player',
        roomId: 'entrance_hall'
      });
      
      const house = constructionSystem.getPlayerHouse('test-player');
      expect(house!.rooms.has('entrance_hall')).toBe(true);
    });
  });

  describe('House Management', () => {
    beforeEach(async () => {
      await constructionSystem.init();
    });

    it('should track house creation time', () => {
      const beforeTime = Date.now();
      const location = { region: 'Rimmington', coords: { x: 0, y: 0 } };
      constructionSystem.buildHouse('test-player', 'basic_house', location);
      const afterTime = Date.now();
      
      const house = constructionSystem.getPlayerHouse('test-player');
      expect(house!.createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(house!.createdAt).toBeLessThanOrEqual(afterTime);
    });

    it('should track construction level when house was built', () => {
      const location = { region: 'Rimmington', coords: { x: 0, y: 0 } };
      constructionSystem.buildHouse('test-player', 'basic_house', location);
      
      const house = constructionSystem.getPlayerHouse('test-player');
      expect(house!.constructionLevel).toBe(50);
    });

    it('should update last visited time on house entry', () => {
      const location = { region: 'Rimmington', coords: { x: 0, y: 0 } };
      constructionSystem.buildHouse('test-player', 'basic_house', location);
      
      const beforeTime = Date.now();
      (constructionSystem as any).handleEnterHouse({
        playerId: 'test-player'
      });
      const afterTime = Date.now();
      
      const house = constructionSystem.getPlayerHouse('test-player');
      expect(house!.lastVisited).toBeGreaterThanOrEqual(beforeTime);
      expect(house!.lastVisited).toBeLessThanOrEqual(afterTime);
    });

    it('should return null for non-existent house', () => {
      const house = constructionSystem.getPlayerHouse('non-existent-player');
      expect(house).toBeNull();
    });
  });

  describe('System Cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      constructionSystem.destroy();
      
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:build_house');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:build_room');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:place_furniture');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:remove_furniture');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:enter_house');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:exit_house');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:demolish_room');
    });
  });
});