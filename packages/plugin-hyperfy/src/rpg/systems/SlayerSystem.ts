/**
 * RuneScape Slayer System Implementation
 * ====================================
 * Handles slayer masters, monster assignments, and slayer-specific mechanics
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';
import type { StatsComponent } from '../types/stats';
import type { InventoryComponent } from '../types/inventory';

export class SlayerSystem implements HyperfySystem {
  name = 'SlayerSystem';
  world: HyperfyWorld;
  enabled = true;

  // Slayer data
  private slayerMasters: Map<string, SlayerMaster> = new Map();
  private slayerMonsters: Map<string, SlayerMonster> = new Map();
  private slayerAssignments: Map<string, SlayerAssignment> = new Map();
  private slayerTasks: Map<string, SlayerTask> = new Map();

  // Active slayer actions
  private activeSlayerActions: Map<string, SlayerAction> = new Map();

  // Tick tracking
  private tickCounter = 0;
  private lastTickTime = 0;

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.initializeSlayerData();
    logger.info('[SlayerSystem] Initialized RuneScape slayer mechanics');
  }

  async init(): Promise<void> {
    logger.info('[SlayerSystem] Starting slayer system...');
    
    // Subscribe to slayer events
    this.world.events.on('rpg:get_slayer_task', this.handleGetSlayerTask.bind(this));
    this.world.events.on('rpg:cancel_slayer_task', this.handleCancelSlayerTask.bind(this));
    this.world.events.on('rpg:complete_slayer_kill', this.handleCompleteSlayerKill.bind(this));
    this.world.events.on('rpg:check_slayer_task', this.handleCheckSlayerTask.bind(this));
    this.world.events.on('rpg:monster_killed', this.handleMonsterKilled.bind(this));
  }

  tick(delta: number): void {
    const now = Date.now();
    
    // Process slayer ticks (every 600ms like RuneScape)
    if (now - this.lastTickTime >= 600) {
      this.processSlayerTick();
      this.lastTickTime = now;
      this.tickCounter++;
    }
    
    // Update slayer actions
    this.updateSlayerActions(delta);
  }

  destroy(): void {
    this.world.events.off('rpg:get_slayer_task');
    this.world.events.off('rpg:cancel_slayer_task');
    this.world.events.off('rpg:complete_slayer_kill');
    this.world.events.off('rpg:check_slayer_task');
    this.world.events.off('rpg:monster_killed');
    logger.info('[SlayerSystem] Slayer system destroyed');
  }

  /**
   * Get a new slayer task from a slayer master
   */
  getSlayerTask(playerId: string, masterId: string): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[SlayerSystem] Player ${playerId} not found`);
      return false;
    }

    const master = this.slayerMasters.get(masterId);
    if (!master) {
      logger.warn(`[SlayerSystem] Slayer master ${masterId} not found`);
      return false;
    }

    // Check slayer level requirement
    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.slayer.level < master.levelRequired) {
      logger.info(`[SlayerSystem] Player ${playerId} needs slayer level ${master.levelRequired} for ${master.name}`);
      return false;
    }

    // Check if player already has a task
    if (this.slayerTasks.has(playerId)) {
      logger.info(`[SlayerSystem] Player ${playerId} already has a slayer task`);
      return false;
    }

    // Get appropriate assignment based on player level
    const assignment = this.getRandomAssignment(master, stats.slayer.level, stats.combat.level);
    if (!assignment) {
      logger.warn(`[SlayerSystem] No suitable assignment found for player ${playerId}`);
      return false;
    }

    // Create slayer task
    const task: SlayerTask = {
      playerId,
      masterId,
      assignmentId: assignment.id,
      monstersAssigned: assignment.amount,
      monstersKilled: 0,
      assignedTime: Date.now(),
      slayerPoints: assignment.slayerPoints,
      completed: false,
    };

    this.slayerTasks.set(playerId, task);

    logger.info(`[SlayerSystem] ${playerId} received task: Kill ${assignment.amount} ${assignment.name} from ${master.name}`);

    // Emit task assigned event
    this.world.events.emit('rpg:slayer_task_assigned', {
      playerId,
      masterId,
      masterName: master.name,
      assignmentId: assignment.id,
      monsterName: assignment.name,
      amount: assignment.amount,
      slayerPoints: assignment.slayerPoints,
    });

    return true;
  }

  /**
   * Cancel current slayer task
   */
  cancelSlayerTask(playerId: string): boolean {
    const task = this.slayerTasks.get(playerId);
    if (!task) {
      logger.info(`[SlayerSystem] Player ${playerId} has no slayer task to cancel`);
      return false;
    }

    const master = this.slayerMasters.get(task.masterId);
    const assignment = this.slayerAssignments.get(task.assignmentId);

    this.slayerTasks.delete(playerId);

    logger.info(`[SlayerSystem] ${playerId} cancelled slayer task: ${assignment?.name || 'Unknown'}`);

    // Emit task cancelled event
    this.world.events.emit('rpg:slayer_task_cancelled', {
      playerId,
      masterId: task.masterId,
      masterName: master?.name || 'Unknown',
      assignmentId: task.assignmentId,
      monsterName: assignment?.name || 'Unknown',
      progress: `${task.monstersKilled}/${task.monstersAssigned}`,
    });

    return true;
  }

  /**
   * Handle monster kill for slayer task progress
   */
  handleMonsterKill(playerId: string, monsterId: string): void {
    const task = this.slayerTasks.get(playerId);
    if (!task || task.completed) {
      return; // No active task or already completed
    }

    const assignment = this.slayerAssignments.get(task.assignmentId);
    if (!assignment) {
      return;
    }

    // Check if killed monster matches assignment
    if (!assignment.monsterIds.includes(monsterId)) {
      return; // Not the assigned monster
    }

    // Increment kill count
    task.monstersKilled++;

    // Check if task is complete
    if (task.monstersKilled >= task.monstersAssigned) {
      this.completeSlayerTask(playerId);
    } else {
      // Emit progress event
      this.world.events.emit('rpg:slayer_task_progress', {
        playerId,
        assignmentId: task.assignmentId,
        monsterName: assignment.name,
        killed: task.monstersKilled,
        assigned: task.monstersAssigned,
        remaining: task.monstersAssigned - task.monstersKilled,
      });
    }
  }

  /**
   * Complete slayer task
   */
  private completeSlayerTask(playerId: string): void {
    const task = this.slayerTasks.get(playerId);
    if (!task) {
      return;
    }

    const master = this.slayerMasters.get(task.masterId);
    const assignment = this.slayerAssignments.get(task.assignmentId);

    if (!master || !assignment) {
      return;
    }

    // Grant slayer XP
    this.grantSlayerXP(playerId, assignment.slayerXP);

    // Award slayer points
    this.awardSlayerPoints(playerId, task.slayerPoints);

    // Mark task as completed
    task.completed = true;

    logger.info(`[SlayerSystem] ${playerId} completed slayer task: ${assignment.name} (${task.slayerPoints} points, ${assignment.slayerXP} XP)`);

    // Emit task completed event
    this.world.events.emit('rpg:slayer_task_completed', {
      playerId,
      masterId: task.masterId,
      masterName: master.name,
      assignmentId: task.assignmentId,
      monsterName: assignment.name,
      slayerXP: assignment.slayerXP,
      slayerPoints: task.slayerPoints,
      completionTime: Date.now() - task.assignedTime,
    });

    // Remove task after completion
    this.slayerTasks.delete(playerId);
  }

  /**
   * Get random assignment from slayer master
   */
  private getRandomAssignment(master: SlayerMaster, slayerLevel: number, combatLevel: number): SlayerAssignment | null {
    // Filter assignments by level requirements
    const availableAssignments = master.assignments.filter(assignmentId => {
      const assignment = this.slayerAssignments.get(assignmentId);
      if (!assignment) return false;
      
      return slayerLevel >= assignment.slayerLevelRequired && 
             combatLevel >= assignment.combatLevelRequired;
    });

    if (availableAssignments.length === 0) {
      return null;
    }

    // Get assignment with weighted random selection
    const totalWeight = availableAssignments.reduce((sum, assignmentId) => {
      const assignment = this.slayerAssignments.get(assignmentId);
      return sum + (assignment?.weight || 1);
    }, 0);

    let random = Math.random() * totalWeight;
    
    for (const assignmentId of availableAssignments) {
      const assignment = this.slayerAssignments.get(assignmentId);
      if (!assignment) continue;
      
      random -= assignment.weight;
      if (random <= 0) {
        return assignment;
      }
    }

    // Fallback to first available assignment
    const fallbackId = availableAssignments[0];
    return this.slayerAssignments.get(fallbackId) || null;
  }

  /**
   * Check if player can damage monster (slayer level requirement)
   */
  canDamageMonster(playerId: string, monsterId: string): boolean {
    const monster = this.slayerMonsters.get(monsterId);
    if (!monster) {
      return true; // Non-slayer monster
    }

    const stats = this.getPlayerStats(playerId);
    if (!stats) {
      return false;
    }

    // Check slayer level requirement
    if (stats.slayer.level < monster.slayerLevelRequired) {
      return false;
    }

    // Check if monster requires specific task
    if (monster.requiresTask) {
      const task = this.slayerTasks.get(playerId);
      if (!task || task.completed) {
        return false;
      }

      const assignment = this.slayerAssignments.get(task.assignmentId);
      if (!assignment || !assignment.monsterIds.includes(monsterId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if player has required slayer gear for monster
   */
  hasRequiredSlayerGear(playerId: string, monsterId: string): boolean {
    const monster = this.slayerMonsters.get(monsterId);
    if (!monster || !monster.requiredGear) {
      return true; // No special gear required
    }

    const inventory = this.getPlayerInventory(playerId);
    if (!inventory) {
      return false;
    }

    // Check equipped items
    for (const gearId of monster.requiredGear) {
      let hasGear = false;
      
      // Check equipment slots
      for (const slot of Object.values(inventory.equipment)) {
        if (slot && slot.itemId === gearId) {
          hasGear = true;
          break;
        }
      }
      
      // Check inventory
      if (!hasGear) {
        for (const item of inventory.items) {
          if (item && item.itemId === gearId) {
            hasGear = true;
            break;
          }
        }
      }
      
      if (!hasGear) {
        return false;
      }
    }

    return true;
  }

  /**
   * Award slayer points to player
   */
  private awardSlayerPoints(playerId: string, points: number): void {
    // This would typically update a slayer points tracking system
    this.world.events.emit('rpg:slayer_points_awarded', {
      playerId,
      points,
    });
  }

  /**
   * Grant slayer XP
   */
  private grantSlayerXP(playerId: string, amount: number): void {
    this.world.events.emit('rpg:xp_gain', {
      playerId,
      skill: 'slayer',
      amount,
      source: 'slayer',
    });
  }

  /**
   * Update active slayer actions
   */
  private updateSlayerActions(delta: number): void {
    // Handle any ongoing slayer actions
  }

  /**
   * Process slayer tick
   */
  private processSlayerTick(): void {
    // Handle any tick-based slayer mechanics
  }

  /**
   * Initialize slayer data
   */
  private initializeSlayerData(): void {
    // Initialize slayer masters
    this.initializeSlayerMasters();
    
    // Initialize slayer monsters
    this.initializeSlayerMonsters();
    
    // Initialize slayer assignments
    this.initializeSlayerAssignments();

    logger.info(`[SlayerSystem] Loaded ${this.slayerMasters.size} slayer masters, ${this.slayerMonsters.size} slayer monsters, ${this.slayerAssignments.size} assignments`);
  }

  /**
   * Initialize slayer masters
   */
  private initializeSlayerMasters(): void {
    const masters: SlayerMaster[] = [
      // Turael (Level 1)
      {
        id: 'turael',
        name: 'Turael',
        location: 'Burthorpe',
        levelRequired: 1,
        assignments: [
          'birds', 'bats', 'rats', 'spiders', 'wolves', 'bears', 'goblins',
          'cows', 'monkeys', 'skeletons', 'zombies', 'dwarves'
        ],
        description: 'The easiest slayer master, suitable for beginners',
      },

      // Mazchna (Level 20)
      {
        id: 'mazchna',
        name: 'Mazchna',
        location: 'Canifis',
        levelRequired: 20,
        assignments: [
          'bats', 'bears', 'birds', 'cave_crawlers', 'cows', 'crawling_hands',
          'desert_lizards', 'dogs', 'dwarves', 'ghouls', 'goblins', 'hill_giants',
          'hobgoblins', 'ice_warriors', 'kalphite', 'monkeys', 'rats', 'rockslugs',
          'skeletons', 'spiders', 'wolves', 'zombies'
        ],
        description: 'A mid-level slayer master with moderate assignments',
      },

      // Vannaka (Level 40)
      {
        id: 'vannaka',
        name: 'Vannaka',
        location: 'Edgeville Dungeon',
        levelRequired: 40,
        assignments: [
          'aberrant_spectres', 'banshees', 'basilisks', 'bloodvelds', 'blue_dragons',
          'brine_rats', 'bronze_dragons', 'cave_crawlers', 'cave_horrors',
          'cockatrices', 'crawling_hands', 'crocodiles', 'dagannoth', 'dust_devils',
          'earth_warriors', 'elves', 'fever_spiders', 'fire_giants', 'gargoyles',
          'green_dragons', 'harpie_bug_swarms', 'hill_giants', 'hobgoblins',
          'ice_giants', 'ice_warriors', 'infernal_mages', 'iron_dragons',
          'jellies', 'jungle_horrors', 'kalphite', 'killerwatts', 'kurask',
          'lesser_demons', 'mogres', 'molanisks', 'moss_giants', 'nechryael',
          'ogres', 'otherworldly_beings', 'pyrefiends', 'rockslugs', 'shadow_warriors',
          'spiritual_mages', 'spiritual_rangers', 'spiritual_warriors', 'steel_dragons',
          'suqahs', 'terror_dogs', 'trolls', 'turoths', 'wall_beasts', 'waterfiends'
        ],
        description: 'A challenging slayer master for experienced players',
      },

      // Chaeldar (Level 70)
      {
        id: 'chaeldar',
        name: 'Chaeldar',
        location: 'Zanaris',
        levelRequired: 70,
        assignments: [
          'aberrant_spectres', 'abyssal_demons', 'banshees', 'basilisks', 'black_demons',
          'black_dragons', 'bloodvelds', 'blue_dragons', 'bronze_dragons', 'cave_horrors',
          'dagannoth', 'dark_beasts', 'dust_devils', 'elves', 'fire_giants', 'gargoyles',
          'greater_demons', 'hellhounds', 'iron_dragons', 'kalphite', 'kraken', 'kurask',
          'metal_dragons', 'mithril_dragons', 'nechryael', 'spiritual_creatures',
          'steel_dragons', 'suqahs', 'trolls', 'turoths', 'waterfiends'
        ],
        description: 'A high-level slayer master with dangerous assignments',
      },

      // Nieve (Level 85)
      {
        id: 'nieve',
        name: 'Nieve',
        location: 'Tree Gnome Stronghold',
        levelRequired: 85,
        assignments: [
          'abyssal_demons', 'black_demons', 'black_dragons', 'bloodvelds', 'cave_kraken',
          'dagannoth', 'dark_beasts', 'fire_giants', 'gargoyles', 'greater_demons',
          'hellhounds', 'iron_dragons', 'kalphite', 'kraken', 'mithril_dragons',
          'nechryael', 'rune_dragons', 'smoke_devils', 'spiritual_creatures',
          'steel_dragons', 'suqahs', 'trolls', 'waterfiends'
        ],
        description: 'The highest level slayer master with the most challenging tasks',
      },
    ];

    masters.forEach(master => {
      this.slayerMasters.set(master.id, master);
    });
  }

  /**
   * Initialize slayer monsters
   */
  private initializeSlayerMonsters(): void {
    const monsters: SlayerMonster[] = [
      // Basic slayer monsters
      {
        id: 'cave_crawler',
        name: 'Cave crawler',
        slayerLevelRequired: 10,
        combatLevel: 53,
        hitpoints: 50,
        requiresTask: false,
        weakness: 'stab',
        location: 'Fremennik Slayer Dungeon',
      },

      {
        id: 'rockslug',
        name: 'Rockslug',
        slayerLevelRequired: 20,
        combatLevel: 42,
        hitpoints: 50,
        requiresTask: false,
        weakness: 'crush',
        location: 'Fremennik Slayer Dungeon',
        specialMechanic: 'Must be finished with bag of salt when below 5 HP',
        requiredGear: [4161], // Bag of salt
      },

      {
        id: 'cockatrice',
        name: 'Cockatrice',
        slayerLevelRequired: 25,
        combatLevel: 37,
        hitpoints: 35,
        requiresTask: false,
        weakness: 'stab',
        location: 'Fremennik Slayer Dungeon',
        specialMechanic: 'Requires mirror shield to avoid stat drain',
        requiredGear: [4156], // Mirror shield
      },

      {
        id: 'basilisk',
        name: 'Basilisk',
        slayerLevelRequired: 40,
        combatLevel: 61,
        hitpoints: 75,
        requiresTask: false,
        weakness: 'stab',
        location: 'Fremennik Slayer Dungeon',
        specialMechanic: 'Requires mirror shield to avoid being turned to stone',
        requiredGear: [4156], // Mirror shield
      },

      {
        id: 'kurask',
        name: 'Kurask',
        slayerLevelRequired: 70,
        combatLevel: 106,
        hitpoints: 97,
        requiresTask: true,
        weakness: 'stab',
        location: 'Fremennik Slayer Dungeon',
        specialMechanic: 'Can only be damaged by leaf-bladed weapons',
        requiredGear: [4158, 11902], // Leaf-bladed spear, Leaf-bladed sword
      },

      {
        id: 'turoth',
        name: 'Turoth',
        slayerLevelRequired: 55,
        combatLevel: 83,
        hitpoints: 76,
        requiresTask: true,
        weakness: 'stab',
        location: 'Fremennik Slayer Dungeon',
        specialMechanic: 'Can only be damaged by leaf-bladed weapons',
        requiredGear: [4158, 11902], // Leaf-bladed spear, Leaf-bladed sword
      },

      // Mid-level slayer monsters
      {
        id: 'banshee',
        name: 'Banshee',
        slayerLevelRequired: 15,
        combatLevel: 23,
        hitpoints: 22,
        requiresTask: false,
        weakness: 'crush',
        location: 'Slayer Tower',
        specialMechanic: 'Requires earmuffs to avoid stat drain',
        requiredGear: [4166], // Earmuffs
      },

      {
        id: 'aberrant_spectre',
        name: 'Aberrant spectre',
        slayerLevelRequired: 60,
        combatLevel: 96,
        hitpoints: 90,
        requiresTask: false,
        weakness: 'stab',
        location: 'Slayer Tower',
        specialMechanic: 'Requires nose peg to avoid poison damage',
        requiredGear: [4168], // Nose peg
      },

      {
        id: 'gargoyle',
        name: 'Gargoyle',
        slayerLevelRequired: 75,
        combatLevel: 111,
        hitpoints: 105,
        requiresTask: true,
        weakness: 'crush',
        location: 'Slayer Tower',
        specialMechanic: 'Must be finished with rock hammer when below 9 HP',
        requiredGear: [4162], // Rock hammer
      },

      {
        id: 'nechryael',
        name: 'Nechryael',
        slayerLevelRequired: 80,
        combatLevel: 115,
        hitpoints: 105,
        requiresTask: true,
        weakness: 'crush',
        location: 'Slayer Tower',
        specialMechanic: 'Spawns death spawns when killed',
      },

      // High-level slayer monsters
      {
        id: 'abyssal_demon',
        name: 'Abyssal demon',
        slayerLevelRequired: 85,
        combatLevel: 124,
        hitpoints: 150,
        requiresTask: true,
        weakness: 'stab',
        location: 'Slayer Tower',
        specialMechanic: 'Can teleport and has high magic defence',
        rareDrops: [4151], // Abyssal whip
      },

      {
        id: 'dark_beast',
        name: 'Dark beast',
        slayerLevelRequired: 90,
        combatLevel: 182,
        hitpoints: 220,
        requiresTask: true,
        weakness: 'bolt',
        location: 'Temple of Light',
        specialMechanic: 'Very high combat stats and magic attacks',
        rareDrops: [11235], // Dark bow
      },

      // Boss-level slayer monsters
      {
        id: 'kraken',
        name: 'Kraken',
        slayerLevelRequired: 87,
        combatLevel: 291,
        hitpoints: 255,
        requiresTask: true,
        weakness: 'bolt',
        location: 'Kraken Cove',
        specialMechanic: 'Instance boss with tentacle mechanics',
        rareDrops: [12002, 12004], // Trident pieces
      },

      {
        id: 'smoke_devil',
        name: 'Thermonuclear smoke devil',
        slayerLevelRequired: 93,
        combatLevel: 301,
        hitpoints: 240,
        requiresTask: true,
        weakness: 'water_spells',
        location: 'Smoke Devil Dungeon',
        specialMechanic: 'Instance boss with smoke cloud attacks',
        rareDrops: [12004], // Smoke battlestaff
      },
    ];

    monsters.forEach(monster => {
      this.slayerMonsters.set(monster.id, monster);
    });
  }

  /**
   * Initialize slayer assignments
   */
  private initializeSlayerAssignments(): void {
    const assignments: SlayerAssignment[] = [
      // Turael assignments
      {
        id: 'birds',
        name: 'Birds',
        monsterIds: ['chicken', 'seagull', 'duck'],
        amount: 15,
        slayerLevelRequired: 1,
        combatLevelRequired: 1,
        slayerXP: 20,
        slayerPoints: 0, // Turael gives no points
        weight: 20,
      },
      {
        id: 'bats',
        name: 'Bats',
        monsterIds: ['bat', 'giant_bat'],
        amount: 15,
        slayerLevelRequired: 1,
        combatLevelRequired: 1,
        slayerXP: 25,
        slayerPoints: 0,
        weight: 15,
      },
      {
        id: 'rats',
        name: 'Rats',
        monsterIds: ['rat', 'giant_rat'],
        amount: 15,
        slayerLevelRequired: 1,
        combatLevelRequired: 1,
        slayerXP: 20,
        slayerPoints: 0,
        weight: 15,
      },

      // Low-level assignments
      {
        id: 'cave_crawlers',
        name: 'Cave crawlers',
        monsterIds: ['cave_crawler'],
        amount: 110,
        slayerLevelRequired: 10,
        combatLevelRequired: 40,
        slayerXP: 105,
        slayerPoints: 15,
        weight: 12,
      },
      {
        id: 'rockslugs',
        name: 'Rockslugs',
        monsterIds: ['rockslug'],
        amount: 140,
        slayerLevelRequired: 20,
        combatLevelRequired: 40,
        slayerXP: 125,
        slayerPoints: 15,
        weight: 12,
      },
      {
        id: 'cockatrices',
        name: 'Cockatrices',
        monsterIds: ['cockatrice'],
        amount: 130,
        slayerLevelRequired: 25,
        combatLevelRequired: 40,
        slayerXP: 115,
        slayerPoints: 15,
        weight: 10,
      },

      // Mid-level assignments
      {
        id: 'basilisks',
        name: 'Basilisks',
        monsterIds: ['basilisk'],
        amount: 140,
        slayerLevelRequired: 40,
        combatLevelRequired: 60,
        slayerXP: 150,
        slayerPoints: 20,
        weight: 10,
      },
      {
        id: 'banshees',
        name: 'Banshees',
        monsterIds: ['banshee'],
        amount: 130,
        slayerLevelRequired: 15,
        combatLevelRequired: 30,
        slayerXP: 85,
        slayerPoints: 15,
        weight: 12,
      },
      {
        id: 'turoths',
        name: 'Turoths',
        monsterIds: ['turoth'],
        amount: 130,
        slayerLevelRequired: 55,
        combatLevelRequired: 75,
        slayerXP: 180,
        slayerPoints: 25,
        weight: 10,
      },
      {
        id: 'kurask',
        name: 'Kurask',
        monsterIds: ['kurask'],
        amount: 130,
        slayerLevelRequired: 70,
        combatLevelRequired: 90,
        slayerXP: 220,
        slayerPoints: 30,
        weight: 12,
      },

      // High-level assignments
      {
        id: 'aberrant_spectres',
        name: 'Aberrant spectres',
        monsterIds: ['aberrant_spectre'],
        amount: 160,
        slayerLevelRequired: 60,
        combatLevelRequired: 80,
        slayerXP: 200,
        slayerPoints: 25,
        weight: 14,
      },
      {
        id: 'gargoyles',
        name: 'Gargoyles',
        monsterIds: ['gargoyle'],
        amount: 150,
        slayerLevelRequired: 75,
        combatLevelRequired: 95,
        slayerXP: 250,
        slayerPoints: 30,
        weight: 12,
      },
      {
        id: 'nechryael',
        name: 'Nechryael',
        monsterIds: ['nechryael'],
        amount: 110,
        slayerLevelRequired: 80,
        combatLevelRequired: 100,
        slayerXP: 300,
        slayerPoints: 35,
        weight: 9,
      },
      {
        id: 'abyssal_demons',
        name: 'Abyssal demons',
        monsterIds: ['abyssal_demon'],
        amount: 130,
        slayerLevelRequired: 85,
        combatLevelRequired: 105,
        slayerXP: 350,
        slayerPoints: 35,
        weight: 12,
      },
      {
        id: 'dark_beasts',
        name: 'Dark beasts',
        monsterIds: ['dark_beast'],
        amount: 150,
        slayerLevelRequired: 90,
        combatLevelRequired: 110,
        slayerXP: 400,
        slayerPoints: 40,
        weight: 9,
      },

      // Boss assignments
      {
        id: 'kraken',
        name: 'Kraken',
        monsterIds: ['kraken'],
        amount: 100,
        slayerLevelRequired: 87,
        combatLevelRequired: 100,
        slayerXP: 500,
        slayerPoints: 50,
        weight: 9,
      },
      {
        id: 'smoke_devils',
        name: 'Smoke devils',
        monsterIds: ['smoke_devil'],
        amount: 120,
        slayerLevelRequired: 93,
        combatLevelRequired: 105,
        slayerXP: 450,
        slayerPoints: 45,
        weight: 9,
      },
    ];

    assignments.forEach(assignment => {
      this.slayerAssignments.set(assignment.id, assignment);
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
  private handleGetSlayerTask(event: any): void {
    const { playerId, masterId } = event;
    this.getSlayerTask(playerId, masterId);
  }

  private handleCancelSlayerTask(event: any): void {
    const { playerId } = event;
    this.cancelSlayerTask(playerId);
  }

  private handleCompleteSlayerKill(event: any): void {
    const { playerId, monsterId } = event;
    this.handleMonsterKill(playerId, monsterId);
  }

  private handleCheckSlayerTask(event: any): void {
    const { playerId } = event;
    // Implementation for checking task status
  }

  private handleMonsterKilled(event: any): void {
    const { playerId, monsterId } = event;
    this.handleMonsterKill(playerId, monsterId);
  }

  // Public API
  getSlayerMasters(): Map<string, SlayerMaster> {
    return new Map(this.slayerMasters);
  }

  getSlayerMonsters(): Map<string, SlayerMonster> {
    return new Map(this.slayerMonsters);
  }

  getSlayerAssignments(): Map<string, SlayerAssignment> {
    return new Map(this.slayerAssignments);
  }

  getPlayerTask(playerId: string): SlayerTask | null {
    return this.slayerTasks.get(playerId) || null;
  }

  // Validation methods for actions
  canGetTask(playerId: string, masterId: string): { canGet: boolean, reason?: string } {
    const master = this.slayerMasters.get(masterId);
    if (!master) {
      return { canGet: false, reason: `Unknown slayer master: ${masterId}` };
    }

    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.slayer.level < master.levelRequired) {
      return { canGet: false, reason: `Need slayer level ${master.levelRequired}` };
    }

    if (this.slayerTasks.has(playerId)) {
      return { canGet: false, reason: 'Already have a slayer task' };
    }

    return { canGet: true };
  }

  canCancelTask(playerId: string): { canCancel: boolean, reason?: string } {
    if (!this.slayerTasks.has(playerId)) {
      return { canCancel: false, reason: 'No active slayer task' };
    }

    return { canCancel: true };
  }

  getMastersByLevel(minLevel: number, maxLevel: number = 99): SlayerMaster[] {
    return Array.from(this.slayerMasters.values()).filter(
      master => master.levelRequired >= minLevel && master.levelRequired <= maxLevel
    );
  }

  getAssignmentsByLevel(slayerLevel: number, combatLevel: number): SlayerAssignment[] {
    return Array.from(this.slayerAssignments.values()).filter(
      assignment => assignment.slayerLevelRequired <= slayerLevel && 
                   assignment.combatLevelRequired <= combatLevel
    );
  }
}

// Type definitions
interface SlayerMaster {
  id: string;
  name: string;
  location: string;
  levelRequired: number;
  assignments: string[]; // Array of assignment IDs
  description: string;
}

interface SlayerMonster {
  id: string;
  name: string;
  slayerLevelRequired: number;
  combatLevel: number;
  hitpoints: number;
  requiresTask: boolean;
  weakness?: string;
  location: string;
  specialMechanic?: string;
  requiredGear?: number[]; // Array of item IDs
  rareDrops?: number[]; // Array of rare drop item IDs
}

interface SlayerAssignment {
  id: string;
  name: string;
  monsterIds: string[]; // Array of monster IDs that count for this assignment
  amount: number; // How many to kill
  slayerLevelRequired: number;
  combatLevelRequired: number;
  slayerXP: number;
  slayerPoints: number;
  weight: number; // For weighted random selection
}

interface SlayerTask {
  playerId: string;
  masterId: string;
  assignmentId: string;
  monstersAssigned: number;
  monstersKilled: number;
  assignedTime: number;
  slayerPoints: number;
  completed: boolean;
}

interface SlayerAction {
  playerId: string;
  type: 'get_task' | 'cancel_task' | 'check_task';
  targetId?: string;
  startTime: number;
}