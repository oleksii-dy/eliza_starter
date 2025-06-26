import { describe, it, expect, mock, beforeEach, type Mock } from 'bun:test';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import type { UUID } from '@elizaos/core';
import { requestElevationAction } from '../requestElevation';
import type { Permission } from '../../types/permissions';

const createMockRuntime = (): IAgentRuntime =>
  ({
    agentId: 'test-agent' as UUID,
    getService: mock(),
  }) as any;

const createMockMemory = (text: string, entityId: UUID): Memory =>
  ({
    entityId,
    content: {
      text,
    },
    roomId: 'room-1' as UUID,
  }) as Memory;

describe('requestElevationAction', () => {
  let runtime: IAgentRuntime;
  let trustService: any;
  const testEntityId = 'entity-1' as UUID;

  beforeEach(() => {
    runtime = createMockRuntime();
    const permissionService = {
      requestElevation: mock().mockResolvedValue({
        approved: true,
        elevationId: 'elevation-123',
        expiresAt: Date.now() + 3600000,
        grantedPermissions: ['admin_action'],
      }),
    };
    trustService = {
      evaluateTrust: mock().mockResolvedValue({
        overallTrust: 75,
        dimensions: {},
      }),
    };
    (runtime.getService as unknown as Mock<any>).mockImplementation((name: string) => {
      if (name === 'contextual-permissions') {
        return permissionService;
      }
      if (name === 'trust-engine') {
        return trustService;
      }
      return null;
    });
  });

  it('should request permission elevation', async () => {
    const memory = createMockMemory(
      '{"action": "admin_action", "resource": "system", "justification": "Need to fix critical issue"}',
      testEntityId
    );

    const result = await requestElevationAction.handler(runtime, memory);

    const permissionService = runtime.getService('contextual-permissions') as any;
    expect(permissionService.requestElevation).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: testEntityId,
        requestedPermission: {
          action: 'admin_action',
          resource: 'system',
        },
        justification: 'Need to fix critical issue',
      })
    );

    expect(result).toBeDefined();
    expect((result as any).text).toContain('Elevation approved');
  });

  it('should handle elevation denial', async () => {
    const permissionService = runtime.getService('contextual-permissions') as any;
    permissionService.requestElevation.mockResolvedValue({
      approved: false,
      reason: 'Insufficient trust level',
      trustDeficit: 20,
      requiredTrust: 95,
      suggestions: ['Build more trust', 'Get endorsement'],
    });

    const memory = createMockMemory(
      '{"action": "admin_action", "resource": "system", "justification": "Testing"}',
      testEntityId
    );

    const result = await requestElevationAction.handler(runtime, memory);

    expect((result as any).text).toContain('Elevation request denied');
    expect((result as any).text).toContain('Insufficient trust level');
    expect((result as any).text).toContain('Build more trust');
  });

  it('should validate the action correctly', async () => {
    const memory = createMockMemory('test', testEntityId);
    const state = {} as State;

    // Should return true when contextual-permissions service is available
    expect(await requestElevationAction.validate(runtime, memory, state)).toBe(true);

    // Should return false when service is not available
    (runtime.getService as unknown as Mock<any>).mockImplementation((name: string) => {
      if (name === 'contextual-permissions') {
        return null;
      }
      return trustService;
    });
    expect(await requestElevationAction.validate(runtime, memory, state)).toBe(false);
  });

  it('should handle errors gracefully', async () => {
    const permissionService = runtime.getService('contextual-permissions') as any;
    permissionService.requestElevation.mockRejectedValue(new Error('Service error'));

    const memory = createMockMemory(
      '{"action": "test", "resource": "test", "justification": "test"}',
      testEntityId
    );

    const result = await requestElevationAction.handler(runtime, memory);

    expect((result as any).text).toContain('Failed to process elevation request');
    expect((result as any).data?.error).toBeDefined();
  });
});
