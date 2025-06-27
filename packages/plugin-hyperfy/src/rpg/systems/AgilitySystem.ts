/**
 * RuneScape Agility System Implementation
 * =====================================
 * Handles obstacle courses, stamina management, and movement speed boosts
 */

import { logger } from '@elizaos/core';
import type { HyperfySystem, HyperfyWorld, HyperfyEntity } from '../../types/hyperfy';
import type { StatsComponent } from '../types/stats';
import type { InventoryComponent } from '../types/inventory';

export class AgilitySystem implements HyperfySystem {
  name = 'AgilitySystem';
  world: HyperfyWorld;
  enabled = true;

  // Agility data
  private agilityCourses: Map<string, AgilityCourse> = new Map();
  private obstacles: Map<string, AgilityObstacle> = new Map();
  private playerCourseStates: Map<string, PlayerCourseState> = new Map();
  private activeObstacleActions: Map<string, ObstacleAction> = new Map();

  // Stamina tracking
  private playerStamina: Map<string, PlayerStaminaState> = new Map();

  // Tick tracking
  private tickCounter = 0;
  private lastTickTime = 0;

  constructor(world: HyperfyWorld) {
    this.world = world;
    this.initializeAgilityData();
    logger.info('[AgilitySystem] Initialized RuneScape agility mechanics');
  }

  async init(): Promise<void> {
    logger.info('[AgilitySystem] Starting agility system...');
    
    // Subscribe to agility events
    this.world.events.on('rpg:start_obstacle', this.handleStartObstacle.bind(this));
    this.world.events.on('rpg:complete_obstacle', this.handleCompleteObstacle.bind(this));
    this.world.events.on('rpg:fail_obstacle', this.handleFailObstacle.bind(this));
    this.world.events.on('rpg:start_course', this.handleStartCourse.bind(this));
    this.world.events.on('rpg:complete_course', this.handleCompleteCourse.bind(this));
    this.world.events.on('rpg:use_stamina', this.handleUseStamina.bind(this));
    this.world.events.on('rpg:restore_stamina', this.handleRestoreStamina.bind(this));
  }

  tick(delta: number): void {
    const now = Date.now();
    
    // Process agility ticks (every 600ms like RuneScape)
    if (now - this.lastTickTime >= 600) {
      this.processAgilityTick();
      this.lastTickTime = now;
      this.tickCounter++;
    }
    
    // Update obstacle actions
    this.updateObstacleActions(delta);
    
    // Update stamina regeneration
    this.updateStaminaRegeneration(now);
  }

  destroy(): void {
    this.world.events.off('rpg:start_obstacle');
    this.world.events.off('rpg:complete_obstacle');
    this.world.events.off('rpg:fail_obstacle');
    this.world.events.off('rpg:start_course');
    this.world.events.off('rpg:complete_course');
    this.world.events.off('rpg:use_stamina');
    this.world.events.off('rpg:restore_stamina');
    logger.info('[AgilitySystem] Agility system destroyed');
  }

  /**
   * Start an obstacle
   */
  startObstacle(playerId: string, obstacleId: string): boolean {
    const player = this.world.entities.players.get(playerId);
    if (!player) {
      logger.warn(`[AgilitySystem] Player ${playerId} not found`);
      return false;
    }

    const obstacle = this.obstacles.get(obstacleId);
    if (!obstacle) {
      logger.warn(`[AgilitySystem] Obstacle ${obstacleId} not found`);
      return false;
    }

    // Check agility level requirement
    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.agility.level < obstacle.levelRequired) {
      logger.info(`[AgilitySystem] Player ${playerId} needs agility level ${obstacle.levelRequired}`);
      return false;
    }

    // Check if player has enough stamina
    const stamina = this.getPlayerStamina(playerId);
    if (stamina.current < obstacle.staminaCost) {
      logger.info(`[AgilitySystem] Player ${playerId} doesn't have enough stamina for ${obstacle.name}`);
      return false;
    }

    // Check if player already doing an obstacle
    if (this.activeObstacleActions.has(playerId)) {
      logger.info(`[AgilitySystem] Player ${playerId} already doing an obstacle`);
      return false;
    }

    // Calculate success chance
    const successChance = this.calculateSuccessChance(playerId, obstacle);
    
    // Consume stamina
    this.useStamina(playerId, obstacle.staminaCost);

    // Create obstacle action
    const action: ObstacleAction = {
      playerId,
      obstacleId,
      startTime: Date.now(),
      duration: obstacle.duration,
      successChance,
    };

    this.activeObstacleActions.set(playerId, action);

    logger.info(`[AgilitySystem] ${playerId} started ${obstacle.name} (${(obstacle.duration/1000).toFixed(1)}s, ${(successChance*100).toFixed(1)}% success)`);

    // Emit obstacle started event
    this.world.events.emit('rpg:obstacle_started', {
      playerId,
      obstacleId,
      duration: obstacle.duration,
      successChance: successChance * 100,
    });

    return true;
  }

  /**
   * Complete an obstacle
   */
  completeObstacle(playerId: string): boolean {
    const action = this.activeObstacleActions.get(playerId);
    if (!action) {
      return false;
    }

    const obstacle = this.obstacles.get(action.obstacleId);
    if (!obstacle) {
      this.activeObstacleActions.delete(playerId);
      return false;
    }

    // Determine success/failure
    const isSuccess = Math.random() < action.successChance;

    if (isSuccess) {
      // Grant XP for success
      this.grantAgilityXP(playerId, obstacle.xpReward);
      
      // Update course progress if part of a course
      this.updateCourseProgress(playerId, action.obstacleId);

      logger.info(`[AgilitySystem] ${playerId} successfully completed ${obstacle.name}`);

      // Emit success event
      this.world.events.emit('rpg:obstacle_success', {
        playerId,
        obstacleId: action.obstacleId,
        xpGained: obstacle.xpReward,
      });
    } else {
      // Grant small XP for attempting
      const failureXP = Math.floor(obstacle.xpReward * 0.1);
      if (failureXP > 0) {
        this.grantAgilityXP(playerId, failureXP);
      }

      // Apply failure effects (damage, teleport back, etc.)
      this.applyFailureEffects(playerId, obstacle);

      logger.info(`[AgilitySystem] ${playerId} failed ${obstacle.name}`);

      // Emit failure event
      this.world.events.emit('rpg:obstacle_failure', {
        playerId,
        obstacleId: action.obstacleId,
        xpGained: failureXP,
        damage: obstacle.failureDamage || 0,
      });
    }

    // Remove active action
    this.activeObstacleActions.delete(playerId);
    return true;
  }

  /**
   * Start a full agility course
   */
  startCourse(playerId: string, courseId: string): boolean {
    const course = this.agilityCourses.get(courseId);
    if (!course) {
      logger.warn(`[AgilitySystem] Course ${courseId} not found`);
      return false;
    }

    // Check agility level requirement
    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.agility.level < course.levelRequired) {
      logger.info(`[AgilitySystem] Player ${playerId} needs agility level ${course.levelRequired} for ${course.name}`);
      return false;
    }

    // Check if player already doing a course
    if (this.playerCourseStates.has(playerId)) {
      logger.info(`[AgilitySystem] Player ${playerId} already doing a course`);
      return false;
    }

    // Initialize course state
    const courseState: PlayerCourseState = {
      playerId,
      courseId,
      currentObstacleIndex: 0,
      startTime: Date.now(),
      completedObstacles: [],
      totalXpGained: 0,
    };

    this.playerCourseStates.set(playerId, courseState);

    logger.info(`[AgilitySystem] ${playerId} started ${course.name} course`);

    // Emit course started event
    this.world.events.emit('rpg:course_started', {
      playerId,
      courseId,
      courseName: course.name,
      totalObstacles: course.obstacles.length,
    });

    return true;
  }

  /**
   * Complete a full agility course
   */
  completeCourse(playerId: string): boolean {
    const courseState = this.playerCourseStates.get(playerId);
    if (!courseState) {
      return false;
    }

    const course = this.agilityCourses.get(courseState.courseId);
    if (!course) {
      this.playerCourseStates.delete(playerId);
      return false;
    }

    // Grant course completion bonus XP
    const bonusXP = course.completionBonusXP;
    this.grantAgilityXP(playerId, bonusXP);
    courseState.totalXpGained += bonusXP;

    const completionTime = Date.now() - courseState.startTime;

    logger.info(`[AgilitySystem] ${playerId} completed ${course.name} course in ${(completionTime/1000).toFixed(1)}s (Total XP: ${courseState.totalXpGained})`);

    // Emit course completion event
    this.world.events.emit('rpg:course_completed', {
      playerId,
      courseId: courseState.courseId,
      courseName: course.name,
      completionTime,
      totalXpGained: courseState.totalXpGained,
      bonusXP,
    });

    // Remove course state
    this.playerCourseStates.delete(playerId);
    return true;
  }

  /**
   * Use stamina for activities
   */
  useStamina(playerId: string, amount: number): boolean {
    const stamina = this.getPlayerStamina(playerId);
    
    if (stamina.current < amount) {
      return false;
    }

    stamina.current = Math.max(0, stamina.current - amount);
    stamina.lastUsed = Date.now();
    
    this.playerStamina.set(playerId, stamina);

    // Emit stamina used event
    this.world.events.emit('rpg:stamina_used', {
      playerId,
      amount,
      remaining: stamina.current,
      maxStamina: stamina.max,
    });

    return true;
  }

  /**
   * Restore stamina
   */
  restoreStamina(playerId: string, amount: number): void {
    const stamina = this.getPlayerStamina(playerId);
    
    const oldCurrent = stamina.current;
    stamina.current = Math.min(stamina.max, stamina.current + amount);
    
    this.playerStamina.set(playerId, stamina);

    if (stamina.current > oldCurrent) {
      // Emit stamina restored event
      this.world.events.emit('rpg:stamina_restored', {
        playerId,
        amount: stamina.current - oldCurrent,
        current: stamina.current,
        maxStamina: stamina.max,
      });
    }
  }

  /**
   * Calculate success chance for obstacle
   */
  private calculateSuccessChance(playerId: string, obstacle: AgilityObstacle): number {
    const stats = this.getPlayerStats(playerId);
    if (!stats) return 0.5;

    const playerLevel = stats.agility.level;
    const requiredLevel = obstacle.levelRequired;

    // Base success rate
    let successChance = obstacle.baseSuccessRate;

    // Increase success chance based on level difference
    if (playerLevel > requiredLevel) {
      const levelDifference = playerLevel - requiredLevel;
      successChance += (levelDifference * 0.01); // 1% per level above requirement
    }

    // Apply obstacle difficulty modifier
    successChance *= obstacle.difficultyModifier;

    return Math.max(0.1, Math.min(0.95, successChance)); // Between 10% and 95%
  }

  /**
   * Update course progress when obstacle is completed
   */
  private updateCourseProgress(playerId: string, obstacleId: string): void {
    const courseState = this.playerCourseStates.get(playerId);
    if (!courseState) return;

    const course = this.agilityCourses.get(courseState.courseId);
    if (!course) return;

    // Check if this obstacle is the current one in the course
    const currentObstacle = course.obstacles[courseState.currentObstacleIndex];
    if (currentObstacle === obstacleId) {
      courseState.completedObstacles.push(obstacleId);
      courseState.currentObstacleIndex++;

      const obstacle = this.obstacles.get(obstacleId);
      if (obstacle) {
        courseState.totalXpGained += obstacle.xpReward;
      }

      // Check if course is complete
      if (courseState.currentObstacleIndex >= course.obstacles.length) {
        this.completeCourse(playerId);
      } else {
        // Emit progress update
        this.world.events.emit('rpg:course_progress', {
          playerId,
          courseId: courseState.courseId,
          completed: courseState.completedObstacles.length,
          total: course.obstacles.length,
          nextObstacle: course.obstacles[courseState.currentObstacleIndex],
        });
      }
    }
  }

  /**
   * Apply failure effects to player
   */
  private applyFailureEffects(playerId: string, obstacle: AgilityObstacle): void {
    if (obstacle.failureDamage && obstacle.failureDamage > 0) {
      // Apply damage
      this.world.events.emit('rpg:take_damage', {
        playerId,
        damage: obstacle.failureDamage,
        source: 'agility_failure',
        damageType: 'physical',
      });
    }

    if (obstacle.failureEffect) {
      switch (obstacle.failureEffect.type) {
        case 'teleport':
          // Teleport player back to start
          this.world.events.emit('rpg:teleport_player', {
            playerId,
            position: obstacle.failureEffect.position,
            reason: 'agility_failure',
          });
          break;
          
        case 'stun':
          // Stun player temporarily
          this.world.events.emit('rpg:apply_effect', {
            playerId,
            effect: 'stun',
            duration: obstacle.failureEffect.duration || 3000,
          });
          break;
      }
    }
  }

  /**
   * Get or initialize player stamina
   */
  private getPlayerStamina(playerId: string): PlayerStaminaState {
    let stamina = this.playerStamina.get(playerId);
    
    if (!stamina) {
      // Calculate max stamina based on agility level
      const stats = this.getPlayerStats(playerId);
      const agilityLevel = stats ? stats.agility.level : 1;
      const maxStamina = Math.min(100, 25 + agilityLevel); // 25 base + level, max 100

      stamina = {
        current: maxStamina,
        max: maxStamina,
        lastUsed: 0,
        regenRate: 1, // 1 stamina per second when not in combat
      };
      
      this.playerStamina.set(playerId, stamina);
    }

    return stamina;
  }

  /**
   * Update stamina regeneration
   */
  private updateStaminaRegeneration(currentTime: number): void {
    for (const [playerId, stamina] of this.playerStamina.entries()) {
      // Only regenerate if not at max and not recently used
      if (stamina.current < stamina.max && currentTime - stamina.lastUsed > 5000) {
        const timeSinceLastRegen = currentTime - (stamina.lastUsed + 5000);
        const regenAmount = Math.floor(timeSinceLastRegen / 1000) * stamina.regenRate;
        
        if (regenAmount > 0) {
          this.restoreStamina(playerId, regenAmount);
        }
      }
    }
  }

  /**
   * Update active obstacle actions
   */
  private updateObstacleActions(delta: number): void {
    const now = Date.now();
    
    for (const [playerId, action] of this.activeObstacleActions.entries()) {
      if (now - action.startTime >= action.duration) {
        this.completeObstacle(playerId);
      }
    }
  }

  /**
   * Process agility tick
   */
  private processAgilityTick(): void {
    // Handle any tick-based agility mechanics
  }

  /**
   * Grant agility XP
   */
  private grantAgilityXP(playerId: string, amount: number): void {
    this.world.events.emit('rpg:xp_gain', {
      playerId,
      skill: 'agility',
      amount,
      source: 'agility',
    });
  }

  /**
   * Initialize agility data
   */
  private initializeAgilityData(): void {
    // Initialize agility obstacles
    this.initializeObstacles();
    
    // Initialize agility courses
    this.initializeAgilityCourses();

    logger.info(`[AgilitySystem] Loaded ${this.obstacles.size} obstacles and ${this.agilityCourses.size} courses`);
  }

  /**
   * Initialize agility obstacles
   */
  private initializeObstacles(): void {
    const obstacles: AgilityObstacle[] = [
      // Gnome Stronghold Course (Level 1)
      {
        id: 'gnome_log_balance',
        name: 'Log balance',
        levelRequired: 1,
        xpReward: 7.5,
        staminaCost: 2,
        duration: 3000,
        baseSuccessRate: 0.9,
        difficultyModifier: 1.0,
        position: { x: 2474, y: 3436, z: 0 },
        failureDamage: 1,
      },
      {
        id: 'gnome_obstacle_net',
        name: 'Obstacle net',
        levelRequired: 1,
        xpReward: 7.5,
        staminaCost: 3,
        duration: 4000,
        baseSuccessRate: 0.85,
        difficultyModifier: 1.0,
        position: { x: 2473, y: 3424, z: 0 },
        failureDamage: 2,
      },
      {
        id: 'gnome_tree_branch',
        name: 'Tree branch',
        levelRequired: 1,
        xpReward: 5,
        staminaCost: 2,
        duration: 2500,
        baseSuccessRate: 0.9,
        difficultyModifier: 1.0,
        position: { x: 2473, y: 3420, z: 1 },
        failureDamage: 1,
      },
      {
        id: 'gnome_balancing_rope',
        name: 'Balancing rope',
        levelRequired: 1,
        xpReward: 7.5,
        staminaCost: 3,
        duration: 3500,
        baseSuccessRate: 0.8,
        difficultyModifier: 1.0,
        position: { x: 2477, y: 3420, z: 2 },
        failureDamage: 2,
        failureEffect: {
          type: 'teleport',
          position: { x: 2473, y: 3436, z: 0 },
        },
      },
      {
        id: 'gnome_tree_branch_down',
        name: 'Tree branch',
        levelRequired: 1,
        xpReward: 5,
        staminaCost: 2,
        duration: 2000,
        baseSuccessRate: 0.9,
        difficultyModifier: 1.0,
        position: { x: 2483, y: 3420, z: 1 },
        failureDamage: 1,
      },
      {
        id: 'gnome_obstacle_net_down',
        name: 'Obstacle net',
        levelRequired: 1,
        xpReward: 7.5,
        staminaCost: 3,
        duration: 3000,
        baseSuccessRate: 0.85,
        difficultyModifier: 1.0,
        position: { x: 2485, y: 3431, z: 0 },
        failureDamage: 2,
      },
      {
        id: 'gnome_obstacle_pipe',
        name: 'Obstacle pipe',
        levelRequired: 1,
        xpReward: 7.5,
        staminaCost: 4,
        duration: 4500,
        baseSuccessRate: 0.8,
        difficultyModifier: 1.0,
        position: { x: 2484, y: 3437, z: 0 },
        failureDamage: 3,
      },

      // Draynor Village Course (Level 10)
      {
        id: 'draynor_rough_wall',
        name: 'Rough wall',
        levelRequired: 10,
        xpReward: 15,
        staminaCost: 4,
        duration: 3500,
        baseSuccessRate: 0.85,
        difficultyModifier: 1.0,
        position: { x: 3103, y: 3279, z: 0 },
        failureDamage: 2,
      },
      {
        id: 'draynor_tightrope',
        name: 'Tightrope',
        levelRequired: 10,
        xpReward: 20,
        staminaCost: 5,
        duration: 4000,
        baseSuccessRate: 0.8,
        difficultyModifier: 0.95,
        position: { x: 3098, y: 3277, z: 3 },
        failureDamage: 5,
        failureEffect: {
          type: 'teleport',
          position: { x: 3103, y: 3279, z: 0 },
        },
      },
      {
        id: 'draynor_tightrope_2',
        name: 'Tightrope',
        levelRequired: 10,
        xpReward: 20,
        staminaCost: 5,
        duration: 4000,
        baseSuccessRate: 0.75,
        difficultyModifier: 0.9,
        position: { x: 3092, y: 3276, z: 3 },
        failureDamage: 5,
      },
      {
        id: 'draynor_narrow_wall',
        name: 'Narrow wall',
        levelRequired: 10,
        xpReward: 25,
        staminaCost: 6,
        duration: 5000,
        baseSuccessRate: 0.7,
        difficultyModifier: 0.85,
        position: { x: 3088, y: 3267, z: 3 },
        failureDamage: 7,
      },
      {
        id: 'draynor_wall_jump_down',
        name: 'Wall jump down',
        levelRequired: 10,
        xpReward: 15,
        staminaCost: 3,
        duration: 2500,
        baseSuccessRate: 0.9,
        difficultyModifier: 1.0,
        position: { x: 3102, y: 3261, z: 0 },
        failureDamage: 3,
      },

      // Al Kharid Course (Level 20)
      {
        id: 'alkharid_rough_wall',
        name: 'Rough wall',
        levelRequired: 20,
        xpReward: 35,
        staminaCost: 6,
        duration: 4000,
        baseSuccessRate: 0.8,
        difficultyModifier: 0.9,
        position: { x: 3273, y: 3195, z: 0 },
        failureDamage: 3,
      },
      {
        id: 'alkharid_tightrope',
        name: 'Tightrope',
        levelRequired: 20,
        xpReward: 40,
        staminaCost: 7,
        duration: 4500,
        baseSuccessRate: 0.75,
        difficultyModifier: 0.85,
        position: { x: 3272, y: 3181, z: 3 },
        failureDamage: 6,
      },
      {
        id: 'alkharid_cable',
        name: 'Cable',
        levelRequired: 20,
        xpReward: 50,
        staminaCost: 8,
        duration: 5000,
        baseSuccessRate: 0.7,
        difficultyModifier: 0.8,
        position: { x: 3265, y: 3161, z: 3 },
        failureDamage: 8,
      },
      {
        id: 'alkharid_zip_line',
        name: 'Zip line',
        levelRequired: 20,
        xpReward: 45,
        staminaCost: 5,
        duration: 3000,
        baseSuccessRate: 0.85,
        difficultyModifier: 1.0,
        position: { x: 3318, y: 3161, z: 3 },
        failureDamage: 4,
      },
      {
        id: 'alkharid_tropical_tree',
        name: 'Tropical tree',
        levelRequired: 20,
        xpReward: 35,
        staminaCost: 6,
        duration: 3500,
        baseSuccessRate: 0.8,
        difficultyModifier: 0.9,
        position: { x: 3318, y: 3194, z: 0 },
        failureDamage: 5,
      },
      {
        id: 'alkharid_roof_top_beams',
        name: 'Roof top beams',
        levelRequired: 20,
        xpReward: 30,
        staminaCost: 5,
        duration: 3000,
        baseSuccessRate: 0.85,
        difficultyModifier: 0.95,
        position: { x: 3313, y: 3195, z: 1 },
        failureDamage: 3,
      },
    ];

    obstacles.forEach(obstacle => {
      this.obstacles.set(obstacle.id, obstacle);
    });
  }

  /**
   * Initialize agility courses
   */
  private initializeAgilityCourses(): void {
    const courses: AgilityCourse[] = [
      {
        id: 'gnome_stronghold',
        name: 'Gnome Stronghold Agility Course',
        levelRequired: 1,
        obstacles: [
          'gnome_log_balance',
          'gnome_obstacle_net',
          'gnome_tree_branch',
          'gnome_balancing_rope',
          'gnome_tree_branch_down',
          'gnome_obstacle_net_down',
          'gnome_obstacle_pipe'
        ],
        completionBonusXP: 39,
        position: { x: 2474, y: 3436, z: 0 },
      },
      {
        id: 'draynor_village',
        name: 'Draynor Village Agility Course',
        levelRequired: 10,
        obstacles: [
          'draynor_rough_wall',
          'draynor_tightrope',
          'draynor_tightrope_2',
          'draynor_narrow_wall',
          'draynor_wall_jump_down'
        ],
        completionBonusXP: 79,
        position: { x: 3103, y: 3279, z: 0 },
      },
      {
        id: 'al_kharid',
        name: 'Al Kharid Agility Course',
        levelRequired: 20,
        obstacles: [
          'alkharid_rough_wall',
          'alkharid_tightrope',
          'alkharid_cable',
          'alkharid_zip_line',
          'alkharid_tropical_tree',
          'alkharid_roof_top_beams'
        ],
        completionBonusXP: 180,
        position: { x: 3273, y: 3195, z: 0 },
      },
    ];

    courses.forEach(course => {
      this.agilityCourses.set(course.id, course);
    });
  }

  // Helper methods
  private getPlayerStats(playerId: string): StatsComponent | null {
    const player = this.world.entities.players.get(playerId);
    return (player?.data as any)?.stats || null;
  }

  // Event handlers
  private handleStartObstacle(event: any): void {
    const { playerId, obstacleId } = event;
    this.startObstacle(playerId, obstacleId);
  }

  private handleCompleteObstacle(event: any): void {
    const { playerId } = event;
    this.completeObstacle(playerId);
  }

  private handleFailObstacle(event: any): void {
    const { playerId } = event;
    // Force complete with failure
    this.completeObstacle(playerId);
  }

  private handleStartCourse(event: any): void {
    const { playerId, courseId } = event;
    this.startCourse(playerId, courseId);
  }

  private handleCompleteCourse(event: any): void {
    const { playerId } = event;
    this.completeCourse(playerId);
  }

  private handleUseStamina(event: any): void {
    const { playerId, amount } = event;
    this.useStamina(playerId, amount);
  }

  private handleRestoreStamina(event: any): void {
    const { playerId, amount } = event;
    this.restoreStamina(playerId, amount);
  }

  // Public API
  getAgilityCourses(): Map<string, AgilityCourse> {
    return new Map(this.agilityCourses);
  }

  getObstacles(): Map<string, AgilityObstacle> {
    return new Map(this.obstacles);
  }

  getActiveObstacleActions(): Map<string, ObstacleAction> {
    return new Map(this.activeObstacleActions);
  }

  getPlayerCourseStates(): Map<string, PlayerCourseState> {
    return new Map(this.playerCourseStates);
  }

  isPlayerDoingObstacle(playerId: string): boolean {
    return this.activeObstacleActions.has(playerId);
  }

  isPlayerDoingCourse(playerId: string): boolean {
    return this.playerCourseStates.has(playerId);
  }

  getPlayerStaminaPublic(playerId: string): PlayerStaminaState {
    return this.getPlayerStamina(playerId);
  }

  // Validation methods for actions
  canDoObstacle(playerId: string, obstacleId: string): { canDo: boolean, reason?: string } {
    const obstacle = this.obstacles.get(obstacleId);
    if (!obstacle) {
      return { canDo: false, reason: `Unknown obstacle: ${obstacleId}` };
    }

    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.agility.level < obstacle.levelRequired) {
      return { canDo: false, reason: `Need agility level ${obstacle.levelRequired}` };
    }

    const stamina = this.getPlayerStamina(playerId);
    if (stamina.current < obstacle.staminaCost) {
      return { canDo: false, reason: 'Not enough stamina' };
    }

    if (this.activeObstacleActions.has(playerId)) {
      return { canDo: false, reason: 'Already doing an obstacle' };
    }

    return { canDo: true };
  }

  canDoCourse(playerId: string, courseId: string): { canDo: boolean, reason?: string } {
    const course = this.agilityCourses.get(courseId);
    if (!course) {
      return { canDo: false, reason: `Unknown course: ${courseId}` };
    }

    const stats = this.getPlayerStats(playerId);
    if (!stats || stats.agility.level < course.levelRequired) {
      return { canDo: false, reason: `Need agility level ${course.levelRequired}` };
    }

    if (this.playerCourseStates.has(playerId)) {
      return { canDo: false, reason: 'Already doing a course' };
    }

    return { canDo: true };
  }

  getCoursesByLevel(minLevel: number, maxLevel: number = 99): AgilityCourse[] {
    return Array.from(this.agilityCourses.values()).filter(
      course => course.levelRequired >= minLevel && course.levelRequired <= maxLevel
    );
  }

  getObstaclesByLevel(minLevel: number, maxLevel: number = 99): AgilityObstacle[] {
    return Array.from(this.obstacles.values()).filter(
      obstacle => obstacle.levelRequired >= minLevel && obstacle.levelRequired <= maxLevel
    );
  }
}

// Type definitions
interface AgilityObstacle {
  id: string;
  name: string;
  levelRequired: number;
  xpReward: number;
  staminaCost: number;
  duration: number; // milliseconds
  baseSuccessRate: number; // 0.0 to 1.0
  difficultyModifier: number; // Multiplier for success rate
  position: { x: number; y: number; z: number };
  failureDamage?: number;
  failureEffect?: {
    type: 'teleport' | 'stun' | 'slow';
    position?: { x: number; y: number; z: number };
    duration?: number;
  };
}

interface AgilityCourse {
  id: string;
  name: string;
  levelRequired: number;
  obstacles: string[]; // Array of obstacle IDs
  completionBonusXP: number;
  position: { x: number; y: number; z: number }; // Start position
}

interface PlayerCourseState {
  playerId: string;
  courseId: string;
  currentObstacleIndex: number;
  startTime: number;
  completedObstacles: string[];
  totalXpGained: number;
}

interface ObstacleAction {
  playerId: string;
  obstacleId: string;
  startTime: number;
  duration: number;
  successChance: number;
}

interface PlayerStaminaState {
  current: number;
  max: number;
  lastUsed: number;
  regenRate: number;
}