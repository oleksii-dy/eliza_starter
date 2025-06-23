import {
  type IAgentRuntime,
  elizaLogger,
} from '@elizaos/core';
import {
  type TrainingJob,
  type TrainingConfig,
  type BridgeMessage,
  type AtroposEnvironment,
} from '../types.js';
import { spawn, ChildProcess } from 'child_process';
import WebSocket from 'ws';
import path from 'path';
import fs from 'fs/promises';
import { getTrainingConfig } from '../config/training-config.js';

/**
 * Bridge between TypeScript and Python for Atropos integration
 */
export class AtroposBridge {
  private pythonProcess: ChildProcess | null = null;
  private websocket: WebSocket | null = null;
  private messageHandlers: Map<string, (message: BridgeMessage) => void> = new Map();
  private activeEnvironments: Map<string, AtroposEnvironment> = new Map();
  private bridgePort: number;

  constructor(private runtime: IAgentRuntime) {
    const config = getTrainingConfig(runtime);
    this.bridgePort = parseInt((config as any).getSetting('ATROPOS_BRIDGE_PORT', '8765'));
  }

  async initialize(): Promise<void> {
    elizaLogger.info('Initializing Atropos Bridge');

    // Ensure Python environment is set up
    await this.setupPythonEnvironment();

    // Start the bridge server
    await this.startBridgeServer();

    // Connect WebSocket
    await this.connectWebSocket();

    elizaLogger.info('Atropos Bridge initialized successfully');
  }

  private async setupPythonEnvironment(): Promise<void> {
    elizaLogger.info('Setting up Python environment for Atropos');

    try {
      // Check if Python is available
      await this.runCommand('python3', ['--version']);

      // Check if Atropos is installed
      try {
        await this.runCommand('python3', ['-c', 'import atroposlib']);
        elizaLogger.info('Atropos library already installed');
      } catch (error) {
        elizaLogger.info('Installing Atropos library');
        await this.runCommand('pip3', ['install', 'atroposlib']);
      }

      // Create Python bridge script if it doesn't exist
      await this.createPythonBridgeScript();
    } catch (error) {
      elizaLogger.error('Error setting up Python environment:', error);
      throw new Error('Failed to set up Python environment for Atropos');
    }
  }

  private async createPythonBridgeScript(): Promise<void> {
    const scriptDir = path.join(process.cwd(), 'packages/plugin-training/atropos');
    const scriptPath = path.join(scriptDir, 'bridge_server.py');

    try {
      await fs.mkdir(scriptDir, { recursive: true });
      
      const bridgeScript = `#!/usr/bin/env python3
"""
TypeScript-Python Bridge Server for Atropos Integration
"""
import asyncio
import websockets
import json
import logging
import sys
import traceback
from datetime import datetime
from typing import Dict, Any, Optional

# Import Atropos components
try:
    import atroposlib
    from atroposlib.trainer import Trainer
    from atroposlib.environments import RLAIFEnvironment
    from atroposlib.config import TrainingConfig as AtroposConfig
except ImportError as e:
    print(f"Error importing Atropos: {e}")
    print("Please install Atropos: pip install atroposlib")
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AtroposBridgeServer:
    def __init__(self, port: int = 8765):
        self.port = port
        self.active_trainers: Dict[str, Trainer] = {}
        self.active_environments: Dict[str, Any] = {}
        
    async def handle_message(self, websocket, path):
        """Handle WebSocket messages from TypeScript"""
        try:
            async for message in websocket:
                data = json.loads(message)
                response = await self.process_command(data)
                await websocket.send(json.dumps(response))
        except websockets.exceptions.ConnectionClosed:
            logger.info("WebSocket connection closed")
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            error_response = {
                "id": data.get("id", "unknown"),
                "type": "error",
                "payload": {"error": str(e), "traceback": traceback.format_exc()},
                "timestamp": datetime.now().isoformat(),
                "source": "python"
            }
            await websocket.send(json.dumps(error_response))

    async def process_command(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Process commands from TypeScript"""
        command_type = message.get("type")
        payload = message.get("payload", {})
        message_id = message.get("id")
        
        logger.info(f"Processing command: {command_type}")
        
        try:
            if command_type == "start_training":
                result = await self.start_training(payload)
            elif command_type == "stop_training":
                result = await self.stop_training(payload)
            elif command_type == "get_training_status":
                result = await self.get_training_status(payload)
            elif command_type == "create_environment":
                result = await self.create_environment(payload)
            elif command_type == "list_environments":
                result = await self.list_environments()
            elif command_type == "health_check":
                result = {"status": "healthy", "timestamp": datetime.now().isoformat()}
            else:
                raise ValueError(f"Unknown command type: {command_type}")
                
            return {
                "id": message_id,
                "type": "response",
                "payload": result,
                "timestamp": datetime.now().isoformat(),
                "source": "python"
            }
        except Exception as e:
            logger.error(f"Error processing command {command_type}: {e}")
            return {
                "id": message_id,
                "type": "error",
                "payload": {"error": str(e), "traceback": traceback.format_exc()},
                "timestamp": datetime.now().isoformat(),
                "source": "python"
            }

    async def start_training(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Start Atropos training"""
        job_id = config.get("job_id")
        training_config = config.get("training_config", {})
        
        logger.info(f"Starting training job: {job_id}")
        
        # Create Atropos trainer configuration
        atropos_config = AtroposConfig(
            model_name=training_config.get("model_name", "gpt-3.5-turbo"),
            training_steps=training_config.get("training_steps", 1000),
            batch_size=training_config.get("batch_size", 4),
            learning_rate=float(training_config.get("learning_rate", 1e-5)),
            save_steps=training_config.get("save_steps", 100),
            eval_steps=training_config.get("eval_steps", 50),
            warmup_steps=training_config.get("warmup_steps", 100),
            max_length=training_config.get("max_tokens", 512),
            use_wandb=training_config.get("use_wandb", False),
            wandb_project=training_config.get("wandb_project", "eliza-training"),
        )
        
        # Create trainer
        trainer = Trainer(config=atropos_config)
        self.active_trainers[job_id] = trainer
        
        # Start training in background
        asyncio.create_task(self._run_training(job_id, trainer))
        
        return {
            "job_id": job_id,
            "status": "started",
            "config": training_config
        }

    async def _run_training(self, job_id: str, trainer: Trainer):
        """Run training in background"""
        try:
            logger.info(f"Running training for job: {job_id}")
            await trainer.train()
            logger.info(f"Training completed for job: {job_id}")
        except Exception as e:
            logger.error(f"Training failed for job {job_id}: {e}")

    async def stop_training(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Stop training job"""
        job_id = config.get("job_id")
        
        if job_id in self.active_trainers:
            trainer = self.active_trainers[job_id]
            # Stop trainer if it has a stop method
            if hasattr(trainer, 'stop'):
                await trainer.stop()
            del self.active_trainers[job_id]
            
        return {"job_id": job_id, "status": "stopped"}

    async def get_training_status(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Get training job status"""
        job_id = config.get("job_id")
        
        if job_id not in self.active_trainers:
            return {"job_id": job_id, "status": "not_found"}
            
        trainer = self.active_trainers[job_id]
        
        # Get status from trainer
        status = {
            "job_id": job_id,
            "status": "running",
            "progress": getattr(trainer, 'progress', {}),
            "metrics": getattr(trainer, 'metrics', {}),
        }
        
        return status

    async def create_environment(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Create Atropos environment"""
        env_name = config.get("name")
        env_type = config.get("type", "rlaif")
        env_config = config.get("config", {})
        
        logger.info(f"Creating environment: {env_name} of type {env_type}")
        
        if env_type == "rlaif":
            environment = RLAIFEnvironment(
                judge_model=env_config.get("judge_model", "gpt-4"),
                preference_description=env_config.get("preference_description", "helpful and harmless"),
                max_turns=env_config.get("max_turns", 5),
            )
        else:
            raise ValueError(f"Unsupported environment type: {env_type}")
            
        self.active_environments[env_name] = environment
        
        return {
            "name": env_name,
            "type": env_type,
            "status": "created"
        }

    async def list_environments(self) -> Dict[str, Any]:
        """List active environments"""
        environments = []
        for name, env in self.active_environments.items():
            environments.append({
                "name": name,
                "type": type(env).__name__,
                "status": "active"
            })
            
        return {"environments": environments}

    async def start_server(self):
        """Start the WebSocket server"""
        logger.info(f"Starting Atropos Bridge Server on port {self.port}")
        
        start_server = websockets.serve(
            self.handle_message,
            "localhost",
            self.port
        )
        
        await start_server
        logger.info(f"Atropos Bridge Server started on ws://localhost:{self.port}")

async def main():
    server = AtroposBridgeServer()
    await server.start_server()
    
    # Keep server running
    await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())
`;
      
      await fs.writeFile(scriptPath, bridgeScript);
      await fs.chmod(scriptPath, '755');
      
      elizaLogger.info(`Created Python bridge script at ${scriptPath}`);
    } catch (error) {
      elizaLogger.error('Error creating Python bridge script:', error);
      throw error;
    }
  }

  private async startBridgeServer(): Promise<void> {
    elizaLogger.info('Starting Python bridge server');

    const scriptPath = path.join(process.cwd(), 'packages/plugin-training/atropos/bridge_server.py');
    
    this.pythonProcess = spawn('python3', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    this.pythonProcess.stdout?.on('data', (data) => {
      elizaLogger.info(`Bridge Server: ${data.toString().trim()}`);
    });

    this.pythonProcess.stderr?.on('data', (data) => {
      elizaLogger.error(`Bridge Server Error: ${data.toString().trim()}`);
    });

    this.pythonProcess.on('exit', (code) => {
      elizaLogger.warn(`Bridge server exited with code ${code}`);
      this.pythonProcess = null;
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  private async connectWebSocket(): Promise<void> {
    elizaLogger.info('Connecting to bridge WebSocket');

    return new Promise((resolve, reject) => {
      this.websocket = new WebSocket(`ws://localhost:${this.bridgePort}`);

      this.websocket.on('open', () => {
        elizaLogger.info('WebSocket connected to bridge server');
        resolve();
      });

      this.websocket.on('message', (data) => {
        try {
          const message: BridgeMessage = JSON.parse(data.toString());
          this.handleBridgeMessage(message);
        } catch (error) {
          elizaLogger.error('Error parsing bridge message:', error);
        }
      });

      this.websocket.on('error', (error) => {
        elizaLogger.error('WebSocket error:', error);
        reject(error);
      });

      this.websocket.on('close', () => {
        elizaLogger.warn('WebSocket connection closed');
        this.websocket = null;
      });
    });
  }

  private handleBridgeMessage(message: BridgeMessage): void {
    const handler = this.messageHandlers.get(message.id);
    if (handler) {
      handler(message);
      this.messageHandlers.delete(message.id);
    } else {
      elizaLogger.warn('No handler for bridge message:', message.id);
    }
  }

  private async sendBridgeMessage(message: Omit<BridgeMessage, 'timestamp' | 'source'>): Promise<BridgeMessage> {
    if (!this.websocket) {
      throw new Error('WebSocket not connected');
    }

    const fullMessage: BridgeMessage = {
      ...message,
      timestamp: Date.now(),
      source: 'typescript',
    };

    return new Promise((resolve, reject) => {
      this.messageHandlers.set(message.id, (response) => {
        if (response.type === 'error') {
          reject(new Error(response.payload.error));
        } else {
          resolve(response);
        }
      });

      this.websocket!.send(JSON.stringify(fullMessage));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.messageHandlers.has(message.id)) {
          this.messageHandlers.delete(message.id);
          reject(new Error('Bridge message timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Start training with Atropos
   */
  async startTraining(job: TrainingJob): Promise<void> {
    elizaLogger.info(`Starting Atropos training for job ${job.id}`);

    const message = await this.sendBridgeMessage({
      id: `start-training-${job.id}`,
      type: 'command',
      payload: {
        job_id: job.id,
        training_config: {
          model_name: job.config.atroposConfig.environment,
          training_steps: job.config.atroposConfig.maxSteps,
          batch_size: job.config.atroposConfig.batchSize,
          learning_rate: job.config.atroposConfig.learningRate,
          warmup_steps: job.config.atroposConfig.warmupSteps,
          eval_steps: job.config.atroposConfig.evalSteps,
          save_steps: job.config.atroposConfig.saveSteps,
          use_wandb: true,
          wandb_project: 'eliza-training',
        },
      },
    });

    elizaLogger.info(`Training started successfully for job ${job.id}`);
  }

  /**
   * Get training status from Atropos
   */
  async getTrainingStatus(jobId: string): Promise<Partial<TrainingJob>> {
    const message = await this.sendBridgeMessage({
      id: `status-${jobId}`,
      type: 'command',
      payload: {
        job_id: jobId,
      },
    });

    const status = message.payload;
    
    return {
      status: status.status === 'running' ? 'running' : 
             status.status === 'completed' ? 'completed' : 'failed',
      progress: status.progress,
      metrics: status.metrics,
    };
  }

  /**
   * Stop training job
   */
  async stopTraining(jobId: string): Promise<void> {
    await this.sendBridgeMessage({
      id: `stop-${jobId}`,
      type: 'command',
      payload: {
        job_id: jobId,
      },
    });

    elizaLogger.info(`Training stopped for job ${jobId}`);
  }

  /**
   * Create Atropos environment
   */
  async createEnvironment(config: AtroposEnvironment): Promise<void> {
    await this.sendBridgeMessage({
      id: `create-env-${config.name}`,
      type: 'command',
      payload: {
        name: config.name,
        type: config.type,
        config: config.config,
      },
    });

    this.activeEnvironments.set(config.name, config);
    elizaLogger.info(`Created environment: ${config.name}`);
  }

  /**
   * Health check for bridge
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.sendBridgeMessage({
        id: `health-${Date.now()}`,
        type: 'command',
        payload: {},
      });
      return true;
    } catch (error) {
      elizaLogger.error('Bridge health check failed:', error);
      return false;
    }
  }

  private async runCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { stdio: 'pipe' });
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Command failed: ${stderr.trim()}`));
        }
      });
    });
  }

  async cleanup(): Promise<void> {
    elizaLogger.info('Cleaning up Atropos Bridge');

    // Close WebSocket
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    // Stop Python process
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
    }

    // Clear handlers
    this.messageHandlers.clear();
    this.activeEnvironments.clear();

    elizaLogger.info('Atropos Bridge cleaned up');
  }
}