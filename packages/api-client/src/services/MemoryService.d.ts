import { UUID } from '@elizaos/core';
import { BaseApiClient } from '../lib/BaseClient';
import { Memory, Room, MemoryParams, MemoryUpdateParams, RoomCreateParams, WorldCreateParams } from '../types/memory';
export declare class MemoryService extends BaseApiClient {
    /**
     * Get agent memories
     */
    getAgentMemories(agentId: UUID, params?: MemoryParams): Promise<{
        memories: Memory[];
    }>;
    /**
     * Get room-specific memories
     */
    getRoomMemories(agentId: UUID, roomId: UUID, params?: MemoryParams): Promise<{
        memories: Memory[];
    }>;
    /**
     * Update a memory
     */
    updateMemory(agentId: UUID, memoryId: UUID, params: MemoryUpdateParams): Promise<Memory>;
    /**
     * Clear all agent memories
     */
    clearAgentMemories(agentId: UUID): Promise<{
        deleted: number;
    }>;
    /**
     * Clear room memories
     */
    clearRoomMemories(agentId: UUID, roomId: UUID): Promise<{
        deleted: number;
    }>;
    /**
     * List agent's rooms
     */
    listAgentRooms(agentId: UUID): Promise<{
        rooms: Room[];
    }>;
    /**
     * Get room details
     */
    getRoom(agentId: UUID, roomId: UUID): Promise<Room>;
    /**
     * Create a room
     */
    createRoom(agentId: UUID, params: RoomCreateParams): Promise<Room>;
    /**
     * Create world from server
     */
    createWorldFromServer(serverId: UUID, params: WorldCreateParams): Promise<{
        worldId: UUID;
    }>;
    /**
     * Delete a world
     */
    deleteWorld(serverId: UUID): Promise<{
        success: boolean;
    }>;
    /**
     * Clear world memories
     */
    clearWorldMemories(serverId: UUID): Promise<{
        deleted: number;
    }>;
}
