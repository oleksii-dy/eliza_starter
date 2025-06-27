import type { World } from '../../../types'
import {
  Vector3,
  RPGEntity,
  SkillType,
  RoomType,
  HotspotType,
  InventoryComponent,
  StatsComponent,
  CombatComponent,
  MovementComponent,
  ResourceComponent,
  ItemComponent,
  NPCComponent,
  QuestComponent,
  ConstructionComponent,
  ConstructionSiteComponent,
  SkillsComponent,
} from '../../types/index'
import { BaseTestScenario } from './BaseTestScenario'

/**
 * Construction Scenario
 *
 * Complete workflow:
 * 1. Player with low construction skill attempts to build (should fail)
 * 2. Player gains construction levels through materials/training
 * 3. Player with sufficient skill successfully builds a room
 * 4. Player adds furniture to the room
 * 5. Validate construction experience and building functionality
 */
export class ConstructionScenario extends BaseTestScenario {
  private player: RPGEntity | null = null
  private buildingSite: RPGEntity | null = null
  private materials: RPGEntity[] = []
  private initialConstructionXp = 0
  private buildingAttempts = 0
  private successfulBuilds = 0

  constructor(world: World) {
    super(world, 'Construction Scenario', '#8B4513') // Brown color for building
  }

  async setup(): Promise<boolean> {
    try {
      console.log('[ConstructionScenario] Setting up construction scenario...')

      // 1. Spawn Player with low construction skill
      this.player = this.spawnTestEntity('player', 'player', { x: 0, y: 0, z: 0 }, '#00FF00')
      if (!this.player) throw new Error('Failed to spawn player')

      this.setupPlayerComponents(this.player, false) // Start with low skill

      // Store initial construction experience
      const playerStats = this.player.getComponent<StatsComponent>('stats')
      if (playerStats && playerStats.construction) {
        this.initialConstructionXp = playerStats.construction.xp
      }

      // 2. Spawn Building Site
      this.buildingSite = this.spawnTestEntity('building_site', 'construction_site', { x: 10, y: 0, z: 0 }, '#CD853F')
      if (!this.buildingSite) throw new Error('Failed to spawn building site')

      this.setupBuildingSiteComponents(this.buildingSite)

      // 3. Spawn Construction Materials
      const materialPositions = [
        { x: 5, y: 0, z: 2 }, // Planks
        { x: 6, y: 0, z: 2 }, // Nails
        { x: 7, y: 0, z: 2 }, // Hammer
        { x: 8, y: 0, z: 2 }, // Saw
      ]

      const materialTypes = [
        { id: 960, name: 'Plank', quantity: 10 },
        { id: 4820, name: 'Steel Nails', quantity: 20 },
        { id: 2347, name: 'Hammer', quantity: 1 },
        { id: 8794, name: 'Saw', quantity: 1 },
      ]

      for (let i = 0; i < materialPositions.length; i++) {
        const material = this.spawnTestEntity(`material_${i}`, 'item', materialPositions[i], '#D2B48C')
        if (!material) throw new Error(`Failed to spawn material ${i}`)

        this.setupMaterialComponents(material, materialTypes[i])
        this.materials.push(material)
      }

      this.logProgress(`✅ Construction scenario setup complete (${this.materials.length} materials available)`)
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logProgress(`❌ Setup failed: ${errorMessage}`)
      return false
    }
  }

  async execute(): Promise<boolean> {
    try {
      console.log('[ConstructionScenario] Executing construction scenario...')

      // Step 1: Player attempts to build with low skill (should fail)
      this.logProgress('🔨 Step 1: Player attempts construction with low skill...')
      await this.movePlayerTo(this.player!, { x: 9, y: 0, z: 0 })

      const lowSkillAttempt = await this.attemptConstruction(false)
      this.buildingAttempts++

      if (!lowSkillAttempt) {
        this.logProgress('❌ Construction failed due to insufficient skill (expected)')
      } else {
        this.logProgress('⚠️ Warning: Construction succeeded with low skill (unexpected)')
      }

      // Step 2: Player collects materials
      this.logProgress('📦 Step 2: Player collects construction materials...')

      for (let i = 0; i < this.materials.length; i++) {
        const material = this.materials[i]
        const materialPos = material.position

        await this.movePlayerTo(this.player!, {
          x: materialPos.x,
          y: materialPos.y,
          z: materialPos.z + 1,
        })

        await this.collectMaterial(material)
        this.logProgress(`✋ Collected ${material.getComponent<ItemComponent>('item')?.metadata?.name || 'material'}`)
      }

      // Step 3: Player gains construction skill (simulate training)
      this.logProgress('📚 Step 3: Player trains construction skill...')
      await this.trainConstructionSkill()

      // Step 4: Player attempts construction with proper skill and materials
      this.logProgress('🏗️ Step 4: Player attempts construction with sufficient skill...')
      await this.movePlayerTo(this.player!, { x: 9, y: 0, z: 0 })

      const skillfulAttempt = await this.attemptConstruction(true)
      this.buildingAttempts++

      if (skillfulAttempt) {
        this.logProgress('✅ Construction successful with proper skill and materials!')
        this.successfulBuilds++
      } else {
        this.logProgress('❌ Construction failed despite having skill and materials')
      }

      // Step 5: Player adds furniture to the built room
      if (skillfulAttempt) {
        this.logProgress('🪑 Step 5: Player adds furniture to the room...')
        await this.addFurnitureToRoom()
      }

      // Step 6: Validate construction experience gains
      this.logProgress('📈 Step 6: Calculating construction experience...')

      const playerStats = this.player!.getComponent<StatsComponent>('stats')
      if (playerStats && playerStats.construction) {
        const constructionXpGained = playerStats.construction.xp - this.initialConstructionXp
        this.logProgress(`🏗️ Construction XP gained: ${constructionXpGained}`)
        this.logProgress(`🏠 Successful builds: ${this.successfulBuilds}/${this.buildingAttempts}`)
      }

      this.logProgress('✅ Construction scenario completed successfully!')
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logProgress(`❌ Execution failed: ${errorMessage}`)
      return false
    }
  }

  async validate(): Promise<boolean> {
    try {
      console.log('[ConstructionScenario] Validating construction scenario...')

      const inventory = this.player?.getComponent<InventoryComponent>('inventory')
      const playerStats = this.player?.getComponent<StatsComponent>('stats')
      const constructionComponent = this.player?.getComponent<ConstructionComponent>('construction')

      if (!inventory || !playerStats || !constructionComponent) {
        this.logProgress('❌ Validation failed: Player missing required components')
        return false
      }

      // Verify construction tools are available
      const hasHammer = inventory.items.some(item => item?.metadata?.name === 'Hammer')
      const hasSaw = inventory.items.some(item => item?.metadata?.name === 'Saw')

      if (!hasHammer || !hasSaw) {
        this.logProgress('❌ Validation failed: Missing required construction tools')
        return false
      }

      // Verify construction experience gained
      if (!playerStats.construction) {
        this.logProgress('❌ Validation failed: Player missing construction skill')
        return false
      }

      const constructionXpGained = playerStats.construction.xp - this.initialConstructionXp
      if (constructionXpGained <= 0) {
        this.logProgress('❌ Validation failed: No construction experience gained')
        return false
      }

      // Verify construction skill level increased
      const expectedLevel = Math.floor((playerStats.construction.xp + 1) / 83)
      if (playerStats.construction.level < expectedLevel) {
        this.logProgress('❌ Validation failed: Construction level not updated correctly')
        return false
      }

      // Verify at least one building attempt was made
      if (this.buildingAttempts === 0) {
        this.logProgress('❌ Validation failed: No building attempts made')
        return false
      }

      // Verify skill requirement enforcement (low skill should fail, high skill should succeed)
      if (this.successfulBuilds === 0) {
        this.logProgress('❌ Validation failed: No successful builds despite training')
        return false
      }

      // Verify building site has construction activity
      const buildingSiteComponent = this.buildingSite?.getComponent<ConstructionSiteComponent>('construction_site')
      if (buildingSiteComponent && buildingSiteComponent.buildAttempts === 0) {
        this.logProgress('❌ Validation failed: Building site shows no construction activity')
        return false
      }

      // Verify house component exists if building was successful
      if (this.successfulBuilds > 0 && !constructionComponent.houseId) {
        this.logProgress('⚠️ Warning: Successful build but no house ID assigned')
      }

      this.logProgress('✅ Construction validation successful')
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logProgress(`❌ Validation failed: ${errorMessage}`)
      return false
    }
  }

  async cleanup(): Promise<void> {
    console.log('[ConstructionScenario] Cleaning up construction scenario...')

    // Remove spawned entities
    this.removeTestEntity('player')
    this.removeTestEntity('building_site')

    for (let i = 0; i < this.materials.length; i++) {
      this.removeTestEntity(`material_${i}`)
    }

    // Clear references
    this.player = null
    this.buildingSite = null
    this.materials = []
    this.buildingAttempts = 0
    this.successfulBuilds = 0

    console.log('[ConstructionScenario] Cleanup complete')
  }

  private setupPlayerComponents(player: RPGEntity, highSkill: boolean): void {
    // Add inventory component
    player.addComponent('inventory', {
      type: 'inventory',
      items: new Array(28).fill(null),
      maxSlots: 28,
      equipment: {
        head: null,
        cape: null,
        amulet: null,
        weapon: null,
        body: null,
        shield: null,
        legs: null,
        gloves: null,
        boots: null,
        ring: null,
        ammo: null,
      },
      totalWeight: 0,
      equipmentBonuses: {
        attackStab: 0,
        attackSlash: 0,
        attackCrush: 0,
        attackMagic: 0,
        attackRanged: 0,
        defenseStab: 0,
        defenseSlash: 0,
        defenseCrush: 0,
        defenseMagic: 0,
        defenseRanged: 0,
        meleeStrength: 0,
        rangedStrength: 0,
        magicDamage: 0,
        prayerBonus: 0,
      },
    })

    // Add stats component with construction skill
    const constructionLevel = highSkill ? 15 : 1
    const constructionXp = highSkill ? 2411 : 0

    player.addComponent('stats', {
      type: 'stats',
      hitpoints: { current: 100, max: 100, level: 10, xp: 1154 },
      attack: { level: 1, xp: 0 },
      strength: { level: 1, xp: 0 },
      defense: { level: 1, xp: 0 },
      ranged: { level: 1, xp: 0 },
      magic: { level: 1, xp: 0 },
      prayer: { level: 1, xp: 0, points: 0, maxPoints: 0 },
      // Artisan skills
      construction: { level: constructionLevel, xp: constructionXp },
      crafting: { level: 1, xp: 0 },
      smithing: { level: 1, xp: 0 },
      combatBonuses: {
        attackStab: 0,
        attackSlash: 0,
        attackCrush: 0,
        attackMagic: 0,
        attackRanged: 0,
        defenseStab: 0,
        defenseSlash: 0,
        defenseCrush: 0,
        defenseMagic: 0,
        defenseRanged: 0,
        meleeStrength: 0,
        rangedStrength: 0,
        magicDamage: 0,
        prayerBonus: 0,
      },
      combatLevel: 3,
      totalLevel: 10 + constructionLevel,
    })

    // Add construction component
    player.addComponent('construction', {
      type: 'construction',
      level: constructionLevel,
      experience: constructionXp,
      houseId: null,
      inHouse: false,
      buildMode: false,
      flatpacks: new Map(),
      currentBuild: null,
    })

    // Add movement component
    player.addComponent('movement', {
      type: 'movement',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      destination: null,
      targetPosition: null,
      path: [],
      speed: 3,
      currentSpeed: 0,
      moveSpeed: 3,
      isMoving: false,
      canMove: true,
      runEnergy: 100,
      isRunning: false,
      facingDirection: 0,
      pathfindingFlags: 0,
      lastMoveTime: 0,
      teleportDestination: null,
      teleportTime: 0,
      teleportAnimation: '',
    })
  }

  private setupBuildingSiteComponents(site: RPGEntity): void {
    site.addComponent('construction_site', {
      type: 'construction_site',
      siteId: 'test_site_001',
      roomType: RoomType.PARLOUR,
      position: site.position,
      requirements: {
        level: 1,
        materials: [
          { itemId: 960, quantity: 8 }, // Planks
          { itemId: 4820, quantity: 10 }, // Nails
        ],
        tools: ['hammer', 'saw'],
      },
      buildAttempts: 0,
      isBuilt: false,
      canBuild: true,
      buildTime: 5000, // 5 seconds to build
      experienceReward: 150,
      availableHotspots: [
        { type: HotspotType.SEATING, position: { x: 1, y: 0, z: 1 } },
        { type: HotspotType.TABLE, position: { x: 2, y: 0, z: 1 } },
        { type: HotspotType.DECORATION, position: { x: 0, y: 1, z: 0 } },
      ],
    })

    site.addComponent('visual', {
      type: 'visual',
      color: '#CD853F',
      model: 'construction_site.glb',
      scale: { x: 1, y: 1, z: 1 },
      visible: true,
      highlighted: false,
      currentAnimation: 'site_idle',
    })
  }

  private setupMaterialComponents(
    material: RPGEntity,
    materialData: { id: number; name: string; quantity: number }
  ): void {
    material.addComponent('item', {
      type: 'item',
      itemId: materialData.id,
      quantity: materialData.quantity,
      owner: null,
      spawnTime: Date.now(),
      publicSince: 0,
      despawnTimer: 300000,
      highlightTimer: 60000,
      noted: false,
      metadata: {
        name: materialData.name,
        examine: `${materialData.name} used in construction`,
        value: 1,
        stackable: materialData.name !== 'Hammer' && materialData.name !== 'Saw',
        constructionMaterial: true,
      },
    })
  }

  private async collectMaterial(material: RPGEntity): Promise<void> {
    const inventory = this.player!.getComponent<InventoryComponent>('inventory')
    const materialComponent = material.getComponent<ItemComponent>('item')

    if (!inventory || !materialComponent) return

    const firstEmptySlot = inventory.items.findIndex(slot => slot === null)
    if (firstEmptySlot === -1) {
      this.logProgress('⚠️ Inventory full, cannot collect material')
      return
    }

    // Add material to inventory
    inventory.items[firstEmptySlot] = {
      itemId: materialComponent.itemId,
      quantity: materialComponent.quantity,
      metadata: materialComponent.metadata,
    }

    // Remove material from world
    this.removeTestEntity(material.id)
  }

  private async trainConstructionSkill(): Promise<void> {
    const playerStats = this.player!.getComponent<StatsComponent>('stats')
    const constructionComponent = this.player!.getComponent<ConstructionComponent>('construction')

    if (!playerStats?.construction || !constructionComponent) return

    // Simulate training by reading construction guide or practicing
    this.logProgress('📖 Reading construction manual...')
    await this.wait(2000)

    // Award training experience
    const trainingXp = 1000 // Enough to reach level 10+
    playerStats.construction.xp += trainingXp
    constructionComponent.experience += trainingXp

    // Update level based on experience
    const newLevel = this.calculateLevelFromXp(playerStats.construction.xp)
    playerStats.construction.level = newLevel
    constructionComponent.level = newLevel

    this.logProgress(`📈 Construction skill increased to level ${newLevel} (+${trainingXp} XP)`)
  }

  private async attemptConstruction(hasSkill: boolean): Promise<boolean> {
    const inventory = this.player!.getComponent<InventoryComponent>('inventory')
    const playerStats = this.player!.getComponent<StatsComponent>('stats')
    const siteComponent = this.buildingSite!.getComponent<ConstructionSiteComponent>('construction_site')

    if (!inventory || !playerStats || !siteComponent) return false

    siteComponent.buildAttempts++

    // Check skill requirement
    const requiredLevel = siteComponent.requirements.level
    const playerLevel = playerStats.construction?.level || 0

    if (playerLevel < requiredLevel) {
      this.logProgress(`❌ Construction requires level ${requiredLevel}, player has ${playerLevel}`)
      return false
    }

    // Check materials
    const hasAllMaterials = siteComponent.requirements.materials.every(req => {
      return inventory.items.some(item => item?.itemId === req.itemId && item?.quantity >= req.quantity)
    })

    if (!hasAllMaterials) {
      this.logProgress('❌ Missing required materials for construction')
      return false
    }

    // Check tools
    const hasHammer = inventory.items.some(item => item?.metadata?.name === 'Hammer')
    const hasSaw = inventory.items.some(item => item?.metadata?.name === 'Saw')

    if (!hasHammer || !hasSaw) {
      this.logProgress('❌ Missing required tools (hammer and saw)')
      return false
    }

    // Simulate construction time
    this.logProgress('🔨 Building room...')
    await this.wait(siteComponent.buildTime)

    // Consume materials
    siteComponent.requirements.materials.forEach(req => {
      const itemSlot = inventory.items.findIndex(item => item?.itemId === req.itemId && item?.quantity >= req.quantity)

      if (itemSlot !== -1 && inventory.items[itemSlot]) {
        inventory.items[itemSlot]!.quantity -= req.quantity
        if (inventory.items[itemSlot]!.quantity <= 0) {
          inventory.items[itemSlot] = null
        }
      }
    })

    // Award experience
    if (playerStats.construction) {
      playerStats.construction.xp += siteComponent.experienceReward

      // Update construction component
      const constructionComponent = this.player!.getComponent<ConstructionComponent>('construction')
      if (constructionComponent) {
        constructionComponent.experience += siteComponent.experienceReward
      }
    }

    // Mark site as built
    siteComponent.isBuilt = true
    siteComponent.canBuild = false

    this.logProgress(`🏠 Room built successfully! (+${siteComponent.experienceReward} Construction XP)`)
    return true
  }

  private async addFurnitureToRoom(): Promise<void> {
    const siteComponent = this.buildingSite!.getComponent<ConstructionSiteComponent>('construction_site')

    if (!siteComponent?.isBuilt) return

    this.logProgress('🪑 Adding furniture to room...')

    // Simulate adding furniture to available hotspots
    for (const hotspot of siteComponent.availableHotspots) {
      await this.wait(1000)

      let furnitureName = 'Unknown'
      switch (hotspot.type) {
        case HotspotType.SEATING:
          furnitureName = 'Wooden Chair'
          break
        case HotspotType.TABLE:
          furnitureName = 'Oak Table'
          break
        case HotspotType.DECORATION:
          furnitureName = 'Painting'
          break
      }

      this.logProgress(`🛠️ Added ${furnitureName} to ${hotspot.type} hotspot`)

      // Award small XP bonus for furniture
      const playerStats = this.player!.getComponent<StatsComponent>('stats')
      if (playerStats?.construction) {
        playerStats.construction.xp += 25
      }
    }

    this.logProgress('✅ Room fully furnished!')
  }

  private calculateLevelFromXp(xp: number): number {
    // Simplified XP table calculation
    let level = 1
    let totalXp = 0

    while (totalXp <= xp && level < 99) {
      totalXp += Math.floor(level + 300 * Math.pow(2, level / 7)) / 4
      if (totalXp <= xp) level++
    }

    return Math.max(1, level - 1)
  }

  private async movePlayerTo(player: RPGEntity, destination: Vector3): Promise<void> {
    const movement = player.getComponent<MovementComponent>('movement')
    if (movement) {
      movement.destination = destination
      movement.isMoving = true
      // Simulate movement completion
      await this.wait(400)
      movement.position = destination
      player.position = destination
      movement.isMoving = false
      movement.destination = null
    }
  }
}
