#!/usr/bin/env node

/**
 * Render Debug Test
 *
 * Test to diagnose why objects added to scene aren't being rendered
 */

import 'dotenv-flow/config'
import { chromium } from 'playwright'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SCREENSHOT_DIR = join(__dirname, '..', 'render-debug-test')
const BACKEND_PORT = 3000

// Ensure screenshot directory exists
await fs.mkdir(SCREENSHOT_DIR, { recursive: true })

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runRenderDebugTest() {
  console.log('\n🖼️ Render Debug Test')
  console.log('=======================')

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
      if (text.includes('[RenderDebug]') || text.includes('ERROR') || text.includes('Warning')) {
        console.log(`Browser: ${text}`)
      }
    })

    // Navigate and wait for world to load
    console.log('📍 Loading world...')
    await page.goto(testUrl)
    await delay(5000)

    // Test render system
    const renderInfo = await page.evaluate(() => {
      console.log('[RenderDebug] Starting render debug test...')

      const world = window.world
      if (!world) {
        return { error: 'No world' }
      }

      const scene = world.stage?.scene
      const camera = world.camera
      const graphics = world.graphics

      if (!scene) {
        return { error: 'No scene' }
      }

      if (!camera) {
        return { error: 'No camera' }
      }

      if (!graphics) {
        return { error: 'No graphics system' }
      }

      console.log('[RenderDebug] Scene, camera, and graphics available')
      console.log('[RenderDebug] Scene children count:', scene.children.length)
      console.log('[RenderDebug] Camera position:', camera.position)
      console.log('[RenderDebug] Camera rotation:', camera.rotation)

      // Check renderer
      const renderer = graphics.renderer
      if (!renderer) {
        return { error: 'No renderer' }
      }

      console.log('[RenderDebug] Renderer available')
      console.log('[RenderDebug] Renderer size:', renderer.getSize(new window.THREE.Vector2()))
      console.log('[RenderDebug] Renderer clear color:', renderer.getClearColor())

      // Add a very simple test object
      const THREE = window.THREE
      const geometry = new THREE.BoxGeometry(5, 5, 5)
      const material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: false,
        opacity: 1.0,
      })
      const cube = new THREE.Mesh(geometry, material)
      cube.position.set(0, 0, -10) // Far enough to be visible
      scene.add(cube)
      console.log('[RenderDebug] Added test cube to scene')

      // Force manual render
      try {
        console.log('[RenderDebug] Attempting manual render...')
        graphics.render()
        console.log('[RenderDebug] Manual render completed')
      } catch (error) {
        console.log('[RenderDebug] Manual render failed:', error)
      }

      // Check if there's a render loop
      const hasRenderLoop = world.engine && typeof world.engine.render === 'function'
      console.log('[RenderDebug] Has render loop:', hasRenderLoop)

      return {
        success: true,
        sceneChildren: scene.children.length,
        cameraPosition: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        rendererSize: renderer.getSize(new THREE.Vector2()),
        hasRenderLoop,
      }
    })

    console.log('🖼️ Render info:', renderInfo)

    // Take screenshot after manual render
    const renderPath = join(SCREENSHOT_DIR, '1-after-manual-render.png')
    await page.screenshot({ path: renderPath })
    console.log('📸 Screenshot after manual render taken')

    // Try to trigger animation frame and render
    await page.evaluate(() => {
      console.log('[RenderDebug] Requesting animation frame...')
      requestAnimationFrame(() => {
        console.log('[RenderDebug] Animation frame callback executing')
        if (window.world?.graphics?.render) {
          window.world.graphics.render()
          console.log('[RenderDebug] Rendered in animation frame')
        }
      })
    })

    await delay(1000)

    const animFramePath = join(SCREENSHOT_DIR, '2-after-animation-frame.png')
    await page.screenshot({ path: animFramePath })
    console.log('📸 Screenshot after animation frame taken')

    // Check viewport and canvas
    const canvasInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      if (!canvas) {
        return { error: 'No canvas element' }
      }

      return {
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        style: {
          width: canvas.style.width,
          height: canvas.style.height,
          display: canvas.style.display,
          visibility: canvas.style.visibility,
        },
      }
    })

    console.log('🖼️ Canvas info:', canvasInfo)

    console.log('\n✅ Render Debug Test Complete!')
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
const success = await runRenderDebugTest()
process.exit(success ? 0 : 1)
