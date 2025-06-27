/**
 * RuneScape Mining System Implementation
 * =====================================
 * Handles mining mechanics, ore collection, and rock respawning
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';
import type { StatsComponent } from '../types/stats';
import type { InventoryComponent } from '../types/inventory';
import type {
  MiningRock,
  MiningNode,
  GatheringAction,
  ResourceNode,
  Tool
} from '../types/gathering';
import { GATHERING_CONSTANTS } from '../types/gathering';

export class MiningSystem implements HyperfySystem {
  name = 'MiningSystem';
  world: HyperfyWorld;
  enabled = true;

  // Mining data
  private miningRocks: Map<string, MiningRock> = new Map();
  private miningNodes: Map<string, MiningNode> = new Map();
  private activeActions: Map<string, GatheringAction> = new Map();
  private pickaxes: Map<number, Tool> = new Map();

  // Tick tracking
  private tickCounter = 0;
  private lastTickTime = 0;

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.initializeMiningData();
    logger.info('[MiningSystem] Initialized RuneScape mining mechanics');
  }

  async init(): Promise<void> {
    logger.info('[MiningSystem] Starting mining system...');
    
    // Subscribe to mining events
    this.world.events.on('rpg:start_mining', this.handleStartMining.bind(this));
    this.world.events.on('rpg:stop_mining', this.handleStopMining.bind(this));
    this.world.events.on('rpg:mine_rock', this.handleMineRock.bind(this));
    
    // Create initial mining nodes in the world
    this.spawnMiningNodes();
  }

  tick(delta: number): void {
    const now = Date.now();
    
    // Process mining ticks (every 600ms like RuneScape)
    if (now - this.lastTickTime >= 600) {
      this.processMiningTick();
      this.lastTickTime = now;
      this.tickCounter++;
    }
    
    // Update mining actions
    this.updateMiningActions(delta);
    
    // Check for rock respawns
    this.checkRockRespawns(now);
  }

  destroy(): void {
    this.world.events.off('rpg:start_mining');
    this.world.events.off('rpg:stop_mining');
    this.world.events.off('rpg:mine_rock');
    logger.info('[MiningSystem] Mining system destroyed');
  }

  /**
   * Start mining a rock
   */
  startMining(playerId: string, rockNodeId: string): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[MiningSystem] Player ${playerId} not found`);
      return false;
    }

    const node = this.miningNodes.get(rockNodeId);
    if (!node) {
      logger.warn(`[MiningSystem] Mining node ${rockNodeId} not found`);
      return false;
    }

    if (node.depleted) {
      logger.info(`[MiningSystem] Rock ${rockNodeId} is depleted`);
      return false;
    }

    const rock = this.miningRocks.get(node.rockId);
    if (!rock) {
      logger.warn(`[MiningSystem] Rock definition ${node.rockId} not found`);
      return false;
    }

    // Check mining level requirement
    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.mining.level < rock.level) {
      logger.info(`[MiningSystem] Player ${playerId} needs mining level ${rock.level}`);
      return false;
    }

    // Check if player already mining
    if (this.activeActions.has(playerId)) {
      this.stopMining(playerId);
    }

    // Get player's pickaxe
    const pickaxe = this.getPlayerPickaxe(playerId);
    
    // Calculate mining duration
    const baseDuration = this.calculateMiningDuration(stats.mining.level, rock, pickaxe);
    
    // Create mining action
    const action: GatheringAction = {
      playerId,
      skill: 'mining',
      nodeId: rockNodeId,
      tool: pickaxe,
      startTime: Date.now(),
      duration: baseDuration,
      attempts: 0,
      itemsGained: [],
      xpGained: 0,
      successRate: this.calculateSuccessRate(stats.mining.level, rock, pickaxe),
      lastAttempt: 0,
    };

    this.activeActions.set(playerId, action);

    // Add player to node's active harvesters
    if (!node.activeHarvesters) {
      (node as any).activeHarvesters = [];
    }
    (node as any).activeHarvesters.push(playerId);

    logger.info(`[MiningSystem] ${playerId} started mining ${rock.name} (${(baseDuration/1000).toFixed(1)}s per attempt)`);

    // Emit mining started event
    this.world.events.emit('rpg:mining_started', {
      playerId,
      rockId: rock.id,
      nodeId: rockNodeId,
      successRate: action.successRate,
    });

    return true;
  }

  /**
   * Stop mining
   */
  stopMining(playerId: string): boolean {
    const action = this.activeActions.get(playerId);
    if (!action) {
      return false;
    }

    // Remove from active actions
    this.activeActions.delete(playerId);

    // Remove from node's active harvesters
    const node = this.miningNodes.get(action.nodeId);
    if (node && (node as any).activeHarvesters) {
      const harvesters = (node as any).activeHarvesters as string[];
      const index = harvesters.indexOf(playerId);
      if (index > -1) {
        harvesters.splice(index, 1);
      }
    }

    logger.info(`[MiningSystem] ${playerId} stopped mining`);

    // Emit mining stopped event
    this.world.events.emit('rpg:mining_stopped', {
      playerId,
      totalXP: action.xpGained,
      totalItems: action.itemsGained.length,
    });

    return true;
  }

  /**
   * Process a mining attempt
   */
  private processMiningAttempt(action: GatheringAction): void {
    const node = this.miningNodes.get(action.nodeId);
    const rock = this.miningRocks.get(node?.rockId || '');
    
    if (!node || !rock || node.depleted) {
      this.stopMining(action.playerId);
      return;
    }

    action.attempts++;

    // Check for success
    const success = Math.random() < action.successRate;
    
    if (success) {
      // Grant ore
      this.grantOre(action.playerId, rock);
      
      // Grant XP
      this.grantMiningXP(action.playerId, rock.xp);
      action.xpGained += rock.xp;
      
      // Track items gained
      action.itemsGained.push({ itemId: rock.oreId, quantity: 1 });

      // Check if rock should deplete
      if (this.shouldRockDeplete(rock, action.attempts)) {
        this.depleteRock(node, rock);
      }

      logger.info(`[MiningSystem] ${action.playerId} mined ${rock.name} (${action.attempts} attempts)`);

      // Emit mining success event
      this.world.events.emit('rpg:mining_success', {
        playerId: action.playerId,
        rockId: rock.id,
        oreId: rock.oreId,
        xpGained: rock.xp,
      });
    }

    action.lastAttempt = Date.now();
  }

  /**
   * Calculate mining duration based on level and equipment
   */
  private calculateMiningDuration(level: number, rock: MiningRock, pickaxe?: Tool): number {
    let baseDuration = GATHERING_CONSTANTS.BASE_MINING_TIME * 600; // Convert ticks to ms
    
    // Level affects mining speed
    const levelBonus = Math.max(0, (level - rock.level) * 0.1);
    baseDuration *= (1 - levelBonus);
    
    // Pickaxe affects mining speed
    if (pickaxe) {
      baseDuration *= (1 / pickaxe.speedMultiplier);
    }
    
    // Add some randomness (±20%)
    const randomFactor = 0.8 + Math.random() * 0.4;
    baseDuration *= randomFactor;
    
    return Math.max(1000, baseDuration); // Minimum 1 second
  }

  /**
   * Calculate success rate for mining
   */
  private calculateSuccessRate(level: number, rock: MiningRock, pickaxe?: Tool): number {
    let successRate = rock.baseSuccessRate;
    
    // Level bonus
    const levelBonus = Math.max(0, (level - rock.level) * GATHERING_CONSTANTS.LEVEL_SUCCESS_BONUS);
    successRate += levelBonus;
    
    // Pickaxe bonus
    if (pickaxe && rock.pickaxeMultiplier) {
      successRate += GATHERING_CONSTANTS.TOOL_SUCCESS_BONUS;
      successRate += pickaxe.successBonus;
    }
    
    return Math.min(0.99, Math.max(0.01, successRate)); // Clamp between 1% and 99%
  }

  /**
   * Check if rock should deplete after mining
   */
  private shouldRockDeplete(rock: MiningRock, attempts: number): boolean {
    // Different depletion logic for different rocks
    switch (rock.id) {
      case 'copper':
      case 'tin':
        return Math.random() < 0.33; // 33% chance per successful mine
      case 'iron':
        return Math.random() < 0.5; // 50% chance
      case 'coal':
        return Math.random() < 0.75; // 75% chance
      case 'mithril':
      case 'adamant':
      case 'runite':
        return true; // Always deplete on success
      default:
        return Math.random() < 0.5;
    }
  }

  /**
   * Deplete a rock and set respawn timer
   */
  private depleteRock(node: MiningNode, rock: MiningRock): void {
    node.depleted = true;
    node.lastMined = Date.now();
    node.respawnAt = Date.now() + (rock.respawnTime * 1000);
    
    // Stop all miners on this rock
    const harvesters = (node as any).activeHarvesters as string[] || [];
    harvesters.forEach(playerId => {
      this.stopMining(playerId);
    });
    
    logger.info(`[MiningSystem] Rock ${rock.name} depleted, respawning in ${rock.respawnTime}s`);

    // Emit rock depleted event
    this.world.events.emit('rpg:rock_depleted', {
      nodeId: node.id,
      rockId: rock.id,
      respawnAt: node.respawnAt,
    });
  }

  /**
   * Grant ore to player
   */
  private grantOre(playerId: string, rock: MiningRock): void {
    // Emit event to add item to inventory
    this.world.events.emit('rpg:add_item', {
      playerId,
      itemId: rock.oreId,
      quantity: 1,
      noted: false,
    });
  }

  /**
   * Grant mining XP
   */
  private grantMiningXP(playerId: string, amount: number): void {
    this.world.events.emit('rpg:xp_gain', {
      playerId,
      skill: 'mining',
      amount,
      source: 'mining',
    });
  }

  /**
   * Get player's best pickaxe
   */
  private getPlayerPickaxe(playerId: string): Tool | undefined {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) return undefined;

    // Check equipped weapon first
    if (inventory.equipment.weapon) {
      const weaponId = inventory.equipment.weapon.itemId;
      if (this.pickaxes.has(weaponId)) {
        return this.pickaxes.get(weaponId);
      }
    }

    // Check inventory for pickaxes
    for (const item of inventory.items) {
      if (item && this.pickaxes.has(item.itemId)) {
        return this.pickaxes.get(item.itemId);
      }
    }

    return undefined;
  }

  /**
   * Update active mining actions
   */
  private updateMiningActions(delta: number): void {
    const now = Date.now();
    
    for (const action of this.activeActions.values()) {
      // Check if it's time for next mining attempt
      if (now - action.lastAttempt >= action.duration) {
        this.processMiningAttempt(action);
      }
    }
  }

  /**
   * Check for rock respawns
   */
  private checkRockRespawns(now: number): void {
    for (const node of this.miningNodes.values()) {
      if (node.depleted && now >= node.respawnAt) {
        // Respawn the rock
        node.depleted = false;
        node.lastMined = 0;
        node.respawnAt = 0;
        
        const rock = this.miningRocks.get(node.rockId);
        logger.info(`[MiningSystem] Rock ${rock?.name} respawned at node ${node.id}`);

        // Emit rock respawned event
        this.world.events.emit('rpg:rock_respawned', {
          nodeId: node.id,
          rockId: node.rockId,
        });
      }
    }
  }

  /**
   * Process mining tick
   */
  private processMiningTick(): void {
    // Handle any tick-based mining mechanics
    // Update mining progress, check for special events, etc.
  }

  /**
   * Create mining nodes in the world
   */
  private spawnMiningNodes(): void {
    // Create basic mining nodes for testing
    const basicNodes = [
      { rockId: 'copper', position: { x: 0, y: 0, z: 0 } },
      { rockId: 'tin', position: { x: 5, y: 0, z: 0 } },
      { rockId: 'iron', position: { x: 10, y: 0, z: 0 } },
      { rockId: 'coal', position: { x: 15, y: 0, z: 0 } },
    ];

    basicNodes.forEach((nodeData, index) => {
      const nodeId = `mining_node_${index}`;
      const node: MiningNode = {
        id: nodeId,
        rockId: nodeData.rockId,
        position: nodeData.position,
        depleted: false,
        lastMined: 0,
        respawnAt: 0,
        model: `rock_${nodeData.rockId}`,
        texture: `texture_${nodeData.rockId}`,
      };
      
      this.miningNodes.set(nodeId, node);
      
      // TODO: Create actual 3D entity in Hyperfy world
      // This would involve creating a 3D model and placing it in the world
    });

    logger.info(`[MiningSystem] Spawned ${basicNodes.length} mining nodes`);
  }

  /**
   * Initialize mining data
   */
  private initializeMiningData(): void {
    // Initialize mining rocks
    const rocks: MiningRock[] = [
      {
        id: 'copper',
        name: 'Copper ore',
        oreId: 436, // Copper ore item ID
        level: 1,
        xp: 17.5,
        respawnTime: GATHERING_CONSTANTS.COPPER_RESPAWN,
        rockType: 'normal',
        locations: [],
        baseSuccessRate: 0.5,
        pickaxeMultiplier: true,
      },
      {
        id: 'tin',
        name: 'Tin ore',
        oreId: 438, // Tin ore item ID
        level: 1,
        xp: 17.5,
        respawnTime: GATHERING_CONSTANTS.COPPER_RESPAWN,
        rockType: 'normal',
        locations: [],
        baseSuccessRate: 0.5,
        pickaxeMultiplier: true,
      },
      {
        id: 'iron',
        name: 'Iron ore',
        oreId: 440, // Iron ore item ID
        level: 15,
        xp: 35,
        respawnTime: GATHERING_CONSTANTS.IRON_RESPAWN,
        rockType: 'normal',
        locations: [],
        baseSuccessRate: 0.3,
        pickaxeMultiplier: true,
      },
      {
        id: 'coal',
        name: 'Coal',
        oreId: 453, // Coal item ID
        level: 30,
        xp: 50,
        respawnTime: GATHERING_CONSTANTS.COAL_RESPAWN,
        rockType: 'normal',
        locations: [],
        baseSuccessRate: 0.4,
        pickaxeMultiplier: true,
      },
      {
        id: 'mithril',
        name: 'Mithril ore',
        oreId: 447, // Mithril ore item ID
        level: 55,
        xp: 80,
        respawnTime: GATHERING_CONSTANTS.MITHRIL_RESPAWN,
        rockType: 'normal',
        locations: [],
        baseSuccessRate: 0.2,
        pickaxeMultiplier: true,
      },
      {
        id: 'adamant',
        name: 'Adamantite ore',
        oreId: 449, // Adamantite ore item ID
        level: 70,
        xp: 95,
        respawnTime: GATHERING_CONSTANTS.ADAMANT_RESPAWN,
        rockType: 'normal',
        locations: [],
        baseSuccessRate: 0.15,
        pickaxeMultiplier: true,
      },
      {
        id: 'runite',
        name: 'Runite ore',
        oreId: 451, // Runite ore item ID
        level: 85,
        xp: 125,
        respawnTime: GATHERING_CONSTANTS.RUNITE_RESPAWN,
        rockType: 'normal',
        locations: [],
        baseSuccessRate: 0.1,
        pickaxeMultiplier: true,
      },
    ];

    rocks.forEach(rock => {
      this.miningRocks.set(rock.id, rock);
    });

    // Initialize pickaxes
    const pickaxes: Tool[] = [
      {
        itemId: 1265, // Bronze pickaxe
        name: 'Bronze pickaxe',
        skill: 'mining',
        level: 1,
        speedMultiplier: 1.0,
        successBonus: 0,
      },
      {
        itemId: 1267, // Iron pickaxe
        name: 'Iron pickaxe',
        skill: 'mining',
        level: 1,
        speedMultiplier: 1.1,
        successBonus: 0.05,
      },
      {
        itemId: 1269, // Steel pickaxe
        name: 'Steel pickaxe',
        skill: 'mining',
        level: 6,
        speedMultiplier: 1.2,
        successBonus: 0.1,
      },
      {
        itemId: 1271, // Mithril pickaxe
        name: 'Mithril pickaxe',
        skill: 'mining',
        level: 21,
        speedMultiplier: 1.3,
        successBonus: 0.15,
      },
      {
        itemId: 1273, // Adamant pickaxe
        name: 'Adamant pickaxe',
        skill: 'mining',
        level: 31,
        speedMultiplier: 1.4,
        successBonus: 0.2,
      },
      {
        itemId: 1275, // Rune pickaxe
        name: 'Rune pickaxe',
        skill: 'mining',
        level: 41,
        speedMultiplier: 1.5,
        successBonus: 0.25,
      },
    ];

    pickaxes.forEach(pickaxe => {
      this.pickaxes.set(pickaxe.itemId, pickaxe);
    });

    logger.info(`[MiningSystem] Loaded ${rocks.length} rocks and ${pickaxes.length} pickaxes`);
  }

  // Helper methods
  private getPlayerStats(playerId: string): StatsComponent | null {
    const player = this.world.entities.players.get(playerId);
    return (player?.data as any)?.stats || null;
  }

  private getPlayerInventory(playerId: string): InventoryComponent | null {
    const player = this.world.entities.players.get(playerId);
    return (player?.data as any)?.inventory || null;
  }

  // Event handlers
  private handleStartMining(event: any): void {
    const { playerId, nodeId } = event;
    this.startMining(playerId, nodeId);
  }

  private handleStopMining(event: any): void {
    const { playerId } = event;
    this.stopMining(playerId);
  }

  private handleMineRock(event: any): void {
    const { playerId, rockId } = event;
    // Find nearest rock node of this type
    for (const [nodeId, node] of this.miningNodes.entries()) {
      if (node.rockId === rockId && !node.depleted) {
        this.startMining(playerId, nodeId);
        break;
      }
    }
  }

  // Public API
  getMiningRocks(): Map<string, MiningRock> {
    return new Map(this.miningRocks);
  }

  getMiningNodes(): Map<string, MiningNode> {
    return new Map(this.miningNodes);
  }

  getActiveActions(): Map<string, GatheringAction> {
    return new Map(this.activeActions);
  }

  isPlayerMining(playerId: string): boolean {
    return this.activeActions.has(playerId);
  }
}