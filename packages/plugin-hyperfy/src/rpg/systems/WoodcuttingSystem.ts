/**
 * RuneScape Woodcutting System Implementation
 * ==========================================
 * Handles tree chopping mechanics, log collection, and tree respawning
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';
import type { StatsComponent } from '../types/stats';
import type { InventoryComponent } from '../types/inventory';
import type {
  Tree,
  TreeNode,
  TreeLocation,
  SpecialDrop,
  GatheringAction,
  Tool
} from '../types/gathering';
import { GATHERING_CONSTANTS } from '../types/gathering';

export class WoodcuttingSystem implements HyperfySystem {
  name = 'WoodcuttingSystem';
  world: HyperfyWorld;
  enabled = true;

  // Woodcutting data
  private trees: Map<string, Tree> = new Map();
  private treeNodes: Map<string, TreeNode> = new Map();
  private activeActions: Map<string, GatheringAction> = new Map();
  private axes: Map<number, Tool> = new Map();

  // Tick tracking
  private tickCounter = 0;
  private lastTickTime = 0;

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.initializeWoodcuttingData();
    logger.info('[WoodcuttingSystem] Initialized RuneScape woodcutting mechanics');
  }

  async init(): Promise<void> {
    logger.info('[WoodcuttingSystem] Starting woodcutting system...');
    
    // Subscribe to woodcutting events
    this.world.events.on('rpg:start_woodcutting', this.handleStartWoodcutting.bind(this));
    this.world.events.on('rpg:stop_woodcutting', this.handleStopWoodcutting.bind(this));
    this.world.events.on('rpg:chop_tree', this.handleChopTree.bind(this));
    
    // Create initial tree nodes in the world
    this.spawnTreeNodes();
  }

  tick(delta: number): void {
    const now = Date.now();
    
    // Process woodcutting ticks (every 600ms like RuneScape)
    if (now - this.lastTickTime >= 600) {
      this.processWoodcuttingTick();
      this.lastTickTime = now;
      this.tickCounter++;
    }
    
    // Update woodcutting actions
    this.updateWoodcuttingActions(delta);
    
    // Check for tree regrowth
    this.checkTreeRegrowth(now);
  }

  destroy(): void {
    this.world.events.off('rpg:start_woodcutting');
    this.world.events.off('rpg:stop_woodcutting');
    this.world.events.off('rpg:chop_tree');
    logger.info('[WoodcuttingSystem] Woodcutting system destroyed');
  }

  /**
   * Start chopping a tree
   */
  startWoodcutting(playerId: string, treeNodeId: string): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[WoodcuttingSystem] Player ${playerId} not found`);
      return false;
    }

    const node = this.treeNodes.get(treeNodeId);
    if (!node) {
      logger.warn(`[WoodcuttingSystem] Tree node ${treeNodeId} not found`);
      return false;
    }

    if (node.chopped) {
      logger.info(`[WoodcuttingSystem] Tree ${treeNodeId} is already chopped`);
      return false;
    }

    const tree = this.trees.get(node.treeId);
    if (!tree) {
      logger.warn(`[WoodcuttingSystem] Tree definition ${node.treeId} not found`);
      return false;
    }

    // Check woodcutting level requirement
    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.woodcutting.level < tree.level) {
      logger.info(`[WoodcuttingSystem] Player ${playerId} needs woodcutting level ${tree.level}`);
      return false;
    }

    // Check if player already woodcutting
    if (this.activeActions.has(playerId)) {
      this.stopWoodcutting(playerId);
    }

    // Get player's axe
    const axe = this.getPlayerAxe(playerId);
    if (!axe) {
      logger.info(`[WoodcuttingSystem] Player ${playerId} needs an axe to chop trees`);
      return false;
    }

    // Calculate chopping duration
    const baseDuration = this.calculateChoppingDuration(stats.woodcutting.level, tree, axe);
    
    // Create woodcutting action
    const action: GatheringAction = {
      playerId,
      skill: 'woodcutting',
      nodeId: treeNodeId,
      tool: axe,
      startTime: Date.now(),
      duration: baseDuration,
      attempts: 0,
      itemsGained: [],
      xpGained: 0,
      successRate: this.calculateChopRate(stats.woodcutting.level, tree, axe),
      lastAttempt: 0,
    };

    this.activeActions.set(playerId, action);

    // Add player to node's active choppers
    if (!node.activeChoppers) {
      (node as any).activeChoppers = [];
    }
    (node as any).activeChoppers.push(playerId);

    logger.info(`[WoodcuttingSystem] ${playerId} started chopping ${tree.name} (${(baseDuration/1000).toFixed(1)}s per attempt)`);

    // Emit woodcutting started event
    this.world.events.emit('rpg:woodcutting_started', {
      playerId,
      treeId: tree.id,
      nodeId: treeNodeId,
      chopRate: action.successRate,
    });

    return true;
  }

  /**
   * Stop woodcutting
   */
  stopWoodcutting(playerId: string): boolean {
    const action = this.activeActions.get(playerId);
    if (!action) {
      return false;
    }

    // Remove from active actions
    this.activeActions.delete(playerId);

    // Remove from node's active choppers
    const node = this.treeNodes.get(action.nodeId);
    if (node && (node as any).activeChoppers) {
      const choppers = (node as any).activeChoppers as string[];
      const index = choppers.indexOf(playerId);
      if (index > -1) {
        choppers.splice(index, 1);
      }
    }

    logger.info(`[WoodcuttingSystem] ${playerId} stopped woodcutting`);

    // Emit woodcutting stopped event
    this.world.events.emit('rpg:woodcutting_stopped', {
      playerId,
      totalXP: action.xpGained,
      totalLogs: action.itemsGained.length,
    });

    return true;
  }

  /**
   * Process a woodcutting attempt
   */
  private processWoodcuttingAttempt(action: GatheringAction): void {
    const node = this.treeNodes.get(action.nodeId);
    const tree = this.trees.get(node?.treeId || '');
    
    if (!node || !tree || node.chopped) {
      this.stopWoodcutting(action.playerId);
      return;
    }

    action.attempts++;

    // Check for successful log
    const success = Math.random() < action.successRate;
    
    if (success) {
      // Grant log
      this.grantLog(action.playerId, tree);
      
      // Grant XP
      this.grantWoodcuttingXP(action.playerId, tree.xp);
      action.xpGained += tree.xp;
      
      // Track items gained
      action.itemsGained.push({ itemId: tree.logId, quantity: 1 });

      // Check for special drops (bird nests, etc.)
      this.checkSpecialDrops(action.playerId, tree);

      // Check if tree should fall
      if (this.shouldTreeFall(tree, action.attempts)) {
        this.chopDownTree(node, tree);
      }

      logger.info(`[WoodcuttingSystem] ${action.playerId} chopped ${tree.name} (${action.attempts} attempts)`);

      // Emit woodcutting success event
      this.world.events.emit('rpg:woodcutting_success', {
        playerId: action.playerId,
        treeId: tree.id,
        logId: tree.logId,
        xpGained: tree.xp,
      });
    }

    action.lastAttempt = Date.now();
  }

  /**
   * Calculate chopping duration based on level and equipment
   */
  private calculateChoppingDuration(level: number, tree: Tree, axe?: Tool): number {
    let baseDuration = tree.chopTime * 600; // Convert ticks to ms
    
    // Level affects chopping speed
    const levelBonus = Math.max(0, (level - tree.level) * 0.02);
    baseDuration *= (1 - levelBonus);
    
    // Axe affects chopping speed
    if (axe) {
      baseDuration *= (1 / axe.speedMultiplier);
    }
    
    // Add some randomness (±25%)
    const randomFactor = 0.75 + Math.random() * 0.5;
    baseDuration *= randomFactor;
    
    return Math.max(1200, baseDuration); // Minimum 1.2 seconds
  }

  /**
   * Calculate success rate for chopping
   */
  private calculateChopRate(level: number, tree: Tree, axe?: Tool): number {
    // Base success rate depends on tree type
    let successRate = 0.5; // 50% base rate
    
    // Level bonus
    const levelBonus = Math.max(0, (level - tree.level) * 0.015);
    successRate += levelBonus;
    
    // Axe bonus
    if (axe) {
      successRate += 0.1; // 10% bonus for having proper axe
      successRate += axe.successBonus;
    }
    
    return Math.min(0.95, Math.max(0.1, successRate)); // Clamp between 10% and 95%
  }

  /**
   * Check if tree should fall after chopping
   */
  private shouldTreeFall(tree: Tree, attempts: number): boolean {
    // Different fall logic for different trees
    switch (tree.id) {
      case 'normal':
        return Math.random() < 0.125; // 1/8 chance per successful chop
      case 'oak':
        return Math.random() < 0.125; // 1/8 chance
      case 'willow':
        return Math.random() < 0.067; // ~1/15 chance
      case 'maple':
        return Math.random() < 0.083; // ~1/12 chance
      case 'yew':
        return Math.random() < 0.05; // 1/20 chance
      case 'magic':
        return Math.random() < 0.04; // 1/25 chance
      default:
        return Math.random() < 0.125;
    }
  }

  /**
   * Chop down a tree and set regrow timer
   */
  private chopDownTree(node: TreeNode, tree: Tree): void {
    node.chopped = true;
    node.lastChopped = Date.now();
    node.regrowAt = Date.now() + (tree.respawnTime * 1000);
    
    // Stop all choppers on this tree
    const choppers = (node as any).activeChoppers as string[] || [];
    choppers.forEach(playerId => {
      this.stopWoodcutting(playerId);
    });
    
    logger.info(`[WoodcuttingSystem] Tree ${tree.name} chopped down, regrowing in ${tree.respawnTime}s`);

    // Emit tree chopped event
    this.world.events.emit('rpg:tree_chopped', {
      nodeId: node.id,
      treeId: tree.id,
      regrowAt: node.regrowAt,
    });
  }

  /**
   * Check for special drops like bird nests
   */
  private checkSpecialDrops(playerId: string, tree: Tree): void {
    if (!tree.specialDrops) return;

    for (const drop of tree.specialDrops) {
      if (Math.random() < (1 / drop.chance)) {
        const quantity = Math.floor(Math.random() * (drop.quantity.max - drop.quantity.min + 1)) + drop.quantity.min;
        
        // Grant special drop
        this.world.events.emit('rpg:add_item', {
          playerId,
          itemId: drop.itemId,
          quantity,
          noted: false,
        });

        logger.info(`[WoodcuttingSystem] ${playerId} received special drop: ${drop.itemId} x${quantity}`);

        // Emit special drop event
        this.world.events.emit('rpg:special_drop', {
          playerId,
          itemId: drop.itemId,
          quantity,
          source: 'woodcutting',
          treeId: tree.id,
        });
      }
    }
  }

  /**
   * Grant log to player
   */
  private grantLog(playerId: string, tree: Tree): void {
    // Emit event to add item to inventory
    this.world.events.emit('rpg:add_item', {
      playerId,
      itemId: tree.logId,
      quantity: 1,
      noted: false,
    });
  }

  /**
   * Grant woodcutting XP
   */
  private grantWoodcuttingXP(playerId: string, amount: number): void {
    this.world.events.emit('rpg:xp_gain', {
      playerId,
      skill: 'woodcutting',
      amount,
      source: 'woodcutting',
    });
  }

  /**
   * Get player's best axe
   */
  private getPlayerAxe(playerId: string): Tool | undefined {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) return undefined;

    // Check equipped weapon first
    if (inventory.equipment.weapon) {
      const weaponId = inventory.equipment.weapon.itemId;
      if (this.axes.has(weaponId)) {
        return this.axes.get(weaponId);
      }
    }

    // Check inventory for axes
    for (const item of inventory.items) {
      if (item && this.axes.has(item.itemId)) {
        return this.axes.get(item.itemId);
      }
    }

    return undefined;
  }

  /**
   * Update active woodcutting actions
   */
  private updateWoodcuttingActions(delta: number): void {
    const now = Date.now();
    
    for (const action of this.activeActions.values()) {
      // Check if it's time for next chopping attempt
      if (now - action.lastAttempt >= action.duration) {
        this.processWoodcuttingAttempt(action);
      }
    }
  }

  /**
   * Check for tree regrowth
   */
  private checkTreeRegrowth(now: number): void {
    for (const node of this.treeNodes.values()) {
      if (node.chopped && now >= node.regrowAt) {
        // Regrow the tree
        node.chopped = false;
        node.lastChopped = 0;
        node.regrowAt = 0;
        
        const tree = this.trees.get(node.treeId);
        logger.info(`[WoodcuttingSystem] Tree ${tree?.name} regrown at node ${node.id}`);

        // Emit tree regrown event
        this.world.events.emit('rpg:tree_regrown', {
          nodeId: node.id,
          treeId: node.treeId,
        });
      }
    }
  }

  /**
   * Process woodcutting tick
   */
  private processWoodcuttingTick(): void {
    // Handle any tick-based woodcutting mechanics
    // Update tree growth stages, check for special events, etc.
  }

  /**
   * Create tree nodes in the world
   */
  private spawnTreeNodes(): void {
    // Create basic tree nodes for testing
    const basicNodes = [
      { treeId: 'normal', position: { x: 40, y: 0, z: 0 } },
      { treeId: 'oak', position: { x: 45, y: 0, z: 5 } },
      { treeId: 'willow', position: { x: 50, y: 0, z: 10 } },
      { treeId: 'maple', position: { x: 55, y: 0, z: 15 } },
      { treeId: 'yew', position: { x: 60, y: 0, z: 20 } },
    ];

    basicNodes.forEach((nodeData, index) => {
      const nodeId = `tree_node_${index}`;
      const node: TreeNode = {
        id: nodeId,
        treeId: nodeData.treeId,
        position: nodeData.position,
        chopped: false,
        lastChopped: 0,
        regrowAt: 0,
      };
      
      this.treeNodes.set(nodeId, node);
      
      // TODO: Create actual 3D entity in Hyperfy world
      // This would involve creating a 3D model and placing it in the world
    });

    logger.info(`[WoodcuttingSystem] Spawned ${basicNodes.length} tree nodes`);
  }

  /**
   * Initialize woodcutting data
   */
  private initializeWoodcuttingData(): void {
    // Initialize trees
    const trees: Tree[] = [
      {
        id: 'normal',
        name: 'Tree',
        logId: 1511, // Logs
        level: 1,
        xp: 25,
        treeType: 'normal',
        chopTime: GATHERING_CONSTANTS.BASE_WOODCUTTING_TIME,
        respawnTime: GATHERING_CONSTANTS.NORMAL_TREE_RESPAWN,
        locations: [],
        specialDrops: [
          {
            itemId: 5073, // Bird nest
            chance: 256, // 1/256 chance
            quantity: { min: 1, max: 1 },
          }
        ],
      },
      {
        id: 'oak',
        name: 'Oak',
        logId: 1521, // Oak logs
        level: 15,
        xp: 37.5,
        treeType: 'normal',
        chopTime: GATHERING_CONSTANTS.BASE_WOODCUTTING_TIME + 1,
        respawnTime: GATHERING_CONSTANTS.OAK_RESPAWN,
        locations: [],
        specialDrops: [
          {
            itemId: 5073, // Bird nest
            chance: 256,
            quantity: { min: 1, max: 1 },
          }
        ],
      },
      {
        id: 'willow',
        name: 'Willow',
        logId: 1519, // Willow logs
        level: 30,
        xp: 67.5,
        treeType: 'normal',
        chopTime: GATHERING_CONSTANTS.BASE_WOODCUTTING_TIME,
        respawnTime: GATHERING_CONSTANTS.WILLOW_RESPAWN,
        locations: [],
        specialDrops: [
          {
            itemId: 5073, // Bird nest
            chance: 256,
            quantity: { min: 1, max: 1 },
          }
        ],
      },
      {
        id: 'maple',
        name: 'Maple',
        logId: 1517, // Maple logs
        level: 45,
        xp: 100,
        treeType: 'normal',
        chopTime: GATHERING_CONSTANTS.BASE_WOODCUTTING_TIME + 2,
        respawnTime: GATHERING_CONSTANTS.MAPLE_RESPAWN,
        locations: [],
        specialDrops: [
          {
            itemId: 5073, // Bird nest
            chance: 256,
            quantity: { min: 1, max: 1 },
          }
        ],
      },
      {
        id: 'yew',
        name: 'Yew',
        logId: 1515, // Yew logs
        level: 60,
        xp: 175,
        treeType: 'normal',
        chopTime: GATHERING_CONSTANTS.BASE_WOODCUTTING_TIME + 3,
        respawnTime: GATHERING_CONSTANTS.YEW_RESPAWN,
        locations: [],
        specialDrops: [
          {
            itemId: 5073, // Bird nest
            chance: 256,
            quantity: { min: 1, max: 1 },
          }
        ],
      },
      {
        id: 'magic',
        name: 'Magic',
        logId: 1513, // Magic logs
        level: 75,
        xp: 250,
        treeType: 'special',
        chopTime: GATHERING_CONSTANTS.BASE_WOODCUTTING_TIME + 4,
        respawnTime: GATHERING_CONSTANTS.MAGIC_RESPAWN,
        locations: [],
        specialDrops: [
          {
            itemId: 5073, // Bird nest
            chance: 256,
            quantity: { min: 1, max: 1 },
          }
        ],
      },
    ];

    trees.forEach(tree => {
      this.trees.set(tree.id, tree);
    });

    // Initialize axes
    const axes: Tool[] = [
      {
        itemId: 1351, // Bronze axe
        name: 'Bronze axe',
        skill: 'woodcutting',
        level: 1,
        speedMultiplier: 1.0,
        successBonus: 0,
      },
      {
        itemId: 1349, // Iron axe
        name: 'Iron axe',
        skill: 'woodcutting',
        level: 1,
        speedMultiplier: 1.1,
        successBonus: 0.05,
      },
      {
        itemId: 1353, // Steel axe
        name: 'Steel axe',
        skill: 'woodcutting',
        level: 6,
        speedMultiplier: 1.2,
        successBonus: 0.1,
      },
      {
        itemId: 1355, // Mithril axe
        name: 'Mithril axe',
        skill: 'woodcutting',
        level: 21,
        speedMultiplier: 1.3,
        successBonus: 0.15,
      },
      {
        itemId: 1357, // Adamant axe
        name: 'Adamant axe',
        skill: 'woodcutting',
        level: 31,
        speedMultiplier: 1.4,
        successBonus: 0.2,
      },
      {
        itemId: 1359, // Rune axe
        name: 'Rune axe',
        skill: 'woodcutting',
        level: 41,
        speedMultiplier: 1.5,
        successBonus: 0.25,
      },
      {
        itemId: 6739, // Dragon axe
        name: 'Dragon axe',
        skill: 'woodcutting',
        level: 61,
        speedMultiplier: 1.6,
        successBonus: 0.3,
        special: {
          bonusXp: 0.1, // 10% bonus XP
        },
      },
    ];

    axes.forEach(axe => {
      this.axes.set(axe.itemId, axe);
    });

    logger.info(`[WoodcuttingSystem] Loaded ${trees.length} trees and ${axes.length} axes`);
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
  private handleStartWoodcutting(event: any): void {
    const { playerId, nodeId } = event;
    this.startWoodcutting(playerId, nodeId);
  }

  private handleStopWoodcutting(event: any): void {
    const { playerId } = event;
    this.stopWoodcutting(playerId);
  }

  private handleChopTree(event: any): void {
    const { playerId, treeId } = event;
    // Find nearest tree node of this type
    for (const [nodeId, node] of this.treeNodes.entries()) {
      if (node.treeId === treeId && !node.chopped) {
        this.startWoodcutting(playerId, nodeId);
        break;
      }
    }
  }

  // Public API
  getTrees(): Map<string, Tree> {
    return new Map(this.trees);
  }

  getTreeNodes(): Map<string, TreeNode> {
    return new Map(this.treeNodes);
  }

  getActiveActions(): Map<string, GatheringAction> {
    return new Map(this.activeActions);
  }

  isPlayerWoodcutting(playerId: string): boolean {
    return this.activeActions.has(playerId);
  }
}