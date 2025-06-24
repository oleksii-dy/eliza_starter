import { createTestWorld } from '../src/__tests__/createTestWorld'
import { runVisualDemo } from '../src/rpg/examples/visual-demo'

async function testVisualDemo() {
  console.log('=== Testing Visual Representation Demo ===\n')

  try {
    // Create a test world with all RPG systems
    const world = await createTestWorld({
      enableAllSystems: true,
    })

    console.log('Test world created successfully')
    console.log(
      'Available systems:',
      world.systems.map(s => s.constructor.name)
    )

    // Check if required systems are available
    const visualSystem = world.getSystem('visualRepresentation')
    const spawningSystem = world.getSystem('spawning')
    const npcSystem = world.getSystem('npc')

    if (!visualSystem) {
      console.error('❌ Visual Representation System not found!')
      return
    }

    if (!spawningSystem) {
      console.error('❌ Spawning System not found!')
      return
    }

    if (!npcSystem) {
      console.error('❌ NPC System not found!')
      return
    }

    console.log('✅ All required systems are available\n')

    // Run the visual demo
    await runVisualDemo(world)

    // Let the demo run for a bit
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Check if entities were created
    const visualSystemTyped = visualSystem as any
    const entityCount = visualSystemTyped.entityVisuals?.size || 0
    const animationCount = visualSystemTyped.activeAnimations?.size || 0

    console.log(`\n=== Demo Results ===`)
    console.log(`✅ Entities with visuals: ${entityCount}`)
    console.log(`✅ Active animations: ${animationCount}`)

    if (entityCount > 0) {
      console.log('\n✅ Visual Demo is working correctly!')
    } else {
      console.error('\n❌ No entities were created with visuals')
    }
  } catch (error) {
    console.error('❌ Error running visual demo:', error)
    console.error(error.stack)
  }
}

// Run the test
testVisualDemo()
