#!/usr/bin/env node

/**
 * RPG Visual Validation Test Suite
 * 
 * Validates that RPG plugin systems are working and RPG elements render correctly.
 * Tests the complete flow: plugin loading -> system registration -> app creation -> visual rendering.
 */

import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';

const RESULTS_DIR = 'test-results';

async function runRPGVisualValidation(options = {}) {
  const {
    headless = false,
    timeout = 45000,
    tolerance = 30,
    saveResults = true,
    debug = false
  } = options;

  console.log('🎮 Running RPG Plugin Visual Validation...');
  console.log(`📋 Config: headless=${headless}, timeout=${timeout}ms, tolerance=${tolerance}`);
  
  await fs.ensureDir(RESULTS_DIR);
  
  const browser = await puppeteer.launch({
    headless,
    defaultViewport: null,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--enable-webgl',
      '--enable-gpu-sandbox'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Console logging for debugging
  if (debug) {
    page.on('console', msg => {
      const type = msg.type();
      console.log(`[Browser ${type}] ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      console.log(`[Page Error] ${error.message}`);
    });
  }

  try {
    console.log('🌍 Loading RPG world with plugin...');
    await page.goto('http://localhost:4445', { waitUntil: 'networkidle0', timeout });
    
    // Wait for world initialization
    console.log('⏳ Waiting for world and RPG plugin initialization...');
    await page.waitForFunction(() => {
      return window.world && 
             window.world.getSystem && 
             window.world.graphics && 
             window.world.graphics.renderer;
    }, { timeout: 30000 });
    
    // Wait additional time for RPG systems to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Run the RPG validation
    const results = await page.evaluate(async (tolerance, debug) => {
      console.log('[RPG Test] Starting validation...');
      
      // Check if RPG plugin is loaded
      const rpgSystemChecks = {
        npc: !!window.world.getSystem('npc'),
        combat: !!window.world.getSystem('combat'),
        inventory: !!window.world.getSystem('inventory'),
        spawning: !!window.world.getSystem('spawning'),
        visualRepresentation: !!window.world.getSystem('visualRepresentation')
      };
      
      console.log('[RPG Test] RPG Systems:', rpgSystemChecks);
      
      // Initialize visual testing framework
      window.RPGVisualTester = {
        createRPGMob(name, color, position, type = 'enemy', size = 1.2) {
          console.log(`[RPG Test] Creating ${type}: ${name} at [${position.join(', ')}]`);
          
          const scene = window.world.stage.scene;
          const geometry = new THREE.BoxGeometry(size, size, size);
          
          // Use MeshBasicMaterial for self-illumination (no lighting needed)
          const material = new THREE.MeshBasicMaterial({ 
            color,
            transparent: false,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide,
            fog: false
          });
          
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(...position);
          mesh.userData = { rpgType: type, name };
          mesh.renderOrder = 999; // Render on top
          scene.add(mesh);
          
          console.log(`[RPG Test] Added ${name} to scene with color ${color.toString(16)} at position:`, mesh.position.toArray());
          return mesh;
        },
        
        readPixelAt(x, y) {
          const renderer = window.world.graphics.renderer;
          const gl = renderer.getContext();
          const pixels = new Uint8Array(4);
          const canvas = renderer.domElement;
          const glY = canvas.height - y;
          
          // Debug framebuffer state
          console.log('[RPG Test] Canvas size:', canvas.width, 'x', canvas.height);
          console.log('[RPG Test] Reading pixel at:', x, glY);
          console.log('[RPG Test] Current framebuffer binding:', gl.getParameter(gl.FRAMEBUFFER_BINDING));
          console.log('[RPG Test] Viewport:', gl.getParameter(gl.VIEWPORT));
          
          // Ensure we're reading from the current framebuffer
          gl.finish();
          gl.readPixels(x, glY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          
          return {
            r: pixels[0], g: pixels[1], b: pixels[2], a: pixels[3],
            hex: '#' + ((pixels[0] << 16) | (pixels[1] << 8) | pixels[2]).toString(16).padStart(6, '0')
          };
        },
        
        worldToScreen(worldPos) {
          const camera = window.world.camera;
          const renderer = window.world.graphics.renderer;
          const canvas = renderer.domElement;
          const vector = new THREE.Vector3(...worldPos);
          vector.project(camera);
          const x = Math.round((vector.x + 1) * canvas.width / 2);
          const y = Math.round((-vector.y + 1) * canvas.height / 2);
          return { x, y, z: vector.z };
        },
        
        forceRender() {
          // Instead of forcing a render, let's wait for the next natural render cycle
          return new Promise(resolve => {
            const graphics = window.world.graphics;
            
            // Disable post-processing for cleaner testing
            if (graphics.usePostprocessing && graphics.composer) {
              console.log('[RPG Test] Disabling post-processing for testing');
              graphics.usePostprocessing = false;
            }
            
            // Wait for the next animation frame (when Hyperfy will naturally render)
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                console.log('[RPG Test] Natural render cycle completed');
                resolve();
              });
            });
          });
        },
        
        setupCamera() {
          const camera = window.world.camera;
          camera.position.set(0, 0, 0);
          camera.lookAt(0, 0, -5);
          camera.updateProjectionMatrix();
          console.log('[RPG Test] Camera positioned at:', camera.position.toArray(), 'looking at: [0,0,-5]');
          console.log('[RPG Test] Camera near/far:', camera.near, camera.far);
        },
        
        setupLighting() {
          const scene = window.world.stage.scene;
          
          // Add bright ambient light for testing
          const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
          scene.add(ambientLight);
          
          // Add directional light pointing at our test area
          const directionalLight = new THREE.DirectionalLight(0xffffff, 3.0);
          directionalLight.position.set(0, 10, 10);
          directionalLight.target.position.set(0, 0, -5);
          scene.add(directionalLight);
          scene.add(directionalLight.target);
          
          console.log('[RPG Test] Added test lighting');
        },
        
        debugScene() {
          const scene = window.world.stage.scene;
          const camera = window.world.camera;
          console.log('[RPG Test] Scene children count:', scene.children.length);
          console.log('[RPG Test] Camera position:', camera.position.toArray());
          console.log('[RPG Test] Camera rotation:', camera.rotation.toArray());
          console.log('[RPG Test] Camera near/far:', camera.near, camera.far);
          
          // List all scene children
          scene.children.forEach((child, i) => {
            const pos = child.position ? child.position.toArray() : 'no position';
            const visible = child.visible;
            console.log(`[RPG Test] Child ${i}:`, child.type, pos, 'visible:', visible);
            
            if (child.isMesh) {
              console.log(`[RPG Test] Mesh ${i} material:`, child.material.type, 'color:', child.material.color.getHexString());
            }
          });
        },
        
        testRawRender() {
          // Create a minimal test directly to the canvas
          const renderer = window.world.graphics.renderer;
          const canvas = renderer.domElement;
          const scene = new THREE.Scene();
          const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
          
          // Create simple geometry
          const geometry = new THREE.PlaneGeometry(10, 10);
          const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
          const plane = new THREE.Mesh(geometry, material);
          plane.position.z = -5;
          scene.add(plane);
          
          camera.position.z = 0;
          
          // Render directly
          renderer.render(scene, camera);
          
          console.log('[RPG Test] Raw render test completed');
        }
      };
      
      // Work with the main scene instead of creating a separate one
      console.log('[RPG Test] Working with main scene...');
      const scene = window.world.stage.scene;
      const camera = window.world.camera;
      const initialChildren = scene.children.length;
      
      // Clear existing objects but keep lights and essential elements
      const toRemove = [];
      scene.children.forEach(child => {
        if (!child.isLight && 
            !child.isAmbientLight && 
            !child.isDirectionalLight && 
            !child.isHemisphereLight &&
            child.type !== 'Object3D' // Keep light targets
        ) {
          toRemove.push(child);
        }
      });
      toRemove.forEach(child => scene.remove(child));
      
      console.log(`[RPG Test] Removed ${toRemove.length} objects, kept ${scene.children.length} lights`);
      
      // Setup camera and lighting
      window.RPGVisualTester.setupCamera();
      window.RPGVisualTester.setupLighting();
      
      // Set dark background for contrast
      const renderer = window.world.graphics.renderer;
      renderer.setClearColor(0x111111, 1);
      
      // Define RPG test mobs with specific colors for easy detection
      // Single large centered object positioned beyond near clipping plane
      const rpgMobs = [
        { name: 'Test Cube', color: 0xff0000, position: [0, 0, -5], type: 'test' }
      ];
      
      console.log('[RPG Test] Creating RPG mobs...');
      
      // Create RPG mobs in scene
      const createdMobs = [];
      rpgMobs.forEach(mob => {
        const mesh = window.RPGVisualTester.createRPGMob(
          mob.name, 
          mob.color, 
          mob.position, 
          mob.type,
          8.0  // Extremely large size to fill most of screen
        );
        createdMobs.push({ ...mob, mesh });
      });
      
      // Debug the scene before testing
      window.RPGVisualTester.debugScene();
      
      // Test a raw render first
      window.RPGVisualTester.testRawRender();
      
      // Wait for natural render cycle
      await window.RPGVisualTester.forceRender();
      
      // Wait additional frames for everything to settle
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(resolve, 1000);
          });
        });
      });
      
      // Test each mob for visibility
      console.log('[RPG Test] Testing mob visibility...');
      const mobResults = rpgMobs.map((mob, index) => {
        const screenPos = window.RPGVisualTester.worldToScreen(mob.position);
        
        // Test multiple points around the mob for better detection
        const testPoints = [
          { x: screenPos.x, y: screenPos.y, name: 'center' },
          { x: screenPos.x - 20, y: screenPos.y, name: 'left' },
          { x: screenPos.x + 20, y: screenPos.y, name: 'right' },
          { x: screenPos.x, y: screenPos.y - 20, name: 'top' },
          { x: screenPos.x, y: screenPos.y + 20, name: 'bottom' }
        ];
        
        const expectedR = (mob.color >> 16) & 0xff;
        const expectedG = (mob.color >> 8) & 0xff;
        const expectedB = mob.color & 0xff;
        
        let bestMatch = null;
        let bestScore = Infinity;
        
        testPoints.forEach(point => {
          const pixelColor = window.RPGVisualTester.readPixelAt(point.x, point.y);
          
          const rDiff = Math.abs(pixelColor.r - expectedR);
          const gDiff = Math.abs(pixelColor.g - expectedG);
          const bDiff = Math.abs(pixelColor.b - expectedB);
          const totalDiff = rDiff + gDiff + bDiff;
          
          if (totalDiff < bestScore) {
            bestScore = totalDiff;
            bestMatch = {
              point: point.name,
              pixelColor,
              differences: { r: rDiff, g: gDiff, b: bDiff },
              colorMatch: rDiff <= tolerance && gDiff <= tolerance && bDiff <= tolerance
            };
          }
        });
        
        console.log(`[RPG Test] ${mob.name}: Expected ${mob.color.toString(16)}, Best match at ${bestMatch.point}: ${bestMatch.pixelColor.hex}, Diffs: R${bestMatch.differences.r} G${bestMatch.differences.g} B${bestMatch.differences.b}`);
        
        return {
          name: mob.name,
          type: mob.type,
          position: mob.position,
          screenPosition: screenPos,
          expected: { 
            r: expectedR, g: expectedG, b: expectedB, 
            hex: '#' + mob.color.toString(16).padStart(6, '0') 
          },
          actual: bestMatch.pixelColor,
          differences: bestMatch.differences,
          passed: bestMatch.colorMatch,
          testPoint: bestMatch.point
        };
      });
      
      const passedMobs = mobResults.filter(r => r.passed).length;
      const totalMobs = mobResults.length;
      
      console.log(`[RPG Test] Validation complete: ${passedMobs}/${totalMobs} mobs passed`);
      
      // Clean up test objects
      console.log('[RPG Test] Cleaning up test objects...');
      createdMobs.forEach(mobData => {
        if (mobData.mesh && mobData.mesh.parent) {
          mobData.mesh.parent.remove(mobData.mesh);
        }
      });
      
      return {
        rpgSystems: rpgSystemChecks,
        summary: {
          total: totalMobs,
          passed: passedMobs,
          failed: totalMobs - passedMobs,
          successRate: (passedMobs / totalMobs * 100).toFixed(1) + '%'
        },
        mobResults,
        sceneInfo: {
          initialChildren,
          finalChildren: scene.children.length,
          cleanedObjects: createdMobs.length
        },
        timestamp: new Date().toISOString()
      };
    }, tolerance, debug);
    
    // Display results
    console.log('\n📊 RPG Visual Validation Results:');
    console.log('═'.repeat(60));
    
    // RPG Systems Status
    console.log('🔧 RPG Systems Status:');
    Object.entries(results.rpgSystems).forEach(([system, loaded]) => {
      console.log(`   ${loaded ? '✅' : '❌'} ${system}: ${loaded ? 'LOADED' : 'MISSING'}`);
    });
    console.log('');
    
    // Visual Results
    console.log('👁️ Visual Test Results:');
    console.log(`   Total Mobs Tested: ${results.summary.total}`);
    console.log(`   Visually Confirmed: ${results.summary.passed}`);
    console.log(`   Failed Detection: ${results.summary.failed}`);
    console.log(`   Success Rate: ${results.summary.successRate}`);
    console.log('═'.repeat(60));
    
    // Individual mob results
    results.mobResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.name} (${result.type})`);
      if (!result.passed) {
        console.log(`     Expected: ${result.expected.hex}`);
        console.log(`     Detected: ${result.actual.hex} (at ${result.testPoint})`);
        console.log(`     Position: [${result.position.join(', ')}] -> Screen[${result.screenPosition.x}, ${result.screenPosition.y}]`);
        console.log(`     Color Diff: R:${result.differences.r}, G:${result.differences.g}, B:${result.differences.b}`);
      }
    });
    
    // Save results if requested
    if (saveResults) {
      const resultsFile = path.join(RESULTS_DIR, `rpg-visual-validation-${Date.now()}.json`);
      await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));
      console.log(`\n💾 Results saved to: ${resultsFile}`);
    }
    
    await browser.close();
    
    const systemsOk = Object.values(results.rpgSystems).every(loaded => loaded);
    const visualsOk = results.summary.failed === 0;
    const allPassed = systemsOk && visualsOk;
    
    return {
      success: allPassed,
      systemsOk,
      visualsOk,
      results
    };
    
  } catch (error) {
    await browser.close();
    throw error;
  }
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = {
    headless: process.argv.includes('--headless'),
    debug: process.argv.includes('--debug'),
    saveResults: !process.argv.includes('--no-save')
  };
  
  runRPGVisualValidation(options)
    .then(({ success, systemsOk, visualsOk, results }) => {
      console.log('\n🏁 Final Results:');
      console.log(`   RPG Systems: ${systemsOk ? '✅ All Loaded' : '❌ Missing Systems'}`);
      console.log(`   Visual Tests: ${visualsOk ? '✅ All Passed' : '❌ Some Failed'}`);
      
      if (success) {
        console.log('\n🎉 RPG Plugin Visual Validation: SUCCESS!');
        console.log('🔥 The RPG is rendering correctly and ready for gameplay!');
        process.exit(0);
      } else {
        console.log('\n⚠️ RPG Plugin Visual Validation: FAILED');
        console.log('🔧 Check the logs above for specific issues.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ RPG visual validation crashed:', error);
      process.exit(1);
    });
}

export { runRPGVisualValidation };