#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';

const RECORDINGS_DIR = 'test-recordings';

async function testRecording() {
  console.log('🧪 Testing 5-second recording...');
  
  await fs.ensureDir(RECORDINGS_DIR);
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Capture errors and important logs
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || type === 'warning') {
      console.log(`🚨 ${type}: ${text}`);
    } else if (text.includes('loaded') || text.includes('initialized') || text.includes('connected') || text.includes('world') || text.includes('scene') || text.includes('graphics') || text.includes('renderer') || text.includes('camera')) {
      console.log(`ℹ️ ${type}: ${text}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`💥 Page error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    
    // Try to identify which script caused the error
    if (error.message.includes('Unexpected token')) {
      console.log(`   🔍 This error usually means a script tried to load but got HTML instead`);
    }
  });

  page.on('requestfailed', request => {
    console.log(`📵 Failed request: ${request.url()}`);
    console.log(`   Error: ${request.failure()?.errorText}`);
    console.log(`   Method: ${request.method()}`);
    console.log(`   Type: ${request.resourceType()}`);
  });

  page.on('response', response => {
    if (!response.ok() && response.status() === 404) {
      console.log(`🔍 404 Response: ${response.url()}`);
      console.log(`   Status: ${response.status()}`);
    }
  });

  // Navigate
  console.log('🌍 Loading...');
  await page.goto('http://localhost:4445', { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Wait for canvas
  await page.waitForSelector('canvas', { timeout: 15000 });
  console.log('🎨 Canvas found, waiting for 3D scene to render...');
  await new Promise(resolve => setTimeout(resolve, 8000)); // Increased wait time
  
  // Debug: Check what particles path was set and canvas state
  const debugInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return {
      particlesPath: window.PARTICLES_PATH,
      isViteDev: document.querySelector('script[src*="@vite/client"]') !== null,
      hasCanvas: !!canvas,
      canvasSize: canvas ? `${canvas.width}x${canvas.height}` : 'none',
      canvasStyle: canvas ? canvas.style.cssText : 'none',
      location: window.location.href,
      errors: window.errors || [],
      threeExists: typeof window.THREE !== 'undefined',
      webglSupported: (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
          return false;
        }
      })(),
      worldExists: typeof window.world !== 'undefined',
      worldDetails: (() => {
        if (window.world) {
          return {
            hasGraphics: !!window.world.graphics,
            graphicsKeys: window.world.graphics ? Object.keys(window.world.graphics).slice(0, 10) : [],
            hasScene: !!(window.world.graphics && window.world.graphics.scene),
            sceneChildren: (window.world.graphics && window.world.graphics.scene) ? window.world.graphics.scene.children.length : 0
          };
        }
        return null;
      })()
    };
  });
  console.log('🔍 Debug info:', debugInfo);
  
  // If scene isn't ready, wait a bit more and try to manually trigger initialization
  if (!debugInfo.worldDetails?.hasScene) {
    console.log('🔧 Scene not ready, waiting more and checking for initialization...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if scene is ready now
    const secondCheck = await page.evaluate(() => {
      return {
        hasScene: !!(window.world && window.world.graphics && window.world.graphics.scene),
        sceneChildren: (window.world && window.world.graphics && window.world.graphics.scene) ? window.world.graphics.scene.children.length : 0,
        rendererExists: !!(window.world && window.world.graphics && window.world.graphics.renderer)
      };
    });
    console.log('🔍 Second check:', secondCheck);
  }
  
  console.log('📸 Starting capture...');
  
  // Capture frames for 5 seconds
  const frames = [];
  const startTime = Date.now();
  
  while (Date.now() - startTime < 5000) {
    try {
      const screenshot = await page.screenshot({
        type: 'jpeg',
        quality: 80
      });
      frames.push(screenshot.toString('base64'));
      await new Promise(resolve => setTimeout(resolve, 200)); // 5fps
    } catch (error) {
      console.error('Screenshot failed:', error);
      break;
    }
  }

  console.log(`✅ Captured ${frames.length} frames`);
  
  if (frames.length > 0) {
    // Save one test frame
    const testFramePath = path.join(RECORDINGS_DIR, 'test-frame.jpg');
    await fs.writeFile(testFramePath, Buffer.from(frames[0], 'base64'));
    console.log(`💾 Saved test frame: ${testFramePath}`);
    
    // Check if frame is mostly white/black (indicates empty canvas)
    const frameSize = Buffer.from(frames[0], 'base64').length;
    console.log(`📊 Frame size: ${Math.round(frameSize/1024)}KB`);
    
    if (frameSize < 10000) {
      console.log('⚠️ Frame is very small - likely empty/blank');
    } else if (frameSize > 50000) {
      console.log('✅ Frame has substantial content');
    } else {
      console.log('🤔 Frame has some content but may be mostly empty');
    }
  }

  await browser.close();
  return frames.length > 0;
}

// Check if servers are running
try {
  const response = await fetch('http://localhost:4445');
  if (!response.ok) throw new Error('Server not responding');
  console.log('✅ Server is running');
} catch (error) {
  console.error('❌ Start servers first with: bun run dev:full');
  process.exit(1);
}

testRecording().then(success => {
  console.log(success ? '🎉 Test completed!' : '❌ Test failed!');
}).catch(console.error);