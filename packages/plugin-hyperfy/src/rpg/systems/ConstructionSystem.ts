/**
 * RuneScape Construction System Implementation
 * ==========================================
 * Handles house building, room creation, furniture placement, and construction mechanics
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';
import type { StatsComponent } from '../types/stats';
import type { InventoryComponent } from '../types/inventory';

export class ConstructionSystem implements HyperfySystem {
  name = 'ConstructionSystem';
  world: HyperfyWorld;
  enabled = true;

  // Construction data
  private housePlans: Map<string, HousePlan> = new Map();
  private roomTypes: Map<string, RoomType> = new Map();
  private furnitureBlueprints: Map<string, FurnitureBlueprint> = new Map();
  private constructionMaterials: Map<string, ConstructionMaterial> = new Map();

  // Player houses
  private playerHouses: Map<string, PlayerHouse> = new Map();
  
  // Active construction actions
  private activeConstructionActions: Map<string, ConstructionAction> = new Map();

  // Construction tick tracking
  private lastConstructionTick = 0;
  private constructionTickInterval = 3000; // 3 seconds per construction action

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.initializeConstructionData();
    logger.info('[ConstructionSystem] Initialized RuneScape construction mechanics');
  }

  async init(): Promise<void> {
    logger.info('[ConstructionSystem] Starting construction system...');
    
    // Subscribe to construction events
    this.world.events.on('rpg:build_house', this.handleBuildHouse.bind(this));
    this.world.events.on('rpg:build_room', this.handleBuildRoom.bind(this));
    this.world.events.on('rpg:place_furniture', this.handlePlaceFurniture.bind(this));
    this.world.events.on('rpg:remove_furniture', this.handleRemoveFurniture.bind(this));
    this.world.events.on('rpg:enter_house', this.handleEnterHouse.bind(this));
    this.world.events.on('rpg:exit_house', this.handleExitHouse.bind(this));
    this.world.events.on('rpg:demolish_room', this.handleDemolishRoom.bind(this));
  }

  tick(delta: number): void {
    const now = Date.now();
    
    // Process construction actions
    if (now - this.lastConstructionTick >= this.constructionTickInterval) {
      this.processConstructionActions();
      this.lastConstructionTick = now;
    }
    
    // Update active construction actions
    this.updateConstructionActions(delta);
  }

  destroy(): void {
    this.world.events.off('rpg:build_house');
    this.world.events.off('rpg:build_room');
    this.world.events.off('rpg:place_furniture');
    this.world.events.off('rpg:remove_furniture');
    this.world.events.off('rpg:enter_house');
    this.world.events.off('rpg:exit_house');
    this.world.events.off('rpg:demolish_room');
    logger.info('[ConstructionSystem] Construction system destroyed');
  }

  /**
   * Build a house for a player
   */
  buildHouse(playerId: string, housePlanId: string, location: HouseLocation): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[ConstructionSystem] Player ${playerId} not found`);
      return false;
    }

    // Check if player already has a house
    if (this.playerHouses.has(playerId)) {
      logger.info(`[ConstructionSystem] Player ${playerId} already has a house`);
      return false;
    }

    const housePlan = this.housePlans.get(housePlanId);
    if (!housePlan) {
      logger.warn(`[ConstructionSystem] House plan ${housePlanId} not found`);
      return false;
    }

    const stats = (player.data as any).stats as StatsComponent;
    if (stats.construction.level < housePlan.levelRequired) {
      logger.info(`[ConstructionSystem] Player ${playerId} needs level ${housePlan.levelRequired} Construction`);
      return false;
    }

    // Check materials required
    const inventory = (player.data as any).inventory as InventoryComponent;
    for (const [materialId, quantity] of Object.entries(housePlan.materialsRequired)) {
      if (!this.playerHasItem(playerId, parseInt(materialId), quantity)) {
        logger.info(`[ConstructionSystem] Player ${playerId} needs ${quantity} of material ${materialId}`);
        return false;
      }
    }

    // Create new house
    const house: PlayerHouse = {
      playerId,
      housePlanId,
      location,
      rooms: new Map(),
      furniture: new Map(),
      createdAt: Date.now(),
      lastVisited: Date.now(),
      constructionLevel: stats.construction.level,
    };

    // Add entrance hall (default room)
    const entranceHall: BuiltRoom = {
      roomId: 'entrance_hall',
      roomTypeId: 'entrance_hall',
      position: { x: 0, y: 0 },
      builtAt: Date.now(),
      furniture: [],
    };
    house.rooms.set('entrance_hall', entranceHall);

    this.playerHouses.set(playerId, house);

    // Remove materials from inventory
    for (const [materialId, quantity] of Object.entries(housePlan.materialsRequired)) {
      this.world.events.emit('rpg:remove_item', {
        playerId,
        itemId: parseInt(materialId),
        quantity,
      });
    }

    // Grant construction XP
    this.grantConstructionXP(playerId, housePlan.constructionXP);

    logger.info(`[ConstructionSystem] ${playerId} built house: ${housePlan.name} (${housePlan.constructionXP} XP)`);

    // Emit house built event
    this.world.events.emit('rpg:house_built', {
      playerId,
      housePlanId,
      houseName: housePlan.name,
      location,
      xpGained: housePlan.constructionXP,
    });

    return true;
  }

  /**
   * Build a room in player's house
   */
  buildRoom(playerId: string, roomTypeId: string, position: { x: number, y: number }): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[ConstructionSystem] Player ${playerId} not found`);
      return false;
    }

    const house = this.playerHouses.get(playerId);
    if (!house) {
      logger.info(`[ConstructionSystem] Player ${playerId} doesn't have a house`);
      return false;
    }

    const roomType = this.roomTypes.get(roomTypeId);
    if (!roomType) {
      logger.warn(`[ConstructionSystem] Room type ${roomTypeId} not found`);
      return false;
    }

    const stats = (player.data as any).stats as StatsComponent;
    if (stats.construction.level < roomType.levelRequired) {
      logger.info(`[ConstructionSystem] Player ${playerId} needs level ${roomType.levelRequired} Construction`);
      return false;
    }

    // Check if position is valid and not occupied
    const roomId = `${position.x}_${position.y}`;
    if (house.rooms.has(roomId)) {
      logger.info(`[ConstructionSystem] Position ${position.x},${position.y} is already occupied`);
      return false;
    }

    // Check materials required
    for (const [materialId, quantity] of Object.entries(roomType.materialsRequired)) {
      if (!this.playerHasItem(playerId, parseInt(materialId), quantity)) {
        logger.info(`[ConstructionSystem] Player ${playerId} needs ${quantity} of material ${materialId}`);
        return false;
      }
    }

    // Create new room
    const builtRoom: BuiltRoom = {
      roomId,
      roomTypeId,
      position,
      builtAt: Date.now(),
      furniture: [],
    };

    house.rooms.set(roomId, builtRoom);

    // Remove materials from inventory
    for (const [materialId, quantity] of Object.entries(roomType.materialsRequired)) {
      this.world.events.emit('rpg:remove_item', {
        playerId,
        itemId: parseInt(materialId),
        quantity,
      });
    }

    // Grant construction XP
    this.grantConstructionXP(playerId, roomType.constructionXP);

    logger.info(`[ConstructionSystem] ${playerId} built room: ${roomType.name} at ${position.x},${position.y} (${roomType.constructionXP} XP)`);

    // Emit room built event
    this.world.events.emit('rpg:room_built', {
      playerId,
      roomId,
      roomTypeId,
      roomName: roomType.name,
      position,
      xpGained: roomType.constructionXP,
    });

    return true;
  }

  /**
   * Place furniture in a room
   */
  placeFurniture(playerId: string, roomId: string, furnitureId: string, hotspot: string): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[ConstructionSystem] Player ${playerId} not found`);
      return false;
    }

    const house = this.playerHouses.get(playerId);
    if (!house) {
      logger.info(`[ConstructionSystem] Player ${playerId} doesn't have a house`);
      return false;
    }

    const room = house.rooms.get(roomId);
    if (!room) {
      logger.info(`[ConstructionSystem] Room ${roomId} not found in house`);
      return false;
    }

    const furniture = this.furnitureBlueprints.get(furnitureId);
    if (!furniture) {
      logger.warn(`[ConstructionSystem] Furniture ${furnitureId} not found`);
      return false;
    }

    const stats = (player.data as any).stats as StatsComponent;
    if (stats.construction.level < furniture.levelRequired) {
      logger.info(`[ConstructionSystem] Player ${playerId} needs level ${furniture.levelRequired} Construction`);
      return false;
    }

    // Check if hotspot is compatible with furniture
    if (!furniture.compatibleHotspots.includes(hotspot)) {
      logger.info(`[ConstructionSystem] Furniture ${furnitureId} cannot be placed on hotspot ${hotspot}`);
      return false;
    }

    // Check if hotspot is already occupied
    const existingFurniture = room.furniture.find(f => f.hotspot === hotspot);
    if (existingFurniture) {
      logger.info(`[ConstructionSystem] Hotspot ${hotspot} is already occupied`);
      return false;
    }

    // Check materials required
    for (const [materialId, quantity] of Object.entries(furniture.materialsRequired)) {
      if (!this.playerHasItem(playerId, parseInt(materialId), quantity)) {
        logger.info(`[ConstructionSystem] Player ${playerId} needs ${quantity} of material ${materialId}`);
        return false;
      }
    }

    // Check tools required
    for (const toolId of furniture.toolsRequired) {
      if (!this.playerHasTool(playerId, toolId)) {
        logger.info(`[ConstructionSystem] Player ${playerId} needs tool ${toolId}`);
        return false;
      }
    }

    // Create furniture instance
    const furnitureInstance: PlacedFurniture = {
      furnitureId,
      hotspot,
      placedAt: Date.now(),
      condition: 100, // Perfect condition when built
    };

    room.furniture.push(furnitureInstance);

    // Remove materials from inventory
    for (const [materialId, quantity] of Object.entries(furniture.materialsRequired)) {
      this.world.events.emit('rpg:remove_item', {
        playerId,
        itemId: parseInt(materialId),
        quantity,
      });
    }

    // Grant construction XP
    this.grantConstructionXP(playerId, furniture.constructionXP);

    logger.info(`[ConstructionSystem] ${playerId} placed furniture: ${furniture.name} in ${roomId} (${furniture.constructionXP} XP)`);

    // Emit furniture placed event
    this.world.events.emit('rpg:furniture_placed', {
      playerId,
      roomId,
      furnitureId,
      furnitureName: furniture.name,
      hotspot,
      xpGained: furniture.constructionXP,
    });

    return true;
  }

  /**
   * Remove furniture from a room
   */
  removeFurniture(playerId: string, roomId: string, hotspot: string): boolean {
    const house = this.playerHouses.get(playerId);
    if (!house) {
      logger.info(`[ConstructionSystem] Player ${playerId} doesn't have a house`);
      return false;
    }

    const room = house.rooms.get(roomId);
    if (!room) {
      logger.info(`[ConstructionSystem] Room ${roomId} not found in house`);
      return false;
    }

    const furnitureIndex = room.furniture.findIndex(f => f.hotspot === hotspot);
    if (furnitureIndex === -1) {
      logger.info(`[ConstructionSystem] No furniture found at hotspot ${hotspot}`);
      return false;
    }

    const furnitureInstance = room.furniture[furnitureIndex];
    const furniture = this.furnitureBlueprints.get(furnitureInstance.furnitureId);
    
    // Remove furniture
    room.furniture.splice(furnitureIndex, 1);

    logger.info(`[ConstructionSystem] ${playerId} removed furniture from ${roomId} hotspot ${hotspot}`);

    // Emit furniture removed event
    this.world.events.emit('rpg:furniture_removed', {
      playerId,
      roomId,
      furnitureId: furnitureInstance.furnitureId,
      furnitureName: furniture?.name || 'Unknown',
      hotspot,
    });

    return true;
  }

  /**
   * Process construction actions (building, placing furniture)
   */
  private processConstructionActions(): void {
    for (const [playerId, action] of this.activeConstructionActions.entries()) {
      const timeElapsed = Date.now() - action.startTime;
      
      if (timeElapsed >= action.duration) {
        // Action completed
        this.completeConstructionAction(playerId, action);
        this.activeConstructionActions.delete(playerId);
      } else {
        // Update progress
        action.progress = timeElapsed / action.duration;
        
        this.world.events.emit('rpg:construction_progress', {
          playerId,
          action: action.type,
          progress: action.progress,
          timeRemaining: action.duration - timeElapsed,
        });
      }
    }
  }

  /**
   * Complete a construction action
   */
  private completeConstructionAction(playerId: string, action: ConstructionAction): void {
    switch (action.type) {
      case 'build_house':
        // House building completion handled in buildHouse method
        break;
      case 'build_room':
        // Room building completion handled in buildRoom method
        break;
      case 'place_furniture':
        // Furniture placement completion handled in placeFurniture method
        break;
    }

    this.world.events.emit('rpg:construction_completed', {
      playerId,
      action: action.type,
      target: action.target,
    });
  }

  /**
   * Update construction actions
   */
  private updateConstructionActions(delta: number): void {
    // Update any visual or sound effects for construction actions
    for (const [playerId, action] of this.activeConstructionActions.entries()) {
      // Update construction animations, sounds, etc.
      // This would be handled by the rendering system
    }
  }

  /**
   * Grant construction XP to player
   */
  private grantConstructionXP(playerId: string, xp: number): void {
    this.world.events.emit('rpg:xp_gain', {
      playerId,
      skill: 'construction',
      amount: xp,
      source: 'construction',
    });
  }

  /**
   * Check if player has required item
   */
  private playerHasItem(playerId: string, itemId: number, quantity: number): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) return false;

    const inventory = (player.data as any).inventory as InventoryComponent;
    const item = inventory.items.find(item => item && item.itemId === itemId);
    return item ? item.quantity >= quantity : false;
  }

  /**
   * Check if player has required tool
   */
  private playerHasTool(playerId: string, toolId: number): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) return false;

    const inventory = (player.data as any).inventory as InventoryComponent;
    
    // Check inventory
    const hasInInventory = inventory.items.some(item => item && item.itemId === toolId);
    if (hasInInventory) return true;

    // Check equipped items
    const equipment = inventory.equipment;
    return Object.values(equipment).some(item => item && item.itemId === toolId);
  }

  /**
   * Initialize construction data
   */
  private initializeConstructionData(): void {
    // House plans
    this.housePlans.set('basic_house', {
      id: 'basic_house',
      name: 'Basic House',
      description: 'A simple one-room house',
      levelRequired: 1,
      constructionXP: 100,
      materialsRequired: {
        960: 10, // Logs
        2347: 1, // Hammer
      },
      maxRooms: 10,
      cost: 1000,
    });

    this.housePlans.set('fancy_house', {
      id: 'fancy_house',
      name: 'Fancy House',
      description: 'A larger house with more room slots',
      levelRequired: 25,
      constructionXP: 500,
      materialsRequired: {
        960: 50, // Logs
        2353: 20, // Steel bars
        2347: 1, // Hammer
      },
      maxRooms: 20,
      cost: 5000,
    });

    this.housePlans.set('mansion', {
      id: 'mansion',
      name: 'Mansion',
      description: 'The ultimate house with unlimited rooms',
      levelRequired: 50,
      constructionXP: 1500,
      materialsRequired: {
        960: 200, // Logs
        2353: 100, // Steel bars
        1623: 50, // Uncut diamonds
        2347: 1, // Hammer
      },
      maxRooms: 50,
      cost: 25000,
    });

    // Room types
    this.roomTypes.set('entrance_hall', {
      id: 'entrance_hall',
      name: 'Entrance Hall',
      description: 'The main entrance to your house',
      levelRequired: 1,
      constructionXP: 0,
      materialsRequired: {},
      hotspots: ['stairs', 'coat_of_arms', 'torch', 'chair'],
      size: { width: 1, height: 1 },
    });

    this.roomTypes.set('parlour', {
      id: 'parlour',
      name: 'Parlour',
      description: 'A sitting room for guests',
      levelRequired: 1,
      constructionXP: 100,
      materialsRequired: {
        960: 10, // Logs
      },
      hotspots: ['chair', 'bookshelf', 'rug', 'fireplace'],
      size: { width: 1, height: 1 },
    });

    this.roomTypes.set('kitchen', {
      id: 'kitchen',
      name: 'Kitchen',
      description: 'A room for cooking',
      levelRequired: 5,
      constructionXP: 200,
      materialsRequired: {
        960: 20, // Logs
        1775: 5, // Molten glass
      },
      hotspots: ['stove', 'table', 'shelves', 'sink'],
      size: { width: 1, height: 1 },
    });

    this.roomTypes.set('dining_room', {
      id: 'dining_room',
      name: 'Dining Room',
      description: 'A room for dining',
      levelRequired: 10,
      constructionXP: 300,
      materialsRequired: {
        960: 30, // Logs
        2353: 5, // Steel bars
      },
      hotspots: ['table', 'chair', 'wall_decoration', 'fireplace'],
      size: { width: 1, height: 1 },
    });

    this.roomTypes.set('workshop', {
      id: 'workshop',
      name: 'Workshop',
      description: 'A room for crafting and building',
      levelRequired: 15,
      constructionXP: 400,
      materialsRequired: {
        960: 40, // Logs
        2353: 10, // Steel bars
        1775: 10, // Molten glass
      },
      hotspots: ['workbench', 'tool_rack', 'repair_bench', 'clockwork_bench'],
      size: { width: 1, height: 1 },
    });

    this.roomTypes.set('study', {
      id: 'study',
      name: 'Study',
      description: 'A room for magical studies',
      levelRequired: 20,
      constructionXP: 500,
      materialsRequired: {
        960: 50, // Logs
        563: 10, // Water runes
        555: 10, // Fire runes
      },
      hotspots: ['lectern', 'globe', 'telescope', 'crystal_ball'],
      size: { width: 1, height: 1 },
    });

    // Furniture blueprints
    this.furnitureBlueprints.set('crude_chair', {
      id: 'crude_chair',
      name: 'Crude Chair',
      description: 'A basic wooden chair',
      levelRequired: 1,
      constructionXP: 15,
      materialsRequired: {
        960: 2, // Logs
        1511: 1, // Regular logs
      },
      toolsRequired: [2347], // Hammer
      compatibleHotspots: ['chair'],
      functionality: ['sit'],
    });

    this.furnitureBlueprints.set('wooden_chair', {
      id: 'wooden_chair',
      name: 'Wooden Chair',
      description: 'A sturdy wooden chair',
      levelRequired: 8,
      constructionXP: 30,
      materialsRequired: {
        960: 3, // Logs
      },
      toolsRequired: [2347], // Hammer
      compatibleHotspots: ['chair'],
      functionality: ['sit'],
    });

    this.furnitureBlueprints.set('rocking_chair', {
      id: 'rocking_chair',
      name: 'Rocking Chair',
      description: 'A comfortable rocking chair',
      levelRequired: 14,
      constructionXP: 60,
      materialsRequired: {
        960: 5, // Logs
        1751: 2, // Chisel
      },
      toolsRequired: [2347], // Hammer
      compatibleHotspots: ['chair'],
      functionality: ['sit', 'rest'],
    });

    this.furnitureBlueprints.set('bookshelf', {
      id: 'bookshelf',
      name: 'Bookshelf',
      description: 'A shelf for storing books',
      levelRequired: 4,
      constructionXP: 40,
      materialsRequired: {
        960: 4, // Logs
      },
      toolsRequired: [2347], // Hammer
      compatibleHotspots: ['bookshelf'],
      functionality: ['storage'],
    });

    this.furnitureBlueprints.set('oak_table', {
      id: 'oak_table',
      name: 'Oak Table',
      description: 'A solid oak table',
      levelRequired: 15,
      constructionXP: 180,
      materialsRequired: {
        1521: 4, // Oak logs
      },
      toolsRequired: [2347], // Hammer
      compatibleHotspots: ['table'],
      functionality: ['craft'],
    });

    this.furnitureBlueprints.set('fireplace', {
      id: 'fireplace',
      name: 'Fireplace',
      description: 'A warm fireplace',
      levelRequired: 20,
      constructionXP: 120,
      materialsRequired: {
        960: 5, // Logs
        2353: 3, // Steel bars
        1775: 2, // Molten glass
      },
      toolsRequired: [2347], // Hammer
      compatibleHotspots: ['fireplace'],
      functionality: ['warmth', 'cooking'],
    });

    // Construction materials
    this.constructionMaterials.set('960', {
      id: '960',
      name: 'Logs',
      description: 'Basic construction material',
      type: 'wood',
    });

    this.constructionMaterials.set('2353', {
      id: '2353',
      name: 'Steel bar',
      description: 'Metal construction material',
      type: 'metal',
    });

    this.constructionMaterials.set('1775', {
      id: '1775',
      name: 'Molten glass',
      description: 'Glass construction material',
      type: 'glass',
    });
  }

  // Event handlers
  private handleBuildHouse(data: { playerId: string, housePlanId: string, location: HouseLocation }): void {
    this.buildHouse(data.playerId, data.housePlanId, data.location);
  }

  private handleBuildRoom(data: { playerId: string, roomTypeId: string, position: { x: number, y: number } }): void {
    this.buildRoom(data.playerId, data.roomTypeId, data.position);
  }

  private handlePlaceFurniture(data: { playerId: string, roomId: string, furnitureId: string, hotspot: string }): void {
    this.placeFurniture(data.playerId, data.roomId, data.furnitureId, data.hotspot);
  }

  private handleRemoveFurniture(data: { playerId: string, roomId: string, hotspot: string }): void {
    this.removeFurniture(data.playerId, data.roomId, data.hotspot);
  }

  private handleEnterHouse(data: { playerId: string, houseOwnerId?: string }): void {
    const targetPlayerId = data.houseOwnerId || data.playerId;
    const house = this.playerHouses.get(targetPlayerId);
    
    if (house) {
      house.lastVisited = Date.now();
      this.world.events.emit('rpg:house_entered', {
        playerId: data.playerId,
        houseOwnerId: targetPlayerId,
        housePlanId: house.housePlanId,
      });
    }
  }

  private handleExitHouse(data: { playerId: string }): void {
    this.world.events.emit('rpg:house_exited', {
      playerId: data.playerId,
    });
  }

  private handleDemolishRoom(data: { playerId: string, roomId: string }): void {
    const house = this.playerHouses.get(data.playerId);
    if (house && house.rooms.has(data.roomId) && data.roomId !== 'entrance_hall') {
      house.rooms.delete(data.roomId);
      
      this.world.events.emit('rpg:room_demolished', {
        playerId: data.playerId,
        roomId: data.roomId,
      });
    }
  }

  // Getters for actions and UI
  getHousePlans(): Map<string, HousePlan> {
    return new Map(this.housePlans);
  }

  getRoomTypes(): Map<string, RoomType> {
    return new Map(this.roomTypes);
  }

  getFurnitureBlueprints(): Map<string, FurnitureBlueprint> {
    return new Map(this.furnitureBlueprints);
  }

  getPlayerHouse(playerId: string): PlayerHouse | null {
    return this.playerHouses.get(playerId) || null;
  }

  // Validation methods
  canBuildHouse(playerId: string, housePlanId: string): { canBuild: boolean, reason?: string } {
    if (this.playerHouses.has(playerId)) {
      return { canBuild: false, reason: 'Already have a house' };
    }

    const housePlan = this.housePlans.get(housePlanId);
    if (!housePlan) {
      return { canBuild: false, reason: `Unknown house plan: ${housePlanId}` };
    }

    const player = this.world.entities.players.get(playerId);
    if (!player) {
      return { canBuild: false, reason: 'Player not found' };
    }

    const stats = (player.data as any).stats as StatsComponent;
    if (stats.construction.level < housePlan.levelRequired) {
      return { canBuild: false, reason: `Need level ${housePlan.levelRequired} Construction` };
    }

    // Check materials
    for (const [materialId, quantity] of Object.entries(housePlan.materialsRequired)) {
      if (!this.playerHasItem(playerId, parseInt(materialId), quantity)) {
        const material = this.constructionMaterials.get(materialId);
        return { canBuild: false, reason: `Need ${quantity} ${material?.name || materialId}` };
      }
    }

    return { canBuild: true };
  }

  canBuildRoom(playerId: string, roomTypeId: string): { canBuild: boolean, reason?: string } {
    const house = this.playerHouses.get(playerId);
    if (!house) {
      return { canBuild: false, reason: 'No house built' };
    }

    const roomType = this.roomTypes.get(roomTypeId);
    if (!roomType) {
      return { canBuild: false, reason: `Unknown room type: ${roomTypeId}` };
    }

    const player = this.world.entities.players.get(playerId);
    if (!player) {
      return { canBuild: false, reason: 'Player not found' };
    }

    const stats = (player.data as any).stats as StatsComponent;
    if (stats.construction.level < roomType.levelRequired) {
      return { canBuild: false, reason: `Need level ${roomType.levelRequired} Construction` };
    }

    return { canBuild: true };
  }

  canPlaceFurniture(playerId: string, furnitureId: string): { canPlace: boolean, reason?: string } {
    const house = this.playerHouses.get(playerId);
    if (!house) {
      return { canPlace: false, reason: 'No house built' };
    }

    const furniture = this.furnitureBlueprints.get(furnitureId);
    if (!furniture) {
      return { canPlace: false, reason: `Unknown furniture: ${furnitureId}` };
    }

    const player = this.world.entities.players.get(playerId);
    if (!player) {
      return { canPlace: false, reason: 'Player not found' };
    }

    const stats = (player.data as any).stats as StatsComponent;
    if (stats.construction.level < furniture.levelRequired) {
      return { canPlace: false, reason: `Need level ${furniture.levelRequired} Construction` };
    }

    return { canPlace: true };
  }

  getRoomsByType(roomType: string): RoomType[] {
    return Array.from(this.roomTypes.values()).filter(r => r.id.includes(roomType));
  }

  getFurnitureByLevel(minLevel: number, maxLevel: number): FurnitureBlueprint[] {
    return Array.from(this.furnitureBlueprints.values())
      .filter(f => f.levelRequired >= minLevel && f.levelRequired <= maxLevel);
  }
}

// Type definitions
interface HousePlan {
  id: string;
  name: string;
  description: string;
  levelRequired: number;
  constructionXP: number;
  materialsRequired: Record<string, number>;
  maxRooms: number;
  cost: number;
}

interface RoomType {
  id: string;
  name: string;
  description: string;
  levelRequired: number;
  constructionXP: number;
  materialsRequired: Record<string, number>;
  hotspots: string[];
  size: { width: number, height: number };
}

interface FurnitureBlueprint {
  id: string;
  name: string;
  description: string;
  levelRequired: number;
  constructionXP: number;
  materialsRequired: Record<string, number>;
  toolsRequired: number[];
  compatibleHotspots: string[];
  functionality: string[];
}

interface ConstructionMaterial {
  id: string;
  name: string;
  description: string;
  type: string;
}

interface HouseLocation {
  region: string;
  coords: { x: number, y: number };
}

interface PlayerHouse {
  playerId: string;
  housePlanId: string;
  location: HouseLocation;
  rooms: Map<string, BuiltRoom>;
  furniture: Map<string, PlacedFurniture>;
  createdAt: number;
  lastVisited: number;
  constructionLevel: number;
}

interface BuiltRoom {
  roomId: string;
  roomTypeId: string;
  position: { x: number, y: number };
  builtAt: number;
  furniture: PlacedFurniture[];
}

interface PlacedFurniture {
  furnitureId: string;
  hotspot: string;
  placedAt: number;
  condition: number;
}

interface ConstructionAction {
  type: 'build_house' | 'build_room' | 'place_furniture';
  target: string;
  startTime: number;
  duration: number;
  progress: number;
}