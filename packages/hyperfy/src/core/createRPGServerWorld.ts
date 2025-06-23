import { World } from './World'

// Core server systems
import { Server } from './systems/Server'
import { ServerLiveKit } from './systems/ServerLiveKit'
import { ServerNetwork } from './systems/ServerNetwork'
import { ServerLoader } from './systems/ServerLoader'
import { ServerEnvironment } from './systems/ServerEnvironment'
import { ServerMonitor } from './systems/ServerMonitor'

// Import RPG plugin
import { HyperfyRPGPlugin } from '../rpg'

export async function createRPGServerWorld() {
  const world = new World()
  
  // Register core server systems
  world.register('server', Server)
  world.register('livekit', ServerLiveKit)
  world.register('network', ServerNetwork)
  world.register('loader', ServerLoader)
  world.register('environment', ServerEnvironment)
  world.register('monitor', ServerMonitor)
  
  // Initialize RPG plugin
  console.log('[RPGServerWorld] Initializing RPG plugin...')
  await HyperfyRPGPlugin.init(world)
  
  console.log('[RPGServerWorld] Created world with RPG systems')
  
  return world
} 