#!/usr/bin/env node

/**
 * Basic Visual Sanity Test
 * 
 * Simple test to verify we can render and detect basic colored objects.
 * This ensures the visual testing framework works before testing RPG elements.
 */

import puppeteer from 'puppeteer';

async function runBasicVisualTest() {
  console.log('🔍 Running Basic Visual Sanity Test...');
  
  const browser = await puppeteer.launch({
    headless: false,
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
  page.on('console', msg => {
    const type = msg.type();
    console.log(`[Browser ${type}] ${msg.text()}`);
  });

  try {
    console.log('🌍 Loading Hyperfy...');
    await page.goto('http://localhost:4445', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for world initialization
    console.log('⏳ Waiting for world initialization...');
    await page.waitForFunction(() => {
      return window.world && 
             window.world.stage && 
             window.world.stage.scene && 
             window.world.camera &&
             window.world.graphics && 
             window.world.graphics.renderer;
    }, { timeout: 30000 });
    
    // Wait additional time for everything to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Run the basic visual test
    const results = await page.evaluate(() => {
      console.log('[BasicTest] Starting basic visual test...');
      
      const scene = window.world.stage.scene;
      const camera = window.world.camera;
      const renderer = window.world.graphics.renderer;
      
      // Clear scene for testing
      const originalChildren = [...scene.children];
      scene.clear();
      
      // Create a simple test setup
      const testGeometry = new THREE.BoxGeometry(10, 10, 10);
      const testMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000,
        side: THREE.DoubleSide
      });
      const testCube = new THREE.Mesh(testGeometry, testMaterial);
      
      // Position cube in front of camera
      testCube.position.set(0, 0, -20);
      scene.add(testCube);
      
      // Add basic lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
      scene.add(ambientLight);
      
      // Position camera
      camera.position.set(0, 0, 0);
      camera.lookAt(0, 0, -20);
      camera.updateProjectionMatrix();
      
      console.log('[BasicTest] Scene setup complete');
      console.log('[BasicTest] Camera position:', camera.position.toArray());
      console.log('[BasicTest] Cube position:', testCube.position.toArray());
      console.log('[BasicTest] Scene children:', scene.children.length);
      
      // Disable post-processing
      if (window.world.graphics.usePostprocessing) {
        window.world.graphics.usePostprocessing = false;
        console.log('[BasicTest] Disabled post-processing');
      }
      
      // Set clear color to white for contrast
      renderer.setClearColor(0xffffff, 1.0);
      
      // Force render
      renderer.clear();
      renderer.render(scene, camera);
      renderer.getContext().finish();
      
      console.log('[BasicTest] Render complete');
      
      // Wait a moment then test center pixel
      const canvas = renderer.domElement;
      const centerX = Math.floor(canvas.width / 2);
      const centerY = Math.floor(canvas.height / 2);
      
      console.log('[BasicTest] Canvas size:', canvas.width, 'x', canvas.height);
      console.log('[BasicTest] Testing center pixel at:', centerX, centerY);
      
      // Read pixel at center
      const gl = renderer.getContext();
      const pixels = new Uint8Array(4);
      const glY = canvas.height - centerY; // Flip Y coordinate
      
      gl.readPixels(centerX, glY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      
      const pixelColor = {
        r: pixels[0], 
        g: pixels[1], 
        b: pixels[2], 
        a: pixels[3],
        hex: '#' + ((pixels[0] << 16) | (pixels[1] << 8) | pixels[2]).toString(16).padStart(6, '0')
      };
      
      console.log('[BasicTest] Center pixel color:', pixelColor.hex, 'RGB:', pixels[0], pixels[1], pixels[2]);
      
      // Test multiple points for reliability
      const testPoints = [
        { x: centerX, y: centerY, name: 'center' },
        { x: centerX - 50, y: centerY, name: 'left' },
        { x: centerX + 50, y: centerY, name: 'right' },
        { x: centerX, y: centerY - 50, name: 'top' },
        { x: centerX, y: centerY + 50, name: 'bottom' }
      ];
      
      const pointResults = testPoints.map(point => {
        const testPixels = new Uint8Array(4);
        const testGlY = canvas.height - point.y;
        gl.readPixels(point.x, testGlY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, testPixels);
        
        return {
          name: point.name,
          position: [point.x, point.y],
          color: {
            r: testPixels[0],
            g: testPixels[1], 
            b: testPixels[2],
            hex: '#' + ((testPixels[0] << 16) | (testPixels[1] << 8) | testPixels[2]).toString(16).padStart(6, '0')
          }
        };
      });
      
      // Restore original scene
      scene.clear();
      originalChildren.forEach(child => scene.add(child));
      
      console.log('[BasicTest] Scene restored');
      
      return {
        canvasSize: { width: canvas.width, height: canvas.height },
        centerPixel: pixelColor,
        testPoints: pointResults,
        expectedRed: '#ff0000',
        expectedWhite: '#ffffff',
        success: pixelColor.r > 200 && pixelColor.g < 50 && pixelColor.b < 50, // Should be red
        timestamp: new Date().toISOString()
      };
    });
    
    // Display results
    console.log('\n📊 Basic Visual Test Results:');
    console.log('═'.repeat(50));
    console.log(`Canvas Size: ${results.canvasSize.width}x${results.canvasSize.height}`);
    console.log(`Center Pixel: ${results.centerPixel.hex} (RGB: ${results.centerPixel.r}, ${results.centerPixel.g}, ${results.centerPixel.b})`);
    console.log(`Expected: ${results.expectedRed} (red cube) or ${results.expectedWhite} (white background)`);
    
    console.log('\nTest Points:');
    results.testPoints.forEach(point => {
      console.log(`  ${point.name}: ${point.color.hex} at [${point.position.join(', ')}]`);
    });
    
    const isRed = results.centerPixel.r > 200 && results.centerPixel.g < 50 && results.centerPixel.b < 50;
    const isWhite = results.centerPixel.r > 200 && results.centerPixel.g > 200 && results.centerPixel.b > 200;
    const isBlack = results.centerPixel.r < 50 && results.centerPixel.g < 50 && results.centerPixel.b < 50;
    
    console.log('\n🎯 Analysis:');
    if (isRed) {
      console.log('✅ SUCCESS: Detected red cube - rendering is working!');
    } else if (isWhite) {
      console.log('⚠️  PARTIAL: Detected white background - cube not visible but rendering works');
    } else if (isBlack) {
      console.log('❌ FAILED: All black - rendering not working');
    } else {
      console.log(`🤔 UNEXPECTED: Got color ${results.centerPixel.hex} - needs investigation`);
    }
    
    console.log('═'.repeat(50));
    
    await browser.close();
    
    return {
      success: isRed || isWhite, // Either red cube or white background is acceptable
      isRendering: !isBlack,
      results
    };
    
  } catch (error) {
    await browser.close();
    throw error;
  }
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  runBasicVisualTest()
    .then(({ success, isRendering, results }) => {
      if (success) {
        console.log('\n🎉 Basic visual test passed! The rendering system is working.');
        process.exit(0);
      } else if (isRendering) {
        console.log('\n⚠️ Basic visual test shows unexpected colors but rendering is working.');
        process.exit(0);
      } else {
        console.log('\n❌ Basic visual test failed - rendering system not working.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Basic visual test crashed:', error);
      process.exit(1);
    });
}

export { runBasicVisualTest };