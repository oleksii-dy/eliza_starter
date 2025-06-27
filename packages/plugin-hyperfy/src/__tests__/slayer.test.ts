/**
 * Slayer System Tests
 * ==================
 * Tests for RuneScape slayer mechanics implementation
 */

import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test';
import { SlayerSystem } from '../rpg/systems/SlayerSystem';
import { createMockWorld } from './test-utils';

describe('SlayerSystem', () => {
  let slayerSystem: SlayerSystem;
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
          slayer: { level: 75, currentXp: 50000, maxLevel: 99 },
          combat: { level: 95, currentXp: 75000, maxLevel: 126 },
          hitpoints: { level: 80, currentXp: 60000, maxLevel: 99 }
        },
        inventory: {
          items: [
            { itemId: 4156, quantity: 1 }, // Mirror shield
            { itemId: 4166, quantity: 1 }, // Earmuffs
            { itemId: 4168, quantity: 1 }, // Nose peg
            { itemId: 4162, quantity: 1 }, // Rock hammer
            null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null
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

    slayerSystem = new SlayerSystem(mockWorld);
  });

  describe('System Initialization', () => {
    it('should initialize with correct name and enabled state', () => {
      expect(slayerSystem.name).toBe('SlayerSystem');
      expect(slayerSystem.enabled).toBe(true);
    });

    it('should load slayer masters', () => {
      const masters = slayerSystem.getSlayerMasters();

      expect(masters.size).toBeGreaterThan(0);
      
      // Check for specific masters
      expect(masters.has('turael')).toBe(true);
      expect(masters.has('mazchna')).toBe(true);
      expect(masters.has('vannaka')).toBe(true);
      expect(masters.has('chaeldar')).toBe(true);
      expect(masters.has('nieve')).toBe(true);
    });

    it('should load slayer monsters', () => {
      const monsters = slayerSystem.getSlayerMonsters();

      expect(monsters.size).toBeGreaterThan(0);
      
      // Check for specific monsters
      expect(monsters.has('cave_crawler')).toBe(true);
      expect(monsters.has('banshee')).toBe(true);
      expect(monsters.has('basilisk')).toBe(true);
      expect(monsters.has('gargoyle')).toBe(true);
      expect(monsters.has('abyssal_demon')).toBe(true);
      expect(monsters.has('dark_beast')).toBe(true);
    });

    it('should load slayer assignments', () => {
      const assignments = slayerSystem.getSlayerAssignments();

      expect(assignments.size).toBeGreaterThan(0);
      
      // Check for specific assignments
      expect(assignments.has('birds')).toBe(true);
      expect(assignments.has('cave_crawlers')).toBe(true);
      expect(assignments.has('gargoyles')).toBe(true);
      expect(assignments.has('abyssal_demons')).toBe(true);
      expect(assignments.has('dark_beasts')).toBe(true);
    });

    it('should set up event listeners during init', async () => {
      await slayerSystem.init();
      
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:get_slayer_task', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:cancel_slayer_task', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:complete_slayer_kill', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:check_slayer_task', expect.any(Function));
      expect(mockWorld.events.on).toHaveBeenCalledWith('rpg:monster_killed', expect.any(Function));
    });
  });

  describe('Slayer Masters', () => {
    it('should have correct turael master', () => {
      const masters = slayerSystem.getSlayerMasters();
      const turael = masters.get('turael');
      
      expect(turael).toBeDefined();
      expect(turael!.name).toBe('Turael');
      expect(turael!.location).toBe('Burthorpe');
      expect(turael!.levelRequired).toBe(1);
      expect(turael!.assignments.length).toBeGreaterThan(0);
      expect(turael!.description).toContain('easiest');
    });

    it('should have correct nieve master', () => {
      const masters = slayerSystem.getSlayerMasters();
      const nieve = masters.get('nieve');
      
      expect(nieve).toBeDefined();
      expect(nieve!.name).toBe('Nieve');
      expect(nieve!.location).toBe('Tree Gnome Stronghold');
      expect(nieve!.levelRequired).toBe(85);
      expect(nieve!.assignments.length).toBeGreaterThan(0);
      expect(nieve!.description).toContain('highest level');
    });

    it('should have progressive level requirements', () => {
      const masters = slayerSystem.getSlayerMasters();
      
      const turael = masters.get('turael');
      const mazchna = masters.get('mazchna');
      const vannaka = masters.get('vannaka');
      const chaeldar = masters.get('chaeldar');
      const nieve = masters.get('nieve');
      
      expect(turael!.levelRequired).toBe(1);
      expect(mazchna!.levelRequired).toBe(20);
      expect(vannaka!.levelRequired).toBe(40);
      expect(chaeldar!.levelRequired).toBe(70);
      expect(nieve!.levelRequired).toBe(85);
    });
  });

  describe('Slayer Monsters', () => {
    it('should have correct cave crawler', () => {
      const monsters = slayerSystem.getSlayerMonsters();
      const caveCrawler = monsters.get('cave_crawler');
      
      expect(caveCrawler).toBeDefined();
      expect(caveCrawler!.name).toBe('Cave crawler');
      expect(caveCrawler!.slayerLevelRequired).toBe(10);
      expect(caveCrawler!.combatLevel).toBe(53);
      expect(caveCrawler!.requiresTask).toBe(false);
      expect(caveCrawler!.weakness).toBe('stab');
    });

    it('should have correct abyssal demon', () => {
      const monsters = slayerSystem.getSlayerMonsters();
      const abyssal = monsters.get('abyssal_demon');
      
      expect(abyssal).toBeDefined();
      expect(abyssal!.name).toBe('Abyssal demon');
      expect(abyssal!.slayerLevelRequired).toBe(85);
      expect(abyssal!.combatLevel).toBe(124);
      expect(abyssal!.requiresTask).toBe(true);
      expect(abyssal!.rareDrops).toBeDefined();
      expect(abyssal!.rareDrops!.includes(4151)).toBe(true); // Abyssal whip
    });

    it('should have monsters with special gear requirements', () => {
      const monsters = slayerSystem.getSlayerMonsters();
      
      const basilisk = monsters.get('basilisk');
      const gargoyle = monsters.get('gargoyle');
      const banshee = monsters.get('banshee');
      
      expect(basilisk!.requiredGear).toBeDefined();
      expect(basilisk!.requiredGear!.includes(4156)).toBe(true); // Mirror shield
      
      expect(gargoyle!.requiredGear).toBeDefined();
      expect(gargoyle!.requiredGear!.includes(4162)).toBe(true); // Rock hammer
      
      expect(banshee!.requiredGear).toBeDefined();
      expect(banshee!.requiredGear!.includes(4166)).toBe(true); // Earmuffs
    });

    it('should have progressive difficulty by level', () => {
      const monsters = slayerSystem.getSlayerMonsters();
      
      const caveCrawler = monsters.get('cave_crawler');
      const basilisk = monsters.get('basilisk');
      const gargoyle = monsters.get('gargoyle');
      const abyssal = monsters.get('abyssal_demon');
      
      expect(caveCrawler!.slayerLevelRequired).toBe(10);
      expect(basilisk!.slayerLevelRequired).toBe(40);
      expect(gargoyle!.slayerLevelRequired).toBe(75);
      expect(abyssal!.slayerLevelRequired).toBe(85);
      
      // Higher level monsters should have higher combat levels
      expect(basilisk!.combatLevel).toBeGreaterThan(caveCrawler!.combatLevel);
      expect(gargoyle!.combatLevel).toBeGreaterThan(basilisk!.combatLevel);
      expect(abyssal!.combatLevel).toBeGreaterThan(gargoyle!.combatLevel);
    });
  });

  describe('Slayer Assignments', () => {
    it('should have correct birds assignment', () => {
      const assignments = slayerSystem.getSlayerAssignments();
      const birds = assignments.get('birds');
      
      expect(birds).toBeDefined();
      expect(birds!.name).toBe('Birds');
      expect(birds!.amount).toBe(15);
      expect(birds!.slayerLevelRequired).toBe(1);
      expect(birds!.slayerPoints).toBe(0); // Turael gives no points
      expect(birds!.monsterIds.length).toBeGreaterThan(0);
    });

    it('should have correct abyssal demons assignment', () => {
      const assignments = slayerSystem.getSlayerAssignments();
      const abyssal = assignments.get('abyssal_demons');
      
      expect(abyssal).toBeDefined();
      expect(abyssal!.name).toBe('Abyssal demons');
      expect(abyssal!.amount).toBe(130);
      expect(abyssal!.slayerLevelRequired).toBe(85);
      expect(abyssal!.slayerPoints).toBe(35);
      expect(abyssal!.slayerXP).toBe(350);
      expect(abyssal!.monsterIds.includes('abyssal_demon')).toBe(true);
    });

    it('should have progressive rewards by level', () => {
      const assignments = slayerSystem.getSlayerAssignments();
      
      const birds = assignments.get('birds');
      const gargoyles = assignments.get('gargoyles');
      const abyssal = assignments.get('abyssal_demons');
      const darkBeasts = assignments.get('dark_beasts');
      
      expect(birds!.slayerXP).toBe(20);
      expect(gargoyles!.slayerXP).toBe(250);
      expect(abyssal!.slayerXP).toBe(350);
      expect(darkBeasts!.slayerXP).toBe(400);
      
      // Higher level assignments should give more XP
      expect(gargoyles!.slayerXP).toBeGreaterThan(birds!.slayerXP);
      expect(abyssal!.slayerXP).toBeGreaterThan(gargoyles!.slayerXP);
      expect(darkBeasts!.slayerXP).toBeGreaterThan(abyssal!.slayerXP);
    });

    it('should have weighted selection system', () => {
      const assignments = slayerSystem.getSlayerAssignments();
      
      for (const assignment of assignments.values()) {
        expect(assignment.weight).toBeGreaterThan(0);
        expect(assignment.weight).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('Task Assignment Mechanics', () => {
    beforeEach(async () => {
      await slayerSystem.init();
    });

    it('should successfully get task from appropriate master', () => {
      const result = slayerSystem.getSlayerTask('test-player', 'vannaka');
      expect(result).toBe(true);
      
      const currentTask = slayerSystem.getPlayerTask('test-player');
      expect(currentTask).toBeDefined();
      expect(currentTask!.masterId).toBe('vannaka');
      expect(currentTask!.monstersKilled).toBe(0);
      expect(currentTask!.completed).toBe(false);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:slayer_task_assigned', {
        playerId: 'test-player',
        masterId: 'vannaka',
        masterName: 'Vannaka',
        assignmentId: expect.any(String),
        monsterName: expect.any(String),
        amount: expect.any(Number),
        slayerPoints: expect.any(Number),
      });
    });

    it('should fail to get task without required level', () => {
      // Lower player slayer level
      mockPlayer.data.stats.slayer.level = 5;
      
      const result = slayerSystem.getSlayerTask('test-player', 'chaeldar');
      expect(result).toBe(false);
    });

    it('should fail to get task if already have one', () => {
      slayerSystem.getSlayerTask('test-player', 'vannaka');
      
      const result = slayerSystem.getSlayerTask('test-player', 'chaeldar');
      expect(result).toBe(false);
    });

    it('should successfully cancel task', () => {
      // Get a task first
      slayerSystem.getSlayerTask('test-player', 'vannaka');
      expect(slayerSystem.getPlayerTask('test-player')).toBeDefined();
      
      const result = slayerSystem.cancelSlayerTask('test-player');
      expect(result).toBe(true);
      
      expect(slayerSystem.getPlayerTask('test-player')).toBeNull();
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:slayer_task_cancelled', {
        playerId: 'test-player',
        masterId: 'vannaka',
        masterName: 'Vannaka',
        assignmentId: expect.any(String),
        monsterName: expect.any(String),
        progress: expect.any(String),
      });
    });

    it('should fail to cancel task if none exists', () => {
      const result = slayerSystem.cancelSlayerTask('test-player');
      expect(result).toBe(false);
    });
  });

  describe('Monster Kill Mechanics', () => {
    beforeEach(async () => {
      await slayerSystem.init();
    });

    it('should progress task when killing assigned monster', () => {
      // Get a task
      slayerSystem.getSlayerTask('test-player', 'turael');
      const task = slayerSystem.getPlayerTask('test-player');
      expect(task).toBeDefined();
      
      const assignments = slayerSystem.getSlayerAssignments();
      const assignment = assignments.get(task!.assignmentId);
      expect(assignment).toBeDefined();
      
      // Kill a monster that matches the assignment
      const assignedMonsterId = assignment!.monsterIds[0];
      slayerSystem.handleMonsterKill('test-player', assignedMonsterId);
      
      const updatedTask = slayerSystem.getPlayerTask('test-player');
      expect(updatedTask!.monstersKilled).toBe(1);
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:slayer_task_progress', {
        playerId: 'test-player',
        assignmentId: task!.assignmentId,
        monsterName: assignment!.name,
        killed: 1,
        assigned: assignment!.amount,
        remaining: assignment!.amount - 1,
      });
    });

    it('should complete task when killing required amount', () => {
      // Get a task
      slayerSystem.getSlayerTask('test-player', 'turael');
      const task = slayerSystem.getPlayerTask('test-player');
      expect(task).toBeDefined();
      
      const assignments = slayerSystem.getSlayerAssignments();
      const assignment = assignments.get(task!.assignmentId);
      expect(assignment).toBeDefined();
      
      // Kill all required monsters
      const assignedMonsterId = assignment!.monsterIds[0];
      for (let i = 0; i < assignment!.amount; i++) {
        slayerSystem.handleMonsterKill('test-player', assignedMonsterId);
      }
      
      // Task should be completed and removed
      expect(slayerSystem.getPlayerTask('test-player')).toBeNull();
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:slayer_task_completed', {
        playerId: 'test-player',
        masterId: 'turael',
        masterName: 'Turael',
        assignmentId: assignment!.id,
        monsterName: assignment!.name,
        slayerXP: assignment!.slayerXP,
        slayerPoints: assignment!.slayerPoints,
        completionTime: expect.any(Number),
      });
      
      expect(mockWorld.events.emit).toHaveBeenCalledWith('rpg:xp_gain', {
        playerId: 'test-player',
        skill: 'slayer',
        amount: assignment!.slayerXP,
        source: 'slayer',
      });
    });

    it('should ignore kills for non-assigned monsters', () => {
      // Get a task
      slayerSystem.getSlayerTask('test-player', 'turael');
      const task = slayerSystem.getPlayerTask('test-player');
      expect(task).toBeDefined();
      
      // Kill a monster not in the assignment
      slayerSystem.handleMonsterKill('test-player', 'abyssal_demon');
      
      const updatedTask = slayerSystem.getPlayerTask('test-player');
      expect(updatedTask!.monstersKilled).toBe(0); // Should remain 0
    });

    it('should ignore kills when no active task', () => {
      // Don't get a task, just kill a monster
      slayerSystem.handleMonsterKill('test-player', 'abyssal_demon');
      
      // Should not cause any errors
      expect(slayerSystem.getPlayerTask('test-player')).toBeNull();
    });
  });

  describe('Monster Damage Validation', () => {
    it('should allow damage to non-slayer monsters', () => {
      const result = slayerSystem.canDamageMonster('test-player', 'goblin');
      expect(result).toBe(true);
    });

    it('should allow damage to slayer monster with sufficient level', () => {
      // Use a monster that doesn't require task
      const result = slayerSystem.canDamageMonster('test-player', 'aberrant_spectre');
      expect(result).toBe(true); // Player has level 75, aberrant spectre requires 60
    });

    it('should deny damage to slayer monster without sufficient level', () => {
      // Lower player slayer level
      mockPlayer.data.stats.slayer.level = 5;
      
      const result = slayerSystem.canDamageMonster('test-player', 'abyssal_demon');
      expect(result).toBe(false);
    });

    it('should deny damage to task-only monster without task', () => {
      const result = slayerSystem.canDamageMonster('test-player', 'abyssal_demon');
      expect(result).toBe(false); // Requires active task
    });

    it('should allow damage to task-only monster with matching task', async () => {
      await slayerSystem.init();
      
      // Get a task that includes abyssal demons
      slayerSystem.getSlayerTask('test-player', 'chaeldar');
      const task = slayerSystem.getPlayerTask('test-player');
      
      if (task) {
        const assignments = slayerSystem.getSlayerAssignments();
        const assignment = assignments.get(task.assignmentId);
        
        // If the assignment includes abyssal demons, check damage
        if (assignment && assignment.monsterIds.includes('abyssal_demon')) {
          const result = slayerSystem.canDamageMonster('test-player', 'abyssal_demon');
          expect(result).toBe(true);
        }
      }
    });
  });

  describe('Slayer Gear Validation', () => {
    it('should allow monsters without gear requirements', () => {
      const result = slayerSystem.hasRequiredSlayerGear('test-player', 'abyssal_demon');
      expect(result).toBe(true);
    });

    it('should allow monsters when player has required gear', () => {
      const result = slayerSystem.hasRequiredSlayerGear('test-player', 'basilisk');
      expect(result).toBe(true); // Player has mirror shield
    });

    it('should deny monsters when player lacks required gear', () => {
      // Remove mirror shield from inventory
      mockPlayer.data.inventory.items[0] = null;
      
      const result = slayerSystem.hasRequiredSlayerGear('test-player', 'basilisk');
      expect(result).toBe(false);
    });

    it('should check equipped gear', () => {
      // Remove from inventory but equip the item
      mockPlayer.data.inventory.items[0] = null;
      mockPlayer.data.inventory.equipment.shield = { itemId: 4156, quantity: 1 }; // Mirror shield
      
      const result = slayerSystem.hasRequiredSlayerGear('test-player', 'basilisk');
      expect(result).toBe(true);
    });
  });

  describe('Validation Methods', () => {
    beforeEach(async () => {
      await slayerSystem.init();
    });

    it('should validate task capability correctly', () => {
      // Valid case
      const validResult = slayerSystem.canGetTask('test-player', 'vannaka');
      expect(validResult.canGet).toBe(true);
      
      // Invalid level
      mockPlayer.data.stats.slayer.level = 5;
      const invalidLevelResult = slayerSystem.canGetTask('test-player', 'chaeldar');
      expect(invalidLevelResult.canGet).toBe(false);
      expect(invalidLevelResult.reason).toContain('level');
      
      // Already have task
      mockPlayer.data.stats.slayer.level = 75; // Reset level
      slayerSystem.getSlayerTask('test-player', 'vannaka');
      const alreadyHaveTaskResult = slayerSystem.canGetTask('test-player', 'chaeldar');
      expect(alreadyHaveTaskResult.canGet).toBe(false);
      expect(alreadyHaveTaskResult.reason).toContain('Already have');
    });

    it('should validate cancel capability correctly', () => {
      // No task case
      const noTaskResult = slayerSystem.canCancelTask('test-player');
      expect(noTaskResult.canCancel).toBe(false);
      expect(noTaskResult.reason).toContain('No active');
      
      // With task case
      slayerSystem.getSlayerTask('test-player', 'vannaka');
      const withTaskResult = slayerSystem.canCancelTask('test-player');
      expect(withTaskResult.canCancel).toBe(true);
    });

    it('should validate unknown masters', () => {
      const unknownMaster = slayerSystem.canGetTask('test-player', 'unknown_master');
      expect(unknownMaster.canGet).toBe(false);
      expect(unknownMaster.reason).toContain('Unknown');
    });

    it('should get masters by level', () => {
      const lowLevelMasters = slayerSystem.getMastersByLevel(1, 20);
      const midLevelMasters = slayerSystem.getMastersByLevel(21, 70);
      const highLevelMasters = slayerSystem.getMastersByLevel(71, 99);
      
      expect(lowLevelMasters.length).toBeGreaterThan(0);
      expect(midLevelMasters.length).toBeGreaterThan(0);
      expect(highLevelMasters.length).toBeGreaterThan(0);
      
      expect(lowLevelMasters.every(m => m.levelRequired >= 1 && m.levelRequired <= 20)).toBe(true);
      expect(midLevelMasters.every(m => m.levelRequired >= 21 && m.levelRequired <= 70)).toBe(true);
      expect(highLevelMasters.every(m => m.levelRequired >= 71 && m.levelRequired <= 99)).toBe(true);
    });

    it('should get assignments by level', () => {
      const assignments = slayerSystem.getAssignmentsByLevel(75, 95);
      
      expect(assignments.length).toBeGreaterThan(0);
      expect(assignments.every(a => a.slayerLevelRequired <= 75 && a.combatLevelRequired <= 95)).toBe(true);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await slayerSystem.init();
    });

    it('should handle get slayer task event', () => {
      const getSlayerTaskSpy = spyOn(slayerSystem, 'getSlayerTask');
      
      (slayerSystem as any).handleGetSlayerTask({
        playerId: 'test-player',
        masterId: 'vannaka'
      });
      
      expect(getSlayerTaskSpy).toHaveBeenCalledWith('test-player', 'vannaka');
    });

    it('should handle cancel slayer task event', () => {
      const cancelSlayerTaskSpy = spyOn(slayerSystem, 'cancelSlayerTask');
      
      (slayerSystem as any).handleCancelSlayerTask({
        playerId: 'test-player'
      });
      
      expect(cancelSlayerTaskSpy).toHaveBeenCalledWith('test-player');
    });

    it('should handle monster killed event', () => {
      const handleMonsterKillSpy = spyOn(slayerSystem, 'handleMonsterKill');
      
      (slayerSystem as any).handleMonsterKilled({
        playerId: 'test-player',
        monsterId: 'abyssal_demon'
      });
      
      expect(handleMonsterKillSpy).toHaveBeenCalledWith('test-player', 'abyssal_demon');
    });
  });

  describe('Random Assignment Selection', () => {
    beforeEach(async () => {
      await slayerSystem.init();
    });

    it('should select appropriate assignments for player level', () => {
      // Mock Math.random to make selection predictable
      const originalRandom = Math.random;
      Math.random = mock(() => 0.5);
      
      // Test with different masters
      const lowLevelResult = slayerSystem.getSlayerTask('test-player', 'turael');
      expect(lowLevelResult).toBe(true);
      
      let task = slayerSystem.getPlayerTask('test-player');
      expect(task).toBeDefined();
      
      slayerSystem.cancelSlayerTask('test-player');
      
      const highLevelResult = slayerSystem.getSlayerTask('test-player', 'chaeldar');
      expect(highLevelResult).toBe(true);
      
      task = slayerSystem.getPlayerTask('test-player');
      expect(task).toBeDefined();
      
      // Restore original Math.random
      Math.random = originalRandom;
    });

    it('should fail when no suitable assignments available', () => {
      // Set very low player levels
      mockPlayer.data.stats.slayer.level = 1;
      mockPlayer.data.stats.combat.level = 1;
      
      // Try to get task from high-level master
      const result = slayerSystem.getSlayerTask('test-player', 'nieve');
      expect(result).toBe(false);
    });
  });

  describe('System Cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      slayerSystem.destroy();
      
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:get_slayer_task');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:cancel_slayer_task');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:complete_slayer_kill');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:check_slayer_task');
      expect(mockWorld.events.off).toHaveBeenCalledWith('rpg:monster_killed');
    });
  });
});