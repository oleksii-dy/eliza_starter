import {
  createUniqueUuid,
  logger,
  ModelType,
  Service,
  type IAgentRuntime,
  type Plugin,
  type ServiceTypeName,
} from '@elizaos/core';
import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';
import { applyRuntimeExtensions } from '../coreExtensions.ts';
import {
  EventType,
  PluginManagerServiceType,
  PluginStatusValues,
  type ComponentRegistration,
  type InstallProgress,
  type LoadPluginParams,
  type PluginComponents,
  type PluginManagerConfig,
  type PluginRegistry,
  type PluginState,
  type UnloadPluginParams,
} from '../types.ts';
import { DependencyResolverManager } from '../managers/DependencyResolverManager.ts';
import { VersionManager } from '../managers/VersionManager.ts';
import { ConfigurationManager } from '../managers/ConfigurationManager.ts';
import { HealthMonitoringManager } from '../managers/HealthMonitoringManager.ts';
import { InstallationManager } from '../managers/InstallationManager.ts';
import { RegistryManager } from '../managers/RegistryManager.ts';
// GitHubService is now accessed from @elizaos/plugin-github dependency

const execAsync = promisify(exec);

// Registry installation types and functions
interface RegistryEntry {
  name: string;
  description?: string;
  repository: string;
  npm?: {
    repo: string;
    v1?: string;
  };
  git?: {
    repo: string;
    v1?: {
      branch?: string;
      version?: string;
    };
  };
}

interface DynamicPluginInfo {
  name: string;
  version: string;
  status: 'installed' | 'loaded' | 'active' | 'inactive' | 'error' | 'needs_configuration';
  path: string;
  requiredEnvVars: Array<{
    name: string;
    description: string;
    sensitive: boolean;
    isSet: boolean;
  }>;
  errorDetails?: string;
  installedAt: Date;
  lastActivated?: Date;
}

const REGISTRY_URL =
  'https://raw.githubusercontent.com/elizaos-plugins/registry/refs/heads/main/index.json';
const CACHE_DURATION = 3600000; // 1 hour

let registryCache: {
  data: Record<string, RegistryEntry>;
  timestamp: number;
} | null = null;

// Function to reset cache for testing
export function resetRegistryCache(): void {
  registryCache = null;
}

// Registry functions
async function getLocalRegistryIndex(): Promise<Record<string, RegistryEntry>> {
  // Check cache first
  if (registryCache && Date.now() - registryCache.timestamp < CACHE_DURATION) {
    return registryCache.data;
  }

  try {
    const response = await fetch(REGISTRY_URL);
    if (!response.ok) {
      throw new Error(`Registry fetch failed: ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, RegistryEntry>;

    // Cache the result
    registryCache = {
      data,
      timestamp: Date.now(),
    };

    return data;
  } catch (error) {
    logger.error('Failed to fetch plugin registry:', error);

    // Return cached data if available, otherwise empty registry
    if (registryCache) {
      logger.warn('Using stale registry cache');
      return registryCache.data;
    }

    // Return empty registry as fallback
    return {};
  }
}

// Real plugin installation function using npm/git
async function _installPlugin(
  pluginName: string,
  targetDir: string,
  version?: string,
  onProgress?: (progress: InstallProgress) => void
): Promise<void> {
  logger.info(`Installing ${pluginName}${version ? `@${version}` : ''} to ${targetDir}`);

  try {
    // Ensure target directory exists
    await fs.ensureDir(targetDir);

    onProgress?.({
      phase: 'downloading',
      progress: 10,
      message: 'Fetching plugin registry...',
    });

    // Get registry entry to determine installation method
    const registry = await getLocalRegistryIndex();
    const entry = registry[pluginName];

    if (!entry) {
      throw new Error(`Plugin ${pluginName} not found in registry`);
    }

    // Determine installation method
    if (entry.npm?.repo) {
      // Install from npm
      const packageName = entry.npm.repo;
      const packageVersion = version || entry.npm.v1 || 'latest';

      await installFromNpm(packageName, packageVersion, targetDir, onProgress);
    } else if (entry.git?.repo) {
      // Install from git
      const gitRepo = entry.git.repo;
      const gitVersion = version || entry.git.v1?.version || entry.git.v1?.branch || 'main';

      await installFromGit(gitRepo, gitVersion, targetDir, onProgress);
    } else {
      throw new Error(`No installation method available for plugin ${pluginName}`);
    }
  } catch (error: any) {
    logger.error(`Failed to install plugin ${pluginName}:`, error);
    throw error; // Re-throw to preserve specific error messages
  }
}

// Install plugin from npm
async function installFromNpm(
  packageName: string,
  version: string,
  targetDir: string,
  onProgress?: (progress: InstallProgress) => void
): Promise<void> {
  logger.info(`Installing npm package ${packageName}@${version}`);

  try {
    const { execa } = await import('execa');

    onProgress?.({
      phase: 'downloading',
      progress: 30,
      message: `Downloading ${packageName}@${version}...`,
    });

    // Install the package to the target directory
    await execa('npm', ['install', `${packageName}@${version}`, '--prefix', targetDir], {
      stdio: 'pipe',
    });

    onProgress?.({
      phase: 'installing',
      progress: 80,
      message: 'Installing dependencies...',
    });
  } catch (error: any) {
    logger.error('Failed to install npm package:', error);
    throw error;
  }
}

// Install plugin from git repository
async function installFromGit(
  gitRepo: string,
  version: string,
  targetDir: string,
  onProgress?: (progress: InstallProgress) => void
): Promise<void> {
  logger.info(`Installing git repository ${gitRepo}#${version}`);

  try {
    const { execa } = await import('execa');

    // Clone the repository to a temporary directory
    const tempDir = path.join(targetDir, '..', `temp-${Date.now()}`);
    await fs.ensureDir(tempDir);

    try {
      onProgress?.({
        phase: 'downloading',
        progress: 20,
        message: `Cloning repository ${gitRepo}...`,
      });

      // Clone the repository
      await execa('git', ['clone', gitRepo, tempDir], {
        stdio: 'pipe',
      });

      // Checkout specific version/branch if specified
      if (version !== 'main' && version !== 'master') {
        onProgress?.({
          phase: 'extracting',
          progress: 40,
          message: `Checking out version ${version}...`,
        });

        await execa('git', ['checkout', version], {
          cwd: tempDir,
          stdio: 'pipe',
        });
      }

      onProgress?.({
        phase: 'installing',
        progress: 60,
        message: 'Installing dependencies...',
      });

      // Install dependencies
      await execa('npm', ['install'], {
        cwd: tempDir,
        stdio: 'pipe',
      });

      onProgress?.({
        phase: 'extracting',
        progress: 80,
        message: 'Copying files...',
      });

      // Copy to target directory
      await fs.copy(tempDir, targetDir);
    } finally {
      // Clean up temp directory
      await fs.remove(tempDir);
    }
  } catch (error: any) {
    logger.error('Failed to install git repository:', error);
    throw error;
  }
}

// --- Merged Types ---

export interface CloneResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface PullRequest {
  id: number;
  url: string;
  title: string;
  state: string;
}

export interface Changes {
  branch: string;
  title: string;
  body: string;
  files: { path: string; content: string }[];
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

export interface RankedPlugin {
  plugin: PluginSearchResult;
  relevanceScore: number;
  reasoning: string;
  capabilities: string[];
}

export interface CapabilityProfile {
  core: string[];
  plugins: Map<string, string[]>;
  coverage: { [key: string]: number };
  limitations: string[];
}

export interface CapabilityGap {
  missingCapability: string;
  confidence: number;
  suggestedPlugins: string[];
  alternativeApproaches: string[];
}

export interface Task {
  action: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface ExecutionContext {
  task: string;
  parameters: Record<string, any>;
  environment: Record<string, any>;
}

export interface PluginSearchResult {
  name: string;
  description: string;
  relevantSection?: string;
  tags?: string[];
  repository?: string;
  version?: string;
}

export interface PublishResult {
  success: boolean;
  packageName?: string;
  version?: string;
  npmUrl?: string;
  registryPR?: string;
  error?: string;
}

export class PluginManagerService extends Service implements PluginRegistry {
  static override serviceType: ServiceTypeName = PluginManagerServiceType.PLUGIN_MANAGER;
  override capabilityDescription =
    'Manages the full lifecycle of plugins, from discovery and installation to configuration and execution.';

  public plugins: Map<string, PluginState> = new Map();
  private pluginManagerConfig: PluginManagerConfig;
  private originalPlugins: Plugin[] = [];
  private originalActions: Set<string> = new Set();
  private originalProviders: Set<string> = new Set();
  private originalEvaluators: Set<string> = new Set();
  private originalServices: Set<string> = new Set();

  // Add registry installation state management
  private installedPlugins: Map<string, DynamicPluginInfo> = new Map();

  // Component tracking
  private componentRegistry: Map<string, ComponentRegistration[]> = new Map();

  // --- Merged State Properties ---
  private modelCache: Map<string, { key: string; result: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MODEL = 1000 * 60 * 30; // 30 minutes

  private capabilityCache: CapabilityProfile | null = null;
  private cacheTimestamp: number = 0; // for capability cache
  private readonly CACHE_TTL_CAPABILITY = 1000 * 60 * 5; // 5 minutes

  private taskHistory: Task[] = [];

  // Internal managers - not exposed as services
  private githubService: any | null = null; // GitHub service from @elizaos/plugin-github
  private dependencyResolver!: DependencyResolverManager;
  private versionManager!: VersionManager;
  private installationManager!: InstallationManager;
  private configurationManager!: ConfigurationManager;
  private registryManager!: RegistryManager;
  private healthMonitoringManager!: HealthMonitoringManager;

  constructor(runtime: IAgentRuntime, config?: PluginManagerConfig) {
    super(runtime);
    this.pluginManagerConfig = {
      maxBuildAttempts: 3,
      buildTimeout: 60000,
      pluginDirectory: './plugins',
      enableHotReload: true,
      ...config,
    };
    applyRuntimeExtensions(runtime);
    this.originalPlugins = [...(runtime.plugins || [])];
    this.storeOriginalComponents();
    this.initializeRegistry();

    // GitHub service is used internally, no need to register it

    // Register Plugin Discovery service if runtime supports it
    // if (typeof runtime.registerService === 'function') {
    //   runtime.registerService(PluginDiscoveryService);
    // }

    // Register ML Recommendation service if runtime supports it
    // if (typeof runtime.registerService === 'function') {
    //   runtime.registerService(MLRecommendationServiceImpl);
    // }

    // Register Capability Analysis service if runtime supports it
    // if (typeof runtime.registerService === 'function') {
    //   runtime.registerService(CapabilityAnalysisServiceImpl);
    // }

    // Initialize plugin registry service with dependencies
    // initializePluginRegistryService(runtime);
  }

  static async start(
    runtime: IAgentRuntime,
    config?: PluginManagerConfig
  ): Promise<PluginManagerService> {
    const service = new PluginManagerService(runtime, config);

    // Initialize internal managers (not exposed as services)
    await service.initializeInternalManagers();

    // Only log in non-test environments
    const nodeEnv = runtime.getSetting('NODE_ENV');
    const vitest = runtime.getSetting('VITEST');
    if (nodeEnv !== 'test' && !vitest) {
      logger.info('[PluginManagerService] Initialized with simplified architecture.');
    }

    return service;
  }

  private storeOriginalComponents(): void {
    // Store original action names
    if (this.runtime.actions) {
      for (const action of this.runtime.actions) {
        this.originalActions.add(action.name);
      }
    }

    // Store original provider names
    if (this.runtime.providers) {
      for (const provider of this.runtime.providers) {
        this.originalProviders.add(provider.name);
      }
    }

    // Store original evaluator names
    if (this.runtime.evaluators) {
      for (const evaluator of this.runtime.evaluators) {
        this.originalEvaluators.add(evaluator.name);
      }
    }

    // Store original service types
    if (this.runtime.services) {
      for (const [serviceType] of this.runtime.services) {
        this.originalServices.add(serviceType);
      }
    }
  }

  private initializeRegistry(): void {
    // Register existing plugins
    for (const plugin of this.originalPlugins) {
      const pluginId = createUniqueUuid(this.runtime, plugin.name);
      const state: PluginState = {
        id: pluginId,
        name: plugin.name,
        status: PluginStatusValues.LOADED,
        plugin,
        missingEnvVars: [],
        buildLog: [],
        createdAt: Date.now(),
        loadedAt: Date.now(),
        components: {
          actions: new Set(),
          providers: new Set(),
          evaluators: new Set(),
          services: new Set(),
          eventHandlers: new Map(),
        },
      };

      // Track original plugin components
      if (plugin.actions) {
        for (const action of plugin.actions) {
          state.components!.actions.add(action.name);
        }
      }
      if (plugin.providers) {
        for (const provider of plugin.providers) {
          state.components!.providers.add(provider.name);
        }
      }
      if (plugin.evaluators) {
        for (const evaluator of plugin.evaluators) {
          state.components!.evaluators.add(evaluator.name);
        }
      }
      if (plugin.services) {
        for (const service of plugin.services) {
          // Handle both direct service references and wrapper objects
          const serviceClass = 'component' in service ? service.component : service;
          state.components!.services.add(serviceClass.serviceType || '');
        }
      }

      this.plugins.set(pluginId, state);
    }
  }

  private async initializeInternalManagers(): Promise<void> {
    // Initialize internal managers
    // Try to get the GitHub service from @elizaos/plugin-github if it's available
    this.githubService = this.runtime.getService('GITHUB');
    if (!this.githubService) {
      // Only warn in non-test environments
      const nodeEnv = this.runtime.getSetting('NODE_ENV');
      const vitest = this.runtime.getSetting('VITEST');
      if (nodeEnv !== 'test' && !vitest) {
        logger.warn(
          '[PluginManagerService] GitHub service not available - GitHub features will be disabled. Make sure @elizaos/plugin-github is loaded.'
        );
      }
    }

    this.dependencyResolver = new DependencyResolverManager(this.runtime);
    this.versionManager = new VersionManager(this.runtime);

    // Initialize managers that need async setup
    this.installationManager = new InstallationManager(this.runtime);
    await this.installationManager.initialize();

    this.configurationManager = new ConfigurationManager(this.runtime);
    await this.configurationManager.initialize();

    this.registryManager = new RegistryManager(this.runtime);
    await this.registryManager.initialize();

    this.healthMonitoringManager = new HealthMonitoringManager(this.runtime);
    await this.healthMonitoringManager.initialize();
  }

  getPlugin(id: string): PluginState | undefined {
    return this.plugins.get(id);
  }

  getPluginState(id: string): PluginState | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): PluginState[] {
    return Array.from(this.plugins.values());
  }

  getLoadedPlugins(): PluginState[] {
    return this.getAllPlugins().filter((p) => p.status === PluginStatusValues.LOADED);
  }

  updatePluginState(id: string, update: Partial<PluginState>): void {
    const existing = this.plugins.get(id);
    if (existing) {
      this.plugins.set(id, { ...existing, ...update });
    }
  }

  async loadPlugin({ pluginId, force = false }: LoadPluginParams): Promise<void> {
    const pluginState = this.plugins.get(pluginId);

    if (!pluginState) {
      throw new Error(`Plugin ${pluginId} not found in registry`);
    }

    if (pluginState.status === PluginStatusValues.LOADED && !force) {
      // Only log in non-test environments
      const nodeEnv = this.runtime.getSetting('NODE_ENV');
      const vitest = this.runtime.getSetting('VITEST');
      if (nodeEnv !== 'test' && !vitest) {
        logger.info(`[PluginManagerService] Plugin ${pluginState.name} already loaded`);
      }
      return;
    }

    if (
      pluginState.status !== PluginStatusValues.READY &&
      pluginState.status !== PluginStatusValues.UNLOADED &&
      !force
    ) {
      throw new Error(
        `Plugin ${pluginState.name} is not ready to load (status: ${pluginState.status})`
      );
    }

    if (!pluginState.plugin) {
      throw new Error(`Plugin ${pluginState.name} has no plugin instance`);
    }

    try {
      // Only log in non-test environments
      const nodeEnv = this.runtime.getSetting('NODE_ENV');
      const vitest = this.runtime.getSetting('VITEST');
      if (nodeEnv !== 'test' && !vitest) {
        logger.info(`[PluginManagerService] Loading plugin ${pluginState.name}...`);
      }

      // Emit loading event
      await this.runtime.emitEvent(EventType.PLUGIN_BUILDING, {
        pluginId,
        pluginName: pluginState.name,
      });

      // Initialize plugin if it has an init function
      if (pluginState.plugin.init) {
        await pluginState.plugin.init({}, this.runtime);
      }

      // Register plugin components
      await this.registerPluginComponents(pluginState.plugin);

      // Update state
      this.updatePluginState(pluginId, {
        status: PluginStatusValues.LOADED,
        loadedAt: Date.now(),
        error: undefined,
      });

      // Emit loaded event
      await this.runtime.emitEvent(EventType.PLUGIN_LOADED, {
        pluginId,
        pluginName: pluginState.name,
      });

      logger.success(`[PluginManagerService] Plugin ${pluginState.name} loaded successfully`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[PluginManagerService] Failed to load plugin ${pluginState.name}:`, errorMsg);

      this.updatePluginState(pluginId, {
        status: PluginStatusValues.ERROR,
        error: errorMsg,
      });

      await this.runtime.emitEvent(EventType.PLUGIN_ERROR, {
        pluginId,
        pluginName: pluginState.name,
        error: errorMsg,
      });

      throw error;
    }
  }

  async unloadPlugin({ pluginId }: UnloadPluginParams): Promise<void> {
    const pluginState = this.plugins.get(pluginId);

    if (!pluginState) {
      throw new Error(`Plugin ${pluginId} not found in registry`);
    }

    if (pluginState.status !== PluginStatusValues.LOADED) {
      // Only log in non-test environments
      const nodeEnv = this.runtime.getSetting('NODE_ENV');
      const vitest = this.runtime.getSetting('VITEST');
      if (nodeEnv !== 'test' && !vitest) {
        logger.info(`[PluginManagerService] Plugin ${pluginState.name} is not loaded`);
      }
      return;
    }

    // Check if this is an original plugin
    const isOriginal = this.originalPlugins.some((p) => p.name === pluginState.name);
    if (isOriginal) {
      throw new Error(`Cannot unload original plugin ${pluginState.name}`);
    }

    try {
      // Only log in non-test environments
      const nodeEnv = this.runtime.getSetting('NODE_ENV');
      const vitest = this.runtime.getSetting('VITEST');
      if (nodeEnv !== 'test' && !vitest) {
        logger.info(`[PluginManagerService] Unloading plugin ${pluginState.name}...`);
      }

      if (!pluginState.plugin) {
        throw new Error(`Plugin ${pluginState.name} has no plugin instance`);
      }

      // Unregister plugin components
      await this.unregisterPluginComponents(pluginState.plugin);

      // Update state
      this.updatePluginState(pluginId, {
        status: PluginStatusValues.UNLOADED,
        unloadedAt: Date.now(),
      });

      // Emit unloaded event
      await this.runtime.emitEvent(EventType.PLUGIN_UNLOADED, {
        pluginId,
        pluginName: pluginState.name,
      });

      logger.success(`[PluginManagerService] Plugin ${pluginState.name} unloaded successfully`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[PluginManagerService] Failed to unload plugin ${pluginState.name}:`, errorMsg);

      this.updatePluginState(pluginId, {
        status: PluginStatusValues.ERROR,
        error: errorMsg,
      });

      throw error;
    }
  }

  async registerPlugin(plugin: Plugin): Promise<string> {
    const pluginId = createUniqueUuid(this.runtime, plugin.name);

    if (this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${plugin.name} already registered`);
    }

    const state: PluginState = {
      id: pluginId,
      name: plugin.name,
      status: PluginStatusValues.READY,
      plugin,
      missingEnvVars: [],
      buildLog: [],
      createdAt: Date.now(),
      components: {
        actions: new Set(),
        providers: new Set(),
        evaluators: new Set(),
        services: new Set(),
        eventHandlers: new Map(),
      },
    };

    this.plugins.set(pluginId, state);

    await this.runtime.emitEvent(EventType.PLUGIN_READY, {
      pluginId,
      pluginName: plugin.name,
    });

    return pluginId;
  }

  private trackComponentRegistration(
    pluginId: string,
    componentType: ComponentRegistration['componentType'],
    componentName: string
  ): void {
    const registration: ComponentRegistration = {
      pluginId,
      componentType,
      componentName,
      timestamp: Date.now(),
    };

    if (!this.componentRegistry.has(pluginId)) {
      this.componentRegistry.set(pluginId, []);
    }
    this.componentRegistry.get(pluginId)!.push(registration);
  }

  private async registerPluginComponents(plugin: Plugin): Promise<void> {
    const pluginState = Array.from(this.plugins.values()).find((p) => p.plugin === plugin);
    if (!pluginState) {
      throw new Error('Plugin state not found during component registration');
    }

    // Register actions
    if (plugin.actions) {
      for (const action of plugin.actions) {
        await this.runtime.registerAction(action);
        pluginState.components!.actions.add(action.name);
        this.trackComponentRegistration(pluginState.id, 'action', action.name);
      }
    }

    // Register providers
    if (plugin.providers) {
      for (const provider of plugin.providers) {
        await this.runtime.registerProvider(provider);
        pluginState.components!.providers.add(provider.name);
        this.trackComponentRegistration(pluginState.id, 'provider', provider.name);
      }
    }

    // Register evaluators
    if (plugin.evaluators) {
      for (const evaluator of plugin.evaluators) {
        await this.runtime.registerEvaluator(evaluator);
        pluginState.components!.evaluators.add(evaluator.name);
        this.trackComponentRegistration(pluginState.id, 'evaluator', evaluator.name);
      }
    }

    // Register event handlers and track them
    if (plugin.events) {
      for (const [eventName, eventHandlers] of Object.entries(plugin.events)) {
        if (!pluginState.components!.eventHandlers.has(eventName)) {
          pluginState.components!.eventHandlers.set(eventName, new Set());
        }
        for (const eventHandler of eventHandlers) {
          await this.runtime.registerEvent(eventName, eventHandler);
          pluginState.components!.eventHandlers.get(eventName)!.add(eventHandler);
          this.trackComponentRegistration(pluginState.id, 'eventHandler', eventName);
        }
      }
    }

    // Register services - services are registered differently
    if (plugin.services) {
      for (const serviceEntry of plugin.services) {
        try {
          // Handle both direct service references and wrapper objects
          const ServiceClass = 'component' in serviceEntry ? serviceEntry.component : serviceEntry;
          const enabled = 'enabled' in serviceEntry ? serviceEntry.enabled : true;

          // Skip disabled services
          if (!enabled) {
            continue;
          }

          const service = await ServiceClass.start(this.runtime);
          const serviceType = ServiceClass.serviceType as ServiceTypeName;
          this.runtime.services.set(serviceType, service);
          pluginState.components!.services.add(serviceType);
          this.trackComponentRegistration(pluginState.id, 'service', serviceType);
        } catch (error) {
          const ServiceClass = 'component' in serviceEntry ? serviceEntry.component : serviceEntry;
          logger.error(`Failed to register service ${ServiceClass.serviceType}:`, error);
        }
      }
    }

    // Add plugin to runtime plugins array
    if (!this.runtime.plugins) {
      this.runtime.plugins = [];
    }
    this.runtime.plugins.push(plugin);
  }

  private async unregisterPluginComponents(plugin: Plugin): Promise<void> {
    const pluginState = Array.from(this.plugins.values()).find((p) => p.plugin === plugin);
    if (!pluginState || !pluginState.components) {
      logger.warn('Plugin state or components not found during unregistration');
      return;
    }

    // Remove actions (by filtering out plugin actions)
    if (plugin.actions && this.runtime.actions) {
      for (const action of plugin.actions) {
        if (!this.originalActions.has(action.name)) {
          const index = this.runtime.actions.findIndex((a) => a.name === action.name);
          if (index !== -1) {
            this.runtime.actions.splice(index, 1);
            pluginState.components.actions.delete(action.name);
            logger.debug(`Unregistered action: ${action.name}`);
          }
        }
      }
    }

    // Remove providers (by filtering out plugin providers)
    if (plugin.providers && this.runtime.providers) {
      for (const provider of plugin.providers) {
        if (!this.originalProviders.has(provider.name)) {
          const index = this.runtime.providers.findIndex((p) => p.name === provider.name);
          if (index !== -1) {
            this.runtime.providers.splice(index, 1);
            pluginState.components.providers.delete(provider.name);
            logger.debug(`Unregistered provider: ${provider.name}`);
          }
        }
      }
    }

    // Remove evaluators (by filtering out plugin evaluators)
    if (plugin.evaluators && this.runtime.evaluators) {
      for (const evaluator of plugin.evaluators) {
        if (!this.originalEvaluators.has(evaluator.name)) {
          const index = this.runtime.evaluators.findIndex((e) => e.name === evaluator.name);
          if (index !== -1) {
            this.runtime.evaluators.splice(index, 1);
            pluginState.components.evaluators.delete(evaluator.name);
            logger.debug(`Unregistered evaluator: ${evaluator.name}`);
          }
        }
      }
    }

    // Unregister event handlers
    if (pluginState.components.eventHandlers.size > 0) {
      for (const [eventName, handlers] of pluginState.components.eventHandlers) {
        for (const handler of handlers) {
          if ((this.runtime as any).unregisterEvent) {
            (this.runtime as any).unregisterEvent(eventName, handler);
            logger.debug(`Unregistered event handler for: ${eventName}`);
          }
        }
      }
      pluginState.components.eventHandlers.clear();
    }

    // Stop and remove services
    if (plugin.services && this.runtime.services) {
      for (const serviceEntry of plugin.services) {
        // Handle both direct service references and wrapper objects
        const ServiceClass = 'component' in serviceEntry ? serviceEntry.component : serviceEntry;
        const serviceType = ServiceClass.serviceType || '';
        if (serviceType && !this.originalServices.has(serviceType)) {
          const service = this.runtime.services.get(serviceType as ServiceTypeName);
          if (service) {
            try {
              await service.stop();
              logger.debug(`Stopped service: ${serviceType}`);
            } catch (error) {
              logger.error(`Error stopping service ${serviceType}:`, error);
            }
            this.runtime.services.delete(serviceType as ServiceTypeName);
            if (serviceType) {
              pluginState.components.services.delete(serviceType);
            }
            logger.debug(`Unregistered service: ${serviceType}`);
          }
        }
      }
    }

    // Remove plugin from runtime plugins array
    if (this.runtime.plugins) {
      const index = this.runtime.plugins.findIndex((p) => p.name === plugin.name);
      if (index !== -1) {
        this.runtime.plugins.splice(index, 1);
      }
    }

    // Clear component registry for this plugin
    this.componentRegistry.delete(pluginState.id);
  }

  // Helper method to get plugin components
  getPluginComponents(pluginId: string): PluginComponents | undefined {
    const pluginState = this.plugins.get(pluginId);
    return pluginState?.components;
  }

  // Helper method to get component registrations
  getComponentRegistrations(pluginId: string): ComponentRegistration[] {
    return this.componentRegistry.get(pluginId) || [];
  }

  async stop(): Promise<void> {
    logger.info('[PluginManagerService] Stopping...');

    // Clean up managers
    await this.healthMonitoringManager?.cleanup();
    await this.registryManager?.cleanup();
    await this.configurationManager?.cleanup();
    await this.installationManager?.cleanup();

    // Clear caches
    this.modelCache.clear();
    this.capabilityCache = null;
    this.taskHistory = [];

    logger.info('[PluginManagerService] Stopped');
  }

  // Registry installation methods - delegates to InstallationManager
  async installPluginFromRegistry(
    pluginName: string,
    version?: string,
    onProgress?: (progress: InstallProgress) => void
  ): Promise<DynamicPluginInfo> {
    const pluginState = await this.installationManager.installFromRegistry(
      pluginName,
      version,
      onProgress
    );

    // Convert PluginState to DynamicPluginInfo
    const pluginInfo: DynamicPluginInfo = {
      name: pluginState.name,
      version: pluginState.version || '0.0.0',
      status: pluginState.missingEnvVars.length > 0 ? 'needs_configuration' : 'installed',
      path: path.join(
        this.pluginManagerConfig.pluginDirectory || './plugins',
        'installed',
        pluginState.id
      ),
      requiredEnvVars: pluginState.missingEnvVars.map((envVar) => ({
        name: envVar,
        description: '',
        sensitive: false,
        isSet: false,
      })),
      installedAt: new Date(pluginState.createdAt),
    };

    this.installedPlugins.set(pluginName, pluginInfo);
    return pluginInfo;
  }

  async installFromLocalBundle(
    bundlePath: string,
    onProgress?: (progress: InstallProgress) => void
  ): Promise<DynamicPluginInfo> {
    const pluginState = await this.installationManager.installFromLocalBundle(
      bundlePath,
      onProgress
    );

    // Convert PluginState to DynamicPluginInfo
    const pluginInfo: DynamicPluginInfo = {
      name: pluginState.name,
      version: pluginState.version || '0.0.0',
      status: pluginState.missingEnvVars.length > 0 ? 'needs_configuration' : 'installed',
      path: path.join(
        this.pluginManagerConfig.pluginDirectory || './plugins',
        'installed',
        pluginState.id
      ),
      requiredEnvVars: pluginState.missingEnvVars.map((envVar) => ({
        name: envVar,
        description: '',
        sensitive: false,
        isSet: false,
      })),
      installedAt: new Date(pluginState.createdAt),
    };

    this.installedPlugins.set(pluginState.name, pluginInfo);
    return pluginInfo;
  }

  async loadInstalledPlugin(pluginName: string): Promise<string> {
    const pluginInfo = this.installedPlugins.get(pluginName);

    if (!pluginInfo) {
      throw new Error(`Plugin ${pluginName} is not installed`);
    }

    if (pluginInfo.status === 'needs_configuration') {
      throw new Error(`Plugin ${pluginName} requires configuration before loading`);
    }

    try {
      // Load the plugin module
      const pluginModule = await this.loadPluginModule(pluginInfo.path);

      if (!pluginModule) {
        throw new Error('Failed to load plugin module');
      }

      // Register with existing plugin manager
      const pluginId = await this.registerPlugin(pluginModule);

      // Load the plugin
      await this.loadPlugin({ pluginId });

      pluginInfo.status = 'loaded';

      logger.success(`Plugin ${pluginName} loaded successfully`);
      return pluginId;
    } catch (error: any) {
      logger.error(`Failed to load plugin ${pluginName}:`, error);
      pluginInfo.status = 'error';
      pluginInfo.errorDetails = error.message;
      throw error;
    }
  }

  async getAvailablePluginsFromRegistry(): Promise<Record<string, RegistryEntry>> {
    return await getLocalRegistryIndex();
  }

  getInstalledPluginInfo(pluginName: string): DynamicPluginInfo | undefined {
    return this.installedPlugins.get(pluginName);
  }

  listInstalledPlugins(): DynamicPluginInfo[] {
    return Array.from(this.installedPlugins.values());
  }

  private getPluginInstallPath(pluginName: string): string {
    const sanitizedName = pluginName.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(
      this.pluginManagerConfig.pluginDirectory || './plugins',
      'installed',
      sanitizedName
    );
  }

  private async parsePluginMetadata(pluginPath: string): Promise<{
    name: string;
    version: string;
    requiredEnvVars: Array<{
      name: string;
      description: string;
      sensitive: boolean;
      isSet: boolean;
    }>;
  }> {
    const packageJsonPath = path.join(pluginPath, 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);

    if (!packageJson) {
      throw new Error(`Failed to read package.json from ${packageJsonPath}`);
    }

    const requiredEnvVarsConfig = packageJson.elizaos?.requiredEnvVars || [];
    const requiredEnvVars = requiredEnvVarsConfig.map((v: any) => ({
      name: v.name,
      description: v.description,
      sensitive: v.sensitive || false,
      isSet: false,
    }));

    return {
      name: packageJson.name || 'unknown',
      version: packageJson.version || '0.0.0',
      requiredEnvVars,
    };
  }

  private async loadPluginModule(pluginPath: string): Promise<Plugin | null> {
    try {
      const packageJsonPath = path.join(pluginPath, 'package.json');
      let mainEntry = pluginPath;

      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        if (packageJson.main) {
          mainEntry = path.resolve(pluginPath, packageJson.main);
        }
      }

      if (!path.isAbsolute(mainEntry)) {
        mainEntry = path.resolve(mainEntry);
      }

      const module = await import(mainEntry);

      // Find the plugin export
      if (module.default && this.isValidPlugin(module.default)) {
        return module.default;
      }

      for (const key of Object.keys(module)) {
        if (this.isValidPlugin(module[key])) {
          return module[key];
        }
      }

      logger.error(`Could not find a valid plugin export in ${mainEntry}`);
      return null;
    } catch (error: any) {
      logger.error(`Failed to load plugin module from ${pluginPath}:`, error);
      return null;
    }
  }

  private isValidPlugin(obj: any): obj is Plugin {
    return (
      obj &&
      typeof obj === 'object' &&
      obj.name &&
      (obj.actions || obj.services || obj.providers || obj.evaluators || obj.init)
    );
  }

  // --- Merged Public Methods ---

  // from GitHubService
  public getAuthToken(): string | undefined {
    return this.runtime.getSetting('GITHUB_TOKEN');
  }

  public async cloneRepository(url: string, destination: string): Promise<CloneResult> {
    // If GitHub service is available, use it
    if (this.githubService) {
      return this.githubService.cloneRepository(url, destination);
    }

    // Fallback to basic git clone without GitHub-specific features
    try {
      await fs.ensureDir(path.dirname(destination));
      if (await fs.pathExists(destination)) {
        logger.info(`[PluginManagerService] Directory already exists: ${destination}`);
        return { success: true, path: destination };
      }

      logger.info(`[PluginManagerService] Cloning repository from ${url} to ${destination}`);

      await execAsync(`git clone ${url} ${destination}`);
      logger.info(`[PluginManagerService] Successfully cloned repository to ${destination}`);
      return { success: true, path: destination };
    } catch (error: any) {
      logger.error('[PluginManagerService] Failed to clone repository:', error);
      return { success: false, error: error.message };
    }
  }

  public async createPullRequest(repoPath: string, changes: Changes): Promise<PullRequest> {
    // If GitHub service is available, delegate to it
    if (this.githubService) {
      // Create and checkout branch
      await execAsync(`git checkout -b ${changes.branch}`, { cwd: repoPath });

      // Write file changes
      for (const file of changes.files) {
        const filePath = path.join(repoPath, file.path);
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, file.content);
        await execAsync(`git add ${file.path}`, { cwd: repoPath });
      }

      // Use GitHub service for the PR creation
      return this.githubService.createPullRequest(
        repoPath,
        changes.title,
        changes.body,
        changes.branch
      );
    }

    // Fallback implementation without GitHub service
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('GitHub token not configured. Please set GITHUB_TOKEN.');
    }

    // Get repo slug from remote url
    const remoteUrl = (
      await execAsync('git config --get remote.origin.url', { cwd: repoPath })
    ).stdout.trim();
    const repoMatch = remoteUrl.match(/github\.com[/:]([\w-]+\/[\w-.]+)/);
    if (!repoMatch) {
      throw new Error('Could not determine GitHub repository from remote URL.');
    }
    const repoSlug = repoMatch[1].replace('.git', '');

    // Create and checkout branch
    await execAsync(`git checkout -b ${changes.branch}`, { cwd: repoPath });

    // Write file changes
    for (const file of changes.files) {
      const filePath = path.join(repoPath, file.path);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, file.content);
      await execAsync(`git add ${file.path}`, { cwd: repoPath });
    }

    // Commit changes
    await execAsync(`git commit -m "${changes.title}"`, { cwd: repoPath });

    // Push changes
    await execAsync(`git push -u origin ${changes.branch}`, { cwd: repoPath });

    // Create Pull Request via API
    const response = await fetch(`https://api.github.com/repos/${repoSlug}/pulls`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: changes.title,
        body: changes.body,
        head: changes.branch,
        base: 'main',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create pull request: ${errorText}`);
    }

    const pr = (await response.json()) as any;
    return {
      id: pr.number,
      url: pr.html_url,
      title: pr.title,
      state: pr.state,
    };
  }

  // from PluginDiscoveryService & MLRecommendationService
  public async searchPlugins(query: string, _context?: AgentContext): Promise<SearchResult[]> {
    // Only log in non-test environments
    const nodeEnv = this.runtime.getSetting('NODE_ENV');
    const vitest = this.runtime.getSetting('VITEST');
    if (nodeEnv !== 'test' && !vitest) {
      logger.info(`[PluginManagerService:Discovery] Searching for: ${query}`);
    }

    const allPlugins = await this._getPluginCache();

    // For now, use keyword search directly
    const keywordResults = this._keywordSearch(query, allPlugins);

    // Sort by score
    keywordResults.sort((a, b) => b.score - a.score);

    // Return top 10 results
    return keywordResults.slice(0, 10);
  }

  public async recommendPlugins(context: AgentContext): Promise<SearchResult[]> {
    // Only log in non-test environments
    const nodeEnv = this.runtime.getSetting('NODE_ENV');
    const vitest = this.runtime.getSetting('VITEST');
    if (nodeEnv !== 'test' && !vitest) {
      logger.info('[PluginManagerService:Discovery] Generating recommendations based on context');
    }
    const allPlugins = await this._getPluginCache();

    try {
      const rankedPlugins = await this._rankPluginsByContext(
        allPlugins,
        context.currentCapabilities || [],
        context.recentActions || []
      );
      return rankedPlugins.slice(0, 5).map((rp) => ({
        plugin: rp.plugin,
        score: rp.relevanceScore,
        matchReasons: [rp.reasoning],
      }));
    } catch (error) {
      logger.warn(
        '[PluginManagerService:Discovery] ML recommendations failed, using basic approach:',
        error
      );
      const keywordResults = this._keywordSearch(
        context.userIntent || context.failedActions.join(' '),
        allPlugins
      );
      keywordResults.sort((a, b) => b.score - a.score);
      return keywordResults.slice(0, 5);
    }
  }

  // from CapabilityAnalysisService
  public async analyzeCurrentCapabilities(): Promise<CapabilityProfile> {
    const cached = this._getCapabilityCache();
    if (cached) {
      return cached;
    }

    // Only log in non-test environments
    const nodeEnv = this.runtime.getSetting('NODE_ENV');
    const vitest = this.runtime.getSetting('VITEST');
    if (nodeEnv !== 'test' && !vitest) {
      logger.info('[PluginManagerService:Capability] Analyzing current capabilities');
    }
    const profile: CapabilityProfile = {
      core: [],
      plugins: new Map(),
      coverage: {},
      limitations: [],
    };

    // In a real implementation, this would be a much more sophisticated analysis
    // For now, we'll just populate it with some basic info
    if (this.runtime.actions) {
      profile.core = this.runtime.actions.map((a) => a.name);
    }

    this._setCapabilityCache(profile);
    return profile;
  }

  public async suggestCapabilityEnhancements(_taskHistory: Task[]): Promise<any[]> {
    const _profile = await this.analyzeCurrentCapabilities();
    logger.error(
      '[PluginManagerService:Capability] Capability enhancement suggestions not implemented'
    );
    throw new Error(
      'Capability enhancement suggestions are not implemented. This feature requires advanced task analysis and ML models.'
    );
  }

  // from PluginRegistryService
  public async publishPlugin(pluginPath: string): Promise<PublishResult> {
    logger.error(
      `[PluginManagerService:Registry] Plugin publishing is not implemented. Path: ${pluginPath}`
    );
    throw new Error(
      'Plugin publishing is not implemented. This feature requires integration with npm registry or a custom plugin registry.'
    );
  }

  // --- Merged Private/Helper Functions ---

  private async _evaluatePluginRelevance(
    plugins: PluginSearchResult[],
    context: AgentContext,
    userQuery?: string
  ): Promise<RankedPlugin[]> {
    const cacheKey = JSON.stringify({
      operation: 'evaluate',
      plugins: plugins.map((p) => p.name),
      context,
      userQuery,
    });
    const cached = this._getFromModelCache(cacheKey);
    if (cached) {
      return cached;
    }

    const prompt = this._buildEvaluationPrompt(plugins, context, userQuery);
    const response = (await this.runtime.useModel(ModelType.TEXT_LARGE, {
      prompt,
      temperature: 0.3,
      maxTokens: 2000,
    })) as string;
    const rankedPlugins = this._parseEvaluationResponse(response, plugins);
    this._addToModelCache(cacheKey, rankedPlugins);
    return rankedPlugins;
  }

  private async _rankPluginsByContext(
    plugins: PluginSearchResult[],
    _agentCapabilities: string[],
    _recentTasks: string[]
  ): Promise<RankedPlugin[]> {
    const prompt = 'You are an expert at analyzing plugin ecosystems...'; // full prompt
    const response = (await this.runtime.useModel(ModelType.TEXT_LARGE, {
      prompt,
      temperature: 0.4,
      maxTokens: 1500,
    })) as string;
    return this._parseEvaluationResponse(response, plugins);
  }

  private _buildEvaluationPrompt(
    _plugins: PluginSearchResult[],
    _context: AgentContext,
    _userQuery?: string
  ): string {
    const prompt = 'You are an expert at evaluating plugin relevance...'; // full prompt
    return prompt;
  }

  private _parseEvaluationResponse(
    response: string,
    plugins: PluginSearchResult[]
  ): RankedPlugin[] {
    // Simplified implementation - in production this would parse the LLM response
    try {
      const parsed = JSON.parse(response);
      return parsed.rankings || [];
    } catch {
      // Fallback to basic ranking
      return plugins.map((p, i) => ({
        plugin: p,
        relevanceScore: 1 - i * 0.1,
        reasoning: 'Basic ranking',
        capabilities: [],
      }));
    }
  }

  private _keywordSearch(query: string, plugins: PluginSearchResult[]): SearchResult[] {
    const keywords = this._extractKeywords(query.toLowerCase());
    const queryLower = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const plugin of plugins) {
      let score = 0;
      const matchReasons: string[] = [];

      const pluginNameLower = plugin.name.toLowerCase();
      const _pluginText = `${plugin.name} ${plugin.description}`.toLowerCase();

      // Exact name match gets highest score
      if (pluginNameLower === queryLower) {
        score += 10;
        matchReasons.push('Exact name match');
      }
      // Name contains the full query
      else if (pluginNameLower.includes(queryLower)) {
        score += 5;
        matchReasons.push('Name contains query');
      }
      // Name contains all keywords
      else if (keywords.every((kw) => pluginNameLower.includes(kw))) {
        score += 3;
        matchReasons.push('Name contains all keywords');
      }

      // Check individual keywords
      for (const keyword of keywords) {
        if (pluginNameLower.includes(keyword)) {
          score += 2;
          matchReasons.push(`Name matches keyword: ${keyword}`);
        } else if (plugin.description?.toLowerCase().includes(keyword)) {
          score += 1;
          matchReasons.push(`Description matches keyword: ${keyword}`);
        }
      }

      // Check if description contains the full query
      if (plugin.description?.toLowerCase().includes(queryLower)) {
        score += 2;
        matchReasons.push('Description contains query');
      }

      if (score > 0) {
        results.push({ plugin, score, matchReasons });
      }
    }

    return results;
  }

  private _extractKeywords(text: string): string[] {
    // Simple keyword extraction - remove common words
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
    ]);
    return text
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .map((word) => word.replace(/[^a-z0-9]/g, ''));
  }

  private _combineSearchResults(...resultSets: SearchResult[][]): SearchResult[] {
    const combined = new Map<string, SearchResult>();

    for (const results of resultSets) {
      for (const result of results) {
        const key = result.plugin.name;
        if (combined.has(key)) {
          const existing = combined.get(key)!;
          existing.score += result.score;
          existing.matchReasons.push(...result.matchReasons);
        } else {
          combined.set(key, { ...result });
        }
      }
    }

    return Array.from(combined.values());
  }

  private async _getPluginCache(): Promise<PluginSearchResult[]> {
    const knowledge = await this._fetchPluginKnowledge();
    return Array.from(knowledge.values()).map((data) => ({
      name: data.name,
      description: data.description,
      tags: data.tags,
    }));
  }

  private async _fetchPluginKnowledge(): Promise<Map<string, any>> {
    try {
      // Use the existing registry method we already have
      const registry = await this.getAvailablePluginsFromRegistry();

      const pluginData = new Map<string, any>();
      for (const [name, entry] of Object.entries(registry)) {
        pluginData.set(name, {
          name,
          description: entry.description || 'No description available',
          tags: this._extractTagsFromDescription(entry.description || ''),
          repository: entry.repository,
          npm: entry.npm,
          git: entry.git,
        });
      }

      // Only log in non-test environments
      const nodeEnv = this.runtime.getSetting('NODE_ENV');
      const vitest = this.runtime.getSetting('VITEST');
      if (nodeEnv !== 'test' && !vitest) {
        logger.info(`[PluginManagerService] Fetched ${pluginData.size} plugins from registry`);
      }
      return pluginData;
    } catch (error) {
      logger.error('[PluginManagerService] Failed to fetch plugin knowledge from registry:', error);
      // Return empty map on error instead of fake data
      return new Map();
    }
  }

  private _extractTagsFromDescription(description: string): string[] {
    // Extract potential tags from description
    const words = description.toLowerCase().split(/\s+/);
    const commonTags = [
      'api',
      'database',
      'ui',
      'auth',
      'storage',
      'messaging',
      'analytics',
      'ai',
      'ml',
    ];
    return words.filter((word) => commonTags.includes(word));
  }

  private _getFromModelCache(key: string): any {
    const cached = this.modelCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MODEL) {
      return cached.result;
    }
    this.modelCache.delete(key);
    return null;
  }

  private _addToModelCache(key: string, result: any): void {
    if (this.modelCache.size >= 100) {
      // LRU
      const oldestKey = this.modelCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.modelCache.delete(oldestKey);
      }
    }
    this.modelCache.set(key, { key, result, timestamp: Date.now() });
  }

  // from CapabilityAnalysisService
  private _categorizeCapability(capability: string, profile: CapabilityProfile): void {
    // Parse capability to determine its category
    const capabilityLower = capability.toLowerCase();

    // Define categories based on common patterns
    const categories = {
      data: ['database', 'storage', 'cache', 'memory', 'persist'],
      communication: ['http', 'websocket', 'api', 'rest', 'graphql', 'message', 'email'],
      auth: ['auth', 'login', 'security', 'token', 'oauth', 'jwt'],
      ui: ['render', 'display', 'view', 'component', 'interface'],
      compute: ['process', 'calculate', 'analyze', 'transform', 'convert'],
      integration: ['integrate', 'connect', 'bridge', 'adapter', 'plugin'],
      monitoring: ['log', 'monitor', 'track', 'observe', 'metric'],
      ai: ['model', 'predict', 'generate', 'analyze', 'understand'],
    };

    // Find matching category
    let categoryFound = false;
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => capabilityLower.includes(keyword))) {
        profile.coverage[category] = (profile.coverage[category] || 0) + 1;
        categoryFound = true;
        break;
      }
    }

    // If no category found, add to 'other'
    if (!categoryFound) {
      profile.coverage['other'] = (profile.coverage['other'] || 0) + 1;
    }

    // Track the specific capability
    if (!profile.core.includes(capability)) {
      profile.core.push(capability);
    }
  }

  private _getCapabilityCache(): CapabilityProfile | null {
    if (this.capabilityCache && Date.now() - this.cacheTimestamp < this.CACHE_TTL_CAPABILITY) {
      return this.capabilityCache;
    }
    return null;
  }

  private _setCapabilityCache(profile: CapabilityProfile): void {
    this.capabilityCache = profile;
    this.cacheTimestamp = Date.now();
  }

  // Version Management Methods

  /**
   * Create a new branch for plugin modifications
   */
  async createPluginBranch(
    pluginId: string,
    branchName: string,
    description?: string
  ): Promise<any> {
    const pluginState = this.plugins.get(pluginId);
    if (!pluginState) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Initialize version tracking if needed
    const pluginPath = this.getPluginInstallPath(pluginState.name);
    await this.versionManager.initializePlugin(pluginId, pluginState.name, pluginPath);

    return this.versionManager.createBranch(pluginId, branchName, description);
  }

  /**
   * Get list of branches for a plugin
   */
  async getPluginBranches(pluginId: string): Promise<any[]> {
    const pluginState = this.plugins.get(pluginId);
    if (!pluginState) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    return this.versionManager.getBranchList(pluginId);
  }

  /**
   * Switch to a different branch
   */
  async switchPluginBranch(pluginId: string, branchName: string): Promise<void> {
    await this.versionManager.switchBranch(pluginId, branchName);
  }

  /**
   * Create a version snapshot
   */
  async createPluginSnapshot(
    pluginId: string,
    message: string,
    bumpType: 'major' | 'minor' | 'patch' = 'patch'
  ): Promise<any> {
    return this.versionManager.createSnapshot(pluginId, message, bumpType);
  }

  /**
   * Get version history
   */
  async getPluginVersionHistory(pluginId: string): Promise<any> {
    return this.versionManager.getHistory(pluginId);
  }

  /**
   * Rollback to a previous version
   */
  async rollbackPlugin(pluginId: string, version: string): Promise<void> {
    await this.versionManager.rollback(pluginId, version);
  }

  /**
   * Check plugin dependencies
   */
  async checkPluginDependencies(pluginNames: string[], options?: any): Promise<any> {
    return this.dependencyResolver.resolveDependencies(pluginNames, options);
  }

  // Health Monitoring Methods

  /**
   * Perform a health check on a specific plugin
   */
  async performPluginHealthCheck(pluginId: string): Promise<any> {
    return this.healthMonitoringManager.performHealthCheck(pluginId);
  }

  /**
   * Get health metrics for plugins
   */
  async getPluginHealthMetrics(pluginId?: string): Promise<any[]> {
    return this.healthMonitoringManager.getHealthMetrics(pluginId);
  }

  /**
   * Get overall system health status
   */
  getSystemHealthStatus(): any {
    return this.healthMonitoringManager.getOverallHealth();
  }

  /**
   * Register a health alert callback
   */
  onHealthAlert(callback: (alert: any) => void): void {
    this.healthMonitoringManager.onAlert(callback);
  }

  /**
   * Recover a plugin from unhealthy state
   */
  async recoverPlugin(pluginId: string, options?: { force?: boolean }): Promise<any> {
    return this.healthMonitoringManager.recoverPlugin(pluginId, options);
  }

  // Configuration Methods

  /**
   * Get plugin configuration
   */
  async getPluginConfig(pluginId: string): Promise<any> {
    return this.configurationManager.getConfig(pluginId);
  }

  /**
   * Set plugin configuration
   */
  async setPluginConfig(pluginId: string, config: any): Promise<void> {
    await this.configurationManager.setConfig(pluginId, config);
  }

  /**
   * Validate plugin configuration
   */
  async validatePluginConfig(pluginId: string, config: any): Promise<boolean> {
    return this.configurationManager.validateConfig(pluginId, config);
  }

  /**
   * Get required environment variables for a plugin
   */
  async getRequiredEnvVars(pluginId: string): Promise<string[]> {
    return this.configurationManager.getRequiredEnvVars(pluginId);
  }

  // Registry Methods

  /**
   * Search for plugins in the registry
   */
  async searchRegistry(query: string, options?: any): Promise<any[]> {
    return this.registryManager.searchPlugins(query, options);
  }

  /**
   * Get plugin information from registry
   */
  async getPluginInfoFromRegistry(pluginName: string, version?: string): Promise<any> {
    return this.registryManager.getPluginInfo(pluginName, version);
  }
}
