import { System } from '../../core/systems/System'
import type { World } from '../../types'
import { Component, Entity } from '../../types'

// Define local types to avoid import issues
interface Vector3 {
  x: number
  y: number
  z: number
}

enum RoomType {
  GARDEN = 'garden',
  PARLOUR = 'parlour',
  KITCHEN = 'kitchen',
  DINING_ROOM = 'dining_room',
  WORKSHOP = 'workshop',
  BEDROOM = 'bedroom',
  HALL = 'hall',
  GAMES_ROOM = 'games_room',
  COMBAT_ROOM = 'combat_room',
  QUEST_HALL = 'quest_hall',
  STUDY = 'study',
  COSTUME_ROOM = 'costume_room',
  CHAPEL = 'chapel',
  PORTAL_CHAMBER = 'portal_chamber',
  FORMAL_GARDEN = 'formal_garden',
  THRONE_ROOM = 'throne_room',
  OUBLIETTE = 'oubliette',
  DUNGEON = 'dungeon',
  TREASURE_ROOM = 'treasure_room',
}

enum HotspotType {
  DECORATION = 'decoration',
  SEATING = 'seating',
  TABLE = 'table',
  STORAGE = 'storage',
  LIGHTING = 'lighting',
  RUG = 'rug',
  ALTAR = 'altar',
  PORTAL = 'portal',
  GUARD = 'guard',
  TROPHY = 'trophy',
  SKILL = 'skill',
  GAMES = 'games',
  GLORY = 'glory',
}

interface PlayerEntity extends Entity {
  type: 'player'
  username: string
  displayName: string
}

interface ItemStack {
  itemId: number
  quantity: number
  metadata?: any
}

interface FurnitureEffect {
  type: 'teleport' | 'restore' | 'bank' | 'altar' | 'range' | 'repair' | 'pet_house'
  data: any
}

interface ServantTask {
  type: 'bank' | 'sawmill' | 'unnote' | 'fetch'
  items: ItemStack[]
  completionTime: number
}

interface Furniture {
  id: string
  itemId: number
  name: string
  hotspotType: HotspotType
  level: number
  experience: number
  materials: ItemStack[]
  effects?: FurnitureEffect[]
  interactable: boolean
}

interface ConstructionRoom {
  id: string
  type: RoomType
  rotation: number
  level: number
  furniture: Map<string, Furniture>
  doors: Map<string, boolean>
  hotspots: Map<string, HotspotType>
}

interface HouseSettings {
  locked: boolean
  buildMode: boolean
  pvpEnabled: boolean
  teleportInside: boolean
  renderDistance: number
  theme: 'basic' | 'fancy' | 'ancient'
  visitors: string[]
  maxVisitors: number
}

interface PlayerHouse {
  id: string
  ownerId: string
  location: 'rimmington' | 'taverley' | 'pollnivneach' | 'hosidius' | 'rellekka' | 'brimhaven' | 'yanille'
  layout: Map<string, ConstructionRoom>
  maxRooms: number
  maxFloors: number
  settings: HouseSettings
  servant: {
    type: 'none' | 'rick' | 'maid' | 'cook' | 'butler' | 'demon_butler'
    taskQueue: ServantTask[]
    lastPayment: number
  }
  visitors: string[]
  maxVisitors: number
  dungeonMonsters: Array<{
    type: string
    position: Vector3
    respawnTime: number
  }>
}

interface ConstructionComponent extends Component {
  type: 'construction'
  level: number
  experience: number
  houseId: string | null
  inHouse: boolean
  buildMode: boolean
  flatpacks: Map<number, number>
  currentBuild: {
    roomType: RoomType | null
    position: Vector3 | null
    rotation: number
  } | null
}

export class ConstructionSystem extends System {
  private houses: Map<string, PlayerHouse> = new Map()
  private playerHouses: Map<string, string> = new Map() // playerId -> houseId
  private furnitureDefinitions: Map<string, Furniture> = new Map()
  private roomCosts: Map<RoomType, { level: number; cost: number }> = new Map()

  // House locations with their portal coordinates
  private housePortals: Map<string, Vector3> = new Map([
    ['rimmington', { x: 2954, y: 0, z: 3224 }],
    ['taverley', { x: 2894, y: 0, z: 3465 }],
    ['pollnivneach', { x: 3340, y: 0, z: 3003 }],
    ['hosidius', { x: 1743, y: 0, z: 3517 }],
    ['rellekka', { x: 2670, y: 0, z: 3631 }],
    ['brimhaven', { x: 2758, y: 0, z: 3178 }],
    ['yanille', { x: 2544, y: 0, z: 3095 }],
  ])

  // Configuration
  private readonly HOUSE_INSTANCE_OFFSET = 10000 // Offset for house instances
  private readonly MAX_ROOMS = 30
  private readonly MAX_FLOORS = 3
  private readonly ROOM_SIZE = 8 // 8x8 tiles per room
  private readonly BUILD_MODE_SPEED = 0.5 // Movement speed in build mode
  private readonly SERVANT_WAGES: Map<string, number> = new Map([
    ['rick', 500],
    ['maid', 1000],
    ['cook', 3000],
    ['butler', 5000],
    ['demon_butler', 10000],
  ])

  constructor(world: World) {
    super(world)
    this.initializeRoomCosts()
    this.initializeFurniture()
  }

  /**
   * Initialize room costs and level requirements
   */
  private initializeRoomCosts(): void {
    this.roomCosts.set(RoomType.GARDEN, { level: 1, cost: 1000 })
    this.roomCosts.set(RoomType.PARLOUR, { level: 1, cost: 1000 })
    this.roomCosts.set(RoomType.KITCHEN, { level: 5, cost: 5000 })
    this.roomCosts.set(RoomType.DINING_ROOM, { level: 10, cost: 5000 })
    this.roomCosts.set(RoomType.WORKSHOP, { level: 15, cost: 10000 })
    this.roomCosts.set(RoomType.BEDROOM, { level: 20, cost: 10000 })
    this.roomCosts.set(RoomType.HALL, { level: 25, cost: 10000 })
    this.roomCosts.set(RoomType.GAMES_ROOM, { level: 30, cost: 15000 })
    this.roomCosts.set(RoomType.COMBAT_ROOM, { level: 32, cost: 15000 })
    this.roomCosts.set(RoomType.QUEST_HALL, { level: 35, cost: 25000 })
    this.roomCosts.set(RoomType.STUDY, { level: 40, cost: 15000 })
    this.roomCosts.set(RoomType.COSTUME_ROOM, { level: 42, cost: 15000 })
    this.roomCosts.set(RoomType.CHAPEL, { level: 45, cost: 25000 })
    this.roomCosts.set(RoomType.PORTAL_CHAMBER, { level: 50, cost: 100000 })
    this.roomCosts.set(RoomType.FORMAL_GARDEN, { level: 55, cost: 75000 })
    this.roomCosts.set(RoomType.THRONE_ROOM, { level: 60, cost: 150000 })
    this.roomCosts.set(RoomType.OUBLIETTE, { level: 65, cost: 125000 })
    this.roomCosts.set(RoomType.DUNGEON, { level: 70, cost: 100000 })
    this.roomCosts.set(RoomType.TREASURE_ROOM, { level: 75, cost: 250000 })
  }

  /**
   * Initialize furniture definitions
   */
  private initializeFurniture(): void {
    // Basic furniture
    this.registerFurniture({
      id: 'wooden_chair',
      itemId: 6752,
      name: 'Wooden chair',
      hotspotType: HotspotType.SEATING,
      level: 1,
      experience: 14,
      materials: [
        { itemId: 960, quantity: 2 }, // Planks
      ],
      interactable: true,
    })

    this.registerFurniture({
      id: 'oak_chair',
      itemId: 6753,
      name: 'Oak chair',
      hotspotType: HotspotType.SEATING,
      level: 19,
      experience: 60,
      materials: [
        { itemId: 8778, quantity: 2 }, // Oak planks
      ],
      interactable: true,
    })

    // Tables
    this.registerFurniture({
      id: 'wooden_table',
      itemId: 6760,
      name: 'Wooden table',
      hotspotType: HotspotType.TABLE,
      level: 12,
      experience: 20,
      materials: [
        { itemId: 960, quantity: 4 }, // Planks
      ],
      interactable: false,
    })

    // Storage
    this.registerFurniture({
      id: 'wooden_bookcase',
      itemId: 6770,
      name: 'Wooden bookcase',
      hotspotType: HotspotType.STORAGE,
      level: 4,
      experience: 20,
      materials: [
        { itemId: 960, quantity: 3 }, // Planks
      ],
      interactable: true,
    })

    // Lighting
    this.registerFurniture({
      id: 'candle',
      itemId: 36,
      name: 'Candle',
      hotspotType: HotspotType.LIGHTING,
      level: 8,
      experience: 4,
      materials: [
        { itemId: 36, quantity: 1 }, // Candle
      ],
      interactable: false,
    })

    // Altar
    this.registerFurniture({
      id: 'oak_altar',
      itemId: 13179,
      name: 'Oak altar',
      hotspotType: HotspotType.ALTAR,
      level: 45,
      experience: 240,
      materials: [
        { itemId: 8778, quantity: 4 }, // Oak planks
      ],
      effects: [
        {
          type: 'altar',
          data: { prayerBonus: 120 }, // 120% prayer restoration
        },
      ],
      interactable: true,
    })

    // Portals
    this.registerFurniture({
      id: 'varrock_portal',
      itemId: 13615,
      name: 'Varrock portal',
      hotspotType: HotspotType.PORTAL,
      level: 50,
      experience: 250,
      materials: [
        { itemId: 8782, quantity: 3 }, // Mahogany planks
        { itemId: 563, quantity: 100 }, // Law runes
      ],
      effects: [
        {
          type: 'teleport',
          data: { destination: 'varrock', position: { x: 3213, y: 0, z: 3428 } },
        },
      ],
      interactable: true,
    })

    // Glory
    this.registerFurniture({
      id: 'mounted_glory',
      itemId: 13523,
      name: 'Mounted glory',
      hotspotType: HotspotType.GLORY,
      level: 47,
      experience: 290,
      materials: [
        { itemId: 1704, quantity: 1 }, // Amulet of glory
        { itemId: 8780, quantity: 3 }, // Teak planks
      ],
      effects: [
        {
          type: 'teleport',
          data: {
            destinations: ['edgeville', 'karamja', 'draynor', 'al_kharid'],
            charges: -1, // Unlimited
          },
        },
      ],
      interactable: true,
    })
  }

  /**
   * Register a furniture definition
   */
  registerFurniture(furniture: Furniture): void {
    this.furnitureDefinitions.set(furniture.id, furniture)
  }

  /**
   * Buy a house
   */
  buyHouse(playerId: string, location: string): boolean {
    if (this.playerHouses.has(playerId)) {
      this.emit('construction:error', {
        playerId,
        error: 'You already own a house',
      })
      return false
    }

    const player = this.world.entities.get(playerId) as PlayerEntity
    if (!player) {
      return false
    }

    // Check construction level
    const constructionComponent = this.getOrCreateConstructionComponent(player)
    if (constructionComponent.level < 1) {
      this.emit('construction:error', {
        playerId,
        error: 'You need at least level 1 Construction',
      })
      return false
    }

    // Check gold
    const houseCost = 1000 // 1k gold for basic house
    const inventory = player.getComponent('inventory')
    if (!inventory || !this.hasGold(inventory, houseCost)) {
      this.emit('construction:error', {
        playerId,
        error: 'You need 1,000 gold to buy a house',
      })
      return false
    }

    // Check location validity
    if (!this.housePortals.has(location)) {
      this.emit('construction:error', {
        playerId,
        error: 'Invalid house location',
      })
      return false
    }

    // Deduct gold
    this.removeGold(inventory, houseCost)

    // Create house
    const houseId = this.generateHouseId()
    const house: PlayerHouse = {
      id: houseId,
      ownerId: playerId,
      location: location as any,
      layout: new Map(),
      maxRooms: 20, // Start with 20, can upgrade
      maxFloors: 1, // Start with ground floor only
      settings: {
        locked: false,
        buildMode: false,
        pvpEnabled: false,
        teleportInside: true,
        renderDistance: 64,
        theme: 'basic',
      },
      servant: {
        type: 'none',
        taskQueue: [],
        lastPayment: Date.now(),
      },
      visitors: [],
      maxVisitors: 10,
      dungeonMonsters: [],
    }

    // Add default garden room
    this.addRoom(house, RoomType.GARDEN, { floor: 0, x: 0, z: 0 }, 0)

    // Store house
    this.houses.set(houseId, house)
    this.playerHouses.set(playerId, houseId)

    // Update player component
    constructionComponent.houseId = houseId

    // Grant XP
    this.grantConstructionXP(playerId, 100)

    // Emit event
    this.emit('construction:house-bought', {
      playerId,
      houseId,
      location,
    })

    return true
  }

  /**
   * Enter house
   */
  enterHouse(playerId: string, ownerId?: string): boolean {
    const targetOwnerId = ownerId || playerId
    const houseId = this.playerHouses.get(targetOwnerId)

    if (!houseId) {
      this.emit('construction:error', {
        playerId,
        error: 'House not found',
      })
      return false
    }

    const house = this.houses.get(houseId)
    if (!house) {
      return false
    }

    const player = this.world.entities.get(playerId) as PlayerEntity
    if (!player) {
      return false
    }

    // Check if house is locked
    if (house.settings.locked && playerId !== targetOwnerId && !house.visitors.includes(playerId)) {
      this.emit('construction:error', {
        playerId,
        error: 'This house is locked',
      })
      return false
    }

    // Check visitor limit
    if (playerId !== targetOwnerId && house.visitors.length >= house.maxVisitors) {
      this.emit('construction:error', {
        playerId,
        error: 'This house is full',
      })
      return false
    }

    // Update player component
    const constructionComponent = this.getOrCreateConstructionComponent(player)
    constructionComponent.inHouse = true
    constructionComponent.buildMode = playerId === targetOwnerId ? house.settings.buildMode : false

    // Add visitor
    if (playerId !== targetOwnerId) {
      house.visitors.push(playerId)
    }

    // Teleport to house entrance
    const entrancePosition = this.getHouseEntrance(house)
    const movement = player.getComponent('movement') as any
    if (movement) {
      movement.teleportDestination = entrancePosition
      movement.teleportTime = Date.now()
      movement.teleportAnimation = 'house_teleport'
    }

    // Emit event
    this.emit('construction:entered-house', {
      playerId,
      houseId,
      ownerId: targetOwnerId,
      buildMode: constructionComponent.buildMode,
    })

    return true
  }

  /**
   * Leave house
   */
  leaveHouse(playerId: string): boolean {
    const player = this.world.entities.get(playerId) as PlayerEntity
    if (!player) {
      return false
    }

    const constructionComponent = player.getComponent<ConstructionComponent>('construction')
    if (!constructionComponent || !constructionComponent.inHouse) {
      return false
    }

    // Find which house they're in
    let houseId: string | null = null
    let house: PlayerHouse | null = null

    for (const [id, h] of this.houses) {
      if (h.ownerId === playerId || h.visitors.includes(playerId)) {
        houseId = id
        house = h
        break
      }
    }

    if (!house) {
      return false
    }

    // Remove from visitors
    const visitorIndex = house.visitors.indexOf(playerId)
    if (visitorIndex !== -1) {
      house.visitors.splice(visitorIndex, 1)
    }

    // Update player component
    constructionComponent.inHouse = false
    constructionComponent.buildMode = false

    // Teleport outside
    const portal = this.housePortals.get(house.location)
    if (portal) {
      const movement = player.getComponent('movement') as any
      if (movement) {
        movement.teleportDestination = portal
        movement.teleportTime = Date.now()
        movement.teleportAnimation = 'house_teleport'
      }
    }

    // Emit event
    this.emit('construction:left-house', {
      playerId,
      houseId,
    })

    return true
  }

  /**
   * Toggle build mode
   */
  toggleBuildMode(playerId: string): boolean {
    const houseId = this.playerHouses.get(playerId)
    if (!houseId) {
      return false
    }

    const house = this.houses.get(houseId)
    if (!house) {
      return false
    }

    const player = this.world.entities.get(playerId) as PlayerEntity
    if (!player) {
      return false
    }

    const constructionComponent = player.getComponent<ConstructionComponent>('construction')
    if (!constructionComponent || !constructionComponent.inHouse) {
      return false
    }

    // Toggle mode
    house.settings.buildMode = !house.settings.buildMode
    constructionComponent.buildMode = house.settings.buildMode

    // Remove other players in build mode
    if (house.settings.buildMode) {
      for (const visitorId of [...house.visitors]) {
        if (visitorId !== playerId) {
          this.leaveHouse(visitorId)
          this.sendMessage(visitorId, 'The owner has entered build mode')
        }
      }
    }

    // Emit event
    this.emit('construction:build-mode-toggled', {
      playerId,
      houseId,
      buildMode: house.settings.buildMode,
    })

    return true
  }

  /**
   * Build a room
   */
  buildRoom(
    playerId: string,
    roomType: RoomType,
    position: { floor: number; x: number; z: number },
    rotation: number
  ): boolean {
    const houseId = this.playerHouses.get(playerId)
    if (!houseId) {
      return false
    }

    const house = this.houses.get(houseId)
    if (!house || !house.settings.buildMode) {
      return false
    }

    const player = this.world.entities.get(playerId) as PlayerEntity
    if (!player) {
      return false
    }

    const constructionComponent = player.getComponent<ConstructionComponent>('construction')
    if (!constructionComponent) {
      return false
    }

    // Check room requirements
    const roomRequirements = this.roomCosts.get(roomType)
    if (!roomRequirements) {
      return false
    }

    if (constructionComponent.level < roomRequirements.level) {
      this.emit('construction:error', {
        playerId,
        error: `You need level ${roomRequirements.level} Construction`,
      })
      return false
    }

    // Check gold
    const inventory = player.getComponent('inventory')
    if (!inventory || !this.hasGold(inventory, roomRequirements.cost)) {
      this.emit('construction:error', {
        playerId,
        error: `You need ${roomRequirements.cost} gold`,
      })
      return false
    }

    // Check room limit
    if (house.layout.size >= house.maxRooms) {
      this.emit('construction:error', {
        playerId,
        error: 'You have reached the maximum number of rooms',
      })
      return false
    }

    // Check floor limit
    if (position.floor >= house.maxFloors || position.floor < -house.maxFloors) {
      this.emit('construction:error', {
        playerId,
        error: 'You cannot build on this floor',
      })
      return false
    }

    // Check if position is already occupied
    const key = `${position.floor},${position.x},${position.z}`
    if (house.layout.has(key)) {
      this.emit('construction:error', {
        playerId,
        error: 'There is already a room here',
      })
      return false
    }

    // Check if room is connected to existing rooms
    if (house.layout.size > 0 && !this.isConnectedPosition(house, position)) {
      this.emit('construction:error', {
        playerId,
        error: 'Room must be connected to existing rooms',
      })
      return false
    }

    // Deduct gold
    this.removeGold(inventory, roomRequirements.cost)

    // Add room
    const room = this.addRoom(house, roomType, position, rotation)

    // Grant XP
    const xp = Math.floor(roomRequirements.cost / 10)
    this.grantConstructionXP(playerId, xp)

    // Update current build
    constructionComponent.currentBuild = {
      roomType,
      position: {
        x: position.x * this.ROOM_SIZE,
        y: position.floor * 3,
        z: position.z * this.ROOM_SIZE,
      },
      rotation,
    }

    // Emit event
    this.emit('construction:room-built', {
      playerId,
      houseId,
      roomId: room.id,
      roomType,
      position,
      rotation,
    })

    return true
  }

  /**
   * Remove a room
   */
  removeRoom(playerId: string, position: { floor: number; x: number; z: number }): boolean {
    const houseId = this.playerHouses.get(playerId)
    if (!houseId) {
      return false
    }

    const house = this.houses.get(houseId)
    if (!house || !house.settings.buildMode) {
      return false
    }

    const key = `${position.floor},${position.x},${position.z}`
    const room = house.layout.get(key)
    if (!room) {
      this.emit('construction:error', {
        playerId,
        error: 'No room at this position',
      })
      return false
    }

    // Don't allow removing the last room
    if (house.layout.size <= 1) {
      this.emit('construction:error', {
        playerId,
        error: 'You cannot remove the last room',
      })
      return false
    }

    // Check if removing this room would disconnect others
    if (this.wouldDisconnectRooms(house, position)) {
      this.emit('construction:error', {
        playerId,
        error: 'Removing this room would disconnect others',
      })
      return false
    }

    // Remove room
    house.layout.delete(key)

    // Refund some gold (50%)
    const roomRequirements = this.roomCosts.get(room.type)
    if (roomRequirements) {
      const refund = Math.floor(roomRequirements.cost / 2)
      const player = this.world.entities.get(playerId)
      if (player) {
        const inventory = player.getComponent('inventory')
        if (inventory) {
          this.addGold(inventory, refund)
        }
      }
    }

    // Emit event
    this.emit('construction:room-removed', {
      playerId,
      houseId,
      roomId: room.id,
      position,
    })

    return true
  }

  /**
   * Build furniture
   */
  buildFurniture(
    playerId: string,
    roomPosition: { floor: number; x: number; z: number },
    hotspotId: string,
    furnitureId: string
  ): boolean {
    const houseId = this.playerHouses.get(playerId)
    if (!houseId) {
      return false
    }

    const house = this.houses.get(houseId)
    if (!house || !house.settings.buildMode) {
      return false
    }

    const player = this.world.entities.get(playerId) as PlayerEntity
    if (!player) {
      return false
    }

    const constructionComponent = player.getComponent<ConstructionComponent>('construction')
    if (!constructionComponent) {
      return false
    }

    // Get room
    const key = `${roomPosition.floor},${roomPosition.x},${roomPosition.z}`
    const room = house.layout.get(key)
    if (!room) {
      return false
    }

    // Get hotspot
    const hotspot = room.hotspots.get(hotspotId)
    if (!hotspot) {
      return false
    }

    // Get furniture definition
    const furniture = this.furnitureDefinitions.get(furnitureId)
    if (!furniture) {
      return false
    }

    // Check if hotspot type matches
    if (furniture.hotspotType !== hotspot) {
      this.emit('construction:error', {
        playerId,
        error: 'This furniture cannot be built here',
      })
      return false
    }

    // Check level
    if (constructionComponent.level < furniture.level) {
      this.emit('construction:error', {
        playerId,
        error: `You need level ${furniture.level} Construction`,
      })
      return false
    }

    // Check materials
    const inventory = player.getComponent('inventory') as any
    if (!inventory) {
      return false
    }

    for (const material of furniture.materials) {
      if (inventory.getItemCount(material.itemId) < material.quantity) {
        this.emit('construction:error', {
          playerId,
          error: 'You do not have the required materials',
        })
        return false
      }
    }

    // Remove materials
    for (const material of furniture.materials) {
      inventory.removeItem(material.itemId, material.quantity)
    }

    // Build furniture
    room.furniture.set(hotspotId, furniture)

    // Grant XP
    this.grantConstructionXP(playerId, furniture.experience)

    // Emit event
    this.emit('construction:furniture-built', {
      playerId,
      houseId,
      roomId: room.id,
      hotspotId,
      furnitureId: furniture.id,
    })

    return true
  }

  /**
   * Remove furniture
   */
  removeFurniture(playerId: string, roomPosition: { floor: number; x: number; z: number }, hotspotId: string): boolean {
    const houseId = this.playerHouses.get(playerId)
    if (!houseId) {
      return false
    }

    const house = this.houses.get(houseId)
    if (!house || !house.settings.buildMode) {
      return false
    }

    // Get room
    const key = `${roomPosition.floor},${roomPosition.x},${roomPosition.z}`
    const room = house.layout.get(key)
    if (!room) {
      return false
    }

    // Check if furniture exists at this hotspot
    const furniture = room.furniture.get(hotspotId)
    if (!furniture) {
      return false
    }

    // Remove furniture
    const furnitureId = furniture.id
    room.furniture.delete(hotspotId)

    // Emit event
    this.emit('construction:furniture-removed', {
      playerId,
      houseId,
      roomId: room.id,
      hotspotId,
      furnitureId,
    })

    return true
  }

  /**
   * Interact with furniture
   */
  interactWithFurniture(
    playerId: string,
    roomPosition: { floor: number; x: number; z: number },
    hotspotId: string
  ): void {
    const player = this.world.entities.get(playerId) as PlayerEntity
    if (!player) {
      return
    }

    const constructionComponent = player.getComponent<ConstructionComponent>('construction')
    if (!constructionComponent || !constructionComponent.inHouse) {
      return
    }

    // Find the house they're in
    let house: PlayerHouse | null = null
    for (const h of this.houses.values()) {
      if (h.ownerId === playerId || h.visitors.includes(playerId)) {
        house = h
        break
      }
    }

    if (!house) {
      return
    }

    // Get room
    const key = `${roomPosition.floor},${roomPosition.x},${roomPosition.z}`
    const room = house.layout.get(key)
    if (!room) {
      return
    }

    // Get furniture
    const furniture = room.furniture.get(hotspotId)
    if (!furniture || !furniture.interactable) {
      return
    }

    // Handle furniture effects
    if (furniture.effects) {
      for (const effect of furniture.effects) {
        this.applyFurnitureEffect(player, effect, house)
      }
    }

    // Emit event
    this.emit('construction:furniture-interacted', {
      playerId,
      houseId: house.id,
      furnitureId: furniture.id,
      effects: furniture.effects,
    })
  }

  /**
   * Hire servant
   */
  hireServant(playerId: string, servantType: string): boolean {
    const houseId = this.playerHouses.get(playerId)
    if (!houseId) {
      return false
    }

    const house = this.houses.get(houseId)
    if (!house) {
      return false
    }

    const player = this.world.entities.get(playerId) as PlayerEntity
    if (!player) {
      return false
    }

    // Check if valid servant type
    const wage = this.SERVANT_WAGES.get(servantType)
    if (wage === undefined) {
      this.emit('construction:error', {
        playerId,
        error: 'Invalid servant type',
      })
      return false
    }

    // Check if already has a servant
    if (house.servant.type !== 'none') {
      this.emit('construction:error', {
        playerId,
        error: 'You already have a servant',
      })
      return false
    }

    // Check gold for first payment
    const inventory = player.getComponent('inventory')
    if (!inventory || !this.hasGold(inventory, wage)) {
      this.emit('construction:error', {
        playerId,
        error: `You need ${wage} gold for the first payment`,
      })
      return false
    }

    // Pay first wage
    this.removeGold(inventory, wage)

    // Hire servant
    house.servant = {
      type: servantType as any,
      taskQueue: [],
      lastPayment: Date.now(),
    }

    // Emit event
    this.emit('construction:servant-hired', {
      playerId,
      houseId,
      servantType,
      wage,
    })

    return true
  }

  /**
   * Dismiss servant
   */
  dismissServant(playerId: string): boolean {
    const houseId = this.playerHouses.get(playerId)
    if (!houseId) {
      return false
    }

    const house = this.houses.get(houseId)
    if (!house || house.servant.type === 'none') {
      return false
    }

    const servantType = house.servant.type

    // Clear servant
    house.servant = {
      type: 'none',
      taskQueue: [],
      lastPayment: Date.now(),
    }

    // Emit event
    this.emit('construction:servant-dismissed', {
      playerId,
      houseId,
      servantType,
    })

    return true
  }

  /**
   * Give servant task
   */
  giveServantTask(playerId: string, task: ServantTask): boolean {
    const houseId = this.playerHouses.get(playerId)
    if (!houseId) {
      return false
    }

    const house = this.houses.get(houseId)
    if (!house || house.servant.type === 'none') {
      return false
    }

    // Check task limit based on servant type
    const taskLimits: Map<string, number> = new Map([
      ['rick', 1],
      ['maid', 2],
      ['cook', 3],
      ['butler', 4],
      ['demon_butler', 5],
    ])

    const limit = taskLimits.get(house.servant.type) || 1
    if (house.servant.taskQueue.length >= limit) {
      this.emit('construction:error', {
        playerId,
        error: 'Your servant is too busy',
      })
      return false
    }

    // Calculate completion time based on servant
    const baseTimes: Map<string, number> = new Map([
      ['rick', 60000], // 1 minute
      ['maid', 45000], // 45 seconds
      ['cook', 30000], // 30 seconds
      ['butler', 20000], // 20 seconds
      ['demon_butler', 10000], // 10 seconds
    ])

    const baseTime = baseTimes.get(house.servant.type) || 60000
    task.completionTime = Date.now() + baseTime

    // Add task
    house.servant.taskQueue.push(task)

    // Emit event
    this.emit('construction:servant-task-given', {
      playerId,
      houseId,
      taskType: task.type,
      completionTime: task.completionTime,
    })

    return true
  }

  /**
   * Update house settings
   */
  updateHouseSettings(playerId: string, settings: Partial<HouseSettings>): boolean {
    const houseId = this.playerHouses.get(playerId)
    if (!houseId) {
      return false
    }

    const house = this.houses.get(houseId)
    if (!house) {
      return false
    }

    // Update settings
    Object.assign(house.settings, settings)

    // Emit event
    this.emit('construction:settings-updated', {
      playerId,
      houseId,
      settings,
    })

    return true
  }

  /**
   * Move house
   */
  moveHouse(playerId: string, newLocation: string): boolean {
    const houseId = this.playerHouses.get(playerId)
    if (!houseId) {
      return false
    }

    const house = this.houses.get(houseId)
    if (!house) {
      return false
    }

    // Check if valid location
    if (!this.housePortals.has(newLocation)) {
      this.emit('construction:error', {
        playerId,
        error: 'Invalid house location',
      })
      return false
    }

    const player = this.world.entities.get(playerId) as PlayerEntity
    if (!player) {
      return false
    }

    // Check cost (25k)
    const moveCost = 25000
    const inventory = player.getComponent('inventory')
    if (!inventory || !this.hasGold(inventory, moveCost)) {
      this.emit('construction:error', {
        playerId,
        error: `You need ${moveCost} gold to move your house`,
      })
      return false
    }

    // Remove all visitors first
    for (const visitorId of [...house.visitors]) {
      this.leaveHouse(visitorId)
    }

    // Deduct gold
    this.removeGold(inventory, moveCost)

    // Move house
    const oldLocation = house.location
    house.location = newLocation as any

    // Emit event
    this.emit('construction:house-moved', {
      playerId,
      houseId,
      oldLocation,
      newLocation,
    })

    return true
  }

  /**
   * Get player's house
   */
  getPlayerHouse(playerId: string): PlayerHouse | null {
    const houseId = this.playerHouses.get(playerId)
    if (!houseId) {
      return null
    }
    return this.houses.get(houseId) || null
  }

  /**
   * Get construction level
   */
  getConstructionLevel(playerId: string): number {
    const player = this.world.entities.get(playerId)
    if (!player) {
      return 0
    }

    const component = player.getComponent<ConstructionComponent>('construction')
    return component?.level || 0
  }

  /**
   * Helper methods
   */
  private addRoom(
    house: PlayerHouse,
    type: RoomType,
    position: { floor: number; x: number; z: number },
    rotation: number
  ): ConstructionRoom {
    const roomId = this.generateRoomId()
    const room: ConstructionRoom = {
      id: roomId,
      type,
      rotation,
      level: position.floor,
      furniture: new Map(),
      doors: new Map([
        ['north', true],
        ['east', true],
        ['south', true],
        ['west', true],
      ]),
      hotspots: this.generateHotspots(type),
    }

    const key = `${position.floor},${position.x},${position.z}`
    house.layout.set(key, room)

    return room
  }

  private generateHotspots(roomType: RoomType): Map<string, HotspotType> {
    const hotspots = new Map<string, HotspotType>()

    // Generate hotspots based on room type
    switch (roomType) {
      case RoomType.PARLOUR:
        hotspots.set('chair1', HotspotType.SEATING)
        hotspots.set('chair2', HotspotType.SEATING)
        hotspots.set('chair3', HotspotType.SEATING)
        hotspots.set('bookcase', HotspotType.STORAGE)
        hotspots.set('fireplace', HotspotType.LIGHTING)
        break
      case RoomType.KITCHEN:
        hotspots.set('stove', HotspotType.SKILL)
        hotspots.set('table', HotspotType.TABLE)
        hotspots.set('shelf', HotspotType.STORAGE)
        hotspots.set('larder', HotspotType.STORAGE)
        break
      case RoomType.CHAPEL:
        hotspots.set('altar', HotspotType.ALTAR)
        hotspots.set('icon', HotspotType.DECORATION)
        hotspots.set('lamp1', HotspotType.LIGHTING)
        hotspots.set('lamp2', HotspotType.LIGHTING)
        break
      case RoomType.PORTAL_CHAMBER:
        hotspots.set('portal1', HotspotType.PORTAL)
        hotspots.set('portal2', HotspotType.PORTAL)
        hotspots.set('portal3', HotspotType.PORTAL)
        hotspots.set('centerpiece', HotspotType.GLORY)
        break
      // Add more room types...
    }

    return hotspots
  }

  private isConnectedPosition(house: PlayerHouse, position: { floor: number; x: number; z: number }): boolean {
    // Check adjacent positions
    const adjacent = [
      { floor: position.floor, x: position.x + 1, z: position.z },
      { floor: position.floor, x: position.x - 1, z: position.z },
      { floor: position.floor, x: position.x, z: position.z + 1 },
      { floor: position.floor, x: position.x, z: position.z - 1 },
    ]

    // Check if stairs connect to floors above/below
    if (position.floor !== 0) {
      adjacent.push(
        { floor: position.floor - 1, x: position.x, z: position.z },
        { floor: position.floor + 1, x: position.x, z: position.z }
      )
    }

    for (const adj of adjacent) {
      const key = `${adj.floor},${adj.x},${adj.z}`
      if (house.layout.has(key)) {
        return true
      }
    }

    return false
  }

  private wouldDisconnectRooms(_house: PlayerHouse, _position: { floor: number; x: number; z: number }): boolean {
    // Simple check: if removing this room would leave any room with no connections
    // In a real implementation, this would use graph connectivity algorithms
    return false
  }

  private getHouseEntrance(house: PlayerHouse): Vector3 {
    // Find the garden room (usually at 0,0,0)
    const gardenKey = '0,0,0'
    const hasGarden = house.layout.has(gardenKey)

    return {
      x: this.HOUSE_INSTANCE_OFFSET + (hasGarden ? 4 : 0),
      y: 0,
      z: this.HOUSE_INSTANCE_OFFSET + (hasGarden ? 4 : 0),
    }
  }

  private applyFurnitureEffect(player: PlayerEntity, effect: FurnitureEffect, _house: PlayerHouse): void {
    switch (effect.type) {
      case 'teleport':
        const movement = player.getComponent('movement') as any
        if (movement && effect.data.position) {
          movement.teleportDestination = effect.data.position
          movement.teleportTime = Date.now()
          movement.teleportAnimation = 'teleport'
        }
        break

      case 'altar':
        const stats = player.getComponent('stats') as any
        if (stats && stats.prayer) {
          const bonus = effect.data.prayerBonus || 100
          const restored = Math.floor(stats.prayer.maxPoints * (bonus / 100))
          stats.prayer.points = Math.min(stats.prayer.maxPoints + 20, stats.prayer.points + restored)
        }
        break

      case 'restore':
        const restoreStats = player.getComponent('stats') as any
        if (restoreStats && restoreStats.prayer) {
          const bonus = effect.data.bonus || 100
          const restored = Math.floor(restoreStats.prayer.maxPoints * (bonus / 100))
          restoreStats.prayer.points = Math.min(
            restoreStats.prayer.maxPoints + 20,
            restoreStats.prayer.points + restored
          )
        }
        break

      case 'bank':
        // Open bank interface
        this.emit('bank:open', { playerId: player.id })
        break
    }
  }

  private grantConstructionXP(playerId: string, xp: number): void {
    const player = this.world.entities.get(playerId)
    if (!player) {
      return
    }

    const component = this.getOrCreateConstructionComponent(player as PlayerEntity)
    component.experience += xp

    // Check for level up
    const newLevel = this.getLevelForXP(component.experience)
    if (newLevel > component.level) {
      component.level = newLevel

      this.emit('skill:levelup', {
        playerId,
        skill: 'construction',
        newLevel,
      })

      // Unlock benefits
      if (newLevel === 30) {
        const houseId = this.playerHouses.get(playerId)
        if (houseId) {
          const house = this.houses.get(houseId)
          if (house) {
            house.maxFloors = 2 // Unlock upper floor
          }
        }
      } else if (newLevel === 50) {
        const houseId = this.playerHouses.get(playerId)
        if (houseId) {
          const house = this.houses.get(houseId)
          if (house) {
            house.maxFloors = 3 // Unlock basement
          }
        }
      }
    }

    this.emit('skill:xp-gained', {
      playerId,
      skill: 'construction',
      xp,
      totalXp: component.experience,
    })
  }

  private getLevelForXP(xp: number): number {
    // RuneScape XP formula
    let level = 1
    let totalXP = 0

    for (let l = 1; l <= 99; l++) {
      const xpRequired = Math.floor(l + 300 * Math.pow(2, l / 7)) / 4
      totalXP += xpRequired
      if (xp >= totalXP) {
        level = l + 1
      } else {
        break
      }
    }

    return Math.min(level, 99)
  }

  private getOrCreateConstructionComponent(player: PlayerEntity): ConstructionComponent {
    let component = player.getComponent<ConstructionComponent>('construction')
    if (!component) {
      component = {
        type: 'construction',
        entity: player,
        data: {},
        level: 1,
        experience: 0,
        houseId: null,
        inHouse: false,
        buildMode: false,
        flatpacks: new Map(),
        currentBuild: null,
      }
      player.addComponent('construction', component)
    }
    return component
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

  private addGold(inventory: any, amount: number): void {
    inventory.addItem({ id: 995, quantity: amount })
  }

  private generateHouseId(): string {
    return `house_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Update loop
   */
  update(_delta: number): void {
    const now = Date.now()

    // Process servant tasks
    for (const house of this.houses.values()) {
      if (house.servant.type !== 'none' && house.servant.taskQueue.length > 0) {
        const task = house.servant.taskQueue[0]
        if (now >= task.completionTime) {
          // Complete task
          house.servant.taskQueue.shift()

          this.emit('construction:servant-task-completed', {
            houseId: house.id,
            ownerId: house.ownerId,
            taskType: task.type,
            items: task.items,
          })
        }
      }

      // Check servant wages (every 30 minutes)
      if (house.servant.type !== 'none') {
        const wageInterval = 30 * 60 * 1000 // 30 minutes
        if (now - house.servant.lastPayment >= wageInterval) {
          const wage = this.SERVANT_WAGES.get(house.servant.type) || 0

          // Try to pay from owner's inventory
          const owner = this.world.entities.get(house.ownerId)
          if (owner) {
            const inventory = owner.getComponent('inventory')
            if (inventory && this.hasGold(inventory, wage)) {
              this.removeGold(inventory, wage)
              house.servant.lastPayment = now
            } else {
              // Dismiss servant if can't pay
              this.dismissServant(house.ownerId)
              this.sendMessage(house.ownerId, 'Your servant has left due to lack of payment')
            }
          }
        }
      }
    }
  }
}
