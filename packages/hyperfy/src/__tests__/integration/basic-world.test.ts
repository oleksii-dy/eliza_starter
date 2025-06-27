import { describe, it, expect, beforeAll } from 'bun:test'
import { World } from '../../core/World'
import { ConfigLoader } from '../../rpg/config/ConfigLoader'
import { Config } from '../../core/config'
import { removeGraphicsSystemsForTesting, setupTestEnvironment } from '../helpers/test-setup'

describe('Basic World Initialization', () => {
  beforeAll(() => {
    setupTestEnvironment()
  })

  it('should create a minimal world without hanging', async () => {
    const world = new World()

    // Remove graphics-dependent systems before init
    removeGraphicsSystemsForTesting(world)

    const config = Config.get()

    const initOptions = {
      physics: false,
      renderer: 'headless' as const,
      networkRate: config.networkRate,
      maxDeltaTime: config.maxDeltaTime,
      fixedDeltaTime: config.fixedDeltaTime,
      assetsDir: config.assetsDir || undefined,
      assetsUrl: config.assetsUrl,
    }

    await world.init(initOptions)

    expect(world).toBeDefined()
    expect(world.entities).toBeDefined()
    expect(world.events).toBeDefined()
  }, 10000)

  it('should initialize ConfigLoader in test mode', () => {
    const configLoader = ConfigLoader.getInstance()
    configLoader.enableTestMode()

    const npcs = configLoader.getAllNPCs()
    expect(Object.keys(npcs).length).toBeGreaterThan(0)
    expect(configLoader.getNPC(1)).toBeDefined()
    expect(configLoader.getNPC(1)?.name).toBe('Goblin')
    expect(configLoader.getNPC(2)).toBeDefined()
    expect(configLoader.getNPC(2)?.name).toBe('Guard')
  })
})
