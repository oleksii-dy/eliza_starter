/**
 * Quest Definitions - RuneScape-style quest content and progression
 * Defines quest requirements, objectives, rewards, and storylines
 */

import { SkillType } from '../skills/SkillDefinitions'

export enum QuestDifficulty {
  NOVICE = 'novice',
  INTERMEDIATE = 'intermediate',
  EXPERIENCED = 'experienced',
  MASTER = 'master',
  GRANDMASTER = 'grandmaster',
}

export enum QuestStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum ObjectiveType {
  KILL_NPCS = 'kill_npcs',
  COLLECT_ITEMS = 'collect_items',
  TALK_TO_NPC = 'talk_to_npc',
  REACH_LOCATION = 'reach_location',
  USE_ITEM = 'use_item',
  CRAFT_ITEMS = 'craft_items',
  SKILL_LEVEL = 'skill_level',
  COMPLETE_QUEST = 'complete_quest',
  CUSTOM = 'custom',
}

export interface QuestObjective {
  id: string
  type: ObjectiveType
  description: string
  target?: string // NPC ID, item ID, location ID, etc.
  quantity?: number
  skillType?: SkillType
  level?: number
  completed: boolean
  hidden?: boolean // Don't show until previous objectives complete
}

export interface QuestRequirement {
  type: 'quest' | 'skill' | 'item' | 'level'
  questId?: string
  skillType?: SkillType
  level?: number
  itemId?: string
  quantity?: number
  combatLevel?: number
}

export interface QuestReward {
  type: 'experience' | 'item' | 'coins' | 'access' | 'ability'
  skillType?: SkillType
  experience?: number
  itemId?: string
  quantity?: number
  coins?: number
  unlocks?: string[] // Areas, NPCs, features unlocked
  description: string
}

export interface DialogueNode {
  id: string
  speaker: string // NPC name or 'Player'
  text: string
  choices?: {
    text: string
    nextNodeId: string
    condition?: (playerId: string) => boolean
  }[]
  nextNodeId?: string // For linear dialogue
  action?: {
    type: 'complete_objective' | 'give_item' | 'teleport' | 'custom'
    objectiveId?: string
    itemId?: string
    quantity?: number
    location?: { x: number; y: number; z: number }
    customAction?: string
  }
}

export interface QuestDefinition {
  id: string
  name: string
  description: string
  lore: string
  difficulty: QuestDifficulty
  series?: string // Quest series name

  // Requirements
  requirements: QuestRequirement[]

  // Quest content
  objectives: QuestObjective[]
  dialogue: { [nodeId: string]: DialogueNode }
  startNpcId: string

  // Rewards
  experienceRewards: { [skill in SkillType]?: number }
  itemRewards: { itemId: string; quantity: number }[]
  coinReward: number
  questPoints: number
  unlocks: string[] // Features, areas, or content unlocked

  // Metadata
  estimatedDuration: number // minutes
  membersOnly: boolean
  category: string // 'Combat', 'Skill', 'Story', etc.
}

// Core RuneScape-style quests
export const QUEST_DEFINITIONS: { [key: string]: QuestDefinition } = {
  cooks_assistant: {
    id: 'cooks_assistant',
    name: "Cook's Assistant",
    description: "Help the Lumbridge cook prepare a cake for the Duke's birthday.",
    lore: "The cook in Lumbridge Castle is in a panic! The Duke's birthday is today and he needs to prepare a special cake, but he's missing some key ingredients.",
    difficulty: QuestDifficulty.NOVICE,
    requirements: [],
    objectives: [
      {
        id: 'talk_to_cook',
        type: ObjectiveType.TALK_TO_NPC,
        description: 'Talk to the Cook in Lumbridge Castle',
        target: 'lumbridge_cook',
        completed: false,
      },
      {
        id: 'collect_milk',
        type: ObjectiveType.COLLECT_ITEMS,
        description: 'Collect a bucket of milk',
        target: 'bucket_of_milk',
        quantity: 1,
        completed: false,
      },
      {
        id: 'collect_egg',
        type: ObjectiveType.COLLECT_ITEMS,
        description: 'Collect an egg',
        target: 'egg',
        quantity: 1,
        completed: false,
      },
      {
        id: 'collect_flour',
        type: ObjectiveType.COLLECT_ITEMS,
        description: 'Collect a pot of flour',
        target: 'pot_of_flour',
        quantity: 1,
        completed: false,
      },
      {
        id: 'return_to_cook',
        type: ObjectiveType.TALK_TO_NPC,
        description: 'Return the ingredients to the Cook',
        target: 'lumbridge_cook',
        completed: false,
        hidden: true,
      },
    ],
    dialogue: {
      start: {
        id: 'start',
        speaker: 'Cook',
        text: "Oh dear, oh dear! The Duke's birthday is today and I haven't even started baking his cake! I need milk, an egg, and flour. Could you help me gather them?",
        choices: [
          { text: "Yes, I'll help you!", nextNodeId: 'accept' },
          { text: "Sorry, I'm too busy.", nextNodeId: 'decline' },
        ],
      },
      accept: {
        id: 'accept',
        speaker: 'Cook',
        text: 'Wonderful! I need a bucket of milk from a cow, an egg from a chicken, and a pot of flour from the wheat field. Please hurry!',
        action: { type: 'complete_objective', objectiveId: 'talk_to_cook' },
      },
      decline: {
        id: 'decline',
        speaker: 'Cook',
        text: 'Oh... well, I understand you must be busy. Please come back if you change your mind!',
      },
      complete: {
        id: 'complete',
        speaker: 'Cook',
        text: "Perfect! You've brought everything I need. The Duke will be so pleased with his cake. Here's your reward!",
        action: { type: 'complete_objective', objectiveId: 'return_to_cook' },
      },
    },
    startNpcId: 'lumbridge_cook',
    experienceRewards: {
      [SkillType.COOKING]: 300,
    },
    itemRewards: [{ itemId: 'coins', quantity: 100 }],
    coinReward: 100,
    questPoints: 1,
    unlocks: ['cooking_tutorial'],
    estimatedDuration: 15,
    membersOnly: false,
    category: 'Skill',
  },

  sheep_shearer: {
    id: 'sheep_shearer',
    name: 'Sheep Shearer',
    description: 'Help Fred the Farmer collect wool from his sheep.',
    lore: "Fred the Farmer has lost his shears and needs help collecting wool from his sheep. It's shearing season and the sheep are getting uncomfortable!",
    difficulty: QuestDifficulty.NOVICE,
    requirements: [],
    objectives: [
      {
        id: 'talk_to_fred',
        type: ObjectiveType.TALK_TO_NPC,
        description: 'Talk to Fred the Farmer',
        target: 'fred_farmer',
        completed: false,
      },
      {
        id: 'collect_wool',
        type: ObjectiveType.COLLECT_ITEMS,
        description: 'Collect 20 balls of wool',
        target: 'ball_of_wool',
        quantity: 20,
        completed: false,
      },
      {
        id: 'return_wool',
        type: ObjectiveType.TALK_TO_NPC,
        description: 'Return the wool to Fred',
        target: 'fred_farmer',
        completed: false,
        hidden: true,
      },
    ],
    dialogue: {
      start: {
        id: 'start',
        speaker: 'Fred the Farmer',
        text: "Ah, perfect timing! I've lost my shears and my sheep desperately need shearing. Could you collect 20 balls of wool for me? You can shear the sheep in my field.",
        choices: [
          { text: "Sure, I'll help!", nextNodeId: 'accept' },
          { text: 'Not right now.', nextNodeId: 'decline' },
        ],
      },
      accept: {
        id: 'accept',
        speaker: 'Fred the Farmer',
        text: "Excellent! My sheep are in the field behind me. Use shears on them to collect wool. Bring me 20 balls of wool when you're done!",
        action: { type: 'complete_objective', objectiveId: 'talk_to_fred' },
      },
      complete: {
        id: 'complete',
        speaker: 'Fred the Farmer',
        text: "Fantastic! That's exactly what I needed. My sheep look much more comfortable now. Here's some coin for your trouble!",
        action: { type: 'complete_objective', objectiveId: 'return_wool' },
      },
    },
    startNpcId: 'fred_farmer',
    experienceRewards: {
      [SkillType.CRAFTING]: 150,
    },
    itemRewards: [{ itemId: 'coins', quantity: 60 }],
    coinReward: 60,
    questPoints: 1,
    unlocks: ['spinning_wheel_access'],
    estimatedDuration: 20,
    membersOnly: false,
    category: 'Skill',
  },

  knights_sword: {
    id: 'knights_sword',
    name: "The Knight's Sword",
    description: 'Help Sir Vyvin replace his lost ceremonial sword.',
    lore: 'Sir Vyvin has lost his ceremonial sword and needs it replaced before the ceremony. The sword requires special blurite ore and advanced smithing techniques.',
    difficulty: QuestDifficulty.INTERMEDIATE,
    requirements: [{ type: 'skill', skillType: SkillType.MINING, level: 10 }],
    objectives: [
      {
        id: 'talk_to_vyvin',
        type: ObjectiveType.TALK_TO_NPC,
        description: 'Talk to Sir Vyvin',
        target: 'sir_vyvin',
        completed: false,
      },
      {
        id: 'learn_about_sword',
        type: ObjectiveType.TALK_TO_NPC,
        description: 'Learn about the sword from Reldo',
        target: 'reldo',
        completed: false,
      },
      {
        id: 'mine_blurite',
        type: ObjectiveType.COLLECT_ITEMS,
        description: 'Mine blurite ore',
        target: 'blurite_ore',
        quantity: 2,
        completed: false,
      },
      {
        id: 'get_redberry_pie',
        type: ObjectiveType.COLLECT_ITEMS,
        description: 'Get a redberry pie for Thurgo',
        target: 'redberry_pie',
        quantity: 1,
        completed: false,
      },
      {
        id: 'talk_to_thurgo',
        type: ObjectiveType.TALK_TO_NPC,
        description: 'Talk to Thurgo the dwarf smith',
        target: 'thurgo',
        completed: false,
      },
      {
        id: 'return_sword',
        type: ObjectiveType.TALK_TO_NPC,
        description: 'Return the sword to Sir Vyvin',
        target: 'sir_vyvin',
        completed: false,
        hidden: true,
      },
    ],
    dialogue: {
      start: {
        id: 'start',
        speaker: 'Sir Vyvin',
        text: "Oh dear! I've lost my ceremonial sword and the ceremony is tomorrow! It was made of blurite - a very special metal. Could you help me get it replaced?",
        choices: [
          { text: "Yes, I'll help you find a replacement.", nextNodeId: 'accept' },
          { text: 'Sorry, that sounds too difficult.', nextNodeId: 'decline' },
        ],
      },
      accept: {
        id: 'accept',
        speaker: 'Sir Vyvin',
        text: 'Thank you! The sword was made by an Imcando dwarf long ago. Perhaps Reldo in the palace library knows more about them.',
        action: { type: 'complete_objective', objectiveId: 'talk_to_vyvin' },
      },
    },
    startNpcId: 'sir_vyvin',
    experienceRewards: {
      [SkillType.SMITHING]: 12725,
    },
    itemRewards: [],
    coinReward: 0,
    questPoints: 1,
    unlocks: ['blurite_smithing'],
    estimatedDuration: 45,
    membersOnly: false,
    category: 'Skill',
  },

  dragon_slayer: {
    id: 'dragon_slayer',
    name: 'Dragon Slayer',
    description: 'Prove yourself worthy by slaying the mighty dragon Elvarg.',
    lore: 'The island of Crandor was once a thriving community, until the dragon Elvarg came and destroyed it. Now the dragon threatens the mainland. Can you defeat this ancient evil?',
    difficulty: QuestDifficulty.EXPERIENCED,
    requirements: [
      { type: 'level', combatLevel: 32 },
      { type: 'quest', questId: 'cooks_assistant' },
      { type: 'quest', questId: 'sheep_shearer' },
    ],
    objectives: [
      {
        id: 'talk_to_guildmaster',
        type: ObjectiveType.TALK_TO_NPC,
        description: 'Talk to the Champions Guild Guildmaster',
        target: 'guildmaster',
        completed: false,
      },
      {
        id: 'find_map_pieces',
        type: ObjectiveType.COLLECT_ITEMS,
        description: 'Find the three map pieces',
        target: 'map_piece',
        quantity: 3,
        completed: false,
      },
      {
        id: 'get_antidragon_shield',
        type: ObjectiveType.COLLECT_ITEMS,
        description: 'Obtain an anti-dragon shield',
        target: 'antidragon_shield',
        quantity: 1,
        completed: false,
      },
      {
        id: 'prepare_ship',
        type: ObjectiveType.CUSTOM,
        description: 'Prepare the ship to Crandor',
        completed: false,
      },
      {
        id: 'slay_elvarg',
        type: ObjectiveType.KILL_NPCS,
        description: 'Slay the dragon Elvarg',
        target: 'elvarg',
        quantity: 1,
        completed: false,
      },
      {
        id: 'return_to_guildmaster',
        type: ObjectiveType.TALK_TO_NPC,
        description: 'Return to the Guildmaster',
        target: 'guildmaster',
        completed: false,
        hidden: true,
      },
    ],
    dialogue: {
      start: {
        id: 'start',
        speaker: 'Guildmaster',
        text: "So, you think you're ready to face a dragon? Elvarg has terrorized these lands for years. If you can defeat her, you'll earn the right to wear rune plate mail!",
        choices: [
          { text: "Yes, I'm ready for the challenge!", nextNodeId: 'accept' },
          { text: 'A dragon? Maybe I should train more first...', nextNodeId: 'decline' },
        ],
      },
      accept: {
        id: 'accept',
        speaker: 'Guildmaster',
        text: "Brave words! You'll need to find the map to Crandor - it was torn into three pieces for safety. You'll also need an anti-dragon shield. Good luck, adventurer!",
        action: { type: 'complete_objective', objectiveId: 'talk_to_guildmaster' },
      },
    },
    startNpcId: 'guildmaster',
    experienceRewards: {
      [SkillType.STRENGTH]: 18650,
      [SkillType.DEFENCE]: 18650,
    },
    itemRewards: [],
    coinReward: 0,
    questPoints: 2,
    unlocks: ['rune_platebody_wear', 'green_dhide_body_wear'],
    estimatedDuration: 120,
    membersOnly: false,
    category: 'Combat',
  },

  monkey_madness: {
    id: 'monkey_madness',
    name: 'Monkey Madness',
    description: 'Go undercover as a monkey to infiltrate Ape Atoll.',
    lore: "The monkey colony on Ape Atoll has been acting strangely. King Narnode Shareen suspects they're planning something and needs you to investigate. But getting onto the island requires some very unusual methods...",
    difficulty: QuestDifficulty.MASTER,
    requirements: [
      { type: 'quest', questId: 'knights_sword' },
      { type: 'skill', skillType: SkillType.AGILITY, level: 40 },
      { type: 'skill', skillType: SkillType.THIEVING, level: 35 },
    ],
    objectives: [
      {
        id: 'talk_to_narnode',
        type: ObjectiveType.TALK_TO_NPC,
        description: 'Talk to King Narnode Shareen',
        target: 'king_narnode',
        completed: false,
      },
      {
        id: 'infiltrate_ape_atoll',
        type: ObjectiveType.CUSTOM,
        description: 'Infiltrate Ape Atoll disguised as a monkey',
        completed: false,
      },
      {
        id: 'gather_intelligence',
        type: ObjectiveType.CUSTOM,
        description: 'Gather intelligence on the monkey plans',
        completed: false,
      },
      {
        id: 'escape_ape_atoll',
        type: ObjectiveType.CUSTOM,
        description: 'Escape from Ape Atoll',
        completed: false,
      },
      {
        id: 'report_to_narnode',
        type: ObjectiveType.TALK_TO_NPC,
        description: 'Report your findings to King Narnode',
        target: 'king_narnode',
        completed: false,
      },
    ],
    dialogue: {
      start: {
        id: 'start',
        speaker: 'King Narnode Shareen',
        text: 'Ah, a brave adventurer! I have a most unusual request. The monkeys on Ape Atoll have been acting suspiciously. I need someone to go undercover and investigate. Are you up for the challenge?',
        choices: [
          { text: 'Undercover as a monkey? That sounds interesting!', nextNodeId: 'accept' },
          { text: 'That sounds completely insane.', nextNodeId: 'decline' },
        ],
      },
      accept: {
        id: 'accept',
        speaker: 'King Narnode Shareen',
        text: "Excellent! It will be dangerous - the monkeys don't take kindly to intruders. But with the right disguise and careful planning, you might just pull it off!",
        action: { type: 'complete_objective', objectiveId: 'talk_to_narnode' },
      },
    },
    startNpcId: 'king_narnode',
    experienceRewards: {
      [SkillType.ATTACK]: 35000,
      [SkillType.DEFENCE]: 35000,
      [SkillType.HITPOINTS]: 35000,
      [SkillType.STRENGTH]: 35000,
    },
    itemRewards: [{ itemId: 'dragon_scimitar', quantity: 1 }],
    coinReward: 0,
    questPoints: 3,
    unlocks: ['dragon_weapons_wear', 'ape_atoll_access'],
    estimatedDuration: 180,
    membersOnly: true,
    category: 'Combat',
  },

  legends_quest: {
    id: 'legends_quest',
    name: 'Legends Quest',
    description: 'Prove yourself worthy of joining the Legends Guild.',
    lore: 'The ultimate test of a true adventurer. Deep in the jungles of Karamja lies an ancient civilization and powerful artifacts. Only the most skilled and experienced adventurers can hope to complete this quest.',
    difficulty: QuestDifficulty.GRANDMASTER,
    requirements: [
      { type: 'quest', questId: 'dragon_slayer' },
      { type: 'quest', questId: 'monkey_madness' },
      { type: 'skill', skillType: SkillType.ATTACK, level: 50 },
      { type: 'skill', skillType: SkillType.STRENGTH, level: 50 },
      { type: 'skill', skillType: SkillType.MINING, level: 52 },
      { type: 'skill', skillType: SkillType.SMITHING, level: 50 },
      { type: 'skill', skillType: SkillType.MAGIC, level: 56 },
      { type: 'skill', skillType: SkillType.PRAYER, level: 42 },
      { type: 'skill', skillType: SkillType.CRAFTING, level: 50 },
      { type: 'skill', skillType: SkillType.AGILITY, level: 50 },
      { type: 'skill', skillType: SkillType.THIEVING, level: 50 },
    ],
    objectives: [
      {
        id: 'talk_to_legends_guard',
        type: ObjectiveType.TALK_TO_NPC,
        description: 'Talk to the Legends Guild guard',
        target: 'legends_guard',
        completed: false,
      },
      {
        id: 'explore_kharazi_jungle',
        type: ObjectiveType.REACH_LOCATION,
        description: 'Explore the Kharazi Jungle',
        target: 'kharazi_jungle',
        completed: false,
      },
      {
        id: 'complete_totem',
        type: ObjectiveType.CUSTOM,
        description: 'Complete the ancient totem',
        completed: false,
      },
      {
        id: 'defeat_demon',
        type: ObjectiveType.KILL_NPCS,
        description: 'Defeat the jungle demon',
        target: 'jungle_demon',
        quantity: 1,
        completed: false,
      },
      {
        id: 'claim_reward',
        type: ObjectiveType.TALK_TO_NPC,
        description: 'Claim your reward from the Legends Guild',
        target: 'legends_guard',
        completed: false,
      },
    ],
    dialogue: {
      start: {
        id: 'start',
        speaker: 'Legends Guild Guard',
        text: 'Welcome, adventurer. You seek to join the Legends Guild? This is no simple task. You must venture into the dangerous Kharazi Jungle and prove your worth. Are you prepared for the ultimate challenge?',
        choices: [
          { text: "Yes, I'm ready to become a legend!", nextNodeId: 'accept' },
          { text: 'I need more time to prepare.', nextNodeId: 'decline' },
        ],
      },
      accept: {
        id: 'accept',
        speaker: 'Legends Guild Guard',
        text: 'Then let your legend begin! The jungle holds ancient secrets and terrible dangers. Only the worthy will return. May fortune favor you, adventurer!',
        action: { type: 'complete_objective', objectiveId: 'talk_to_legends_guard' },
      },
    },
    startNpcId: 'legends_guard',
    experienceRewards: {
      [SkillType.ATTACK]: 7650,
      [SkillType.DEFENCE]: 7650,
      [SkillType.STRENGTH]: 7650,
      [SkillType.HITPOINTS]: 7650,
    },
    itemRewards: [{ itemId: 'legends_cape', quantity: 1 }],
    coinReward: 0,
    questPoints: 4,
    unlocks: ['legends_guild_access', 'dragon_sq_shield_make'],
    estimatedDuration: 300,
    membersOnly: true,
    category: 'Combat',
  },
}

// Helper functions
export function getQuestDefinition(questId: string): QuestDefinition | null {
  return QUEST_DEFINITIONS[questId] || null
}

export function getQuestsByDifficulty(difficulty: QuestDifficulty): QuestDefinition[] {
  return Object.values(QUEST_DEFINITIONS).filter(quest => quest.difficulty === difficulty)
}

export function getQuestsByCategory(category: string): QuestDefinition[] {
  return Object.values(QUEST_DEFINITIONS).filter(quest => quest.category === category)
}

export function canPlayerStartQuest(
  playerId: string,
  questId: string,
  getSkillLevel: (playerId: string, skill: SkillType) => number,
  isQuestCompleted: (playerId: string, questId: string) => boolean,
  getCombatLevel: (playerId: string) => number
): boolean {
  const quest = getQuestDefinition(questId)
  if (!quest) {
    return false
  }

  for (const requirement of quest.requirements) {
    switch (requirement.type) {
      case 'skill':
        if (requirement.skillType && requirement.level) {
          if (getSkillLevel(playerId, requirement.skillType) < requirement.level) {
            return false
          }
        }
        break
      case 'quest':
        if (requirement.questId && !isQuestCompleted(playerId, requirement.questId)) {
          return false
        }
        break
      case 'level':
        if (requirement.combatLevel && getCombatLevel(playerId) < requirement.combatLevel) {
          return false
        }
        break
    }
  }

  return true
}

export function getAllAvailableQuests(
  playerId: string,
  getSkillLevel: (playerId: string, skill: SkillType) => number,
  isQuestCompleted: (playerId: string, questId: string) => boolean,
  getCombatLevel: (playerId: string) => number
): QuestDefinition[] {
  return Object.values(QUEST_DEFINITIONS).filter(
    quest =>
      !isQuestCompleted(playerId, quest.id) &&
      canPlayerStartQuest(playerId, quest.id, getSkillLevel, isQuestCompleted, getCombatLevel)
  )
}
