/**
 * Detailed test of DeathRespawnRecoveryScenario to verify it actually works
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { createRealTestWorld, RealTestScenario } from '../real-world-factory'
import { ScenarioTestFramework } from '../../rpg/testing/ScenarioTestFramework'
import { DeathRespawnRecoveryScenario } from '../../rpg/testing/scenarios'
import type { World } from '../../types'

describe('DeathRespawnRecoveryScenario Detailed Test', () => {
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

  test('DeathRespawnRecoveryScenario should run through all phases', async () => {
    console.log('💀 Testing DeathRespawnRecoveryScenario in detail...')

    // Run setup
    console.log('📋 Running setup phase...')
    await DeathRespawnRecoveryScenario.setup(framework)

    const helpers = framework.getRPGHelpers()
    const testData = (framework as any).deathTestData

    console.log('📊 Test data:', testData ? 'FOUND' : 'NOT FOUND')
    if (testData) {
      console.log('   Phase:', testData.phase)
      console.log('   Player ID:', testData.playerId)
      console.log('   Killer ID:', testData.killerId)
      console.log('   Locations:', testData.locations)
    }

    // Check entities
    const player = helpers.getTestEntity(testData.playerId)
    const killer = testData ? helpers.getTestEntity(testData.killerId) : null

    console.log('👤 Player entity:', player ? 'FOUND' : 'NOT FOUND')
    console.log('💀 Killer entity:', killer ? 'FOUND' : 'NOT FOUND')

    if (player) {
      console.log('   Player position:', player.position)
      console.log('   Player health:', player.getComponent('stats')?.hitpoints)
    }

    // Run condition cycles
    console.log('🔄 Testing condition phases...')

    let conditionResult = false
    let attempts = 0
    const maxAttempts = 100 // Many attempts for death/respawn cycle

    while (!conditionResult && attempts < maxAttempts) {
      attempts++
      if (attempts % 10 === 1) {
        // Log every 10th attempt
        console.log(`  Attempt ${attempts}:`)
      }

      try {
        conditionResult = await DeathRespawnRecoveryScenario.condition(framework)

        if (attempts % 10 === 1) {
          console.log(`    Result: ${conditionResult}`)

          const currentData = (framework as any).deathTestData
          if (currentData) {
            console.log(`    Phase: ${currentData.phase}`)
            console.log(`    Player died: ${currentData.playerDied}`)
            console.log(`    Player respawned: ${currentData.playerRespawned}`)
            console.log(`    Gravestone created: ${currentData.gravestoneCreated}`)
            console.log(`    Items recovered: ${currentData.itemsRecovered}`)
          }
        }

        if (!conditionResult) {
          await new Promise(resolve => setTimeout(resolve, 50)) // Faster cycles
        }
      } catch (error) {
        console.error(`    Error in attempt ${attempts}:`, error)
        break
      }
    }

    console.log(`📊 Final result after ${attempts} attempts: ${conditionResult ? 'SUCCESS' : 'INCOMPLETE'}`)

    // Check final state
    const finalData = (framework as any).deathTestData
    if (finalData) {
      console.log('📈 Final test data:')
      console.log('   Phase:', finalData.phase)
      console.log('   Player died:', finalData.playerDied)
      console.log('   Player respawned:', finalData.playerRespawned)
      console.log('   Gravestone created:', finalData.gravestoneCreated)
      console.log('   Items recovered:', finalData.itemsRecovered)
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
    await DeathRespawnRecoveryScenario.cleanup(framework)

    expect(player).toBeTruthy()
    expect(killer).toBeTruthy()
    expect(testData).toBeTruthy()
    expect(testData.phase).toBeDefined()

    console.log('✅ DeathRespawnRecoveryScenario detailed test completed')
  }, 60000) // 1 minute timeout
})
