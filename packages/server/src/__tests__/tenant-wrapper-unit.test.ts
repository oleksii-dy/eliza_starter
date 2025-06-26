import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TenantDatabaseWrapper } from '../utils/tenant-database-wrapper.js';
// import type { DatabaseAdapter } from '@elizaos/core';

// Mock database adapter for testing
const createMockDatabase = () => ({
  init: vi.fn(),
  close: vi.fn(),
  getAgents: vi.fn(),
  createAgent: vi.fn(),
  getAgent: vi.fn(),
  getAgentById: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
  getMemories: vi.fn(),
  createMemory: vi.fn(),
  searchMemories: vi.fn(),
  getRooms: vi.fn(),
  createRoom: vi.fn(),
  getRoomById: vi.fn(),
});

describe('Tenant Database Wrapper Unit Tests', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    mockDb = createMockDatabase();
  });

  describe('Tenant Context Management', () => {
    it('should create wrapper with specific tenant', () => {
      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, 'tenant-123');
      const context = wrapper.getTenantContext();

      expect(context.tenantId).toBe('tenant-123');
      expect(context.isLegacy).toBe(false);
    });

    it('should create wrapper for legacy (global) access', () => {
      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, null);
      const context = wrapper.getTenantContext();

      expect(context.tenantId).toBeNull();
      expect(context.isLegacy).toBe(true);
    });

    it('should create wrapper from JWT request', () => {
      const jwtReq = {
        tenantId: 'tenant-456',
        isLegacyAuth: false,
      } as any;

      const wrapper = TenantDatabaseWrapper.fromRequest(mockDb as any, jwtReq);
      const context = wrapper.getTenantContext();

      expect(context.tenantId).toBe('tenant-456');
      expect(context.isLegacy).toBe(false);
    });

    it('should create wrapper from legacy request', () => {
      const legacyReq = {
        tenantId: null,
        isLegacyAuth: true,
      } as any;

      const wrapper = TenantDatabaseWrapper.fromRequest(mockDb as any, legacyReq);
      const context = wrapper.getTenantContext();

      expect(context.tenantId).toBeNull();
      expect(context.isLegacy).toBe(true);
    });
  });

  describe('Tenant Validation', () => {
    it('should validate tenant access correctly', () => {
      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, 'tenant-a');

      expect(wrapper.validateTenantAccess('tenant-a')).toBe(true);
      expect(wrapper.validateTenantAccess('tenant-b')).toBe(false);
      expect(wrapper.validateTenantAccess(null)).toBe(false);
    });

    it('should allow all access for legacy wrapper', () => {
      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, null);

      expect(wrapper.validateTenantAccess('tenant-a')).toBe(true);
      expect(wrapper.validateTenantAccess('tenant-b')).toBe(true);
      expect(wrapper.validateTenantAccess(null)).toBe(true);
    });
  });

  describe('Agent Operations', () => {
    it('should filter agents by tenant', async () => {
      const mockAgents = [
        { id: '1', name: 'Agent1', tenantId: 'tenant-a' },
        { id: '2', name: 'Agent2', tenantId: 'tenant-b' },
        { id: '3', name: 'Agent3', tenantId: 'tenant-a' },
      ];

      mockDb.getAgents.mockResolvedValue(mockAgents);

      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, 'tenant-a');
      const result = await wrapper.getAgents();

      expect(result).toHaveLength(2);
      expect(result[0].tenantId).toBe('tenant-a');
      expect(result[1].tenantId).toBe('tenant-a');
    });

    it('should return all agents for legacy access', async () => {
      const mockAgents = [
        { id: '1', name: 'Agent1', tenantId: 'tenant-a' },
        { id: '2', name: 'Agent2', tenantId: 'tenant-b' },
        { id: '3', name: 'Agent3', tenantId: 'tenant-a' },
      ];

      mockDb.getAgents.mockResolvedValue(mockAgents);

      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, null);
      const result = await wrapper.getAgents();

      expect(result).toHaveLength(3);
    });

    it('should assign tenant when creating agent', async () => {
      const agentData = { name: 'TestAgent', bio: 'Test agent' };
      mockDb.createAgent.mockResolvedValue({ ...agentData, id: '123' });

      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, 'tenant-123');
      await wrapper.createAgent(agentData);

      expect(mockDb.createAgent).toHaveBeenCalledWith({
        ...agentData,
        tenantId: 'tenant-123',
      });
    });

    it('should not assign tenant for legacy creation', async () => {
      const agentData = { name: 'TestAgent', bio: 'Test agent' };
      mockDb.createAgent.mockResolvedValue({ ...agentData, id: '123' });

      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, null);
      await wrapper.createAgent(agentData);

      expect(mockDb.createAgent).toHaveBeenCalledWith(agentData);
    });

    it('should validate tenant access when getting agent by ID', async () => {
      const agent = { id: '123', name: 'Agent1', tenantId: 'tenant-a' };
      mockDb.getAgentById.mockResolvedValue(agent);

      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, 'tenant-b');
      const result = await wrapper.getAgentById('123' as any);

      expect(result).toBeNull(); // Should be null due to tenant mismatch
    });

    it('should allow access for matching tenant', async () => {
      const agent = { id: '123', name: 'Agent1', tenantId: 'tenant-a' };
      mockDb.getAgentById.mockResolvedValue(agent);

      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, 'tenant-a');
      const result = await wrapper.getAgentById('123' as any);

      expect(result).toEqual(agent);
    });

    it('should prevent tenant change during updates', async () => {
      const existingAgent = { id: '123', name: 'Agent1', tenantId: 'tenant-a' };
      mockDb.getAgentById.mockResolvedValue(existingAgent);

      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, 'tenant-a');

      await expect(wrapper.updateAgent('123' as any, { tenantId: 'tenant-b' })).rejects.toThrow(
        'Cannot change agent tenant ID'
      );
    });

    it('should validate tenant access for deletion', async () => {
      const existingAgent = { id: '123', name: 'Agent1', tenantId: 'tenant-a' };
      mockDb.getAgentById.mockResolvedValue(existingAgent);

      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, 'tenant-b');

      await expect(wrapper.deleteAgent('123' as any)).rejects.toThrow(
        'Agent 123 not found or access denied'
      );
    });
  });

  describe('Memory Operations', () => {
    it('should filter memories by tenant', async () => {
      const mockMemories = [
        { id: '1', content: 'Memory1', tenantId: 'tenant-a' },
        { id: '2', content: 'Memory2', tenantId: 'tenant-b' },
        { id: '3', content: 'Memory3', tenantId: 'tenant-a' },
      ];

      mockDb.getMemories.mockResolvedValue(mockMemories);

      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, 'tenant-a');
      const result = await wrapper.getMemories({});

      expect(result).toHaveLength(2);
      expect(result[0].tenantId).toBe('tenant-a');
      expect(result[1].tenantId).toBe('tenant-a');
    });

    it('should assign tenant when creating memory', async () => {
      const memoryData = { content: { text: 'Test memory' } };

      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, 'tenant-456');
      await wrapper.createMemory(memoryData);

      expect(mockDb.createMemory).toHaveBeenCalledWith(
        {
          ...memoryData,
          tenantId: 'tenant-456',
        },
        undefined
      );
    });

    it('should filter search results by tenant', async () => {
      const mockSearchResults = [
        { id: '1', content: 'Result1', tenantId: 'tenant-a' },
        { id: '2', content: 'Result2', tenantId: 'tenant-b' },
        { id: '3', content: 'Result3', tenantId: 'tenant-a' },
      ];

      mockDb.searchMemories.mockResolvedValue(mockSearchResults);

      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, 'tenant-a');
      const result = await wrapper.searchMemories({ query: 'test' });

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.tenantId === 'tenant-a')).toBe(true);
    });
  });

  describe('Room Operations', () => {
    it('should filter rooms by tenant', async () => {
      const mockRooms = [
        { id: '1', name: 'Room1', tenantId: 'tenant-a' },
        { id: '2', name: 'Room2', tenantId: 'tenant-b' },
        { id: '3', name: 'Room3', tenantId: 'tenant-a' },
      ];

      mockDb.getRooms.mockResolvedValue(mockRooms);

      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, 'tenant-a');
      const result = await wrapper.getRooms('agent-123' as any);

      expect(result).toHaveLength(2);
      expect(result[0].tenantId).toBe('tenant-a');
      expect(result[1].tenantId).toBe('tenant-a');
    });

    it('should assign tenant when creating room', async () => {
      const roomData = { name: 'Test Room', type: 'GROUP' };

      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, 'tenant-789');
      await wrapper.createRoom(roomData);

      expect(mockDb.createRoom).toHaveBeenCalledWith({
        ...roomData,
        tenantId: 'tenant-789',
      });
    });

    it('should validate tenant access when getting room by ID', async () => {
      const room = { id: '123', name: 'Room1', tenantId: 'tenant-a' };
      mockDb.getRoomById.mockResolvedValue(room);

      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, 'tenant-b');
      const result = await wrapper.getRoomById('123' as any);

      expect(result).toBeNull(); // Should be null due to tenant mismatch
    });
  });

  describe('Passthrough Operations', () => {
    it('should pass through init calls', async () => {
      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, 'tenant-123');
      await wrapper.init();

      expect(mockDb.init).toHaveBeenCalled();
    });

    it('should pass through close calls', async () => {
      const wrapper = TenantDatabaseWrapper.withTenant(mockDb as any, 'tenant-123');
      await wrapper.close();

      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should provide access to underlying db', () => {
      const mockDbWithProperty = { ...mockDb, db: { execute: vi.fn() } };
      const wrapper = TenantDatabaseWrapper.withTenant(mockDbWithProperty as any, 'tenant-123');

      expect(wrapper.db).toBe(mockDbWithProperty.db);
    });
  });
});
