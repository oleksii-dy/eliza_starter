/**
 * Agility System Tests
 * ===================
 * Tests for RuneScape agility mechanics implementation
 */

import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test';
import { AgilitySystem } from '../rpg/systems/AgilitySystem';
import { createMockWorld } from './test-utils';

describe('AgilitySystem', () => {
  let agilitySystem: AgilitySystem;
  let mockWorld: any;
  let mockPlayer: any;

  beforeEach(() => {
    mockWorld = createMockWorld();
    
    // Set up mock world events
    mockWorld.events = {
      on: mock(),
      off: mock(),
      emit: mock(),
    };

    // Create mock player with stats and inventory
    mockPlayer = {
      data: {
        stats: {
          agility: { level: 25, currentXp: 15000, maxLevel: 99 },
          hitpoints: { level: 30, currentXp: 20000, maxLevel: 99 },
          combat: { level: 3, currentXp: 0, maxLevel: 126 }
        },
        inventory: {
          items: [
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null
          ],
          equipment: {
            weapon: null,
            helm: null,
            body: null,
            legs: null,
            feet: null,
            gloves: null,
            shield: null,
            cape: null,
            neck: null,
            ring: null,
            ammo: null
          }
        }
      }
    };

    // Add player to mock world
    mockWorld.entities.players = new Map();
    mockWorld.entities.players.set('test-player', mockPlayer);

    agilitySystem = new AgilitySystem(mockWorld);
  });

  describe('System Initialization', () => {
    it('should initialize with correct name and enabled state', () => {
      expect(agilitySystem.name).toBe('AgilitySystem');
      expect(agilitySystem.enabled).toBe(true);
    });

    it('should load agility obstacles', () => {
      const obstacles = agilitySystem.getObstacles();

      expect(obstacles.size).toBeGreaterThan(0);
      
      // Check for specific obstacles
      expect(obstacles.has('gnome_log_balance')).toBe(true);
      expect(obstacles.has('gnome_obstacle_net')).toBe(true);
      expect(obstacles.has('draynor_rough_wall')).toBe(true);
      expect(obstacles.has('draynor_tightrope')).toBe(true);
      expect(obstacles.has('alkharid_rough_wall')).toBe(true);
      expect(obstacles.has('alkharid_cable')).toBe(true);
    });

    it('should load agility courses', () => {
      const courses = agilitySystem.getAgilityCourses();

      expect(courses.size).toBeGreaterThan(0);
      
      // Check for specific courses
      expect(courses.has('gnome_stronghold')).toBe(true);
      expect(courses.has('draynor_village')).toBe(true);
      expect(courses.has('al_kharid')).toBe(true);
    });

    it('should set up event listeners during init', async () => {
      await agilitySystem.init();
      
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:start_obstacle', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:complete_obstacle', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:fail_obstacle', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:start_course', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:complete_course', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:use_stamina', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:restore_stamina', expect.any(Function));
    });
  });

  describe('Agility Obstacles', () => {
    it('should have correct gnome log balance obstacle', () => {
      const obstacles = agilitySystem.getObstacles();
      const logBalance = obstacles.get('gnome_log_balance');
      
      expect(logBalance).toBeDefined();
      expect(logBalance!.name).toBe('Log balance');
      expect(logBalance!.levelRequired).toBe(1);
      expect(logBalance!.xpReward).toBe(7.5);
      expect(logBalance!.staminaCost).toBe(2);
      expect(logBalance!.duration).toBe(3000);
      expect(logBalance!.baseSuccessRate).toBe(0.9);
      expect(logBalance!.position).toBeDefined();
    });

    it('should have correct draynor tightrope obstacle', () => {
      const obstacles = agilitySystem.getObstacles();
      const tightrope = obstacles.get('draynor_tightrope');
      
      expect(tightrope).toBeDefined();
      expect(tightrope!.name).toBe('Tightrope');
      expect(tightrope!.levelRequired).toBe(10);
      expect(tightrope!.xpReward).toBe(20);
      expect(tightrope!.staminaCost).toBe(5);
      expect(tightrope!.failureDamage).toBe(5);
      expect(tightrope!.failureEffect).toBeDefined();
      expect(tightrope!.failureEffect!.type).toBe('teleport');
    });

    it('should have progressive difficulty by level', () => {
      const obstacles = agilitySystem.getObstacles();
      
      const gnomeNet = obstacles.get('gnome_obstacle_net');
      const draynorWall = obstacles.get('draynor_rough_wall');
      const alkharidCable = obstacles.get('alkharid_cable');
      
      expect(gnomeNet!.levelRequired).toBe(1);
      expect(draynorWall!.levelRequired).toBe(10);
      expect(alkharidCable!.levelRequired).toBe(20);
      
      // Higher level obstacles should give more XP
      expect(draynorWall!.xpReward).toBeGreaterThan(gnomeNet!.xpReward);
      expect(alkharidCable!.xpReward).toBeGreaterThan(draynorWall!.xpReward);
      
      // And cost more stamina
      expect(draynorWall!.staminaCost).toBeGreaterThan(gnomeNet!.staminaCost);
      expect(alkharidCable!.staminaCost).toBeGreaterThan(draynorWall!.staminaCost);
    });
  });

  describe('Agility Courses', () => {
    it('should have correct gnome stronghold course', () => {
      const courses = agilitySystem.getAgilityCourses();
      const gnomeCourse = courses.get('gnome_stronghold');
      
      expect(gnomeCourse).toBeDefined();
      expect(gnomeCourse!.name).toBe('Gnome Stronghold Agility Course');
      expect(gnomeCourse!.levelRequired).toBe(1);
      expect(gnomeCourse!.obstacles.length).toBe(7);
      expect(gnomeCourse!.completionBonusXP).toBe(39);
      expect(gnomeCourse!.obstacles).toContain('gnome_log_balance');
      expect(gnomeCourse!.obstacles).toContain('gnome_obstacle_pipe');
    });

    it('should have correct al kharid course', () => {
      const courses = agilitySystem.getAgilityCourses();
      const alkharidCourse = courses.get('al_kharid');
      
      expect(alkharidCourse).toBeDefined();
      expect(alkharidCourse!.name).toBe('Al Kharid Agility Course');
      expect(alkharidCourse!.levelRequired).toBe(20);
      expect(alkharidCourse!.obstacles.length).toBe(6);
      expect(alkharidCourse!.completionBonusXP).toBe(180);
      expect(alkharidCourse!.obstacles).toContain('alkharid_rough_wall');
      expect(alkharidCourse!.obstacles).toContain('alkharid_zip_line');
    });

    it('should have progressive level requirements and rewards', () => {
      const courses = agilitySystem.getAgilityCourses();
      
      const gnomeCourse = courses.get('gnome_stronghold');
      const draynorCourse = courses.get('draynor_village');
      const alkharidCourse = courses.get('al_kharid');
      
      expect(gnomeCourse!.levelRequired).toBe(1);
      expect(draynorCourse!.levelRequired).toBe(10);
      expect(alkharidCourse!.levelRequired).toBe(20);
      
      // Higher level courses should give more bonus XP
      expect(draynorCourse!.completionBonusXP).toBeGreaterThan(gnomeCourse!.completionBonusXP);
      expect(alkharidCourse!.completionBonusXP).toBeGreaterThan(draynorCourse!.completionBonusXP);
    });
  });

  describe('Stamina System', () => {
    beforeEach(async () => {
      await agilitySystem.init();
    });

    it('should initialize player stamina based on agility level', () => {
      const stamina = agilitySystem.getPlayerStaminaPublic('test-player');
      
      expect(stamina).toBeDefined();
      expect(stamina.max).toBe(50); // 25 base + 25 agility level
      expect(stamina.current).toBe(stamina.max);
      expect(stamina.regenRate).toBe(1);
    });

    it('should successfully use stamina', () => {
      const result = agilitySystem.useStamina('test-player', 10);
      expect(result).toBe(true);
      
      const stamina = agilitySystem.getPlayerStaminaPublic('test-player');
      expect(stamina.current).toBe(40); // 50 - 10
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:stamina_used', {
        playerId: 'test-player',
        amount: 10,
        remaining: 40,
        maxStamina: 50,
      });
    });

    it('should fail to use stamina when insufficient', () => {
      // Use most of stamina first
      agilitySystem.useStamina('test-player', 45);
      
      const result = agilitySystem.useStamina('test-player', 10);
      expect(result).toBe(false);
      
      const stamina = agilitySystem.getPlayerStaminaPublic('test-player');
      expect(stamina.current).toBe(5); // Should remain at 5, not go negative
    });

    it('should successfully restore stamina', () => {
      // Use some stamina first
      agilitySystem.useStamina('test-player', 20);
      
      agilitySystem.restoreStamina('test-player', 10);
      
      const stamina = agilitySystem.getPlayerStaminaPublic('test-player');
      expect(stamina.current).toBe(40); // 30 + 10
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:stamina_restored', {
        playerId: 'test-player',
        amount: 10,
        current: 40,
        maxStamina: 50,
      });
    });

    it('should not restore stamina above maximum', () => {
      agilitySystem.restoreStamina('test-player', 100);
      
      const stamina = agilitySystem.getPlayerStaminaPublic('test-player');
      expect(stamina.current).toBe(stamina.max);
    });
  });

  describe('Obstacle Mechanics', () => {
    beforeEach(async () => {
      await agilitySystem.init();
    });

    it('should successfully start obstacle', () => {
      const result = agilitySystem.startObstacle('test-player', 'gnome_log_balance');
      expect(result).toBe(true);
      
      expect(agilitySystem.isPlayerDoingObstacle('test-player')).toBe(true);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:obstacle_started', {
        playerId: 'test-player',
        obstacleId: 'gnome_log_balance',
        duration: 3000,
        successChance: expect.any(Number),
      });
    });

    it('should fail to start obstacle without required level', () => {
      // Lower player agility level
      mockPlayer.data.stats.agility.level = 5;
      
      const result = agilitySystem.startObstacle('test-player', 'alkharid_cable');
      expect(result).toBe(false);
    });

    it('should fail to start obstacle without enough stamina', () => {
      // Use up most stamina
      agilitySystem.useStamina('test-player', 48);
      
      const result = agilitySystem.startObstacle('test-player', 'alkharid_cable'); // Costs 8 stamina
      expect(result).toBe(false);
    });

    it('should fail to start obstacle if already doing one', () => {
      agilitySystem.startObstacle('test-player', 'gnome_log_balance');
      
      const result = agilitySystem.startObstacle('test-player', 'gnome_obstacle_net');
      expect(result).toBe(false);
    });

    it('should consume stamina when starting obstacle', () => {
      agilitySystem.startObstacle('test-player', 'gnome_log_balance');
      
      const stamina = agilitySystem.getPlayerStaminaPublic('test-player');
      expect(stamina.current).toBe(48); // 50 - 2 (stamina cost)
    });

    it('should complete obstacle successfully', () => {
      agilitySystem.startObstacle('test-player', 'gnome_log_balance');
      
      // Mock success
      const originalRandom = Math.random;
      Math.random = mock(() => 0.1); // Ensure success
      
      const result = agilitySystem.completeObstacle('test-player');
      expect(result).toBe(true);
      
      expect(agilitySystem.isPlayerDoingObstacle('test-player')).toBe(false);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:obstacle_success', {
        playerId: 'test-player',
        obstacleId: 'gnome_log_balance',
        xpGained: 7.5,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'agility',
        amount: 7.5,
        source: 'agility',
      });
      
      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should handle obstacle failure correctly', () => {
      agilitySystem.startObstacle('test-player', 'gnome_log_balance');
      
      // Mock failure
      const originalRandom = Math.random;
      Math.random = mock(() => 0.95); // Ensure failure
      
      const result = agilitySystem.completeObstacle('test-player');
      expect(result).toBe(true);
      
      expect(agilitySystem.isPlayerDoingObstacle('test-player')).toBe(false);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:obstacle_failure', {
        playerId: 'test-player',
        obstacleId: 'gnome_log_balance',
        xpGained: expect.any(Number), // Small failure XP
        damage: 1,
      });
      
      // Restore original Math.random
      Math.random = originalRandom;
    });
  });

  describe('Course Mechanics', () => {
    beforeEach(async () => {
      await agilitySystem.init();
    });

    it('should successfully start course', () => {
      const result = agilitySystem.startCourse('test-player', 'gnome_stronghold');
      expect(result).toBe(true);
      
      expect(agilitySystem.isPlayerDoingCourse('test-player')).toBe(true);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:course_started', {
        playerId: 'test-player',
        courseId: 'gnome_stronghold',
        courseName: 'Gnome Stronghold Agility Course',
        totalObstacles: 7,
      });
    });

    it('should fail to start course without required level', () => {
      // Lower player agility level
      mockPlayer.data.stats.agility.level = 5;
      
      const result = agilitySystem.startCourse('test-player', 'al_kharid');
      expect(result).toBe(false);
    });

    it('should fail to start course if already doing one', () => {
      agilitySystem.startCourse('test-player', 'gnome_stronghold');
      
      const result = agilitySystem.startCourse('test-player', 'draynor_village');
      expect(result).toBe(false);
    });

    it('should complete course and grant bonus XP', () => {
      agilitySystem.startCourse('test-player', 'gnome_stronghold');
      
      const result = agilitySystem.completeCourse('test-player');
      expect(result).toBe(true);
      
      expect(agilitySystem.isPlayerDoingCourse('test-player')).toBe(false);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:course_completed', {
        playerId: 'test-player',
        courseId: 'gnome_stronghold',
        courseName: 'Gnome Stronghold Agility Course',
        completionTime: expect.any(Number),
        totalXpGained: 39, // Just bonus XP in this test
        bonusXP: 39,
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'agility',
        amount: 39,
        source: 'agility',
      });
    });
  });

  describe('Validation Methods', () => {
    beforeEach(async () => {
      await agilitySystem.init();
    });

    it('should validate obstacle capability correctly', () => {
      // Valid case
      const validResult = agilitySystem.canDoObstacle('test-player', 'gnome_log_balance');
      expect(validResult.canDo).toBe(true);
      
      // Invalid level
      mockPlayer.data.stats.agility.level = 5;
      const invalidLevelResult = agilitySystem.canDoObstacle('test-player', 'alkharid_cable');
      expect(invalidLevelResult.canDo).toBe(false);
      expect(invalidLevelResult.reason).toContain('level');
      
      // Not enough stamina
      mockPlayer.data.stats.agility.level = 25; // Reset level
      agilitySystem.useStamina('test-player', 48); // Use most stamina
      const noStaminaResult = agilitySystem.canDoObstacle('test-player', 'alkharid_cable');
      expect(noStaminaResult.canDo).toBe(false);
      expect(noStaminaResult.reason).toContain('stamina');
      
      // Already doing obstacle
      agilitySystem.restoreStamina('test-player', 50); // Restore stamina
      agilitySystem.startObstacle('test-player', 'gnome_log_balance');
      const alreadyDoingResult = agilitySystem.canDoObstacle('test-player', 'gnome_obstacle_net');
      expect(alreadyDoingResult.canDo).toBe(false);
      expect(alreadyDoingResult.reason).toContain('Already doing');
    });

    it('should validate course capability correctly', () => {
      // Valid case
      const validResult = agilitySystem.canDoCourse('test-player', 'gnome_stronghold');
      expect(validResult.canDo).toBe(true);
      
      // Invalid level
      mockPlayer.data.stats.agility.level = 5;
      const invalidLevelResult = agilitySystem.canDoCourse('test-player', 'al_kharid');
      expect(invalidLevelResult.canDo).toBe(false);
      expect(invalidLevelResult.reason).toContain('level');
      
      // Already doing course
      mockPlayer.data.stats.agility.level = 25; // Reset level
      agilitySystem.startCourse('test-player', 'gnome_stronghold');
      const alreadyDoingResult = agilitySystem.canDoCourse('test-player', 'draynor_village');
      expect(alreadyDoingResult.canDo).toBe(false);
      expect(alreadyDoingResult.reason).toContain('Already doing');
    });

    it('should validate unknown obstacles and courses', () => {
      const unknownObstacle = agilitySystem.canDoObstacle('test-player', 'unknown_obstacle');
      expect(unknownObstacle.canDo).toBe(false);
      expect(unknownObstacle.reason).toContain('Unknown');
      
      const unknownCourse = agilitySystem.canDoCourse('test-player', 'unknown_course');
      expect(unknownCourse.canDo).toBe(false);
      expect(unknownCourse.reason).toContain('Unknown');
    });

    it('should get courses and obstacles by level', () => {
      const lowLevelCourses = agilitySystem.getCoursesByLevel(1, 10);
      const midLevelCourses = agilitySystem.getCoursesByLevel(11, 25);
      
      expect(lowLevelCourses.length).toBeGreaterThan(0);
      expect(midLevelCourses.length).toBeGreaterThan(0);
      
      expect(lowLevelCourses.every(c => c.levelRequired >= 1 && c.levelRequired <= 10)).toBe(true);
      expect(midLevelCourses.every(c => c.levelRequired >= 11 && c.levelRequired <= 25)).toBe(true);
      
      const lowLevelObstacles = agilitySystem.getObstaclesByLevel(1, 10);
      const highLevelObstacles = agilitySystem.getObstaclesByLevel(20, 99);
      
      expect(lowLevelObstacles.length).toBeGreaterThan(0);
      expect(highLevelObstacles.length).toBeGreaterThan(0);
      
      expect(lowLevelObstacles.every(o => o.levelRequired >= 1 && o.levelRequired <= 10)).toBe(true);
      expect(highLevelObstacles.every(o => o.levelRequired >= 20 && o.levelRequired <= 99)).toBe(true);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await agilitySystem.init();
    });

    it('should handle start obstacle event', () => {
      const startObstacleSpy = spyOn(agilitySystem, 'startObstacle');
      
      (agilitySystem as any).handleStartObstacle({
        playerId: 'test-player',
        obstacleId: 'gnome_log_balance'
      });
      
      expect(startObstacleSpy).toHaveBeenCalledWith('test-player', 'gnome_log_balance');
    });

    it('should handle complete obstacle event', () => {
      const completeObstacleSpy = spyOn(agilitySystem, 'completeObstacle');
      
      (agilitySystem as any).handleCompleteObstacle({
        playerId: 'test-player'
      });
      
      expect(completeObstacleSpy).toHaveBeenCalledWith('test-player');
    });

    it('should handle start course event', () => {
      const startCourseSpy = spyOn(agilitySystem, 'startCourse');
      
      (agilitySystem as any).handleStartCourse({
        playerId: 'test-player',
        courseId: 'gnome_stronghold'
      });
      
      expect(startCourseSpy).toHaveBeenCalledWith('test-player', 'gnome_stronghold');
    });

    it('should handle use stamina event', () => {
      const useStaminaSpy = spyOn(agilitySystem, 'useStamina');
      
      (agilitySystem as any).handleUseStamina({
        playerId: 'test-player',
        amount: 10
      });
      
      expect(useStaminaSpy).toHaveBeenCalledWith('test-player', 10);
    });

    it('should handle restore stamina event', () => {
      const restoreStaminaSpy = spyOn(agilitySystem, 'restoreStamina');
      
      (agilitySystem as any).handleRestoreStamina({
        playerId: 'test-player',
        amount: 15
      });
      
      expect(restoreStaminaSpy).toHaveBeenCalledWith('test-player', 15);
    });
  });

  describe('Success Chance Calculation', () => {
    it('should calculate success chance based on level difference', () => {
      const obstacles = agilitySystem.getObstacles();
      const logBalance = obstacles.get('gnome_log_balance')!;
      
      // Test with exact level requirement
      mockPlayer.data.stats.agility.level = 1;
      const exactLevelChance = (agilitySystem as any).calculateSuccessChance('test-player', logBalance);
      expect(exactLevelChance).toBe(0.9); // Base success rate
      
      // Test with higher level
      mockPlayer.data.stats.agility.level = 11;
      const higherLevelChance = (agilitySystem as any).calculateSuccessChance('test-player', logBalance);
      expect(higherLevelChance).toBeGreaterThan(exactLevelChance);
      expect(higherLevelChance).toBe(Math.min(0.95, 0.9 + 10 * 0.01)); // +1% per level above requirement, capped at 95%
    });

    it('should respect minimum and maximum success rates', () => {
      const obstacles = agilitySystem.getObstacles();
      const logBalance = obstacles.get('gnome_log_balance')!;
      
      // Force very low level to test minimum
      mockPlayer.data.stats.agility.level = 1;
      logBalance.baseSuccessRate = 0.05; // Very low base rate
      const minChance = (agilitySystem as any).calculateSuccessChance('test-player', logBalance);
      expect(minChance).toBeGreaterThanOrEqual(0.1); // Minimum 10%
      
      // Force very high level to test maximum
      mockPlayer.data.stats.agility.level = 99;
      logBalance.baseSuccessRate = 0.9;
      const maxChance = (agilitySystem as any).calculateSuccessChance('test-player', logBalance);
      expect(maxChance).toBeLessThanOrEqual(0.95); // Maximum 95%
    });
  });

  describe('System Cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      agilitySystem.destroy();
      
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:start_obstacle');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:complete_obstacle');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:fail_obstacle');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:start_course');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:complete_course');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:use_stamina');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:restore_stamina');
    });
  });
});