import { System } from '../../core/systems/System';
import type { World } from '../../types';
import {
  RPGEntity,
  StatsComponent,
  InventoryComponent,
  ItemStack,
  CombatComponent,
  MovementComponent,
  DeathComponent,
  Vector3,
  GravestoneTier,
  PlayerEntity
} from '../types';

interface Gravestone {
  id: string;
  ownerId: string;
  position: Vector3;
  items: ItemStack[];
  createdAt: number;
  expiresAt: number;
  tier: GravestoneTier;
  model?: string;
  isBlessed: boolean;
}

interface RespawnPoint {
  id: string;
  name: string;
  position: Vector3;
  isDefault?: boolean;
  requirements?: {
    questId?: string;
    skillLevel?: { skill: string; level: number };
  };
}

interface SafeZone {
  id: string;
  name: string;
  bounds: {
    min: Vector3;
    max: Vector3;
  };
  allowPvP: boolean;
}

interface DeathConfig {
  // Respawn locations
  defaultRespawnPoint: Vector3;
  respawnPoints: Map<string, RespawnPoint>;

  // Item protection
  itemsKeptOnDeath: number; // Default: 3
  protectItemPrayer: boolean;
  skullItemsKept: number; // Default: 0

  // Gravestone settings
  gravestoneEnabled: boolean;
  gravestoneBaseDuration: number; // milliseconds
  gravestoneTierMultipliers: Map<GravestoneTier, number>;

  // Safe zones
  safeZones: SafeZone[];

  // Death costs
  freeReclaimThreshold: number; // GP value
  reclaimFeePercentage: number; // Percentage of item value
}

export class DeathRespawnSystem extends System {
  private gravestones: Map<string, Gravestone> = new Map();
  private deathTimers: Map<string, NodeJS.Timeout> = new Map();
  private gravestoneEntities: Map<string, RPGEntity> = new Map();
  private config: DeathConfig;

  constructor(world: World) {
    super(world);

    // Initialize configuration
    this.config = {
      defaultRespawnPoint: { x: 3200, y: 0, z: 3200 }, // Lumbridge
      respawnPoints: new Map([
        ['lumbridge', {
          id: 'lumbridge',
          name: 'Lumbridge',
          position: { x: 3200, y: 0, z: 3200 },
          isDefault: true
        }],
        ['edgeville', {
          id: 'edgeville',
          name: 'Edgeville',
          position: { x: 3090, y: 0, z: 3490 },
          requirements: { questId: 'death_to_the_dorgeshuun' }
        }],
        ['falador', {
          id: 'falador',
          name: 'Falador',
          position: { x: 2960, y: 0, z: 3380 }
        }],
        ['varrock', {
          id: 'varrock',
          name: 'Varrock',
          position: { x: 3210, y: 0, z: 3424 }
        }],
        ['camelot', {
          id: 'camelot',
          name: 'Camelot',
          position: { x: 2757, y: 0, z: 3477 },
          requirements: { questId: 'king_arthurs_realm' }
        }]
      ]),
      itemsKeptOnDeath: 3,
      protectItemPrayer: true,
      skullItemsKept: 0,
      gravestoneEnabled: true,
      gravestoneBaseDuration: 5 * 60 * 1000, // 5 minutes
      gravestoneTierMultipliers: new Map([
        [GravestoneTier.WOODEN, 1],
        [GravestoneTier.STONE, 2],
        [GravestoneTier.ORNATE, 3],
        [GravestoneTier.ANGEL, 4],
        [GravestoneTier.MYSTIC, 6]
      ]),
      safeZones: [
        {
          id: 'lumbridge',
          name: 'Lumbridge',
          bounds: {
            min: { x: 3150, y: 0, z: 3150 },
            max: { x: 3250, y: 100, z: 3250 }
          },
          allowPvP: false
        },
        {
          id: 'edgeville_bank',
          name: 'Edgeville Bank',
          bounds: {
            min: { x: 3090, y: 0, z: 3488 },
            max: { x: 3098, y: 10, z: 3499 }
          },
          allowPvP: false
        }
      ],
      freeReclaimThreshold: 100000, // 100k GP
      reclaimFeePercentage: 5 // 5% of item value
    };
  }

  /**
   * Initialize the system
   */
  override async init(_options: any): Promise<void> {
    console.log('[DeathRespawnSystem] Initializing...');

    // Listen for death events
    this.world.events.on('entity:death', this.handleDeath.bind(this));

    // Listen for respawn requests
    this.world.events.on('player:respawn', this.handleRespawnRequest.bind(this));

    // Listen for gravestone interactions
    this.world.events.on('gravestone:interact', this.handleGravestoneInteraction.bind(this));

    // Listen for gravestone blessing
    this.world.events.on('gravestone:bless', this.handleGravestoneBless.bind(this));
  }

  /**
   * Handle entity death
   */
  private handleDeath(event: { entityId: string; killerId?: string }): void {
    const entity = this.world.entities.get(event.entityId);
    if (!entity) {return;}

    // Handle based on entity type
    if (entity.type === 'player') {
      this.handlePlayerDeath(entity as PlayerEntity, event.killerId);
    } else if (entity.type === 'npc') {
      this.handleNPCDeath(entity, event.killerId);
    }
  }

  /**
   * Handle player death
   */
  private handlePlayerDeath(player: PlayerEntity, killerId?: string): void {
    const inventory = player.getComponent<InventoryComponent>('inventory');
    const movement = player.getComponent<MovementComponent>('movement');
    const combat = player.getComponent<CombatComponent>('combat');
    const stats = player.getComponent<StatsComponent>('stats');

    if (!inventory || !movement || !stats) {return;}

    const position = movement.position;

    // Create or update death component
    let death = player.getComponent<DeathComponent>('death');
    if (!death) {
      death = {
        type: 'death',
        isDead: true,
        deathTime: Date.now(),
        deathLocation: { ...position },
        killer: killerId || null,
        gravestoneId: null,
        gravestoneTimer: 0,
        respawnPoint: null,
        respawnTimer: 5000, // 5 seconds
        itemsKeptOnDeath: [],
        itemsLostOnDeath: [],
        deathCount: 1,
        lastDeathTime: Date.now()
      } as unknown as DeathComponent;
      player.addComponent('death', death);
    } else {
      death.isDead = true;
      death.deathTime = Date.now();
      death.deathLocation = { ...position };
      death.killer = killerId || null;
      death.deathCount++;
      death.lastDeathTime = Date.now();
    }

    // Check if in safe zone
    if (this.isInSafeZone(position)) {
      // Safe death - keep all items
      death.itemsKeptOnDeath = [...inventory.items.filter(item => item !== null)] as ItemStack[];
      death.itemsLostOnDeath = [];
    } else {
      // Calculate kept and lost items
      const isSkull = (player as any).skullTimer && (player as any).skullTimer > 0;
      const protectItem = false; // TODO: Add protect item prayer

      let itemsToKeep = isSkull ? this.config.skullItemsKept : this.config.itemsKeptOnDeath;
      if (protectItem && this.config.protectItemPrayer) {
        itemsToKeep += 1;
      }

      const { kept, lost } = this.calculateItemsKeptOnDeath(inventory, itemsToKeep);
      death.itemsKeptOnDeath = kept;
      death.itemsLostOnDeath = lost;

      // Create gravestone if items were lost
      if (lost.length > 0 && this.config.gravestoneEnabled) {
        const gravestone = this.createGravestone(player, lost, position);
        death.gravestoneId = gravestone.id;
      }
    }

    // Clear inventory except kept items
    inventory.items = new Array(28).fill(null);
    death.itemsKeptOnDeath.forEach((item, index) => {
      if (index < inventory.items.length) {
        inventory.items[index] = item;
      }
    });

    // Clear equipment
    inventory.equipment = {
      head: null,
      cape: null,
      amulet: null,
      weapon: null,
      body: null,
      shield: null,
      legs: null,
      gloves: null,
      boots: null,
      ring: null,
      ammo: null
    };

    // Reset combat
    if (combat) {
      combat.inCombat = false;
      combat.target = null;
    }

    // Reset skull timer on player
    if ((player as any).skullTimer) {
      (player as any).skullTimer = 0;
    }

    // Emit death event
    this.world.events.emit('player:died', {
      playerId: player.id,
      killerId,
      position,
      keptItems: death.itemsKeptOnDeath,
      lostItems: death.itemsLostOnDeath,
      gravestoneId: death.gravestoneId
    });

    // Schedule auto-respawn
    const timerId = setTimeout(() => {
      this.respawn(player);
    }, death.respawnTimer);

    this.deathTimers.set(player.id, timerId);
  }

  /**
   * Handle NPC death
   */
  private handleNPCDeath(npc: RPGEntity, killerId?: string): void {
    // NPCs don't have gravestones, just emit event for loot system
    this.world.events.emit('npc:died', {
      npcId: npc.id,
      killerId,
      position: npc.position
    });
  }

  /**
   * Calculate items kept on death
   */
  private calculateItemsKeptOnDeath(inventory: InventoryComponent, itemsToKeep: number): {
    kept: ItemStack[];
    lost: ItemStack[];
  } {
    const allItems: ItemStack[] = [];

    // Collect all items from inventory and equipment
    for (const item of inventory.items) {
      if (item) {allItems.push({ ...item });}
    }

    for (const slot of Object.values(inventory.equipment)) {
      if (slot) {allItems.push({ itemId: slot.id, quantity: 1 });}
    }

    // Sort by value (descending)
    const sortedItems = allItems.sort((a, b) => {
      const valueA = this.getItemValue(a.itemId) * a.quantity;
      const valueB = this.getItemValue(b.itemId) * b.quantity;
      return valueB - valueA;
    });

    const kept: ItemStack[] = [];
    const lost: ItemStack[] = [];
    let keptCount = 0;

    for (const item of sortedItems) {
      if (keptCount < itemsToKeep) {
        const toKeep = Math.min(item.quantity, itemsToKeep - keptCount);
        kept.push({ itemId: item.itemId, quantity: toKeep });
        keptCount += toKeep;

        if (item.quantity > toKeep) {
          lost.push({ itemId: item.itemId, quantity: item.quantity - toKeep });
        }
      } else {
        lost.push(item);
      }
    }

    return { kept, lost };
  }

  /**
   * Create gravestone
   */
  private createGravestone(player: PlayerEntity, items: ItemStack[], position: Vector3): Gravestone {
    const tier = this.getPlayerGravestoneTier(player);
    const multiplier = this.config.gravestoneTierMultipliers.get(tier) || 1;
    const duration = this.config.gravestoneBaseDuration * multiplier;

    const gravestone: Gravestone = {
      id: `gravestone_${player.id}_${Date.now()}`,
      ownerId: player.id,
      position: { ...position },
      items,
      createdAt: Date.now(),
      expiresAt: Date.now() + duration,
      tier,
      model: this.getGravestoneModel(tier),
      isBlessed: false
    };

    this.gravestones.set(gravestone.id, gravestone);

    // Create gravestone entity in world
    const gravestoneEntity = {
      id: gravestone.id,
      type: 'gravestone',
      position: { ...position },
      components: new Map(),
      getComponent(type: string) {
        return this.components.get(type) || null;
      },
      hasComponent(type: string) {
        return this.components.has(type);
      },
      addComponent(type: string, component: any) {
        this.components.set(type, component);
      }
    } as RPGEntity;

    // Add visual component
    gravestoneEntity.addComponent('visual', {
      type: 'visual',
      model: gravestone.model || 'gravestone_wooden',
      scale: 1
    });

    // Add interaction component
    gravestoneEntity.addComponent('interaction', {
      type: 'interaction',
      interactType: 'gravestone',
      ownerId: player.id,
      data: gravestone
    });

    // Add to world
    (this.world as any).entities?.items?.set(gravestone.id, gravestoneEntity) ||
    ((this.world as any).entities = new Map()).set(gravestone.id, gravestoneEntity);

    this.gravestoneEntities.set(gravestone.id, gravestoneEntity);

    // Schedule expiration
    setTimeout(() => {
      this.expireGravestone(gravestone.id);
    }, duration);

    return gravestone;
  }

  /**
   * Respawn player
   */
  private respawn(player: PlayerEntity, respawnPoint?: string): void {
    const death = player.getComponent<DeathComponent>('death');
    const stats = player.getComponent<StatsComponent>('stats');
    const movement = player.getComponent<MovementComponent>('movement');

    if (!death || !stats || !movement) {return;}

    // Clear death timer
    const timerId = this.deathTimers.get(player.id);
    if (timerId) {
      clearTimeout(timerId);
      this.deathTimers.delete(player.id);
    }

    // Get respawn location
    const location = this.getRespawnLocation(player, respawnPoint);

    // Restore health and prayer
    stats.hitpoints.current = stats.hitpoints.max;
    stats.prayer.points = Math.floor(stats.prayer.maxPoints * 0.5); // 50% prayer

    // Reset death state
    death.isDead = false;
    death.respawnTimer = 5000;

    // Teleport to respawn
    movement.position = { ...location };
    movement.teleportDestination = { ...location };
    movement.teleportTime = Date.now();
    movement.teleportAnimation = 'respawn';

    // Emit respawn event
    this.world.events.emit('player:respawned', {
      playerId: player.id,
      position: location,
      gravestoneId: death.gravestoneId
    });
  }

  /**
   * Handle respawn request
   */
  private handleRespawnRequest(event: { playerId: string; respawnPoint?: string }): void {
    const player = this.world.entities.get(event.playerId) as PlayerEntity;
    if (!player) {return;}

    const death = player.getComponent<DeathComponent>('death');
    if (!death || !death.isDead) {return;}

    this.respawn(player, event.respawnPoint);
  }

  /**
   * Get respawn location
   */
  private getRespawnLocation(player: PlayerEntity, customPoint?: string): Vector3 {
    // Check for custom respawn point
    if (customPoint) {
      const point = this.config.respawnPoints.get(customPoint);
      if (point && this.canUseRespawnPoint(player, point)) {
        return { ...point.position };
      }
    }

    // Check for saved respawn point
    const death = player.getComponent<DeathComponent>('death');
    if (death?.respawnPoint) {
      const point = this.config.respawnPoints.get(death.respawnPoint);
      if (point && this.canUseRespawnPoint(player, point)) {
        return { ...point.position };
      }
    }

    // Default respawn
    return { ...this.config.defaultRespawnPoint };
  }

  /**
   * Check if player can use respawn point
   */
  private canUseRespawnPoint(player: PlayerEntity, point: RespawnPoint): boolean {
    if (!point.requirements) {return true;}

    // Check quest requirement
    if (point.requirements.questId) {
      // TODO: Check quest completion
      return false;
    }

    // Check skill requirement
    if (point.requirements.skillLevel) {
      const stats = player.getComponent<StatsComponent>('stats');
      if (!stats) {return false;}

      const skill = (stats as any)[point.requirements.skillLevel.skill];
      if (skill && skill.level >= point.requirements.skillLevel.level) {
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * Handle gravestone interaction
   */
  private handleGravestoneInteraction(event: { playerId: string; gravestoneId: string }): void {
    const gravestone = this.gravestones.get(event.gravestoneId);
    if (!gravestone) {return;}

    const player = this.world.entities.get(event.playerId) as PlayerEntity;
    if (!player) {return;}

    // Check ownership
    if (gravestone.ownerId !== event.playerId) {
      // Check if gravestone is expired
      if (Date.now() < gravestone.expiresAt) {
        this.sendMessage(event.playerId, 'This is not your gravestone.');
        return;
      }
    }

    // Calculate reclaim fee
    const totalValue = this.calculateGravestoneValue(gravestone);
    const fee = totalValue > this.config.freeReclaimThreshold ?
      Math.floor(totalValue * this.config.reclaimFeePercentage / 100) : 0;

    // Show options
    this.world.events.emit('gravestone:options', {
      playerId: event.playerId,
      gravestoneId: event.gravestoneId,
      items: gravestone.items,
      fee,
      isOwner: gravestone.ownerId === event.playerId
    });
  }

  /**
   * Reclaim items from gravestone
   */
  public reclaimItems(playerId: string, gravestoneId: string, payFee: boolean = true): boolean {
    const gravestone = this.gravestones.get(gravestoneId);
    const player = this.world.entities.get(playerId) as PlayerEntity;

    if (!gravestone || !player) {return false;}

    // Check ownership
    if (gravestone.ownerId !== playerId && Date.now() < gravestone.expiresAt) {
      return false;
    }

    // Calculate and check fee
    if (payFee && gravestone.ownerId === playerId) {
      const totalValue = this.calculateGravestoneValue(gravestone);
      const fee = totalValue > this.config.freeReclaimThreshold ?
        Math.floor(totalValue * this.config.reclaimFeePercentage / 100) : 0;

      if (fee > 0) {
        const inventory = player.getComponent<InventoryComponent>('inventory');
        if (!inventory) {return false;}

        // Check if player has enough gold
        const goldAmount = this.getPlayerGold(inventory);
        if (goldAmount < fee) {
          this.sendMessage(playerId, `You need ${fee} coins to reclaim your items.`);
          return false;
        }

        // Remove gold
        if (!this.removePlayerGold(player, fee)) {
          return false;
        }
      }
    }

    // Transfer items
    const inventorySystem = this.world.getSystem<any>('inventory');
    if (!inventorySystem) {return false;}

    for (const item of gravestone.items) {
      inventorySystem.addItem(playerId, item.itemId, item.quantity);
    }

    // Remove gravestone
    this.removeGravestone(gravestoneId);

    // Update death component
    const death = player.getComponent<DeathComponent>('death');
    if (death) {
      death.gravestoneId = null;
    }

    this.sendMessage(playerId, 'You have reclaimed your items.');

    return true;
  }

  /**
   * Handle gravestone blessing
   */
  private handleGravestoneBless(event: { playerId: string; gravestoneId: string }): void {
    const gravestone = this.gravestones.get(event.gravestoneId);
    if (!gravestone || gravestone.isBlessed) {return;}

    // Extend timer by 1 hour
    gravestone.expiresAt += 60 * 60 * 1000;
    gravestone.isBlessed = true;

    // Update visual
    const entity = this.gravestoneEntities.get(event.gravestoneId);
    if (entity) {
      const visual = entity.getComponent<any>('visual');
      if (visual) {
        visual.effect = 'blessed';
      }
    }

    this.sendMessage(event.playerId, 'The gravestone has been blessed and will last longer.');
  }

  /**
   * Expire gravestone
   */
  private expireGravestone(gravestoneId: string): void {
    const gravestone = this.gravestones.get(gravestoneId);
    if (!gravestone) {return;}

    // Drop items on ground
    const lootSystem = this.world.getSystem<any>('loot');
    if (lootSystem && gravestone.items.length > 0) {
      lootSystem.createLootPile(gravestone.position, gravestone.items, null);
    }

    // Remove gravestone
    this.removeGravestone(gravestoneId);
  }

  /**
   * Remove gravestone
   */
  private removeGravestone(gravestoneId: string): void {
    this.gravestones.delete(gravestoneId);

    const entity = this.gravestoneEntities.get(gravestoneId);
    if (entity) {
      (this.world as any).entities?.items?.delete(gravestoneId);
      this.gravestoneEntities.delete(gravestoneId);
    }
  }

  /**
   * Check if position is in safe zone
   */
  private isInSafeZone(position: Vector3): boolean {
    for (const zone of this.config.safeZones) {
      if (position.x >= zone.bounds.min.x && position.x <= zone.bounds.max.x &&
          position.y >= zone.bounds.min.y && position.y <= zone.bounds.max.y &&
          position.z >= zone.bounds.min.z && position.z <= zone.bounds.max.z) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get player gravestone tier
   */
  private getPlayerGravestoneTier(player: PlayerEntity): GravestoneTier {
    // TODO: Check player's unlocked gravestone tier
    // For now, return wooden
    return GravestoneTier.WOODEN;
  }

  /**
   * Get gravestone model
   */
  private getGravestoneModel(tier: GravestoneTier): string {
    const models: Record<GravestoneTier, string> = {
      [GravestoneTier.WOODEN]: 'gravestone_wooden',
      [GravestoneTier.STONE]: 'gravestone_stone',
      [GravestoneTier.ORNATE]: 'gravestone_ornate',
      [GravestoneTier.ANGEL]: 'gravestone_angel',
      [GravestoneTier.MYSTIC]: 'gravestone_mystic'
    };
    return models[tier];
  }

  /**
   * Calculate gravestone value
   */
  private calculateGravestoneValue(gravestone: Gravestone): number {
    let total = 0;
    for (const item of gravestone.items) {
      total += this.getItemValue(item.itemId) * item.quantity;
    }
    return total;
  }

  /**
   * Get item value
   */
  private getItemValue(itemId: number): number {
    // Try to get from InventorySystem's item registry
    const inventorySystem = this.world.getSystem<any>('inventory');
    if (inventorySystem && inventorySystem.itemRegistry) {
      const item = inventorySystem.itemRegistry.getItem(itemId);
      if (item) {
        return item.value;
      }
    }

    // Fallback for unknown items
    return 1;
  }

  /**
   * Get player gold amount
   */
  private getPlayerGold(inventory: InventoryComponent): number {
    let total = 0;
    for (const item of inventory.items) {
      if (item && item.itemId === 995) { // Coins
        total += item.quantity;
      }
    }
    return total;
  }

  /**
   * Remove gold from player
   */
  private removePlayerGold(player: PlayerEntity, amount: number): boolean {
    const inventorySystem = this.world.getSystem<any>('inventory');
    if (!inventorySystem) {return false;}

    return inventorySystem.removeItem(player.id, 995, amount);
  }

  /**
   * Send message to player
   */
  private sendMessage(playerId: string, message: string): void {
    this.world.events.emit('chat:message', {
      playerId,
      message,
      type: 'system'
    });
  }

  /**
   * Update system
   */
  update(_delta: number): void {
    // Check for expired gravestones
    const now = Date.now();
    for (const [id, gravestone] of this.gravestones) {
      if (now >= gravestone.expiresAt) {
        this.expireGravestone(id);
      }
    }
  }
}
