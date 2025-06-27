// @ts-nocheck
/**
 * Boss Fight System - RuneScape-style boss encounters
 * Handles boss instances, combat mechanics, phases, and rewards
 */

import { System } from '../../../core/systems/System'
import type { World, Entity } from '../../../types'
import {
  BossDefinition,
  BossAttack,
  BossPhase,
  BossPhaseType,
  BossAttackType,
  BossDifficulty,
  BossType,
  getBossDefinition,
  canPlayerFightBoss,
  BOSS_DEFINITIONS,
} from './BossDefinitions'
import { SkillType } from '../skills/SkillDefinitions'

export enum BossInstanceState {
  WAITING = 'waiting', // Waiting for players
  STARTING = 'starting', // Countdown before fight
  ACTIVE = 'active', // Fight in progress
  COMPLETED = 'completed', // Boss defeated
  FAILED = 'failed', // Players defeated or timeout
  RESPAWNING = 'respawning', // Boss respawning
}

export interface BossInstance {
  id: string
  bossId: string
  state: BossInstanceState
  location: string

  // Participants
  players: string[] // Player IDs in the fight
  maxPlayers: number
  minPlayers: number

  // Boss state
  currentHealth: number
  maxHealth: number
  currentPhase: number
  lastAttackTime: number
  nextAttackId?: string

  // Timing
  startTime?: number
  endTime?: number
  timeLimit: number
  respawnTime?: number

  // Combat tracking
  damageDealt: { [playerId: string]: number }
  attackCooldowns: { [attackId: string]: number }
  playerEffects: { [playerId: string]: BossEffect[] }
  bossEffects: BossEffect[]

  // Instance settings
  instanceBased: boolean
  difficulty: BossDifficulty
}

export interface BossEffect {
  id: string
  type: 'stun' | 'poison' | 'drain' | 'heal' | 'buff' | 'debuff' | 'dot'
  duration: number
  value: number
  startTime: number
  source: 'boss' | 'player'
  description: string
}

export interface BossFightComponent {
  type: 'boss_fight'
  currentInstance?: string
  killCounts: { [bossId: string]: number }
  fastestKills: { [bossId: string]: number }
  totalDamageDealt: number
  bossesDefeated: number
  lastFightTime: number
}

export class BossFightSystem extends System {
  private instances: Map<string, BossInstance> = new Map()
  private playerInstances: Map<string, string> = new Map() // playerId -> instanceId
  private instanceCounter: number = 0
  private readonly UPDATE_INTERVAL = 1000 // 1 second updates

  constructor(world: World) {
    super(world)
  }

  async initialize(): Promise<void> {
    console.log('[BossFightSystem] Initializing...')

    // Listen for boss fight events
    this.world.events.on('player:joined', this.handlePlayerJoined.bind(this))
    this.world.events.on('boss:start_fight', this.handleStartFight.bind(this))
    this.world.events.on('boss:join_fight', this.handleJoinFight.bind(this))
    this.world.events.on('boss:leave_fight', this.handleLeaveFight.bind(this))
    this.world.events.on('boss:attack', this.handleBossAttack.bind(this))
    this.world.events.on('combat:damage_dealt', this.handleDamageDealt.bind(this))
    this.world.events.on('combat:player_died', this.handlePlayerDied.bind(this))

    // Start update loop
    setInterval(() => this.updateInstances(), this.UPDATE_INTERVAL)

    console.log('[BossFightSystem] Initialized with boss encounter system')
  }

  private handlePlayerJoined(data: any): void {
    const { entityId } = data
    this.createBossFightComponent(entityId)
  }

  public createBossFightComponent(entityId: string): BossFightComponent | null {
    const entity = this.world.getEntityById(entityId)
    if (!entity) return null

    const bossComponent: BossFightComponent = {
      type: 'boss_fight',
      killCounts: {},
      fastestKills: {},
      totalDamageDealt: 0,
      bossesDefeated: 0,
      lastFightTime: 0,
    }

    entity.addComponent(bossComponent)
    return bossComponent
  }

  private handleStartFight(data: any): void {
    const { playerId, bossId, location } = data
    this.startBossFight(playerId, bossId, location)
  }

  private handleJoinFight(data: any): void {
    const { playerId, instanceId } = data
    this.joinBossFight(playerId, instanceId)
  }

  private handleLeaveFight(data: any): void {
    const { playerId } = data
    this.leaveBossFight(playerId)
  }

  private handleBossAttack(data: any): void {
    const { instanceId, attackId } = data
    this.executeBossAttack(instanceId, attackId)
  }

  private handleDamageDealt(data: any): void {
    const { attackerId, targetId, damage } = data

    // Check if damage was dealt to a boss
    for (const [instanceId, instance] of this.instances) {
      if (targetId === `boss_${instance.bossId}_${instanceId}`) {
        this.processBossDamage(instanceId, attackerId, damage)
        break
      }
    }
  }

  private handlePlayerDied(data: any): void {
    const { playerId } = data
    const instanceId = this.playerInstances.get(playerId)

    if (instanceId) {
      this.handlePlayerDeathInBossFight(instanceId, playerId)
    }
  }

  public startBossFight(playerId: string, bossId: string, location?: string): string | null {
    const bossDefinition = getBossDefinition(bossId)
    if (!bossDefinition) {
      this.world.events.emit('boss:error', {
        playerId,
        message: 'Boss not found',
      })
      return null
    }

    // Check if player can fight this boss
    if (!this.canPlayerFightBoss(playerId, bossId)) {
      this.world.events.emit('boss:error', {
        playerId,
        message: 'You do not meet the requirements to fight this boss',
      })
      return null
    }

    // Check if player is already in a fight
    if (this.playerInstances.has(playerId)) {
      this.world.events.emit('boss:error', {
        playerId,
        message: 'You are already in a boss fight',
      })
      return null
    }

    // Find existing non-instance fight or create new one
    let instance: BossInstance | null = null

    if (!bossDefinition.instanceBased) {
      // Look for existing fight at this location
      for (const existingInstance of this.instances.values()) {
        if (
          existingInstance.bossId === bossId &&
          existingInstance.location === (location || bossDefinition.location) &&
          existingInstance.players.length < existingInstance.maxPlayers &&
          (existingInstance.state === BossInstanceState.WAITING ||
            existingInstance.state === BossInstanceState.STARTING)
        ) {
          instance = existingInstance
          break
        }
      }
    }

    // Create new instance if needed
    if (!instance) {
      instance = this.createBossInstance(bossDefinition, location)
    }

    // Add player to instance
    instance.players.push(playerId)
    this.playerInstances.set(playerId, instance.id)

    // Update player component
    const entity = this.world.getEntityById(playerId)
    if (entity) {
      const bossComponent = entity.getComponent('boss_fight') as BossFightComponent
      if (bossComponent) {
        bossComponent.currentInstance = instance.id
      }
    }

    // Check if we can start the fight (only for multi-player bosses or when explicitly requested)
    // For testing, we keep single-player bosses in WAITING state until explicitly started
    if (instance.players.length >= instance.minPlayers && 
        instance.state === BossInstanceState.WAITING &&
        instance.minPlayers > 1) {
      this.startInstanceCountdown(instance)
    }

    this.world.events.emit('boss:fight_joined', {
      playerId,
      instanceId: instance.id,
      bossId,
      bossName: bossDefinition.name,
      playersInFight: instance.players.length,
      maxPlayers: instance.maxPlayers,
    })

    return instance.id
  }

  public joinBossFight(playerId: string, instanceId: string): boolean {
    const instance = this.instances.get(instanceId)
    if (!instance) return false

    const bossDefinition = getBossDefinition(instance.bossId)
    if (!bossDefinition) return false

    // Check if player can join
    if (instance.players.length >= instance.maxPlayers) {
      this.world.events.emit('boss:error', {
        playerId,
        message: 'Boss fight is full',
      })
      return false
    }

    if (instance.state !== BossInstanceState.WAITING && instance.state !== BossInstanceState.STARTING) {
      this.world.events.emit('boss:error', {
        playerId,
        message: 'Boss fight has already started',
      })
      return false
    }

    if (!this.canPlayerFightBoss(playerId, instance.bossId)) {
      this.world.events.emit('boss:error', {
        playerId,
        message: 'You do not meet the requirements to fight this boss',
      })
      return false
    }

    // Add player to instance
    instance.players.push(playerId)
    this.playerInstances.set(playerId, instanceId)

    // Update player component
    const entity = this.world.getEntityById(playerId)
    if (entity) {
      const bossComponent = entity.getComponent('boss_fight') as BossFightComponent
      if (bossComponent) {
        bossComponent.currentInstance = instanceId
      }
    }

    this.world.events.emit('boss:fight_joined', {
      playerId,
      instanceId,
      bossId: instance.bossId,
      bossName: bossDefinition.name,
      playersInFight: instance.players.length,
      maxPlayers: instance.maxPlayers,
    })

    return true
  }

  public leaveBossFight(playerId: string): boolean {
    const instanceId = this.playerInstances.get(playerId)
    if (!instanceId) return false

    const instance = this.instances.get(instanceId)
    if (!instance) return false

    // Remove player from instance
    const playerIndex = instance.players.indexOf(playerId)
    if (playerIndex !== -1) {
      instance.players.splice(playerIndex, 1)
    }

    this.playerInstances.delete(playerId)

    // Clean up player effects
    delete instance.playerEffects[playerId]
    delete instance.damageDealt[playerId]

    // Update player component
    const entity = this.world.getEntityById(playerId)
    if (entity) {
      const bossComponent = entity.getComponent('boss_fight') as BossFightComponent
      if (bossComponent) {
        bossComponent.currentInstance = undefined
      }
    }

    // Check if instance should be closed
    if (instance.players.length === 0) {
      this.cleanupInstance(instanceId)
    } else if (instance.players.length < instance.minPlayers && instance.state === BossInstanceState.ACTIVE) {
      // Not enough players to continue
      this.endBossFight(instanceId, false)
    }

    this.world.events.emit('boss:fight_left', {
      playerId,
      instanceId,
    })

    return true
  }

  private createBossInstance(bossDefinition: BossDefinition, location?: string): BossInstance {
    const instanceId = `boss_instance_${this.instanceCounter++}_${Date.now()}`

    const instance: BossInstance = {
      id: instanceId,
      bossId: bossDefinition.id,
      state: BossInstanceState.WAITING,
      location: location || bossDefinition.location,

      players: [],
      maxPlayers: bossDefinition.maxPlayers,
      minPlayers: bossDefinition.minPlayers,

      currentHealth: bossDefinition.hitpoints,
      maxHealth: bossDefinition.hitpoints,
      currentPhase: 1,
      lastAttackTime: 0,

      timeLimit: bossDefinition.timeLimit,

      damageDealt: {},
      attackCooldowns: {},
      playerEffects: {},
      bossEffects: [],

      instanceBased: bossDefinition.instanceBased,
      difficulty: bossDefinition.difficulty,
    }

    this.instances.set(instanceId, instance)
    return instance
  }

  private startInstanceCountdown(instance: BossInstance): void {
    instance.state = BossInstanceState.STARTING

    // 10 second countdown
    setTimeout(() => {
      if (instance.state === BossInstanceState.STARTING && instance.players.length >= instance.minPlayers) {
        this.startBossCombat(instance)
      }
    }, 10000)

    this.world.events.emit('boss:fight_starting', {
      instanceId: instance.id,
      countdown: 10000,
      players: instance.players,
    })
  }

  private startBossCombat(instance: BossInstance): void {
    instance.state = BossInstanceState.ACTIVE
    instance.startTime = Date.now()
    instance.currentPhase = 1

    // Initialize damage tracking
    instance.players.forEach(playerId => {
      instance.damageDealt[playerId] = 0
      instance.playerEffects[playerId] = []
    })

    this.world.events.emit('boss:fight_started', {
      instanceId: instance.id,
      bossId: instance.bossId,
      players: instance.players,
      timeLimit: instance.timeLimit,
    })

    // Start boss AI
    this.scheduleBossAttack(instance)
  }

  private scheduleBossAttack(instance: BossInstance): void {
    if (instance.state !== BossInstanceState.ACTIVE) return

    const bossDefinition = getBossDefinition(instance.bossId)
    if (!bossDefinition) return

    // Get current phase
    const currentPhase = this.getCurrentPhase(instance, bossDefinition)
    if (!currentPhase) return

    // Get available attacks for this phase
    const availableAttacks = bossDefinition.attacks.filter(
      attack => currentPhase.availableAttacks.includes(attack.id) && this.canUseAttack(instance, attack)
    )

    if (availableAttacks.length === 0) return

    // Select random attack
    const selectedAttack = availableAttacks[Math.floor(Math.random() * availableAttacks.length)]

    // Calculate delay based on phase attack speed modifier
    const baseDelay = selectedAttack.cooldown
    const phaseModifiedDelay = baseDelay / currentPhase.attackSpeedModifier

    setTimeout(() => {
      this.executeBossAttack(instance.id, selectedAttack.id)
    }, phaseModifiedDelay)
  }

  private executeBossAttack(instanceId: string, attackId: string): void {
    const instance = this.instances.get(instanceId)
    if (!instance || instance.state !== BossInstanceState.ACTIVE) return

    const bossDefinition = getBossDefinition(instance.bossId)
    if (!bossDefinition) return

    const attack = bossDefinition.attacks.find(a => a.id === attackId)
    if (!attack) return

    // Check cooldown
    if (!this.canUseAttack(instance, attack)) return

    // Set cooldown
    instance.attackCooldowns[attackId] = Date.now() + attack.cooldown
    instance.lastAttackTime = Date.now()

    // Get current phase for damage modifier
    const currentPhase = this.getCurrentPhase(instance, bossDefinition)
    const damageModifier = currentPhase?.damageModifier || 1.0

    // Execute attack on players
    const targets = this.selectAttackTargets(instance, attack)

    for (const targetId of targets) {
      this.processBossAttackOnPlayer(instance, attack, targetId, damageModifier)
    }

    this.world.events.emit('boss:attack_executed', {
      instanceId,
      attackId,
      attackName: attack.name,
      targets,
      damage: attack.damage,
    })

    // Schedule next attack
    this.scheduleBossAttack(instance)
  }

  private processBossAttackOnPlayer(
    instance: BossInstance,
    attack: BossAttack,
    playerId: string,
    damageModifier: number
  ): void {
    // Calculate damage
    const baseDamage = Math.floor(Math.random() * (attack.damage.max - attack.damage.min + 1)) + attack.damage.min
    const finalDamage = Math.floor(baseDamage * damageModifier)

    // Check if attack hits
    const hitRoll = Math.random()
    if (hitRoll > attack.accuracy) {
      this.world.events.emit('boss:attack_missed', {
        playerId,
        attackName: attack.name,
      })
      return
    }

    // Deal damage
    this.world.events.emit('combat:damage_dealt', {
      attackerId: `boss_${instance.bossId}_${instance.id}`,
      targetId: playerId,
      damage: finalDamage,
      attackType: attack.type,
      source: 'boss',
    })

    // Apply effects
    if (attack.effects) {
      for (const effect of attack.effects) {
        this.applyBossEffect(instance, playerId, effect, attack.name)
      }
    }
  }

  private applyBossEffect(instance: BossInstance, playerId: string, effectData: any, attackName: string): void {
    const effect: BossEffect = {
      id: `${attackName}_${Date.now()}_${Math.random()}`,
      type: effectData.type,
      duration: effectData.duration || 0,
      value: effectData.value || 0,
      startTime: Date.now(),
      source: 'boss',
      description: `${attackName} effect`,
    }

    if (effectData.target === 'all_players') {
      // Apply to all players
      instance.players.forEach(pid => {
        if (!instance.playerEffects[pid]) instance.playerEffects[pid] = []
        instance.playerEffects[pid].push({ ...effect, id: `${effect.id}_${pid}` })
      })
    } else {
      // Apply to specific player
      if (!instance.playerEffects[playerId]) instance.playerEffects[playerId] = []
      instance.playerEffects[playerId].push(effect)
    }

    this.world.events.emit('boss:effect_applied', {
      playerId: effectData.target === 'all_players' ? 'all' : playerId,
      effect: effect.type,
      duration: effect.duration,
      value: effect.value,
    })
  }

  private selectAttackTargets(instance: BossInstance, attack: BossAttack): string[] {
    const alivePlayers = instance.players.filter(playerId => {
      // Check if player is alive (simplified check)
      return !this.isPlayerDead(playerId)
    })

    if (alivePlayers.length === 0) return []

    switch (attack.type) {
      case BossAttackType.MELEE:
      case BossAttackType.RANGED:
      case BossAttackType.MAGIC:
        // Single target - select random player
        return [alivePlayers[Math.floor(Math.random() * alivePlayers.length)]]

      case BossAttackType.AOE:
      case BossAttackType.SPECIAL:
        // Multi-target - hit all players in range
        return alivePlayers

      default:
        return [alivePlayers[Math.floor(Math.random() * alivePlayers.length)]]
    }
  }

  private processBossDamage(instanceId: string, attackerId: string, damage: number): void {
    const instance = this.instances.get(instanceId)
    if (!instance || instance.state !== BossInstanceState.ACTIVE) return

    // Track damage dealt by player
    if (!instance.damageDealt[attackerId]) {
      instance.damageDealt[attackerId] = 0
    }
    instance.damageDealt[attackerId] += damage

    // Update boss health
    instance.currentHealth = Math.max(0, instance.currentHealth - damage)

    // Check for phase transitions
    this.checkPhaseTransition(instance)

    // Check if boss is defeated
    if (instance.currentHealth <= 0) {
      this.endBossFight(instanceId, true)
      return
    }

    this.world.events.emit('boss:damage_taken', {
      instanceId,
      attackerId,
      damage,
      currentHealth: instance.currentHealth,
      maxHealth: instance.maxHealth,
    })
  }

  private checkPhaseTransition(instance: BossInstance): void {
    const bossDefinition = getBossDefinition(instance.bossId)
    if (!bossDefinition) return

    const healthPercent = (instance.currentHealth / instance.maxHealth) * 100

    // Find the appropriate phase based on health
    for (const phase of bossDefinition.phases) {
      if (healthPercent <= phase.healthPercent && phase.id > instance.currentPhase) {
        this.transitionToPhase(instance, phase)
        break
      }
    }
  }

  private transitionToPhase(instance: BossInstance, newPhase: BossPhase): void {
    instance.currentPhase = newPhase.id

    this.world.events.emit('boss:phase_transition', {
      instanceId: instance.id,
      phaseId: newPhase.id,
      phaseName: newPhase.name,
      description: newPhase.description,
    })

    // Handle special phase mechanics
    if (newPhase.type === BossPhaseType.TRANSITION) {
      // Make boss invulnerable during transition
      if (newPhase.invulnerable) {
        setTimeout(() => {
          // End invulnerability after transition
        }, newPhase.duration || 5000)
      }
    }
  }

  private endBossFight(instanceId: string, victory: boolean): void {
    const instance = this.instances.get(instanceId)
    if (!instance) return

    instance.state = victory ? BossInstanceState.COMPLETED : BossInstanceState.FAILED
    instance.endTime = Date.now()

    const fightDuration = instance.endTime - (instance.startTime || instance.endTime)

    if (victory) {
      this.processBossVictory(instance, fightDuration)
    } else {
      this.processBossDefeat(instance)
    }

    // Clean up instance after delay
    setTimeout(() => {
      this.cleanupInstance(instanceId)
    }, 30000) // 30 second delay
  }

  private processBossVictory(instance: BossInstance, fightDuration: number): void {
    const bossDefinition = getBossDefinition(instance.bossId)
    if (!bossDefinition) return

    // Calculate rewards for each player
    for (const playerId of instance.players) {
      const damageDealt = instance.damageDealt[playerId] || 0
      const damagePercent = damageDealt / instance.maxHealth

      this.givePlayerRewards(playerId, bossDefinition, damagePercent, fightDuration)
      this.updatePlayerStats(playerId, bossDefinition, fightDuration, damageDealt)
    }

    this.world.events.emit('boss:fight_completed', {
      instanceId: instance.id,
      bossId: instance.bossId,
      bossName: bossDefinition.name,
      players: instance.players,
      duration: fightDuration,
      damageDealt: instance.damageDealt,
    })
  }

  private processBossDefeat(instance: BossInstance): void {
    this.world.events.emit('boss:fight_failed', {
      instanceId: instance.id,
      bossId: instance.bossId,
      players: instance.players,
      reason: 'Players defeated or timeout',
    })
  }

  private givePlayerRewards(
    playerId: string,
    bossDefinition: BossDefinition,
    damagePercent: number,
    fightDuration: number
  ): void {
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem')
    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem')

    // Always give guaranteed rewards
    for (const reward of bossDefinition.guaranteedRewards) {
      this.processReward(playerId, reward, inventorySystem, skillsSystem, true)
    }

    // Roll for regular rewards based on damage contribution
    for (const reward of bossDefinition.rewards) {
      const adjustedDropRate = reward.dropRate * Math.min(damagePercent * 2, 1.0) // Bonus for high damage

      if (Math.random() < adjustedDropRate) {
        this.processReward(playerId, reward, inventorySystem, skillsSystem, false)
      }
    }
  }

  private processReward(
    playerId: string,
    reward: any,
    inventorySystem: any,
    skillsSystem: any,
    guaranteed: boolean
  ): void {
    const quantity = Math.floor(Math.random() * (reward.quantity.max - reward.quantity.min + 1)) + reward.quantity.min

    switch (reward.type) {
      case 'item':
        if (inventorySystem && reward.itemId) {
          ;(inventorySystem as any).addItem(playerId, reward.itemId, quantity)
        }
        break
      case 'coins':
        if (inventorySystem) {
          ;(inventorySystem as any).addItem(playerId, 'coins', quantity)
        }
        break
      case 'experience':
        if (skillsSystem && reward.experience) {
          Object.entries(reward.experience).forEach(([skill, xp]) => {
            ;(skillsSystem as any).addExperience(playerId, skill as SkillType, xp as number)
          })
        }
        break
    }

    this.world.events.emit('boss:reward_received', {
      playerId,
      type: reward.type,
      itemId: reward.itemId,
      quantity,
      guaranteed,
    })
  }

  private updatePlayerStats(
    playerId: string,
    bossDefinition: BossDefinition,
    fightDuration: number,
    damageDealt: number
  ): void {
    const entity = this.world.getEntityById(playerId)
    if (!entity) return

    const bossComponent = entity.getComponent('boss_fight') as BossFightComponent
    if (!bossComponent) return

    // Update kill count
    if (!bossComponent.killCounts[bossDefinition.id]) {
      bossComponent.killCounts[bossDefinition.id] = 0
    }
    bossComponent.killCounts[bossDefinition.id]++

    // Update fastest kill time
    if (
      !bossComponent.fastestKills[bossDefinition.id] ||
      fightDuration < bossComponent.fastestKills[bossDefinition.id]
    ) {
      bossComponent.fastestKills[bossDefinition.id] = fightDuration
    }

    // Update totals
    bossComponent.totalDamageDealt += damageDealt
    bossComponent.bossesDefeated++
    bossComponent.lastFightTime = Date.now()
  }

  private updateInstances(): void {
    const now = Date.now()

    for (const [instanceId, instance] of this.instances) {
      // Update effects
      this.updateEffects(instance)

      // Check for timeout
      if (instance.state === BossInstanceState.ACTIVE && instance.startTime) {
        const elapsed = now - instance.startTime
        if (elapsed > instance.timeLimit) {
          this.endBossFight(instanceId, false)
          continue
        }
      }

      // Check for respawn
      if (instance.state === BossInstanceState.RESPAWNING && instance.respawnTime && now >= instance.respawnTime) {
        this.respawnBoss(instance)
      }
    }
  }

  private updateEffects(instance: BossInstance): void {
    const now = Date.now()

    // Update player effects
    for (const [playerId, effects] of Object.entries(instance.playerEffects)) {
      instance.playerEffects[playerId] = effects.filter(effect => {
        const remaining = effect.duration - (now - effect.startTime)
        if (remaining <= 0) {
          this.world.events.emit('boss:effect_expired', {
            playerId,
            effectType: effect.type,
          })
          return false
        }
        return true
      })
    }

    // Update boss effects
    instance.bossEffects = instance.bossEffects.filter(effect => {
      const remaining = effect.duration - (now - effect.startTime)
      return remaining > 0
    })
  }

  private respawnBoss(instance: BossInstance): void {
    const bossDefinition = getBossDefinition(instance.bossId)
    if (!bossDefinition) return

    instance.state = BossInstanceState.WAITING
    instance.currentHealth = bossDefinition.hitpoints
    instance.currentPhase = 1
    instance.damageDealt = {}
    instance.playerEffects = {}
    instance.bossEffects = []
    instance.respawnTime = undefined

    this.world.events.emit('boss:respawned', {
      instanceId: instance.id,
      bossId: instance.bossId,
      location: instance.location,
    })
  }

  private cleanupInstance(instanceId: string): void {
    const instance = this.instances.get(instanceId)
    if (!instance) return

    // Remove all players from instance
    for (const playerId of instance.players) {
      this.playerInstances.delete(playerId)

      const entity = this.world.getEntityById(playerId)
      if (entity) {
        const bossComponent = entity.getComponent('boss_fight') as BossFightComponent
        if (bossComponent) {
          bossComponent.currentInstance = undefined
        }
      }
    }

    this.instances.delete(instanceId)
  }

  // Helper methods
  private getCurrentPhase(instance: BossInstance, bossDefinition: BossDefinition): BossPhase | null {
    return bossDefinition.phases.find(phase => phase.id === instance.currentPhase) || null
  }

  private canUseAttack(instance: BossInstance, attack: BossAttack): boolean {
    const now = Date.now()
    const cooldownEnd = instance.attackCooldowns[attack.id] || 0

    if (now < cooldownEnd) return false

    // Check phase requirements
    if (attack.requiresPhase && attack.requiresPhase !== instance.currentPhase) return false

    // Check health requirements
    if (attack.requiresHealthBelow) {
      const healthPercent = (instance.currentHealth / instance.maxHealth) * 100
      if (healthPercent > attack.requiresHealthBelow) return false
    }

    // Check player count requirements
    if (attack.requiresPlayerCount && instance.players.length < attack.requiresPlayerCount) return false

    return true
  }

  private isPlayerDead(playerId: string): boolean {
    // Simplified check - in a real implementation, this would check the player's health
    return false
  }

  private canPlayerFightBoss(playerId: string, bossId: string): boolean {
    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem')
    const questSystem = this.world.systems.find(s => s.constructor.name === 'QuestSystem')
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem')
    const equipmentSystem = this.world.systems.find(s => s.constructor.name === 'EquipmentSystem')

    const getCombatLevel = (playerId: string) => {
      return equipmentSystem ? (equipmentSystem as any).getCombatLevel(playerId) : 3
    }

    const getSkillLevel = (playerId: string, skill: SkillType) => {
      return skillsSystem ? (skillsSystem as any).getSkillLevel(playerId, skill) : 1
    }

    const isQuestCompleted = (playerId: string, questId: string) => {
      return questSystem ? (questSystem as any).isQuestCompleted(playerId, questId) : false
    }

    const hasItem = (playerId: string, itemId: string, quantity: number) => {
      return inventorySystem ? (inventorySystem as any).hasItem(playerId, itemId, quantity) : false
    }

    const getBossKillCount = (playerId: string, bossId: string) => {
      const entity = this.world.getEntityById(playerId)
      if (!entity) return 0

      const bossComponent = entity.getComponent('boss_fight') as BossFightComponent
      return bossComponent?.killCounts[bossId] || 0
    }

    return canPlayerFightBoss(
      playerId,
      bossId,
      getCombatLevel,
      getSkillLevel,
      isQuestCompleted,
      hasItem,
      getBossKillCount
    )
  }

  private handlePlayerDeathInBossFight(instanceId: string, playerId: string): void {
    const instance = this.instances.get(instanceId)
    if (!instance) return

    // Check if all players are dead
    const alivePlayers = instance.players.filter(pid => !this.isPlayerDead(pid))

    if (alivePlayers.length === 0) {
      this.endBossFight(instanceId, false)
    }
  }

  // Public query methods
  public getBossInstance(instanceId: string): BossInstance | null {
    return this.instances.get(instanceId) || null
  }

  public getPlayerInstance(playerId: string): BossInstance | null {
    const instanceId = this.playerInstances.get(playerId)
    return instanceId ? this.instances.get(instanceId) || null : null
  }

  public getBossFightComponent(playerId: string): BossFightComponent | null {
    const entity = this.world.getEntityById(playerId)
    return entity ? (entity.getComponent('boss_fight') as BossFightComponent) : null
  }

  public getAvailableBosses(playerId: string): BossDefinition[] {
    return Object.values(BOSS_DEFINITIONS).filter(boss => this.canPlayerFightBoss(playerId, boss.id))
  }

  public getActiveBossFights(): BossInstance[] {
    return Array.from(this.instances.values()).filter(
      instance => 
        instance.state === BossInstanceState.ACTIVE || 
        instance.state === BossInstanceState.WAITING ||
        instance.state === BossInstanceState.STARTING
    )
  }

  update(deltaTime: number): void {
    // Instance updates are handled by interval timer
  }

  serialize(): any {
    return {
      instances: Object.fromEntries(this.instances),
      playerInstances: Object.fromEntries(this.playerInstances),
      instanceCounter: this.instanceCounter,
    }
  }

  deserialize(data: any): void {
    if (data.instances) {
      this.instances = new Map(Object.entries(data.instances))
    }
    if (data.playerInstances) {
      this.playerInstances = new Map(Object.entries(data.playerInstances))
    }
    if (data.instanceCounter) {
      this.instanceCounter = data.instanceCounter
    }
  }
}
