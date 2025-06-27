#!/usr/bin/env node

/**
 * NPC Spawn Verification Test
 *
 * Verifies that NPCs are actually spawning in the RPG world by:
 * 1. Connecting to the running server
 * 2. Checking if spawning system is active
 * 3. Listing active spawners and their entities
 * 4. Verifying NPCs have visual representations
 */

import puppeteer from 'puppeteer'
import fs from 'fs-extra'
import path from 'path'

const CONFIG = {
  headless: false,
  timeout: 30000,
  worldUrl: 'http://localhost:4444',
  resultDir: 'test-results',
}

async function main() {
  console.log('🎮 Running NPC Spawn Verification Test...')
  console.log(`📋 Config: headless=${CONFIG.headless}, timeout=${CONFIG.timeout}ms`)

  let browser
  try {
    // Ensure results directory exists
    await fs.ensureDir(CONFIG.resultDir)

    browser = await puppeteer.launch({
      headless: CONFIG.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })

    // Set up console logging
    page.on('console', msg => {
      const type = msg.type()
      if (['log', 'info', 'warn', 'error'].includes(type)) {
        console.log(`[Browser ${type}] ${msg.text()}`)
      }
    })

    console.log('🌍 Loading RPG world...')
    await page.goto(CONFIG.worldUrl, { waitUntil: 'domcontentloaded' })

    // Wait for world initialization
    console.log('⏳ Waiting for world and RPG systems...')
    await page.waitForFunction(
      () => {
        return (
          window.world &&
          window.world.getSystem &&
          window.world.getSystem('spawning') &&
          window.world.getSystem('npc') &&
          window.world.getSystem('visualRepresentation')
        )
      },
      { timeout: CONFIG.timeout }
    )

    // Inject spawn verification script
    const results = await page.evaluate(async () => {
      console.log('[SpawnTest] Starting NPC spawn verification...')

      const world = window.world
      const spawningSystem = world.getSystem('spawning')
      const npcSystem = world.getSystem('npc')
      const visualSystem = world.getSystem('visualRepresentation')

      const verification = {
        systems: {
          spawning: !!spawningSystem,
          npc: !!npcSystem,
          visual: !!visualSystem,
        },
        spawners: [],
        entities: [],
        npcs: [],
        visuals: [],
        summary: {},
      }

      // Check spawning system
      if (spawningSystem) {
        console.log('[SpawnTest] Checking spawning system...')

        // Get spawner information
        if (spawningSystem.spawners) {
          verification.spawners = Array.from(spawningSystem.spawners.values()).map(spawner => ({
            id: spawner.id,
            position: spawner.position,
            type: spawner.type,
            maxEntities: spawner.maxEntities,
            activeEntities: spawner.activeEntities ? spawner.activeEntities.size : 0,
            isActive: spawner.isActive,
            entityDefinitions: spawner.entityDefinitions,
          }))
          console.log(`[SpawnTest] Found ${verification.spawners.length} spawners`)
        }

        // Check active spawns
        if (spawningSystem.activeSpawns) {
          verification.entities = Array.from(spawningSystem.activeSpawns.entries()).map(([entityId, spawnerId]) => ({
            entityId,
            spawnerId,
          }))
          console.log(`[SpawnTest] Found ${verification.entities.length} active spawned entities`)
        }
      }

      // Check NPC system
      if (npcSystem) {
        console.log('[SpawnTest] Checking NPC system...')

        if (npcSystem.npcs) {
          verification.npcs = Array.from(npcSystem.npcs.values()).map(npc => ({
            id: npc.id,
            name: npc.name,
            position: npc.position,
            state: npc.state,
            behavior: npc.behavior,
            type: npc.type,
          }))
          console.log(`[SpawnTest] Found ${verification.npcs.length} NPCs`)
        }
      }

      // Check visual representations
      if (visualSystem) {
        console.log('[SpawnTest] Checking visual system...')

        if (visualSystem.visualEntities) {
          verification.visuals = Array.from(visualSystem.visualEntities.values()).map(visual => ({
            id: visual.id,
            entityId: visual.entityId,
            type: visual.type,
            position: visual.position,
            color: visual.color,
            scale: visual.scale,
            visible: visual.visible,
          }))
          console.log(`[SpawnTest] Found ${verification.visuals.length} visual entities`)
        }
      }

      // Generate summary
      verification.summary = {
        totalSpawners: verification.spawners.length,
        activeSpawners: verification.spawners.filter(s => s.isActive).length,
        totalEntities: verification.entities.length,
        totalNpcs: verification.npcs.length,
        totalVisuals: verification.visuals.length,
        spawnersWithEntities: verification.spawners.filter(s => s.activeEntities > 0).length,
      }

      console.log('[SpawnTest] Verification complete')
      return verification
    })

    // Display results
    console.log('\n📊 NPC Spawn Verification Results:')
    console.log('════════════════════════════════════════════════════════════')

    console.log('🔧 System Status:')
    for (const [system, status] of Object.entries(results.systems)) {
      console.log(`   ${status ? '✅' : '❌'} ${system}: ${status ? 'LOADED' : 'MISSING'}`)
    }

    console.log('\n🏭 Spawner Status:')
    console.log(`   Total Spawners: ${results.summary.totalSpawners}`)
    console.log(`   Active Spawners: ${results.summary.activeSpawners}`)
    console.log(`   Spawners with Entities: ${results.summary.spawnersWithEntities}`)

    console.log('\n👥 Entity Status:')
    console.log(`   Spawned Entities: ${results.summary.totalEntities}`)
    console.log(`   NPCs: ${results.summary.totalNpcs}`)
    console.log(`   Visual Entities: ${results.summary.totalVisuals}`)

    if (results.spawners.length > 0) {
      console.log('\n📍 Spawner Details:')
      results.spawners.forEach(spawner => {
        console.log(`   ${spawner.id}:`)
        console.log(`     Position: [${spawner.position.x}, ${spawner.position.y}, ${spawner.position.z}]`)
        console.log(`     Active: ${spawner.isActive ? 'YES' : 'NO'}`)
        console.log(`     Entities: ${spawner.activeEntities}/${spawner.maxEntities}`)
        console.log(`     Types: ${spawner.entityDefinitions.map(def => def.entityType).join(', ')}`)
      })
    }

    if (results.npcs.length > 0) {
      console.log('\n🤖 NPC Details:')
      results.npcs.forEach(npc => {
        console.log(`   ${npc.name || npc.id}:`)
        console.log(`     Type: ${npc.type}`)
        console.log(`     Position: [${npc.position.x}, ${npc.position.y}, ${npc.position.z}]`)
        console.log(`     State: ${npc.state}`)
      })
    }

    if (results.visuals.length > 0) {
      console.log('\n👁️ Visual Details:')
      results.visuals.forEach(visual => {
        console.log(`   ${visual.id}:`)
        console.log(`     Entity: ${visual.entityId}`)
        console.log(`     Type: ${visual.type}`)
        console.log(`     Color: ${visual.color}`)
        console.log(`     Visible: ${visual.visible ? 'YES' : 'NO'}`)
      })
    }

    // Determine test result
    const hasSpawners = results.summary.totalSpawners > 0
    const hasActiveSpawners = results.summary.activeSpawners > 0
    const hasEntities = results.summary.totalEntities > 0
    const hasNpcs = results.summary.totalNpcs > 0
    const hasVisuals = results.summary.totalVisuals > 0

    console.log('\n🏁 Final Assessment:')
    console.log(`   Spawners Configured: ${hasSpawners ? '✅' : '❌'}`)
    console.log(`   Spawners Active: ${hasActiveSpawners ? '✅' : '❌'}`)
    console.log(`   Entities Spawned: ${hasEntities ? '✅' : '❌'}`)
    console.log(`   NPCs Created: ${hasNpcs ? '✅' : '❌'}`)
    console.log(`   Visuals Rendered: ${hasVisuals ? '✅' : '❌'}`)

    // Save results
    const timestamp = Date.now()
    const resultFile = path.join(CONFIG.resultDir, `npc-spawn-verification-${timestamp}.json`)
    await fs.writeJson(
      resultFile,
      {
        timestamp,
        config: CONFIG,
        results,
        assessment: {
          hasSpawners,
          hasActiveSpawners,
          hasEntities,
          hasNpcs,
          hasVisuals,
        },
      },
      { spaces: 2 }
    )

    console.log(`\n💾 Results saved to: ${resultFile}`)

    const allSystemsWorking = hasSpawners && hasActiveSpawners && (hasEntities || hasNpcs)
    if (allSystemsWorking) {
      console.log('\n🎉 NPC Spawn Verification: PASSED')
      console.log('✅ NPCs are spawning correctly!')
    } else {
      console.log('\n⚠️ NPC Spawn Verification: PARTIAL/FAILED')
      if (!hasSpawners) console.log('❌ No spawners configured')
      if (!hasActiveSpawners) console.log('❌ No active spawners')
      if (!hasEntities && !hasNpcs) console.log('❌ No entities or NPCs found')
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

main().catch(console.error)
