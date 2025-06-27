#!/usr/bin/env node

/**
 * WebGL Context Check
 *
 * Quick diagnostic test to verify WebGL context is working properly
 * and can render basic 3D objects.
 */

import puppeteer from 'puppeteer'

async function checkWebGL() {
  console.log('🔧 Checking WebGL Context...')

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080 })

  try {
    // Navigate to the RPG world
    console.log('🌍 Loading world...')
    await page.goto('http://localhost:4445', { waitUntil: 'networkidle0', timeout: 30000 })
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Check WebGL status
    const webglStatus = await page.evaluate(() => {
      if (!window.world?.graphics?.renderer) {
        return { error: 'No graphics system found' }
      }

      const renderer = window.world.graphics.renderer
      const canvas = renderer.domElement
      const gl = renderer.getContext()

      // Add a test cube
      const scene = window.world.stage.scene
      const geometry = new THREE.BoxGeometry(2, 2, 2)
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
      const cube = new THREE.Mesh(geometry, material)
      cube.position.set(0, 0, -5)
      scene.add(cube)

      // Position camera
      const camera = window.world.camera
      camera.position.set(0, 0, 0)
      camera.lookAt(0, 0, -5)

      // Render
      renderer.setClearColor(0x000080, 1)
      renderer.render(scene, camera)
      gl.finish()

      // Read center pixel
      const pixels = new Uint8Array(4)
      gl.readPixels(canvas.width / 2, canvas.height / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

      return {
        success: true,
        webglVersion: gl.constructor.name,
        canvasSize: { width: canvas.width, height: canvas.height },
        rendererInfo: renderer.info.render,
        sceneChildren: scene.children.length,
        centerPixel: Array.from(pixels),
        contextWorking: pixels[1] > 200, // Green channel should be high
      }
    })

    console.log('\n📋 WebGL Status Report:')
    console.log('═'.repeat(40))

    if (webglStatus.error) {
      console.log('❌ Error:', webglStatus.error)
    } else {
      console.log(`WebGL Version: ${webglStatus.webglVersion}`)
      console.log(`Canvas Size: ${webglStatus.canvasSize.width}x${webglStatus.canvasSize.height}`)
      console.log(`Scene Objects: ${webglStatus.sceneChildren}`)
      console.log(`Render Calls: ${webglStatus.rendererInfo.calls}`)
      console.log(`Center Pixel: [${webglStatus.centerPixel.join(', ')}]`)
      console.log(`Context Status: ${webglStatus.contextWorking ? '✅ WORKING' : '❌ NOT WORKING'}`)
    }

    await browser.close()

    return webglStatus.success && webglStatus.contextWorking
  } catch (error) {
    await browser.close()
    console.error('❌ WebGL check failed:', error)
    return false
  }
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  checkWebGL()
    .then(success => {
      if (success) {
        console.log('\n🎉 WebGL context is working correctly!')
        process.exit(0)
      } else {
        console.log('\n⚠️ WebGL context has issues.')
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('❌ Check failed:', error)
      process.exit(1)
    })
}

export { checkWebGL }
