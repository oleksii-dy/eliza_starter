#!/usr/bin/env node

/**
 * Start RPG Servers
 * 
 * Starts both backend and frontend servers for the RPG world
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../..');

async function startServers() {
  console.log('🚀 Starting RPG Servers...');
  
  // Check if built server exists
  const serverPath = join(rootDir, 'build/index.js');
  if (!fs.existsSync(serverPath)) {
    console.log('📦 Server not built, building first...');
    
    const buildProcess = spawn('bun', ['run', 'build'], {
      cwd: rootDir,
      stdio: 'inherit'
    });
    
    await new Promise((resolve, reject) => {
      buildProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Build successful');
          resolve();
        } else {
          reject(new Error(`Build failed with code ${code}`));
        }
      });
    });
  }
  
  console.log('🔧 Starting backend server on port 4444...');
  const backendProcess = spawn('bun', ['run', serverPath], {
    cwd: rootDir,
    stdio: 'inherit',
    env: { 
      ...process.env, 
      PORT: '4444',
      ENABLE_RPG: 'true',
      RPG_SYSTEMS: 'combat,inventory,npc,loot,spawning,skills,movement,visualRepresentation',
      RPG_WORLD_TYPE: 'runescape'
    }
  });
  
  // Wait a moment for backend to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('🎨 Starting frontend server on port 4445...');
  const frontendProcess = spawn('bun', ['run', 'dev:vite'], {
    cwd: rootDir,
    stdio: 'inherit'
  });
  
  console.log('✅ Both servers starting...');
  console.log('🌐 Backend: http://localhost:4444');
  console.log('🎮 Frontend: http://localhost:4445');
  console.log('');
  console.log('Press Ctrl+C to stop both servers');
  
  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    backendProcess.kill();
    frontendProcess.kill();
    process.exit(0);
  });
  
  // Keep the process alive
  return new Promise(() => {}); // Never resolves, keeps running
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  startServers().catch(error => {
    console.error('❌ Failed to start servers:', error);
    process.exit(1);
  });
}

export { startServers };