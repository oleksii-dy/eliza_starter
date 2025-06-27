/**
 * RuneScape World Generation System Implementation
 * ===============================================
 * Handles world areas, cities, dungeons, landmarks, and VRM asset integration
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';

export class WorldSystem implements HyperfySystem {
  name = 'WorldSystem';
  world: HyperfyWorld;
  enabled = true;

  // World data
  private regions: Map<string, WorldRegion> = new Map();
  private cities: Map<string, City> = new Map();
  private dungeons: Map<string, Dungeon> = new Map();
  private landmarks: Map<string, Landmark> = new Map();
  private teleportPoints: Map<string, TeleportPoint> = new Map();
  
  // Asset management
  private vrmAssets: Map<string, VRMAsset> = new Map();
  private assetCache: Map<string, CachedAsset> = new Map();
  private meshyAPIKey: string | null = null;
  
  // Active world objects
  private activeObjects: Map<string, WorldObject> = new Map();
  private playerLocations: Map<string, PlayerLocation> = new Map();
  
  // World generation settings
  private generationSettings = {
    enableVRMGeneration: true,
    cacheDuration: 24 * 60 * 60 * 1000, // 24 hours
    maxAssetSize: 50 * 1024 * 1024, // 50MB
    preferredQuality: 'medium' as const,
  };

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.meshyAPIKey = process.env.MESHY_API_KEY || null;
    this.initializeWorldData();
    logger.info('[WorldSystem] Initialized RuneScape world generation system');
  }

  async init(): Promise<void> {
    logger.info('[WorldSystem] Starting world system...');
    
    // Subscribe to world events
    this.world.events.on('rpg:teleport_player', this.handleTeleportPlayer.bind(this));
    this.world.events.on('rpg:player_move', this.handlePlayerMove.bind(this));
    this.world.events.on('rpg:enter_area', this.handleEnterArea.bind(this));
    this.world.events.on('rpg:leave_area', this.handleLeaveArea.bind(this));
    this.world.events.on('rpg:generate_asset', this.handleGenerateAsset.bind(this));
    this.world.events.on('rpg:load_world_object', this.handleLoadWorldObject.bind(this));
    
    // Initialize world areas
    this.generateWorldAreas();
    
    // Load VRM assets if enabled
    if (this.generationSettings.enableVRMGeneration && this.meshyAPIKey) {
      await this.loadVRMAssets();
    }
  }

  tick(delta: number): void {
    // Update active world objects
    this.updateWorldObjects(delta);
    
    // Check for asset cache cleanup
    this.cleanupAssetCache();
    
    // Update player location tracking
    this.updatePlayerLocations();
  }

  destroy(): void {
    this.world.events.off('rpg:teleport_player');
    this.world.events.off('rpg:player_move');
    this.world.events.off('rpg:enter_area');
    this.world.events.off('rpg:leave_area');
    this.world.events.off('rpg:generate_asset');
    this.world.events.off('rpg:load_world_object');
    logger.info('[WorldSystem] World system destroyed');
  }

  /**
   * Generate a VRM asset using Meshy API
   */
  async generateVRMAsset(description: string, assetType: AssetType): Promise<VRMAsset | null> {
    if (!this.meshyAPIKey) {
      logger.warn('[WorldSystem] Meshy API key not configured');
      return null;
    }

    try {
      logger.info(`[WorldSystem] Generating VRM asset: ${description}`);
      
      // Check cache first
      const cacheKey = `${assetType}_${this.hashString(description)}`;
      const cached = this.assetCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.generationSettings.cacheDuration) {
        logger.info(`[WorldSystem] Using cached asset: ${cacheKey}`);
        return cached.asset as VRMAsset;
      }

      // Generate new asset via Meshy API
      const asset = await this.callMeshyAPI(description, assetType);
      
      if (asset) {
        // Cache the generated asset
        this.assetCache.set(cacheKey, {
          asset,
          timestamp: Date.now(),
          size: asset.fileSize || 0,
        });
        
        // Store in VRM assets
        this.vrmAssets.set(asset.id, asset);
        
        logger.info(`[WorldSystem] Successfully generated VRM asset: ${asset.id}`);
        return asset;
      }
      
      return null;
    } catch (error) {
      logger.error(`[WorldSystem] Failed to generate VRM asset: ${error}`);
      return null;
    }
  }

  /**
   * Call Meshy API to generate 3D assets
   */
  private async callMeshyAPI(description: string, assetType: AssetType): Promise<VRMAsset | null> {
    // Mock implementation - in real usage, this would call the actual Meshy API
    // https://docs.meshy.ai/api-reference/
    
    const mockAsset: VRMAsset = {
      id: `meshy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: description,
      description,
      assetType,
      fileUrl: `https://mock-meshy-api.com/assets/${assetType}/${Date.now()}.vrm`,
      thumbnailUrl: `https://mock-meshy-api.com/thumbnails/${assetType}/${Date.now()}.jpg`,
      fileSize: Math.floor(Math.random() * 10000000) + 1000000, // 1-10MB
      format: 'vrm',
      quality: this.generationSettings.preferredQuality,
      metadata: {
        polygonCount: Math.floor(Math.random() * 50000) + 10000,
        textureResolution: this.generationSettings.preferredQuality === 'high' ? '2048x2048' : '1024x1024',
        animations: assetType === 'character' ? ['idle', 'walk', 'run'] : [],
        tags: [assetType, 'runescape', 'medieval'],
      },
      generatedAt: Date.now(),
      status: 'ready',
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return mockAsset;
  }

  /**
   * Load and cache VRM assets for world objects
   */
  private async loadVRMAssets(): Promise<void> {
    logger.info('[WorldSystem] Loading VRM assets for world objects...');
    
    const assetDescriptions = [
      { type: 'building' as AssetType, desc: 'Medieval castle with towers and battlements' },
      { type: 'building' as AssetType, desc: 'Stone bridge over water' },
      { type: 'building' as AssetType, desc: 'Wooden shop with thatched roof' },
      { type: 'building' as AssetType, desc: 'Medieval bank building with vault' },
      { type: 'environment' as AssetType, desc: 'Ancient oak tree with hollow trunk' },
      { type: 'environment' as AssetType, desc: 'Rocky mining site with ore veins' },
      { type: 'environment' as AssetType, desc: 'Fishing pond with pier' },
      { type: 'dungeon' as AssetType, desc: 'Dark cave entrance with stone archway' },
      { type: 'dungeon' as AssetType, desc: 'Underground sewer tunnel system' },
      { type: 'landmark' as AssetType, desc: 'Ancient wizard tower with magical aura' },
    ];

    for (const { type, desc } of assetDescriptions) {
      await this.generateVRMAsset(desc, type);
    }
    
    logger.info(`[WorldSystem] Loaded ${this.vrmAssets.size} VRM assets`);
  }

  /**
   * Generate world areas with their associated assets
   */
  private generateWorldAreas(): void {
    logger.info('[WorldSystem] Generating world areas...');
    
    // Create major regions
    this.createLumbridgeRegion();
    this.createVarrockRegion();
    this.createFaladorRegion();
    this.createDraynorRegion();
    this.createWildernessRegion();
    
    // Create dungeons
    this.createLumbridgeSwampCaves();
    this.createVarrockSewers();
    this.createEdgevilleDungeon();
    this.createKaramjaDungeon();
    
    // Create landmarks
    this.createWizardsTower();
    this.createLumbridgeCastle();
    this.createGrandExchange();
    this.createBarbarianVillage();
    
    logger.info(`[WorldSystem] Generated ${this.regions.size} regions, ${this.cities.size} cities, ${this.dungeons.size} dungeons, ${this.landmarks.size} landmarks`);
  }

  /**
   * Create Lumbridge region
   */
  private createLumbridgeRegion(): void {
    const lumbridge: City = {
      id: 'lumbridge',
      name: 'Lumbridge',
      type: 'town',
      description: 'A peaceful starting town with a castle, shops, and training areas.',
      position: { x: 100, y: 0, z: 100 },
      bounds: {
        minX: 50, maxX: 200,
        minY: -10, maxY: 50,
        minZ: 50, maxZ: 200,
      },
      safeZone: true,
      level: 1,
      questHub: true,
      facilities: ['bank', 'shop', 'training', 'spawn'],
      npcs: ['duke_horacio', 'shop_keeper', 'combat_instructor', 'hans'],
      monsters: ['chicken', 'cow'],
      resources: ['trees', 'fishing_spot'],
      vrmAssetIds: [],
    };

    const lumbridgeRegion: WorldRegion = {
      id: 'lumbridge_region',
      name: 'Lumbridge Region',
      description: 'The starting area for new adventurers, featuring the town of Lumbridge.',
      type: 'overworld',
      position: { x: 125, y: 0, z: 125 },
      bounds: {
        minX: 0, maxX: 250,
        minY: -20, maxY: 100,
        minZ: 0, maxZ: 250,
      },
      level: 1,
      climate: 'temperate',
      terrain: 'grassland',
      cities: ['lumbridge'],
      dungeons: ['lumbridge_swamp_caves'],
      landmarks: ['lumbridge_castle'],
      questAreas: ['lumbridge_tutorial', 'cook_assistant'],
      vrmAssetIds: [],
    };

    this.cities.set('lumbridge', lumbridge);
    this.regions.set('lumbridge_region', lumbridgeRegion);
    // Also map city name to region for easier access
    this.regions.set('lumbridge', lumbridgeRegion);
  }

  /**
   * Create Varrock region
   */
  private createVarrockRegion(): void {
    const varrock: City = {
      id: 'varrock',
      name: 'Varrock',
      type: 'city',
      description: 'A large medieval city with shops, guards, and the Grand Exchange.',
      position: { x: 300, y: 0, z: 400 },
      bounds: {
        minX: 250, maxX: 400,
        minY: -10, maxY: 50,
        minZ: 350, maxZ: 500,
      },
      safeZone: true,
      level: 10,
      questHub: true,
      facilities: ['bank', 'shop', 'training', 'grand_exchange', 'magic_shop'],
      npcs: ['king_roald', 'zaff', 'aubury', 'reldo'],
      monsters: ['guard', 'dark_wizard'],
      resources: ['trees', 'anvil', 'furnace'],
      vrmAssetIds: [],
    };

    const varrockRegion: WorldRegion = {
      id: 'varrock_region',
      name: 'Varrock Region',
      description: 'A bustling medieval kingdom with the capital city of Varrock.',
      type: 'overworld',
      position: { x: 325, y: 0, z: 425 },
      bounds: {
        minX: 200, maxX: 450,
        minY: -30, maxY: 100,
        minZ: 300, maxZ: 550,
      },
      level: 10,
      climate: 'temperate',
      terrain: 'urban',
      cities: ['varrock'],
      dungeons: ['varrock_sewers'],
      landmarks: ['grand_exchange', 'varrock_palace'],
      questAreas: ['demon_slayer', 'romeo_juliet'],
      vrmAssetIds: [],
    };

    this.cities.set('varrock', varrock);
    this.regions.set('varrock_region', varrockRegion);
    // Also map city name to region for easier access
    this.regions.set('varrock', varrockRegion);
  }

  /**
   * Create Falador region
   */
  private createFaladorRegion(): void {
    const falador: City = {
      id: 'falador',
      name: 'Falador',
      type: 'city',
      description: 'A white-walled city known for its knights and mining industry.',
      position: { x: 500, y: 0, z: 300 },
      bounds: {
        minX: 450, maxX: 600,
        minY: -10, maxY: 50,
        minZ: 250, maxZ: 400,
      },
      safeZone: true,
      level: 20,
      questHub: true,
      facilities: ['bank', 'shop', 'training', 'mining_guild', 'crafting_guild'],
      npcs: ['sir_amik_varze', 'doric', 'flynn'],
      monsters: ['white_knight', 'dwarf'],
      resources: ['mining_rocks', 'anvil', 'furnace'],
      vrmAssetIds: [],
    };

    const faladorRegion: WorldRegion = {
      id: 'falador_region',
      name: 'Falador Region',
      description: 'The kingdom of the White Knights, home to mining and crafting guilds.',
      type: 'overworld',
      position: { x: 525, y: 0, z: 325 },
      bounds: {
        minX: 400, maxX: 650,
        minY: -20, maxY: 100,
        minZ: 200, maxZ: 450,
      },
      level: 20,
      climate: 'temperate',
      terrain: 'hills',
      cities: ['falador'],
      dungeons: ['dwarven_mine'],
      landmarks: ['white_knights_castle', 'party_room'],
      questAreas: ['knights_sword', 'dorics_quest'],
      vrmAssetIds: [],
    };

    this.cities.set('falador', falador);
    this.regions.set('falador_region', faladorRegion);
    // Also map city name to region for easier access
    this.regions.set('falador', faladorRegion);
  }

  /**
   * Create Draynor region
   */
  private createDraynorRegion(): void {
    const draynor: City = {
      id: 'draynor',
      name: 'Draynor Village',
      type: 'village',
      description: 'A small village known for its willow trees and bank.',
      position: { x: 200, y: 0, z: 300 },
      bounds: {
        minX: 180, maxX: 220,
        minY: -5, maxY: 30,
        minZ: 280, maxZ: 320,
      },
      safeZone: true,
      level: 5,
      questHub: false,
      facilities: ['bank', 'shop'],
      npcs: ['aggie', 'ned', 'olivia'],
      monsters: ['jail_guard'],
      resources: ['willow_trees', 'fishing_spot'],
      vrmAssetIds: [],
    };

    const draynorRegion: WorldRegion = {
      id: 'draynor_region',
      name: 'Draynor Region',
      description: 'A quiet village area with excellent fishing and woodcutting.',
      type: 'overworld',
      position: { x: 200, y: 0, z: 300 },
      bounds: {
        minX: 150, maxX: 250,
        minY: -10, maxY: 50,
        minZ: 250, maxZ: 350,
      },
      level: 5,
      climate: 'temperate',
      terrain: 'riverside',
      cities: ['draynor'],
      dungeons: ['draynor_sewers'],
      landmarks: ['draynor_manor', 'wizards_tower'],
      questAreas: ['ernest_chicken', 'vampire_slayer'],
      vrmAssetIds: [],
    };

    this.cities.set('draynor', draynor);
    this.regions.set('draynor_region', draynorRegion);
    // Also map city name to region for easier access
    this.regions.set('draynor', draynorRegion);
  }

  /**
   * Create Wilderness region
   */
  private createWildernessRegion(): void {
    const wildernessRegion: WorldRegion = {
      id: 'wilderness',
      name: 'Wilderness',
      description: 'A dangerous PvP area filled with powerful monsters and valuable resources.',
      type: 'wilderness',
      position: { x: 300, y: 0, z: 600 },
      bounds: {
        minX: 0, maxX: 600,
        minY: -50, maxY: 200,
        minZ: 500, maxZ: 800,
      },
      level: 50,
      climate: 'harsh',
      terrain: 'wasteland',
      cities: [],
      dungeons: ['wilderness_godwars', 'chaos_tunnels'],
      landmarks: ['chaos_altar', 'mage_arena', 'wilderness_agility_course'],
      questAreas: ['wilderness_quests'],
      vrmAssetIds: [],
    };

    this.regions.set('wilderness', wildernessRegion);
  }

  /**
   * Create Lumbridge Swamp Caves dungeon
   */
  private createLumbridgeSwampCaves(): void {
    const swampCaves: Dungeon = {
      id: 'lumbridge_swamp_caves',
      name: 'Lumbridge Swamp Caves',
      description: 'Underground caves beneath the swamp, home to various creatures.',
      type: 'cave',
      position: { x: 150, y: -20, z: 200 },
      bounds: {
        minX: 130, maxX: 170,
        minY: -40, maxY: -10,
        minZ: 180, maxZ: 220,
      },
      entryLevel: 1,
      maxLevel: 15,
      floors: 2,
      safeZone: false,
      entryPoints: [
        { x: 150, y: 0, z: 200, description: 'Cave entrance in the swamp' }
      ],
      monsters: ['giant_rat', 'spider', 'skeleton'],
      bosses: [],
      resources: ['clay_rocks', 'copper_ore'],
      treasures: ['bronze_items', 'crafting_materials'],
      vrmAssetIds: [],
      questRequired: null,
    };

    this.dungeons.set('lumbridge_swamp_caves', swampCaves);
  }

  /**
   * Create Varrock Sewers dungeon
   */
  private createVarrockSewers(): void {
    const varrockSewers: Dungeon = {
      id: 'varrock_sewers',
      name: 'Varrock Sewers',
      description: 'The underground sewer system beneath Varrock city.',
      type: 'sewer',
      position: { x: 325, y: -30, z: 425 },
      bounds: {
        minX: 280, maxX: 370,
        minY: -50, maxY: -20,
        minZ: 380, maxZ: 470,
      },
      entryLevel: 10,
      maxLevel: 30,
      floors: 3,
      safeZone: false,
      entryPoints: [
        { x: 320, y: 0, z: 420, description: 'Sewer grate in Varrock' },
        { x: 330, y: 0, z: 430, description: 'Basement entrance' }
      ],
      monsters: ['giant_rat', 'skeleton', 'zombie'],
      bosses: ['moss_giant'],
      resources: ['tin_ore', 'iron_ore'],
      treasures: ['coins', 'iron_items'],
      vrmAssetIds: [],
      questRequired: null,
    };

    this.dungeons.set('varrock_sewers', varrockSewers);
  }

  /**
   * Create Edgeville Dungeon
   */
  private createEdgevilleDungeon(): void {
    const edgevilleDungeon: Dungeon = {
      id: 'edgeville_dungeon',
      name: 'Edgeville Dungeon',
      description: 'A multi-level dungeon near Edgeville with powerful monsters.',
      type: 'dungeon',
      position: { x: 400, y: -40, z: 500 },
      bounds: {
        minX: 350, maxX: 450,
        minY: -80, maxY: -20,
        minZ: 450, maxZ: 550,
      },
      entryLevel: 25,
      maxLevel: 70,
      floors: 4,
      safeZone: false,
      entryPoints: [
        { x: 400, y: 0, z: 500, description: 'Trapdoor in Edgeville' }
      ],
      monsters: ['skeleton', 'zombie', 'hill_giant', 'chaos_druid'],
      bosses: ['elder_chaos_druid'],
      resources: ['coal', 'mithril_ore'],
      treasures: ['mithril_items', 'herbs', 'runes'],
      vrmAssetIds: [],
      questRequired: null,
    };

    this.dungeons.set('edgeville_dungeon', edgevilleDungeon);
  }

  /**
   * Create Karamja Dungeon
   */
  private createKaramjaDungeon(): void {
    const karamjaDungeon: Dungeon = {
      id: 'karamja_dungeon',
      name: 'Karamja Volcano',
      description: 'A dangerous volcanic dungeon on Karamja island.',
      type: 'volcano',
      position: { x: 800, y: -60, z: 800 },
      bounds: {
        minX: 750, maxX: 850,
        minY: -100, maxY: -20,
        minZ: 750, maxZ: 850,
      },
      entryLevel: 40,
      maxLevel: 100,
      floors: 5,
      safeZone: false,
      entryPoints: [
        { x: 800, y: 0, z: 800, description: 'Volcano entrance on Karamja' }
      ],
      monsters: ['lesser_demon', 'greater_demon', 'red_dragon'],
      bosses: ['elvarg', 'tzhaar_mej'],
      resources: ['adamantite_ore', 'runite_ore'],
      treasures: ['dragon_items', 'high_level_runes'],
      vrmAssetIds: [],
      questRequired: 'dragon_slayer',
    };

    this.dungeons.set('karamja_dungeon', karamjaDungeon);
  }

  /**
   * Create Wizards' Tower landmark
   */
  private createWizardsTower(): void {
    const wizardsTower: Landmark = {
      id: 'wizards_tower',
      name: "Wizards' Tower",
      description: 'A tall tower where wizards study magic and runecrafting.',
      type: 'tower',
      position: { x: 180, y: 50, z: 320 },
      bounds: {
        minX: 170, maxX: 190,
        minY: 0, maxY: 100,
        minZ: 310, maxZ: 330,
      },
      significance: 'major',
      accessible: true,
      questLocation: true,
      relatedQuests: ['rune_mysteries', 'what_lies_below'],
      npcs: ['sedridor', 'aubury', 'wizard_cromperty'],
      facilities: ['runecrafting_altar', 'magic_shop', 'teleport_chamber'],
      vrmAssetIds: [],
    };

    this.landmarks.set('wizards_tower', wizardsTower);
  }

  /**
   * Create Lumbridge Castle landmark
   */
  private createLumbridgeCastle(): void {
    const lumbridgeCastle: Landmark = {
      id: 'lumbridge_castle',
      name: 'Lumbridge Castle',
      description: 'The seat of Duke Horacio, ruler of Lumbridge.',
      type: 'castle',
      position: { x: 120, y: 20, z: 120 },
      bounds: {
        minX: 100, maxX: 140,
        minY: 0, maxY: 60,
        minZ: 100, maxZ: 140,
      },
      significance: 'major',
      accessible: true,
      questLocation: true,
      relatedQuests: ['rune_mysteries', 'restless_ghost', 'lost_city'],
      npcs: ['duke_horacio', 'father_aereck', 'hans'],
      facilities: ['throne_room', 'chapel', 'kitchen'],
      vrmAssetIds: [],
    };

    this.landmarks.set('lumbridge_castle', lumbridgeCastle);
  }

  /**
   * Create Grand Exchange landmark
   */
  private createGrandExchange(): void {
    const grandExchange: Landmark = {
      id: 'grand_exchange',
      name: 'Grand Exchange',
      description: 'The central marketplace where players trade items.',
      type: 'marketplace',
      position: { x: 315, y: 0, z: 385 },
      bounds: {
        minX: 300, maxX: 330,
        minY: 0, maxY: 30,
        minZ: 370, maxZ: 400,
      },
      significance: 'major',
      accessible: true,
      questLocation: false,
      relatedQuests: [],
      npcs: ['grand_exchange_clerk', 'brugsen_bursen'],
      facilities: ['trading_post', 'item_database', 'price_checker'],
      vrmAssetIds: [],
    };

    this.landmarks.set('grand_exchange', grandExchange);
  }

  /**
   * Create Barbarian Village landmark
   */
  private createBarbarianVillage(): void {
    const barbarianVillage: Landmark = {
      id: 'barbarian_village',
      name: 'Barbarian Village',
      description: 'A village of fierce barbarian warriors.',
      type: 'village',
      position: { x: 250, y: 0, z: 150 },
      bounds: {
        minX: 230, maxX: 270,
        minY: 0, maxY: 20,
        minZ: 130, maxZ: 170,
      },
      significance: 'minor',
      accessible: true,
      questLocation: true,
      relatedQuests: ['alfred_grimhand_barcrawl'],
      npcs: ['barbarian', 'peksa', 'dororan'],
      facilities: ['agility_course', 'fishing_spot', 'fire_pit'],
      vrmAssetIds: [],
    };

    this.landmarks.set('barbarian_village', barbarianVillage);
  }

  /**
   * Teleport a player to a specific location
   */
  teleportPlayer(playerId: string, destination: string | { x: number, y: number, z: number }): boolean {
    try {
      let targetPosition: { x: number, y: number, z: number };
      let destinationName = '';

      if (typeof destination === 'string') {
        // Look up teleport point
        const teleportPoint = this.teleportPoints.get(destination);
        if (teleportPoint) {
          targetPosition = teleportPoint.position;
          destinationName = teleportPoint.name;
        } else {
          // Try to find city, landmark, or region
          const city = this.cities.get(destination);
          const landmark = this.landmarks.get(destination);
          const region = this.regions.get(destination);
          
          if (city) {
            targetPosition = city.position;
            destinationName = city.name;
          } else if (landmark) {
            targetPosition = landmark.position;
            destinationName = landmark.name;
          } else if (region) {
            targetPosition = region.position;
            destinationName = region.name;
          } else {
            logger.warn(`[WorldSystem] Unknown teleport destination: ${destination}`);
            return false;
          }
        }
      } else {
        targetPosition = destination;
        destinationName = `coordinates ${destination.x},${destination.y},${destination.z}`;
      }

      // Update player location
      this.playerLocations.set(playerId, {
        playerId,
        position: targetPosition,
        region: this.getRegionAtPosition(targetPosition),
        lastUpdate: Date.now(),
      });

      // Emit teleport events
      this.world.events.emit('rpg:player_teleported', {
        playerId,
        destination: destinationName,
        position: targetPosition,
      });

      logger.info(`[WorldSystem] Teleported player ${playerId} to ${destinationName}`);
      return true;
    } catch (error) {
      logger.error(`[WorldSystem] Failed to teleport player ${playerId}: ${error}`);
      return false;
    }
  }

  /**
   * Get the region at a specific position
   */
  private getRegionAtPosition(position: { x: number, y: number, z: number }): string {
    for (const [regionId, region] of this.regions.entries()) {
      if (this.isPositionInBounds(position, region.bounds)) {
        return regionId;
      }
    }
    return 'unknown';
  }

  /**
   * Check if position is within bounds
   */
  private isPositionInBounds(position: { x: number, y: number, z: number }, bounds: Bounds): boolean {
    return position.x >= bounds.minX && position.x <= bounds.maxX &&
           position.y >= bounds.minY && position.y <= bounds.maxY &&
           position.z >= bounds.minZ && position.z <= bounds.maxZ;
  }

  /**
   * Update world objects
   */
  private updateWorldObjects(delta: number): void {
    // Update any dynamic world objects (moving platforms, rotating objects, etc.)
    for (const [objectId, worldObject] of this.activeObjects.entries()) {
      if (worldObject.dynamic) {
        // Update object state based on its type and behavior
        this.updateDynamicObject(worldObject, delta);
      }
    }
  }

  /**
   * Update dynamic object behavior
   */
  private updateDynamicObject(worldObject: WorldObject, delta: number): void {
    // Example: rotating windmill, moving platform, ticking clock
    if (worldObject.behavior) {
      switch (worldObject.behavior.type) {
        case 'rotate':
          // Rotate object continuously
          break;
        case 'move':
          // Move object along a path
          break;
        case 'animate':
          // Play animation cycles
          break;
      }
    }
  }

  /**
   * Clean up expired asset cache entries
   */
  private cleanupAssetCache(): void {
    const now = Date.now();
    const maxAge = this.generationSettings.cacheDuration;
    
    for (const [key, cached] of this.assetCache.entries()) {
      if (now - cached.timestamp > maxAge) {
        this.assetCache.delete(key);
        logger.info(`[WorldSystem] Cleaned up expired asset cache: ${key}`);
      }
    }
  }

  /**
   * Update player location tracking
   */
  private updatePlayerLocations(): void {
    // Check for region changes, area events, etc.
    for (const [playerId, location] of this.playerLocations.entries()) {
      const currentRegion = this.getRegionAtPosition(location.position);
      if (currentRegion !== location.region) {
        // Player moved to new region
        this.handleRegionChange(playerId, location.region, currentRegion);
        location.region = currentRegion;
      }
    }
  }

  /**
   * Handle player region change
   */
  private handleRegionChange(playerId: string, fromRegion: string, toRegion: string): void {
    logger.info(`[WorldSystem] Player ${playerId} moved from ${fromRegion} to ${toRegion}`);
    
    this.world.events.emit('rpg:region_changed', {
      playerId,
      fromRegion,
      toRegion,
      timestamp: Date.now(),
    });
  }

  /**
   * Hash string for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Initialize world data
   */
  private initializeWorldData(): void {
    // Set up common teleport points
    this.teleportPoints.set('lumbridge', {
      id: 'lumbridge',
      name: 'Lumbridge',
      position: { x: 100, y: 0, z: 100 },
      description: 'Teleport to Lumbridge town center',
      levelRequired: 1,
      runesRequired: [],
    });

    this.teleportPoints.set('varrock', {
      id: 'varrock',
      name: 'Varrock',
      position: { x: 300, y: 0, z: 400 },
      description: 'Teleport to Varrock town center',
      levelRequired: 25,
      runesRequired: [{ runeId: 563, quantity: 3 }, { runeId: 555, quantity: 1 }], // Water + Air runes
    });

    this.teleportPoints.set('falador', {
      id: 'falador',
      name: 'Falador',
      position: { x: 500, y: 0, z: 300 },
      description: 'Teleport to Falador town center',
      levelRequired: 37,
      runesRequired: [{ runeId: 563, quantity: 3 }, { runeId: 555, quantity: 1 }],
    });
  }

  // Event handlers
  private handleTeleportPlayer(data: { playerId: string, destination: string | { x: number, y: number, z: number } }): void {
    this.teleportPlayer(data.playerId, data.destination);
  }

  private handlePlayerMove(data: { playerId: string, position: { x: number, y: number, z: number } }): void {
    this.playerLocations.set(data.playerId, {
      playerId: data.playerId,
      position: data.position,
      region: this.getRegionAtPosition(data.position),
      lastUpdate: Date.now(),
    });
  }

  private handleEnterArea(data: { playerId: string, areaId: string }): void {
    logger.info(`[WorldSystem] Player ${data.playerId} entered area: ${data.areaId}`);
  }

  private handleLeaveArea(data: { playerId: string, areaId: string }): void {
    logger.info(`[WorldSystem] Player ${data.playerId} left area: ${data.areaId}`);
  }

  private async handleGenerateAsset(data: { description: string, assetType: AssetType }): Promise<void> {
    await this.generateVRMAsset(data.description, data.assetType);
  }

  private handleLoadWorldObject(data: { objectType: string, position: { x: number, y: number, z: number }, region?: string }): void {
    // Load and place world object at position
    this.spawnWorldObject(data.objectType, data.position, data.region);
    logger.info(`[WorldSystem] Loading world object ${data.objectType} at position ${data.position.x},${data.position.y},${data.position.z}`);
  }

  // Getters for external systems
  getRegions(): Map<string, WorldRegion> {
    return new Map(this.regions);
  }

  getCities(): Map<string, City> {
    return new Map(this.cities);
  }

  getDungeons(): Map<string, Dungeon> {
    return new Map(this.dungeons);
  }

  getLandmarks(): Map<string, Landmark> {
    return new Map(this.landmarks);
  }

  getVRMAssets(): Map<string, VRMAsset> {
    return new Map(this.vrmAssets);
  }

  getPlayerLocation(playerId: string): PlayerLocation | null {
    return this.playerLocations.get(playerId) || null;
  }

  getTeleportPoints(): Map<string, TeleportPoint> {
    return new Map(this.teleportPoints);
  }

  /**
   * Spawn a world object at a position
   */
  spawnWorldObject(objectType: string, position: { x: number, y: number, z: number }, region?: string): string | null {
    const objectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const worldObject: WorldObject = {
      id: objectId,
      name: objectType,
      type: this.getObjectType(objectType),
      position,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      dynamic: false,
    };

    this.activeObjects.set(objectId, worldObject);

    this.world.events.emit('rpg:world_object_spawned', {
      objectId,
      objectType,
      position,
      region: region || this.getRegionAtPosition(position)
    });

    return objectId;
  }

  /**
   * Get a world object by ID
   */
  getWorldObject(objectId: string): WorldObject | null {
    return this.activeObjects.get(objectId) || null;
  }

  /**
   * Remove a world object
   */
  removeWorldObject(objectId: string): boolean {
    const worldObject = this.activeObjects.get(objectId);
    if (!worldObject) {
      return false;
    }

    this.activeObjects.delete(objectId);

    this.world.events.emit('rpg:world_object_removed', {
      objectId,
      position: worldObject.position
    });

    return true;
  }

  /**
   * Get world objects in an area
   */
  getWorldObjectsInArea(region: string, radius: number = 100): WorldObject[] {
    const regionData = this.regions.get(region);
    if (!regionData) {
      return [];
    }

    const objects = Array.from(this.activeObjects.values());
    return objects.filter(obj => {
      const distance = Math.sqrt(
        Math.pow(obj.position.x - regionData.position.x, 2) +
        Math.pow(obj.position.z - regionData.position.z, 2)
      );
      return distance <= radius;
    });
  }

  /**
   * Check if a player can teleport to a destination
   */
  canTeleportTo(destination: string): { canTeleport: boolean; reason?: string } {
    const teleportPoint = this.teleportPoints.get(destination);
    if (teleportPoint) {
      return { canTeleport: true };
    }

    const city = this.cities.get(destination);
    if (city) {
      return { canTeleport: true };
    }

    const landmark = this.landmarks.get(destination);
    if (landmark && landmark.accessible) {
      return { canTeleport: true };
    }

    return { canTeleport: false, reason: `Destination '${destination}' not found or not accessible` };
  }

  /**
   * Check if a player can enter an area
   */
  canEnterArea(playerId: string, areaId: string): { canEnter: boolean; reason?: string } {
    const dungeon = this.dungeons.get(areaId);
    if (dungeon) {
      if (dungeon.questRequired) {
        // TODO: Check if player has completed required quest
        return { canEnter: false, reason: `Quest '${dungeon.questRequired}' required to enter ${dungeon.name}` };
      }
      return { canEnter: true };
    }

    const region = this.regions.get(areaId);
    if (region) {
      return { canEnter: true };
    }

    const city = this.cities.get(areaId);
    if (city) {
      return { canEnter: true };
    }

    return { canEnter: false, reason: `Area '${areaId}' not found` };
  }

  /**
   * Helper method to determine object type
   */
  private getObjectType(objectType: string): 'building' | 'decoration' | 'functional' | 'interactive' {
    if (['tree', 'rock', 'flower', 'grass'].includes(objectType)) {
      return 'decoration';
    }
    if (['chest', 'door', 'lever', 'button'].includes(objectType)) {
      return 'interactive';
    }
    if (['anvil', 'furnace', 'bank', 'altar'].includes(objectType)) {
      return 'functional';
    }
    return 'building';
  }

  /**
   * Helper method to get region at position
   */
  private getRegionAtPosition(position: { x: number, y: number, z: number }): string {
    // First try to find a city that contains this position
    for (const [cityId, city] of this.cities.entries()) {
      if (position.x >= city.bounds.minX && position.x <= city.bounds.maxX &&
          position.z >= city.bounds.minZ && position.z <= city.bounds.maxZ) {
        return cityId;
      }
    }
    
    // Fall back to region lookup
    for (const [regionId, region] of this.regions.entries()) {
      if (position.x >= region.bounds.minX && position.x <= region.bounds.maxX &&
          position.z >= region.bounds.minZ && position.z <= region.bounds.maxZ) {
        // Return city name if this region contains cities, otherwise region ID
        if (region.cities.length > 0) {
          return region.cities[0]; // Return first city in region
        }
        return regionId;
      }
    }
    return 'unknown';
  }
}

// Type definitions
interface WorldRegion {
  id: string;
  name: string;
  description: string;
  type: 'overworld' | 'underground' | 'island' | 'wilderness' | 'instanced';
  position: { x: number, y: number, z: number };
  bounds: Bounds;
  level: number;
  climate: 'temperate' | 'cold' | 'hot' | 'tropical' | 'desert' | 'harsh';
  terrain: 'grassland' | 'forest' | 'desert' | 'mountains' | 'swamp' | 'urban' | 'riverside' | 'hills' | 'wasteland';
  cities: string[];
  dungeons: string[];
  landmarks: string[];
  questAreas: string[];
  vrmAssetIds: string[];
}

interface City {
  id: string;
  name: string;
  type: 'city' | 'town' | 'village' | 'outpost';
  description: string;
  position: { x: number, y: number, z: number };
  bounds: Bounds;
  safeZone: boolean;
  level: number;
  questHub: boolean;
  facilities: string[];
  npcs: string[];
  monsters: string[];
  resources: string[];
  vrmAssetIds: string[];
}

interface Dungeon {
  id: string;
  name: string;
  description: string;
  type: 'cave' | 'sewer' | 'dungeon' | 'tower' | 'volcano' | 'underwater' | 'instanced';
  position: { x: number, y: number, z: number };
  bounds: Bounds;
  entryLevel: number;
  maxLevel: number;
  floors: number;
  safeZone: boolean;
  entryPoints: DungeonEntrance[];
  monsters: string[];
  bosses: string[];
  resources: string[];
  treasures: string[];
  vrmAssetIds: string[];
  questRequired: string | null;
}

interface Landmark {
  id: string;
  name: string;
  description: string;
  type: 'castle' | 'tower' | 'bridge' | 'monument' | 'ruins' | 'marketplace' | 'village' | 'temple';
  position: { x: number, y: number, z: number };
  bounds: Bounds;
  significance: 'major' | 'minor' | 'historic';
  accessible: boolean;
  questLocation: boolean;
  relatedQuests: string[];
  npcs: string[];
  facilities: string[];
  vrmAssetIds: string[];
}

interface TeleportPoint {
  id: string;
  name: string;
  position: { x: number, y: number, z: number };
  description: string;
  levelRequired: number;
  runesRequired: { runeId: number, quantity: number }[];
}

interface VRMAsset {
  id: string;
  name: string;
  description: string;
  assetType: AssetType;
  fileUrl: string;
  thumbnailUrl: string;
  fileSize: number;
  format: 'vrm' | 'glb' | 'fbx';
  quality: 'low' | 'medium' | 'high';
  metadata: {
    polygonCount: number;
    textureResolution: string;
    animations: string[];
    tags: string[];
  };
  generatedAt: number;
  status: 'generating' | 'ready' | 'failed';
}

interface CachedAsset {
  asset: VRMAsset | WorldObject;
  timestamp: number;
  size: number;
}

interface WorldObject {
  id: string;
  name: string;
  type: 'building' | 'decoration' | 'functional' | 'interactive';
  position: { x: number, y: number, z: number };
  rotation: { x: number, y: number, z: number };
  scale: { x: number, y: number, z: number };
  vrmAssetId?: string;
  dynamic: boolean;
  behavior?: {
    type: 'rotate' | 'move' | 'animate';
    parameters: Record<string, any>;
  };
}

interface PlayerLocation {
  playerId: string;
  position: { x: number, y: number, z: number };
  region: string;
  lastUpdate: number;
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

interface DungeonEntrance {
  x: number;
  y: number;
  z: number;
  description: string;
}

type AssetType = 'building' | 'character' | 'environment' | 'item' | 'dungeon' | 'landmark';