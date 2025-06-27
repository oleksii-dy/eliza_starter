import { System } from '../../core/systems/System'
import type { World } from '../../types'
// import { Entity } from '../../core/entities/Entity';
import type { Entity, Component } from '../../types'

// Define clan types locally to avoid import issues
enum ClanRank {
  GUEST = 'guest',
  RECRUIT = 'recruit',
  MEMBER = 'member',
  CORPORAL = 'corporal',
  SERGEANT = 'sergeant',
  LIEUTENANT = 'lieutenant',
  CAPTAIN = 'captain',
  GENERAL = 'general',
  ADMIN = 'admin',
  DEPUTY_OWNER = 'deputy_owner',
  OWNER = 'owner',
}

interface ClanPermissions {
  canInvite: boolean
  canKick: boolean
  canPromote: boolean
  canDemote: boolean
  canManageWars: boolean
  canEditSettings: boolean
  canAccessVault: boolean
}

interface ClanMember {
  playerId: string
  username: string
  rank: ClanRank
  joinDate: number
  lastActive: number
  totalXp: number
  weeklyXp: number
}

interface Clan {
  id: string
  name: string
  tag: string
  description: string
  ownerId: string
  members: Map<string, ClanMember>
  createdAt: number
  totalLevel: number
  memberCount: number
  maxMembers: number
  isOpen: boolean
  permissions: Map<ClanRank, ClanPermissions>
  settings: {
    joinType: 'open' | 'invite' | 'closed'
    minCombatLevel: number
    minTotalLevel: number
    kickInactiveDays: number
    clanColor: string
    motd: string
  }
  requirements: {
    minLevel?: number
    minQuestPoints?: number
    minSkillReqs?: { [skill: string]: number }
  }
  vault: {
    items: any[]
    logs: any[]
  }
  citadel?: {
    tier: number
    resources: { [resource: string]: number }
    upgrades: string[]
  }
}

interface ClanComponent extends Component {
  type: 'clan'
  clanId: string
  rank: ClanRank
  joinDate: number
  invites: string[]
}

interface PlayerEntity extends Entity {
  type: 'player'
  username: string
  displayName: string
}

interface ClanWarRules {
  maxMembers: number
  duration: number
  allowFood: boolean
  allowPotions: boolean
  combatLevelRange: number
}

interface ClanWarParticipant {
  playerId: string
  username: string
  kills: number
  deaths: number
  isActive: boolean
}

interface ClanWar {
  id: string
  clan1Id: string
  clan2Id: string
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  rules: ClanWarRules
  participants1: ClanWarParticipant[]
  participants2: ClanWarParticipant[]
  startTime?: number
  endTime?: number
  winnerId?: string
}

export class ClanSystem extends System {
  private clans: Map<string, Clan> = new Map()
  private playerClans: Map<string, string> = new Map() // playerId -> clanId
  private clanWars: Map<string, ClanWar> = new Map()
  private clanInvites: Map<string, Set<string>> = new Map() // playerId -> Set<clanId>

  // Configuration
  private readonly MIN_CLAN_NAME_LENGTH = 3
  private readonly MAX_CLAN_NAME_LENGTH = 20
  private readonly MIN_CLAN_TAG_LENGTH = 2
  private readonly MAX_CLAN_TAG_LENGTH = 5
  private readonly CLAN_CREATION_COST = 100000 // 100k gold
  private readonly CLAN_WAR_PREPARATION_TIME = 300000 // 5 minutes
  private readonly MAX_CLAN_SIZE = 500
  private readonly INACTIVE_KICK_DAYS = 30

  // Default permissions by rank
  private readonly DEFAULT_PERMISSIONS: Map<ClanRank, ClanPermissions> = new Map([
    [
      ClanRank.RECRUIT,
      {
        invite: false,
        kick: false,
        promote: false,
        demote: false,
        accessTreasury: false,
        editSettings: false,
        startWars: false,
        editMotd: false,
        manageCitadel: false,
      },
    ],
    [
      ClanRank.CORPORAL,
      {
        invite: true,
        kick: false,
        promote: false,
        demote: false,
        accessTreasury: false,
        editSettings: false,
        startWars: false,
        editMotd: false,
        manageCitadel: false,
      },
    ],
    [
      ClanRank.SERGEANT,
      {
        invite: true,
        kick: true,
        promote: false,
        demote: false,
        accessTreasury: false,
        editSettings: false,
        startWars: false,
        editMotd: false,
        manageCitadel: false,
      },
    ],
    [
      ClanRank.LIEUTENANT,
      {
        invite: true,
        kick: true,
        promote: true,
        demote: true,
        accessTreasury: true,
        editSettings: false,
        startWars: true,
        editMotd: true,
        manageCitadel: false,
      },
    ],
    [
      ClanRank.CAPTAIN,
      {
        invite: true,
        kick: true,
        promote: true,
        demote: true,
        accessTreasury: true,
        editSettings: false,
        startWars: true,
        editMotd: true,
        manageCitadel: true,
      },
    ],
    [
      ClanRank.GENERAL,
      {
        invite: true,
        kick: true,
        promote: true,
        demote: true,
        accessTreasury: true,
        editSettings: true,
        startWars: true,
        editMotd: true,
        manageCitadel: true,
      },
    ],
    [
      ClanRank.ADMIN,
      {
        invite: true,
        kick: true,
        promote: true,
        demote: true,
        accessTreasury: true,
        editSettings: true,
        startWars: true,
        editMotd: true,
        manageCitadel: true,
      },
    ],
    [
      ClanRank.DEPUTY_OWNER,
      {
        invite: true,
        kick: true,
        promote: true,
        demote: true,
        accessTreasury: true,
        editSettings: true,
        startWars: true,
        editMotd: true,
        manageCitadel: true,
      },
    ],
    [
      ClanRank.OWNER,
      {
        invite: true,
        kick: true,
        promote: true,
        demote: true,
        accessTreasury: true,
        editSettings: true,
        startWars: true,
        editMotd: true,
        manageCitadel: true,
      },
    ],
  ])

  constructor(world: World) {
    super(world)
  }

  /**
   * Create a new clan
   */
  createClan(founderId: string, name: string, tag: string, description: string = ''): string | null {
    // Validate inputs
    if (!this.validateClanName(name)) {
      this.emit('clan:error', {
        playerId: founderId,
        error: 'Invalid clan name',
      })
      return null
    }

    if (!this.validateClanTag(tag)) {
      this.emit('clan:error', {
        playerId: founderId,
        error: 'Invalid clan tag',
      })
      return null
    }

    // Check if player is already in a clan
    if (this.playerClans.has(founderId)) {
      this.emit('clan:error', {
        playerId: founderId,
        error: 'You must leave your current clan first',
      })
      return null
    }

    // Check if clan name or tag already exists
    for (const clan of this.clans.values()) {
      if (clan.name.toLowerCase() === name.toLowerCase()) {
        this.emit('clan:error', {
          playerId: founderId,
          error: 'Clan name already exists',
        })
        return null
      }
      if (clan.tag.toLowerCase() === tag.toLowerCase()) {
        this.emit('clan:error', {
          playerId: founderId,
          error: 'Clan tag already exists',
        })
        return null
      }
    }

    // Check founder has enough gold
    const founder = this.world.entities.get(founderId)
    if (!founder) {
      return null
    }

    const inventory = founder.getComponent('inventory')
    if (!inventory || !this.hasGold(inventory, this.CLAN_CREATION_COST)) {
      this.emit('clan:error', {
        playerId: founderId,
        error: 'Insufficient gold',
      })
      return null
    }

    // Deduct gold
    this.removeGold(inventory, this.CLAN_CREATION_COST)

    // Create clan
    const clanId = this.generateClanId()
    const founderMember: ClanMember = {
      playerId: founderId,
      username: (founder as PlayerEntity).displayName || 'Unknown',
      rank: ClanRank.OWNER,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      contributions: this.CLAN_CREATION_COST,
      clanXp: 0,
    }

    const clan: Clan = {
      id: clanId,
      name,
      tag,
      description,
      owner: founderId,
      created: Date.now(),
      members: new Map([[founderId, founderMember]]),
      maxMembers: 50, // Start with 50, can be upgraded
      level: 1,
      experience: 0,
      treasury: 0,
      settings: {
        joinType: 'invite',
        minCombatLevel: 3,
        minTotalLevel: 50,
        kickInactiveDays: this.INACTIVE_KICK_DAYS,
        clanColor: '#ffffff',
        motd: `Welcome to ${name}!`,
      },
      features: {
        citadel: false,
        clanWars: true,
        clanChat: true,
        events: true,
      },
      permissions: new Map(this.DEFAULT_PERMISSIONS),
    }

    // Store clan
    this.clans.set(clanId, clan)
    this.playerClans.set(founderId, clanId)

    // Update player component
    this.updatePlayerClanComponent(founderId, clanId, ClanRank.OWNER)

    // Emit event
    this.emit('clan:created', {
      clanId,
      name,
      tag,
      founderId,
    })

    return clanId
  }

  /**
   * Invite a player to clan
   */
  invitePlayer(inviterId: string, targetPlayerId: string): boolean {
    const inviterClanId = this.playerClans.get(inviterId)
    if (!inviterClanId) {
      return false
    }

    const clan = this.clans.get(inviterClanId)
    if (!clan) {
      return false
    }

    const inviterMember = clan.members.get(inviterId)
    if (!inviterMember) {
      return false
    }

    // Check permissions
    const permissions = clan.permissions.get(inviterMember.rank)
    if (!permissions?.invite) {
      this.emit('clan:error', {
        playerId: inviterId,
        error: 'You do not have permission to invite',
      })
      return false
    }

    // Check if target is already in a clan
    if (this.playerClans.has(targetPlayerId)) {
      this.emit('clan:error', {
        playerId: inviterId,
        error: 'Player is already in a clan',
      })
      return false
    }

    // Check clan capacity
    if (clan.members.size >= clan.maxMembers) {
      this.emit('clan:error', {
        playerId: inviterId,
        error: 'Clan is full',
      })
      return false
    }

    // Add invite
    let invites = this.clanInvites.get(targetPlayerId)
    if (!invites) {
      invites = new Set()
      this.clanInvites.set(targetPlayerId, invites)
    }
    invites.add(inviterClanId)

    // Update target player component
    const targetPlayer = this.world.entities.get(targetPlayerId)
    if (targetPlayer) {
      const clanComponent = targetPlayer.getComponent<ClanComponent>('clan')
      if (clanComponent) {
        clanComponent.invites.push(inviterClanId)
      }
    }

    // Emit event
    this.emit('clan:invite-sent', {
      clanId: inviterClanId,
      inviterId,
      targetPlayerId,
      clanName: clan.name,
    })

    return true
  }

  /**
   * Accept clan invite
   */
  acceptInvite(playerId: string, clanId: string): boolean {
    const invites = this.clanInvites.get(playerId)
    if (!invites || !invites.has(clanId)) {
      this.emit('clan:error', {
        playerId,
        error: 'No invite from this clan',
      })
      return false
    }

    const clan = this.clans.get(clanId)
    if (!clan) {
      return false
    }

    // Check requirements
    const player = this.world.entities.get(playerId) as PlayerEntity
    if (!player) {
      return false
    }

    const stats = player.getComponent('stats') as any
    if (stats) {
      if (stats.combatLevel < clan.settings.minCombatLevel) {
        this.emit('clan:error', {
          playerId,
          error: `Combat level ${clan.settings.minCombatLevel} required`,
        })
        return false
      }
      if (stats.totalLevel < clan.settings.minTotalLevel) {
        this.emit('clan:error', {
          playerId,
          error: `Total level ${clan.settings.minTotalLevel} required`,
        })
        return false
      }
    }

    // Check capacity
    if (clan.members.size >= clan.maxMembers) {
      this.emit('clan:error', {
        playerId,
        error: 'Clan is full',
      })
      return false
    }

    // Add member
    const member: ClanMember = {
      playerId,
      username: player.displayName || 'Unknown',
      rank: ClanRank.RECRUIT,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      contributions: 0,
      clanXp: 0,
    }

    clan.members.set(playerId, member)
    this.playerClans.set(playerId, clanId)

    // Clear invites
    this.clanInvites.delete(playerId)

    // Update player component
    this.updatePlayerClanComponent(playerId, clanId, ClanRank.RECRUIT)

    // Emit event
    this.emit('clan:member-joined', {
      clanId,
      playerId,
      playerName: member.username,
    })

    // Broadcast to clan
    this.broadcastToClan(clanId, `${member.username} has joined the clan!`)

    return true
  }

  /**
   * Leave clan
   */
  leaveClan(playerId: string): boolean {
    const clanId = this.playerClans.get(playerId)
    if (!clanId) {
      return false
    }

    const clan = this.clans.get(clanId)
    if (!clan) {
      return false
    }

    const member = clan.members.get(playerId)
    if (!member) {
      return false
    }

    // Check if owner
    if (member.rank === ClanRank.OWNER) {
      // Find deputy owner or highest ranked member
      let newOwner: ClanMember | null = null
      for (const m of clan.members.values()) {
        if (m.playerId === playerId) {
          continue
        }
        if (m.rank === ClanRank.DEPUTY_OWNER) {
          newOwner = m
          break
        }
        if (!newOwner || this.getRankLevel(m.rank) > this.getRankLevel(newOwner.rank)) {
          newOwner = m
        }
      }

      if (newOwner) {
        // Transfer ownership
        newOwner.rank = ClanRank.OWNER
        clan.owner = newOwner.playerId
        this.emit('clan:ownership-transferred', {
          clanId,
          oldOwnerId: playerId,
          newOwnerId: newOwner.playerId,
        })
      } else {
        // Disband clan if no other members
        this.disbandClan(clanId)
        return true
      }
    }

    // Remove member
    clan.members.delete(playerId)
    this.playerClans.delete(playerId)

    // Update player component
    this.updatePlayerClanComponent(playerId, null, null)

    // Emit event
    this.emit('clan:member-left', {
      clanId,
      playerId,
      playerName: member.username,
    })

    // Broadcast to clan
    this.broadcastToClan(clanId, `${member.username} has left the clan.`)

    return true
  }

  /**
   * Kick member from clan
   */
  kickMember(kickerId: string, targetId: string): boolean {
    const clanId = this.playerClans.get(kickerId)
    if (!clanId) {
      return false
    }

    const clan = this.clans.get(clanId)
    if (!clan) {
      return false
    }

    const kicker = clan.members.get(kickerId)
    const target = clan.members.get(targetId)

    if (!kicker || !target) {
      return false
    }

    // Check permissions
    const permissions = clan.permissions.get(kicker.rank)
    if (!permissions?.kick) {
      this.emit('clan:error', {
        playerId: kickerId,
        error: 'You do not have permission to kick',
      })
      return false
    }

    // Check rank hierarchy
    if (this.getRankLevel(target.rank) >= this.getRankLevel(kicker.rank)) {
      this.emit('clan:error', {
        playerId: kickerId,
        error: 'Cannot kick members of equal or higher rank',
      })
      return false
    }

    // Remove member
    clan.members.delete(targetId)
    this.playerClans.delete(targetId)

    // Update player component
    this.updatePlayerClanComponent(targetId, null, null)

    // Emit event
    this.emit('clan:member-kicked', {
      clanId,
      kickerId,
      targetId,
      targetName: target.username,
    })

    // Notify kicked player
    this.sendMessage(targetId, `You have been kicked from ${clan.name}`)

    // Broadcast to clan
    this.broadcastToClan(clanId, `${target.username} has been kicked from the clan.`)

    return true
  }

  /**
   * Promote clan member
   */
  promoteMember(promoterId: string, targetId: string): boolean {
    const clanId = this.playerClans.get(promoterId)
    if (!clanId) {
      return false
    }

    const clan = this.clans.get(clanId)
    if (!clan) {
      return false
    }

    const promoter = clan.members.get(promoterId)
    const target = clan.members.get(targetId)

    if (!promoter || !target) {
      return false
    }

    // Check permissions
    const permissions = clan.permissions.get(promoter.rank)
    if (!permissions?.promote) {
      this.emit('clan:error', {
        playerId: promoterId,
        error: 'You do not have permission to promote',
      })
      return false
    }

    // Get next rank
    const nextRank = this.getNextRank(target.rank)
    if (!nextRank) {
      this.emit('clan:error', {
        playerId: promoterId,
        error: 'Member is already at highest rank',
      })
      return false
    }

    // Check if promoter can promote to this rank
    if (this.getRankLevel(nextRank) >= this.getRankLevel(promoter.rank)) {
      this.emit('clan:error', {
        playerId: promoterId,
        error: 'Cannot promote to equal or higher rank than yourself',
      })
      return false
    }

    // Promote
    const oldRank = target.rank
    target.rank = nextRank

    // Update player component
    this.updatePlayerClanComponent(targetId, clanId, nextRank)

    // Emit event
    this.emit('clan:member-promoted', {
      clanId,
      promoterId,
      targetId,
      oldRank,
      newRank: nextRank,
    })

    // Notify target
    this.sendMessage(targetId, `You have been promoted to ${nextRank}!`)

    // Broadcast to clan
    this.broadcastToClan(clanId, `${target.username} has been promoted to ${nextRank}.`)

    return true
  }

  /**
   * Start clan war
   */
  startClanWar(initiatorId: string, targetClanId: string, rules: ClanWarRules): string | null {
    const initiatorClanId = this.playerClans.get(initiatorId)
    if (!initiatorClanId) {
      return null
    }

    const initiatorClan = this.clans.get(initiatorClanId)
    const targetClan = this.clans.get(targetClanId)

    if (!initiatorClan || !targetClan) {
      return null
    }

    const initiator = initiatorClan.members.get(initiatorId)
    if (!initiator) {
      return null
    }

    // Check permissions
    const permissions = initiatorClan.permissions.get(initiator.rank)
    if (!permissions?.startWars) {
      this.emit('clan:error', {
        playerId: initiatorId,
        error: 'You do not have permission to start wars',
      })
      return null
    }

    // Check if clans are already in war
    for (const war of this.clanWars.values()) {
      if (war.status === 'active' || war.status === 'pending') {
        if (
          war.clan1Id === initiatorClanId ||
          war.clan2Id === initiatorClanId ||
          war.clan1Id === targetClanId ||
          war.clan2Id === targetClanId
        ) {
          this.emit('clan:error', {
            playerId: initiatorId,
            error: 'One or both clans are already in a war',
          })
          return null
        }
      }
    }

    // Create war
    const warId = this.generateWarId()
    const war: ClanWar = {
      id: warId,
      clan1Id: initiatorClanId,
      clan2Id: targetClanId,
      startTime: Date.now() + this.CLAN_WAR_PREPARATION_TIME,
      endTime: 0,
      status: 'pending',
      participants: new Map(),
      scores: {
        clan1: 0,
        clan2: 0,
      },
      rules,
      winner: undefined,
    }

    this.clanWars.set(warId, war)

    // Emit event
    this.emit('clan:war-declared', {
      warId,
      clan1Id: initiatorClanId,
      clan1Name: initiatorClan.name,
      clan2Id: targetClanId,
      clan2Name: targetClan.name,
      startTime: war.startTime,
    })

    // Broadcast to both clans
    this.broadcastToClan(initiatorClanId, `War declared against ${targetClan.name}! Prepare for battle!`)
    this.broadcastToClan(targetClanId, `${initiatorClan.name} has declared war! Prepare for battle!`)

    return warId
  }

  /**
   * Join clan war
   */
  joinClanWar(playerId: string, warId: string): boolean {
    const war = this.clanWars.get(warId)
    if (!war || war.status !== 'pending') {
      return false
    }

    const playerClanId = this.playerClans.get(playerId)
    if (!playerClanId) {
      return false
    }

    if (playerClanId !== war.clan1Id && playerClanId !== war.clan2Id) {
      return false
    }

    // Check combat level requirements
    const player = this.world.entities.get(playerId) as PlayerEntity
    const stats = player?.getComponent('stats') as any
    if (stats && stats.combatLevel && war.rules.combatLevelRange) {
      const combatLevel = stats.combatLevel
      if (combatLevel < war.rules.combatLevelRange[0] || combatLevel > war.rules.combatLevelRange[1]) {
        this.emit('clan:error', {
          playerId,
          error: 'Your combat level does not meet the war requirements',
        })
        return false
      }
    }

    // Add participant
    const participant: ClanWarParticipant = {
      playerId,
      clanId: playerClanId,
      kills: 0,
      deaths: 0,
      damageDealt: 0,
      healingDone: 0,
    }

    war.participants.set(playerId, participant)

    // Emit event
    this.emit('clan:war-participant-joined', {
      warId,
      playerId,
      clanId: playerClanId,
    })

    return true
  }

  /**
   * Update clan war stats
   */
  updateWarStats(
    warId: string,
    playerId: string,
    stat: 'kills' | 'deaths' | 'damage' | 'healing',
    value: number
  ): void {
    const war = this.clanWars.get(warId)
    if (!war || war.status !== 'active') {
      return
    }

    const participant = war.participants.get(playerId)
    if (!participant) {
      return
    }

    participant[stat] += value

    // Update clan score based on kills
    if (stat === 'kills') {
      if (participant.clanId === war.clan1Id) {
        war.scores.clan1 += value
      } else {
        war.scores.clan2 += value
      }

      // Check win condition
      this.checkWarWinCondition(war)
    }
  }

  /**
   * Get clan by ID
   */
  getClan(clanId: string): Clan | null {
    return this.clans.get(clanId) || null
  }

  /**
   * Get player's clan
   */
  getPlayerClan(playerId: string): Clan | null {
    const clanId = this.playerClans.get(playerId)
    if (!clanId) {
      return null
    }
    return this.clans.get(clanId) || null
  }

  /**
   * Search clans
   */
  searchClans(query: string): Clan[] {
    const results: Clan[] = []
    const lowerQuery = query.toLowerCase()

    for (const clan of this.clans.values()) {
      if (clan.settings.joinType === 'closed') {
        continue
      }

      if (
        clan.name.toLowerCase().includes(lowerQuery) ||
        clan.tag.toLowerCase().includes(lowerQuery) ||
        clan.description.toLowerCase().includes(lowerQuery)
      ) {
        results.push(clan)
      }
    }

    return results.slice(0, 20) // Limit to 20 results
  }

  /**
   * Update clan settings
   */
  updateClanSettings(playerId: string, settings: Partial<Clan['settings']>): boolean {
    const clanId = this.playerClans.get(playerId)
    if (!clanId) {
      return false
    }

    const clan = this.clans.get(clanId)
    if (!clan) {
      return false
    }

    const member = clan.members.get(playerId)
    if (!member) {
      return false
    }

    // Check permissions
    const permissions = clan.permissions.get(member.rank)
    if (!permissions?.editSettings) {
      this.emit('clan:error', {
        playerId,
        error: 'You do not have permission to edit settings',
      })
      return false
    }

    // Update settings
    Object.assign(clan.settings, settings)

    // Emit event
    this.emit('clan:settings-updated', {
      clanId,
      updatedBy: playerId,
      settings,
    })

    return true
  }

  /**
   * Deposit to clan treasury
   */
  depositToTreasury(playerId: string, amount: number): boolean {
    const clanId = this.playerClans.get(playerId)
    if (!clanId) {
      return false
    }

    const clan = this.clans.get(clanId)
    if (!clan) {
      return false
    }

    const member = clan.members.get(playerId)
    if (!member) {
      return false
    }

    const player = this.world.entities.get(playerId)
    if (!player) {
      return false
    }

    const inventory = player.getComponent('inventory')
    if (!inventory || !this.hasGold(inventory, amount)) {
      this.emit('clan:error', {
        playerId,
        error: 'Insufficient gold',
      })
      return false
    }

    // Deduct gold
    this.removeGold(inventory, amount)

    // Update treasury and contributions
    clan.treasury += amount
    member.contributions += amount

    // Grant clan XP
    const xpGained = Math.floor(amount / 100) // 1 XP per 100 gold
    this.grantClanXP(clanId, xpGained)
    member.clanXp += xpGained

    // Emit event
    this.emit('clan:treasury-deposit', {
      clanId,
      playerId,
      amount,
      newTotal: clan.treasury,
    })

    return true
  }

  /**
   * Clan chat message
   */
  sendClanMessage(senderId: string, message: string): void {
    const clanId = this.playerClans.get(senderId)
    if (!clanId) {
      return
    }

    const clan = this.clans.get(clanId)
    if (!clan) {
      return
    }

    const member = clan.members.get(senderId)
    if (!member) {
      return
    }

    // Check chat settings
    if (clan.settings.joinType === 'closed' && member.rank === ClanRank.RECRUIT) {
      this.sendMessage(senderId, 'Recruits cannot talk in closed clans')
      return
    }

    // Update last chat time
    const playerComponent = this.getPlayerClanComponent(senderId)
    if (playerComponent) {
      playerComponent.lastClanChat = Date.now()
    }

    // Emit event
    this.emit('clan:chat-message', {
      clanId,
      senderId,
      senderName: member.username,
      senderRank: member.rank,
      message,
      timestamp: Date.now(),
    })
  }

  /**
   * Update member activity
   */
  updateMemberActivity(playerId: string): void {
    const clanId = this.playerClans.get(playerId)
    if (!clanId) {
      return
    }

    const clan = this.clans.get(clanId)
    if (!clan) {
      return
    }

    const member = clan.members.get(playerId)
    if (!member) {
      return
    }

    member.lastSeen = Date.now()
  }

  /**
   * Clean up inactive members
   */
  private cleanupInactiveMembers(): void {
    const now = Date.now()
    const _inactiveThreshold = this.INACTIVE_KICK_DAYS * 24 * 60 * 60 * 1000

    for (const clan of this.clans.values()) {
      if (clan.settings.kickInactiveDays <= 0) {
        continue
      }

      const threshold = clan.settings.kickInactiveDays * 24 * 60 * 60 * 1000
      const toKick: string[] = []

      for (const [playerId, member] of clan.members) {
        // Don't kick high-ranking members
        if (this.getRankLevel(member.rank) >= this.getRankLevel(ClanRank.LIEUTENANT)) {
          continue
        }

        if (now - member.lastSeen > threshold) {
          toKick.push(playerId)
        }
      }

      // Kick inactive members
      for (const playerId of toKick) {
        const member = clan.members.get(playerId)
        if (member) {
          clan.members.delete(playerId)
          this.playerClans.delete(playerId)
          this.updatePlayerClanComponent(playerId, null, null)

          this.emit('clan:member-kicked', {
            clanId: clan.id,
            targetId: playerId,
            targetName: member.username,
            reason: 'inactivity',
          })
        }
      }
    }
  }

  /**
   * Helper methods
   */
  private validateClanName(name: string): boolean {
    if (name.length < this.MIN_CLAN_NAME_LENGTH || name.length > this.MAX_CLAN_NAME_LENGTH) {
      return false
    }
    return /^[a-zA-Z0-9 ]+$/.test(name)
  }

  private validateClanTag(tag: string): boolean {
    if (tag.length < this.MIN_CLAN_TAG_LENGTH || tag.length > this.MAX_CLAN_TAG_LENGTH) {
      return false
    }
    return /^[a-zA-Z0-9]+$/.test(tag)
  }

  private getRankLevel(rank: ClanRank): number {
    const levels = {
      [ClanRank.RECRUIT]: 0,
      [ClanRank.CORPORAL]: 1,
      [ClanRank.SERGEANT]: 2,
      [ClanRank.LIEUTENANT]: 3,
      [ClanRank.CAPTAIN]: 4,
      [ClanRank.GENERAL]: 5,
      [ClanRank.ADMIN]: 6,
      [ClanRank.DEPUTY_OWNER]: 7,
      [ClanRank.OWNER]: 8,
    }
    return levels[rank] || 0
  }

  private getNextRank(currentRank: ClanRank): ClanRank | null {
    const progression = [
      ClanRank.RECRUIT,
      ClanRank.CORPORAL,
      ClanRank.SERGEANT,
      ClanRank.LIEUTENANT,
      ClanRank.CAPTAIN,
      ClanRank.GENERAL,
      ClanRank.ADMIN,
      ClanRank.DEPUTY_OWNER,
    ]

    const currentIndex = progression.indexOf(currentRank)
    if (currentIndex === -1 || currentIndex === progression.length - 1) {
      return null
    }

    return progression[currentIndex + 1]
  }

  private grantClanXP(clanId: string, xp: number): void {
    const clan = this.clans.get(clanId)
    if (!clan) {
      return
    }

    clan.experience += xp

    // Check for level up
    const newLevel = Math.floor(Math.sqrt(clan.experience / 100)) + 1
    if (newLevel > clan.level) {
      clan.level = newLevel

      // Upgrade benefits
      if (newLevel % 5 === 0) {
        clan.maxMembers += 10 // +10 members every 5 levels
      }

      this.emit('clan:level-up', {
        clanId,
        newLevel,
        benefits: {
          maxMembers: clan.maxMembers,
        },
      })

      this.broadcastToClan(clanId, `The clan has reached level ${newLevel}!`)
    }
  }

  private updatePlayerClanComponent(playerId: string, clanId: string | null, rank: ClanRank | null): void {
    const player = this.world.entities.get(playerId)
    if (!player) {
      return
    }

    let component = player.getComponent<ClanComponent>('clan')
    if (!component) {
      component = {
        type: 'clan',
        entity: player,
        data: {},
        clanId,
        rank,
        invites: [],
        joinedAt: clanId ? Date.now() : 0,
        contributions: 0,
        clanXp: 0,
        lastClanChat: 0,
      }
      player.addComponent('clan', component)
    } else {
      component.clanId = clanId
      component.rank = rank
      if (!clanId) {
        component.joinedAt = 0
        component.contributions = 0
        component.clanXp = 0
      }
    }
  }

  private getPlayerClanComponent(playerId: string): ClanComponent | null {
    const player = this.world.entities.get(playerId)
    if (!player) {
      return null
    }
    return player.getComponent<ClanComponent>('clan')
  }

  private disbandClan(clanId: string): void {
    const clan = this.clans.get(clanId)
    if (!clan) {
      return
    }

    // Remove all members
    for (const playerId of clan.members.keys()) {
      this.playerClans.delete(playerId)
      this.updatePlayerClanComponent(playerId, null, null)
    }

    // Cancel any active wars
    for (const [warId, war] of this.clanWars) {
      if ((war.clan1Id === clanId || war.clan2Id === clanId) && (war.status === 'pending' || war.status === 'active')) {
        war.status = 'completed'
        this.emit('clan:war-cancelled', {
          warId,
          reason: 'clan_disbanded',
        })
      }
    }

    // Remove clan
    this.clans.delete(clanId)

    // Emit event
    this.emit('clan:disbanded', {
      clanId,
      clanName: clan.name,
    })
  }

  private checkWarWinCondition(war: ClanWar): void {
    // Example: First to 100 kills wins
    const winScore = 100

    let winner: string | undefined
    if (war.scores.clan1 >= winScore) {
      winner = war.clan1Id
    } else if (war.scores.clan2 >= winScore) {
      winner = war.clan2Id
    }

    if (winner) {
      war.status = 'completed'
      war.endTime = Date.now()

      const winnerClan = this.clans.get(winner)
      const loserClan = this.clans.get(winner === war.clan1Id ? war.clan2Id : war.clan1Id)

      this.emit('clan:war-ended', {
        warId: war.id,
        winnerId: winner,
        winnerName: winnerClan?.name,
        loserId: winner === war.clan1Id ? war.clan2Id : war.clan1Id,
        loserName: loserClan?.name,
        finalScore: war.scores,
      })

      // Grant rewards
      if (winnerClan) {
        this.grantClanXP(winner, 1000) // 1000 XP for winning
        winnerClan.treasury += 50000 // 50k gold prize
      }

      // Add final score
      if (winner === war.clan1Id) {
        war.scores.clan1 += 10
      } else {
        war.scores.clan2 += 10
      }
    }
  }

  private broadcastToClan(clanId: string, message: string): void {
    this.emit('clan:broadcast', {
      clanId,
      message,
      timestamp: Date.now(),
    })
  }

  private sendMessage(playerId: string, message: string): void {
    this.emit('chat:message', {
      playerId,
      message,
      type: 'system',
    })
  }

  private hasGold(inventory: any, amount: number): boolean {
    return inventory.getItemCount(995) >= amount // 995 is gold ID
  }

  private removeGold(inventory: any, amount: number): void {
    inventory.removeItem(995, amount)
  }

  private generateClanId(): string {
    return `clan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateWarId(): string {
    return `war_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Update loop
   */
  update(_delta: number): void {
    // Update active wars
    const now = Date.now()
    for (const war of this.clanWars.values()) {
      if (war.status === 'pending' && now >= war.startTime) {
        war.status = 'active'
        this.emit('clan:war-started', {
          warId: war.id,
          clan1Id: war.clan1Id,
          clan2Id: war.clan2Id,
        })
      }
    }

    // Periodic cleanup (every hour)
    if (now % 3600000 < _delta) {
      this.cleanupInactiveMembers()
    }
  }
}
