#!/usr/bin/env node

/**
 * Minimal RPG Visual Test
 *
 * Simple test to verify the world loads and shows content
 */

import 'dotenv-flow/config'
import { chromium } from 'playwright'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SCREENSHOT_DIR = join(__dirname, '..', 'minimal-test-screenshots')
const BACKEND_PORT = 3000

// Ensure screenshot directory exists
await fs.mkdir(SCREENSHOT_DIR, { recursive: true })

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runMinimalTest() {
  console.log('\n🧪 Minimal RPG World Test')
  console.log('==========================')

  let backendServer = null
  let devServer = null
  let browser = null

  try {
    // Kill existing servers
    console.log('🧹 Cleaning up...')
    spawn('pkill', ['-f', 'node build/index.js'], { shell: true })
    spawn('pkill', ['-f', 'vite'], { shell: true })
    await delay(2000)

    // Build project
    console.log('🔨 Building...')
    const buildProcess = spawn('npm', ['run', 'build:no-typecheck'], {
      shell: true,
      stdio: 'inherit',
    })

    await new Promise((resolve, reject) => {
      buildProcess.on('close', code => {
        if (code === 0) resolve()
        else reject(new Error(`Build failed with code ${code}`))
      })
    })

    // Start backend
    console.log('🚀 Starting backend...')
    backendServer = spawn('npm', ['start'], {
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, PORT: BACKEND_PORT },
    })

    backendServer.stdout.on('data', data => {
      const output = data.toString()
      if (output.includes('[VisualRepresentationSystem]') || output.includes('running on port')) {
        console.log('Backend:', output.trim())
      }
    })

    // Wait for backend
    await delay(10000)

    // Start frontend
    console.log('🌐 Starting frontend...')
    devServer = spawn('npm', ['run', 'dev:vite'], {
      shell: true,
      stdio: 'pipe',
    })

    let frontendPort = null
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Frontend timeout')), 30000)

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

    const testUrl = `http://localhost:${frontendPort}`
    console.log(`✅ Test environment ready: ${testUrl}`)

    // Launch browser
    console.log('🌐 Launching browser...')
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    })

    const page = await context.newPage()

    // Listen to console logs
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('[RPG Testing]') || text.includes('[TEST]')) {
        console.log(`Browser Console: ${text}`)
      }
    })

    // Navigate and wait
    console.log('📍 Loading world...')
    await page.goto(testUrl)

    // Take screenshots every 5 seconds for 30 seconds
    console.log('📸 Monitoring world load...')

    for (let i = 0; i < 6; i++) {
      await delay(5000)
      const screenshotPath = join(SCREENSHOT_DIR, `world-load-${i * 5}s.png`)
      await page.screenshot({ path: screenshotPath })
      console.log(`   Screenshot ${i + 1}/6: ${i * 5}s`)

      // Check world state and console logs
      const worldState = await page.evaluate(() => {
        const world = window.world
        if (!world) return { status: 'no_world' }

        // Check for any test-related console output
        console.log('[TEST] Checking for test helpers:', {
          hasRpgTestHelpers: !!window.rpgTestHelpers,
          worldExists: !!world,
          worldFrame: world.frame,
          systemsCount: world.systems?.length,
          hasGraphics: !!world.graphics?.renderer,
        })

        return {
          status: 'world_exists',
          frame: world.frame || 0,
          systems: world.systems?.length || 0,
          graphics: !!world.graphics?.renderer,
          entities: world.entities?.getAll?.()?.length || 0,
          rpgSystems: window.rpgTestHelpers ? 'available' : 'not_available',
        }
      })

      console.log(`   World state: ${JSON.stringify(worldState)}`)

      // If world is loaded with graphics, we can stop early
      if (worldState.graphics && worldState.systems > 0) {
        console.log('✅ World loaded with graphics!')
        break
      }
    }

    // Final screenshot
    const finalPath = join(SCREENSHOT_DIR, 'final-state.png')
    await page.screenshot({ path: finalPath })

    console.log('\n📊 Test Complete')
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`)

    return true
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    return false
  } finally {
    // Cleanup
    if (browser) await browser.close()
    if (backendServer) backendServer.kill()
    if (devServer) devServer.kill()
    await delay(1000)
  }
}

// Run test
const success = await runMinimalTest()
process.exit(success ? 0 : 1)
