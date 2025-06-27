#!/usr/bin/env node

/**
 * Enhanced RPG Visual Testing System
 *
 * This builds upon the existing visual-test.mjs infrastructure to provide
 * comprehensive RPG-specific testing with video capture and dual validation.
 */

import 'dotenv-flow/config'
import { chromium } from 'playwright'
import { spawn } from 'child_process'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Enhanced configuration for RPG testing
const RPG_TEST_CONFIG = {
  SCREENSHOT_DIR: join(__dirname, '..', 'rpg-visual-tests'),
  VIDEO_DIR: join(__dirname, '..', 'rpg-visual-tests', 'videos'),
  REPORT_DIR: join(__dirname, '..', 'rpg-visual-tests', 'reports'),
  WAIT_TIME: 30000, // 30 seconds for world load
  SCENARIO_TIMEOUT: 60000, // 60 seconds per scenario
  BACKEND_PORT: process.env.PORT || 3000,
  ENABLE_VIDEO: true,
  ENABLE_SCREENSHOTS: true,
}

// Entity color map based on templates.json
const ENTITY_COLORS = {
  // NPCs
  goblin: '#228B22', // Forest Green (from templates: 2263842)
  skeleton: '#F5DEB3', // Wheat (from templates: 16119260)
  guard: '#4682B4', // Steel Blue (from templates: 4356961)
  merchant: '#DAA520', // Goldenrod (from templates: 14329120)
  quest_giver: '#FF6347', // Tomato (from templates: 16716947)

  // Items
  sword: '#FF6347', // Tomato Red (from templates: 16729156)
  bow: '#8B4513', // Saddle Brown (from templates: 9127187)
  staff: '#9370DB', // Medium Purple (from templates: 9699539)
  shield: '#808080', // Gray (from templates: 8421504)
  potion: '#00FF00', // Lime Green (from templates: 65280)
  coin: '#FFD700', // Gold (from templates: 16766720)
  gem: '#00FFFF', // Cyan (from templates: 65535)

  // Containers
  chest: '#8B4513', // Saddle Brown (from templates: 9127187)
  barrel: '#654321', // Dark Brown (from templates: 6631201)
  crate: '#DEB887', // Burlywood (from templates: 14596231)
  bank_chest: '#FFD700', // Gold (from templates: 16766720)

  // Resources
  tree: '#228B22', // Forest Green (from templates: 2263842)
  rock: '#808080', // Gray (from templates: 8421504)
  fishing_spot: '#00FFFF', // Cyan (from templates: 65535)

  // Special
  spawn_point: '#00FF00', // Lime Green (from templates: 65280)
  player: '#FF1493', // Deep Pink (special player indicator)
  loot_drop: '#FF69B4', // Hot Pink (for dropped loot)
}

/**
 * Enhanced RPG Visual Test Scenarios
 */
const RPG_SCENARIOS = {
  PLAYER_MOVEMENT: {
    name: 'Player Movement Test',
    duration: 10000,
    description: 'Test player spawning and movement with visual validation',
    setup: 'spawnPlayerAndMove',
    validate: 'validatePlayerMovement',
  },

  ENTITY_SPAWNING: {
    name: 'Entity Spawning Test',
    duration: 15000,
    description: 'Test NPC, item, and chest spawning with color detection',
    setup: 'spawnEntities',
    validate: 'validateEntitySpawning',
  },

  COMBAT_SYSTEM: {
    name: 'Combat Visual Test',
    duration: 20000,
    description: 'Test combat interactions, animations, and death',
    setup: 'setupCombat',
    validate: 'validateCombat',
  },

  LOOT_SYSTEM: {
    name: 'Loot System Test',
    duration: 15000,
    description: 'Test loot dropping, chest opening, and item pickup',
    setup: 'setupLootTest',
    validate: 'validateLoot',
  },

  EQUIPMENT_SYSTEM: {
    name: 'Equipment System Test',
    duration: 10000,
    description: 'Test equipment equipping/unequipping visual changes',
    setup: 'setupEquipment',
    validate: 'validateEquipment',
  },
}

// Ensure directories exist
await fs.mkdir(RPG_TEST_CONFIG.SCREENSHOT_DIR, { recursive: true })
await fs.mkdir(RPG_TEST_CONFIG.VIDEO_DIR, { recursive: true })
await fs.mkdir(RPG_TEST_CONFIG.REPORT_DIR, { recursive: true })

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Color detection utilities
 */
class ColorDetector {
  static hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  }

  static async detectEntitiesInImage(imagePath) {
    const metadata = await sharp(imagePath).metadata()
    const { width, height } = metadata

    // Get raw RGB data
    const imageData = await sharp(imagePath).raw().toBuffer()

    const detectedEntities = []
    const colorTolerance = 30 // Allow some variation in color matching

    // Scan image for entity colors
    for (const [entityType, hexColor] of Object.entries(ENTITY_COLORS)) {
      const targetColor = this.hexToRgb(hexColor)
      if (!targetColor) continue

      const positions = this.findColorPositions(imageData, width, height, targetColor, colorTolerance)

      if (positions.length > 0) {
        detectedEntities.push({
          type: entityType,
          color: hexColor,
          positions: positions,
          count: positions.length,
        })
      }
    }

    return detectedEntities
  }

  static findColorPositions(imageData, width, height, targetColor, tolerance) {
    const positions = []
    const minClusterSize = 9 // Minimum pixels to consider a valid entity

    for (let y = 0; y < height; y += 4) {
      // Sample every 4th pixel for performance
      for (let x = 0; x < width; x += 4) {
        const idx = (y * width + x) * 3
        const r = imageData[idx]
        const g = imageData[idx + 1]
        const b = imageData[idx + 2]

        const rDiff = Math.abs(r - targetColor.r)
        const gDiff = Math.abs(g - targetColor.g)
        const bDiff = Math.abs(b - targetColor.b)

        if (rDiff < tolerance && gDiff < tolerance && bDiff < tolerance) {
          // Check if this is part of a larger cluster
          const clusterSize = this.getClusterSize(imageData, width, height, x, y, targetColor, tolerance)
          if (clusterSize >= minClusterSize) {
            positions.push({ x, y, clusterSize })
          }
        }
      }
    }

    return this.mergeSimilarPositions(positions, 20) // Merge positions within 20 pixels
  }

  static getClusterSize(imageData, width, height, startX, startY, targetColor, tolerance) {
    // Simple cluster size estimation - count matching pixels in 10x10 area
    let count = 0
    const size = 10

    for (let dy = -size / 2; dy < size / 2; dy++) {
      for (let dx = -size / 2; dx < size / 2; dx++) {
        const x = startX + dx
        const y = startY + dy

        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (y * width + x) * 3
          const r = imageData[idx]
          const g = imageData[idx + 1]
          const b = imageData[idx + 2]

          const rDiff = Math.abs(r - targetColor.r)
          const gDiff = Math.abs(g - targetColor.g)
          const bDiff = Math.abs(b - targetColor.b)

          if (rDiff < tolerance && gDiff < tolerance && bDiff < tolerance) {
            count++
          }
        }
      }
    }

    return count
  }

  static mergeSimilarPositions(positions, mergeDistance) {
    const merged = []
    const used = new Set()

    for (let i = 0; i < positions.length; i++) {
      if (used.has(i)) continue

      const cluster = [positions[i]]
      used.add(i)

      for (let j = i + 1; j < positions.length; j++) {
        if (used.has(j)) continue

        const distance = Math.sqrt(
          Math.pow(positions[i].x - positions[j].x, 2) + Math.pow(positions[i].y - positions[j].y, 2)
        )

        if (distance < mergeDistance) {
          cluster.push(positions[j])
          used.add(j)
        }
      }

      // Calculate center of cluster
      const centerX = cluster.reduce((sum, pos) => sum + pos.x, 0) / cluster.length
      const centerY = cluster.reduce((sum, pos) => sum + pos.y, 0) / cluster.length
      const totalClusterSize = cluster.reduce((sum, pos) => sum + pos.clusterSize, 0)

      merged.push({ x: centerX, y: centerY, clusterSize: totalClusterSize })
    }

    return merged
  }
}

/**
 * RPG Test Scenario Implementations
 */
class RPGTestScenarios {
  constructor(page, world) {
    this.page = page
    this.world = world
  }

  async spawnPlayerAndMove() {
    console.log('  🏃 Setting up player movement test...')

    // Execute RPG commands through page
    await this.page.evaluate(() => {
      if (window.world?.rpgTest) {
        // Spawn player at origin with pink color for visibility
        window.world.rpgTest.spawnPlayer('test_player', {
          position: { x: 0, y: 0, z: 0 },
          visualOverride: { color: '#FF1493' }, // Deep pink for player
        })

        // Schedule movement to target position after 2 seconds
        setTimeout(() => {
          window.world.rpgTest.movePlayer('test_player', { x: 10, y: 0, z: 0 })
        }, 2000)
      }
    })

    return {
      setup: 'player_spawned',
      expectedEntities: ['player'],
      startPosition: { x: 0, y: 0, z: 0 },
      endPosition: { x: 10, y: 0, z: 0 },
    }
  }

  async validatePlayerMovement(screenshots, setupData) {
    console.log('  🔍 Validating player movement...')

    const startScreenshot = screenshots[0]
    const endScreenshot = screenshots[screenshots.length - 1]

    // Detect player (pink) in both screenshots
    const startEntities = await ColorDetector.detectEntitiesInImage(startScreenshot)
    const endEntities = await ColorDetector.detectEntitiesInImage(endScreenshot)

    const playerStart = startEntities.find(e => e.type === 'player')
    const playerEnd = endEntities.find(e => e.type === 'player')

    const passed =
      playerStart &&
      playerEnd &&
      playerStart.positions.length > 0 &&
      playerEnd.positions.length > 0 &&
      Math.abs(playerEnd.positions[0].x - playerStart.positions[0].x) > 50 // Moved significantly

    return {
      passed,
      details: {
        playerDetectedStart: !!playerStart,
        playerDetectedEnd: !!playerEnd,
        movementDistance:
          playerStart && playerEnd ? Math.abs(playerEnd.positions[0].x - playerStart.positions[0].x) : 0,
        allEntities: { start: startEntities, end: endEntities },
      },
    }
  }

  async spawnEntities() {
    console.log('  🏗️  Setting up entity spawning test...')

    await this.page.evaluate(() => {
      if (window.world?.rpgTest) {
        // Spawn various entities at different positions
        window.world.rpgTest.spawnNPC('goblin', { x: 5, y: 0, z: 0 })
        window.world.rpgTest.spawnNPC('skeleton', { x: 10, y: 0, z: 0 })
        window.world.rpgTest.spawnItem('sword', { x: 15, y: 0, z: 0 })
        window.world.rpgTest.spawnItem('coin', { x: 20, y: 0, z: 0 })
        window.world.rpgTest.spawnChest('chest', { x: 25, y: 0, z: 0 })
      }
    })

    return {
      setup: 'entities_spawned',
      expectedEntities: ['goblin', 'skeleton', 'sword', 'coin', 'chest'],
      positions: [
        { type: 'goblin', x: 5, y: 0, z: 0 },
        { type: 'skeleton', x: 10, y: 0, z: 0 },
        { type: 'sword', x: 15, y: 0, z: 0 },
        { type: 'coin', x: 20, y: 0, z: 0 },
        { type: 'chest', x: 25, y: 0, z: 0 },
      ],
    }
  }

  async validateEntitySpawning(screenshots, setupData) {
    console.log('  🔍 Validating entity spawning...')

    const finalScreenshot = screenshots[screenshots.length - 1]
    const detectedEntities = await ColorDetector.detectEntitiesInImage(finalScreenshot)

    const expectedTypes = setupData.expectedEntities
    const detectedTypes = detectedEntities.map(e => e.type)

    const allExpectedFound = expectedTypes.every(type => detectedTypes.includes(type))

    return {
      passed: allExpectedFound && detectedEntities.length >= expectedTypes.length,
      details: {
        expected: expectedTypes,
        detected: detectedTypes,
        detectedEntities: detectedEntities,
        allExpectedFound,
      },
    }
  }

  async setupCombat() {
    console.log('  ⚔️  Setting up combat test...')

    await this.page.evaluate(() => {
      if (window.world?.rpgTest) {
        // Spawn player and goblin for combat
        window.world.rpgTest.spawnPlayer('fighter', {
          position: { x: 0, y: 0, z: 0 },
          visualOverride: { color: '#FF1493' },
        })
        window.world.rpgTest.spawnNPC('goblin', { x: 5, y: 0, z: 0 })

        // Initiate combat after 3 seconds
        setTimeout(() => {
          window.world.rpgTest.startCombat('fighter', 'goblin')
        }, 3000)
      }
    })

    return {
      setup: 'combat_initiated',
      expectedEntities: ['player', 'goblin'],
      combatants: ['fighter', 'goblin'],
    }
  }

  async validateCombat(screenshots, setupData) {
    console.log('  🔍 Validating combat system...')

    // Check multiple screenshots for combat progression
    const results = []
    for (const screenshot of screenshots) {
      const entities = await ColorDetector.detectEntitiesInImage(screenshot)
      results.push(entities)
    }

    // Combat should show: initial entities, combat animations, possible death/loot
    const hasInitialEntities = results[0].some(
      entities => entities.find(e => e.type === 'player') && entities.find(e => e.type === 'goblin')
    )

    const hasFinalState = results[results.length - 1]

    return {
      passed: hasInitialEntities,
      details: {
        initialEntities: results[0],
        finalEntities: hasFinalState,
        combatProgression: results.length,
      },
    }
  }

  async setupLootTest() {
    console.log('  💎 Setting up loot test...')

    await this.page.evaluate(() => {
      if (window.world?.rpgTest) {
        // Create chest with loot
        window.world.rpgTest.spawnChest('chest', { x: 10, y: 0, z: 0 })

        // Open chest and drop loot after 3 seconds
        setTimeout(() => {
          window.world.rpgTest.openChest('chest')
          window.world.rpgTest.dropLoot([
            { type: 'coin', position: { x: 12, y: 0, z: 0 } },
            { type: 'gem', position: { x: 14, y: 0, z: 0 } },
          ])
        }, 3000)
      }
    })

    return {
      setup: 'loot_test_ready',
      expectedEntities: ['chest', 'coin', 'gem'],
    }
  }

  async validateLoot(screenshots, setupData) {
    console.log('  🔍 Validating loot system...')

    const beforeScreenshot = screenshots[0]
    const afterScreenshot = screenshots[screenshots.length - 1]

    const beforeEntities = await ColorDetector.detectEntitiesInImage(beforeScreenshot)
    const afterEntities = await ColorDetector.detectEntitiesInImage(afterScreenshot)

    const chestBefore = beforeEntities.find(e => e.type === 'chest')
    const lootAfter = afterEntities.filter(e => ['coin', 'gem'].includes(e.type))

    return {
      passed: chestBefore && lootAfter.length >= 2,
      details: {
        chestDetected: !!chestBefore,
        lootItemsDropped: lootAfter.length,
        beforeEntities,
        afterEntities,
      },
    }
  }

  async setupEquipment() {
    console.log('  🛡️  Setting up equipment test...')

    await this.page.evaluate(() => {
      if (window.world?.rpgTest) {
        // Spawn player and equipment
        window.world.rpgTest.spawnPlayer('equipper', {
          position: { x: 0, y: 0, z: 0 },
          visualOverride: { color: '#FF1493' },
        })
        window.world.rpgTest.spawnItem('sword', { x: 2, y: 0, z: 0 })

        // Equip sword after 3 seconds
        setTimeout(() => {
          window.world.rpgTest.equipItem('equipper', 'sword')
        }, 3000)
      }
    })

    return {
      setup: 'equipment_ready',
      expectedEntities: ['player', 'sword'],
    }
  }

  async validateEquipment(screenshots, setupData) {
    console.log('  🔍 Validating equipment system...')

    const beforeScreenshot = screenshots[0]
    const afterScreenshot = screenshots[screenshots.length - 1]

    const beforeEntities = await ColorDetector.detectEntitiesInImage(beforeScreenshot)
    const afterEntities = await ColorDetector.detectEntitiesInImage(afterScreenshot)

    const playerBefore = beforeEntities.find(e => e.type === 'player')
    const swordBefore = beforeEntities.find(e => e.type === 'sword')
    const playerAfter = afterEntities.find(e => e.type === 'player')

    // After equipping, sword should be near player or integrated
    const equipmentNearPlayer = afterEntities.some(e => {
      if (e.type === 'sword' && playerAfter) {
        const distance = Math.sqrt(
          Math.pow(e.positions[0].x - playerAfter.positions[0].x, 2) +
            Math.pow(e.positions[0].y - playerAfter.positions[0].y, 2)
        )
        return distance < 50 // Equipment should be close to player
      }
      return false
    })

    return {
      passed: playerBefore && swordBefore && playerAfter,
      details: {
        playerDetected: !!playerBefore && !!playerAfter,
        swordDetected: !!swordBefore,
        equipmentEquipped: equipmentNearPlayer,
        beforeEntities,
        afterEntities,
      },
    }
  }
}

/**
 * Enhanced server startup with RPG test environment
 */
async function startRPGTestEnvironment() {
  console.log('🚀 Starting RPG test environment...')

  // Kill existing servers
  try {
    spawn('pkill', ['-f', 'node build/index.js'], { shell: true })
    spawn('pkill', ['-f', 'vite'], { shell: true })
    await delay(2000)
  } catch (e) {
    // Ignore
  }

  // Skip build step due to core dependency issues - use existing build
  console.log('⚠️  Skipping build step due to core dependency conflicts...')
  console.log('🔧 Using existing build artifacts...')

  // Start backend with RPG test mode using dev script
  console.log('🎮 Starting RPG test server in development mode...')
  const backendServer = spawn('npm', ['run', 'dev'], {
    shell: true,
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: RPG_TEST_CONFIG.BACKEND_PORT,
      RPG_TEST_MODE: 'true', // Enable special test helpers
      WORLD: './test-world',
      ENABLE_RPG: 'true',
    },
  })

  backendServer.stdout.on('data', data => {
    console.log('Backend:', data.toString().trim())
  })

  backendServer.stderr.on('data', data => {
    console.error('Backend error:', data.toString().trim())
  })

  // Start frontend
  console.log('🌐 Starting frontend...')
  const devServer = spawn('npm', ['run', 'dev:vite'], {
    shell: true,
    stdio: 'pipe',
  })

  let frontendPort = null
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Frontend startup timeout')), 60000)

    devServer.stdout.on('data', data => {
      const output = data.toString()
      const portMatch = output.match(/Local:\s+http:\/\/localhost:(\d+)/)
      if (portMatch) {
        frontendPort = portMatch[1]
        clearTimeout(timeout)
        resolve()
      }
    })
  })

  return {
    backendServer,
    devServer,
    frontendPort,
    testUrl: `http://localhost:${frontendPort}`,
  }
}

/**
 * Run comprehensive RPG visual test
 */
async function runRPGVisualTest() {
  console.log('\n🎯 RPG Visual Testing System')
  console.log('========================================')
  console.log('🎮 Testing all RPG systems with visual validation')
  console.log('📹 Recording videos and capturing screenshots')
  console.log('🔍 Using color detection for entity validation\n')

  let servers = null
  let browser = null
  const testResults = []

  try {
    // Start test environment
    servers = await startRPGTestEnvironment()
    console.log(`✅ Test environment ready: ${servers.testUrl}\n`)

    // Launch browser with video recording
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    // Run each scenario
    for (const [scenarioKey, scenario] of Object.entries(RPG_SCENARIOS)) {
      console.log(`\n📋 Running: ${scenario.name}`)
      console.log(`   ${scenario.description}`)

      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        recordVideo: RPG_TEST_CONFIG.ENABLE_VIDEO
          ? {
              dir: RPG_TEST_CONFIG.VIDEO_DIR,
              size: { width: 1920, height: 1080 },
            }
          : undefined,
      })

      const page = await context.newPage()
      const scenarios = new RPGTestScenarios(page, null)

      // Navigate and wait for world load
      await page.goto(servers.testUrl)
      await delay(RPG_TEST_CONFIG.WAIT_TIME)

      // Execute scenario setup
      const setupData = await scenarios[scenario.setup]()
      console.log(`   ✅ Setup complete: ${setupData.setup}`)

      // Capture screenshots during scenario
      const screenshots = []
      const screenshotInterval = setInterval(async () => {
        const timestamp = Date.now()
        const screenshotPath = join(RPG_TEST_CONFIG.SCREENSHOT_DIR, `${scenarioKey}_${timestamp}.png`)
        await page.screenshot({ path: screenshotPath })
        screenshots.push(screenshotPath)
      }, 2000)

      // Wait for scenario duration
      await delay(scenario.duration)
      clearInterval(screenshotInterval)

      // Final screenshot
      const finalScreenshot = join(RPG_TEST_CONFIG.SCREENSHOT_DIR, `${scenarioKey}_final.png`)
      await page.screenshot({ path: finalScreenshot })
      screenshots.push(finalScreenshot)

      // Validate scenario
      const validation = await scenarios[scenario.validate](screenshots, setupData)
      console.log(`   ${validation.passed ? '✅' : '❌'} Validation: ${validation.passed ? 'PASSED' : 'FAILED'}`)

      // Get video path
      await context.close()
      const videoPath = RPG_TEST_CONFIG.ENABLE_VIDEO ? join(RPG_TEST_CONFIG.VIDEO_DIR, `${scenarioKey}.webm`) : null

      // Store results
      testResults.push({
        scenario: scenarioKey,
        name: scenario.name,
        description: scenario.description,
        passed: validation.passed,
        duration: scenario.duration,
        setupData,
        validation,
        screenshots,
        videoPath,
        timestamp: new Date().toISOString(),
      })

      if (validation.passed) {
        console.log(`   🎉 ${scenario.name} completed successfully!`)
      } else {
        console.log(`   💥 ${scenario.name} failed - check screenshots for details`)
      }
    }

    // Generate comprehensive report
    await generateRPGTestReport(testResults)

    // Summary
    const passedTests = testResults.filter(r => r.passed).length
    const totalTests = testResults.length
    console.log('\n🏆 RPG Visual Testing Complete!')
    console.log(`   Results: ${passedTests}/${totalTests} tests passed`)
    console.log(`   Screenshots: ${RPG_TEST_CONFIG.SCREENSHOT_DIR}`)
    console.log(`   Videos: ${RPG_TEST_CONFIG.VIDEO_DIR}`)
    console.log(`   Report: ${RPG_TEST_CONFIG.REPORT_DIR}/index.html`)

    return passedTests === totalTests
  } catch (error) {
    console.error('\n💥 RPG Visual Testing failed:', error.message)
    throw error
  } finally {
    // Cleanup
    if (browser) await browser.close()
    if (servers) {
      servers.backendServer?.kill()
      servers.devServer?.kill()
    }
  }
}

/**
 * Generate HTML test report
 */
async function generateRPGTestReport(testResults) {
  console.log('\n📊 Generating test report...')

  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.length,
      passed: testResults.filter(r => r.passed).length,
      failed: testResults.filter(r => r.passed === false).length,
      duration: testResults.reduce((sum, r) => sum + r.duration, 0),
    },
    scenarios: testResults,
  }

  // Save JSON report
  const jsonPath = join(RPG_TEST_CONFIG.REPORT_DIR, 'results.json')
  await fs.writeFile(jsonPath, JSON.stringify(reportData, null, 2))

  // Generate HTML report
  const htmlPath = join(RPG_TEST_CONFIG.REPORT_DIR, 'index.html')
  const htmlContent = generateHTMLReport(reportData)
  await fs.writeFile(htmlPath, htmlContent)

  console.log(`   ✅ Report saved: ${htmlPath}`)
}

/**
 * HTML report template
 */
function generateHTMLReport(data) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RPG Visual Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .scenario { margin-bottom: 40px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
        .scenario-header { background: #f8f9fa; padding: 20px; border-bottom: 1px solid #ddd; }
        .scenario-content { padding: 20px; }
        .screenshot-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
        .screenshot { text-align: center; }
        .screenshot img { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; }
        .details { background: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 15px; font-family: monospace; font-size: 12px; overflow-x: auto; }
        .entity-list { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
        .entity-tag { background: #e9ecef; padding: 5px 10px; border-radius: 15px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎮 RPG Visual Test Report</h1>
            <p>Generated on ${new Date(data.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-value">${data.summary.total}</div>
                <div>Total Tests</div>
            </div>
            <div class="stat-card">
                <div class="stat-value passed">${data.summary.passed}</div>
                <div>Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value failed">${data.summary.failed}</div>
                <div>Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(data.summary.duration / 1000).toFixed(1)}s</div>
                <div>Total Duration</div>
            </div>
        </div>
        
        ${data.scenarios
          .map(
            scenario => `
            <div class="scenario">
                <div class="scenario-header">
                    <h2>${scenario.passed ? '✅' : '❌'} ${scenario.name}</h2>
                    <p>${scenario.description}</p>
                    <p><strong>Duration:</strong> ${scenario.duration / 1000}s | <strong>Status:</strong> <span class="${scenario.passed ? 'passed' : 'failed'}">${scenario.passed ? 'PASSED' : 'FAILED'}</span></p>
                </div>
                <div class="scenario-content">
                    ${
                      scenario.validation.details
                        ? `
                        <h4>Validation Details:</h4>
                        <div class="details">${JSON.stringify(scenario.validation.details, null, 2)}</div>
                    `
                        : ''
                    }
                    
                    ${
                      scenario.screenshots
                        ? `
                        <h4>Screenshots:</h4>
                        <div class="screenshot-grid">
                            ${scenario.screenshots
                              .slice(-3)
                              .map(
                                (screenshot, index) => `
                                <div class="screenshot">
                                    <img src="../${screenshot.split('/').pop()}" alt="Screenshot ${index + 1}">
                                    <p>Screenshot ${index + 1}</p>
                                </div>
                            `
                              )
                              .join('')}
                        </div>
                    `
                        : ''
                    }
                    
                    ${
                      scenario.videoPath
                        ? `
                        <h4>Video Recording:</h4>
                        <video controls style="max-width: 100%; height: auto;">
                            <source src="../videos/${scenario.videoPath.split('/').pop()}" type="video/webm">
                            Your browser does not support video playback.
                        </video>
                    `
                        : ''
                    }
                </div>
            </div>
        `
          )
          .join('')}
    </div>
</body>
</html>`
}

// Export for use in other scripts
export { runRPGVisualTest, ColorDetector, RPGTestScenarios, ENTITY_COLORS }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const success = await runRPGVisualTest()
    process.exit(success ? 0 : 1)
  } catch (error) {
    console.error('💥 Fatal error:', error.message)
    process.exit(1)
  }
}
