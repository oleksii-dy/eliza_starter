#!/usr/bin/env node

import puppeteer from 'puppeteer'
import fs from 'fs-extra'
import path from 'path'

const RECORDINGS_DIR = 'test-recordings'

async function testScreenshotRecording() {
  console.log('🧪 Testing screenshot-based recording...')

  await fs.ensureDir(RECORDINGS_DIR)

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080 })

  // Capture console errors
  page.on('console', msg => {
    const type = msg.type()
    const text = msg.text()
    if (type === 'error' || type === 'warning') {
      console.log(`🚨 ${type}: ${text}`)
    }
  })

  // Navigate
  console.log('🌍 Loading...')
  await page.goto('http://localhost:4445', { waitUntil: 'networkidle0', timeout: 30000 })

  // Wait for canvas
  await page.waitForSelector('canvas', { timeout: 15000 })
  console.log('🎨 Canvas found, waiting for scene...')
  await new Promise(resolve => setTimeout(resolve, 5000))

  // Take a few test screenshots
  console.log('📸 Taking test screenshots...')
  const screenshots = []

  for (let i = 0; i < 5; i++) {
    try {
      const screenshot = await page.screenshot({
        type: 'jpeg',
        quality: 80,
        fullPage: false,
      })
      screenshots.push(screenshot)
      console.log(`📸 Screenshot ${i + 1} captured (${Math.round(screenshot.length / 1024)}KB)`)
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error('Screenshot failed:', error)
      break
    }
  }

  // Save screenshots
  for (let i = 0; i < screenshots.length; i++) {
    const screenshotPath = path.join(RECORDINGS_DIR, `screenshot_${i + 1}.jpg`)
    await fs.writeFile(screenshotPath, screenshots[i])
    console.log(`💾 Saved: ${screenshotPath}`)
  }

  await browser.close()
  console.log(`✅ Test completed! Captured ${screenshots.length} screenshots`)
  return screenshots.length > 0
}

// Check if server is running
try {
  const response = await fetch('http://localhost:4445')
  if (!response.ok) throw new Error('Server not responding')
  console.log('✅ Server is running')
} catch (error) {
  console.error('❌ Start client first: bun run dev:vite')
  process.exit(1)
}

testScreenshotRecording()
  .then(success => {
    console.log(success ? '🎉 Test successful!' : '❌ Test failed!')
  })
  .catch(console.error)
