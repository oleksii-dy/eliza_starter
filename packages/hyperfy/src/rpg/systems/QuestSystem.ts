/**
 * Quest System - RuneScape-style quest progression and management
 * Handles quest states, objectives, dialogue, and rewards
 */

import { System } from '../../core/systems/System'
import type { World, Entity } from '../../types'
import {
  QuestDefinition,
  QuestStatus,
  QuestObjective,
  ObjectiveType,
  DialogueNode,
  getQuestDefinition,
  canPlayerStartQuest,
  getAllAvailableQuests,
  QUEST_DEFINITIONS,
} from './quests/QuestDefinitions'
import { SkillType } from './skills/SkillDefinitions'

export interface QuestProgress {
  questId: string
  status: QuestStatus
  objectives: { [objectiveId: string]: boolean }
  currentDialogueNode?: string
  startedAt: number
  completedAt?: number
}

export interface QuestComponent {
  type: 'quest'
  activeQuests: { [questId: string]: QuestProgress }
  completedQuests: string[]
  questPoints: number
  lastQuestActivity: number
}

export interface QuestDialogueState {
  playerId: string
  npcId: string
  questId: string
  currentNodeId: string
  context: { [key: string]: any }
}

export class QuestSystem extends System {
  private activeDialogues: Map<string, QuestDialogueState> = new Map()
  private questJournal: Map<string, { [questId: string]: string[] }> = new Map() // Player quest journal entries

  constructor(world: World) {
    super(world)
  }

  async initialize(): Promise<void> {
    console.log('[QuestSystem] Initializing...')

    // Listen for quest events
    this.world.events.on('player:joined', this.handlePlayerJoined.bind(this))
    this.world.events.on('quest:start', this.handleStartQuest.bind(this))
    this.world.events.on('quest:abandon', this.handleAbandonQuest.bind(this))
    this.world.events.on('quest:complete_objective', this.handleCompleteObjective.bind(this))
    this.world.events.on('quest:talk_to_npc', this.handleTalkToNpc.bind(this))
    this.world.events.on('quest:dialogue_choice', this.handleDialogueChoice.bind(this))
    this.world.events.on('quest:check_progress', this.handleCheckProgress.bind(this))
    this.world.events.on('quest:view_journal', this.handleViewJournal.bind(this))

    // Listen for game events that might complete objectives
    this.world.events.on('combat:npc_killed', this.handleNpcKilled.bind(this))
    this.world.events.on('inventory:item_added', this.handleItemCollected.bind(this))
    this.world.events.on('skills:level_up', this.handleSkillLevelUp.bind(this))
    this.world.events.on('player:location_reached', this.handleLocationReached.bind(this))
    this.world.events.on('inventory:item_used', this.handleItemUsed.bind(this))

    console.log('[QuestSystem] Initialized with quest tracking and dialogue system')
  }

  private handlePlayerJoined(data: any): void {
    const { entityId } = data
    this.createQuestComponent(entityId)
  }

  public createQuestComponent(entityId: string): QuestComponent | null {
    const entity = this.world.getEntityById(entityId)
    if (!entity) {
      return null
    }

    const questComponent: QuestComponent = {
      type: 'quest',
      activeQuests: {},
      completedQuests: [],
      questPoints: 0,
      lastQuestActivity: Date.now(),
    }

    entity.addComponent(questComponent)

    // Initialize quest journal
    this.questJournal.set(entityId, {})

    return questComponent
  }

  private handleStartQuest(data: any): void {
    const { playerId, questId } = data
    this.startQuest(playerId, questId)
  }

  private handleAbandonQuest(data: any): void {
    const { playerId, questId } = data
    this.abandonQuest(playerId, questId)
  }

  private handleCompleteObjective(data: any): void {
    const { playerId, questId, objectiveId } = data
    this.completeObjective(playerId, questId, objectiveId)
  }

  private handleTalkToNpc(data: any): void {
    const { playerId, npcId } = data
    this.handleNpcInteraction(playerId, npcId)
  }

  private handleDialogueChoice(data: any): void {
    const { playerId, choiceIndex } = data
    this.processDialogueChoice(playerId, choiceIndex)
  }

  private handleCheckProgress(data: any): void {
    const { playerId, questId } = data
    const progress = this.getQuestProgress(playerId, questId)

    this.world.events.emit('quest:progress_response', {
      playerId,
      questId,
      progress,
    })
  }

  private handleViewJournal(data: any): void {
    const { playerId } = data
    const journal = this.getQuestJournal(playerId)

    this.world.events.emit('quest:journal_response', {
      playerId,
      journal,
    })
  }

  public startQuest(playerId: string, questId: string): boolean {
    const entity = this.world.getEntityById(playerId)
    const questDef = getQuestDefinition(questId)

    if (!entity || !questDef) {
      this.world.events.emit('quest:error', {
        playerId,
        message: 'Quest not found',
      })
      return false
    }

    const questComponent = entity.getComponent('quest') as QuestComponent
    if (!questComponent) {
      this.world.events.emit('quest:error', {
        playerId,
        message: 'Quest component not found',
      })
      return false
    }

    // Check if quest is already started or completed
    if (questComponent.activeQuests[questId] || questComponent.completedQuests.includes(questId)) {
      this.world.events.emit('quest:error', {
        playerId,
        message: 'Quest already started or completed',
      })
      return false
    }

    // Check requirements
    if (!this.canPlayerStartQuest(playerId, questId)) {
      this.world.events.emit('quest:error', {
        playerId,
        message: 'Quest requirements not met',
      })
      return false
    }

    // Initialize quest progress
    const objectives: { [objectiveId: string]: boolean } = {}
    questDef.objectives.forEach(obj => {
      objectives[obj.id] = false
    })

    const questProgress: QuestProgress = {
      questId,
      status: QuestStatus.IN_PROGRESS,
      objectives,
      startedAt: Date.now(),
    }

    questComponent.activeQuests[questId] = questProgress
    questComponent.lastQuestActivity = Date.now()

    // Add initial journal entry
    this.addJournalEntry(playerId, questId, `Started quest: ${questDef.name}`)
    this.addJournalEntry(playerId, questId, questDef.description)

    // Start dialogue with quest giver if applicable
    if (questDef.startNpcId && questDef.dialogue.start) {
      this.startDialogue(playerId, questDef.startNpcId, questId, 'start')
    }

    this.world.events.emit('quest:started', {
      playerId,
      questId,
      questName: questDef.name,
      difficulty: questDef.difficulty,
    })

    return true
  }

  public abandonQuest(playerId: string, questId: string): boolean {
    const entity = this.world.getEntityById(playerId)
    if (!entity) {
      return false
    }

    const questComponent = entity.getComponent('quest') as QuestComponent
    if (!questComponent || !questComponent.activeQuests[questId]) {
      this.world.events.emit('quest:error', {
        playerId,
        message: 'Quest not active',
      })
      return false
    }

    // Remove from active quests
    delete questComponent.activeQuests[questId]
    questComponent.lastQuestActivity = Date.now()

    // Clear any active dialogue
    this.activeDialogues.delete(playerId)

    // Add journal entry
    this.addJournalEntry(playerId, questId, 'Quest abandoned')

    this.world.events.emit('quest:abandoned', {
      playerId,
      questId,
    })

    return true
  }

  public completeObjective(playerId: string, questId: string, objectiveId: string): boolean {
    const entity = this.world.getEntityById(playerId)
    const questDef = getQuestDefinition(questId)

    if (!entity || !questDef) {
      return false
    }

    const questComponent = entity.getComponent('quest') as QuestComponent
    const questProgress = questComponent?.activeQuests[questId]

    if (!questProgress) {
      return false
    }

    // Mark objective as complete
    questProgress.objectives[objectiveId] = true
    questComponent.lastQuestActivity = Date.now()

    const objective = questDef.objectives.find(obj => obj.id === objectiveId)
    if (objective) {
      this.addJournalEntry(playerId, questId, `✓ ${objective.description}`)
    }

    this.world.events.emit('quest:objective_completed', {
      playerId,
      questId,
      objectiveId,
      description: objective?.description,
    })

    // Check if quest is complete
    const allObjectivesComplete = questDef.objectives.every(obj => questProgress.objectives[obj.id])

    if (allObjectivesComplete) {
      this.completeQuest(playerId, questId)
    }

    return true
  }

  private completeQuest(playerId: string, questId: string): void {
    const entity = this.world.getEntityById(playerId)
    const questDef = getQuestDefinition(questId)

    if (!entity || !questDef) {
      return
    }

    const questComponent = entity.getComponent('quest') as QuestComponent
    if (!questComponent) {
      return
    }

    const questProgress = questComponent.activeQuests[questId]
    if (!questProgress) {
      return
    }

    // Mark as completed
    questProgress.status = QuestStatus.COMPLETED
    questProgress.completedAt = Date.now()

    // Move to completed quests
    questComponent.completedQuests.push(questId)
    delete questComponent.activeQuests[questId]

    // Add quest points
    questComponent.questPoints += questDef.questPoints

    // Give rewards
    this.giveQuestRewards(playerId, questDef)

    // Add journal entry
    this.addJournalEntry(playerId, questId, `Quest completed! Gained ${questDef.questPoints} quest points.`)

    this.world.events.emit('quest:completed', {
      playerId,
      questId,
      questName: questDef.name,
      questPoints: questDef.questPoints,
      experienceRewards: questDef.experienceRewards,
      itemRewards: questDef.itemRewards,
      coinReward: questDef.coinReward,
      unlocks: questDef.unlocks,
    })
  }

  private giveQuestRewards(playerId: string, questDef: QuestDefinition): void {
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem')
    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem')

    // Give experience rewards
    if (skillsSystem) {
      Object.entries(questDef.experienceRewards).forEach(([skill, xp]) => {
        ;(skillsSystem as any).addExperience(playerId, skill as SkillType, xp)
      })
    }

    // Give item rewards
    if (inventorySystem) {
      questDef.itemRewards.forEach(reward => {
        ;(inventorySystem as any).addItem(playerId, reward.itemId, reward.quantity)
      })

      // Give coin reward
      if (questDef.coinReward > 0) {
        ;(inventorySystem as any).addItem(playerId, 'coins', questDef.coinReward)
      }
    }

    // Handle unlocks (this would integrate with other systems)
    questDef.unlocks.forEach(unlock => {
      this.world.events.emit('quest:unlock', {
        playerId,
        unlock,
        questId: questDef.id,
      })
    })
  }

  public handleNpcInteraction(playerId: string, npcId: string): void {
    // Check if any active quests have dialogue for this NPC
    const entity = this.world.getEntityById(playerId)
    if (!entity) {
      return
    }

    const questComponent = entity.getComponent('quest') as QuestComponent
    if (!questComponent) {
      return
    }

    // Check active quests for NPC dialogue
    for (const [questId, progress] of Object.entries(questComponent.activeQuests)) {
      const questDef = getQuestDefinition(questId)
      if (!questDef) {
        continue
      }

      // Check if this NPC is relevant to current objectives
      const relevantObjective = questDef.objectives.find(
        obj => obj.type === ObjectiveType.TALK_TO_NPC && obj.target === npcId && !progress.objectives[obj.id]
      )

      if (relevantObjective) {
        // Start dialogue for this quest
        this.startDialogue(playerId, npcId, questId, 'start')
        return
      }
    }

    // Check if NPC starts any new quests
    const availableQuests = Object.values(QUEST_DEFINITIONS).filter(
      quest =>
        quest.startNpcId === npcId &&
        !questComponent.completedQuests.includes(quest.id) &&
        !questComponent.activeQuests[quest.id] &&
        this.canPlayerStartQuest(playerId, quest.id)
    )

    if (availableQuests.length > 0) {
      const quest = availableQuests[0] // Start first available quest
      this.startDialogue(playerId, npcId, quest.id, 'start')
    }
  }

  private startDialogue(playerId: string, npcId: string, questId: string, nodeId: string): void {
    const questDef = getQuestDefinition(questId)
    if (!questDef || !questDef.dialogue[nodeId]) {
      return
    }

    const dialogueState: QuestDialogueState = {
      playerId,
      npcId,
      questId,
      currentNodeId: nodeId,
      context: {},
    }

    this.activeDialogues.set(playerId, dialogueState)

    const node = questDef.dialogue[nodeId]
    this.sendDialogue(playerId, node)
  }

  private sendDialogue(playerId: string, node: DialogueNode): void {
    this.world.events.emit('quest:dialogue', {
      playerId,
      speaker: node.speaker,
      text: node.text,
      choices: node.choices || [],
      nodeId: node.id,
    })
  }

  public processDialogueChoice(playerId: string, choiceIndex: number): void {
    const dialogueState = this.activeDialogues.get(playerId)
    if (!dialogueState) {
      return
    }

    const questDef = getQuestDefinition(dialogueState.questId)
    if (!questDef) {
      return
    }

    const currentNode = questDef.dialogue[dialogueState.currentNodeId]
    if (!currentNode || !currentNode.choices) {
      return
    }

    const choice = currentNode.choices[choiceIndex]
    if (!choice) {
      return
    }

    // Check choice condition
    if (choice.condition && !choice.condition(playerId)) {
      this.world.events.emit('quest:error', {
        playerId,
        message: 'Choice not available',
      })
      return
    }

    // Move to next dialogue node
    const nextNode = questDef.dialogue[choice.nextNodeId]
    if (nextNode) {
      dialogueState.currentNodeId = choice.nextNodeId

      // Execute any actions
      if (nextNode.action) {
        this.executeDialogueAction(playerId, dialogueState.questId, nextNode.action)
      }

      this.sendDialogue(playerId, nextNode)
    } else {
      // End dialogue
      this.activeDialogues.delete(playerId)
    }
  }

  private executeDialogueAction(playerId: string, questId: string, action: any): void {
    switch (action.type) {
      case 'complete_objective':
        if (action.objectiveId) {
          this.completeObjective(playerId, questId, action.objectiveId)
        }
        break
      case 'give_item':
        if (action.itemId && action.quantity) {
          const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem')
          if (inventorySystem) {
            ;(inventorySystem as any).addItem(playerId, action.itemId, action.quantity)
          }
        }
        break
      case 'teleport':
        if (action.location) {
          this.world.events.emit('player:teleport', {
            playerId,
            location: action.location,
          })
        }
        break
    }
  }

  // Event handlers for objective completion
  private handleNpcKilled(data: any): void {
    const { killerId, npcId } = data
    this.checkKillObjectives(killerId, npcId)
  }

  private handleItemCollected(data: any): void {
    const { playerId, itemId, quantity } = data
    this.checkCollectionObjectives(playerId, itemId, quantity)
  }

  private handleSkillLevelUp(data: any): void {
    const { playerId, skill, newLevel } = data
    this.checkSkillObjectives(playerId, skill, newLevel)
  }

  private handleLocationReached(data: any): void {
    const { playerId, locationId } = data
    this.checkLocationObjectives(playerId, locationId)
  }

  private handleItemUsed(data: any): void {
    const { playerId, itemId } = data
    this.checkItemUseObjectives(playerId, itemId)
  }

  private checkKillObjectives(playerId: string, npcId: string): void {
    const entity = this.world.getEntityById(playerId)
    if (!entity) {
      return
    }

    const questComponent = entity.getComponent('quest') as QuestComponent
    if (!questComponent) {
      return
    }

    Object.entries(questComponent.activeQuests).forEach(([questId, progress]) => {
      const questDef = getQuestDefinition(questId)
      if (!questDef) {
        return
      }

      questDef.objectives.forEach(obj => {
        if (obj.type === ObjectiveType.KILL_NPCS && obj.target === npcId && !progress.objectives[obj.id]) {
          // Track kill count (simplified - in real implementation would track counts)
          this.completeObjective(playerId, questId, obj.id)
        }
      })
    })
  }

  private checkCollectionObjectives(playerId: string, itemId: string, quantity: number): void {
    const entity = this.world.getEntityById(playerId)
    if (!entity) {
      return
    }

    const questComponent = entity.getComponent('quest') as QuestComponent
    if (!questComponent) {
      return
    }

    Object.entries(questComponent.activeQuests).forEach(([questId, progress]) => {
      const questDef = getQuestDefinition(questId)
      if (!questDef) {
        return
      }

      questDef.objectives.forEach(obj => {
        if (obj.type === ObjectiveType.COLLECT_ITEMS && obj.target === itemId && !progress.objectives[obj.id]) {
          // Check if player has required quantity
          const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem')
          if (inventorySystem) {
            const hasItems = (inventorySystem as any).hasItem(playerId, itemId, obj.quantity || 1)
            if (hasItems) {
              this.completeObjective(playerId, questId, obj.id)
            }
          }
        }
      })
    })
  }

  private checkSkillObjectives(playerId: string, skill: SkillType, newLevel: number): void {
    const entity = this.world.getEntityById(playerId)
    if (!entity) {
      return
    }

    const questComponent = entity.getComponent('quest') as QuestComponent
    if (!questComponent) {
      return
    }

    Object.entries(questComponent.activeQuests).forEach(([questId, progress]) => {
      const questDef = getQuestDefinition(questId)
      if (!questDef) {
        return
      }

      questDef.objectives.forEach(obj => {
        if (
          obj.type === ObjectiveType.SKILL_LEVEL &&
          obj.skillType === skill &&
          newLevel >= (obj.level || 1) &&
          !progress.objectives[obj.id]
        ) {
          this.completeObjective(playerId, questId, obj.id)
        }
      })
    })
  }

  private checkLocationObjectives(playerId: string, locationId: string): void {
    const entity = this.world.getEntityById(playerId)
    if (!entity) {
      return
    }

    const questComponent = entity.getComponent('quest') as QuestComponent
    if (!questComponent) {
      return
    }

    Object.entries(questComponent.activeQuests).forEach(([questId, progress]) => {
      const questDef = getQuestDefinition(questId)
      if (!questDef) {
        return
      }

      questDef.objectives.forEach(obj => {
        if (obj.type === ObjectiveType.REACH_LOCATION && obj.target === locationId && !progress.objectives[obj.id]) {
          this.completeObjective(playerId, questId, obj.id)
        }
      })
    })
  }

  private checkItemUseObjectives(playerId: string, itemId: string): void {
    const entity = this.world.getEntityById(playerId)
    if (!entity) {
      return
    }

    const questComponent = entity.getComponent('quest') as QuestComponent
    if (!questComponent) {
      return
    }

    Object.entries(questComponent.activeQuests).forEach(([questId, progress]) => {
      const questDef = getQuestDefinition(questId)
      if (!questDef) {
        return
      }

      questDef.objectives.forEach(obj => {
        if (obj.type === ObjectiveType.USE_ITEM && obj.target === itemId && !progress.objectives[obj.id]) {
          this.completeObjective(playerId, questId, obj.id)
        }
      })
    })
  }

  private canPlayerStartQuest(playerId: string, questId: string): boolean {
    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem')
    const equipmentSystem = this.world.systems.find(s => s.constructor.name === 'EquipmentSystem')

    const getSkillLevel = (playerId: string, skill: SkillType) => {
      return skillsSystem ? (skillsSystem as any).getSkillLevel(playerId, skill) : 1
    }

    const isQuestCompleted = (playerId: string, questId: string) => {
      return this.isQuestCompleted(playerId, questId)
    }

    const getCombatLevel = (playerId: string) => {
      return equipmentSystem ? (equipmentSystem as any).getCombatLevel(playerId) : 3
    }

    return canPlayerStartQuest(playerId, questId, getSkillLevel, isQuestCompleted, getCombatLevel)
  }

  private addJournalEntry(playerId: string, questId: string, entry: string): void {
    const playerJournal = this.questJournal.get(playerId) || {}
    if (!playerJournal[questId]) {
      playerJournal[questId] = []
    }

    playerJournal[questId].push(`[${new Date().toLocaleTimeString()}] ${entry}`)
    this.questJournal.set(playerId, playerJournal)
  }

  // Public query methods
  public getQuestProgress(playerId: string, questId: string): QuestProgress | null {
    const entity = this.world.getEntityById(playerId)
    if (!entity) {
      return null
    }

    const questComponent = entity.getComponent('quest') as QuestComponent
    return questComponent?.activeQuests[questId] || null
  }

  public isQuestCompleted(playerId: string, questId: string): boolean {
    const entity = this.world.getEntityById(playerId)
    if (!entity) {
      return false
    }

    const questComponent = entity.getComponent('quest') as QuestComponent
    return questComponent?.completedQuests.includes(questId) || false
  }

  public getActiveQuests(playerId: string): QuestProgress[] {
    const entity = this.world.getEntityById(playerId)
    if (!entity) {
      return []
    }

    const questComponent = entity.getComponent('quest') as QuestComponent
    return questComponent ? Object.values(questComponent.activeQuests) : []
  }

  public getCompletedQuests(playerId: string): string[] {
    const entity = this.world.getEntityById(playerId)
    if (!entity) {
      return []
    }

    const questComponent = entity.getComponent('quest') as QuestComponent
    return questComponent?.completedQuests || []
  }

  public getQuestPoints(playerId: string): number {
    const entity = this.world.getEntityById(playerId)
    if (!entity) {
      return 0
    }

    const questComponent = entity.getComponent('quest') as QuestComponent
    return questComponent?.questPoints || 0
  }

  public getAvailableQuests(playerId: string): QuestDefinition[] {
    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem')
    const equipmentSystem = this.world.systems.find(s => s.constructor.name === 'EquipmentSystem')

    const getSkillLevel = (playerId: string, skill: SkillType) => {
      return skillsSystem ? (skillsSystem as any).getSkillLevel(playerId, skill) : 1
    }

    const isQuestCompleted = (playerId: string, questId: string) => {
      return this.isQuestCompleted(playerId, questId)
    }

    const getCombatLevel = (playerId: string) => {
      return equipmentSystem ? (equipmentSystem as any).getCombatLevel(playerId) : 3
    }

    return getAllAvailableQuests(playerId, getSkillLevel, isQuestCompleted, getCombatLevel)
  }

  public getQuestJournal(playerId: string): { [questId: string]: string[] } {
    return this.questJournal.get(playerId) || {}
  }

  public getQuestComponent(playerId: string): QuestComponent | null {
    const entity = this.world.getEntityById(playerId)
    return entity ? (entity.getComponent('quest') as QuestComponent) : null
  }

  update(deltaTime: number): void {
    // Quest system doesn't need regular updates - event driven
  }

  serialize(): any {
    return {
      activeDialogues: Object.fromEntries(this.activeDialogues),
      questJournal: Object.fromEntries(this.questJournal),
    }
  }

  deserialize(data: any): void {
    if (data.activeDialogues) {
      this.activeDialogues = new Map(Object.entries(data.activeDialogues))
    }
    if (data.questJournal) {
      this.questJournal = new Map(Object.entries(data.questJournal))
    }
  }
}
