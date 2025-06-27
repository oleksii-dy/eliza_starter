import { Camera, Object3D } from 'three'
import type { World, WorldOptions, Entity, Player, Vector3, HotReloadable, System } from '../types'
import { mock, spyOn } from 'bun:test'

// Mock implementations for testing
export class MockWorld implements World {
  builder?: { enabled: boolean } | undefined
  xr?: { session?: XRSession; camera: any } | undefined
  ui?: { toggleCode(): void; suppressReticle?(): () => void } | undefined
  loader?:
    | {
        get(type: string, url: string): any
        load(type: string, url: string): Promise<any>
        insert(type: string, url: string, data: any): void
        getFile?(url: string): any
        preload?(type: string, url: string): void
        execPreload?(): void
        preloader?: Promise<void>
      }
    | undefined
  getSystem<T extends System>(name: string): T | undefined {
    return (this as any)[name] as T | undefined
  }
  getSystemByType<T extends System>(constructor: new (world: World) => T): T | undefined {
    throw new Error('Method not implemented.')
  }
  graphics?:
    | {
        renderer: {
          xr: {
            setSession: (session: XRSession) => void
            getCamera: () => Camera
            getControllerGrip: (index: number) => Object3D
          }
        }
      }
    | undefined
  target?: any
  db?: any
  storage?: any
  server?: any
  monitor?: any
  livekit?: any
  environment?: any
  frame = 0
  time = 0
  accumulator = 0
  systems: any[] = []
  networkRate = 1 / 8
  assetsUrl = 'https://assets.hyperfy.io/'
  assetsDir: string | null = null
  hot = new Set<HotReloadable>()
  rig = { position: { x: 0, y: 0, z: 0 } }
  camera = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    fov: 70,
    near: 0.2,
    far: 1200,
  }

  // Add missing properties
  controls = createMockSystem('controls')
  prefs = createMockSystem('prefs')
  audio = createMockAudioSystem()

  // System mocks
  settings = createMockSystem('settings')
  collections = createMockSystem('collections')
  apps = createMockSystem('apps')
  anchors = createMockSystem('anchors')
  events = createMockEventSystem()
  scripts = createMockSystem('scripts')
  chat = createMockChatSystem()
  blueprints = createMockBlueprintsSystem()
  entities = createMockEntitiesSystem()
  physics = createMockPhysicsSystem()
  stage = createMockStageSystem()

  // Network mock
  network = createMockNetworkSystem()

  // Add emit method
  emit = mock((event: string, ...args: any[]) => {
    return true
  })

  // Add on and off methods
  on = mock()
  off = mock()

  private running = false
  private tickInterval?: NodeJS.Timeout

  register(key: string, SystemClass: any): any {
    const system = new SystemClass(this)
    this.systems.push(system)
    ;(this as any)[key] = system
    return system
  }

  async init(options: WorldOptions): Promise<void> {
    if (options.assetsUrl) {
      this.assetsUrl = options.assetsUrl
    }
    if (options.assetsDir) {
      this.assetsDir = options.assetsDir
    }
    if (options.networkRate) {
      this.networkRate = options.networkRate
    }

    for (const system of this.systems) {
      await system.init(options)
    }
  }

  start(): void {
    this.running = true
    for (const system of this.systems) {
      system.start()
    }
  }

  tick(deltaMs: number): void {
    const time = this.time + deltaMs
    const _delta = deltaMs / 1000

    this.frame++
    this.time = time
    this.accumulator += _delta

    // Fixed timestep physics
    const fixedDelta = 1 / 60
    while (this.accumulator >= fixedDelta) {
      // Physics update
      this.physics.fixedUpdate(fixedDelta)
      this.accumulator -= fixedDelta
    }

    // Regular update
    for (const system of this.systems) {
      system.update(_delta)
    }

    // Late update
    for (const system of this.systems) {
      system.lateUpdate(_delta)
    }
  }

  destroy(): void {
    this.running = false
    if (this.tickInterval) {
      clearInterval(this.tickInterval)
    }
    for (const system of this.systems) {
      system.destroy()
    }
  }

  resolveURL(url: string, allowLocal?: boolean): string {
    if (!url) {
      return url
    }
    if (url.startsWith('blob:') || url.startsWith('http')) {
      return url
    }
    if (url.startsWith('asset://')) {
      return url.replace('asset://', this.assetsUrl || '')
    }
    return url
  }

  setHot(item: any, hot: boolean): void {
    if (hot) {
      this.hot.add(item)
    } else {
      this.hot.delete(item)
    }
  }

  setupMaterial(material: any): void {
    // Mock material setup
  }

  inject(runtime: any): void {
    this.apps.inject(runtime)
  }

  // Test helpers
  async runFor(ms: number): Promise<void> {
    const start = Date.now()
    while (Date.now() - start < ms) {
      this.tick(16) // 60fps
      await new Promise(resolve => setTimeout(resolve, 16))
    }
  }

  async runUntil(condition: () => boolean, timeout = 5000): Promise<void> {
    const start = Date.now()
    while (!condition() && Date.now() - start < timeout) {
      this.tick(16)
      await new Promise(resolve => setTimeout(resolve, 16))
    }
    if (!condition()) {
      throw new Error('Condition not met within timeout')
    }
  }
}

// Mock system factories
function createMockSystem(name: string): any {
  return {
    world: null,
    init: mock(),
    start: mock(),
    destroy: mock(),
    update: mock(),
    fixedUpdate: mock(),
    lateUpdate: mock(),
    preTick: mock(),
    postTick: mock(),
    preFixedUpdate: mock(),
    postFixedUpdate: mock(),
    preUpdate: mock(),
    postUpdate: mock(),
    postLateUpdate: mock(),
    commit: mock(),
  }
}

function createMockEventSystem(): any {
  const handlers = new Map<string, Set<Function>>()

  return {
    ...createMockSystem('events'),
    emit: mock((event: string, data?: any) => {
      const eventHandlers = handlers.get(event)
      if (eventHandlers) {
        eventHandlers.forEach(handler => handler(data))
      }
    }),
    on: mock((event: string, handler: Function) => {
      if (!handlers.has(event)) {
        handlers.set(event, new Set())
      }
      handlers.get(event)!.add(handler)
    }),
    off: mock((event: string, handler?: Function) => {
      if (handler) {
        handlers.get(event)?.delete(handler)
      } else {
        handlers.delete(event)
      }
    }),
  }
}

function createMockChatSystem(): any {
  const messages: any[] = []

  return {
    ...createMockSystem('chat'),
    messages,
    send: mock((text: string, from?: any) => {
      messages.push({
        id: `msg-${Date.now()}`,
        text,
        from,
        timestamp: Date.now(),
      })
    }),
  }
}

function createMockBlueprintsSystem(): any {
  const blueprints = new Map<string, any>()

  return {
    ...createMockSystem('blueprints'),
    blueprints,
    get: mock((id: string) => blueprints.get(id) || null),
    create: mock((blueprintId: string, options?: any) => {
      return createMockEntity(`bp-entity-${Date.now()}`, blueprintId, options)
    }),
    modify: mock((data: any) => {
      if (data.id && blueprints.has(data.id)) {
        Object.assign(blueprints.get(data.id), data)
      }
    }),
    add: mock((blueprint: any, local?: boolean) => {
      blueprints.set(blueprint.id, blueprint)
      return blueprint
    }),
  }
}

function createMockEntitiesSystem(): any {
  const items = new Map<string, any>()
  const players = new Map<string, any>()
  let entityCounter = 0

  return {
    ...createMockSystem('entities'),
    items,
    players,
    create: mock((name: string, options?: any) => {
      const entity = createMockEntity(`entity-${++entityCounter}`, name, options)
      items.set(entity.id, entity)
      return entity
    }),
    add: mock((data: any, local?: boolean) => {
      const entity = createMockEntity(data.id || `entity-${++entityCounter}`, data.name || 'entity', data)
      entity.type = data.type
      items.set(entity.id, entity)
      if (data.type === 'player') {
        players.set(entity.id, entity)
      }
      return entity
    }),
    destroyEntity: mock((entityId: string) => {
      const entity = items.get(entityId)
      if (entity) {
        entity.destroy()
        items.delete(entityId)
        players.delete(entityId)
      }
    }),
    get: mock((entityId: string) => items.get(entityId) || null),
    has: mock((entityId: string) => items.has(entityId)),
    spawnPlayer: mock((playerId: string, options?: any) => {
      const player = createMockPlayer(playerId, options)
      items.set(player.id, player)
      players.set(player.id, player)
      return player
    }),
  }
}

function createMockPhysicsSystem(): any {
  return {
    ...createMockSystem('physics'),
    world: { gravity: { x: 0, y: -9.81, z: 0 } },
    raycast: mock(() => null),
    sphereCast: mock(() => null),
    overlapSphere: mock(() => []),
    simulate: mock(),
  }
}

function createMockStageSystem(): any {
  return {
    ...createMockSystem('stage'),
    scene: {
      add: mock(),
      remove: mock(),
      children: [],
    },
    environment: {
      fog: null,
      background: null,
    },
  }
}

function createMockNetworkSystem(): any {
  return {
    ...createMockSystem('network'),
    id: 'network-1',
    isServer: false,
    isClient: true,
    send: mock(),
    sendTo: mock(),
    broadcast: mock(),
    upload: mock(),
    sockets: new Map(),
  }
}

function createMockAudioSystem(): any {
  return {
    ...createMockSystem('audio'),
    play: mock(),
    stop: mock(),
    setVolume: mock(),
    createSource: mock(),
    listener: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    },
  }
}

// Mock entity factory
function createMockEntity(id: string, name: string, options?: any): any {
  const components = new Map()
  const position = { x: 0, y: 0, z: 0, ...options?.position }
  const rotation = { x: 0, y: 0, z: 0, w: 1, ...options?.rotation }
  const scale = { x: 1, y: 1, z: 1, ...options?.scale }
  const velocity = { x: 0, y: 0, z: 0 }

  return {
    id,
    name,
    type: options?.type || 'generic',
    components,
    data: options?.data || {},
    position,
    rotation,
    scale,
    velocity,
    node: {
      position,
      rotation,
      scale,
      visible: true,
      parent: null,
      children: [],
    },

    addComponent: mock((type: string, data?: any) => {
      const component = { type, entity: id, data }
      components.set(type, component)
      return component
    }),

    removeComponent: mock((type: string) => {
      components.delete(type)
    }),

    getComponent: mock((type: string) => components.get(type) || null),

    hasComponent: mock((type: string) => components.has(type)),

    applyForce: mock((force: Vector3) => {
      velocity.x += force.x * 0.016 // Simplified physics
      velocity.y += force.y * 0.016
      velocity.z += force.z * 0.016
    }),

    applyImpulse: mock((impulse: Vector3) => {
      velocity.x += impulse.x
      velocity.y += impulse.y
      velocity.z += impulse.z
    }),

    setVelocity: mock((vel: Vector3) => {
      velocity.x = vel.x
      velocity.y = vel.y
      velocity.z = vel.z
    }),

    getVelocity: mock(() => ({ ...velocity })),

    destroy: mock(),
  }
}

// Mock player factory
function createMockPlayer(id: string, options?: any): any {
  const entity = createMockEntity(id, options?.name || 'Player', options)

  return {
    ...entity,
    type: 'player',
    connection: options?.connection || null,
    input: {
      movement: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      actions: new Set<string>(),
      mouse: { x: 0, y: 0 },
    },
    stats: {
      health: 100,
      maxHealth: 100,
      score: 0,
      kills: 0,
      deaths: 0,
      ...options?.stats,
    },

    spawn: mock((position: Vector3) => {
      entity.position.x = position.x
      entity.position.y = position.y
      entity.position.z = position.z
      entity.velocity.x = 0
      entity.velocity.y = 0
      entity.velocity.z = 0
    }),

    respawn: mock(() => {
      entity.stats.health = entity.stats.maxHealth
      entity.spawn({ x: 0, y: 10, z: 0 })
    }),

    damage: mock((amount: number, source?: any) => {
      entity.stats.health = Math.max(0, entity.stats.health - amount)
      if (entity.stats.health <= 0) {
        entity.stats.deaths++
        if (source?.stats) {
          source.stats.kills++
        }
      }
    }),

    heal: mock((amount: number) => {
      entity.stats.health = Math.min(entity.stats.maxHealth, entity.stats.health + amount)
    }),

    get isDead() {
      return entity.stats.health <= 0
    },
  }
}

// Main factory function
export async function createTestWorld(options?: Partial<WorldOptions>): Promise<MockWorld> {
  const world = new MockWorld()

  await world.init({
    physics: true,
    renderer: 'headless',
    ...options,
  })

  world.start()

  return world
}

// Test scenario base class
export class TestScenario {
  world!: MockWorld
  players = new Map<string, any>()
  entities = new Map<string, any>()

  async setup(options?: Partial<WorldOptions>): Promise<void> {
    this.world = await createTestWorld(options)
  }

  async spawnPlayer(id: string, options?: any): Promise<any> {
    const player = this.world.entities.spawnPlayer(id, options)
    this.players.set(id, player)
    return player
  }

  async spawnEntity(name: string, options?: any): Promise<any> {
    const entity = this.world.entities.create(name, options)
    this.entities.set(entity.id, entity)
    return entity
  }

  async runFor(ms: number): Promise<void> {
    return this.world.runFor(ms)
  }

  async runUntil(condition: () => boolean, timeout?: number): Promise<void> {
    return this.world.runUntil(condition, timeout)
  }

  async cleanup(): Promise<void> {
    this.world.destroy()
    this.players.clear()
    this.entities.clear()
  }
}
