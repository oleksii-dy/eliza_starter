/**
 * RuneScape Thieving System Implementation
 * =======================================
 * Handles pickpocketing, stealing from stalls, lockpicking, and stealth mechanics
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';
import type { StatsComponent } from '../types/stats';
import type { InventoryComponent } from '../types/inventory';

export class ThievingSystem implements HyperfySystem {
  name = 'ThievingSystem';
  world: HyperfyWorld;
  enabled = true;

  // Thieving data
  private pickpocketTargets: Map<string, PickpocketTarget> = new Map();
  private stalls: Map<string, ThievingStall> = new Map();
  private lockpickTargets: Map<string, LockpickTarget> = new Map();
  private activeThievingActions: Map<string, ThievingAction> = new Map();

  // NPC stun tracking (prevents spamming same NPC)
  private npcStunCooldowns: Map<string, number> = new Map();
  
  // Player detection tracking
  private playerDetectionHistory: Map<string, DetectionHistory> = new Map();

  // Tick tracking
  private tickCounter = 0;
  private lastTickTime = 0;

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.initializeThievingData();
    logger.info('[ThievingSystem] Initialized RuneScape thieving mechanics');
  }

  async init(): Promise<void> {
    logger.info('[ThievingSystem] Starting thieving system...');
    
    // Subscribe to thieving events
    this.world.events.on('rpg:start_pickpocket', this.handleStartPickpocket.bind(this));
    this.world.events.on('rpg:start_steal_stall', this.handleStartStealStall.bind(this));
    this.world.events.on('rpg:start_lockpick', this.handleStartLockpick.bind(this));
    this.world.events.on('rpg:stop_thieving', this.handleStopThieving.bind(this));
    this.world.events.on('rpg:thieving_detected', this.handleThievingDetected.bind(this));
  }

  tick(delta: number): void {
    const now = Date.now();
    
    // Process thieving ticks (every 600ms like RuneScape)
    if (now - this.lastTickTime >= 600) {
      this.processThievingTick();
      this.lastTickTime = now;
      this.tickCounter++;
    }
    
    // Update thieving actions
    this.updateThievingActions(delta);
    
    // Update NPC stun cooldowns
    this.updateNpcStunCooldowns(now);
    
    // Update detection histories
    this.updateDetectionHistories(now);
  }

  destroy(): void {
    this.world.events.off('rpg:start_pickpocket');
    this.world.events.off('rpg:start_steal_stall');
    this.world.events.off('rpg:start_lockpick');
    this.world.events.off('rpg:stop_thieving');
    this.world.events.off('rpg:thieving_detected');
    logger.info('[ThievingSystem] Thieving system destroyed');
  }

  /**
   * Start pickpocketing an NPC
   */
  startPickpocket(playerId: string, targetId: string): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[ThievingSystem] Player ${playerId} not found`);
      return false;
    }

    const target = this.pickpocketTargets.get(targetId);
    if (!target) {
      logger.warn(`[ThievingSystem] Pickpocket target ${targetId} not found`);
      return false;
    }

    // Check thieving level requirement
    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.thieving.level < target.levelRequired) {
      logger.info(`[ThievingSystem] Player ${playerId} needs thieving level ${target.levelRequired}`);
      return false;
    }

    // Check if NPC is stunned (cooldown)
    if (this.isNpcStunned(targetId)) {
      logger.info(`[ThievingSystem] NPC ${targetId} is stunned and cannot be pickpocketed`);
      return false;
    }

    // Check if player already thieving
    if (this.activeThievingActions.has(playerId)) {
      logger.info(`[ThievingSystem] Player ${playerId} already thieving`);
      return false;
    }

    // Calculate success chance
    const successChance = this.calculatePickpocketSuccessChance(playerId, target);
    
    // Create thieving action
    const action: ThievingAction = {
      playerId,
      type: 'pickpocket',
      targetId,
      startTime: Date.now(),
      duration: target.duration,
      successChance,
    };

    this.activeThievingActions.set(playerId, action);

    logger.info(`[ThievingSystem] ${playerId} started pickpocketing ${target.name} (${(target.duration/1000).toFixed(1)}s, ${(successChance*100).toFixed(1)}% success)`);

    // Emit pickpocket started event
    this.world.events.emit('rpg:pickpocket_started', {
      playerId,
      targetId,
      targetName: target.name,
      duration: target.duration,
      successChance: successChance * 100,
    });

    return true;
  }

  /**
   * Start stealing from a stall
   */
  startStealStall(playerId: string, stallId: string): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[ThievingSystem] Player ${playerId} not found`);
      return false;
    }

    const stall = this.stalls.get(stallId);
    if (!stall) {
      logger.warn(`[ThievingSystem] Stall ${stallId} not found`);
      return false;
    }

    // Check thieving level requirement
    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.thieving.level < stall.levelRequired) {
      logger.info(`[ThievingSystem] Player ${playerId} needs thieving level ${stall.levelRequired}`);
      return false;
    }

    // Check if stall is empty (respawn timer)
    if (this.isStallEmpty(stallId)) {
      logger.info(`[ThievingSystem] Stall ${stallId} is empty and respawning`);
      return false;
    }

    // Check if player already thieving
    if (this.activeThievingActions.has(playerId)) {
      logger.info(`[ThievingSystem] Player ${playerId} already thieving`);
      return false;
    }

    // Calculate success chance
    const successChance = this.calculateStallSuccessChance(playerId, stall);
    
    // Create thieving action
    const action: ThievingAction = {
      playerId,
      type: 'steal_stall',
      targetId: stallId,
      startTime: Date.now(),
      duration: stall.duration,
      successChance,
    };

    this.activeThievingActions.set(playerId, action);

    logger.info(`[ThievingSystem] ${playerId} started stealing from ${stall.name} (${(stall.duration/1000).toFixed(1)}s, ${(successChance*100).toFixed(1)}% success)`);

    // Emit stall theft started event
    this.world.events.emit('rpg:stall_theft_started', {
      playerId,
      stallId,
      stallName: stall.name,
      duration: stall.duration,
      successChance: successChance * 100,
    });

    return true;
  }

  /**
   * Start lockpicking a door/chest
   */
  startLockpick(playerId: string, targetId: string): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[ThievingSystem] Player ${playerId} not found`);
      return false;
    }

    const target = this.lockpickTargets.get(targetId);
    if (!target) {
      logger.warn(`[ThievingSystem] Lockpick target ${targetId} not found`);
      return false;
    }

    // Check thieving level requirement
    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.thieving.level < target.levelRequired) {
      logger.info(`[ThievingSystem] Player ${playerId} needs thieving level ${target.levelRequired}`);
      return false;
    }

    // Check if player has lockpick
    if (!this.playerHasLockpick(playerId)) {
      logger.info(`[ThievingSystem] Player ${playerId} needs a lockpick`);
      return false;
    }

    // Check if already unlocked recently
    if (this.isLockpickTargetCooldown(targetId)) {
      logger.info(`[ThievingSystem] Lockpick target ${targetId} was recently unlocked`);
      return false;
    }

    // Check if player already thieving
    if (this.activeThievingActions.has(playerId)) {
      logger.info(`[ThievingSystem] Player ${playerId} already thieving`);
      return false;
    }

    // Calculate success chance
    const successChance = this.calculateLockpickSuccessChance(playerId, target);
    
    // Create thieving action
    const action: ThievingAction = {
      playerId,
      type: 'lockpick',
      targetId,
      startTime: Date.now(),
      duration: target.duration,
      successChance,
    };

    this.activeThievingActions.set(playerId, action);

    logger.info(`[ThievingSystem] ${playerId} started lockpicking ${target.name} (${(target.duration/1000).toFixed(1)}s, ${(successChance*100).toFixed(1)}% success)`);

    // Emit lockpick started event
    this.world.events.emit('rpg:lockpick_started', {
      playerId,
      targetId,
      targetName: target.name,
      duration: target.duration,
      successChance: successChance * 100,
    });

    return true;
  }

  /**
   * Complete a thieving action
   */
  completeThievingAction(playerId: string): boolean {
    const action = this.activeThievingActions.get(playerId);
    if (!action) {
      return false;
    }

    // Determine success/failure
    const isSuccess = Math.random() < action.successChance;

    if (isSuccess) {
      this.handleThievingSuccess(action);
    } else {
      this.handleThievingFailure(action);
    }

    // Remove active action
    this.activeThievingActions.delete(playerId);
    return true;
  }

  /**
   * Handle successful thieving
   */
  private handleThievingSuccess(action: ThievingAction): void {
    const playerId = action.playerId;

    switch (action.type) {
      case 'pickpocket':
        const target = this.pickpocketTargets.get(action.targetId);
        if (target) {
          // Grant XP
          this.grantThievingXP(playerId, target.xpReward);
          
          // Give loot
          this.giveLoot(playerId, target.lootTable);
          
          // Stun NPC temporarily
          this.stunNpc(action.targetId, target.stunDuration);

          logger.info(`[ThievingSystem] ${playerId} successfully pickpocketed ${target.name}`);

          // Emit success event
          this.world.events.emit('rpg:pickpocket_success', {
            playerId,
            targetId: action.targetId,
            targetName: target.name,
            xpGained: target.xpReward,
            loot: target.lootTable,
          });
        }
        break;

      case 'steal_stall':
        const stall = this.stalls.get(action.targetId);
        if (stall) {
          // Grant XP
          this.grantThievingXP(playerId, stall.xpReward);
          
          // Give loot
          this.giveLoot(playerId, stall.lootTable);
          
          // Empty stall temporarily
          this.emptyStall(action.targetId, stall.respawnTime);

          logger.info(`[ThievingSystem] ${playerId} successfully stole from ${stall.name}`);

          // Emit success event
          this.world.events.emit('rpg:stall_theft_success', {
            playerId,
            stallId: action.targetId,
            stallName: stall.name,
            xpGained: stall.xpReward,
            loot: stall.lootTable,
          });
        }
        break;

      case 'lockpick':
        const lockTarget = this.lockpickTargets.get(action.targetId);
        if (lockTarget) {
          // Grant XP
          this.grantThievingXP(playerId, lockTarget.xpReward);
          
          // Give loot (if any)
          if (lockTarget.lootTable) {
            this.giveLoot(playerId, lockTarget.lootTable);
          }
          
          // Set cooldown
          this.setLockpickTargetCooldown(action.targetId, lockTarget.cooldownTime);

          logger.info(`[ThievingSystem] ${playerId} successfully lockpicked ${lockTarget.name}`);

          // Emit success event
          this.world.events.emit('rpg:lockpick_success', {
            playerId,
            targetId: action.targetId,
            targetName: lockTarget.name,
            xpGained: lockTarget.xpReward,
            loot: lockTarget.lootTable,
          });
        }
        break;
    }
  }

  /**
   * Handle failed thieving
   */
  private handleThievingFailure(action: ThievingAction): void {
    const playerId = action.playerId;

    switch (action.type) {
      case 'pickpocket':
        const target = this.pickpocketTargets.get(action.targetId);
        if (target) {
          // Grant small XP for attempt
          const failureXP = Math.floor(target.xpReward * 0.1);
          if (failureXP > 0) {
            this.grantThievingXP(playerId, failureXP);
          }

          // Apply damage
          if (target.failureDamage > 0) {
            this.world.events.emit('rpg:take_damage', {
              playerId,
              damage: target.failureDamage,
              source: 'pickpocket_failure',
              damageType: 'physical',
            });
          }

          // Stun NPC for longer
          this.stunNpc(action.targetId, target.stunDuration * 2);
          
          // Add to detection history
          this.addDetectionHistory(playerId, action.targetId);

          logger.info(`[ThievingSystem] ${playerId} failed to pickpocket ${target.name}`);

          // Emit failure event
          this.world.events.emit('rpg:pickpocket_failure', {
            playerId,
            targetId: action.targetId,
            targetName: target.name,
            xpGained: failureXP,
            damage: target.failureDamage,
          });
        }
        break;

      case 'steal_stall':
        const stall = this.stalls.get(action.targetId);
        if (stall) {
          // Grant small XP for attempt
          const failureXP = Math.floor(stall.xpReward * 0.1);
          if (failureXP > 0) {
            this.grantThievingXP(playerId, failureXP);
          }

          // Add to detection history
          this.addDetectionHistory(playerId, action.targetId);

          logger.info(`[ThievingSystem] ${playerId} failed to steal from ${stall.name}`);

          // Emit failure event
          this.world.events.emit('rpg:stall_theft_failure', {
            playerId,
            stallId: action.targetId,
            stallName: stall.name,
            xpGained: failureXP,
          });
        }
        break;

      case 'lockpick':
        const lockTarget = this.lockpickTargets.get(action.targetId);
        if (lockTarget) {
          // Grant small XP for attempt
          const failureXP = Math.floor(lockTarget.xpReward * 0.1);
          if (failureXP > 0) {
            this.grantThievingXP(playerId, failureXP);
          }

          // Break lockpick chance
          if (Math.random() < lockTarget.lockpickBreakChance) {
            this.world.events.emit('rpg:remove_item', {
              playerId,
              itemId: 1523, // Lockpick
              quantity: 1,
            });
          }

          logger.info(`[ThievingSystem] ${playerId} failed to lockpick ${lockTarget.name}`);

          // Emit failure event
          this.world.events.emit('rpg:lockpick_failure', {
            playerId,
            targetId: action.targetId,
            targetName: lockTarget.name,
            xpGained: failureXP,
            lockpickBroken: Math.random() < lockTarget.lockpickBreakChance,
          });
        }
        break;
    }
  }

  /**
   * Calculate pickpocket success chance
   */
  private calculatePickpocketSuccessChance(playerId: string, target: PickpocketTarget): number {
    const stats = this.getPlayerStats(playerId);
    if (!stats) return target.baseSuccessRate;

    const playerLevel = stats.thieving.level;
    const requiredLevel = target.levelRequired;

    // Base success rate
    let successChance = target.baseSuccessRate;

    // Increase success chance based on level difference
    if (playerLevel > requiredLevel) {
      const levelDifference = playerLevel - requiredLevel;
      successChance += (levelDifference * 0.005); // 0.5% per level above requirement
    }

    // Apply detection history penalty
    const detectionHistory = this.playerDetectionHistory.get(playerId);
    if (detectionHistory && detectionHistory.recentDetections.length > 0) {
      const penalty = detectionHistory.recentDetections.length * 0.1; // 10% per recent detection
      successChance = Math.max(0.05, successChance - penalty);
    }

    return Math.max(0.05, Math.min(0.95, successChance)); // Between 5% and 95%
  }

  /**
   * Calculate stall theft success chance
   */
  private calculateStallSuccessChance(playerId: string, stall: ThievingStall): number {
    const stats = this.getPlayerStats(playerId);
    if (!stats) return stall.baseSuccessRate;

    const playerLevel = stats.thieving.level;
    const requiredLevel = stall.levelRequired;

    // Base success rate
    let successChance = stall.baseSuccessRate;

    // Increase success chance based on level difference
    if (playerLevel > requiredLevel) {
      const levelDifference = playerLevel - requiredLevel;
      successChance += (levelDifference * 0.01); // 1% per level above requirement
    }

    return Math.max(0.1, Math.min(0.95, successChance)); // Between 10% and 95%
  }

  /**
   * Calculate lockpick success chance
   */
  private calculateLockpickSuccessChance(playerId: string, target: LockpickTarget): number {
    const stats = this.getPlayerStats(playerId);
    if (!stats) return target.baseSuccessRate;

    const playerLevel = stats.thieving.level;
    const requiredLevel = target.levelRequired;

    // Base success rate
    let successChance = target.baseSuccessRate;

    // Increase success chance based on level difference
    if (playerLevel > requiredLevel) {
      const levelDifference = playerLevel - requiredLevel;
      successChance += (levelDifference * 0.01); // 1% per level above requirement
    }

    return Math.max(0.1, Math.min(0.9, successChance)); // Between 10% and 90%
  }

  /**
   * Give loot to player
   */
  private giveLoot(playerId: string, lootTable: LootEntry[]): void {
    for (const loot of lootTable) {
      if (Math.random() < loot.chance) {
        this.world.events.emit('rpg:add_item', {
          playerId,
          itemId: loot.itemId,
          quantity: loot.quantity,
          noted: false,
        });
      }
    }
  }

  /**
   * Stun NPC
   */
  private stunNpc(npcId: string, duration: number): void {
    this.npcStunCooldowns.set(npcId, Date.now() + duration);
  }

  /**
   * Empty stall
   */
  private emptyStall(stallId: string, respawnTime: number): void {
    this.npcStunCooldowns.set(`stall_${stallId}`, Date.now() + respawnTime);
  }

  /**
   * Set lockpick target cooldown
   */
  private setLockpickTargetCooldown(targetId: string, cooldownTime: number): void {
    this.npcStunCooldowns.set(`lockpick_${targetId}`, Date.now() + cooldownTime);
  }

  /**
   * Check if NPC is stunned
   */
  private isNpcStunned(npcId: string): boolean {
    const stunTime = this.npcStunCooldowns.get(npcId);
    return stunTime ? Date.now() < stunTime : false;
  }

  /**
   * Check if stall is empty
   */
  private isStallEmpty(stallId: string): boolean {
    const respawnTime = this.npcStunCooldowns.get(`stall_${stallId}`);
    return respawnTime ? Date.now() < respawnTime : false;
  }

  /**
   * Check if lockpick target is on cooldown
   */
  private isLockpickTargetCooldown(targetId: string): boolean {
    const cooldownTime = this.npcStunCooldowns.get(`lockpick_${targetId}`);
    return cooldownTime ? Date.now() < cooldownTime : false;
  }

  /**
   * Check if player has lockpick
   */
  private playerHasLockpick(playerId: string): boolean {
    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) return false;

    for (const item of inventory.items) {
      if (item && item.itemId === 1523) { // Lockpick
        return true;
      }
    }
    return false;
  }

  /**
   * Add detection history
   */
  private addDetectionHistory(playerId: string, targetId: string): void {
    let history = this.playerDetectionHistory.get(playerId);
    if (!history) {
      history = {
        playerId,
        recentDetections: [],
      };
      this.playerDetectionHistory.set(playerId, history);
    }

    history.recentDetections.push({
      targetId,
      timestamp: Date.now(),
    });

    // Keep only last 5 detections
    if (history.recentDetections.length > 5) {
      history.recentDetections.shift();
    }
  }

  /**
   * Update NPC stun cooldowns
   */
  private updateNpcStunCooldowns(currentTime: number): void {
    for (const [npcId, stunTime] of this.npcStunCooldowns.entries()) {
      if (currentTime >= stunTime) {
        this.npcStunCooldowns.delete(npcId);
      }
    }
  }

  /**
   * Update detection histories
   */
  private updateDetectionHistories(currentTime: number): void {
    for (const [playerId, history] of this.playerDetectionHistory.entries()) {
      // Remove detections older than 5 minutes
      history.recentDetections = history.recentDetections.filter(
        detection => currentTime - detection.timestamp < 300000
      );

      if (history.recentDetections.length === 0) {
        this.playerDetectionHistory.delete(playerId);
      }
    }
  }

  /**
   * Update active thieving actions
   */
  private updateThievingActions(delta: number): void {
    const now = Date.now();
    
    for (const [playerId, action] of this.activeThievingActions.entries()) {
      if (now - action.startTime >= action.duration) {
        this.completeThievingAction(playerId);
      }
    }
  }

  /**
   * Process thieving tick
   */
  private processThievingTick(): void {
    // Handle any tick-based thieving mechanics
  }

  /**
   * Grant thieving XP
   */
  private grantThievingXP(playerId: string, amount: number): void {
    this.world.events.emit('rpg:xp_gain', {
      playerId,
      skill: 'thieving',
      amount,
      source: 'thieving',
    });
  }

  /**
   * Initialize thieving data
   */
  private initializeThievingData(): void {
    // Initialize pickpocket targets
    this.initializePickpocketTargets();
    
    // Initialize stalls
    this.initializeStalls();
    
    // Initialize lockpick targets
    this.initializeLockpickTargets();

    logger.info(`[ThievingSystem] Loaded ${this.pickpocketTargets.size} pickpocket targets, ${this.stalls.size} stalls, ${this.lockpickTargets.size} lockpick targets`);
  }

  /**
   * Initialize pickpocket targets
   */
  private initializePickpocketTargets(): void {
    const targets: PickpocketTarget[] = [
      // Men/Women (Level 1)
      {
        id: 'man',
        name: 'Man',
        levelRequired: 1,
        xpReward: 8,
        baseSuccessRate: 0.85,
        duration: 1500,
        stunDuration: 4000,
        failureDamage: 1,
        lootTable: [
          { itemId: 995, quantity: 3, chance: 1.0 }, // Coins
        ],
      },
      {
        id: 'woman',
        name: 'Woman',
        levelRequired: 1,
        xpReward: 8,
        baseSuccessRate: 0.85,
        duration: 1500,
        stunDuration: 4000,
        failureDamage: 1,
        lootTable: [
          { itemId: 995, quantity: 3, chance: 1.0 }, // Coins
        ],
      },

      // Farmers (Level 10)
      {
        id: 'farmer',
        name: 'Farmer',
        levelRequired: 10,
        xpReward: 14.5,
        baseSuccessRate: 0.75,
        duration: 2000,
        stunDuration: 5000,
        failureDamage: 2,
        lootTable: [
          { itemId: 995, quantity: 9, chance: 1.0 }, // Coins
          { itemId: 1942, quantity: 1, chance: 0.1 }, // Potato seed
        ],
      },

      // Warriors (Level 25)
      {
        id: 'warrior',
        name: 'Warrior',
        levelRequired: 25,
        xpReward: 26,
        baseSuccessRate: 0.65,
        duration: 2500,
        stunDuration: 6000,
        failureDamage: 3,
        lootTable: [
          { itemId: 995, quantity: 18, chance: 1.0 }, // Coins
        ],
      },

      // Guards (Level 40)
      {
        id: 'guard',
        name: 'Guard',
        levelRequired: 40,
        xpReward: 46.8,
        baseSuccessRate: 0.55,
        duration: 3000,
        stunDuration: 8000,
        failureDamage: 4,
        lootTable: [
          { itemId: 995, quantity: 30, chance: 1.0 }, // Coins
        ],
      },

      // Knights (Level 55)
      {
        id: 'knight',
        name: 'Knight',
        levelRequired: 55,
        xpReward: 84.3,
        baseSuccessRate: 0.45,
        duration: 3500,
        stunDuration: 10000,
        failureDamage: 6,
        lootTable: [
          { itemId: 995, quantity: 50, chance: 1.0 }, // Coins
        ],
      },

      // Paladins (Level 70)
      {
        id: 'paladin',
        name: 'Paladin',
        levelRequired: 70,
        xpReward: 151.75,
        baseSuccessRate: 0.35,
        duration: 4000,
        stunDuration: 12000,
        failureDamage: 8,
        lootTable: [
          { itemId: 995, quantity: 80, chance: 1.0 }, // Coins
          { itemId: 383, quantity: 1, chance: 0.05 }, // Raw shark
        ],
      },

      // Heroes (Level 80)
      {
        id: 'hero',
        name: 'Hero',
        levelRequired: 80,
        xpReward: 273.3,
        baseSuccessRate: 0.25,
        duration: 4500,
        stunDuration: 15000,
        failureDamage: 12,
        lootTable: [
          { itemId: 995, quantity: 200, chance: 1.0 }, // Coins
          { itemId: 1623, quantity: 1, chance: 0.01 }, // Uncut sapphire
          { itemId: 1621, quantity: 1, chance: 0.005 }, // Uncut emerald
        ],
      },
    ];

    targets.forEach(target => {
      this.pickpocketTargets.set(target.id, target);
    });
  }

  /**
   * Initialize stalls
   */
  private initializeStalls(): void {
    const stalls: ThievingStall[] = [
      // Vegetable stall (Level 2)
      {
        id: 'vegetable_stall',
        name: 'Vegetable stall',
        levelRequired: 2,
        xpReward: 10,
        baseSuccessRate: 0.9,
        duration: 2000,
        respawnTime: 3000,
        lootTable: [
          { itemId: 1965, quantity: 1, chance: 0.4 }, // Cabbage
          { itemId: 1942, quantity: 1, chance: 0.3 }, // Potato
          { itemId: 1957, quantity: 1, chance: 0.2 }, // Onion
          { itemId: 1982, quantity: 1, chance: 0.1 }, // Turnip
        ],
      },

      // Baker's stall (Level 5)
      {
        id: 'baker_stall',
        name: "Baker's stall",
        levelRequired: 5,
        xpReward: 16,
        baseSuccessRate: 0.85,
        duration: 2500,
        respawnTime: 4000,
        lootTable: [
          { itemId: 2309, quantity: 1, chance: 0.5 }, // Bread
          { itemId: 1891, quantity: 1, chance: 0.3 }, // Cake
          { itemId: 2313, quantity: 1, chance: 0.2 }, // Chocolate cake
        ],
      },

      // Tea stall (Level 20)
      {
        id: 'tea_stall',
        name: 'Tea stall',
        levelRequired: 20,
        xpReward: 16,
        baseSuccessRate: 0.8,
        duration: 3000,
        respawnTime: 5000,
        lootTable: [
          { itemId: 712, quantity: 1, chance: 1.0 }, // Cup of tea
        ],
      },

      // Silk stall (Level 20)
      {
        id: 'silk_stall',
        name: 'Silk stall',
        levelRequired: 20,
        xpReward: 24,
        baseSuccessRate: 0.75,
        duration: 3500,
        respawnTime: 6000,
        lootTable: [
          { itemId: 950, quantity: 1, chance: 1.0 }, // Silk
        ],
      },

      // Wine stall (Level 22)
      {
        id: 'wine_stall',
        name: 'Wine stall',
        levelRequired: 22,
        xpReward: 27,
        baseSuccessRate: 0.7,
        duration: 4000,
        respawnTime: 8000,
        lootTable: [
          { itemId: 1993, quantity: 1, chance: 0.7 }, // Jug of wine
          { itemId: 245, quantity: 1, chance: 0.3 }, // Wine of zamorak
        ],
      },

      // Seed stall (Level 27)
      {
        id: 'seed_stall',
        name: 'Seed stall',
        levelRequired: 27,
        xpReward: 10,
        baseSuccessRate: 0.65,
        duration: 3000,
        respawnTime: 10000,
        lootTable: [
          { itemId: 5318, quantity: 1, chance: 0.4 }, // Potato seed
          { itemId: 5319, quantity: 1, chance: 0.3 }, // Onion seed
          { itemId: 5324, quantity: 1, chance: 0.2 }, // Cabbage seed
          { itemId: 5096, quantity: 1, chance: 0.1 }, // Limpwurt seed
        ],
      },

      // Fur stall (Level 35)
      {
        id: 'fur_stall',
        name: 'Fur stall',
        levelRequired: 35,
        xpReward: 36,
        baseSuccessRate: 0.6,
        duration: 4500,
        respawnTime: 12000,
        lootTable: [
          { itemId: 6814, quantity: 1, chance: 1.0 }, // Grey wolf fur
        ],
      },

      // Fish stall (Level 42)
      {
        id: 'fish_stall',
        name: 'Fish stall',
        levelRequired: 42,
        xpReward: 42,
        baseSuccessRate: 0.55,
        duration: 5000,
        respawnTime: 15000,
        lootTable: [
          { itemId: 331, quantity: 1, chance: 0.5 }, // Salmon
          { itemId: 359, quantity: 1, chance: 0.3 }, // Tuna
          { itemId: 371, quantity: 1, chance: 0.2 }, // Swordfish
        ],
      },

      // Gem stall (Level 75)
      {
        id: 'gem_stall',
        name: 'Gem stall',
        levelRequired: 75,
        xpReward: 160,
        baseSuccessRate: 0.4,
        duration: 6000,
        respawnTime: 180000, // 3 minutes
        lootTable: [
          { itemId: 1623, quantity: 1, chance: 0.5 }, // Uncut sapphire
          { itemId: 1621, quantity: 1, chance: 0.3 }, // Uncut emerald
          { itemId: 1619, quantity: 1, chance: 0.15 }, // Uncut ruby
          { itemId: 1617, quantity: 1, chance: 0.05 }, // Uncut diamond
        ],
      },
    ];

    stalls.forEach(stall => {
      this.stalls.set(stall.id, stall);
    });
  }

  /**
   * Initialize lockpick targets
   */
  private initializeLockpickTargets(): void {
    const targets: LockpickTarget[] = [
      // Chest (Level 13)
      {
        id: 'chest_lumbridge',
        name: 'Chest',
        levelRequired: 13,
        xpReward: 7.8,
        baseSuccessRate: 0.8,
        duration: 3000,
        lockpickBreakChance: 0.1,
        cooldownTime: 60000, // 1 minute
        lootTable: [
          { itemId: 995, quantity: 20, chance: 1.0 }, // Coins
        ],
      },

      // Door (Level 16)
      {
        id: 'door_chaos_druid',
        name: 'Chaos druid door',
        levelRequired: 16,
        xpReward: 15,
        baseSuccessRate: 0.75,
        duration: 4000,
        lockpickBreakChance: 0.15,
        cooldownTime: 300000, // 5 minutes
      },

      // Chest (Level 43)
      {
        id: 'chest_ardougne',
        name: 'Ardougne chest',
        levelRequired: 43,
        xpReward: 25,
        baseSuccessRate: 0.6,
        duration: 5000,
        lockpickBreakChance: 0.2,
        cooldownTime: 300000, // 5 minutes
        lootTable: [
          { itemId: 995, quantity: 50, chance: 1.0 }, // Coins
          { itemId: 1623, quantity: 1, chance: 0.1 }, // Uncut sapphire
        ],
      },

      // Door (Level 61)
      {
        id: 'door_yanille_dungeon',
        name: 'Yanille dungeon door',
        levelRequired: 61,
        xpReward: 37.5,
        baseSuccessRate: 0.5,
        duration: 6000,
        lockpickBreakChance: 0.25,
        cooldownTime: 600000, // 10 minutes
      },

      // Chest (Level 84)
      {
        id: 'chest_rogues_den',
        name: "Rogues' den chest",
        levelRequired: 84,
        xpReward: 125,
        baseSuccessRate: 0.3,
        duration: 8000,
        lockpickBreakChance: 0.3,
        cooldownTime: 1800000, // 30 minutes
        lootTable: [
          { itemId: 995, quantity: 500, chance: 1.0 }, // Coins
          { itemId: 1621, quantity: 1, chance: 0.2 }, // Uncut emerald
          { itemId: 1619, quantity: 1, chance: 0.1 }, // Uncut ruby
          { itemId: 1617, quantity: 1, chance: 0.05 }, // Uncut diamond
        ],
      },
    ];

    targets.forEach(target => {
      this.lockpickTargets.set(target.id, target);
    });
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
  private handleStartPickpocket(event: any): void {
    const { playerId, targetId } = event;
    this.startPickpocket(playerId, targetId);
  }

  private handleStartStealStall(event: any): void {
    const { playerId, stallId } = event;
    this.startStealStall(playerId, stallId);
  }

  private handleStartLockpick(event: any): void {
    const { playerId, targetId } = event;
    this.startLockpick(playerId, targetId);
  }

  private handleStopThieving(event: any): void {
    const { playerId } = event;
    this.activeThievingActions.delete(playerId);
  }

  private handleThievingDetected(event: any): void {
    const { playerId, targetId } = event;
    this.addDetectionHistory(playerId, targetId);
  }

  // Public API
  getPickpocketTargets(): Map<string, PickpocketTarget> {
    return new Map(this.pickpocketTargets);
  }

  getStalls(): Map<string, ThievingStall> {
    return new Map(this.stalls);
  }

  getLockpickTargets(): Map<string, LockpickTarget> {
    return new Map(this.lockpickTargets);
  }

  getActiveThievingActions(): Map<string, ThievingAction> {
    return new Map(this.activeThievingActions);
  }

  isPlayerThieving(playerId: string): boolean {
    return this.activeThievingActions.has(playerId);
  }

  // Validation methods for actions
  canPickpocket(playerId: string, targetId: string): { canPickpocket: boolean, reason?: string } {
    const target = this.pickpocketTargets.get(targetId);
    if (!target) {
      return { canPickpocket: false, reason: `Unknown pickpocket target: ${targetId}` };
    }

    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.thieving.level < target.levelRequired) {
      return { canPickpocket: false, reason: `Need thieving level ${target.levelRequired}` };
    }

    if (this.isNpcStunned(targetId)) {
      return { canPickpocket: false, reason: 'Target is stunned' };
    }

    if (this.activeThievingActions.has(playerId)) {
      return { canPickpocket: false, reason: 'Already thieving' };
    }

    return { canPickpocket: true };
  }

  canStealStall(playerId: string, stallId: string): { canSteal: boolean, reason?: string } {
    const stall = this.stalls.get(stallId);
    if (!stall) {
      return { canSteal: false, reason: `Unknown stall: ${stallId}` };
    }

    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.thieving.level < stall.levelRequired) {
      return { canSteal: false, reason: `Need thieving level ${stall.levelRequired}` };
    }

    if (this.isStallEmpty(stallId)) {
      return { canSteal: false, reason: 'Stall is empty' };
    }

    if (this.activeThievingActions.has(playerId)) {
      return { canSteal: false, reason: 'Already thieving' };
    }

    return { canSteal: true };
  }

  canLockpick(playerId: string, targetId: string): { canLockpick: boolean, reason?: string } {
    const target = this.lockpickTargets.get(targetId);
    if (!target) {
      return { canLockpick: false, reason: `Unknown lockpick target: ${targetId}` };
    }

    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.thieving.level < target.levelRequired) {
      return { canLockpick: false, reason: `Need thieving level ${target.levelRequired}` };
    }

    if (!this.playerHasLockpick(playerId)) {
      return { canLockpick: false, reason: 'Need a lockpick' };
    }

    if (this.isLockpickTargetCooldown(targetId)) {
      return { canLockpick: false, reason: 'Recently unlocked' };
    }

    if (this.activeThievingActions.has(playerId)) {
      return { canLockpick: false, reason: 'Already thieving' };
    }

    return { canLockpick: true };
  }

  getTargetsByLevel(minLevel: number, maxLevel: number = 99): (PickpocketTarget | ThievingStall | LockpickTarget)[] {
    const targets: (PickpocketTarget | ThievingStall | LockpickTarget)[] = [];
    
    for (const target of this.pickpocketTargets.values()) {
      if (target.levelRequired >= minLevel && target.levelRequired <= maxLevel) {
        targets.push(target);
      }
    }
    
    for (const stall of this.stalls.values()) {
      if (stall.levelRequired >= minLevel && stall.levelRequired <= maxLevel) {
        targets.push(stall);
      }
    }
    
    for (const target of this.lockpickTargets.values()) {
      if (target.levelRequired >= minLevel && target.levelRequired <= maxLevel) {
        targets.push(target);
      }
    }
    
    return targets.sort((a, b) => a.levelRequired - b.levelRequired);
  }
}

// Type definitions
interface PickpocketTarget {
  id: string;
  name: string;
  levelRequired: number;
  xpReward: number;
  baseSuccessRate: number;
  duration: number; // milliseconds
  stunDuration: number; // milliseconds
  failureDamage: number;
  lootTable: LootEntry[];
}

interface ThievingStall {
  id: string;
  name: string;
  levelRequired: number;
  xpReward: number;
  baseSuccessRate: number;
  duration: number; // milliseconds
  respawnTime: number; // milliseconds
  lootTable: LootEntry[];
}

interface LockpickTarget {
  id: string;
  name: string;
  levelRequired: number;
  xpReward: number;
  baseSuccessRate: number;
  duration: number; // milliseconds
  lockpickBreakChance: number;
  cooldownTime: number; // milliseconds
  lootTable?: LootEntry[];
}

interface LootEntry {
  itemId: number;
  quantity: number;
  chance: number; // 0.0 to 1.0
}

interface ThievingAction {
  playerId: string;
  type: 'pickpocket' | 'steal_stall' | 'lockpick';
  targetId: string;
  startTime: number;
  duration: number;
  successChance: number;
}

interface DetectionHistory {
  playerId: string;
  recentDetections: Array<{
    targetId: string;
    timestamp: number;
  }>;
}