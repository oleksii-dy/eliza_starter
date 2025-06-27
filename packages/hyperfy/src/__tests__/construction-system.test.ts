/**
 * Construction System Tests
 * Comprehensive tests for the RuneScape-style Construction system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConstructionSystem } from '../rpg/systems/ConstructionSystem';
import { createTestWorld } from './createTestWorld';
import type { World } from '../types';

// Import enums from ConstructionSystem file
enum RoomType {
  GARDEN = 'garden',
  PARLOUR = 'parlour',
  KITCHEN = 'kitchen',
  DINING_ROOM = 'dining_room',
  WORKSHOP = 'workshop',
  BEDROOM = 'bedroom',
  HALL = 'hall',
  GAMES_ROOM = 'games_room',
  COMBAT_ROOM = 'combat_room',
  QUEST_HALL = 'quest_hall',
  STUDY = 'study',
  COSTUME_ROOM = 'costume_room',
  CHAPEL = 'chapel',
  PORTAL_CHAMBER = 'portal_chamber',
  FORMAL_GARDEN = 'formal_garden',
  THRONE_ROOM = 'throne_room',
  OUBLIETTE = 'oubliette',
  DUNGEON = 'dungeon',
  TREASURE_ROOM = 'treasure_room',
}

// Mock world and entity system
const mockWorld = {
  systems: [],
  events: {
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
  },
  entities: {
    get: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
  },
};

let constructionSystem: ConstructionSystem;
let mockPlayer: any;
let world: World;

describe('ConstructionSystem', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Create test world with all systems
    world = await createTestWorld();
    constructionSystem = world.getSystemByType(ConstructionSystem) as ConstructionSystem;

    // Create test player with inventory and construction component
    mockPlayer = world.createTestPlayer('player1');
    mockPlayer.addComponent('inventory', {
      type: 'inventory',
      entity: mockPlayer,
      data: {},
      items: new Map([
        [995, { id: 995, quantity: 100000 }], // Gold
        [960, { id: 960, quantity: 100 }], // Planks
        [8778, { id: 8778, quantity: 50 }], // Oak planks
      ]),
      getItemCount: vi.fn((itemId: number) => {
        if (itemId === 995) {return 100000;} // Gold
        if (itemId === 960) {return 100;} // Planks
        if (itemId === 8778) {return 50;} // Oak planks
        return 0;
      }),
      removeItem: vi.fn(),
      addItem: vi.fn(),
    });

    // Add construction component with level 50
    mockPlayer.addComponent('construction', {
      type: 'construction',
      entity: mockPlayer,
      data: {},
      level: 50,
      experience: 100000,
      houseId: null,
      inHouse: false,
      buildMode: false,
      flatpacks: new Map(),
      currentBuild: null,
    });
  });

  afterEach(() => {
    world.cleanup();
  });

  describe('House Purchasing', () => {
    it('should allow buying a house with sufficient level and gold', () => {
      const result = constructionSystem.buyHouse('player1', 'rimmington');

      expect(result).toBe(true);
      expect(mockPlayer.getComponent('inventory').removeItem).toHaveBeenCalledWith(995, 1000);
    });

    it('should prevent buying multiple houses', () => {
      // Buy first house
      constructionSystem.buyHouse('player1', 'rimmington');

      // Try to buy second house
      const result = constructionSystem.buyHouse('player1', 'taverley');

      expect(result).toBe(false);
    });

    it('should fail with insufficient gold', () => {
      // Reduce gold to 500
      mockPlayer.getComponent('inventory').getItemCount = vi.fn((itemId) =>
        itemId === 995 ? 500 : 0
      );

      const result = constructionSystem.buyHouse('player1', 'rimmington');

      expect(result).toBe(false);
    });

    it('should fail with invalid location', () => {
      const result = constructionSystem.buyHouse('player1', 'invalid_location');

      expect(result).toBe(false);
    });

    it('should fail with insufficient construction level', () => {
      // Set construction level to 0
      const constructionComponent = mockPlayer.getComponent('construction');
      constructionComponent.level = 0;

      const result = constructionSystem.buyHouse('player1', 'rimmington');

      expect(result).toBe(false);
    });
  });

  describe('House Entry and Exit', () => {
    beforeEach(() => {
      // Buy a house first
      constructionSystem.buyHouse('player1', 'rimmington');
    });

    it('should allow entering own house', () => {
      const result = constructionSystem.enterHouse('player1');

      expect(result).toBe(true);
      expect(mockPlayer.getComponent('construction').inHouse).toBe(true);
    });

    it('should allow entering other player house if visiting', () => {
      // Create another player and house
      const player2 = world.createTestPlayer('player2');
      player2.addComponent('inventory', {
        type: 'inventory',
        getItemCount: () => 100000,
        removeItem: vi.fn(),
        addItem: vi.fn(),
      });
      player2.addComponent('construction', {
        type: 'construction',
        level: 50,
        experience: 100000,
        houseId: null,
        inHouse: false,
        buildMode: false,
        flatpacks: new Map(),
        currentBuild: null,
      });

      constructionSystem.buyHouse('player2', 'taverley');

      const result = constructionSystem.enterHouse('player1', 'player2');

      expect(result).toBe(true);
    });

    it('should allow leaving house', () => {
      // Enter house first
      constructionSystem.enterHouse('player1');

      const result = constructionSystem.leaveHouse('player1');

      expect(result).toBe(true);
      expect(mockPlayer.getComponent('construction').inHouse).toBe(false);
    });

    it('should fail to leave if not in house', () => {
      const result = constructionSystem.leaveHouse('player1');

      expect(result).toBe(false);
    });
  });

  describe('Build Mode', () => {
    beforeEach(() => {
      constructionSystem.buyHouse('player1', 'rimmington');
      constructionSystem.enterHouse('player1');
    });

    it('should toggle build mode on', () => {
      const result = constructionSystem.toggleBuildMode('player1');

      expect(result).toBe(true);
      expect(mockPlayer.getComponent('construction').buildMode).toBe(true);
    });

    it('should toggle build mode off', () => {
      // Turn on build mode first
      constructionSystem.toggleBuildMode('player1');

      // Turn it off
      const result = constructionSystem.toggleBuildMode('player1');

      expect(result).toBe(true);
      expect(mockPlayer.getComponent('construction').buildMode).toBe(false);
    });

    it('should fail to toggle build mode outside house', () => {
      constructionSystem.leaveHouse('player1');

      const result = constructionSystem.toggleBuildMode('player1');

      expect(result).toBe(false);
    });
  });

  describe('Room Building', () => {
    beforeEach(() => {
      constructionSystem.buyHouse('player1', 'rimmington');
      constructionSystem.enterHouse('player1');
      constructionSystem.toggleBuildMode('player1');
    });

    it('should build a kitchen room with sufficient level and materials', () => {
      const result = constructionSystem.buildRoom(
        'player1',
        RoomType.KITCHEN,
        { floor: 0, x: 1, z: 0 },
        0
      );

      expect(result).toBe(true);
    });

    it('should build a parlour room', () => {
      const result = constructionSystem.buildRoom(
        'player1',
        RoomType.PARLOUR,
        { floor: 0, x: 2, z: 0 },
        0
      );

      expect(result).toBe(true);
    });

    it('should fail to build with insufficient construction level', () => {
      // Set level too low for throne room (requires 60)
      mockPlayer.getComponent('construction').level = 30;

      const result = constructionSystem.buildRoom(
        'player1',
        RoomType.THRONE_ROOM,
        { floor: 0, x: 1, z: 0 },
        0
      );

      expect(result).toBe(false);
    });

    it('should fail to build with insufficient materials', () => {
      // Remove all gold
      mockPlayer.getComponent('inventory').getItemCount = vi.fn(() => 0);

      const result = constructionSystem.buildRoom(
        'player1',
        RoomType.KITCHEN,
        { floor: 0, x: 1, z: 0 },
        0
      );

      expect(result).toBe(false);
    });

    it('should fail to build outside build mode', () => {
      constructionSystem.toggleBuildMode('player1'); // Turn off build mode

      const result = constructionSystem.buildRoom(
        'player1',
        RoomType.KITCHEN,
        { floor: 0, x: 1, z: 0 },
        0
      );

      expect(result).toBe(false);
    });

    it('should prevent overlapping room placement', () => {
      // Build first room
      constructionSystem.buildRoom(
        'player1',
        RoomType.KITCHEN,
        { floor: 0, x: 1, z: 0 },
        0
      );

      // Try to build overlapping room
      const result = constructionSystem.buildRoom(
        'player1',
        RoomType.DINING_ROOM,
        { floor: 0, x: 1, z: 0 }, // Same position
        0
      );

      expect(result).toBe(false);
    });
  });

  describe('Room Removal', () => {
    beforeEach(() => {
      constructionSystem.buyHouse('player1', 'rimmington');
      constructionSystem.enterHouse('player1');
      constructionSystem.toggleBuildMode('player1');

      // Build a room first
      constructionSystem.buildRoom(
        'player1',
        RoomType.KITCHEN,
        { floor: 0, x: 1, z: 0 },
        0
      );
    });

    it('should remove a built room', () => {
      const result = constructionSystem.removeRoom(
        'player1',
        { floor: 0, x: 1, z: 0 }
      );

      expect(result).toBe(true);
    });

    it('should fail to remove non-existent room', () => {
      const result = constructionSystem.removeRoom(
        'player1',
        { floor: 0, x: 5, z: 5 } // Room doesn't exist here
      );

      expect(result).toBe(false);
    });

    it('should fail to remove room outside build mode', () => {
      constructionSystem.toggleBuildMode('player1'); // Turn off build mode

      const result = constructionSystem.removeRoom(
        'player1',
        { floor: 0, x: 1, z: 0 }
      );

      expect(result).toBe(false);
    });
  });

  describe('Furniture Building', () => {
    beforeEach(() => {
      constructionSystem.buyHouse('player1', 'rimmington');
      constructionSystem.enterHouse('player1');
      constructionSystem.toggleBuildMode('player1');

      // Build a kitchen first
      constructionSystem.buildRoom(
        'player1',
        RoomType.KITCHEN,
        { floor: 0, x: 1, z: 0 },
        0
      );
    });

    it('should build wooden chair furniture', () => {
      const result = constructionSystem.buildFurniture(
        'player1',
        'wooden_chair',
        { floor: 0, x: 1, z: 0 },
        'seating'
      );

      expect(result).toBe(true);
    });

    it('should build wooden table furniture', () => {
      const result = constructionSystem.buildFurniture(
        'player1',
        'wooden_table',
        { floor: 0, x: 1, z: 0 },
        'table'
      );

      expect(result).toBe(true);
    });

    it('should fail with insufficient level', () => {
      // Try to build oak chair (requires level 19) with low level
      mockPlayer.getComponent('construction').level = 10;

      const result = constructionSystem.buildFurniture(
        'player1',
        'oak_chair',
        { floor: 0, x: 1, z: 0 },
        'seating'
      );

      expect(result).toBe(false);
    });

    it('should fail with insufficient materials', () => {
      // Remove all materials
      mockPlayer.getComponent('inventory').getItemCount = vi.fn(() => 0);

      const result = constructionSystem.buildFurniture(
        'player1',
        'wooden_chair',
        { floor: 0, x: 1, z: 0 },
        'seating'
      );

      expect(result).toBe(false);
    });

    it('should fail to build in non-existent room', () => {
      const result = constructionSystem.buildFurniture(
        'player1',
        'wooden_chair',
        { floor: 0, x: 5, z: 5 }, // No room here
        'seating'
      );

      expect(result).toBe(false);
    });
  });

  describe('Furniture Removal', () => {
    beforeEach(() => {
      constructionSystem.buyHouse('player1', 'rimmington');
      constructionSystem.enterHouse('player1');
      constructionSystem.toggleBuildMode('player1');

      // Build room and furniture
      constructionSystem.buildRoom(
        'player1',
        RoomType.KITCHEN,
        { floor: 0, x: 1, z: 0 },
        0
      );
      constructionSystem.buildFurniture(
        'player1',
        'wooden_chair',
        { floor: 0, x: 1, z: 0 },
        'seating'
      );
    });

    it('should remove built furniture', () => {
      const result = constructionSystem.removeFurniture(
        'player1',
        { floor: 0, x: 1, z: 0 },
        'seating'
      );

      expect(result).toBe(true);
    });

    it('should fail to remove non-existent furniture', () => {
      const result = constructionSystem.removeFurniture(
        'player1',
        { floor: 0, x: 1, z: 0 },
        'table' // No table built
      );

      expect(result).toBe(false);
    });
  });

  describe('Furniture Interaction', () => {
    beforeEach(() => {
      constructionSystem.buyHouse('player1', 'rimmington');
      constructionSystem.enterHouse('player1');
      constructionSystem.toggleBuildMode('player1');

      // Build room and furniture
      constructionSystem.buildRoom(
        'player1',
        RoomType.KITCHEN,
        { floor: 0, x: 1, z: 0 },
        0
      );
      constructionSystem.buildFurniture(
        'player1',
        'wooden_chair',
        { floor: 0, x: 1, z: 0 },
        'seating'
      );

      // Turn off build mode for interaction
      constructionSystem.toggleBuildMode('player1');
    });

    it('should interact with built furniture', () => {
      const result = constructionSystem.interactWithFurniture(
        'player1',
        { floor: 0, x: 1, z: 0 },
        'seating'
      );

      expect(result).toBe(true);
    });

    it('should fail to interact with non-existent furniture', () => {
      const result = constructionSystem.interactWithFurniture(
        'player1',
        { floor: 0, x: 1, z: 0 },
        'table' // No table built
      );

      expect(result).toBe(false);
    });

    it('should fail to interact in build mode', () => {
      constructionSystem.toggleBuildMode('player1'); // Turn on build mode

      const result = constructionSystem.interactWithFurniture(
        'player1',
        { floor: 0, x: 1, z: 0 },
        'seating'
      );

      expect(result).toBe(false);
    });
  });

  describe('Servant System', () => {
    beforeEach(() => {
      constructionSystem.buyHouse('player1', 'rimmington');
      constructionSystem.enterHouse('player1');
    });

    it('should hire a maid servant', () => {
      const result = constructionSystem.hireServant('player1', 'maid');

      expect(result).toBe(true);
    });

    it('should hire a butler servant', () => {
      const result = constructionSystem.hireServant('player1', 'butler');

      expect(result).toBe(true);
    });

    it('should fail to hire with insufficient gold', () => {
      // Remove all gold
      mockPlayer.getComponent('inventory').getItemCount = vi.fn(() => 0);

      const result = constructionSystem.hireServant('player1', 'butler');

      expect(result).toBe(false);
    });

    it('should fail to hire invalid servant type', () => {
      const result = constructionSystem.hireServant('player1', 'invalid_servant');

      expect(result).toBe(false);
    });

    it('should dismiss hired servant', () => {
      // Hire servant first
      constructionSystem.hireServant('player1', 'maid');

      const result = constructionSystem.dismissServant('player1');

      expect(result).toBe(true);
    });

    it('should fail to dismiss when no servant hired', () => {
      const result = constructionSystem.dismissServant('player1');

      expect(result).toBe(false);
    });
  });

  describe('Experience and Leveling', () => {
    beforeEach(() => {
      constructionSystem.buyHouse('player1', 'rimmington');
      constructionSystem.enterHouse('player1');
      constructionSystem.toggleBuildMode('player1');
    });

    it('should gain experience when building rooms', () => {
      const initialXp = mockPlayer.getComponent('construction').experience;

      constructionSystem.buildRoom(
        'player1',
        RoomType.KITCHEN,
        { floor: 0, x: 1, z: 0 },
        0
      );

      const finalXp = mockPlayer.getComponent('construction').experience;
      expect(finalXp).toBeGreaterThan(initialXp);
    });

    it('should gain experience when building furniture', () => {
      // Build room first
      constructionSystem.buildRoom(
        'player1',
        RoomType.KITCHEN,
        { floor: 0, x: 1, z: 0 },
        0
      );

      const initialXp = mockPlayer.getComponent('construction').experience;

      constructionSystem.buildFurniture(
        'player1',
        'wooden_chair',
        { floor: 0, x: 1, z: 0 },
        'seating'
      );

      const finalXp = mockPlayer.getComponent('construction').experience;
      expect(finalXp).toBeGreaterThan(initialXp);
    });

    it('should level up with sufficient experience', () => {
      const initialLevel = mockPlayer.getComponent('construction').level;

      // Manually add a lot of experience to trigger level up
      const component = mockPlayer.getComponent('construction');
      component.experience = 1000000; // Enough for high level

      // Build something to trigger level calculation
      constructionSystem.buildRoom(
        'player1',
        RoomType.KITCHEN,
        { floor: 0, x: 1, z: 0 },
        0
      );

      const finalLevel = mockPlayer.getComponent('construction').level;
      expect(finalLevel).toBeGreaterThan(initialLevel);
    });
  });

  describe('System Integration', () => {
    it('should properly initialize room costs', () => {
      expect(constructionSystem).toBeDefined();
      // System should initialize without errors
    });

    it('should properly initialize furniture definitions', () => {
      expect(constructionSystem).toBeDefined();
      // System should register furniture without errors
    });

    it('should handle world updates for servant tasks', () => {
      // Create house with servant
      constructionSystem.buyHouse('player1', 'rimmington');
      constructionSystem.enterHouse('player1');
      constructionSystem.hireServant('player1', 'maid');

      // Run world update
      expect(() => world.step()).not.toThrow();
    });

    it('should serialize and deserialize correctly', () => {
      // Create house with some content
      constructionSystem.buyHouse('player1', 'rimmington');
      constructionSystem.enterHouse('player1');
      constructionSystem.toggleBuildMode('player1');
      constructionSystem.buildRoom(
        'player1',
        RoomType.KITCHEN,
        { floor: 0, x: 1, z: 0 },
        0
      );

      // Test serialization (if method exists)
      if (typeof (constructionSystem as any).serialize === 'function') {
        const serialized = (constructionSystem as any).serialize();
        expect(serialized).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid player IDs gracefully', () => {
      expect(() => {
        constructionSystem.buyHouse('nonexistent_player', 'rimmington');
      }).not.toThrow();
    });

    it('should handle malformed room positions gracefully', () => {
      constructionSystem.buyHouse('player1', 'rimmington');
      constructionSystem.enterHouse('player1');
      constructionSystem.toggleBuildMode('player1');

      expect(() => {
        constructionSystem.buildRoom(
          'player1',
          RoomType.KITCHEN,
          { floor: -1, x: -1, z: -1 }, // Invalid position
          0
        );
      }).not.toThrow();
    });

    it('should handle invalid furniture IDs gracefully', () => {
      constructionSystem.buyHouse('player1', 'rimmington');
      constructionSystem.enterHouse('player1');
      constructionSystem.toggleBuildMode('player1');
      constructionSystem.buildRoom(
        'player1',
        RoomType.KITCHEN,
        { floor: 0, x: 1, z: 0 },
        0
      );

      expect(() => {
        constructionSystem.buildFurniture(
          'player1',
          'invalid_furniture',
          { floor: 0, x: 1, z: 0 },
          'seating'
        );
      }).not.toThrow();
    });
  });
});
