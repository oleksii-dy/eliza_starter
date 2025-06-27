/**
 * RuneScape Monster System Implementation
 * ======================================
 * Handles NPC monsters, combat AI, drop tables, spawning, and monster behaviors
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';
import type { StatsComponent } from '../types/stats';
import type { InventoryComponent } from '../types/inventory';

export class MonsterSystem implements HyperfySystem {
  name = 'MonsterSystem';
  world: HyperfyWorld;
  enabled = true;

  // Monster data
  private monsterTypes: Map<string, MonsterType> = new Map();
  private dropTables: Map<string, DropTable> = new Map();
  private spawnPoints: Map<string, SpawnPoint> = new Map();
  
  // Active monsters
  private activeMonsters: Map<string, Monster> = new Map();
  private monsterCombat: Map<string, MonsterCombatState> = new Map();
  private respawnQueue: Map<string, number> = new Map();

  // AI tick tracking
  private lastAITick = 0;
  private aiTickInterval = 600; // 600ms AI tick like RuneScape
  private lastRespawnCheck = 0;
  private respawnCheckInterval = 5000; // Check respawns every 5 seconds

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.initializeMonsterData();
    logger.info('[MonsterSystem] Initialized RuneScape monster mechanics');
  }

  async init(): Promise<void> {
    logger.info('[MonsterSystem] Starting monster system...');
    
    // Subscribe to combat events
    this.world.events.on('rpg:attack_monster', this.handleAttackMonster.bind(this));
    this.world.events.on('rpg:monster_death', this.handleMonsterDeath.bind(this));
    this.world.events.on('rpg:spawn_monster', this.handleSpawnMonster.bind(this));
    this.world.events.on('rpg:despawn_monster', this.handleDespawnMonster.bind(this));
    
    // Initialize spawn points
    this.initializeSpawnPoints();
  }

  tick(delta: number): void {
    const now = Date.now();
    
    // Process monster AI
    if (now - this.lastAITick >= this.aiTickInterval) {
      this.processMonsterAI();
      this.lastAITick = now;
    }
    
    // Check for respawns
    if (now - this.lastRespawnCheck >= this.respawnCheckInterval) {
      this.processRespawns();
      this.lastRespawnCheck = now;
    }
    
    // Update monster states
    this.updateMonsterStates(delta);
  }

  destroy(): void {
    this.world.events.off('rpg:attack_monster');
    this.world.events.off('rpg:monster_death');
    this.world.events.off('rpg:spawn_monster');
    this.world.events.off('rpg:despawn_monster');
    logger.info('[MonsterSystem] Monster system destroyed');
  }

  /**
   * Spawn a monster at a specific location
   */
  spawnMonster(monsterTypeId: string, position: { x: number, y: number, z: number }, spawnPointId?: string): string | null {
    const monsterType = this.monsterTypes.get(monsterTypeId);
    if (!monsterType) {
      logger.warn(`[MonsterSystem] Monster type ${monsterTypeId} not found`);
      return null;
    }

    const monsterId = `monster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const monster: Monster = {
      id: monsterId,
      typeId: monsterTypeId,
      position,
      spawnPointId: spawnPointId || null,
      currentHP: monsterType.hitpoints,
      maxHP: monsterType.hitpoints,
      state: 'idle',
      target: null,
      lastAction: 0,
      spawnTime: Date.now(),
      combatLevel: monsterType.combatLevel,
      stats: { ...monsterType.stats },
      aggressive: monsterType.aggressive,
      attackRange: monsterType.attackRange,
      wanderRadius: monsterType.wanderRadius,
      respawnTime: monsterType.respawnTime,
    };

    this.activeMonsters.set(monsterId, monster);

    logger.info(`[MonsterSystem] Spawned ${monsterType.name} (${monsterId}) at ${position.x},${position.y},${position.z}`);

    // Emit spawn event
    this.world.events.emit('rpg:monster_spawned', {
      monsterId,
      monsterTypeId,
      monsterName: monsterType.name,
      position,
      combatLevel: monster.combatLevel,
    });

    return monsterId;
  }

  /**
   * Despawn a monster
   */
  despawnMonster(monsterId: string, scheduleRespawn: boolean = false): boolean {
    const monster = this.activeMonsters.get(monsterId);
    if (!monster) {
      return false;
    }

    // Schedule respawn if needed
    if (scheduleRespawn && monster.spawnPointId && monster.respawnTime > 0) {
      this.respawnQueue.set(monster.spawnPointId, Date.now() + monster.respawnTime);
    }

    // Clean up combat state
    this.monsterCombat.delete(monsterId);
    
    // Remove from active monsters
    this.activeMonsters.delete(monsterId);

    logger.info(`[MonsterSystem] Despawned monster ${monsterId}`);

    // Emit despawn event
    this.world.events.emit('rpg:monster_despawned', {
      monsterId,
      position: monster.position,
      scheduleRespawn,
    });

    return true;
  }

  /**
   * Attack a monster
   */
  attackMonster(playerId: string, monsterId: string): boolean {
    const player = this.world.entities.players.get(playerId);
    const monster = this.activeMonsters.get(monsterId);
    
    if (!player || !monster) {
      return false;
    }

    const monsterType = this.monsterTypes.get(monster.typeId);
    if (!monsterType) {
      return false;
    }

    // Check if monster can be attacked
    if (monster.currentHP <= 0) {
      return false;
    }

    // Check slayer requirements if applicable
    if (monsterType.slayerLevelRequired > 0) {
      const slayerSystem = this.world.systems?.find((s: any) => s.name === 'SlayerSystem');
      if (slayerSystem && !slayerSystem.canDamageMonster(playerId, monster.typeId)) {
        return false;
      }
    }

    // Set monster target to player
    monster.target = playerId;
    monster.state = 'combat';

    // Initialize combat state if not exists
    if (!this.monsterCombat.has(monsterId)) {
      this.monsterCombat.set(monsterId, {
        target: playerId,
        lastAttack: 0,
        attackCooldown: monsterType.attackSpeed,
        isRetaliating: true,
      });
    }

    logger.info(`[MonsterSystem] Player ${playerId} attacking monster ${monsterId}`);

    // Emit combat start event
    this.world.events.emit('rpg:monster_combat_started', {
      playerId,
      monsterId,
      monsterName: monsterType.name,
      monsterLevel: monster.combatLevel,
    });

    return true;
  }

  /**
   * Deal damage to a monster
   */
  damageMonster(monsterId: string, damage: number, attackerId: string): boolean {
    const monster = this.activeMonsters.get(monsterId);
    if (!monster || monster.currentHP <= 0) {
      return false;
    }

    const monsterType = this.monsterTypes.get(monster.typeId);
    if (!monsterType) {
      return false;
    }

    // Apply damage
    const actualDamage = Math.min(damage, monster.currentHP);
    monster.currentHP -= actualDamage;

    logger.info(`[MonsterSystem] Monster ${monsterId} took ${actualDamage} damage (${monster.currentHP}/${monster.maxHP} HP)`);

    // Emit damage event
    this.world.events.emit('rpg:monster_damaged', {
      monsterId,
      damage: actualDamage,
      currentHP: monster.currentHP,
      maxHP: monster.maxHP,
      attackerId,
    });

    // Check if monster died
    if (monster.currentHP <= 0) {
      this.killMonster(monsterId, attackerId);
    } else {
      // Monster retaliates if not already in combat
      if (monster.state !== 'combat') {
        monster.target = attackerId;
        monster.state = 'combat';
        
        this.monsterCombat.set(monsterId, {
          target: attackerId,
          lastAttack: 0,
          attackCooldown: monsterType.attackSpeed,
          isRetaliating: true,
        });
      }
    }

    return true;
  }

  /**
   * Kill a monster and handle drops
   */
  private killMonster(monsterId: string, killerId: string): void {
    const monster = this.activeMonsters.get(monsterId);
    if (!monster) {
      return;
    }

    const monsterType = this.monsterTypes.get(monster.typeId);
    if (!monsterType) {
      return;
    }

    logger.info(`[MonsterSystem] Monster ${monsterId} (${monsterType.name}) killed by ${killerId}`);

    // Calculate drops
    const drops = this.calculateDrops(monster.typeId, killerId);

    // Grant combat XP to killer
    const combatXP = monsterType.combatXP;
    this.world.events.emit('rpg:xp_gain', {
      playerId: killerId,
      skill: 'attack', // Could be distributed across combat skills
      amount: combatXP,
      source: 'monster_kill',
    });

    // Handle slayer task progression
    this.world.events.emit('rpg:monster_killed', {
      playerId: killerId,
      monsterId,
      typeId: monster.typeId,
    });

    // Emit death event
    this.world.events.emit('rpg:monster_death', {
      monsterId,
      monsterTypeId: monster.typeId,
      monsterName: monsterType.name,
      killerId,
      position: monster.position,
      drops,
      xpGained: combatXP,
    });

    // Give drops to killer
    drops.forEach(drop => {
      this.world.events.emit('rpg:add_item', {
        playerId: killerId,
        itemId: drop.itemId,
        quantity: drop.quantity,
        noted: drop.noted || false,
      });
    });

    // Despawn monster and schedule respawn
    this.despawnMonster(monsterId, true);
  }

  /**
   * Calculate drops for a killed monster
   */
  private calculateDrops(monsterTypeId: string, killerId: string): Drop[] {
    const dropTable = this.dropTables.get(monsterTypeId);
    if (!dropTable) {
      return [];
    }

    const drops: Drop[] = [];

    // Always drops (100% chance)
    dropTable.alwaysDrops.forEach(drop => {
      const quantity = this.rollQuantity(drop.minQuantity, drop.maxQuantity);
      if (quantity > 0) {
        drops.push({
          itemId: drop.itemId,
          quantity,
          noted: drop.noted || false,
        });
      }
    });

    // Common drops
    dropTable.commonDrops.forEach(drop => {
      if (Math.random() < drop.chance) {
        const quantity = this.rollQuantity(drop.minQuantity, drop.maxQuantity);
        if (quantity > 0) {
          drops.push({
            itemId: drop.itemId,
            quantity,
            noted: drop.noted || false,
          });
        }
      }
    });

    // Uncommon drops
    dropTable.uncommonDrops.forEach(drop => {
      if (Math.random() < drop.chance) {
        const quantity = this.rollQuantity(drop.minQuantity, drop.maxQuantity);
        if (quantity > 0) {
          drops.push({
            itemId: drop.itemId,
            quantity,
            noted: drop.noted || false,
          });
        }
      }
    });

    // Rare drops
    dropTable.rareDrops.forEach(drop => {
      if (Math.random() < drop.chance) {
        const quantity = this.rollQuantity(drop.minQuantity, drop.maxQuantity);
        if (quantity > 0) {
          drops.push({
            itemId: drop.itemId,
            quantity,
            noted: drop.noted || false,
          });
        }
      }
    });

    return drops;
  }

  /**
   * Roll quantity between min and max
   */
  private rollQuantity(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Process monster AI for all active monsters
   */
  private processMonsterAI(): void {
    const now = Date.now();

    for (const [monsterId, monster] of this.activeMonsters.entries()) {
      const monsterType = this.monsterTypes.get(monster.typeId);
      if (!monsterType) continue;

      switch (monster.state) {
        case 'idle':
          this.processIdleBehavior(monster, monsterType);
          break;
        case 'wandering':
          this.processWanderingBehavior(monster, monsterType);
          break;
        case 'combat':
          this.processCombatBehavior(monster, monsterType, now);
          break;
        case 'returning':
          this.processReturningBehavior(monster, monsterType);
          break;
      }

      // Check for aggressive behavior
      if (monster.aggressive && monster.state !== 'combat') {
        this.checkAggressiveBehavior(monster, monsterType);
      }
    }
  }

  /**
   * Process idle monster behavior
   */
  private processIdleBehavior(monster: Monster, monsterType: MonsterType): void {
    // Randomly start wandering
    if (Math.random() < 0.1) { // 10% chance to start wandering
      monster.state = 'wandering';
    }
  }

  /**
   * Process wandering monster behavior
   */
  private processWanderingBehavior(monster: Monster, monsterType: MonsterType): void {
    // Randomly return to idle or continue wandering
    if (Math.random() < 0.3) { // 30% chance to return to idle
      monster.state = 'idle';
    }
    // In a real implementation, you would move the monster around its spawn point
  }

  /**
   * Process combat monster behavior
   */
  private processCombatBehavior(monster: Monster, monsterType: MonsterType, now: number): void {
    if (!monster.target) {
      monster.state = 'idle';
      return;
    }

    const combatState = this.monsterCombat.get(monster.id);
    if (!combatState) {
      monster.state = 'idle';
      return;
    }

    // Check if target still exists and is in range
    const target = this.world.entities.players.get(monster.target);
    if (!target) {
      monster.target = null;
      monster.state = 'returning';
      this.monsterCombat.delete(monster.id);
      return;
    }

    // Attack if cooldown is over
    if (now - combatState.lastAttack >= combatState.attackCooldown) {
      this.monsterAttackPlayer(monster, monsterType, monster.target);
      combatState.lastAttack = now;
    }
  }

  /**
   * Process returning monster behavior
   */
  private processReturningBehavior(monster: Monster, monsterType: MonsterType): void {
    // Return to spawn point and go idle
    // In a real implementation, you would move the monster back to its spawn
    monster.state = 'idle';
  }

  /**
   * Check for aggressive behavior towards nearby players
   */
  private checkAggressiveBehavior(monster: Monster, monsterType: MonsterType): void {
    // In a real implementation, you would check for players within attack range
    // For now, we'll skip this as it requires position tracking
  }

  /**
   * Monster attacks a player
   */
  private monsterAttackPlayer(monster: Monster, monsterType: MonsterType, playerId: string): void {
    // Calculate damage
    const maxDamage = Math.floor(monsterType.maxHit);
    const damage = Math.floor(Math.random() * (maxDamage + 1));

    // Emit attack event
    this.world.events.emit('rpg:monster_attack', {
      monsterId: monster.id,
      monsterName: monsterType.name,
      playerId,
      damage,
      attackStyle: monsterType.attackStyle,
    });

    logger.info(`[MonsterSystem] Monster ${monster.id} (${monsterType.name}) attacked player ${playerId} for ${damage} damage`);
  }

  /**
   * Process respawn queue
   */
  private processRespawns(): void {
    const now = Date.now();

    for (const [spawnPointId, respawnTime] of this.respawnQueue.entries()) {
      if (now >= respawnTime) {
        const spawnPoint = this.spawnPoints.get(spawnPointId);
        if (spawnPoint) {
          this.spawnMonster(spawnPoint.monsterTypeId, spawnPoint.position, spawnPointId);
        }
        this.respawnQueue.delete(spawnPointId);
      }
    }
  }

  /**
   * Update monster states
   */
  private updateMonsterStates(delta: number): void {
    // Update any time-based state changes
    for (const [monsterId, monster] of this.activeMonsters.entries()) {
      // Regenerate HP over time if not in combat
      if (monster.state !== 'combat' && monster.currentHP < monster.maxHP) {
        const regenRate = Math.max(1, Math.floor(monster.maxHP / 100)); // 1% per tick
        monster.currentHP = Math.min(monster.maxHP, monster.currentHP + regenRate);
      }
    }
  }

  /**
   * Initialize spawn points
   */
  private initializeSpawnPoints(): void {
    // Lumbridge area spawns
    this.spawnPoints.set('lumbridge_cow_1', {
      id: 'lumbridge_cow_1',
      monsterTypeId: 'cow',
      position: { x: 100, y: 0, z: 100 },
      region: 'Lumbridge',
      isActive: true,
    });

    this.spawnPoints.set('lumbridge_chicken_1', {
      id: 'lumbridge_chicken_1',
      monsterTypeId: 'chicken',
      position: { x: 105, y: 0, z: 105 },
      region: 'Lumbridge',
      isActive: true,
    });

    // Varrock sewers
    this.spawnPoints.set('varrock_rat_1', {
      id: 'varrock_rat_1',
      monsterTypeId: 'giant_rat',
      position: { x: 200, y: -10, z: 200 },
      region: 'Varrock Sewers',
      isActive: true,
    });

    // Edgeville dungeon
    this.spawnPoints.set('edgeville_skeleton_1', {
      id: 'edgeville_skeleton_1',
      monsterTypeId: 'skeleton',
      position: { x: 300, y: -20, z: 300 },
      region: 'Edgeville Dungeon',
      isActive: true,
    });

    // Spawn initial monsters
    for (const [spawnPointId, spawnPoint] of this.spawnPoints.entries()) {
      if (spawnPoint.isActive) {
        this.spawnMonster(spawnPoint.monsterTypeId, spawnPoint.position, spawnPointId);
      }
    }
  }

  /**
   * Initialize monster data
   */
  private initializeMonsterData(): void {
    // Low level monsters
    this.monsterTypes.set('chicken', {
      id: 'chicken',
      name: 'Chicken',
      combatLevel: 1,
      hitpoints: 3,
      maxHit: 1,
      attackSpeed: 4000, // 4 seconds
      attackStyle: 'melee',
      stats: {
        attack: 1,
        strength: 1,
        defence: 1,
        magic: 1,
        ranged: 1,
      },
      aggressive: false,
      attackRange: 1,
      wanderRadius: 5,
      respawnTime: 30000, // 30 seconds
      combatXP: 2,
      slayerLevelRequired: 0,
      slayerXP: 0,
    });

    this.monsterTypes.set('cow', {
      id: 'cow',
      name: 'Cow',
      combatLevel: 2,
      hitpoints: 8,
      maxHit: 1,
      attackSpeed: 4000,
      attackStyle: 'melee',
      stats: {
        attack: 1,
        strength: 1,
        defence: 1,
        magic: 1,
        ranged: 1,
      },
      aggressive: false,
      attackRange: 1,
      wanderRadius: 10,
      respawnTime: 45000, // 45 seconds
      combatXP: 4,
      slayerLevelRequired: 0,
      slayerXP: 0,
    });

    this.monsterTypes.set('giant_rat', {
      id: 'giant_rat',
      name: 'Giant rat',
      combatLevel: 6,
      hitpoints: 5,
      maxHit: 2,
      attackSpeed: 3000,
      attackStyle: 'melee',
      stats: {
        attack: 4,
        strength: 4,
        defence: 2,
        magic: 1,
        ranged: 1,
      },
      aggressive: true,
      attackRange: 1,
      wanderRadius: 8,
      respawnTime: 60000, // 1 minute
      combatXP: 6,
      slayerLevelRequired: 0,
      slayerXP: 0,
    });

    // Medium level monsters
    this.monsterTypes.set('skeleton', {
      id: 'skeleton',
      name: 'Skeleton',
      combatLevel: 25,
      hitpoints: 22,
      maxHit: 4,
      attackSpeed: 4000,
      attackStyle: 'melee',
      stats: {
        attack: 20,
        strength: 18,
        defence: 15,
        magic: 1,
        ranged: 1,
      },
      aggressive: true,
      attackRange: 1,
      wanderRadius: 6,
      respawnTime: 120000, // 2 minutes
      combatXP: 25,
      slayerLevelRequired: 0,
      slayerXP: 0,
    });

    this.monsterTypes.set('goblin', {
      id: 'goblin',
      name: 'Goblin',
      combatLevel: 5,
      hitpoints: 5,
      maxHit: 1,
      attackSpeed: 4000,
      attackStyle: 'melee',
      stats: {
        attack: 3,
        strength: 3,
        defence: 2,
        magic: 1,
        ranged: 1,
      },
      aggressive: false,
      attackRange: 1,
      wanderRadius: 12,
      respawnTime: 30000,
      combatXP: 5,
      slayerLevelRequired: 0,
      slayerXP: 0,
    });

    // Slayer monsters
    this.monsterTypes.set('cave_crawler', {
      id: 'cave_crawler',
      name: 'Cave crawler',
      combatLevel: 53,
      hitpoints: 35,
      maxHit: 5,
      attackSpeed: 4000,
      attackStyle: 'melee',
      stats: {
        attack: 40,
        strength: 35,
        defence: 30,
        magic: 1,
        ranged: 1,
      },
      aggressive: true,
      attackRange: 1,
      wanderRadius: 5,
      respawnTime: 180000, // 3 minutes
      combatXP: 50,
      slayerLevelRequired: 10,
      slayerXP: 23,
    });

    this.monsterTypes.set('abyssal_demon', {
      id: 'abyssal_demon',
      name: 'Abyssal demon',
      combatLevel: 124,
      hitpoints: 150,
      maxHit: 8,
      attackSpeed: 4000,
      attackStyle: 'melee',
      stats: {
        attack: 90,
        strength: 85,
        defence: 75,
        magic: 1,
        ranged: 1,
      },
      aggressive: true,
      attackRange: 1,
      wanderRadius: 3,
      respawnTime: 300000, // 5 minutes
      combatXP: 150,
      slayerLevelRequired: 85,
      slayerXP: 300,
    });

    // Initialize drop tables
    this.initializeDropTables();
  }

  /**
   * Initialize drop tables
   */
  private initializeDropTables(): void {
    // Chicken drops
    this.dropTables.set('chicken', {
      alwaysDrops: [
        { itemId: 526, minQuantity: 1, maxQuantity: 1 }, // Bones
      ],
      commonDrops: [
        { itemId: 314, minQuantity: 1, maxQuantity: 1, chance: 1.0 }, // Raw chicken
        { itemId: 2138, minQuantity: 5, maxQuantity: 25, chance: 0.15 }, // Feathers
      ],
      uncommonDrops: [],
      rareDrops: [],
    });

    // Cow drops
    this.dropTables.set('cow', {
      alwaysDrops: [
        { itemId: 526, minQuantity: 1, maxQuantity: 1 }, // Bones
      ],
      commonDrops: [
        { itemId: 2132, minQuantity: 1, maxQuantity: 1, chance: 1.0 }, // Raw beef
        { itemId: 1739, minQuantity: 1, maxQuantity: 1, chance: 1.0 }, // Cowhide
      ],
      uncommonDrops: [],
      rareDrops: [],
    });

    // Giant rat drops
    this.dropTables.set('giant_rat', {
      alwaysDrops: [
        { itemId: 526, minQuantity: 1, maxQuantity: 1 }, // Bones
      ],
      commonDrops: [
        { itemId: 2134, minQuantity: 1, maxQuantity: 1, chance: 0.5 }, // Raw rat meat
      ],
      uncommonDrops: [
        { itemId: 995, minQuantity: 1, maxQuantity: 3, chance: 0.1 }, // Coins
      ],
      rareDrops: [],
    });

    // Skeleton drops
    this.dropTables.set('skeleton', {
      alwaysDrops: [
        { itemId: 526, minQuantity: 1, maxQuantity: 1 }, // Bones
      ],
      commonDrops: [
        { itemId: 995, minQuantity: 5, maxQuantity: 25, chance: 0.3 }, // Coins
      ],
      uncommonDrops: [
        { itemId: 1277, minQuantity: 1, maxQuantity: 1, chance: 0.02 }, // Bronze sword
        { itemId: 1155, minQuantity: 1, maxQuantity: 1, chance: 0.01 }, // Bronze dagger
      ],
      rareDrops: [],
    });

    // Abyssal demon drops (high value)
    this.dropTables.set('abyssal_demon', {
      alwaysDrops: [
        { itemId: 592, minQuantity: 1, maxQuantity: 1 }, // Ashes
      ],
      commonDrops: [
        { itemId: 995, minQuantity: 100, maxQuantity: 500, chance: 0.8 }, // Coins
        { itemId: 563, minQuantity: 50, maxQuantity: 150, chance: 0.3 }, // Water runes
        { itemId: 560, minQuantity: 50, maxQuantity: 150, chance: 0.3 }, // Death runes
      ],
      uncommonDrops: [
        { itemId: 1149, minQuantity: 1, maxQuantity: 1, chance: 0.05 }, // Dragon dagger
        { itemId: 4587, minQuantity: 1, maxQuantity: 1, chance: 0.02 }, // Dragon scimitar
      ],
      rareDrops: [
        { itemId: 4151, minQuantity: 1, maxQuantity: 1, chance: 0.008 }, // Abyssal whip
      ],
    });
  }

  // Event handlers
  private handleAttackMonster(data: { playerId: string, monsterId: string }): void {
    this.attackMonster(data.playerId, data.monsterId);
  }

  private handleMonsterDeath(data: { monsterId: string }): void {
    // Death is handled internally by killMonster method
  }

  private handleSpawnMonster(data: { monsterTypeId: string, position: { x: number, y: number, z: number }, spawnPointId?: string }): void {
    this.spawnMonster(data.monsterTypeId, data.position, data.spawnPointId);
  }

  private handleDespawnMonster(data: { monsterId: string, scheduleRespawn?: boolean }): void {
    this.despawnMonster(data.monsterId, data.scheduleRespawn || false);
  }

  // Getters for external systems
  getMonsterTypes(): Map<string, MonsterType> {
    return new Map(this.monsterTypes);
  }

  getActiveMonsters(): Map<string, Monster> {
    return new Map(this.activeMonsters);
  }

  getMonster(monsterId: string): Monster | null {
    return this.activeMonsters.get(monsterId) || null;
  }

  getMonstersByType(typeId: string): Monster[] {
    return Array.from(this.activeMonsters.values()).filter(m => m.typeId === typeId);
  }

  getMonstersByRegion(region: string): Monster[] {
    const monstersInRegion: Monster[] = [];
    
    for (const monster of this.activeMonsters.values()) {
      if (monster.spawnPointId) {
        const spawnPoint = this.spawnPoints.get(monster.spawnPointId);
        if (spawnPoint && spawnPoint.region === region) {
          monstersInRegion.push(monster);
        }
      }
    }
    
    return monstersInRegion;
  }

  // Validation methods
  canAttackMonster(playerId: string, monsterId: string): { canAttack: boolean, reason?: string } {
    const monster = this.activeMonsters.get(monsterId);
    if (!monster) {
      return { canAttack: false, reason: 'Monster not found' };
    }

    if (monster.currentHP <= 0) {
      return { canAttack: false, reason: 'Monster is already dead' };
    }

    const monsterType = this.monsterTypes.get(monster.typeId);
    if (!monsterType) {
      return { canAttack: false, reason: 'Monster type not found' };
    }

    // Check slayer requirements
    if (monsterType.slayerLevelRequired > 0) {
      const slayerSystem = this.world.systems?.find((s: any) => s.name === 'SlayerSystem');
      if (slayerSystem && !slayerSystem.canDamageMonster(playerId, monster.typeId)) {
        return { canAttack: false, reason: `Requires ${monsterType.slayerLevelRequired} Slayer` };
      }
    }

    return { canAttack: true };
  }
}

// Type definitions
interface MonsterType {
  id: string;
  name: string;
  combatLevel: number;
  hitpoints: number;
  maxHit: number;
  attackSpeed: number;
  attackStyle: 'melee' | 'ranged' | 'magic';
  stats: {
    attack: number;
    strength: number;
    defence: number;
    magic: number;
    ranged: number;
  };
  aggressive: boolean;
  attackRange: number;
  wanderRadius: number;
  respawnTime: number;
  combatXP: number;
  slayerLevelRequired: number;
  slayerXP: number;
}

interface Monster {
  id: string;
  typeId: string;
  position: { x: number, y: number, z: number };
  spawnPointId: string | null;
  currentHP: number;
  maxHP: number;
  state: 'idle' | 'wandering' | 'combat' | 'returning';
  target: string | null;
  lastAction: number;
  spawnTime: number;
  combatLevel: number;
  stats: {
    attack: number;
    strength: number;
    defence: number;
    magic: number;
    ranged: number;
  };
  aggressive: boolean;
  attackRange: number;
  wanderRadius: number;
  respawnTime: number;
}

interface MonsterCombatState {
  target: string;
  lastAttack: number;
  attackCooldown: number;
  isRetaliating: boolean;
}

interface SpawnPoint {
  id: string;
  monsterTypeId: string;
  position: { x: number, y: number, z: number };
  region: string;
  isActive: boolean;
}

interface DropTable {
  alwaysDrops: DropEntry[];
  commonDrops: DropEntry[];
  uncommonDrops: DropEntry[];
  rareDrops: DropEntry[];
}

interface DropEntry {
  itemId: number;
  minQuantity: number;
  maxQuantity: number;
  chance?: number;
  noted?: boolean;
}

interface Drop {
  itemId: number;
  quantity: number;
  noted: boolean;
}