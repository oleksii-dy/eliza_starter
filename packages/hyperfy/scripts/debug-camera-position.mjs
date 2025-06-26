#!/usr/bin/env node

/**
 * Debug Camera Position Test
 * 
 * Tests to understand the camera coordinate system and place entities
 * where they will definitely be visible.
 */

import 'dotenv-flow/config';
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOT_DIR = join(__dirname, '..', 'camera-debug-test');
const BACKEND_PORT = 3000;

// Ensure screenshot directory exists
await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runCameraDebugTest() {
  console.log('\\n🎯 Camera Debug Test');
  console.log('==========================');
  
  let backendServer = null;
  let devServer = null;
  let browser = null;
  
  try {
    // Kill existing servers
    console.log('🧹 Cleaning up...');
    spawn('pkill', ['-f', 'node build/index.js'], { shell: true });
    spawn('pkill', ['-f', 'vite'], { shell: true });
    await delay(2000);
    
    // Build project
    console.log('🔨 Building...');
    const buildProcess = spawn('npm', ['run', 'build:no-typecheck'], {
      shell: true,
      stdio: 'inherit'
    });
    
    await new Promise((resolve, reject) => {
      buildProcess.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Build failed with code ${code}`));
      });
    });
    
    // Start backend
    console.log('🚀 Starting backend...');
    backendServer = spawn('npm', ['start'], {
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, PORT: BACKEND_PORT }
    });
    
    // Wait for backend
    await delay(10000);
    
    // Start frontend
    console.log('🌐 Starting frontend...');
    devServer = spawn('npm', ['run', 'dev:vite'], {
      shell: true,
      stdio: 'pipe'
    });
    
    let frontendPort = null;
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Frontend timeout')), 30000);
      
      devServer.stdout.on('data', (data) => {
        const output = data.toString();
        const portMatch = output.match(/Local:\s+http:\/\/localhost:(\d+)/);
        if (portMatch) {
          frontendPort = portMatch[1];
          clearTimeout(timeout);
          resolve();
        }
      });
    });
    
    const testUrl = `http://localhost:${frontendPort}`;
    console.log(`✅ Test environment ready: ${testUrl}`);
    
    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Listen to console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[RPGTestHelpers]') || text.includes('[VisualRepresentationSystem]') || text.includes('[CameraDebug]')) {
        console.log(`Browser: ${text}`);
      }
    });
    
    // Navigate and wait for world to load
    console.log('📍 Loading world...');
    await page.goto(testUrl);
    await delay(5000);
    
    // Check camera information
    console.log('📷 Getting camera info...');
    const cameraInfo = await page.evaluate(() => {
      const world = window.world;
      if (!world || !world.graphics) return null;
      
      const camera = world.graphics.camera;
      if (!camera) return null;
      
      return {
        position: {
          x: camera.position.x,
          y: camera.position.y, 
          z: camera.position.z
        },
        rotation: {
          x: camera.rotation.x,
          y: camera.rotation.y,
          z: camera.rotation.z
        },
        fov: camera.fov,
        near: camera.near,
        far: camera.far
      };
    });
    
    console.log('📷 Camera info:', cameraInfo);
    
    // Take initial screenshot
    const initialPath = join(SCREENSHOT_DIR, '1-world-loaded.png');
    await page.screenshot({ path: initialPath });
    console.log('📸 Initial screenshot taken');
    
    // Wait for test helpers
    await delay(3000);
    
    // Test multiple positions around the camera
    const testPositions = [
      { name: 'center', pos: { x: 0, y: 0, z: 0 }, color: '#FF0000' },
      { name: 'front-close', pos: { x: 0, y: 0, z: -2 }, color: '#00FF00' },
      { name: 'front-far', pos: { x: 0, y: 0, z: -10 }, color: '#0000FF' },
      { name: 'above', pos: { x: 0, y: 5, z: 0 }, color: '#FFFF00' },
      { name: 'below', pos: { x: 0, y: -5, z: 0 }, color: '#FF00FF' },
      { name: 'left', pos: { x: -5, y: 0, z: 0 }, color: '#00FFFF' },
      { name: 'right', pos: { x: 5, y: 0, z: 0 }, color: '#FFA500' }
    ];
    
    for (let i = 0; i < testPositions.length; i++) {
      const test = testPositions[i];
      console.log(`🎯 Testing position ${test.name}: (${test.pos.x}, ${test.pos.y}, ${test.pos.z})`);
      
      await page.evaluate((testData) => {
        if (!window.rpgTestHelpers) {
          console.log('[CameraDebug] Test helpers not available');
          return;
        }
        
        try {
          const entity = window.rpgTestHelpers.spawnPlayer(`test-${testData.name}`, {
            position: testData.pos,
            visualOverride: {
              color: testData.color,
              size: { width: 8, height: 8, depth: 8 } // Very large cube
            }
          });
          console.log(`[CameraDebug] Spawned ${testData.name} at ${JSON.stringify(testData.pos)} with color ${testData.color}`);
        } catch (error) {
          console.log(`[CameraDebug] Failed to spawn ${testData.name}:`, error);
        }
      }, test);
      
      await delay(2000);
      
      const screenshotPath = join(SCREENSHOT_DIR, `${i + 2}-${test.name}.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`📸 ${test.name} screenshot taken`);
    }
    
    // Final screenshot with all entities
    const finalPath = join(SCREENSHOT_DIR, '9-all-positions.png');
    await page.screenshot({ path: finalPath });
    console.log('📸 Final screenshot taken');
    
    // Get test summary
    const summary = await page.evaluate(() => {
      return window.rpgTestHelpers ? window.rpgTestHelpers.getTestSummary() : null;
    });
    
    console.log('\\n📊 Test Summary:', summary);
    
    console.log('\\n✅ Camera Debug Test Complete!');
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log('Check the screenshots to see which positions are visible');
    
    return true;
    
  } catch (error) {
    console.error('\\n❌ Test failed:', error.message);
    return false;
  } finally {
    // Cleanup
    if (browser) await browser.close();
    if (backendServer) backendServer.kill();
    if (devServer) devServer.kill();
    await delay(1000);
  }
}

// Run test
const success = await runCameraDebugTest();
process.exit(success ? 0 : 1);