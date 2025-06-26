import { DatabaseAdapter, UUID, logger } from '@elizaos/core';
import type { Request } from 'express';

/**
 * Tenant-aware database wrapper that automatically filters queries by tenant ID
 * This ensures multi-tenant data isolation at the database level
 */
export class TenantDatabaseWrapper {
  constructor(
    private database: DatabaseAdapter,
    private tenantId: string | null = null
  ) {}

  /**
   * Create a new wrapper instance with tenant context
   */
  static withTenant(database: DatabaseAdapter, tenantId: string | null): TenantDatabaseWrapper {
    return new TenantDatabaseWrapper(database, tenantId);
  }

  /**
   * Create wrapper from Express request (extracts tenant from JWT)
   */
  static fromRequest(database: DatabaseAdapter, req: Request): TenantDatabaseWrapper {
    const tenantId = (req as any).tenantId || null;
    const isLegacy = (req as any).isLegacyAuth || false;

    // For legacy auth, don't filter by tenant (backward compatibility)
    return new TenantDatabaseWrapper(database, isLegacy ? null : tenantId);
  }

  /**
   * Get tenant-filtered agents
   */
  async getAgents(filters: any = {}): Promise<any[]> {
    const allAgents = await (this.database as any).getAgents(filters);

    if (!this.tenantId) {
      return allAgents; // No tenant filtering for legacy auth
    }

    return allAgents.filter((agent: any) => agent.tenantId === this.tenantId);
  }

  /**
   * Create agent with tenant assignment
   */
  async createAgent(agentData: any): Promise<any> {
    if (this.tenantId) {
      agentData.tenantId = this.tenantId;
    }

    const created = await (this.database as any).createAgent(agentData);
    logger.info(`Created agent ${agentData.name} for tenant: ${this.tenantId || 'global'}`);
    return created;
  }

  /**
   * Get agent by ID with tenant validation
   */
  async getAgentById(agentId: UUID): Promise<any | null> {
    const agent = await (this.database as any).getAgentById(agentId);

    if (!agent) {
      return null;
    }

    // If we have a tenant context, ensure the agent belongs to this tenant
    if (this.tenantId && agent.tenantId !== this.tenantId) {
      logger.warn(
        `Tenant ${this.tenantId} attempted to access agent ${agentId} from tenant ${agent.tenantId}`
      );
      return null;
    }

    return agent;
  }

  /**
   * Update agent with tenant validation
   */
  async updateAgent(agentId: UUID, updates: any): Promise<any> {
    // First check if we can access this agent
    const existingAgent = await this.getAgentById(agentId);
    if (!existingAgent) {
      throw new Error(`Agent ${agentId} not found or access denied`);
    }

    // Don't allow changing tenant ID
    if (updates.tenantId && updates.tenantId !== existingAgent.tenantId) {
      throw new Error('Cannot change agent tenant ID');
    }

    return await (this.database as any).updateAgent(agentId, updates);
  }

  /**
   * Delete agent with tenant validation
   */
  async deleteAgent(agentId: UUID): Promise<void> {
    const existingAgent = await this.getAgentById(agentId);
    if (!existingAgent) {
      throw new Error(`Agent ${agentId} not found or access denied`);
    }

    return await (this.database as any).deleteAgent(agentId);
  }

  /**
   * Get memories with tenant filtering
   */
  async getMemories(params: any): Promise<any[]> {
    const memories = await (this.database as any).getMemories(params);

    if (!this.tenantId) {
      return memories; // No filtering for legacy auth
    }

    return memories.filter((memory: any) => memory.tenantId === this.tenantId);
  }

  /**
   * Create memory with tenant assignment
   */
  async createMemory(memory: any, tableName?: string): Promise<void> {
    if (this.tenantId) {
      memory.tenantId = this.tenantId;
    }

    return await (this.database as any).createMemory(memory, tableName);
  }

  /**
   * Search memories with tenant filtering
   */
  async searchMemories(params: any): Promise<any[]> {
    const memories = await (this.database as any).searchMemories(params);

    if (!this.tenantId) {
      return memories;
    }

    return memories.filter((memory: any) => memory.tenantId === this.tenantId);
  }

  /**
   * Get rooms with tenant filtering
   */
  async getRooms(agentId?: UUID): Promise<any[]> {
    const rooms = await (this.database as any).getRooms(agentId);

    if (!this.tenantId) {
      return rooms;
    }

    return rooms.filter((room: any) => room.tenantId === this.tenantId);
  }

  /**
   * Create room with tenant assignment
   */
  async createRoom(roomData: any): Promise<any> {
    if (this.tenantId) {
      roomData.tenantId = this.tenantId;
    }

    return await (this.database as any).createRoom(roomData);
  }

  /**
   * Get room by ID with tenant validation
   */
  async getRoomById(roomId: UUID): Promise<any | null> {
    const room = await (this.database as any).getRoomById(roomId);

    if (!room) {
      return null;
    }

    if (this.tenantId && room.tenantId !== this.tenantId) {
      logger.warn(
        `Tenant ${this.tenantId} attempted to access room ${roomId} from tenant ${room.tenantId}`
      );
      return null;
    }

    return room;
  }

  /**
   * Passthrough methods for operations that don't need tenant filtering
   */
  async init(): Promise<void> {
    return await this.database.init();
  }

  async close(): Promise<void> {
    return await this.database.close();
  }

  // Add other passthrough methods as needed
  get db() {
    return (this.database as any).db;
  }

  async migrate(): Promise<void> {
    if (typeof (this.database as any).migrate === 'function') {
      return await (this.database as any).migrate();
    }
  }

  /**
   * Get tenant context for logging/debugging
   */
  getTenantContext(): { tenantId: string | null; isLegacy: boolean } {
    return {
      tenantId: this.tenantId,
      isLegacy: this.tenantId === null,
    };
  }

  /**
   * Validate tenant access to resource
   */
  validateTenantAccess(resourceTenantId: string | null): boolean {
    if (!this.tenantId) {
      return true; // Legacy auth has global access
    }

    return resourceTenantId === this.tenantId;
  }
}
