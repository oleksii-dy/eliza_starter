import { WebSocket, WebSocketServer } from 'ws';
import express from 'express';
import { createServer } from 'http';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { elizaLogger } from '@elizaos/core';
import axios from 'axios';

interface Container {
  id: string;
  languageType: string;
  capabilities: {
    languages: string[];
    buildTools: string[];
    testFrameworks: string[];
  };
  status: 'idle' | 'busy' | 'offline';
  currentTask: string | null;
  lastHeartbeat: Date;
  ws: WebSocket;
}

interface Task {
  id: string;
  type: string;
  data: any;
  language: string;
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  containerId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export class BridgeServer {
  private wss: WebSocketServer;
  private app: express.Application;
  private server: any;
  private redis: Redis;
  private containers: Map<string, Container> = new Map();
  private tasks: Map<string, Task> = new Map();
  private centralServerUrl: string;
  private metricsPort: number = 8081;

  constructor(config: {
    port?: number;
    redisUrl?: string;
    centralServerUrl?: string;
  }) {
    this.app = express();
    this.app.use(express.json());
    
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    
    this.redis = new Redis(config.redisUrl || 'redis://localhost:6379');
    this.centralServerUrl = config.centralServerUrl || 'http://localhost:3000';
    
    this.setupRoutes();
    this.setupWebSocket();
    this.setupRedis();
    this.startHeartbeatChecker();
    this.startMetricsServer();
    
    const port = config.port || 8080;
    this.server.listen(port, () => {
      elizaLogger.info(`Bridge server listening on port ${port}`);
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        containers: this.containers.size,
        activeTasks: Array.from(this.tasks.values()).filter(t => t.status === 'running').length,
        pendingTasks: Array.from(this.tasks.values()).filter(t => t.status === 'pending').length
      });
    });

    // Submit task
    this.app.post('/task', async (req, res) => {
      const task: Task = {
        id: uuidv4(),
        type: req.body.type,
        data: req.body.data,
        language: req.body.language,
        priority: req.body.priority || 0,
        createdAt: new Date(),
        status: 'pending'
      };

      await this.addTask(task);
      res.json({ taskId: task.id });
    });

    // Get task status
    this.app.get('/task/:id', (req, res) => {
      const task = this.tasks.get(req.params.id);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      res.json(task);
    });

    // Get all containers
    this.app.get('/containers', (req, res) => {
      const containers = Array.from(this.containers.values()).map(c => ({
        id: c.id,
        languageType: c.languageType,
        capabilities: c.capabilities,
        status: c.status,
        currentTask: c.currentTask,
        lastHeartbeat: c.lastHeartbeat
      }));
      res.json(containers);
    });

    // Force container shutdown
    this.app.post('/containers/:id/shutdown', (req, res) => {
      const container = this.containers.get(req.params.id);
      if (!container) {
        res.status(404).json({ error: 'Container not found' });
        return;
      }

      this.sendToContainer(container, {
        type: 'shutdown'
      });

      res.json({ message: 'Shutdown command sent' });
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      elizaLogger.info('New WebSocket connection');

      ws.on('message', async (data: string) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          elizaLogger.error('Failed to handle message:', error);
        }
      });

      ws.on('close', () => {
        // Find and remove container
        for (const [id, container] of this.containers.entries()) {
          if (container.ws === ws) {
            elizaLogger.info(`Container ${id} disconnected`);
            this.containers.delete(id);
            
            // Requeue any running task
            if (container.currentTask) {
              const task = this.tasks.get(container.currentTask);
              if (task) {
                task.status = 'pending';
                task.containerId = undefined;
                this.addTask(task);
              }
            }
            break;
          }
        }
      });

      ws.on('error', (error) => {
        elizaLogger.error('WebSocket error:', error);
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case 'register':
        await this.handleRegister(ws, message);
        break;
      
      case 'heartbeat':
        await this.handleHeartbeat(message);
        break;
      
      case 'task_started':
        await this.handleTaskStarted(message);
        break;
      
      case 'task_completed':
        await this.handleTaskCompleted(message);
        break;
      
      case 'task_failed':
        await this.handleTaskFailed(message);
        break;
      
      case 'status_report':
        await this.handleStatusReport(message);
        break;
    }
  }

  private async handleRegister(ws: WebSocket, message: any) {
    const container: Container = {
      id: message.containerId,
      languageType: message.languageType,
      capabilities: message.capabilities,
      status: 'idle',
      currentTask: null,
      lastHeartbeat: new Date(),
      ws
    };

    this.containers.set(container.id, container);
    elizaLogger.info(`Container ${container.id} registered with capabilities:`, container.capabilities);

    // Notify central server
    try {
      await axios.post(`${this.centralServerUrl}/containers/registered`, {
        containerId: container.id,
        languageType: container.languageType,
        capabilities: container.capabilities
      });
    } catch (error) {
      elizaLogger.error('Failed to notify central server:', error);
    }

    // Check for pending tasks
    this.assignPendingTasks();
  }

  private async handleHeartbeat(message: any) {
    const container = this.containers.get(message.containerId);
    if (container) {
      container.lastHeartbeat = new Date();
      container.status = message.status;
    }
  }

  private async handleTaskStarted(message: any) {
    const task = this.tasks.get(message.taskId);
    if (task) {
      task.status = 'running';
      task.startedAt = new Date();
      task.containerId = message.containerId;

      // Update container status
      const container = this.containers.get(message.containerId);
      if (container) {
        container.status = 'busy';
        container.currentTask = message.taskId;
      }

      // Notify central server
      try {
        await axios.post(`${this.centralServerUrl}/tasks/started`, {
          taskId: task.id,
          containerId: message.containerId
        });
      } catch (error) {
        elizaLogger.error('Failed to notify central server:', error);
      }
    }
  }

  private async handleTaskCompleted(message: any) {
    const task = this.tasks.get(message.taskId);
    if (task) {
      task.status = 'completed';
      task.completedAt = new Date();
      task.result = message.result;

      // Update container status
      const container = this.containers.get(message.containerId);
      if (container) {
        container.status = 'idle';
        container.currentTask = null;
      }

      // Notify central server
      try {
        await axios.post(`${this.centralServerUrl}/tasks/completed`, {
          taskId: task.id,
          result: task.result
        });
      } catch (error) {
        elizaLogger.error('Failed to notify central server:', error);
      }

      // Remove from active tasks after a delay
      setTimeout(() => {
        this.tasks.delete(task.id);
      }, 300000); // 5 minutes

      // Check for more tasks
      this.assignPendingTasks();
    }
  }

  private async handleTaskFailed(message: any) {
    const task = this.tasks.get(message.taskId);
    if (task) {
      task.status = 'failed';
      task.completedAt = new Date();
      task.error = message.error;

      // Update container status
      const container = this.containers.get(message.containerId);
      if (container) {
        container.status = 'idle';
        container.currentTask = null;
      }

      // Notify central server
      try {
        await axios.post(`${this.centralServerUrl}/tasks/failed`, {
          taskId: task.id,
          error: task.error
        });
      } catch (error) {
        elizaLogger.error('Failed to notify central server:', error);
      }

      // Check for more tasks
      this.assignPendingTasks();
    }
  }

  private async handleStatusReport(message: any) {
    const container = this.containers.get(message.containerId);
    if (container) {
      container.status = message.status;
      container.capabilities = message.capabilities;
      container.lastHeartbeat = new Date();
    }
  }

  private async addTask(task: Task) {
    this.tasks.set(task.id, task);
    
    // Add to Redis queue
    await this.redis.zadd('task_queue', task.priority, JSON.stringify({
      id: task.id,
      language: task.language
    }));

    elizaLogger.info(`Task ${task.id} added to queue`);
    
    // Try to assign immediately
    this.assignPendingTasks();
  }

  private async assignPendingTasks() {
    // Get available containers
    const availableContainers = Array.from(this.containers.values())
      .filter(c => c.status === 'idle');

    if (availableContainers.length === 0) {
      return;
    }

    // Get pending tasks from Redis
    const pendingTaskData = await this.redis.zrevrange('task_queue', 0, availableContainers.length - 1);

    for (const taskData of pendingTaskData) {
      const { id, language } = JSON.parse(taskData);
      const task = this.tasks.get(id);

      if (!task || task.status !== 'pending') {
        await this.redis.zrem('task_queue', taskData);
        continue;
      }

      // Find suitable container
      const container = availableContainers.find(c => {
        if (c.status !== 'idle') return false;
        
        // Check if container supports the language
        if (language === 'typescript' || language === 'javascript') {
          return c.capabilities.languages.includes('typescript') || c.capabilities.languages.includes('javascript');
        }
        
        return c.capabilities.languages.includes(language);
      });

      if (container) {
        // Assign task
        container.status = 'busy';
        container.currentTask = task.id;
        task.containerId = container.id;

        // Send task to container
        this.sendToContainer(container, {
          type: 'task',
          task: {
            id: task.id,
            type: task.type,
            data: task.data
          }
        });

        // Remove from queue
        await this.redis.zrem('task_queue', taskData);

        elizaLogger.info(`Task ${task.id} assigned to container ${container.id}`);
      }
    }
  }

  private sendToContainer(container: Container, message: any) {
    if (container.ws.readyState === WebSocket.OPEN) {
      container.ws.send(JSON.stringify(message));
    }
  }

  private setupRedis() {
    this.redis.on('error', (error) => {
      elizaLogger.error('Redis error:', error);
    });

    this.redis.on('connect', () => {
      elizaLogger.info('Connected to Redis');
    });
  }

  private startHeartbeatChecker() {
    setInterval(() => {
      const now = new Date();
      const timeout = 60000; // 1 minute

      for (const [id, container] of this.containers.entries()) {
        if (now.getTime() - container.lastHeartbeat.getTime() > timeout) {
          elizaLogger.warn(`Container ${id} timed out`);
          this.containers.delete(id);

          // Requeue task if any
          if (container.currentTask) {
            const task = this.tasks.get(container.currentTask);
            if (task) {
              task.status = 'pending';
              task.containerId = undefined;
              this.addTask(task);
            }
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private startMetricsServer() {
    const metricsApp = express();

    metricsApp.get('/metrics', (req, res) => {
      const metrics = this.collectMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    });

    metricsApp.listen(this.metricsPort, () => {
      elizaLogger.info(`Metrics server listening on port ${this.metricsPort}`);
    });
  }

  private collectMetrics(): string {
    const metrics: string[] = [];

    // Container metrics
    metrics.push(`# HELP swebench_containers_total Total number of connected containers`);
    metrics.push(`# TYPE swebench_containers_total gauge`);
    metrics.push(`swebench_containers_total ${this.containers.size}`);

    // Container status metrics
    const statusCounts = { idle: 0, busy: 0, offline: 0 };
    for (const container of this.containers.values()) {
      statusCounts[container.status]++;
    }

    metrics.push(`# HELP swebench_containers_by_status Number of containers by status`);
    metrics.push(`# TYPE swebench_containers_by_status gauge`);
    for (const [status, count] of Object.entries(statusCounts)) {
      metrics.push(`swebench_containers_by_status{status="${status}"} ${count}`);
    }

    // Task metrics
    const taskStatusCounts = { pending: 0, running: 0, completed: 0, failed: 0 };
    for (const task of this.tasks.values()) {
      taskStatusCounts[task.status]++;
    }

    metrics.push(`# HELP swebench_tasks_by_status Number of tasks by status`);
    metrics.push(`# TYPE swebench_tasks_by_status gauge`);
    for (const [status, count] of Object.entries(taskStatusCounts)) {
      metrics.push(`swebench_tasks_by_status{status="${status}"} ${count}`);
    }

    return metrics.join('\n');
  }

  async shutdown() {
    elizaLogger.info('Shutting down bridge server...');

    // Notify all containers
    for (const container of this.containers.values()) {
      this.sendToContainer(container, { type: 'shutdown' });
    }

    // Close connections
    this.wss.close();
    await this.redis.quit();
    this.server.close();
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new BridgeServer({
    port: parseInt(process.env.PORT || '8080'),
    redisUrl: process.env.REDIS_URL,
    centralServerUrl: process.env.CENTRAL_SERVER_URL
  });

  process.on('SIGINT', async () => {
    await server.shutdown();
    process.exit(0);
  });
} 