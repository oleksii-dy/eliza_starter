#!/usr/bin/env node

/**
 * Basic Lighting Test
 * 
 * Create a simple test to verify lighting and scene rendering
 */

import 'dotenv-flow/config';
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOT_DIR = join(__dirname, '..', 'lighting-test');
const BACKEND_PORT = 3000;

// Ensure screenshot directory exists
await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBasicLightingTest() {
  console.log('\n🔦 Basic Lighting Test');
  console.log('========================');
  
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
      if (text.includes('[LightingTest]') || text.includes('ERROR') || text.includes('Warning')) {
        console.log(`Browser: ${text}`);
      }
    });
    
    // Navigate and wait for world to load
    console.log('📍 Loading world...');
    await page.goto(testUrl);
    await delay(5000);
    
    // Test basic scene setup with lighting
    const sceneInfo = await page.evaluate(() => {
      console.log('[LightingTest] Starting lighting test...');
      
      const world = window.world;
      if (!world) {
        console.log('[LightingTest] No world available');
        return { error: 'No world' };
      }
      
      // Scene is located at world.stage.scene, not world.graphics.scene
      const scene = world.stage?.scene;
      if (!scene) {
        console.log('[LightingTest] No scene available at world.stage.scene');
        console.log('[LightingTest] Available properties:', Object.keys(world));
        if (world.stage) {
          console.log('[LightingTest] Stage properties:', Object.keys(world.stage));
        }
        return { error: 'No scene' };
      }
      
      console.log('[LightingTest] Scene available, children count:', scene.children.length);
      
      // Check if lighting is available
      const THREE = window.THREE;
      if (!THREE) {
        console.log('[LightingTest] THREE.js not available');
        return { error: 'No THREE.js' };
      }
      
      // Add basic lighting to the scene
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      scene.add(ambientLight);
      console.log('[LightingTest] Added ambient light');
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
      directionalLight.position.set(10, 10, 5);
      scene.add(directionalLight);
      console.log('[LightingTest] Added directional light');
      
      // Create a simple visible test cube
      const geometry = new THREE.BoxGeometry(2, 2, 2);
      const material = new THREE.MeshBasicMaterial({ 
        color: 0xff0000,
        transparent: false,
        opacity: 1.0
      });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(0, 0, -5); // In front of camera
      scene.add(cube);
      console.log('[LightingTest] Added red test cube at (0, 0, -5)');
      
      // Get camera info
      const camera = world.camera;
      const cameraInfo = camera ? {
        position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        rotation: { x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z }
      } : null;
      
      return {
        success: true,
        sceneChildren: scene.children.length,
        camera: cameraInfo,
        testCubeAdded: true
      };
    });
    
    console.log('🔦 Scene setup result:', sceneInfo);
    
    // Take screenshot after adding lighting and test cube
    const lightingPath = join(SCREENSHOT_DIR, '1-with-lighting-and-cube.png');
    await page.screenshot({ path: lightingPath });
    console.log('📸 Lighting test screenshot taken');
    
    // Test with an even simpler approach - create cube directly in front
    await page.evaluate(() => {
      console.log('[LightingTest] Creating another test cube...');
      
      const scene = window.world.stage?.scene;
      const THREE = window.THREE;
      
      if (scene && THREE) {
        // Create large bright green cube right at camera position
        const geometry = new THREE.BoxGeometry(10, 10, 10);
        const material = new THREE.MeshBasicMaterial({ 
          color: 0x00ff00,
          wireframe: false,
          transparent: false
        });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(0, 0, -2); // Very close to camera
        scene.add(cube);
        console.log('[LightingTest] Added large green cube at (0, 0, -2)');
        
        // Create small red cube at origin
        const smallGeometry = new THREE.BoxGeometry(1, 1, 1);
        const smallMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const smallCube = new THREE.Mesh(smallGeometry, smallMaterial);
        smallCube.position.set(0, 0, 0);
        scene.add(smallCube);
        console.log('[LightingTest] Added small red cube at origin');
      }
    });
    
    await delay(2000);
    
    const finalPath = join(SCREENSHOT_DIR, '2-multiple-cubes.png');
    await page.screenshot({ path: finalPath });
    console.log('📸 Final test screenshot taken');
    
    console.log('\n✅ Basic Lighting Test Complete!');
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
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
const success = await runBasicLightingTest();
process.exit(success ? 0 : 1);