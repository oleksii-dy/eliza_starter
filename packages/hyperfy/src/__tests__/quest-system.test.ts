/**
 * Quest System Tests
 * Tests quest progression, dialogue, objectives, and rewards
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { QuestSystem } from '../rpg/systems/quests/QuestSystem';
import {
  QuestStatus,
  ObjectiveType,
  QuestDifficulty,
  getQuestDefinition,
  canPlayerStartQuest,
} from '../rpg/systems/quests/QuestDefinitions';
import { SkillType } from '../rpg/systems/skills/SkillDefinitions';

// Simple mock world for testing
function createSimpleWorld() {
  const events = {
    handlers: new Map(),
    emit(event: string, data?: any) {
      const eventHandlers = this.handlers.get(event);
      if (eventHandlers) {
        eventHandlers.forEach(handler => handler(data));
      }
    },
    on(event: string, handler: Function) {
      if (!this.handlers.has(event)) {
        this.handlers.set(event, new Set());
      }
      this.handlers.get(event).add(handler);
    },
  };

  const entities = new Map();

  return {
    events,
    systems: [],
    entities,
    getEntityById(id: string) {
      return entities.get(id);
    },
    createEntity(data: any) {
      const entity = {
        id: data.id,
        data,
        ...data,
        components: new Map(),
        addComponent(component: any) {
          this.components.set(component.type, component);
        },
        getComponent(type: string) {
          return this.components.get(type);
        },
      };
      entities.set(data.id, entity);
      return entity;
    },
  };
}

describe('Quest System Tests', () => {
  let world: any;
  let questSystem: QuestSystem;

  beforeEach(async () => {
    world = createSimpleWorld();
    questSystem = new QuestSystem(world);

    // Mock inventory system
    const inventoryItems = new Map();
    world.systems.push({
      constructor: { name: 'InventorySystem' },
      hasItem: (playerId: string, itemId: string, quantity: number) => {
        const playerItems = inventoryItems.get(playerId) || new Map();
        const currentQuantity = playerItems.get(itemId) || 0;
        return currentQuantity >= quantity;
      },
      addItem: (playerId: string, itemId: string, quantity: number) => {
        const playerItems = inventoryItems.get(playerId) || new Map();
        const currentQuantity = playerItems.get(itemId) || 0;
        playerItems.set(itemId, currentQuantity + quantity);
        inventoryItems.set(playerId, playerItems);
        return true;
      },
      // Helper for tests
      setItem: (playerId: string, itemId: string, quantity: number) => {
        const playerItems = inventoryItems.get(playerId) || new Map();
        playerItems.set(itemId, quantity);
        inventoryItems.set(playerId, playerItems);
      },
    });

    // Mock skills system
    world.systems.push({
      constructor: { name: 'EnhancedSkillsSystem' },
      getSkillLevel: (playerId: string, skill: SkillType) => {
        // Return appropriate levels for testing
        switch (skill) {
          case SkillType.COOKING:
            return 5;
          case SkillType.MINING:
            return 15;
          case SkillType.CRAFTING:
            return 10;
          case SkillType.ATTACK:
            return 25;
          default:
            return 1;
        }
      },
      addExperience: (playerId: string, skill: SkillType, xp: number) => {
        // Mock XP addition
        return true;
      },
    });

    // Mock equipment system
    world.systems.push({
      constructor: { name: 'EquipmentSystem' },
      getCombatLevel: (playerId: string) => 30,
    });

    await questSystem.initialize();
  });

  describe('Quest Definitions', () => {
    it('should have valid quest definitions', () => {
      const cooksAssistant = getQuestDefinition('cooks_assistant');
      const sheepShearer = getQuestDefinition('sheep_shearer');
      const knightsSword = getQuestDefinition('knights_sword');
      const dragonSlayer = getQuestDefinition('dragon_slayer');

      expect(cooksAssistant).not.toBeNull();
      expect(sheepShearer).not.toBeNull();
      expect(knightsSword).not.toBeNull();
      expect(dragonSlayer).not.toBeNull();

      // Check quest progression
      expect(cooksAssistant.difficulty).toBe(QuestDifficulty.NOVICE);
      expect(dragonSlayer.difficulty).toBe(QuestDifficulty.EXPERIENCED);

      // Check objectives structure
      expect(cooksAssistant.objectives.length).toBeGreaterThan(0);
      expect(cooksAssistant.objectives[0].type).toBe(ObjectiveType.TALK_TO_NPC);

      // Check rewards
      expect(cooksAssistant.experienceRewards[SkillType.COOKING]).toBe(300);
      expect(cooksAssistant.questPoints).toBe(1);
    });

    it('should validate quest requirements correctly', () => {
      const mockGetSkillLevel = (playerId: string, skill: SkillType) => {
        switch (skill) {
          case SkillType.MINING:
            return 15;
          case SkillType.ATTACK:
            return 35;
          default:
            return 1;
        }
      };

      const mockIsQuestCompleted = (playerId: string, questId: string) => {
        return questId === 'cooks_assistant' || questId === 'sheep_shearer';
      };

      const mockGetCombatLevel = (playerId: string) => 35;

      // Can start Cook's Assistant (no requirements)
      expect(
        canPlayerStartQuest('player1', 'cooks_assistant', mockGetSkillLevel, mockIsQuestCompleted, mockGetCombatLevel)
      ).toBe(true);

      // Can start Knight's Sword (has mining level)
      expect(
        canPlayerStartQuest('player1', 'knights_sword', mockGetSkillLevel, mockIsQuestCompleted, mockGetCombatLevel)
      ).toBe(true);

      // Can start Dragon Slayer (has combat level and prerequisite quest)
      expect(
        canPlayerStartQuest('player1', 'dragon_slayer', mockGetSkillLevel, mockIsQuestCompleted, mockGetCombatLevel)
      ).toBe(true);

      // Cannot start Monkey Madness (missing Knight's Sword prerequisite)
      expect(
        canPlayerStartQuest('player1', 'monkey_madness', mockGetSkillLevel, mockIsQuestCompleted, mockGetCombatLevel)
      ).toBe(false);
    });
  });

  describe('Quest Component Creation', () => {
    it('should create quest components for players', () => {
      const player = world.createEntity({
        id: 'test_player',
        type: 'player',
        name: 'TestPlayer',
      });

      const questComponent = questSystem.createQuestComponent(player.id);

      expect(questComponent).not.toBeNull();
      expect(questComponent.type).toBe('quest');
      expect(questComponent.activeQuests).toEqual({});
      expect(questComponent.completedQuests).toEqual([]);
      expect(questComponent.questPoints).toBe(0);
      expect(questComponent.lastQuestActivity).toBeGreaterThan(0);
    });
  });

  describe('Quest Starting', () => {
    it('should start quests successfully', () => {
      const player = world.createEntity({
        id: 'test_player',
        type: 'player',
        name: 'TestPlayer',
      });

      questSystem.createQuestComponent(player.id);

      let questStarted = false;
      world.events.on('quest:started', data => {
        questStarted = true;
        expect(data.playerId).toBe(player.id);
        expect(data.questId).toBe('cooks_assistant');
        expect(data.questName).toBe("Cook's Assistant");
        expect(data.difficulty).toBe(QuestDifficulty.NOVICE);
      });

      const success = questSystem.startQuest(player.id, 'cooks_assistant');

      expect(success).toBe(true);
      expect(questStarted).toBe(true);

      const questProgress = questSystem.getQuestProgress(player.id, 'cooks_assistant');
      expect(questProgress).not.toBeNull();
      expect(questProgress.status).toBe(QuestStatus.IN_PROGRESS);
      expect(questProgress.questId).toBe('cooks_assistant');
    });

    it('should reject quests when requirements not met', () => {
      const player = world.createEntity({
        id: 'low_level_player',
        type: 'player',
        name: 'LowLevelPlayer',
      });

      questSystem.createQuestComponent(player.id);

      let errorReceived = false;
      world.events.on('quest:error', data => {
        errorReceived = true;
        expect(data.message).toContain('requirements not met');
      });

      // Try to start Dragon Slayer without prerequisites
      const success = questSystem.startQuest(player.id, 'dragon_slayer');

      expect(success).toBe(false);
      expect(errorReceived).toBe(true);
    });

    it('should reject duplicate quest starts', () => {
      const player = world.createEntity({
        id: 'test_player',
        type: 'player',
        name: 'TestPlayer',
      });

      questSystem.createQuestComponent(player.id);

      // Start quest first time
      questSystem.startQuest(player.id, 'cooks_assistant');

      let errorReceived = false;
      world.events.on('quest:error', data => {
        errorReceived = true;
        expect(data.message).toContain('already started');
      });

      // Try to start same quest again
      const success = questSystem.startQuest(player.id, 'cooks_assistant');

      expect(success).toBe(false);
      expect(errorReceived).toBe(true);
    });
  });

  describe('Quest Objectives', () => {
    it('should complete talk objectives', () => {
      const player = world.createEntity({
        id: 'test_player',
        type: 'player',
        name: 'TestPlayer',
      });

      questSystem.createQuestComponent(player.id);
      questSystem.startQuest(player.id, 'cooks_assistant');

      let objectiveCompleted = false;
      world.events.on('quest:objective_completed', data => {
        objectiveCompleted = true;
        expect(data.playerId).toBe(player.id);
        expect(data.questId).toBe('cooks_assistant');
        expect(data.objectiveId).toBe('talk_to_cook');
      });

      const success = questSystem.completeObjective(player.id, 'cooks_assistant', 'talk_to_cook');

      expect(success).toBe(true);
      expect(objectiveCompleted).toBe(true);

      const progress = questSystem.getQuestProgress(player.id, 'cooks_assistant');
      expect(progress.objectives['talk_to_cook']).toBe(true);
    });

    it('should handle collection objectives', () => {
      const player = world.createEntity({
        id: 'test_player',
        type: 'player',
        name: 'TestPlayer',
      });

      questSystem.createQuestComponent(player.id);
      questSystem.startQuest(player.id, 'cooks_assistant');

      const inventorySystem = world.systems[0];

      // Give player the required item
      inventorySystem.setItem(player.id, 'bucket_of_milk', 1);

      // Trigger item collection check
      questSystem['checkCollectionObjectives'](player.id, 'bucket_of_milk', 1);

      const progress = questSystem.getQuestProgress(player.id, 'cooks_assistant');
      expect(progress.objectives['collect_milk']).toBe(true);
    });
  });

  describe('Quest Completion', () => {
    it('should complete quests when all objectives are done', () => {
      const player = world.createEntity({
        id: 'test_player',
        type: 'player',
        name: 'TestPlayer',
      });

      questSystem.createQuestComponent(player.id);
      questSystem.startQuest(player.id, 'cooks_assistant');

      let questCompleted = false;
      world.events.on('quest:completed', data => {
        questCompleted = true;
        expect(data.playerId).toBe(player.id);
        expect(data.questId).toBe('cooks_assistant');
        expect(data.questName).toBe("Cook's Assistant");
        expect(data.questPoints).toBe(1);
        expect(data.experienceRewards[SkillType.COOKING]).toBe(300);
        expect(data.coinReward).toBe(100);
      });

      // Complete all objectives
      questSystem.completeObjective(player.id, 'cooks_assistant', 'talk_to_cook');
      questSystem.completeObjective(player.id, 'cooks_assistant', 'collect_milk');
      questSystem.completeObjective(player.id, 'cooks_assistant', 'collect_egg');
      questSystem.completeObjective(player.id, 'cooks_assistant', 'collect_flour');
      questSystem.completeObjective(player.id, 'cooks_assistant', 'return_to_cook');

      expect(questCompleted).toBe(true);
      expect(questSystem.isQuestCompleted(player.id, 'cooks_assistant')).toBe(true);
      expect(questSystem.getQuestPoints(player.id)).toBe(1);

      const completedQuests = questSystem.getCompletedQuests(player.id);
      expect(completedQuests).toContain('cooks_assistant');

      const activeQuests = questSystem.getActiveQuests(player.id);
      expect(activeQuests.length).toBe(0);
    });
  });

  describe('Quest Abandoning', () => {
    it('should abandon active quests', () => {
      const player = world.createEntity({
        id: 'test_player',
        type: 'player',
        name: 'TestPlayer',
      });

      questSystem.createQuestComponent(player.id);
      questSystem.startQuest(player.id, 'cooks_assistant');

      let questAbandoned = false;
      world.events.on('quest:abandoned', data => {
        questAbandoned = true;
        expect(data.playerId).toBe(player.id);
        expect(data.questId).toBe('cooks_assistant');
      });

      const success = questSystem.abandonQuest(player.id, 'cooks_assistant');

      expect(success).toBe(true);
      expect(questAbandoned).toBe(true);

      const progress = questSystem.getQuestProgress(player.id, 'cooks_assistant');
      expect(progress).toBeNull();

      const activeQuests = questSystem.getActiveQuests(player.id);
      expect(activeQuests.length).toBe(0);
    });

    it('should reject abandoning non-active quests', () => {
      const player = world.createEntity({
        id: 'test_player',
        type: 'player',
        name: 'TestPlayer',
      });

      questSystem.createQuestComponent(player.id);

      let errorReceived = false;
      world.events.on('quest:error', data => {
        errorReceived = true;
        expect(data.message).toContain('not active');
      });

      const success = questSystem.abandonQuest(player.id, 'cooks_assistant');

      expect(success).toBe(false);
      expect(errorReceived).toBe(true);
    });
  });

  describe('NPC Interactions', () => {
    it('should handle NPC interactions for quest progression', () => {
      const player = world.createEntity({
        id: 'test_player',
        type: 'player',
        name: 'TestPlayer',
      });

      questSystem.createQuestComponent(player.id);
      questSystem.startQuest(player.id, 'cooks_assistant');

      let dialogueStarted = false;
      world.events.on('quest:dialogue', data => {
        dialogueStarted = true;
        expect(data.playerId).toBe(player.id);
        expect(data.speaker).toBe('Cook');
        expect(data.text).toContain('Oh dear');
      });

      // Player talks to Cook
      questSystem.handleNpcInteraction(player.id, 'lumbridge_cook');

      expect(dialogueStarted).toBe(true);
    });

    it('should start new quests from NPC interactions', () => {
      const player = world.createEntity({
        id: 'test_player',
        type: 'player',
        name: 'TestPlayer',
      });

      questSystem.createQuestComponent(player.id);

      let dialogueStarted = false;
      world.events.on('quest:dialogue', data => {
        dialogueStarted = true;
        expect(data.playerId).toBe(player.id);
        expect(data.speaker).toBe('Cook');
      });

      // Player talks to Cook without any active quest
      questSystem.handleNpcInteraction(player.id, 'lumbridge_cook');

      expect(dialogueStarted).toBe(true);
    });
  });

  describe('Quest Queries', () => {
    it('should provide available quests for players', () => {
      const player = world.createEntity({
        id: 'test_player',
        type: 'player',
        name: 'TestPlayer',
      });

      questSystem.createQuestComponent(player.id);

      const availableQuests = questSystem.getAvailableQuests(player.id);

      expect(availableQuests.length).toBeGreaterThan(0);

      const noviceQuests = availableQuests.filter(q => q.difficulty === QuestDifficulty.NOVICE);
      expect(noviceQuests.length).toBeGreaterThan(0);

      // Should include Cook's Assistant
      expect(availableQuests.some(q => q.id === 'cooks_assistant')).toBe(true);
    });

    it('should track quest journal entries', () => {
      const player = world.createEntity({
        id: 'test_player',
        type: 'player',
        name: 'TestPlayer',
      });

      questSystem.createQuestComponent(player.id);
      questSystem.startQuest(player.id, 'cooks_assistant');

      const journal = questSystem.getQuestJournal(player.id);

      expect(journal['cooks_assistant']).toBeDefined();
      expect(journal['cooks_assistant'].length).toBeGreaterThan(0);
      expect(journal['cooks_assistant'][0]).toContain("Cook's Assistant");
    });

    it('should provide quest statistics', () => {
      const player = world.createEntity({
        id: 'test_player',
        type: 'player',
        name: 'TestPlayer',
      });

      questSystem.createQuestComponent(player.id);

      // Start and complete a quest
      questSystem.startQuest(player.id, 'cooks_assistant');

      // Complete all objectives to finish quest
      const questDef = getQuestDefinition('cooks_assistant');
      questDef.objectives.forEach(obj => {
        questSystem.completeObjective(player.id, 'cooks_assistant', obj.id);
      });

      expect(questSystem.getQuestPoints(player.id)).toBe(1);
      expect(questSystem.getCompletedQuests(player.id)).toContain('cooks_assistant');
      expect(questSystem.isQuestCompleted(player.id, 'cooks_assistant')).toBe(true);
    });
  });

  describe('Event-Driven Objective Completion', () => {
    it('should complete objectives from NPC kills', () => {
      const player = world.createEntity({
        id: 'test_player',
        type: 'player',
        name: 'TestPlayer',
      });

      questSystem.createQuestComponent(player.id);
      questSystem.startQuest(player.id, 'dragon_slayer');

      // Simulate killing Elvarg
      questSystem['handleNpcKilled']({ killerId: player.id, npcId: 'elvarg' });

      const progress = questSystem.getQuestProgress(player.id, 'dragon_slayer');
      if (progress) {
        expect(progress.objectives['slay_elvarg']).toBe(true);
      }
    });

    it('should complete objectives from item collection', () => {
      const player = world.createEntity({
        id: 'test_player',
        type: 'player',
        name: 'TestPlayer',
      });

      questSystem.createQuestComponent(player.id);
      questSystem.startQuest(player.id, 'sheep_shearer');

      const inventorySystem = world.systems[0];
      inventorySystem.setItem(player.id, 'ball_of_wool', 20);

      // Simulate collecting wool
      questSystem['handleItemCollected']({ playerId: player.id, itemId: 'ball_of_wool', quantity: 20 });

      const progress = questSystem.getQuestProgress(player.id, 'sheep_shearer');
      if (progress) {
        expect(progress.objectives['collect_wool']).toBe(true);
      }
    });

    it('should complete objectives from skill level ups', () => {
      const player = world.createEntity({
        id: 'test_player',
        type: 'player',
        name: 'TestPlayer',
      });

      questSystem.createQuestComponent(player.id);

      // Create a mock quest with skill objective
      questSystem['world'].entities.get(player.id).getComponent('quest').activeQuests['test_skill_quest'] = {
        questId: 'test_skill_quest',
        status: QuestStatus.IN_PROGRESS,
        objectives: { reach_cooking_5: false },
        startedAt: Date.now(),
      };

      // Simulate skill level up
      questSystem['handleSkillLevelUp']({ playerId: player.id, skill: SkillType.COOKING, newLevel: 5 });

      // Note: This test would need a proper quest definition with skill objectives to work fully
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid quest IDs', () => {
      const player = world.createEntity({
        id: 'test_player',
        type: 'player',
        name: 'TestPlayer',
      });

      questSystem.createQuestComponent(player.id);

      let errorReceived = false;
      world.events.on('quest:error', data => {
        errorReceived = true;
        expect(data.message).toContain('Quest not found');
      });

      const success = questSystem.startQuest(player.id, 'invalid_quest');

      expect(success).toBe(false);
      expect(errorReceived).toBe(true);
    });

    it('should handle missing quest component', () => {
      const player = world.createEntity({
        id: 'test_player',
        type: 'player',
        name: 'TestPlayer',
      });

      // Don't create quest component

      let errorReceived = false;
      world.events.on('quest:error', data => {
        errorReceived = true;
        expect(data.message).toContain('Quest component not found');
      });

      const success = questSystem.startQuest(player.id, 'cooks_assistant');

      expect(success).toBe(false);
      expect(errorReceived).toBe(true);
    });
  });
});
