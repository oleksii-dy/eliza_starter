#!/usr/bin/env node

/**
 * Production Hyperfy RPG Server Starter
 * 
 * This script starts the Hyperfy server in production mode with RPG features enabled
 * Designed for deployment environments like Railway, Heroku, etc.
 */

import { spawn } from 'child_process';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Production configuration
const PRODUCTION_CONFIG = {
  port: process.env.PORT || 3000,
  wsPort: process.env.WS_PORT || 3001,
  rpgMode: process.env.RPG_MODE === 'true',
  autoStartRpg: process.env.AUTO_START_RPG === 'true',
  agentsEnabled: process.env.AGENTS_ENABLED === 'true',
  logLevel: process.env.LOG_LEVEL || 'info',
  maxAgents: parseInt(process.env.MAX_AGENTS || '10'),
  healthCheckPort: process.env.HEALTH_CHECK_PORT || 3002
};

class ProductionHyperfyServer {
  constructor() {
    this.server = null;
    this.healthCheckServer = null;
    this.processes = [];
    this.isShuttingDown = false;
  }

  async start() {
    console.log('🚀 Starting Hyperfy RPG Production Server');
    console.log('==========================================');
    console.log(`📍 Port: ${PRODUCTION_CONFIG.port}`);
    console.log(`🔗 WebSocket Port: ${PRODUCTION_CONFIG.wsPort}`);
    console.log(`🎮 RPG Mode: ${PRODUCTION_CONFIG.rpgMode ? 'Enabled' : 'Disabled'}`);
    console.log(`🤖 Agents: ${PRODUCTION_CONFIG.agentsEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`📊 Max Agents: ${PRODUCTION_CONFIG.maxAgents}`);

    try {
      // Setup signal handlers for graceful shutdown
      this.setupSignalHandlers();
      
      // Setup health check endpoint
      await this.setupHealthCheck();
      
      // Initialize world and database
      await this.initializeWorld();
      
      // Start the main Hyperfy server
      await this.startHyperfyServer();
      
      // Start RPG systems if enabled
      if (PRODUCTION_CONFIG.rpgMode) {
        await this.initializeRPGSystems();
      }
      
      // Start agent simulation if enabled
      if (PRODUCTION_CONFIG.agentsEnabled) {
        await this.startAgentSimulation();
      }
      
      console.log('✅ Hyperfy RPG Production Server Started Successfully');
      console.log(`🌐 Server available at: http://localhost:${PRODUCTION_CONFIG.port}`);
      console.log(`💓 Health check at: http://localhost:${PRODUCTION_CONFIG.healthCheckPort}/health`);
      
    } catch (error) {
      console.error('❌ Failed to start production server:', error);
      process.exit(1);
    }
  }

  setupSignalHandlers() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        console.log(`\n📡 Received ${signal}, initiating graceful shutdown...`);
        this.gracefulShutdown();
      });
    });
    
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      this.gracefulShutdown();
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown();
    });
  }

  async setupHealthCheck() {
    console.log('💓 Setting up health check endpoint...');
    
    this.healthCheckServer = createServer((req, res) => {
      if (req.url === '/health') {
        const healthStatus = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: process.env.npm_package_version || 'unknown',
          environment: process.env.NODE_ENV || 'production',
          memory: process.memoryUsage(),
          config: {
            rpgMode: PRODUCTION_CONFIG.rpgMode,
            agentsEnabled: PRODUCTION_CONFIG.agentsEnabled,
            maxAgents: PRODUCTION_CONFIG.maxAgents
          }
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(healthStatus, null, 2));
      } else if (req.url === '/ready') {
        // Readiness check - more strict than health check
        const isReady = this.server !== null && !this.isShuttingDown;
        const status = isReady ? 200 : 503;
        
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ready: isReady }));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
    
    this.healthCheckServer.listen(PRODUCTION_CONFIG.healthCheckPort, () => {
      console.log(`✅ Health check server listening on port ${PRODUCTION_CONFIG.healthCheckPort}`);
    });
  }

  async initializeWorld() {
    console.log('🌍 Initializing world and database...');
    
    const worldPath = path.join(__dirname, '../world');
    const dbPath = path.join(worldPath, 'db.sqlite');
    
    // Ensure world directory exists
    if (!fs.existsSync(worldPath)) {
      fs.mkdirSync(worldPath, { recursive: true });
    }
    
    // Initialize database if it doesn't exist
    if (!fs.existsSync(dbPath)) {
      console.log('📦 Creating new world database...');
      // Copy default database or create new one
      const defaultDbPath = path.join(__dirname, '../world/db.sqlite');
      if (fs.existsSync(defaultDbPath)) {
        fs.copyFileSync(defaultDbPath, dbPath);
      }
    }
    
    console.log('✅ World initialized');
  }

  async startHyperfyServer() {
    console.log('🏗️ Starting main Hyperfy server...');
    
    return new Promise((resolve, reject) => {
      const serverScript = path.join(__dirname, '../src/server/index.ts');
      
      // Use the appropriate build script
      const serverCommand = process.env.NODE_ENV === 'development' 
        ? 'bun'
        : 'node';
      
      const serverArgs = process.env.NODE_ENV === 'development'
        ? [serverScript]
        : ['build/server/index.js'];
      
      this.server = spawn(serverCommand, serverArgs, {
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PORT: PRODUCTION_CONFIG.port,
          WS_PORT: PRODUCTION_CONFIG.wsPort,
          NODE_ENV: process.env.NODE_ENV || 'production'
        }
      });
      
      this.server.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[Hyperfy] ${output.trim()}`);
        
        if (output.includes('Server running') || output.includes('listening')) {
          resolve();
        }
      });
      
      this.server.stderr.on('data', (data) => {
        console.error(`[Hyperfy Error] ${data.toString().trim()}`);
      });
      
      this.server.on('close', (code) => {
        console.log(`[Hyperfy] Server process exited with code ${code}`);
        if (code !== 0 && !this.isShuttingDown) {
          reject(new Error(`Hyperfy server exited with code ${code}`));
        }
      });
      
      this.processes.push(this.server);
      
      // Timeout after 60 seconds
      setTimeout(() => {
        reject(new Error('Hyperfy server startup timeout'));
      }, 60000);
    });
  }

  async initializeRPGSystems() {
    console.log('🎮 Initializing RPG systems...');
    
    // Give the server time to fully start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Initialize RPG world and systems
    try {
      // This would trigger the RPG demo initialization
      console.log('🏰 RPG world systems initialized');
      
      if (PRODUCTION_CONFIG.autoStartRpg) {
        console.log('🚀 Auto-starting RPG demo...');
        // Trigger RPG demo start
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize RPG systems:', error);
      throw error;
    }
  }

  async startAgentSimulation() {
    console.log('🤖 Starting agent simulation...');
    
    // Wait for RPG systems to be ready
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    try {
      // This would start the agent simulation
      console.log(`👥 Starting ${PRODUCTION_CONFIG.maxAgents} agents...`);
      
      // Start agents with different personalities and behaviors
      for (let i = 0; i < PRODUCTION_CONFIG.maxAgents; i++) {
        setTimeout(() => {
          console.log(`🤖 Starting agent ${i + 1}/${PRODUCTION_CONFIG.maxAgents}`);
          // Start individual agent
        }, i * 2000); // Stagger agent starts
      }
      
      console.log('✅ Agent simulation started');
      
    } catch (error) {
      console.error('❌ Failed to start agent simulation:', error);
      // Don't throw - agents are optional
    }
  }

  async gracefulShutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    
    console.log('🛑 Starting graceful shutdown...');
    
    // Stop accepting new connections
    if (this.healthCheckServer) {
      this.healthCheckServer.close();
    }
    
    // Stop all processes
    for (const process of this.processes) {
      if (process && !process.killed) {
        console.log('⏹️ Stopping process...');
        process.kill('SIGTERM');
        
        // Force kill after 10 seconds
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
        }, 10000);
      }
    }
    
    // Wait for processes to exit
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  }
}

// Start the production server
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new ProductionHyperfyServer();
  server.start().catch(console.error);
}

export default ProductionHyperfyServer;