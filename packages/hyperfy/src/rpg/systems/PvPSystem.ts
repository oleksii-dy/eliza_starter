import { System } from '../../core/systems/System'
import type { World } from '../../types'
import {
  // RPGEntity,
  PlayerEntity,
  CombatComponent,
  StatsComponent,
  // MovementComponent,
  InventoryComponent,
  Vector3,
} from '../types'

interface _WildernessLevel {
  minLevel: number
  maxLevel: number
  position: {
    min: Vector3
    max: Vector3
  }
}

interface PvPZone {
  id: string
  name: string
  type: 'safe' | 'dangerous' | 'wilderness'
  bounds: {
    min: Vector3
    max: Vector3
  }
  rules: {
    skulling: boolean
    itemLoss: boolean
    combatLevelRange?: number
    singleCombat?: boolean
    multiCombat?: boolean
  }
}

interface SkullData {
  playerId: string
  skullTime: number
  expiresAt: number
  attackedPlayers: Set<string>
}

export class PvPSystem extends System {
  private pvpZones: Map<string, PvPZone> = new Map()
  private skulledPlayers: Map<string, SkullData> = new Map()
  private combatProtection: Map<string, number> = new Map() // New player protection

  // Configuration
  private readonly SKULL_DURATION = 20 * 60 * 1000 // 20 minutes
  private readonly NEW_PLAYER_PROTECTION = 6 * 60 * 60 * 1000 // 6 hours
  private readonly COMBAT_LEVEL_RANGE = 5 // Default wilderness combat range
  private readonly SAFE_ZONE_DELAY = 10000 // 10 seconds to leave combat in safe zone

  constructor(world: World) {
    super(world)
    this.initializeZones()
  }

  /**
   * Initialize the system
   */
  override async init(_options: any): Promise<void> {
    console.log('[PvPSystem] Initializing...')

    // Listen for combat events
    this.world.events.on('combat:attack', this.handleCombatAttack.bind(this))
    this.world.events.on('player:death', this.handlePlayerDeath.bind(this))
    this.world.events.on('player:spawned', this.handlePlayerSpawn.bind(this))
    this.world.events.on('player:move', this.handlePlayerMove.bind(this))

    // Listen for zone transitions
    this.world.events.on('player:zone:enter', this.handleZoneEnter.bind(this))
    this.world.events.on('player:zone:leave', this.handleZoneLeave.bind(this))
  }

  /**
   * Initialize PvP zones
   */
  private initializeZones(): void {
    // Wilderness zones
    this.registerZone({
      id: 'wilderness_low',
      name: 'Low Wilderness',
      type: 'wilderness',
      bounds: {
        min: { x: 2944, y: 0, z: 3520 },
        max: { x: 3391, y: 50, z: 3648 },
      },
      rules: {
        skulling: true,
        itemLoss: true,
        multiCombat: true,
      },
    })

    this.registerZone({
      id: 'wilderness_deep',
      name: 'Deep Wilderness',
      type: 'wilderness',
      bounds: {
        min: { x: 2944, y: 0, z: 3648 },
        max: { x: 3391, y: 50, z: 3967 },
      },
      rules: {
        skulling: true,
        itemLoss: true,
        multiCombat: true,
      },
    })

    // PvP worlds safe zones
    this.registerZone({
      id: 'edgeville_safe',
      name: 'Edgeville Safe Zone',
      type: 'safe',
      bounds: {
        min: { x: 3073, y: 0, z: 3457 },
        max: { x: 3108, y: 20, z: 3518 },
      },
      rules: {
        skulling: false,
        itemLoss: false,
      },
    })

    // Dangerous PvP zones (like Clan Wars)
    this.registerZone({
      id: 'clan_wars_dangerous',
      name: 'Clan Wars Dangerous Portal',
      type: 'dangerous',
      bounds: {
        min: { x: 3327, y: 0, z: 4751 },
        max: { x: 3378, y: 20, z: 4801 },
      },
      rules: {
        skulling: false,
        itemLoss: true,
        singleCombat: false,
        multiCombat: true,
      },
    })
  }

  /**
   * Register a PvP zone
   */
  public registerZone(zone: PvPZone): void {
    this.pvpZones.set(zone.id, zone)
  }

  /**
   * Handle combat attack
   */
  private handleCombatAttack(event: { attackerId: string; targetId: string; timestamp: number }): void {
    const attacker = this.world.entities.get(event.attackerId) as PlayerEntity
    const target = this.world.entities.get(event.targetId) as PlayerEntity

    if (!attacker || !target) {
      return
    }

    // Check if both are players
    if (attacker.type !== 'player' || target.type !== 'player') {
      return
    }

    // Check if PvP is allowed
    if (!this.canAttackPlayer(attacker, target)) {
      this.world.events.emit('combat:cancel', {
        attackerId: event.attackerId,
        reason: 'PvP not allowed',
      })
      return
    }

    // Handle skulling
    this.handleSkulling(attacker, target)
  }

  /**
   * Check if player can attack another player
   */
  public canAttackPlayer(attacker: PlayerEntity, target: PlayerEntity): boolean {
    const attackerPos = attacker.position
    const targetPos = target.position

    // Check if both in same zone
    const attackerZone = this.getPlayerZone(attackerPos)
    const targetZone = this.getPlayerZone(targetPos)

    if (!attackerZone || !targetZone || attackerZone.id !== targetZone.id) {
      this.sendMessage(attacker.id, "You can't attack players in different zones.")
      return false
    }

    // Check zone rules
    if (attackerZone.type === 'safe') {
      this.sendMessage(attacker.id, "You can't attack players in safe zones.")
      return false
    }

    // Check new player protection
    if (this.hasNewPlayerProtection(target)) {
      this.sendMessage(attacker.id, 'That player is under new player protection.')
      return false
    }

    // Check wilderness combat levels
    if (attackerZone.type === 'wilderness') {
      const wildLevel = this.getWildernessLevel(attackerPos)
      if (!this.isWithinCombatRange(attacker, target, wildLevel)) {
        this.sendMessage(attacker.id, 'Your combat level difference is too great.')
        return false
      }
    }

    // Check single/multi combat
    if (attackerZone.rules.singleCombat) {
      const attackerCombat = attacker.getComponent<CombatComponent>('combat')
      const targetCombat = target.getComponent<CombatComponent>('combat')

      if (attackerCombat?.inCombat || targetCombat?.inCombat) {
        this.sendMessage(attacker.id, "You can't attack in single combat areas when already in combat.")
        return false
      }
    }

    return true
  }

  /**
   * Handle skulling mechanics
   */
  private handleSkulling(attacker: PlayerEntity, target: PlayerEntity): void {
    const zone = this.getPlayerZone(attacker.position)
    if (!zone || !zone.rules.skulling) {
      return
    }

    // Check if target has skull
    const targetSkull = this.skulledPlayers.get(target.id)

    // Check if attacker already skulled on this target
    const attackerSkull = this.skulledPlayers.get(attacker.id)
    if (attackerSkull?.attackedPlayers.has(target.id)) {
      return // Already skulled on this player
    }

    // If target doesn't have skull or hasn't attacked attacker, skull the attacker
    if (!targetSkull || !targetSkull.attackedPlayers.has(attacker.id)) {
      this.skullPlayer(attacker, target)
    }
  }

  /**
   * Skull a player
   */
  private skullPlayer(player: PlayerEntity, victim: PlayerEntity): void {
    let skullData = this.skulledPlayers.get(player.id)

    if (!skullData) {
      skullData = {
        playerId: player.id,
        skullTime: Date.now(),
        expiresAt: Date.now() + this.SKULL_DURATION,
        attackedPlayers: new Set(),
      }
      this.skulledPlayers.set(player.id, skullData)
    } else {
      // Refresh skull timer
      skullData.skullTime = Date.now()
      skullData.expiresAt = Date.now() + this.SKULL_DURATION
    }

    skullData.attackedPlayers.add(victim.id)

    // Update player skull timer
    ;(player as any).skullTimer = this.SKULL_DURATION

    // Emit skull event
    this.world.events.emit('player:skulled', {
      playerId: player.id,
      duration: this.SKULL_DURATION,
    })

    this.sendMessage(player.id, 'A skull appears above your head.')
  }

  /**
   * Handle player death in PvP
   */
  private handlePlayerDeath(event: { playerId: string; killerId?: string; position: Vector3 }): void {
    if (!event.killerId) {
      return
    }

    const victim = this.world.entities.get(event.playerId) as PlayerEntity
    const killer = this.world.entities.get(event.killerId) as PlayerEntity

    if (!victim || !killer || killer.type !== 'player') {
      return
    }

    // Remove victim's skull
    this.skulledPlayers.delete(event.playerId)
    ;(victim as any).skullTimer = 0

    // Award kill to killer
    this.awardPvPKill(killer, victim)

    // Emit PvP death event
    this.world.events.emit('pvp:death', {
      victimId: event.playerId,
      killerId: event.killerId,
      position: event.position,
    })
  }

  /**
   * Award PvP kill
   */
  private awardPvPKill(killer: PlayerEntity, victim: PlayerEntity): void {
    // Track PvP stats
    const killerStats = (killer as any).pvpStats || {
      kills: 0,
      deaths: 0,
      killStreak: 0,
      bestKillStreak: 0,
    }

    killerStats.kills++
    killerStats.killStreak++
    if (killerStats.killStreak > killerStats.bestKillStreak) {
      killerStats.bestKillStreak = killerStats.killStreak
    }

    ;(killer as any).pvpStats = killerStats

    // Award points/rewards based on victim's risk
    const riskValue = this.calculateRiskValue(victim)
    if (riskValue > 0) {
      this.world.events.emit('pvp:reward', {
        playerId: killer.id,
        victimId: victim.id,
        riskValue,
      })
    }

    // Announce kill
    const zone = this.getPlayerZone(killer.position)
    if (zone?.type === 'wilderness') {
      this.sendGlobalMessage(`${killer.displayName} has defeated ${victim.displayName} in the Wilderness!`)
    }
  }

  /**
   * Handle player spawn
   */
  private handlePlayerSpawn(event: { playerId: string; firstTime?: boolean }): void {
    if (event.firstTime) {
      // Grant new player protection
      this.combatProtection.set(event.playerId, Date.now() + this.NEW_PLAYER_PROTECTION)
    }
  }

  /**
   * Handle player movement
   */
  private handlePlayerMove(event: { playerId: string; from: Vector3; to: Vector3 }): void {
    const player = this.world.entities.get(event.playerId) as PlayerEntity
    if (!player) {
      return
    }

    const fromZone = this.getPlayerZone(event.from)
    const toZone = this.getPlayerZone(event.to)

    // Check zone transition
    if (fromZone?.id !== toZone?.id) {
      if (fromZone) {
        this.world.events.emit('player:zone:leave', {
          playerId: event.playerId,
          zoneId: fromZone.id,
        })
      }
      if (toZone) {
        this.world.events.emit('player:zone:enter', {
          playerId: event.playerId,
          zoneId: toZone.id,
        })
      }
    }

    // Update wilderness level
    if (toZone?.type === 'wilderness') {
      const wildLevel = this.getWildernessLevel(event.to)
      ;(player as any).wildernessLevel = wildLevel
    } else {
      ;(player as any).wildernessLevel = 0
    }
  }

  /**
   * Handle zone enter
   */
  private handleZoneEnter(event: { playerId: string; zoneId: string }): void {
    const zone = this.pvpZones.get(event.zoneId)
    if (!zone) {
      return
    }

    switch (zone.type) {
      case 'wilderness':
        this.sendMessage(event.playerId, 'You have entered the Wilderness!')
        this.sendMessage(event.playerId, 'Other players can now attack you!')
        break
      case 'dangerous':
        this.sendMessage(event.playerId, `You have entered ${zone.name}.`)
        this.sendMessage(event.playerId, 'This is a dangerous area!')
        break
      case 'safe':
        this.sendMessage(event.playerId, 'You have entered a safe zone.')
        break
    }
  }

  /**
   * Handle zone leave
   */
  private handleZoneLeave(event: { playerId: string; zoneId: string }): void {
    const zone = this.pvpZones.get(event.zoneId)
    if (!zone) {
      return
    }

    if (zone.type === 'wilderness') {
      this.sendMessage(event.playerId, 'You have left the Wilderness.')
    }
  }

  /**
   * Get player's current zone
   */
  private getPlayerZone(position: Vector3): PvPZone | null {
    for (const zone of this.pvpZones.values()) {
      if (this.isInBounds(position, zone.bounds)) {
        return zone
      }
    }
    return null
  }

  /**
   * Get wilderness level at position
   */
  private getWildernessLevel(position: Vector3): number {
    // Wilderness level increases as you go north (higher Z coordinate)
    const wildernessStart = 3520
    if (position.z < wildernessStart) {
      return 0
    }

    const level = Math.floor((position.z - wildernessStart) / 8) + 1
    return Math.min(level, 56) // Max wilderness level
  }

  /**
   * Check if players are within combat range
   */
  private isWithinCombatRange(attacker: PlayerEntity, target: PlayerEntity, wildLevel: number): boolean {
    const attackerStats = attacker.getComponent<StatsComponent>('stats')
    const targetStats = target.getComponent<StatsComponent>('stats')

    if (!attackerStats || !targetStats) {
      return false
    }

    const attackerCombat = attackerStats.combatLevel
    const targetCombat = targetStats.combatLevel

    const range = wildLevel || this.COMBAT_LEVEL_RANGE
    const minLevel = attackerCombat - range
    const maxLevel = attackerCombat + range

    return targetCombat >= minLevel && targetCombat <= maxLevel
  }

  /**
   * Check if player has new player protection
   */
  private hasNewPlayerProtection(player: PlayerEntity): boolean {
    const protection = this.combatProtection.get(player.id)
    if (!protection) {
      return false
    }

    if (Date.now() < protection) {
      return true
    }

    // Protection expired
    this.combatProtection.delete(player.id)
    return false
  }

  /**
   * Calculate risk value
   */
  private calculateRiskValue(player: PlayerEntity): number {
    const inventory = player.getComponent<InventoryComponent>('inventory')
    if (!inventory) {
      return 0
    }

    let totalValue = 0

    // Calculate inventory value
    for (const item of inventory.items) {
      if (item) {
        totalValue += this.getItemValue(item.itemId) * item.quantity
      }
    }

    // Calculate equipment value
    for (const slot of Object.values(inventory.equipment)) {
      if (slot) {
        totalValue += this.getItemValue(slot.id)
      }
    }

    return totalValue
  }

  /**
   * Get item value from registry
   */
  private getItemValue(itemId: number): number {
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem')
    if (inventorySystem && 'itemRegistry' in inventorySystem) {
      const item = (inventorySystem as any).itemRegistry.get(itemId)
      if (item) {
        return item.value
      }
    }
    return 1
  }

  /**
   * Check if position is in bounds
   */
  private isInBounds(position: Vector3, bounds: { min: Vector3; max: Vector3 }): boolean {
    return (
      position.x >= bounds.min.x &&
      position.x <= bounds.max.x &&
      position.y >= bounds.min.y &&
      position.y <= bounds.max.y &&
      position.z >= bounds.min.z &&
      position.z <= bounds.max.z
    )
  }

  /**
   * Send message to player
   */
  private sendMessage(playerId: string, message: string): void {
    this.world.events.emit('chat:message', {
      playerId,
      message,
      type: 'system',
    })
  }

  /**
   * Send global message
   */
  private sendGlobalMessage(message: string): void {
    this.world.events.emit('chat:broadcast', {
      message,
      type: 'pvp',
    })
  }

  /**
   * Update system
   */
  update(_delta: number): void {
    const now = Date.now()

    // Update skull timers
    for (const [playerId, skullData] of this.skulledPlayers) {
      if (now >= skullData.expiresAt) {
        this.skulledPlayers.delete(playerId)

        const player = this.world.entities.get(playerId) as PlayerEntity
        if (player) {
          ;(player as any).skullTimer = 0

          this.world.events.emit('player:skull:removed', {
            playerId,
          })

          this.sendMessage(playerId, 'Your PK skull has disappeared.')
        }
      }
    }
  }

  /**
   * Get PvP stats for player
   */
  public getPlayerPvPStats(playerId: string): any {
    const player = this.world.entities.get(playerId) as PlayerEntity
    if (!player) {
      return null
    }

    return (
      (player as any).pvpStats || {
        kills: 0,
        deaths: 0,
        killStreak: 0,
        bestKillStreak: 0,
      }
    )
  }

  /**
   * Check if player is skulled
   */
  public isPlayerSkulled(playerId: string): boolean {
    return this.skulledPlayers.has(playerId)
  }
}
