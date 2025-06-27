import { BaseApiClient } from '../lib/BaseClient';
export class AgentsService extends BaseApiClient {
  /**
   * List all agents with minimal details
   */
  async listAgents() {
    return this.get('/api/agents');
  }
  /**
   * Get specific agent details
   */
  async getAgent(agentId) {
    return this.get(`/api/agents/${agentId}`);
  }
  /**
   * Create a new agent
   */
  async createAgent(params) {
    return this.post('/api/agents', params);
  }
  /**
   * Update an existing agent
   */
  async updateAgent(agentId, params) {
    return this.patch(`/api/agents/${agentId}`, params);
  }
  /**
   * Delete an agent
   */
  async deleteAgent(agentId) {
    return this.delete(`/api/agents/${agentId}`);
  }
  /**
   * Start an existing agent
   */
  async startAgent(agentId) {
    return this.post(`/api/agents/${agentId}/start`);
  }
  /**
   * Stop a running agent
   */
  async stopAgent(agentId) {
    return this.post(`/api/agents/${agentId}/stop`);
  }
  /**
   * Get all available worlds
   */
  async getWorlds() {
    return this.get('/api/agents/worlds');
  }
  /**
   * Add agent to a world
   */
  async addAgentToWorld(agentId, worldId) {
    return this.post(`/api/agents/${agentId}/worlds`, { worldId });
  }
  /**
   * Update agent's world settings
   */
  async updateAgentWorldSettings(agentId, worldId, settings) {
    return this.patch(`/api/agents/${agentId}/worlds/${worldId}`, { settings });
  }
  /**
   * Get agent's plugin panels
   */
  async getAgentPanels(agentId) {
    return this.get(`/api/agents/${agentId}/panels`);
  }
  /**
   * Get agent logs
   */
  async getAgentLogs(agentId, params) {
    return this.get(`/api/agents/${agentId}/logs`, { params });
  }
  /**
   * Delete a specific log entry
   */
  async deleteAgentLog(agentId, logId) {
    return this.delete(`/api/agents/${agentId}/logs/${logId}`);
  }
}
