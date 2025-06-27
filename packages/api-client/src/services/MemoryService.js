import { BaseApiClient } from '../lib/BaseClient';
export class MemoryService extends BaseApiClient {
    /**
     * Get agent memories
     */
    async getAgentMemories(agentId, params) {
        return this.get(`/api/memory/${agentId}/memories`, { params });
    }
    /**
     * Get room-specific memories
     */
    async getRoomMemories(agentId, roomId, params) {
        return this.get(`/api/memory/${agentId}/rooms/${roomId}/memories`, {
            params,
        });
    }
    /**
     * Update a memory
     */
    async updateMemory(agentId, memoryId, params) {
        return this.patch(`/api/memory/${agentId}/memories/${memoryId}`, params);
    }
    /**
     * Clear all agent memories
     */
    async clearAgentMemories(agentId) {
        return this.delete(`/api/memory/${agentId}/memories`);
    }
    /**
     * Clear room memories
     */
    async clearRoomMemories(agentId, roomId) {
        return this.delete(`/api/memory/${agentId}/memories/all/${roomId}`);
    }
    /**
     * List agent's rooms
     */
    async listAgentRooms(agentId) {
        return this.get(`/api/memory/${agentId}/rooms`);
    }
    /**
     * Get room details
     */
    async getRoom(agentId, roomId) {
        return this.get(`/api/memory/${agentId}/rooms/${roomId}`);
    }
    /**
     * Create a room
     */
    async createRoom(agentId, params) {
        return this.post(`/api/memory/${agentId}/rooms`, params);
    }
    /**
     * Create world from server
     */
    async createWorldFromServer(serverId, params) {
        return this.post(`/api/memory/groups/${serverId}`, params);
    }
    /**
     * Delete a world
     */
    async deleteWorld(serverId) {
        return this.delete(`/api/memory/groups/${serverId}`);
    }
    /**
     * Clear world memories
     */
    async clearWorldMemories(serverId) {
        return this.delete(`/api/memory/groups/${serverId}/memories`);
    }
}
