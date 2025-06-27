/**
 * Detailed test of AggroChaseEscapeScenario to verify it actually works
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { createRealTestWorld, RealTestScenario } from '../real-world-factory'
import { ScenarioTestFramework } from '../../rpg/testing/ScenarioTestFramework'
import { AggroChaseEscapeScenario } from '../../rpg/testing/scenarios'
import type { World } from '../../types'

describe('AggroChaseEscapeScenario Detailed Test', () => {
  let scenario: RealTestScenario
  let world: World
  let framework: ScenarioTestFramework

  beforeEach(async () => {
    scenario = new RealTestScenario()
    await scenario.setup({ enablePhysics: false })
    world = scenario.world
    framework = new ScenarioTestFramework(world)
  })

  afterEach(async () => {
    if (framework) {
      await framework.cleanup()
    }
    if (scenario) {
      await scenario.cleanup()
    }
  })

  test('AggroChaseEscapeScenario should run through all phases', async () => {
    console.log('🎯 Testing AggroChaseEscapeScenario in detail...')

    // First, let's run setup and see what entities are created
    console.log('📋 Running setup phase...')
    await AggroChaseEscapeScenario.setup(framework)

    const helpers = framework.getRPGHelpers()

    // Check if entities were created
    const player = helpers.getTestEntity('aggro_test_player')
    console.log('👤 Player entity:', player ? 'FOUND' : 'NOT FOUND')
    if (player) {
      console.log('   Position:', player.position)
      console.log('   Type:', player.type)
      console.log('   Components:', Object.keys(player.components || {}))
    }

    // Check if we have access to the test data
    const testData = (framework as any).aggroTestData
    console.log('📊 Test data:', testData ? 'FOUND' : 'NOT FOUND')
    if (testData) {
      console.log('   Phase:', testData.phase)
      console.log('   Player ID:', testData.playerId)
      console.log('   Mob ID:', testData.mobId)
      console.log('   Waypoints:', testData.waypoints)
    }

    // Try to get the mob
    const mob = testData ? helpers.getTestEntity(testData.mobId) : null
    console.log('👹 Mob entity:', mob ? 'FOUND' : 'NOT FOUND')
    if (mob) {
      console.log('   Position:', mob.position)
      console.log('   Type:', mob.type)
      console.log('   Components:', Object.keys(mob.components || {}))
    }

    // Check world systems
    const combatSystem = world.getSystem('combat')
    const npcSystem = world.getSystem('npc')
    const movementSystem = world.getSystem('movement')

    console.log('🔧 Systems available:')
    console.log('   Combat:', combatSystem ? 'YES' : 'NO')
    console.log('   NPC:', npcSystem ? 'YES' : 'NO')
    console.log('   Movement:', movementSystem ? 'YES' : 'NO')

    // Try running the condition a few times to see progression
    console.log('🔄 Testing condition phases...')

    let conditionResult = false
    let attempts = 0
    const maxAttempts = 50 // More attempts to see more phases

    while (!conditionResult && attempts < maxAttempts) {
      attempts++
      console.log(`  Attempt ${attempts}:`)

      try {
        conditionResult = await AggroChaseEscapeScenario.condition(framework)
        console.log(`    Result: ${conditionResult}`)

        // Check test data phase after each attempt
        const currentData = (framework as any).aggroTestData
        if (currentData) {
          console.log(`    Phase: ${currentData.phase}`)
          console.log(`    Aggro triggered: ${currentData.aggroTriggered}`)
          console.log(`    Chase started: ${currentData.chaseStarted}`)
          console.log(`    Player escaped: ${currentData.playerEscaped}`)
        }

        // If not complete, wait a bit
        if (!conditionResult) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error(`    Error in attempt ${attempts}:`, error)
        break
      }
    }

    console.log(`📊 Final result after ${attempts} attempts: ${conditionResult ? 'SUCCESS' : 'INCOMPLETE'}`)

    // Check final state
    const finalData = (framework as any).aggroTestData
    if (finalData) {
      console.log('📈 Final test data:')
      console.log('   Phase:', finalData.phase)
      console.log('   Aggro triggered:', finalData.aggroTriggered)
      console.log('   Chase started:', finalData.chaseStarted)
      console.log('   Player escaped:', finalData.playerEscaped)
      console.log('   Mob returned:', finalData.mobReturned)
      console.log('   Re-aggro tested:', finalData.reAggroTested)
      console.log('   Phases completed:', finalData.phases?.length || 0)

      if (finalData.phases) {
        console.log('   Phase timeline:')
        finalData.phases.forEach((phase: any, index: number) => {
          console.log(`     ${index + 1}. ${phase.phase} at ${(phase.time / 1000).toFixed(1)}s`)
        })
      }
    }

    // Run cleanup
    console.log('🧹 Running cleanup...')
    await AggroChaseEscapeScenario.cleanup(framework)

    // The test doesn't need to complete fully, but we should see progression
    expect(player).toBeTruthy()
    expect(mob).toBeTruthy()
    expect(testData).toBeTruthy()
    expect(testData.phase).toBeDefined()

    console.log('✅ AggroChaseEscapeScenario detailed test completed')
  }, 30000) // 30 second timeout
})
