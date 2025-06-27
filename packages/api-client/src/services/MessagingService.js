import { BaseApiClient } from '../lib/BaseClient';
export class MessagingService extends BaseApiClient {
  /**
   * Submit agent replies or system messages
   */
  async submitMessage(params) {
    return this.post('/api/messaging/submit', params);
  }
  /**
   * Notify message completion
   */
  async completeMessage(params) {
    return this.post('/api/messaging/complete', params);
  }
  /**
   * Ingest messages from external platforms
   */
  async ingestExternalMessages(params) {
    return this.post('/api/messaging/ingest-external', params);
  }
  /**
   * Create a new channel
   */
  async createChannel(params) {
    return this.post('/api/messaging/channels', params);
  }
  /**
   * Create a group channel
   */
  async createGroupChannel(params) {
    return this.post('/api/messaging/central-channels', params);
  }
  /**
   * Find or create a DM channel
   */
  async getOrCreateDmChannel(params) {
    return this.get('/api/messaging/dm-channel', { params });
  }
  /**
   * Get channel details
   */
  async getChannelDetails(channelId) {
    return this.get(`/api/messaging/central-channels/${channelId}/details`);
  }
  /**
   * Get channel participants
   */
  async getChannelParticipants(channelId) {
    return this.get(`/api/messaging/central-channels/${channelId}/participants`);
  }
  /**
   * Add agent to channel
   */
  async addAgentToChannel(channelId, agentId) {
    return this.post(`/api/messaging/central-channels/${channelId}/agents`, {
      agentId,
    });
  }
  /**
   * Remove agent from channel
   */
  async removeAgentFromChannel(channelId, agentId) {
    return this.delete(`/api/messaging/central-channels/${channelId}/agents/${agentId}`);
  }
  /**
   * Delete a channel
   */
  async deleteChannel(channelId) {
    return this.delete(`/api/messaging/channels/${channelId}`);
  }
  /**
   * Clear channel history
   */
  async clearChannelHistory(channelId) {
    return this.post(`/api/messaging/channels/${channelId}/clear`);
  }
  /**
   * Post a new message to a channel
   */
  async postMessage(channelId, content, metadata) {
    return this.post(`/api/messaging/central-channels/${channelId}/messages`, {
      content,
      metadata,
    });
  }
  /**
   * Get channel messages
   */
  async getChannelMessages(channelId, params) {
    return this.get(`/api/messaging/central-channels/${channelId}/messages`, { params });
  }
  /**
   * Get a specific message
   */
  async getMessage(messageId) {
    return this.get(`/api/messaging/messages/${messageId}`);
  }
  /**
   * Delete a message
   */
  async deleteMessage(messageId) {
    return this.delete(`/api/messaging/messages/${messageId}`);
  }
  /**
   * Update a message
   */
  async updateMessage(messageId, content) {
    return this.patch(`/api/messaging/messages/${messageId}`, { content });
  }
  /**
   * Search messages
   */
  async searchMessages(params) {
    return this.post('/api/messaging/messages/search', params);
  }
  /**
   * List all message servers
   */
  async listServers() {
    return this.get('/api/messaging/central-servers');
  }
  /**
   * Get server channels
   */
  async getServerChannels(serverId) {
    return this.get(`/api/messaging/central-servers/${serverId}/channels`);
  }
  /**
   * Create a new server
   */
  async createServer(params) {
    return this.post('/api/messaging/servers', params);
  }
  /**
   * Sync server channels
   */
  async syncServerChannels(serverId, params) {
    return this.post(`/api/messaging/servers/${serverId}/sync-channels`, params);
  }
  /**
   * Delete a server
   */
  async deleteServer(serverId) {
    return this.delete(`/api/messaging/servers/${serverId}`);
  }
}
