import { 
  type IAgentRuntime, 
  type Character,
  AgentRuntime,
  stringToUuid,
  logger, 
  type UUID,
  type Plugin 
} from '@elizaos/core';
import { plugin as sqlPlugin } from '@elizaos/plugin-sql';
import { messageBusConnectorPlugin } from './message.js';
import type { DatabaseService } from './database.js';
import { loadPlugins } from '../utils/plugin-loader.js';

const DEFAULT_SERVER_ID = '00000000-0000-0000-0000-000000000000' as UUID;

/**
 * AgentService - Handles all agent-related operations
 * Extracted from AgentServer to follow Single Responsibility Principle
 */
export class AgentService {
  private agents: Map<UUID, IAgentRuntime>;

  constructor(
    private databaseService: DatabaseService
  ) {
    this.agents = new Map();
  }

  /**
   * Get the agents map (for external access)
   */
  public getAgents(): Map<UUID, IAgentRuntime> {
    return this.agents;
  }

  /**
   * Get agent count
   */
  public getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Get agent by ID
   */
  public getAgent(agentId: UUID): IAgentRuntime | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Registers an agent with the provided runtime.
   *
   * @param {IAgentRuntime} runtime - The runtime object containing agent information.
   * @throws {Error} if the runtime is null/undefined, if agentId is missing, if character configuration is missing,
   * or if there are any errors during registration.
   */
  public async registerAgent(runtime: IAgentRuntime): Promise<void> {
    try {
      if (!runtime) {
        throw new Error('Attempted to register null/undefined runtime');
      }
      if (!runtime.agentId) {
        throw new Error('Runtime missing agentId');
      }
      if (!runtime.character) {
        throw new Error('Runtime missing character configuration');
      }

      this.agents.set(runtime.agentId, runtime);
      logger.debug(`Agent ${runtime.character.name} (${runtime.agentId}) added to agents map`);

      // Auto-register the MessageBusConnector plugin
      await this.registerMessageBusConnector(runtime);

      // Register TEE plugin if present
      await this.registerTeePlugin(runtime);

      logger.success(
        `Successfully registered agent ${runtime.character.name} (${runtime.agentId}) with core services.`
      );

      // Auto-associate agent with default server
      await this.databaseService.addAgentToServer(DEFAULT_SERVER_ID, runtime.agentId);
      logger.info(
        `[AgentService] Auto-associated agent ${runtime.character.name} with server ID: ${DEFAULT_SERVER_ID}`
      );
    } catch (error) {
      logger.error('Failed to register agent:', error);
      throw error;
    }
  }

  /**
   * Unregisters an agent from the system.
   *
   * @param {UUID} agentId - The unique identifier of the agent to unregister.
   * @returns {void}
   */
  public unregisterAgent(agentId: UUID): void {
    if (!agentId) {
      logger.warn('[AgentService] Attempted to unregister undefined or invalid agent runtime');
      return;
    }

    try {
      // Retrieve the agent before deleting it from the map
      const agent = this.agents.get(agentId);

      if (agent) {
        // Stop all services of the agent before unregistering it
        this.stopAgentServices(agent, agentId);
      }

      // Delete the agent from the map
      this.agents.delete(agentId);
      logger.debug(`[AgentService] Agent ${agentId} removed from agents map`);
    } catch (error) {
      logger.error(`[AgentService] Error removing agent ${agentId}:`, error);
    }
  }

  /**
   * Stop all agents gracefully
   */
  public async stopAllAgents(): Promise<void> {
    logger.debug('[AgentService] Stopping all agents...');
    for (const [id, agent] of this.agents.entries()) {
      try {
        await agent.stop();
        logger.debug(`[AgentService] Stopped agent ${id}`);
      } catch (error) {
        logger.error(`[AgentService] Error stopping agent ${id}:`, error);
      }
    }
  }

  /**
   * Get agents for logging/debugging
   */
  public logAgentsStatus(): void {
    logger.debug(`[AgentService] Active agents: ${this.agents.size}`);
    this.agents.forEach((agent, id) => {
      logger.debug(`[AgentService] - Agent ${id}: ${agent.character.name}`);
    });
  }

  /**
   * Start an agent with the given character configuration
   */
  public async startAgent(character: Character): Promise<IAgentRuntime> {
    try {
      character.id ??= stringToUuid(character.name);

      // Load plugins from character configuration
      const pluginsToLoad = character.plugins || [];
      const loadedPlugins: Plugin[] = [];

      // Always include SQL plugin
      loadedPlugins.push(sqlPlugin as Plugin);
      logger.debug(`[AgentService] Added SQL plugin for agent ${character.name}`);

      // Load additional plugins if specified
      if (pluginsToLoad.length > 0) {
        logger.info(`[AgentService] Loading ${pluginsToLoad.length} plugins for agent ${character.name}: ${pluginsToLoad.join(', ')}`);
        
        try {
          const characterPlugins = await loadPlugins(pluginsToLoad);
          
          // Add loaded plugins (avoid duplicates)
          for (const plugin of characterPlugins) {
            if (!loadedPlugins.some(p => p.name === plugin.name)) {
              loadedPlugins.push(plugin);
              logger.debug(`[AgentService] Loaded plugin: ${plugin.name}`);
            }
          }
        } catch (error) {
          logger.error(`[AgentService] Failed to load some plugins for agent ${character.name}:`, error);
          // Continue with available plugins rather than failing completely
        }
      }

      logger.info(`[AgentService] Creating runtime with ${loadedPlugins.length} plugins for agent ${character.name}`);

      // Create agent runtime with loaded plugins (following CLI pattern)
      const runtime = new AgentRuntime({
        character,
        plugins: loadedPlugins,
      });

      // Initialize the runtime
      await runtime.initialize();

      // Run database migrations if needed
      try {
        const migrationService = runtime.getService('database_migration');
        if (migrationService) {
          logger.info('[AgentService] Running plugin migrations...');
          (migrationService as any).discoverAndRegisterPluginSchemas(loadedPlugins);
          await (migrationService as any).runAllPluginMigrations();
          logger.info('[AgentService] Plugin migrations completed');
        }
      } catch (error) {
        logger.error('[AgentService] Failed to run plugin migrations:', error);
        throw error;
      }

      // Register the agent
      await this.registerAgent(runtime);
      
      logger.success(`[AgentService] Started agent ${runtime.character.name} as ${runtime.agentId} with ${loadedPlugins.length} plugins`);
      return runtime;
    } catch (error) {
      logger.error('[AgentService] Failed to start agent:', error);
      throw error;
    }
  }

  /**
   * Stop an agent and unregister it
   */
  public stopAgent(runtime: IAgentRuntime): void {
    try {
      // Stop the runtime
      runtime.stop().catch((error) => {
        logger.error(`[AgentService] Error stopping runtime for ${runtime.agentId}:`, error);
      });

      // Unregister from the service
      this.unregisterAgent(runtime.agentId);
      
      logger.success(`[AgentService] Agent ${runtime.character.name} stopped successfully`);
    } catch (error) {
      logger.error('[AgentService] Failed to stop agent:', error);
      throw error;
    }
  }

  // ===============================
  // Private Helper Methods
  // ===============================

  private async registerMessageBusConnector(runtime: IAgentRuntime): Promise<void> {
    try {
      if (messageBusConnectorPlugin) {
        await runtime.registerPlugin(messageBusConnectorPlugin);
        logger.info(
          `[AgentService] Automatically registered MessageBusConnector for agent ${runtime.character.name}`
        );
      } else {
        logger.error(`[AgentService] CRITICAL: MessageBusConnector plugin definition not found.`);
      }
    } catch (e) {
      logger.error(
        `[AgentService] CRITICAL: Failed to register MessageBusConnector for agent ${runtime.character.name}`,
        e
      );
      // Note: Decide if this should be a fatal error for the agent
    }
  }

  private async registerTeePlugin(runtime: IAgentRuntime): Promise<void> {
    const teePlugin = runtime.plugins.find((p) => p.name === 'phala-tee-plugin');
    if (!teePlugin) return;

    logger.debug(`[AgentService] Found TEE plugin for agent ${runtime.agentId}`);
    
    if (teePlugin.providers) {
      for (const provider of teePlugin.providers) {
        runtime.registerProvider(provider);
        logger.debug(`[AgentService] Registered TEE provider: ${provider.name}`);
      }
    }
    
    if (teePlugin.actions) {
      for (const action of teePlugin.actions) {
        runtime.registerAction(action);
        logger.debug(`[AgentService] Registered TEE action: ${action.name}`);
      }
    }
  }

  private stopAgentServices(agent: IAgentRuntime, agentId: UUID): void {
    try {
      agent.stop().catch((stopError) => {
        logger.error(
          `[AgentService] Error stopping agent services for ${agentId}:`,
          stopError
        );
      });
      logger.debug(`[AgentService] Stopping services for agent ${agentId}`);
    } catch (stopError) {
      logger.error(`[AgentService] Error initiating stop for agent ${agentId}:`, stopError);
    }
  }
}