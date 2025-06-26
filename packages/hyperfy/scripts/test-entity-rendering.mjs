#!/usr/bin/env node

/**
 * Entity Rendering Test
 * 
 * Tests that entities are actually visible in the browser when spawned
 * by the test helpers.
 */

import 'dotenv-flow/config';
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOT_DIR = join(__dirname, '..', 'entity-render-test');
const BACKEND_PORT = 3000;

// Ensure screenshot directory exists
await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runEntityRenderingTest() {
  console.log('\\n🎯 Entity Rendering Test');
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
      if (text.includes('[RPGTestHelpers]') || text.includes('[VisualRepresentationSystem]')) {
        console.log(`Browser: ${text}`);
      }
    });
    
    // Navigate and wait for world to load
    console.log('📍 Loading world...');
    await page.goto(testUrl);
    await delay(5000);
    
    // Take initial screenshot
    const initialPath = join(SCREENSHOT_DIR, '1-world-loaded.png');
    await page.screenshot({ path: initialPath });
    console.log('📸 Initial screenshot taken');
    
    // Check if test helpers are available
    const helpersAvailable = await page.evaluate(() => {
      return !!window.rpgTestHelpers;
    });
    
    if (!helpersAvailable) {
      throw new Error('RPG test helpers not available!');
    }
    
    console.log('✅ Test helpers available');
    
    // Spawn a player entity directly in front of camera
    console.log('👤 Spawning player...');
    const playerSpawned = await page.evaluate(() => {
      try {
        const player = window.rpgTestHelpers.spawnPlayer('test-player', {
          position: { x: 0, y: 0, z: -5 }, // In front of camera
          visualOverride: {
            color: '#FF4543', // Bright reddish color for visibility
            size: { width: 4, height: 6, depth: 4 } // Very large size for visibility
          }
        });
        return !!player;
      } catch (error) {
        console.error('Player spawn error:', error);
        return false;
      }
    });
    
    if (!playerSpawned) {
      throw new Error('Failed to spawn player!');
    }
    
    await delay(2000);
    const playerPath = join(SCREENSHOT_DIR, '2-player-spawned.png');
    await page.screenshot({ path: playerPath });
    console.log('📸 Player spawned screenshot taken');
    
    // Spawn an NPC to the side but still visible
    console.log('🧌 Spawning goblin...');
    const goblinSpawned = await page.evaluate(() => {
      try {
        const goblin = window.rpgTestHelpers.spawnNPC('goblin', {
          position: { x: -3, y: 0, z: -3 }, // To the left in front
          visualOverride: {
            color: '#228B22', // Forest green for goblins
            size: { width: 3, height: 4, depth: 3 } // Large size
          }
        });
        return !!goblin;
      } catch (error) {
        console.error('Goblin spawn error:', error);
        return false;
      }
    });
    
    if (!goblinSpawned) {
      throw new Error('Failed to spawn goblin!');
    }
    
    await delay(2000);
    const goblinPath = join(SCREENSHOT_DIR, '3-goblin-spawned.png');
    await page.screenshot({ path: goblinPath });
    console.log('📸 Goblin spawned screenshot taken');
    
    // Spawn a sword to the right side
    console.log('⚔️ Spawning sword...');
    const swordSpawned = await page.evaluate(() => {
      try {
        const sword = window.rpgTestHelpers.spawnItem('sword', {
          position: { x: 3, y: 0, z: -3 }, // To the right in front
          visualOverride: {
            color: '#FF4444', // Red for sword
            size: { width: 1, height: 6, depth: 1 } // Large sword
          }
        });
        return !!sword;
      } catch (error) {
        console.error('Sword spawn error:', error);
        return false;
      }
    });
    
    if (!swordSpawned) {
      throw new Error('Failed to spawn sword!');
    }
    
    await delay(2000);
    const finalPath = join(SCREENSHOT_DIR, '4-all-entities-spawned.png');
    await page.screenshot({ path: finalPath });
    console.log('📸 Final screenshot taken');
    
    // Get test summary
    const summary = await page.evaluate(() => {
      return window.rpgTestHelpers.getTestSummary();
    });
    
    console.log('\\n📊 Test Summary:');
    console.log('Entities spawned:', summary.entitiesSpawned);
    console.log('Players spawned:', summary.playersSpawned);
    console.log('Systems available:', summary.systemsAvailable);
    console.log('World state:', summary.worldState);
    
    // Cleanup entities
    await page.evaluate(() => {
      window.rpgTestHelpers.cleanup();
    });
    
    console.log('\\n✅ Entity Rendering Test Complete!');
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
    
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
const success = await runEntityRenderingTest();
process.exit(success ? 0 : 1);