/**
 * Player Housing System - RuneScape-style Player-Owned House construction
 * Handles house creation, room building, furniture placement, and permissions
 */

import { System } from '../../../core/systems/System'
import type { World, Entity } from '../../../types'
import {
  RoomType,
  HouseStyle,
  FurnitureCategory,
  RoomDefinition,
  FurnitureDefinition,
  HouseStyleDefinition,
  BuildingRequirement,
  getRoomDefinition,
  getFurnitureDefinition,
  getHouseStyleDefinition,
  canPlayerBuildRoom,
  canPlayerBuildFurniture,
  getFurnitureForRoom,
  ROOM_DEFINITIONS,
  FURNITURE_DEFINITIONS,
  HOUSE_STYLE_DEFINITIONS,
} from './HousingDefinitions'
import { SkillType } from '../skills/SkillDefinitions'

export interface HouseLayout {
  width: number
  height: number
  rooms: { [roomId: string]: PlacedRoom }
  nextRoomId: number
}

export interface PlacedRoom {
  id: string
  type: RoomType
  position: { x: number; y: number }
  rotation: number // 0, 90, 180, 270 degrees
  furniture: { [furnitureId: string]: PlacedFurniture }
  nextFurnitureId: number
}

export interface PlacedFurniture {
  id: string
  definitionId: string
  position: { x: number; y: number }
  rotation: number
  customName?: string
}

export interface PlayerHouse {
  ownerId: string
  ownerName: string
  style: HouseStyle
  layout: HouseLayout
  permissions: HousePermissions
  created: number
  lastModified: number
  totalValue: number // Combined value of all furniture and rooms
  visitCount: number
}

export interface HousePermissions {
  building: 'owner' | 'friends' | 'nobody'
  entering: 'everyone' | 'friends' | 'nobody'
  kickPlayers: 'owner' | 'friends'
  friends: string[] // Player IDs
  banned: string[] // Player IDs
}

export interface PlayerHousingComponent {
  type: 'player_housing'
  houseId?: string
  currentlyVisiting?: string // House ID being visited
  constructionExperience: number
  housesBuilt: number
  lastActivity: number
  invitations: string[] // Pending house invitations
}

export interface BuildingProject {
  playerId: string
  type: 'room' | 'furniture'
  targetId: string // Room type or furniture definition ID
  position: { x: number; y: number }
  rotation: number
  roomId?: string // For furniture placement
  materials: { itemId: string; quantity: number }[]
  cost: number
  experience: number
  startTime: number
  duration: number // Build time in milliseconds
}

export class PlayerHousingSystem extends System {
  private houses: Map<string, PlayerHouse> = new Map()
  private playerHouseMap: Map<string, string> = new Map() // playerId -> houseId
  private buildingProjects: Map<string, BuildingProject> = new Map() // playerId -> project
  private houseIdCounter: number = 0
  private readonly MAX_HOUSE_SIZE = 20
  private readonly BASE_BUILD_TIME = 5000 // 5 seconds base build time

  constructor(world: World) {
    super(world)
  }

  async initialize(): Promise<void> {
    console.log('[PlayerHousingSystem] Initializing...')

    // Listen for housing events
    this.world.events.on('player:joined', this.handlePlayerJoined.bind(this))
    this.world.events.on('housing:create_house', this.handleCreateHouse.bind(this))
    this.world.events.on('housing:enter_house', this.handleEnterHouse.bind(this))
    this.world.events.on('housing:leave_house', this.handleLeaveHouse.bind(this))
    this.world.events.on('housing:change_style', this.handleChangeStyle.bind(this))
    this.world.events.on('housing:build_room', this.handleBuildRoom.bind(this))
    this.world.events.on('housing:remove_room', this.handleRemoveRoom.bind(this))
    this.world.events.on('housing:place_furniture', this.handlePlaceFurniture.bind(this))
    this.world.events.on('housing:remove_furniture', this.handleRemoveFurniture.bind(this))
    this.world.events.on('housing:invite_player', this.handleInvitePlayer.bind(this))
    this.world.events.on('housing:kick_player', this.handleKickPlayer.bind(this))
    this.world.events.on('housing:update_permissions', this.handleUpdatePermissions.bind(this))
    this.world.events.on('housing:view_house', this.handleViewHouse.bind(this))

    // Start building project timer
    setInterval(() => this.updateBuildingProjects(), 1000)

    console.log('[PlayerHousingSystem] Initialized with construction system')
  }

  private handlePlayerJoined(data: any): void {
    const { entityId } = data
    this.createPlayerHousingComponent(entityId)
  }

  public createPlayerHousingComponent(entityId: string): PlayerHousingComponent | null {
    const entity = this.world.getEntityById(entityId)
    if (!entity) {
      return null
    }

    const housingComponent: PlayerHousingComponent = {
      type: 'player_housing',
      constructionExperience: 0,
      housesBuilt: 0,
      lastActivity: Date.now(),
      invitations: [],
    }

    entity.addComponent(housingComponent)
    return housingComponent
  }

  private handleCreateHouse(data: any): void {
    const { playerId, style } = data
    this.createPlayerHouse(playerId, style)
  }

  private handleEnterHouse(data: any): void {
    const { playerId, targetPlayerId } = data
    this.enterPlayerHouse(playerId, targetPlayerId)
  }

  private handleLeaveHouse(data: any): void {
    const { playerId } = data
    this.leaveHouse(playerId)
  }

  private handleChangeStyle(data: any): void {
    const { playerId, newStyle } = data
    this.changeHouseStyle(playerId, newStyle)
  }

  private handleBuildRoom(data: any): void {
    const { playerId, roomType, position, rotation } = data
    this.startBuildingRoom(playerId, roomType, position, rotation)
  }

  private handleRemoveRoom(data: any): void {
    const { playerId, roomId } = data
    this.removeRoom(playerId, roomId)
  }

  private handlePlaceFurniture(data: any): void {
    const { playerId, furnitureId, roomId, position, rotation } = data
    this.startPlacingFurniture(playerId, furnitureId, roomId, position, rotation)
  }

  private handleRemoveFurniture(data: any): void {
    const { playerId, roomId, furnitureId } = data
    this.removeFurniture(playerId, roomId, furnitureId)
  }

  private handleInvitePlayer(data: any): void {
    const { playerId, targetPlayerId } = data
    this.invitePlayerToHouse(playerId, targetPlayerId)
  }

  private handleKickPlayer(data: any): void {
    const { playerId, targetPlayerId } = data
    this.kickPlayerFromHouse(playerId, targetPlayerId)
  }

  private handleUpdatePermissions(data: any): void {
    const { playerId, permissions } = data
    this.updateHousePermissions(playerId, permissions)
  }

  private handleViewHouse(data: any): void {
    const { playerId, targetPlayerId } = data
    const houseData = this.getHouseData(targetPlayerId || playerId)

    this.world.events.emit('housing:house_data', {
      playerId,
      houseData,
    })
  }

  public createPlayerHouse(playerId: string, style: HouseStyle = HouseStyle.BASIC_WOOD): boolean {
    const entity = this.world.getEntityById(playerId)
    if (!entity) {
      return false
    }

    const housingComponent = entity.getComponent('player_housing') as PlayerHousingComponent
    if (!housingComponent) {
      return false
    }

    // Check if player already has a house
    if (this.playerHouseMap.has(playerId)) {
      this.world.events.emit('housing:error', {
        playerId,
        message: 'You already have a house!',
      })
      return false
    }

    // Check if player can afford the style
    const styleDef = getHouseStyleDefinition(style)
    if (!styleDef) {
      return false
    }

    if (!this.canPlayerAffordBuilding(playerId, styleDef.requirements)) {
      this.world.events.emit('housing:error', {
        playerId,
        message: 'You cannot afford this house style',
      })
      return false
    }

    // Create house
    const houseId = `house_${this.houseIdCounter++}_${Date.now()}`
    const playerName = this.getPlayerName(playerId)

    const house: PlayerHouse = {
      ownerId: playerId,
      ownerName: playerName,
      style,
      layout: {
        width: 8,
        height: 8,
        rooms: {},
        nextRoomId: 1,
      },
      permissions: {
        building: 'owner',
        entering: 'friends',
        kickPlayers: 'owner',
        friends: [],
        banned: [],
      },
      created: Date.now(),
      lastModified: Date.now(),
      totalValue: styleDef.cost,
      visitCount: 0,
    }

    // Add default garden room
    this.addRoomToHouse(house, RoomType.GARDEN, { x: 2, y: 2 }, 0)

    // Consume materials and coins
    this.consumeBuildingRequirements(playerId, styleDef.requirements)

    // Store house
    this.houses.set(houseId, house)
    this.playerHouseMap.set(playerId, houseId)

    // Update component
    housingComponent.houseId = houseId
    housingComponent.housesBuilt++
    housingComponent.lastActivity = Date.now()

    this.world.events.emit('housing:house_created', {
      playerId,
      houseId,
      style,
      styleName: styleDef.name,
    })

    return true
  }

  public enterPlayerHouse(visitorId: string, ownerId: string): boolean {
    const houseId = this.playerHouseMap.get(ownerId)
    if (!houseId) {
      this.world.events.emit('housing:error', {
        playerId: visitorId,
        message: 'Player does not have a house',
      })
      return false
    }

    const house = this.houses.get(houseId)
    if (!house) {
      return false
    }

    // Check permissions
    if (!this.canPlayerEnterHouse(visitorId, house)) {
      this.world.events.emit('housing:error', {
        playerId: visitorId,
        message: 'You do not have permission to enter this house',
      })
      return false
    }

    // Update visitor component
    const entity = this.world.getEntityById(visitorId)
    if (entity) {
      const housingComponent = entity.getComponent('player_housing') as PlayerHousingComponent
      if (housingComponent) {
        housingComponent.currentlyVisiting = houseId
      }
    }

    // Update visit count
    house.visitCount++

    this.world.events.emit('housing:entered_house', {
      playerId: visitorId,
      houseId,
      ownerName: house.ownerName,
      house: this.getPublicHouseData(house),
    })

    return true
  }

  public leaveHouse(playerId: string): boolean {
    const entity = this.world.getEntityById(playerId)
    if (!entity) {
      return false
    }

    const housingComponent = entity.getComponent('player_housing') as PlayerHousingComponent
    if (!housingComponent || !housingComponent.currentlyVisiting) {
      this.world.events.emit('housing:error', {
        playerId,
        message: 'You are not in a house',
      })
      return false
    }

    housingComponent.currentlyVisiting = undefined

    this.world.events.emit('housing:left_house', {
      playerId,
    })

    return true
  }

  public startBuildingRoom(
    playerId: string,
    roomType: RoomType,
    position: { x: number; y: number },
    rotation: number = 0
  ): boolean {
    const houseId = this.playerHouseMap.get(playerId)
    if (!houseId) {
      return false
    }

    const house = this.houses.get(houseId)
    const roomDef = getRoomDefinition(roomType)
    if (!house || !roomDef) {
      return false
    }

    // Check permissions
    if (!this.canPlayerBuildInHouse(playerId, house)) {
      this.world.events.emit('housing:error', {
        playerId,
        message: 'You do not have building permissions',
      })
      return false
    }

    // Check if player can build this room
    if (!this.canPlayerAffordBuilding(playerId, roomDef.requirements)) {
      this.world.events.emit('housing:error', {
        playerId,
        message: 'You cannot afford to build this room',
      })
      return false
    }

    // Check if position is valid
    if (!this.isValidRoomPosition(house, roomDef, position)) {
      this.world.events.emit('housing:error', {
        playerId,
        message: 'Invalid room position',
      })
      return false
    }

    // Check for existing building project
    if (this.buildingProjects.has(playerId)) {
      this.world.events.emit('housing:error', {
        playerId,
        message: 'You are already building something',
      })
      return false
    }

    // Create building project
    const project: BuildingProject = {
      playerId,
      type: 'room',
      targetId: roomType,
      position,
      rotation,
      materials: roomDef.requirements.materials,
      cost: roomDef.requirements.cost || 0,
      experience: this.calculateRoomExperience(roomDef),
      startTime: Date.now(),
      duration: this.calculateBuildTime(roomDef.requirements),
    }

    // Consume materials
    this.consumeBuildingRequirements(playerId, roomDef.requirements)

    this.buildingProjects.set(playerId, project)

    this.world.events.emit('housing:building_started', {
      playerId,
      type: 'room',
      roomType,
      duration: project.duration,
      experience: project.experience,
    })

    return true
  }

  public startPlacingFurniture(
    playerId: string,
    furnitureId: string,
    roomId: string,
    position: { x: number; y: number },
    rotation: number = 0
  ): boolean {
    const houseId = this.playerHouseMap.get(playerId)
    if (!houseId) {
      return false
    }

    const house = this.houses.get(houseId)
    const furnitureDef = getFurnitureDefinition(furnitureId)
    if (!house || !furnitureDef) {
      return false
    }

    const room = house.layout.rooms[roomId]
    if (!room) {
      this.world.events.emit('housing:error', {
        playerId,
        message: 'Room not found',
      })
      return false
    }

    // Check permissions
    if (!this.canPlayerBuildInHouse(playerId, house)) {
      this.world.events.emit('housing:error', {
        playerId,
        message: 'You do not have building permissions',
      })
      return false
    }

    // Check if furniture can be placed in this room
    if (!furnitureDef.allowedRooms.includes(room.type)) {
      this.world.events.emit('housing:error', {
        playerId,
        message: 'This furniture cannot be placed in this room',
      })
      return false
    }

    // Check if player can build this furniture
    if (!this.canPlayerAffordBuilding(playerId, furnitureDef.requirements)) {
      this.world.events.emit('housing:error', {
        playerId,
        message: 'You cannot afford to build this furniture',
      })
      return false
    }

    // Check if position is valid
    if (!this.isValidFurniturePosition(room, furnitureDef, position)) {
      this.world.events.emit('housing:error', {
        playerId,
        message: 'Invalid furniture position',
      })
      return false
    }

    // Check for existing building project
    if (this.buildingProjects.has(playerId)) {
      this.world.events.emit('housing:error', {
        playerId,
        message: 'You are already building something',
      })
      return false
    }

    // Create building project
    const project: BuildingProject = {
      playerId,
      type: 'furniture',
      targetId: furnitureId,
      position,
      rotation,
      roomId,
      materials: furnitureDef.requirements.materials,
      cost: furnitureDef.requirements.cost || 0,
      experience: furnitureDef.experience,
      startTime: Date.now(),
      duration: this.calculateBuildTime(furnitureDef.requirements),
    }

    // Consume materials
    this.consumeBuildingRequirements(playerId, furnitureDef.requirements)

    this.buildingProjects.set(playerId, project)

    this.world.events.emit('housing:building_started', {
      playerId,
      type: 'furniture',
      furnitureId,
      roomId,
      duration: project.duration,
      experience: project.experience,
    })

    return true
  }

  private updateBuildingProjects(): void {
    const now = Date.now()
    const completedProjects: string[] = []

    for (const [playerId, project] of this.buildingProjects) {
      if (now >= project.startTime + project.duration) {
        this.completeBuildingProject(playerId, project)
        completedProjects.push(playerId)
      }
    }

    // Remove completed projects
    completedProjects.forEach(playerId => {
      this.buildingProjects.delete(playerId)
    })
  }

  private completeBuildingProject(playerId: string, project: BuildingProject): void {
    const houseId = this.playerHouseMap.get(playerId)
    if (!houseId) {
      return
    }

    const house = this.houses.get(houseId)
    if (!house) {
      return
    }

    if (project.type === 'room') {
      // Add room to house
      this.addRoomToHouse(house, project.targetId as RoomType, project.position, project.rotation)
    } else if (project.type === 'furniture') {
      // Add furniture to room
      if (project.roomId) {
        this.addFurnitureToRoom(house, project.roomId, project.targetId, project.position, project.rotation)
      }
    }

    // Give construction experience
    this.giveConstructionExperience(playerId, project.experience)

    // Update house value
    house.totalValue += project.cost
    house.lastModified = Date.now()

    this.world.events.emit('housing:building_completed', {
      playerId,
      type: project.type,
      targetId: project.targetId,
      experience: project.experience,
    })
  }

  private addRoomToHouse(
    house: PlayerHouse,
    roomType: RoomType,
    position: { x: number; y: number },
    rotation: number
  ): void {
    const roomId = `room_${house.layout.nextRoomId++}`

    const room: PlacedRoom = {
      id: roomId,
      type: roomType,
      position,
      rotation,
      furniture: {},
      nextFurnitureId: 1,
    }

    house.layout.rooms[roomId] = room
  }

  private addFurnitureToRoom(
    house: PlayerHouse,
    roomId: string,
    furnitureDefId: string,
    position: { x: number; y: number },
    rotation: number
  ): void {
    const room = house.layout.rooms[roomId]
    if (!room) {
      return
    }

    const furnitureId = `furniture_${room.nextFurnitureId++}`

    const furniture: PlacedFurniture = {
      id: furnitureId,
      definitionId: furnitureDefId,
      position,
      rotation,
    }

    room.furniture[furnitureId] = furniture
  }

  public removeRoom(playerId: string, roomId: string): boolean {
    const houseId = this.playerHouseMap.get(playerId)
    if (!houseId) {
      return false
    }

    const house = this.houses.get(houseId)
    if (!house) {
      return false
    }

    // Check permissions
    if (!this.canPlayerBuildInHouse(playerId, house)) {
      this.world.events.emit('housing:error', {
        playerId,
        message: 'You do not have building permissions',
      })
      return false
    }

    const room = house.layout.rooms[roomId]
    if (!room) {
      return false
    }

    // Cannot remove garden (main room)
    if (room.type === RoomType.GARDEN) {
      this.world.events.emit('housing:error', {
        playerId,
        message: 'Cannot remove the garden room',
      })
      return false
    }

    // Remove room and all its furniture
    delete house.layout.rooms[roomId]
    house.lastModified = Date.now()

    this.world.events.emit('housing:room_removed', {
      playerId,
      roomId,
    })

    return true
  }

  public removeFurniture(playerId: string, roomId: string, furnitureId: string): boolean {
    const houseId = this.playerHouseMap.get(playerId)
    if (!houseId) {
      return false
    }

    const house = this.houses.get(houseId)
    if (!house) {
      return false
    }

    // Check permissions
    if (!this.canPlayerBuildInHouse(playerId, house)) {
      this.world.events.emit('housing:error', {
        playerId,
        message: 'You do not have building permissions',
      })
      return false
    }

    const room = house.layout.rooms[roomId]
    if (!room || !room.furniture[furnitureId]) {
      return false
    }

    // Remove furniture
    delete room.furniture[furnitureId]
    house.lastModified = Date.now()

    this.world.events.emit('housing:furniture_removed', {
      playerId,
      roomId,
      furnitureId,
    })

    return true
  }

  public changeHouseStyle(playerId: string, newStyle: HouseStyle): boolean {
    const houseId = this.playerHouseMap.get(playerId)
    if (!houseId) {
      return false
    }

    const house = this.houses.get(houseId)
    const styleDef = getHouseStyleDefinition(newStyle)
    if (!house || !styleDef) {
      return false
    }

    if (house.ownerId !== playerId) {
      this.world.events.emit('housing:error', {
        playerId,
        message: 'You can only change your own house style',
      })
      return false
    }

    // Check if player can afford the style
    if (!this.canPlayerAffordBuilding(playerId, styleDef.requirements)) {
      this.world.events.emit('housing:error', {
        playerId,
        message: 'You cannot afford this house style',
      })
      return false
    }

    // Consume materials and coins
    this.consumeBuildingRequirements(playerId, styleDef.requirements)

    house.style = newStyle
    house.lastModified = Date.now()

    this.world.events.emit('housing:style_changed', {
      playerId,
      newStyle,
      styleName: styleDef.name,
    })

    return true
  }

  public invitePlayerToHouse(ownerId: string, guestId: string): boolean {
    const houseId = this.playerHouseMap.get(ownerId)
    if (!houseId) {
      return false
    }

    const house = this.houses.get(houseId)
    if (!house || house.ownerId !== ownerId) {
      return false
    }

    const guestEntity = this.world.getEntityById(guestId)
    if (!guestEntity) {
      return false
    }

    const guestComponent = guestEntity.getComponent('player_housing') as PlayerHousingComponent
    if (!guestComponent) {
      return false
    }

    // Add invitation
    if (!guestComponent.invitations.includes(houseId)) {
      guestComponent.invitations.push(houseId)
    }

    this.world.events.emit('housing:invitation_sent', {
      ownerId,
      guestId,
      ownerName: house.ownerName,
    })

    return true
  }

  public kickPlayerFromHouse(ownerId: string, playerId: string): boolean {
    const houseId = this.playerHouseMap.get(ownerId)
    if (!houseId) {
      return false
    }

    const house = this.houses.get(houseId)
    if (!house) {
      return false
    }

    // Check permissions
    if (!this.canPlayerKickFromHouse(ownerId, house)) {
      this.world.events.emit('housing:error', {
        playerId: ownerId,
        message: 'You do not have permission to kick players',
      })
      return false
    }

    // Check if player is in the house
    const entity = this.world.getEntityById(playerId)
    if (!entity) {
      return false
    }

    const housingComponent = entity.getComponent('player_housing') as PlayerHousingComponent
    if (!housingComponent || housingComponent.currentlyVisiting !== houseId) {
      this.world.events.emit('housing:error', {
        playerId: ownerId,
        message: 'Player is not in your house',
      })
      return false
    }

    // Remove player from house
    housingComponent.currentlyVisiting = undefined

    this.world.events.emit('housing:player_kicked', {
      ownerId,
      kickedPlayerId: playerId,
    })

    return true
  }

  public updateHousePermissions(playerId: string, permissions: Partial<HousePermissions>): boolean {
    const houseId = this.playerHouseMap.get(playerId)
    if (!houseId) {
      return false
    }

    const house = this.houses.get(houseId)
    if (!house || house.ownerId !== playerId) {
      return false
    }

    // Update permissions
    Object.assign(house.permissions, permissions)
    house.lastModified = Date.now()

    this.world.events.emit('housing:permissions_updated', {
      playerId,
      permissions: house.permissions,
    })

    return true
  }

  // Helper methods
  private canPlayerEnterHouse(playerId: string, house: PlayerHouse): boolean {
    if (house.ownerId === playerId) {
      return true
    }
    if (house.permissions.banned.includes(playerId)) {
      return false
    }

    switch (house.permissions.entering) {
      case 'everyone':
        return true
      case 'friends':
        return house.permissions.friends.includes(playerId)
      case 'nobody':
        return false
      default:
        return false
    }
  }

  private canPlayerBuildInHouse(playerId: string, house: PlayerHouse): boolean {
    if (house.ownerId === playerId) {
      return true
    }

    switch (house.permissions.building) {
      case 'friends':
        return house.permissions.friends.includes(playerId)
      case 'nobody':
      case 'owner':
      default:
        return false
    }
  }

  private canPlayerKickFromHouse(playerId: string, house: PlayerHouse): boolean {
    if (house.ownerId === playerId) {
      return true
    }

    switch (house.permissions.kickPlayers) {
      case 'friends':
        return house.permissions.friends.includes(playerId)
      case 'owner':
      default:
        return false
    }
  }

  private canPlayerAffordBuilding(playerId: string, requirements: BuildingRequirement): boolean {
    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem')
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem')

    // Check skill level
    if (skillsSystem) {
      const skillLevel = (skillsSystem as any).getSkillLevel(playerId, requirements.skillType)
      if (skillLevel < requirements.level) {
        return false
      }
    }

    // Check materials
    if (inventorySystem) {
      for (const material of requirements.materials) {
        if (!(inventorySystem as any).hasItem(playerId, material.itemId, material.quantity)) {
          return false
        }
      }

      // Check coins for service cost
      if (requirements.cost && requirements.cost > 0) {
        if (!(inventorySystem as any).hasItem(playerId, 'coins', requirements.cost)) {
          return false
        }
      }
    }

    return true
  }

  private consumeBuildingRequirements(playerId: string, requirements: BuildingRequirement): void {
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem')

    if (inventorySystem) {
      // Remove materials
      requirements.materials.forEach(material => {
        ;(inventorySystem as any).removeItem(playerId, material.itemId, material.quantity)
      })

      // Remove service cost
      if (requirements.cost && requirements.cost > 0) {
        ;(inventorySystem as any).removeItem(playerId, 'coins', requirements.cost)
      }
    }
  }

  private giveConstructionExperience(playerId: string, experience: number): void {
    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem')

    if (skillsSystem) {
      ;(skillsSystem as any).addExperience(playerId, SkillType.CONSTRUCTION, experience)
    }

    // Update housing component
    const entity = this.world.getEntityById(playerId)
    if (entity) {
      const housingComponent = entity.getComponent('player_housing') as PlayerHousingComponent
      if (housingComponent) {
        housingComponent.constructionExperience += experience
        housingComponent.lastActivity = Date.now()
      }
    }
  }

  private calculateBuildTime(requirements: BuildingRequirement): number {
    // Base time + time based on complexity
    const materialComplexity = requirements.materials.reduce((sum, mat) => sum + mat.quantity, 0)
    return this.BASE_BUILD_TIME + materialComplexity * 100
  }

  private calculateRoomExperience(roomDef: RoomDefinition): number {
    // Experience based on room size and complexity
    const baseExp = 100
    const sizeBonus = roomDef.size.width * roomDef.size.height * 5
    const materialBonus = roomDef.requirements.materials.reduce((sum, mat) => sum + mat.quantity, 0) * 2
    return baseExp + sizeBonus + materialBonus
  }

  private isValidRoomPosition(
    house: PlayerHouse,
    roomDef: RoomDefinition,
    position: { x: number; y: number }
  ): boolean {
    // Check if room fits within house bounds
    if (position.x < 0 || position.y < 0) {
      return false
    }
    if (position.x + roomDef.size.width > this.MAX_HOUSE_SIZE) {
      return false
    }
    if (position.y + roomDef.size.height > this.MAX_HOUSE_SIZE) {
      return false
    }

    // Check for overlap with existing rooms
    for (const room of Object.values(house.layout.rooms)) {
      const roomDefExisting = getRoomDefinition(room.type)
      if (!roomDefExisting) {
        continue
      }

      const overlap = this.checkRoomOverlap(position, roomDef.size, room.position, roomDefExisting.size)
      if (overlap) {
        return false
      }
    }

    return true
  }

  private isValidFurniturePosition(
    room: PlacedRoom,
    furnitureDef: FurnitureDefinition,
    position: { x: number; y: number }
  ): boolean {
    const roomDef = getRoomDefinition(room.type)
    if (!roomDef) {
      return false
    }

    // Check if furniture fits within room bounds
    if (position.x < 0 || position.y < 0) {
      return false
    }
    if (position.x + furnitureDef.placementSize.width > roomDef.size.width) {
      return false
    }
    if (position.y + furnitureDef.placementSize.height > roomDef.size.height) {
      return false
    }

    // Check for overlap with existing furniture
    for (const furniture of Object.values(room.furniture)) {
      const furnitureDefExisting = getFurnitureDefinition(furniture.definitionId)
      if (!furnitureDefExisting) {
        continue
      }

      const overlap = this.checkRoomOverlap(
        position,
        furnitureDef.placementSize,
        furniture.position,
        furnitureDefExisting.placementSize
      )
      if (overlap) {
        return false
      }
    }

    return true
  }

  private checkRoomOverlap(
    pos1: { x: number; y: number },
    size1: { width: number; height: number },
    pos2: { x: number; y: number },
    size2: { width: number; height: number }
  ): boolean {
    return !(
      pos1.x + size1.width <= pos2.x ||
      pos2.x + size2.width <= pos1.x ||
      pos1.y + size1.height <= pos2.y ||
      pos2.y + size2.height <= pos1.y
    )
  }

  private getPlayerName(playerId: string): string {
    const entity = this.world.getEntityById(playerId)
    return entity?.data?.name || `Player_${playerId.slice(-6)}`
  }

  private getPublicHouseData(house: PlayerHouse): any {
    return {
      ownerId: house.ownerId,
      ownerName: house.ownerName,
      style: house.style,
      layout: house.layout,
      totalValue: house.totalValue,
      visitCount: house.visitCount,
      created: house.created,
    }
  }

  // Public query methods
  public getPlayerHouse(playerId: string): PlayerHouse | null {
    const houseId = this.playerHouseMap.get(playerId)
    return houseId ? this.houses.get(houseId) || null : null
  }

  public getHouseData(playerId: string): any {
    const house = this.getPlayerHouse(playerId)
    return house ? this.getPublicHouseData(house) : null
  }

  public getPlayerHousingComponent(playerId: string): PlayerHousingComponent | null {
    const entity = this.world.getEntityById(playerId)
    return entity ? (entity.getComponent('player_housing') as PlayerHousingComponent) : null
  }

  public getBuildingProject(playerId: string): BuildingProject | null {
    return this.buildingProjects.get(playerId) || null
  }

  public getAvailableRooms(playerId: string): RoomDefinition[] {
    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem')
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem')

    if (!skillsSystem || !inventorySystem) {
      return []
    }

    const getSkillLevel = (playerId: string, skill: SkillType) => {
      return (skillsSystem as any).getSkillLevel(playerId, skill)
    }

    const hasItems = (playerId: string, itemId: string, quantity: number) => {
      return (inventorySystem as any).hasItem(playerId, itemId, quantity)
    }

    return Object.values(ROOM_DEFINITIONS).filter(room =>
      canPlayerBuildRoom(playerId, room.id, getSkillLevel, hasItems)
    )
  }

  public getAvailableFurniture(playerId: string, roomType?: RoomType): FurnitureDefinition[] {
    const skillsSystem = this.world.systems.find(s => s.constructor.name === 'EnhancedSkillsSystem')
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem')

    if (!skillsSystem || !inventorySystem) {
      return []
    }

    const getSkillLevel = (playerId: string, skill: SkillType) => {
      return (skillsSystem as any).getSkillLevel(playerId, skill)
    }

    const hasItems = (playerId: string, itemId: string, quantity: number) => {
      return (inventorySystem as any).hasItem(playerId, itemId, quantity)
    }

    let furniture = Object.values(FURNITURE_DEFINITIONS).filter(furniture =>
      canPlayerBuildFurniture(playerId, furniture.id, getSkillLevel, hasItems)
    )

    if (roomType) {
      furniture = getFurnitureForRoom(roomType).filter(furniture =>
        canPlayerBuildFurniture(playerId, furniture.id, getSkillLevel, hasItems)
      )
    }

    return furniture
  }

  update(deltaTime: number): void {
    // Building projects are updated by interval timer
  }

  serialize(): any {
    return {
      houses: Object.fromEntries(this.houses),
      playerHouseMap: Object.fromEntries(this.playerHouseMap),
      buildingProjects: Object.fromEntries(this.buildingProjects),
      houseIdCounter: this.houseIdCounter,
    }
  }

  deserialize(data: any): void {
    if (data.houses) {
      this.houses = new Map(Object.entries(data.houses))
    }
    if (data.playerHouseMap) {
      this.playerHouseMap = new Map(Object.entries(data.playerHouseMap))
    }
    if (data.buildingProjects) {
      this.buildingProjects = new Map(Object.entries(data.buildingProjects))
    }
    if (data.houseIdCounter) {
      this.houseIdCounter = data.houseIdCounter
    }
  }
}
