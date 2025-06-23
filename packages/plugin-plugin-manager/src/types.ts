import type {
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  Plugin,
  ServiceTypeName,
} from '@elizaos/core';

// Service type for the plugin manager
export const PluginManagerServiceType: Record<string, ServiceTypeName> = {
  PLUGIN_MANAGER: 'plugin_manager' as ServiceTypeName,
};

export const PluginStatus = {
  BUILDING: 'building',
  READY: 'ready',
  LOADED: 'loaded',
  ERROR: 'error',
  UNLOADED: 'unloaded',
  NEEDS_CONFIGURATION: 'needs_configuration',
  CONFIGURATION_IN_PROGRESS: 'configuration_in_progress',
} as const;

export type PluginStatus = (typeof PluginStatus)[keyof typeof PluginStatus];

// Configuration-related types
export interface PluginEnvironmentVariable {
  name: string;
  description: string;
  sensitive: boolean;
  required: boolean;
  defaultValue?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    enum?: string[];
  };
}

export interface PluginConfigurationRequest {
  pluginName: string;
  requiredVars: PluginEnvironmentVariable[];
  missingVars: string[];
  optionalVars: PluginEnvironmentVariable[];
}

export interface ConfigurationDialog {
  id: string;
  pluginName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  request: PluginConfigurationRequest;
  responses: Record<string, string>;
  currentVariable?: string;
  startedAt: Date;
  completedAt?: Date;
}

// Component tracking types
export interface PluginComponents {
  actions: Set<string>;
  providers: Set<string>;
  evaluators: Set<string>;
  services: Set<string>;
  eventHandlers: Map<string, Set<Function>>;
}

export interface ComponentRegistration {
  pluginId: string;
  componentType: 'action' | 'provider' | 'evaluator' | 'service' | 'eventHandler';
  componentName: string;
  timestamp: number;
}

export interface PluginState {
  id: string;
  name: string;
  status: PluginStatus;
  plugin?: Plugin;
  missingEnvVars: string[];
  buildLog: string[];
  sourceCode?: string;
  packageJson?: any;
  error?: string;
  createdAt: number;
  loadedAt?: number;
  unloadedAt?: number;
  version?: string;
  dependencies?: Record<string, string>;
  // Configuration-related fields
  configurationStatus?: 'unconfigured' | 'partial' | 'complete';
  requiredConfiguration?: PluginEnvironmentVariable[];
  configurationErrors?: string[];
  // Component tracking
  components?: PluginComponents;
}

export interface PluginRegistry {
  plugins: Map<string, PluginState>;
  getPlugin(id: string): PluginState | undefined;
  getAllPlugins(): PluginState[];
  getLoadedPlugins(): PluginState[];
  updatePluginState(id: string, update: Partial<PluginState>): void;
}

export interface CreatePluginParams {
  name: string;
  description: string;
  capabilities: string[];
  dependencies?: string[];
}

export interface LoadPluginParams {
  pluginId: string;
  force?: boolean;
}

export interface UnloadPluginParams {
  pluginId: string;
}

export interface PluginManagerConfig {
  maxBuildAttempts?: number;
  buildTimeout?: number;
  pluginDirectory?: string;
  enableHotReload?: boolean;
}

export interface InstallProgress {
  phase: 'downloading' | 'extracting' | 'installing' | 'validating' | 'complete';
  progress: number; // 0-100
  message: string;
}

export const EventType = {
  PLUGIN_BUILDING: 'PLUGIN_BUILDING',
  PLUGIN_READY: 'PLUGIN_READY',
  PLUGIN_LOADED: 'PLUGIN_LOADED',
  PLUGIN_UNLOADED: 'PLUGIN_UNLOADED',
  PLUGIN_ERROR: 'PLUGIN_ERROR',
  PLUGIN_ENV_MISSING: 'PLUGIN_ENV_MISSING',
  PLUGIN_CONFIGURATION_REQUIRED: 'PLUGIN_CONFIGURATION_REQUIRED',
  PLUGIN_CONFIGURATION_STARTED: 'PLUGIN_CONFIGURATION_STARTED',
  PLUGIN_CONFIGURATION_COMPLETED: 'PLUGIN_CONFIGURATION_COMPLETED',
} as const;

export interface PluginSearchResult {
  name: string;
  description: string;
  relevantSection?: string;
  tags?: string[];
  repository?: string;
  version?: string;
}

export interface SearchResult {
  plugin: PluginSearchResult;
  score: number;
  matchReasons: string[];
}

export interface AgentContext {
  recentActions: string[];
  currentCapabilities: string[];
  failedActions: string[];
  userIntent?: string;
}

export interface PluginManagerMetadata {
  version: string;
  installedPlugins: Array<{
    id: string;
    name: string;
    version: string;
    installedAt: number;
  }>;
  lastUpdated: number;
}

// Health Monitoring Types
export enum HealthStatus {
  HEALTHY = 0,
  WARNING = 1,
  UNHEALTHY = 2,
  UNKNOWN = 3,
}

export interface HealthCheckResult {
  status: HealthStatus;
  message: string;
  details: Record<string, any>;
  timestamp: number;
}

export interface HealthMetrics {
  timestamp: number;
  status: HealthStatus;
  [key: string]: any; // Allow arbitrary metric values
}

export interface AlertThreshold {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==';
  value: number;
  duration: number; // How long the condition must persist before alerting
}

// GitHub Types
export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  defaultBranch: string;
  description?: string;
  stars: number;
  language?: string;
  license?: string;
  topics?: string[];
  isPrivate: boolean;
  size: number;
  updatedAt: string;
}

// Publishing Types
export interface PublishResult {
  success: boolean;
  packageName?: string;
  version?: string;
  npmUrl?: string;
  registryUrl?: string;
  error?: string;
  warnings?: string[];
}

export type ActionHandler = (
  runtime: IAgentRuntime,
  message: Memory,
  state?: State,
  options?: Record<string, any>,
  callback?: HandlerCallback
) => Promise<any>;
