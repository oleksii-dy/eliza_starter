/**
 * Enhanced Skills System - Comprehensive skill management with resource integration
 * Handles all RuneScape-like skills including gathering, combat, and crafting
 */

import { System } from '../../core/systems/System'
import type { World, Entity } from '../../types'
import {
  SkillType,
  SKILL_DEFINITIONS,
  XP_TABLE,
  getXPForLevel,
  getLevelForXP,
  getXPToNextLevel,
  getCombatLevel,
} from './skills/SkillDefinitions'
import { getSkillMultiplier } from './zones/ZoneDefinitions'

interface SkillData {
  level: number
  xp: number
  totalXp: number
}

interface SkillsComponent {
  type: 'skills'
  skills: Record<SkillType, SkillData>
  combatLevel: number
  totalLevel: number
  questPoints: number
}

interface SkillAction {
  id: string
  playerId: string
  skillType: SkillType
  actionName: string
  startTime: number
  duration: number
  xpReward: number
  itemRewards?: { itemId: number; quantity: number }[]
  completed: boolean
}

export class EnhancedSkillsSystem extends System {
  private activeActions: Map<string, SkillAction> = new Map()
  private skillMilestones: Map<SkillType, number[]> = new Map()
  private lastUpdateTime: number = Date.now()

  constructor(world: World) {
    super(world)
    this.initializeSkillMilestones()
  }

  async initialize(): Promise<void> {
    console.log('[EnhancedSkillsSystem] Initializing...')

    // Set up event listeners for resource harvesting
    this.world.events.on('resource:harvest_started', this.handleResourceHarvestStart.bind(this))
    this.world.events.on('resource:harvest_complete', this.handleResourceHarvestComplete.bind(this))
    this.world.events.on('combat:damage_dealt', this.handleCombatXP.bind(this))
    this.world.events.on('spell:cast', this.handleSpellCast.bind(this))

    console.log('[EnhancedSkillsSystem] Initialized')
  }

  private initializeSkillMilestones(): void {
    // Define important level milestones for each skill
    const importantLevels = [10, 20, 30, 40, 50, 60, 70, 80, 90, 99]

    for (const skillType of Object.values(SkillType)) {
      this.skillMilestones.set(skillType, importantLevels)
    }
  }

  public createPlayerSkills(entity: Entity): SkillsComponent {
    const skills: Record<SkillType, SkillData> = {} as Record<SkillType, SkillData>

    // Initialize all skills
    for (const skillType of Object.values(SkillType)) {
      const startLevel = skillType === SkillType.HITPOINTS ? 10 : 1
      const startXP = getXPForLevel(startLevel)

      skills[skillType] = {
        level: startLevel,
        xp: startXP,
        totalXp: startXP,
      }
    }

    const skillsComponent: SkillsComponent = {
      type: 'skills',
      skills,
      combatLevel: getCombatLevel(skills),
      totalLevel: this.calculateTotalLevel(skills),
      questPoints: 0,
    }

    entity.addComponent(skillsComponent)
    return skillsComponent
  }

  public addExperience(entityId: string, skillType: SkillType, baseXP: number): boolean {
    const entity = this.world.getEntityById(entityId)
    if (!entity) {
      return false
    }

    const skillsComponent = entity.getComponent('skills') as SkillsComponent
    if (!skillsComponent) {
      return false
    }

    const skill = skillsComponent.skills[skillType]
    if (!skill) {
      return false
    }

    // Apply zone multipliers
    const entityPosition = this.getEntityPosition(entity)
    let xpMultiplier = 1.0

    if (entityPosition) {
      xpMultiplier = getSkillMultiplier(entityPosition.x, entityPosition.z, skillType)
    }

    const finalXP = Math.floor(baseXP * xpMultiplier)
    const oldLevel = skill.level

    // Add experience
    skill.xp += finalXP
    skill.totalXp += finalXP

    // Calculate new level
    const newLevel = getLevelForXP(skill.xp)

    // Check for level up
    if (newLevel > oldLevel) {
      this.handleLevelUp(entity, skillType, oldLevel, newLevel)
    }

    // Update total level and combat level
    skillsComponent.totalLevel = this.calculateTotalLevel(skillsComponent.skills)
    skillsComponent.combatLevel = getCombatLevel(skillsComponent.skills)

    // Emit XP gain event
    this.world.events.emit('skills:xp_gained', {
      entityId,
      skillType,
      xpGained: finalXP,
      totalXP: skill.totalXp,
      level: newLevel,
      multiplier: xpMultiplier,
    })

    return true
  }

  private handleLevelUp(entity: Entity, skillType: SkillType, oldLevel: number, newLevel: number): void {
    const skillsComponent = entity.getComponent('skills') as SkillsComponent
    if (!skillsComponent) {
      return
    }

    skillsComponent.skills[skillType].level = newLevel

    // Emit level up event
    this.world.events.emit('skills:level_up', {
      entityId: entity.id,
      skillType,
      oldLevel,
      newLevel,
      skillName: SKILL_DEFINITIONS[skillType].name,
    })

    // Check for milestone achievements
    const milestones = this.skillMilestones.get(skillType) || []
    for (const milestone of milestones) {
      if (newLevel >= milestone && oldLevel < milestone) {
        this.world.events.emit('skills:milestone', {
          entityId: entity.id,
          skillType,
          milestone,
          skillName: SKILL_DEFINITIONS[skillType].name,
        })
      }
    }

    // Handle special level-up effects
    this.handleSpecialLevelUpEffects(entity, skillType, newLevel)
  }

  private handleSpecialLevelUpEffects(entity: Entity, skillType: SkillType, newLevel: number): void {
    // Hitpoints level up restores health
    if (skillType === SkillType.HITPOINTS) {
      const statsComponent = entity.getComponent('stats')
      if (statsComponent) {
        const maxHp = newLevel * 10 // 10 HP per level
        statsComponent.hitpoints.max = maxHp
        statsComponent.hitpoints.current = maxHp // Full heal on level up

        this.world.events.emit('player:health_restored', {
          entityId: entity.id,
          newMaxHp: maxHp,
        })
      }
    }

    // Prayer level up restores prayer points
    if (skillType === SkillType.PRAYER) {
      const statsComponent = entity.getComponent('stats')
      if (statsComponent && statsComponent.prayer) {
        const maxPrayer = newLevel * 10
        statsComponent.prayer.maxPoints = maxPrayer
        statsComponent.prayer.points = maxPrayer

        this.world.events.emit('player:prayer_restored', {
          entityId: entity.id,
          newMaxPrayer: maxPrayer,
        })
      }
    }
  }

  private calculateTotalLevel(skills: Record<SkillType, SkillData>): number {
    return Object.values(skills).reduce((total, skill) => total + skill.level, 0)
  }

  private getEntityPosition(entity: Entity): { x: number; z: number } | null {
    const movementComponent = entity.getComponent('movement')
    if (movementComponent && movementComponent.position) {
      return {
        x: movementComponent.position.x,
        z: movementComponent.position.z,
      }
    }
    return null
  }

  // Resource harvesting handlers
  private handleResourceHarvestStart(data: any): void {
    const { playerId, resourceType, duration } = data

    // Create skill action for tracking
    const actionId = `harvest_${playerId}_${Date.now()}`
    const skillAction: SkillAction = {
      id: actionId,
      playerId,
      skillType: this.getSkillForResource(resourceType),
      actionName: `Harvesting ${resourceType}`,
      startTime: Date.now(),
      duration,
      xpReward: 0, // Will be set on completion
      completed: false,
    }

    this.activeActions.set(actionId, skillAction)

    this.world.events.emit('skills:action_started', {
      playerId,
      actionId,
      skillType: skillAction.skillType,
      actionName: skillAction.actionName,
      duration,
    })
  }

  private handleResourceHarvestComplete(data: any): void {
    const { playerId, resourceType, xp, skill } = data

    // Add experience for the harvest
    this.addExperience(playerId, skill, xp)

    // Remove completed action
    const activeAction = Array.from(this.activeActions.values()).find(
      action => action.playerId === playerId && !action.completed
    )

    if (activeAction) {
      activeAction.completed = true
      activeAction.xpReward = xp
      this.activeActions.delete(activeAction.id)
    }
  }

  private getSkillForResource(resourceType: string): SkillType {
    if (resourceType.startsWith('tree_')) {
      return SkillType.WOODCUTTING
    }
    if (resourceType.startsWith('rock_')) {
      return SkillType.MINING
    }
    if (resourceType.startsWith('fishing_')) {
      return SkillType.FISHING
    }
    return SkillType.WOODCUTTING // Default fallback
  }

  private handleCombatXP(data: any): void {
    const { attackerId, damage, attackStyle } = data

    // Base XP is 4 * damage for combat skills
    const baseXP = damage * 4

    // Award XP based on attack style
    switch (attackStyle) {
      case 'melee':
        // Shared XP between Attack, Strength, and Defence
        this.addExperience(attackerId, SkillType.ATTACK, baseXP / 3)
        this.addExperience(attackerId, SkillType.STRENGTH, baseXP / 3)
        this.addExperience(attackerId, SkillType.DEFENCE, baseXP / 3)
        break
      case 'ranged':
        this.addExperience(attackerId, SkillType.RANGED, baseXP)
        break
      case 'magic':
        this.addExperience(attackerId, SkillType.MAGIC, baseXP)
        break
    }

    // Always award hitpoints XP (1.33x multiplier)
    this.addExperience(attackerId, SkillType.HITPOINTS, Math.floor(baseXP * 1.33))
  }

  private handleSpellCast(data: any): void {
    const { casterId, spellType, xp } = data
    this.addExperience(casterId, SkillType.MAGIC, xp)
  }

  // Skill requirement checking
  public hasRequiredLevel(entityId: string, skillType: SkillType, requiredLevel: number): boolean {
    const entity = this.world.getEntityById(entityId)
    if (!entity) {
      return false
    }

    const skillsComponent = entity.getComponent('skills') as SkillsComponent
    if (!skillsComponent) {
      return false
    }

    return skillsComponent.skills[skillType].level >= requiredLevel
  }

  public canPerformAction(entityId: string, requirements: { skill: SkillType; level: number }[]): boolean {
    for (const req of requirements) {
      if (!this.hasRequiredLevel(entityId, req.skill, req.level)) {
        return false
      }
    }
    return true
  }

  // Crafting and production skills
  public startCraftingAction(
    entityId: string,
    skillType: SkillType,
    actionName: string,
    duration: number,
    xpReward: number,
    itemRewards?: { itemId: number; quantity: number }[]
  ): string | null {
    const entity = this.world.getEntityById(entityId)
    if (!entity) {
      return null
    }

    const actionId = `craft_${entityId}_${Date.now()}`
    const skillAction: SkillAction = {
      id: actionId,
      playerId: entityId,
      skillType,
      actionName,
      startTime: Date.now(),
      duration,
      xpReward,
      itemRewards,
      completed: false,
    }

    this.activeActions.set(actionId, skillAction)

    // Schedule completion
    setTimeout(() => {
      this.completeCraftingAction(actionId)
    }, duration)

    this.world.events.emit('skills:action_started', {
      playerId: entityId,
      actionId,
      skillType,
      actionName,
      duration,
      xpReward,
    })

    return actionId
  }

  private completeCraftingAction(actionId: string): void {
    const action = this.activeActions.get(actionId)
    if (!action || action.completed) {
      return
    }

    action.completed = true

    // Award XP
    this.addExperience(action.playerId, action.skillType, action.xpReward)

    // Award items
    if (action.itemRewards) {
      const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem')
      if (inventorySystem) {
        for (const reward of action.itemRewards) {
          ;(inventorySystem as any).addItem(action.playerId, reward.itemId, reward.quantity)
        }
      }
    }

    this.world.events.emit('skills:action_completed', {
      playerId: action.playerId,
      actionId,
      skillType: action.skillType,
      actionName: action.actionName,
      xpGained: action.xpReward,
      itemRewards: action.itemRewards,
    })

    this.activeActions.delete(actionId)
  }

  // Query methods
  public getPlayerSkills(entityId: string): SkillsComponent | null {
    const entity = this.world.getEntityById(entityId)
    if (!entity) {
      return null
    }

    return entity.getComponent('skills') as SkillsComponent
  }

  public getSkillLevel(entityId: string, skillType: SkillType): number {
    const skills = this.getPlayerSkills(entityId)
    return skills ? skills.skills[skillType].level : 1
  }

  public getSkillXP(entityId: string, skillType: SkillType): number {
    const skills = this.getPlayerSkills(entityId)
    return skills ? skills.skills[skillType].totalXp : 0
  }

  public getXPToNextLevel(entityId: string, skillType: SkillType): number {
    const skills = this.getPlayerSkills(entityId)
    if (!skills) {
      return 0
    }

    return getXPToNextLevel(skills.skills[skillType].xp)
  }

  public getCombatLevel(entityId: string): number {
    const skills = this.getPlayerSkills(entityId)
    return skills ? skills.combatLevel : 3
  }

  public getTotalLevel(entityId: string): number {
    const skills = this.getPlayerSkills(entityId)
    return skills ? skills.totalLevel : Object.keys(SkillType).length
  }

  public getActiveActions(entityId: string): SkillAction[] {
    return Array.from(this.activeActions.values()).filter(action => action.playerId === entityId && !action.completed)
  }

  public cancelAction(actionId: string): boolean {
    const action = this.activeActions.get(actionId)
    if (!action || action.completed) {
      return false
    }

    action.completed = true
    this.activeActions.delete(actionId)

    this.world.events.emit('skills:action_cancelled', {
      playerId: action.playerId,
      actionId,
      skillType: action.skillType,
      actionName: action.actionName,
    })

    return true
  }

  // Skill training recommendations
  public getTrainingRecommendations(entityId: string, skillType: SkillType): any[] {
    const level = this.getSkillLevel(entityId, skillType)
    const recommendations: any[] = []

    // Add training methods based on level
    switch (skillType) {
      case SkillType.WOODCUTTING:
        if (level >= 1) {
          recommendations.push({ method: 'Normal trees', xpRate: 25, location: 'Lumbridge' })
        }
        if (level >= 15) {
          recommendations.push({ method: 'Oak trees', xpRate: 37.5, location: 'Varrock' })
        }
        if (level >= 30) {
          recommendations.push({ method: 'Willow trees', xpRate: 67.5, location: 'Draynor' })
        }
        if (level >= 45) {
          recommendations.push({ method: 'Maple trees', xpRate: 100, location: 'Various' })
        }
        if (level >= 60) {
          recommendations.push({ method: 'Yew trees', xpRate: 175, location: 'Wilderness' })
        }
        if (level >= 75) {
          recommendations.push({ method: 'Magic trees', xpRate: 250, location: 'Wilderness' })
        }
        break

      case SkillType.MINING:
        if (level >= 1) {
          recommendations.push({ method: 'Copper/Tin ore', xpRate: 17.5, location: 'Lumbridge' })
        }
        if (level >= 15) {
          recommendations.push({ method: 'Iron ore', xpRate: 35, location: 'Varrock' })
        }
        if (level >= 30) {
          recommendations.push({ method: 'Coal', xpRate: 50, location: 'Varrock' })
        }
        if (level >= 40) {
          recommendations.push({ method: 'Gold ore', xpRate: 65, location: 'Falador' })
        }
        if (level >= 55) {
          recommendations.push({ method: 'Mithril ore', xpRate: 80, location: 'Wilderness' })
        }
        if (level >= 70) {
          recommendations.push({ method: 'Adamant ore', xpRate: 95, location: 'Wilderness' })
        }
        if (level >= 85) {
          recommendations.push({ method: 'Runite ore', xpRate: 125, location: 'Wilderness' })
        }
        break

      case SkillType.FISHING:
        if (level >= 1) {
          recommendations.push({ method: 'Shrimp (net)', xpRate: 10, location: 'Lumbridge' })
        }
        if (level >= 20) {
          recommendations.push({ method: 'Trout (bait)', xpRate: 50, location: 'Barbarian Village' })
        }
        if (level >= 30) {
          recommendations.push({ method: 'Salmon (bait)', xpRate: 70, location: 'Barbarian Village' })
        }
        if (level >= 40) {
          recommendations.push({ method: 'Lobster (cage)', xpRate: 90, location: 'Fishing Guild' })
        }
        if (level >= 50) {
          recommendations.push({ method: 'Swordfish (harpoon)', xpRate: 100, location: 'Fishing Guild' })
        }
        if (level >= 76) {
          recommendations.push({ method: 'Shark (harpoon)', xpRate: 110, location: 'Fishing Guild' })
        }
        break
    }

    return recommendations
  }

  update(deltaTime: number): void {
    const now = Date.now()

    // Clean up completed actions
    for (const [actionId, action] of this.activeActions) {
      if (action.completed || now - action.startTime > action.duration + 5000) {
        this.activeActions.delete(actionId)
      }
    }
  }

  serialize(): any {
    return {
      activeActions: Object.fromEntries(this.activeActions),
      lastUpdateTime: this.lastUpdateTime,
    }
  }

  deserialize(data: any): void {
    if (data.activeActions) {
      this.activeActions = new Map(Object.entries(data.activeActions))
    }
    if (data.lastUpdateTime) {
      this.lastUpdateTime = data.lastUpdateTime
    }
  }
}
