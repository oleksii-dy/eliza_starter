import { UUID } from '@elizaos/core';
import { BaseApiClient } from '../lib/BaseClient';
import { Agent, AgentCreateParams, AgentUpdateParams, AgentWorld, AgentWorldSettings, AgentPanel, AgentLog, AgentLogsParams } from '../types/agents';
export declare class AgentsService extends BaseApiClient {
    /**
     * List all agents with minimal details
     */
    listAgents(): Promise<{
        agents: Agent[];
    }>;
    /**
     * Get specific agent details
     */
    getAgent(agentId: UUID): Promise<Agent>;
    /**
     * Create a new agent
     */
    createAgent(params: AgentCreateParams): Promise<Agent>;
    /**
     * Update an existing agent
     */
    updateAgent(agentId: UUID, params: AgentUpdateParams): Promise<Agent>;
    /**
     * Delete an agent
     */
    deleteAgent(agentId: UUID): Promise<{
        success: boolean;
    }>;
    /**
     * Start an existing agent
     */
    startAgent(agentId: UUID): Promise<{
        status: string;
    }>;
    /**
     * Stop a running agent
     */
    stopAgent(agentId: UUID): Promise<{
        status: string;
    }>;
    /**
     * Get all available worlds
     */
    getWorlds(): Promise<{
        worlds: AgentWorld[];
    }>;
    /**
     * Add agent to a world
     */
    addAgentToWorld(agentId: UUID, worldId: UUID): Promise<{
        success: boolean;
    }>;
    /**
     * Update agent's world settings
     */
    updateAgentWorldSettings(agentId: UUID, worldId: UUID, settings: Record<string, any>): Promise<AgentWorldSettings>;
    /**
     * Get agent's plugin panels
     */
    getAgentPanels(agentId: UUID): Promise<{
        panels: AgentPanel[];
    }>;
    /**
     * Get agent logs
     */
    getAgentLogs(agentId: UUID, params?: AgentLogsParams): Promise<{
        logs: AgentLog[];
    }>;
    /**
     * Delete a specific log entry
     */
    deleteAgentLog(agentId: UUID, logId: UUID): Promise<{
        success: boolean;
    }>;
}
