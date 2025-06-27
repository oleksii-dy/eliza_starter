#!/usr/bin/env node

import puppeteer from 'puppeteer'
import { spawn } from 'child_process'
import fs from 'fs-extra'
import path from 'path'

const RECORDINGS_DIR = 'live-gameplay-recordings'

async function recordGameplaySession(scenario, duration = 60000) {
  console.log(`🎥 Recording ${scenario} for ${duration / 1000} seconds...`)

  // Ensure recordings directory exists
  await fs.ensureDir(RECORDINGS_DIR)

  const browser = await puppeteer.launch({
    headless: false, // Show browser for visual confirmation
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--enable-logging',
      '--log-level=0',
    ],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080 })

  // Capture console errors and logs
  page.on('console', msg => {
    const type = msg.type()
    if (type === 'error' || type === 'warning') {
      console.log(`🚨 Browser ${type}: ${msg.text()}`)
    }
  })

  page.on('pageerror', error => {
    console.log(`❌ Page error: ${error.message}`)
  })

  page.on('requestfailed', request => {
    console.log(`📵 Request failed: ${request.url()} - ${request.failure()?.errorText}`)
  })

  // Start recording
  const timestamp = Date.now()
  const videoPath = path.join(RECORDINGS_DIR, `${scenario}_${timestamp}.webm`)

  console.log(`📹 Starting recording: ${videoPath}`)

  // Navigate to the RPG world
  console.log('🌍 Loading RPG world...')
  await page.goto('http://localhost:4445', {
    waitUntil: 'networkidle0',
    timeout: 30000,
  })

  // Wait for world to load
  await page.waitForSelector('canvas', { timeout: 15000 })
  await new Promise(resolve => setTimeout(resolve, 5000)) // Give more time for 3D world to render

  console.log('✅ World loaded, checking canvas content...')

  // Check if canvas has content and start recording
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) {
      return { error: 'No canvas found' }
    }

    // Check canvas dimensions and context
    const ctx = canvas.getContext('2d') || canvas.getContext('webgl') || canvas.getContext('webgl2')
    return {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
      contextType: ctx ? ctx.constructor.name : 'none',
      style: canvas.style.cssText,
    }
  })

  console.log('🎨 Canvas info:', canvasInfo)

  // Check WebGL context and avoid conflicts
  const contextInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return { error: 'No canvas found' }

    // Check if Three.js scene is properly rendered
    const hasWorld = typeof window.world !== 'undefined'
    const hasGraphics = hasWorld && window.world.graphics
    const hasScene = hasGraphics && window.world.graphics.scene
    const hasRenderer = hasGraphics && window.world.graphics.renderer
    const sceneChildren = hasScene ? window.world.graphics.scene.children.length : 0

    return {
      hasWorld,
      hasGraphics,
      hasScene,
      hasRenderer,
      sceneChildren,
      canvasContext: canvas.getContext ? 'supported' : 'not supported',
      rendererInfo: hasRenderer
        ? {
            contextType: window.world.graphics.renderer.getContext().constructor.name,
            domElement: !!window.world.graphics.renderer.domElement,
          }
        : null,
    }
  })

  console.log('🔍 WebGL context info:', JSON.stringify(contextInfo, null, 2))

  if (!contextInfo || !contextInfo.hasScene || contextInfo.sceneChildren === 0) {
    console.log('⚠️ Three.js scene not ready - waiting more...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Check again
    const recheck = await page.evaluate(() => {
      const hasScene = window.world && window.world.graphics && window.world.graphics.scene
      return {
        hasScene,
        sceneChildren: hasScene ? window.world.graphics.scene.children.length : 0,
      }
    })
    console.log('🔍 Recheck:', recheck)
  }

  // Use page screenshots to avoid WebGL context conflicts
  console.log('📸 Using page screenshot method to avoid WebGL conflicts...')
  window.useScreenshots = true

  // Test page screenshot to ensure it works
  console.log('🧪 Testing page screenshot method...')
  try {
    const testScreenshot = await page.screenshot({
      type: 'jpeg',
      quality: 80,
      fullPage: false,
    })

    console.log(`✅ Screenshot test successful, size: ${Math.round(testScreenshot.length / 1024)}KB`)

    // Save test screenshot for verification
    const testPath = path.join(RECORDINGS_DIR, 'test-screenshot.jpg')
    await fs.writeFile(testPath, testScreenshot)
    console.log(`💾 Test screenshot saved: ${testPath}`)
  } catch (error) {
    console.error('❌ Screenshot test failed:', error)
    throw new Error('Screenshot recording not available')
  }

  // Record gameplay using screenshots during the scenario
  console.log('🎬 Starting screenshot-based recording during gameplay...')

  const frames = []
  const startTime = Date.now()

  // Start background screenshot capture
  const capturePromise = (async () => {
    while (Date.now() - startTime < duration) {
      try {
        const screenshot = await page.screenshot({
          type: 'jpeg',
          quality: 80,
          fullPage: false,
        })
        frames.push(screenshot.toString('base64'))

        // Log progress every 30 frames
        if (frames.length % 30 === 0) {
          console.log(`📸 Captured ${frames.length} frames...`)
        }

        await new Promise(resolve => setTimeout(resolve, 100)) // 10fps
      } catch (error) {
        console.error('Screenshot capture error:', error)
        break
      }
    }
    console.log(`📸 Screenshot recording completed with ${frames.length} frames`)
  })()

  // Perform gameplay actions based on scenario (concurrent with recording)
  const gameplayPromise = performGameplayScenario(page, scenario, duration)

  // Wait for both to complete
  await Promise.all([capturePromise, gameplayPromise])

  console.log(`📸 Captured ${frames.length} frames, converting to video...`)

  if (frames.length > 0) {
    // Save frames as individual images
    const framesDir = path.join(RECORDINGS_DIR, `frames_${timestamp}`)
    await fs.ensureDir(framesDir)

    for (let i = 0; i < frames.length; i++) {
      // frames[i] is now a base64 string from screenshot buffer
      const frameData = frames[i]
      const framePath = path.join(framesDir, `frame_${i.toString().padStart(4, '0')}.jpg`)
      await fs.writeFile(framePath, Buffer.from(frameData, 'base64'))
    }

    // Convert frames to video using ffmpeg
    const mp4Path = videoPath.replace('.webm', '.mp4')
    await convertFramesToVideo(framesDir, mp4Path, frames.length)

    // Clean up frame files
    await fs.remove(framesDir)

    console.log(`✅ Recording saved: ${mp4Path}`)
    return mp4Path
  } else {
    console.log('❌ No frames captured - recording failed')
  }

  await browser.close()
  return mp4Path || videoPath
}

async function convertFramesToVideo(framesDir, outputPath, frameCount) {
  return new Promise((resolve, reject) => {
    // Calculate frame rate (assuming 30fps, but adjust based on actual duration)
    const fps = Math.min(30, Math.max(10, frameCount / 30))

    const ffmpegArgs = [
      '-framerate',
      fps.toString(),
      '-i',
      path.join(framesDir, 'frame_%04d.jpg'),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      '23',
      '-preset',
      'medium',
      '-y', // Overwrite output file
      outputPath,
    ]

    console.log(`🎬 Running ffmpeg with fps=${fps}...`)

    const ffmpeg = spawn('ffmpeg', ffmpegArgs)

    ffmpeg.stderr.on('data', data => {
      // ffmpeg outputs progress to stderr, which is normal
      // console.log(`ffmpeg: ${data}`);
    })

    ffmpeg.on('close', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`))
      }
    })

    ffmpeg.on('error', error => {
      reject(new Error(`ffmpeg failed to start: ${error.message}`))
    })
  })
}

async function performGameplayScenario(page, scenario, duration) {
  const canvas = await page.$('canvas')

  switch (scenario) {
    case 'BASIC_MOVEMENT':
      console.log('🏃 Testing basic movement...')
      // Move forward
      await page.keyboard.down('KeyW')
      await new Promise(resolve => setTimeout(resolve, 2000))
      await page.keyboard.up('KeyW')

      // Turn and move right
      await page.keyboard.down('KeyD')
      await new Promise(resolve => setTimeout(resolve, 2000))
      await page.keyboard.up('KeyD')

      // Move backward
      await page.keyboard.down('KeyS')
      await new Promise(resolve => setTimeout(resolve, 2000))
      await page.keyboard.up('KeyS')

      // Move left
      await page.keyboard.down('KeyA')
      await new Promise(resolve => setTimeout(resolve, 2000))
      await page.keyboard.up('KeyA')
      break

    case 'COMBAT_TEST':
      console.log('⚔️ Testing combat system...')
      // Look around for mobs
      await canvas.click({ x: 960, y: 540 })
      await page.mouse.move(1000, 500)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Attack sequence
      for (let i = 0; i < 5; i++) {
        await canvas.click()
        await new Promise(resolve => setTimeout(resolve, 800))
      }
      break

    case 'INVENTORY_TEST':
      console.log('🎒 Testing inventory system...')
      // Open inventory
      await page.keyboard.press('KeyI')
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Close inventory
      await page.keyboard.press('Escape')
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Open skills
      await page.keyboard.press('KeyK')
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Close skills
      await page.keyboard.press('Escape')
      break

    case 'EXPLORATION':
      console.log('🗺️ Testing world exploration...')
      // Extended movement sequence
      const movements = ['KeyW', 'KeyD', 'KeyS', 'KeyA']
      for (let i = 0; i < 8; i++) {
        const key = movements[i % movements.length]
        await page.keyboard.down(key)
        await new Promise(resolve => setTimeout(resolve, 1500))
        await page.keyboard.up(key)

        // Jump occasionally
        if (i % 3 === 0) {
          await page.keyboard.press('Space')
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      break

    default:
      console.log('🎮 Running default gameplay session...')
      // Basic interaction sequence
      await new Promise(resolve => setTimeout(resolve, duration))
  }
}

async function main() {
  const scenarios = ['BASIC_MOVEMENT', 'COMBAT_TEST', 'INVENTORY_TEST', 'EXPLORATION']

  console.log('🚀 Starting live gameplay recording session...')
  console.log('📝 Make sure the server is running on localhost:4444')
  console.log('📝 Make sure the client is running on localhost:4445')

  // Check if servers are running
  try {
    const response = await fetch('http://localhost:4445')
    if (!response.ok) {
      throw new Error('Client not responding')
    }
  } catch (error) {
    console.error('❌ Client server not running. Start with: bun run dev:vite')
    process.exit(1)
  }

  console.log('✅ Servers are running, starting recordings...')

  for (const scenario of scenarios) {
    try {
      const videoPath = await recordGameplaySession(scenario, 30000) // 30 seconds each
      console.log(`✅ Completed recording: ${scenario}`)

      // Wait between recordings
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.error(`❌ Failed to record ${scenario}:`, error)
    }
  }

  console.log('🎉 All recordings completed!')
  console.log(`📁 Check the ${RECORDINGS_DIR} folder for your videos`)
}

main().catch(console.error)
