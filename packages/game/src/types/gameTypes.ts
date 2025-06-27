import type { Agent, Task, Room } from '@elizaos/core';

// Define Goal interface since it may not be exported from core
export interface Goal {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'failed' | 'paused';
  objectives?: {
    description: string;
    completed: boolean;
  }[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: number;
  updatedAt: number;
  dueDate?: number;
  assignedAgent?: string;
  metadata?: Record<string, any>;
}

// Re-export Task from core
export type { Task };

export type GameMode = 'auto' | 'manual' | 'paused';
export type ExecutionEnvironment = 'local' | 'local-sandbox' | 'hosted-sandbox';
export type ProjectStatus = 'planning' | 'coding' | 'testing' | 'deploying' | 'complete' | 'failed';

export interface GameState {
  mode: GameMode;
  orchestratorAgent?: Agent;
  coderAgents: Agent[];
  activeProjects: Project[];
  executionEnvironment: ExecutionEnvironment;
  communicationRooms: Room[];
  completedTasks: Task[];
  activeGoals: Goal[];
  isInitialized: boolean;
  lastActivity: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  assignedAgent?: string;
  status: ProjectStatus;
  repository?: string;
  artifacts: string[];
  requirements: string[];
  roomId?: string;
  createdAt: number;
  updatedAt: number;
  estimatedCompletion?: number;
  progress: number; // 0-100
}

export interface AgentMessage {
  type: 'status' | 'request' | 'response' | 'coordination' | 'completion' | 'error';
  fromAgent: string;
  toAgent?: string; // undefined for broadcast
  roomId: string;
  content: {
    text: string;
    data?: any;
    attachments?: File[];
    metadata?: Record<string, any>;
  };
  timestamp: number;
  id: string;
}

export interface CoordinationRequest {
  type: 'help_needed' | 'resource_request' | 'code_review' | 'testing_assistance' | 'deployment_help';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  requirements: string[];
  timeoutMs?: number;
  requestId: string;
  fromAgent: string;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  errors?: string[];
  artifacts?: string[];
  resourceUsage: {
    cpu: number;
    memory: number;
    duration: number;
  };
  executionId: string;
  agentId: string;
  timestamp: number;
}

export interface AgentStatus {
  id: string;
  name: string;
  status: 'idle' | 'working' | 'communicating' | 'sleeping' | 'error' | 'offline';
  currentTask?: string;
  progress?: number;
  lastActivity: number;
  assignedProject?: string;
  resourceUsage: {
    cpu: number;
    memory: number;
  };
}

export interface GameMetrics {
  totalProjects: number;
  completedProjects: number;
  activeAgents: number;
  totalCodeGenerated: number; // lines of code
  testsPassed: number;
  deploymentSuccess: number;
  averageCompletionTime: number; // milliseconds
  errorRate: number; // percentage
}

export interface GameConfig {
  maxCoderAgents: number;
  autonomyInterval: number;
  defaultExecutionEnvironment: ExecutionEnvironment;
  autoModeEnabled: boolean;
  resourceLimits: {
    maxCpuPerAgent: number;
    maxMemoryPerAgent: number;
    maxExecutionTime: number;
  };
  securitySettings: {
    sandboxIsolation: boolean;
    codeReviewRequired: boolean;
    trustedDomainsOnly: boolean;
  };
}