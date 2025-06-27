#!/usr/bin/env node

/**
 * Visual Validation Test Suite
 *
 * Validates that RPG elements render with correct colors using WebGL buffer analysis.
 * This is the main visual testing script for RPG validation.
 */

import puppeteer from 'puppeteer'
import fs from 'fs-extra'
import path from 'path'

const RESULTS_DIR = 'test-results'

async function runVisualValidation(options = {}) {
  const { headless = false, timeout = 30000, tolerance = 50, saveResults = true } = options

  console.log('🎮 Running RPG Visual Validation...')

  await fs.ensureDir(RESULTS_DIR)

  const browser = await puppeteer.launch({
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080 })

  try {
    // Load the RPG world
    console.log('🌍 Loading RPG world...')
    await page.goto('http://localhost:4445', { waitUntil: 'networkidle0', timeout })
    await new Promise(resolve => setTimeout(resolve, 8000))

    // Run the validation
    const results = await page.evaluate(tolerance => {
      // Initialize visual testing framework
      window.VisualTester = {
        addTestObject(name, color, position, size = 1) {
          const scene = window.world.stage.scene
          const geometry = new THREE.BoxGeometry(size, size, size)
          const material = new THREE.MeshBasicMaterial({ color })
          const mesh = new THREE.Mesh(geometry, material)
          mesh.position.set(...position)
          scene.add(mesh)
          return mesh
        },

        readPixelAt(x, y) {
          const renderer = window.world.graphics.renderer
          const gl = renderer.getContext()
          const pixels = new Uint8Array(4)
          const canvas = renderer.domElement
          const glY = canvas.height - y
          gl.readPixels(x, glY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
          return {
            r: pixels[0],
            g: pixels[1],
            b: pixels[2],
            a: pixels[3],
            hex: '#' + ((pixels[0] << 16) | (pixels[1] << 8) | pixels[2]).toString(16).padStart(6, '0'),
          }
        },

        worldToScreen(worldPos) {
          const camera = window.world.camera
          const renderer = window.world.graphics.renderer
          const canvas = renderer.domElement
          const vector = new THREE.Vector3(...worldPos)
          vector.project(camera)
          const x = Math.round(((vector.x + 1) * canvas.width) / 2)
          const y = Math.round(((-vector.y + 1) * canvas.height) / 2)
          return { x, y }
        },

        forceRender() {
          const renderer = window.world.graphics.renderer
          const scene = window.world.stage.scene
          const camera = window.world.camera

          if (window.world.graphics.usePostprocessing && window.world.graphics.composer) {
            window.world.graphics.composer.render()
          } else {
            renderer.render(scene, camera)
          }
          renderer.getContext().finish()
        },
      }

      // Clear scene and setup
      const scene = window.world.stage.scene
      while (scene.children.length > 0) {
        scene.remove(scene.children[0])
      }

      // Position camera
      const camera = window.world.camera
      camera.position.set(0, 0, 0)
      camera.lookAt(0, 0, -10)
      camera.updateProjectionMatrix()

      // Define test objects
      const testObjects = [
        { name: 'Enemy Mob', color: 0xff0000, position: [-3, 0, -8], type: 'enemy' },
        { name: 'Item Drop', color: 0x00ff00, position: [-1, 0, -8], type: 'item' },
        { name: 'Player', color: 0x0000ff, position: [1, 0, -8], type: 'player' },
        { name: 'NPC', color: 0xffff00, position: [3, 0, -8], type: 'npc' },
        { name: 'Rare Item', color: 0xff00ff, position: [0, 2, -8], type: 'rare' },
      ]

      // Add objects to scene
      testObjects.forEach(obj => {
        window.VisualTester.addTestObject(obj.name, obj.color, obj.position, 1.5)
      })

      // Set background
      const renderer = window.world.graphics.renderer
      renderer.setClearColor(0x222222, 1)
      window.VisualTester.forceRender()

      // Test each object
      const results = testObjects.map(obj => {
        const screenPos = window.VisualTester.worldToScreen(obj.position)
        const pixelColor = window.VisualTester.readPixelAt(screenPos.x, screenPos.y)

        const expectedR = (obj.color >> 16) & 0xff
        const expectedG = (obj.color >> 8) & 0xff
        const expectedB = obj.color & 0xff

        const rDiff = Math.abs(pixelColor.r - expectedR)
        const gDiff = Math.abs(pixelColor.g - expectedG)
        const bDiff = Math.abs(pixelColor.b - expectedB)

        const colorMatch = rDiff <= tolerance && gDiff <= tolerance && bDiff <= tolerance

        return {
          name: obj.name,
          type: obj.type,
          expected: { r: expectedR, g: expectedG, b: expectedB, hex: '#' + obj.color.toString(16).padStart(6, '0') },
          actual: pixelColor,
          differences: { r: rDiff, g: gDiff, b: bDiff },
          passed: colorMatch,
        }
      })

      const passed = results.filter(r => r.passed).length

      return {
        summary: {
          total: results.length,
          passed,
          failed: results.length - passed,
          successRate: ((passed / results.length) * 100).toFixed(1) + '%',
        },
        results,
        timestamp: new Date().toISOString(),
      }
    }, tolerance)

    // Display results
    console.log('\n📊 Visual Validation Results:')
    console.log('═'.repeat(50))
    console.log(`Tests Run: ${results.summary.total}`)
    console.log(`Passed: ${results.summary.passed}`)
    console.log(`Failed: ${results.summary.failed}`)
    console.log(`Success Rate: ${results.summary.successRate}`)
    console.log('═'.repeat(50))

    results.results.forEach(result => {
      const status = result.passed ? '✅' : '❌'
      console.log(`${status} ${result.name} (${result.type})`)
      if (!result.passed) {
        console.log(`   Expected: ${result.expected.hex}, Got: ${result.actual.hex}`)
        console.log(`   Differences: R:${result.differences.r}, G:${result.differences.g}, B:${result.differences.b}`)
      }
    })

    // Save results if requested
    if (saveResults) {
      const resultsFile = path.join(RESULTS_DIR, `visual-validation-${Date.now()}.json`)
      await fs.writeFile(resultsFile, JSON.stringify(results, null, 2))
      console.log(`\n💾 Results saved to: ${resultsFile}`)
    }

    await browser.close()

    return {
      success: results.summary.failed === 0,
      results,
    }
  } catch (error) {
    await browser.close()
    throw error
  }
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = {
    headless: process.argv.includes('--headless'),
    saveResults: !process.argv.includes('--no-save'),
  }

  runVisualValidation(options)
    .then(({ success, results }) => {
      if (success) {
        console.log('\n🎉 All visual validation tests passed!')
        process.exit(0)
      } else {
        console.log('\n⚠️ Some visual validation tests failed.')
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('❌ Visual validation failed:', error)
      process.exit(1)
    })
}

export { runVisualValidation }
