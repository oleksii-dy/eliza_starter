import { System } from '../../core/systems/System'
import type { World } from '../../types'
import { PlayerEntity, Vector3, InventoryComponent } from '../types'

interface GridPlot {
  id: string
  gridX: number
  gridZ: number
  worldPosition: Vector3
  size: number
  ownerId: string | null
  ownerName: string | null
  purchasePrice: number
  purchaseDate: number | null
  lastVisited: number | null
  isForSale: boolean
  salePrice: number
  buildPermissions: string[] // Player IDs with build permissions
  visitPermissions: 'public' | 'friends' | 'private'
  structures: PlotStructure[]
  customName?: string
  description?: string
}

interface PlotStructure {
  id: string
  type: string
  position: Vector3
  rotation: Vector3
  scale: Vector3
  model: string
  placedBy: string
  placedAt: number
  metadata?: any
}

interface PlotMarket {
  plotId: string
  sellerId: string
  price: number
  listedAt: number
}

interface PlotConfig {
  gridSize: number // Size of each plot in world units
  basePrice: number // Base price for unclaimed plots
  priceMultiplier: number // Price multiplier based on location
  maxPlotsPerPlayer: number
  taxRate: number // Daily tax rate percentage
  abandonmentPeriod: number // Days before plot is reclaimed
  buildHeight: number // Max build height
}

export class PlayerHomesSystem extends System {
  private plots: Map<string, GridPlot> = new Map()
  private playerPlots: Map<string, Set<string>> = new Map() // playerId -> plot IDs
  private plotMarket: Map<string, PlotMarket> = new Map()
  private plotGrid: Map<string, string> = new Map() // "x,z" -> plotId

  private config: PlotConfig = {
    gridSize: 64, // 64x64 world units per plot
    basePrice: 1000000, // 1M gold base price
    priceMultiplier: 1.0,
    maxPlotsPerPlayer: 5,
    taxRate: 0.1, // 0.1% daily
    abandonmentPeriod: 30, // 30 days
    buildHeight: 128,
  }

  // Special zones where plots can't be purchased
  private restrictedZones: Set<string> = new Set(['spawn', 'wilderness', 'dungeon', 'quest_area'])

  constructor(world: World) {
    super(world)
  }

  /**
   * Initialize the system
   */
  override async init(_options: any): Promise<void> {
    console.log('[PlayerHomesSystem] Initializing...')

    // Listen for plot interactions
    this.world.events.on('plot:interact', this.handlePlotInteraction.bind(this))
    this.world.events.on('plot:purchase', this.handlePlotPurchase.bind(this))
    this.world.events.on('plot:sell', this.handlePlotSell.bind(this))
    this.world.events.on('plot:build', this.handlePlotBuild.bind(this))
    this.world.events.on('plot:demolish', this.handlePlotDemolish.bind(this))
    this.world.events.on('plot:permissions', this.handlePlotPermissions.bind(this))

    // Listen for player movement to track plot entry/exit
    this.world.events.on('player:move', this.handlePlayerMove.bind(this))

    // Load saved plots from storage
    await this.loadPlots()

    // Start tax/maintenance timer
    setInterval(() => this.processDailyMaintenance(), 24 * 60 * 60 * 1000) // Daily
  }

  /**
   * Get plot at world position
   */
  public getPlotAtPosition(position: Vector3): GridPlot | null {
    const gridPos = this.worldToGrid(position)
    const plotId = this.plotGrid.get(`${gridPos.x},${gridPos.z}`)

    if (!plotId) {
      // Create unclaimed plot info
      return this.createUnclaimedPlot(gridPos.x, gridPos.z)
    }

    return this.plots.get(plotId) || null
  }

  /**
   * Convert world position to grid coordinates
   */
  private worldToGrid(position: Vector3): { x: number; z: number } {
    return {
      x: Math.floor(position.x / this.config.gridSize),
      z: Math.floor(position.z / this.config.gridSize),
    }
  }

  /**
   * Convert grid coordinates to world position (center of plot)
   */
  private gridToWorld(gridX: number, gridZ: number): Vector3 {
    return {
      x: (gridX + 0.5) * this.config.gridSize,
      y: 0,
      z: (gridZ + 0.5) * this.config.gridSize,
    }
  }

  /**
   * Create unclaimed plot info
   */
  private createUnclaimedPlot(gridX: number, gridZ: number): GridPlot {
    const plotId = `plot_${gridX}_${gridZ}`
    const worldPos = this.gridToWorld(gridX, gridZ)

    // Calculate price based on distance from spawn
    const distanceFromSpawn = Math.sqrt(worldPos.x * worldPos.x + worldPos.z * worldPos.z)
    const priceMultiplier = Math.max(0.5, 2.0 - distanceFromSpawn / 10000)

    return {
      id: plotId,
      gridX,
      gridZ,
      worldPosition: worldPos,
      size: this.config.gridSize,
      ownerId: null,
      ownerName: null,
      purchasePrice: Math.floor(this.config.basePrice * priceMultiplier),
      purchaseDate: null,
      lastVisited: null,
      isForSale: true,
      salePrice: 0,
      buildPermissions: [],
      visitPermissions: 'public',
      structures: [],
    }
  }

  /**
   * Handle plot interaction
   */
  private handlePlotInteraction(event: { playerId: string; position: Vector3 }): void {
    const plot = this.getPlotAtPosition(event.position)
    if (!plot) return

    // Show plot info
    this.world.events.emit('plot:info', {
      playerId: event.playerId,
      plot: {
        id: plot.id,
        owner: plot.ownerName || 'Unclaimed',
        position: `${plot.gridX}, ${plot.gridZ}`,
        size: `${plot.size}x${plot.size}`,
        price: plot.ownerId ? plot.salePrice : plot.purchasePrice,
        forSale: plot.isForSale,
        structures: plot.structures.length,
        customName: plot.customName,
        description: plot.description,
      },
    })
  }

  /**
   * Handle plot purchase
   */
  private async handlePlotPurchase(event: { playerId: string; plotId: string; offer?: number }): Promise<void> {
    const player = this.world.entities.get(event.playerId) as PlayerEntity
    if (!player) return

    const plot = this.plots.get(event.plotId) || this.getUnclaimedPlot(event.plotId)
    if (!plot) {
      this.sendMessage(event.playerId, 'Invalid plot.')
      return
    }

    // Check if plot is for sale
    if (!plot.isForSale) {
      this.sendMessage(event.playerId, 'This plot is not for sale.')
      return
    }

    // Check if player owns too many plots
    const playerPlotCount = this.playerPlots.get(event.playerId)?.size || 0
    if (playerPlotCount >= this.config.maxPlotsPerPlayer) {
      this.sendMessage(event.playerId, `You can only own up to ${this.config.maxPlotsPerPlayer} plots.`)
      return
    }

    // Check if in restricted zone
    if (this.isInRestrictedZone(plot.worldPosition)) {
      this.sendMessage(event.playerId, 'This area cannot be purchased.')
      return
    }

    // Determine price
    const price = plot.ownerId ? plot.salePrice : plot.purchasePrice

    // Check if player has enough gold
    const inventory = player.getComponent<InventoryComponent>('inventory')
    if (!inventory) return

    const playerGold = this.getPlayerGold(inventory)
    if (playerGold < price) {
      this.sendMessage(event.playerId, `You need ${price} coins to purchase this plot.`)
      return
    }

    // Process purchase
    if (!this.removePlayerGold(player, price)) {
      this.sendMessage(event.playerId, 'Failed to process payment.')
      return
    }

    // Transfer ownership
    const previousOwner = plot.ownerId
    if (previousOwner) {
      // Pay previous owner
      const seller = this.world.entities.get(previousOwner) as PlayerEntity
      if (seller) {
        this.addPlayerGold(seller, Math.floor(price * 0.95)) // 5% tax
      }

      // Remove from previous owner's plots
      const ownerPlots = this.playerPlots.get(previousOwner)
      if (ownerPlots) {
        ownerPlots.delete(event.plotId)
      }

      // Remove from market
      this.plotMarket.delete(event.plotId)
    }

    // Set new owner
    plot.ownerId = event.playerId
    plot.ownerName = player.displayName || player.username
    plot.purchaseDate = Date.now()
    plot.purchasePrice = price
    plot.isForSale = false
    plot.salePrice = 0
    plot.lastVisited = Date.now()

    // Add to player's plots
    if (!this.playerPlots.has(event.playerId)) {
      this.playerPlots.set(event.playerId, new Set())
    }
    this.playerPlots.get(event.playerId)!.add(event.plotId)

    // Save plot
    this.plots.set(event.plotId, plot)
    this.plotGrid.set(`${plot.gridX},${plot.gridZ}`, event.plotId)

    // Save to storage
    await this.savePlot(plot)

    // Emit event
    this.world.events.emit('plot:purchased', {
      playerId: event.playerId,
      plotId: event.plotId,
      price,
      previousOwner,
    })

    this.sendMessage(event.playerId, `You have purchased plot ${plot.gridX},${plot.gridZ} for ${price} coins!`)
    if (previousOwner) {
      this.sendMessage(previousOwner, `Your plot ${plot.gridX},${plot.gridZ} has been sold for ${price} coins!`)
    }
  }

  /**
   * Handle plot sell listing
   */
  private async handlePlotSell(event: { playerId: string; plotId: string; price: number }): Promise<void> {
    const plot = this.plots.get(event.plotId)
    if (!plot) {
      this.sendMessage(event.playerId, 'Invalid plot.')
      return
    }

    // Check ownership
    if (plot.ownerId !== event.playerId) {
      this.sendMessage(event.playerId, "You don't own this plot.")
      return
    }

    // Validate price
    if (event.price < 0 || event.price > 2147483647) {
      // Max int32
      this.sendMessage(event.playerId, 'Invalid price.')
      return
    }

    // List for sale
    plot.isForSale = true
    plot.salePrice = event.price

    // Add to market
    this.plotMarket.set(event.plotId, {
      plotId: event.plotId,
      sellerId: event.playerId,
      price: event.price,
      listedAt: Date.now(),
    })

    // Save
    await this.savePlot(plot)

    this.sendMessage(event.playerId, `Plot ${plot.gridX},${plot.gridZ} listed for sale at ${event.price} coins.`)
  }

  /**
   * Handle building on plot
   */
  private async handlePlotBuild(event: {
    playerId: string
    plotId: string
    structure: {
      type: string
      position: Vector3
      rotation: Vector3
      scale: Vector3
      model: string
      metadata?: any
    }
  }): Promise<void> {
    const plot = this.plots.get(event.plotId)
    if (!plot) {
      this.sendMessage(event.playerId, 'Invalid plot.')
      return
    }

    // Check permissions
    if (!this.canBuildOnPlot(event.playerId, plot)) {
      this.sendMessage(event.playerId, "You don't have permission to build here.")
      return
    }

    // Check if structure is within plot bounds
    if (!this.isWithinPlotBounds(event.structure.position, plot)) {
      this.sendMessage(event.playerId, 'Structure must be within plot boundaries.')
      return
    }

    // Check build height
    if (event.structure.position.y > this.config.buildHeight) {
      this.sendMessage(event.playerId, `Maximum build height is ${this.config.buildHeight}.`)
      return
    }

    // Create structure
    const structure: PlotStructure = {
      id: `structure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: event.structure.type,
      position: event.structure.position,
      rotation: event.structure.rotation,
      scale: event.structure.scale,
      model: event.structure.model,
      placedBy: event.playerId,
      placedAt: Date.now(),
      metadata: event.structure.metadata,
    }

    // Add to plot
    plot.structures.push(structure)

    // Save
    await this.savePlot(plot)

    // Spawn in world
    this.spawnStructure(plot, structure)

    this.sendMessage(event.playerId, 'Structure placed successfully.')
  }

  /**
   * Handle structure demolition
   */
  private async handlePlotDemolish(event: { playerId: string; plotId: string; structureId: string }): Promise<void> {
    const plot = this.plots.get(event.plotId)
    if (!plot) {
      this.sendMessage(event.playerId, 'Invalid plot.')
      return
    }

    // Check permissions
    if (!this.canBuildOnPlot(event.playerId, plot)) {
      this.sendMessage(event.playerId, "You don't have permission to demolish here.")
      return
    }

    // Find structure
    const structureIndex = plot.structures.findIndex(s => s.id === event.structureId)
    if (structureIndex === -1) {
      this.sendMessage(event.playerId, 'Structure not found.')
      return
    }

    // Remove structure
    const [structure] = plot.structures.splice(structureIndex, 1)

    // Save
    await this.savePlot(plot)

    // Remove from world
    this.despawnStructure(structure.id)

    this.sendMessage(event.playerId, 'Structure demolished.')
  }

  /**
   * Handle plot permissions
   */
  private async handlePlotPermissions(event: {
    playerId: string
    plotId: string
    action: 'add' | 'remove' | 'visibility'
    targetId?: string
    visibility?: 'public' | 'friends' | 'private'
  }): Promise<void> {
    const plot = this.plots.get(event.plotId)
    if (!plot) {
      this.sendMessage(event.playerId, 'Invalid plot.')
      return
    }

    // Check ownership
    if (plot.ownerId !== event.playerId) {
      this.sendMessage(event.playerId, "You don't own this plot.")
      return
    }

    switch (event.action) {
      case 'add':
        if (event.targetId && !plot.buildPermissions.includes(event.targetId)) {
          plot.buildPermissions.push(event.targetId)
          this.sendMessage(event.playerId, 'Build permission granted.')
        }
        break

      case 'remove':
        if (event.targetId) {
          const index = plot.buildPermissions.indexOf(event.targetId)
          if (index > -1) {
            plot.buildPermissions.splice(index, 1)
            this.sendMessage(event.playerId, 'Build permission revoked.')
          }
        }
        break

      case 'visibility':
        if (event.visibility) {
          plot.visitPermissions = event.visibility
          this.sendMessage(event.playerId, `Plot visibility set to ${event.visibility}.`)
        }
        break
    }

    // Save
    await this.savePlot(plot)
  }

  /**
   * Handle player movement
   */
  private handlePlayerMove(event: { playerId: string; from: Vector3; to: Vector3 }): void {
    const fromPlot = this.getPlotAtPosition(event.from)
    const toPlot = this.getPlotAtPosition(event.to)

    // Check if player changed plots
    if (fromPlot?.id !== toPlot?.id) {
      if (fromPlot?.ownerId) {
        this.world.events.emit('plot:exit', {
          playerId: event.playerId,
          plotId: fromPlot.id,
        })
      }

      if (toPlot?.ownerId) {
        // Update last visited
        if (toPlot.ownerId === event.playerId) {
          toPlot.lastVisited = Date.now()
        }

        // Check visit permissions
        if (!this.canVisitPlot(event.playerId, toPlot)) {
          // Teleport back
          this.world.events.emit('player:teleport', {
            playerId: event.playerId,
            position: event.from,
            reason: 'plot_restricted',
          })

          this.sendMessage(event.playerId, "You don't have permission to enter this plot.")
          return
        }

        this.world.events.emit('plot:enter', {
          playerId: event.playerId,
          plotId: toPlot.id,
          ownerName: toPlot.ownerName,
          customName: toPlot.customName,
        })
      }
    }
  }

  /**
   * Check if player can build on plot
   */
  private canBuildOnPlot(playerId: string, plot: GridPlot): boolean {
    return plot.ownerId === playerId || plot.buildPermissions.includes(playerId)
  }

  /**
   * Check if player can visit plot
   */
  private canVisitPlot(playerId: string, plot: GridPlot): boolean {
    if (plot.ownerId === playerId) return true

    switch (plot.visitPermissions) {
      case 'public':
        return true
      case 'friends':
        // TODO: Check if player is friend
        return plot.buildPermissions.includes(playerId)
      case 'private':
        return plot.buildPermissions.includes(playerId)
      default:
        return false
    }
  }

  /**
   * Check if position is within plot bounds
   */
  private isWithinPlotBounds(position: Vector3, plot: GridPlot): boolean {
    const minX = plot.gridX * this.config.gridSize
    const maxX = (plot.gridX + 1) * this.config.gridSize
    const minZ = plot.gridZ * this.config.gridSize
    const maxZ = (plot.gridZ + 1) * this.config.gridSize

    return position.x >= minX && position.x < maxX && position.z >= minZ && position.z < maxZ
  }

  /**
   * Check if position is in restricted zone
   */
  private isInRestrictedZone(position: Vector3): boolean {
    // TODO: Check against actual restricted zones
    const distanceFromSpawn = Math.sqrt(position.x * position.x + position.z * position.z)
    return distanceFromSpawn < 100 // 100 units around spawn
  }

  /**
   * Get unclaimed plot by ID
   */
  private getUnclaimedPlot(plotId: string): GridPlot | null {
    const match = plotId.match(/plot_(-?\d+)_(-?\d+)/)
    if (!match) return null

    const gridX = parseInt(match[1])
    const gridZ = parseInt(match[2])

    return this.createUnclaimedPlot(gridX, gridZ)
  }

  /**
   * Process daily maintenance
   */
  private async processDailyMaintenance(): Promise<void> {
    const now = Date.now()
    const thirtyDaysAgo = now - this.config.abandonmentPeriod * 24 * 60 * 60 * 1000

    for (const plot of this.plots.values()) {
      if (!plot.ownerId) continue

      // Check for abandonment
      if (plot.lastVisited && plot.lastVisited < thirtyDaysAgo) {
        // Reclaim abandoned plot
        await this.reclaimPlot(plot)
        continue
      }

      // Process tax
      if (this.config.taxRate > 0) {
        const taxAmount = Math.floor((plot.purchasePrice * this.config.taxRate) / 100)
        const owner = this.world.entities.get(plot.ownerId) as PlayerEntity

        if (owner) {
          // Try to deduct tax
          if (!this.removePlayerGold(owner, taxAmount)) {
            // Can't pay tax, give warning
            this.sendMessage(
              plot.ownerId,
              `Warning: Unable to pay ${taxAmount} coins tax for plot ${plot.gridX},${plot.gridZ}.`
            )
            this.sendMessage(plot.ownerId, 'Your plot may be reclaimed if taxes remain unpaid.')
          }
        }
      }
    }
  }

  /**
   * Reclaim abandoned plot
   */
  private async reclaimPlot(plot: GridPlot): Promise<void> {
    const ownerId = plot.ownerId
    if (!ownerId) return

    // Remove structures
    for (const structure of plot.structures) {
      this.despawnStructure(structure.id)
    }

    // Remove from owner's plots
    const ownerPlots = this.playerPlots.get(ownerId)
    if (ownerPlots) {
      ownerPlots.delete(plot.id)
    }

    // Reset plot
    plot.ownerId = null
    plot.ownerName = null
    plot.purchaseDate = null
    plot.lastVisited = null
    plot.isForSale = true
    plot.salePrice = 0
    plot.buildPermissions = []
    plot.visitPermissions = 'public'
    plot.structures = []
    plot.customName = undefined
    plot.description = undefined

    // Save
    await this.savePlot(plot)

    // Notify owner if online
    this.sendMessage(ownerId, `Your plot ${plot.gridX},${plot.gridZ} has been reclaimed due to abandonment.`)
  }

  /**
   * Spawn structure in world
   */
  private spawnStructure(plot: GridPlot, structure: PlotStructure): void {
    this.world.events.emit('structure:spawn', {
      id: structure.id,
      type: structure.type,
      position: structure.position,
      rotation: structure.rotation,
      scale: structure.scale,
      model: structure.model,
      plotId: plot.id,
      metadata: structure.metadata,
    })
  }

  /**
   * Despawn structure from world
   */
  private despawnStructure(structureId: string): void {
    this.world.events.emit('structure:despawn', {
      id: structureId,
    })
  }

  /**
   * Get player gold
   */
  private getPlayerGold(inventory: InventoryComponent): number {
    let total = 0
    for (const item of inventory.items) {
      if (item && item.itemId === 995) {
        // Coins
        total += item.quantity
      }
    }
    return total
  }

  /**
   * Remove gold from player
   */
  private removePlayerGold(player: PlayerEntity, amount: number): boolean {
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem')
    if (!inventorySystem) return false

    return (inventorySystem as any).removeItem(player.id, 995, amount)
  }

  /**
   * Add gold to player
   */
  private addPlayerGold(player: PlayerEntity, amount: number): boolean {
    const inventorySystem = this.world.systems.find(s => s.constructor.name === 'InventorySystem')
    if (!inventorySystem) return false

    return (inventorySystem as any).addItem(player.id, 995, amount)
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
   * Load plots from storage
   */
  private async loadPlots(): Promise<void> {
    // TODO: Load from persistent storage
    console.log('[PlayerHomesSystem] Loading plots from storage...')
  }

  /**
   * Save plot to storage
   */
  private async savePlot(plot: GridPlot): Promise<void> {
    // TODO: Save to persistent storage
  }

  /**
   * Get player's plots
   */
  public getPlayerPlots(playerId: string): GridPlot[] {
    const plotIds = this.playerPlots.get(playerId)
    if (!plotIds) return []

    const plots: GridPlot[] = []
    for (const plotId of plotIds) {
      const plot = this.plots.get(plotId)
      if (plot) plots.push(plot)
    }

    return plots
  }

  /**
   * Get plots for sale
   */
  public getPlotsForSale(): GridPlot[] {
    const plots: GridPlot[] = []
    for (const plot of this.plots.values()) {
      if (plot.isForSale) {
        plots.push(plot)
      }
    }
    return plots
  }

  /**
   * Get plot market listings
   */
  public getMarketListings(): PlotMarket[] {
    return Array.from(this.plotMarket.values())
  }

  /**
   * Teleport player to plot
   */
  public teleportToPlot(playerId: string, plotId: string): boolean {
    const plot = this.plots.get(plotId) || this.getUnclaimedPlot(plotId)
    if (!plot) return false

    // Check permissions
    if (plot.ownerId && !this.canVisitPlot(playerId, plot)) {
      this.sendMessage(playerId, "You don't have permission to teleport to this plot.")
      return false
    }

    // Teleport to center of plot
    this.world.events.emit('player:teleport', {
      playerId,
      position: plot.worldPosition,
      reason: 'plot_teleport',
    })

    return true
  }
}
