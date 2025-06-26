#!/usr/bin/env node

// Simple server start script for testing
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, '../build/server/rpg-server.js');

console.log('🚀 Attempting to start simple server...');
console.log('Server path:', serverPath);

// Check if server file exists
if (!fs.existsSync(serverPath)) {
  console.log('❌ Server file not found. Building...');
  
  // Try to build the server first
  const { spawn } = await import('child_process');
  
  console.log('🔨 Building server...');
  const buildProcess = spawn('bun', ['run', 'build'], {
    cwd: join(__dirname, '..'),
    stdio: 'inherit'
  });
  
  buildProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Build successful, starting server...');
      startServer();
    } else {
      console.log('❌ Build failed');
      process.exit(1);
    }
  });
} else {
  startServer();
}

async function startServer() {
  const { spawn } = await import('child_process');
  
  console.log('🚀 Starting server on port 4444...');
  const serverProcess = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: { ...process.env, PORT: '4444' }
  });
  
  serverProcess.on('close', (code) => {
    console.log(`Server exited with code ${code}`);
  });
  
  serverProcess.on('error', (error) => {
    console.error('Server error:', error);
  });
}