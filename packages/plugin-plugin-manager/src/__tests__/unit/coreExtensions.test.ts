import type { Action, IAgentRuntime, ServiceTypeName } from '@elizaos/core';
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { applyRuntimeExtensions } from '../../coreExtensions.ts';

describe('coreExtensions (Consolidated)', () => {
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    mockRuntime = {
      actions: [],
      providers: [],
      evaluators: [],
      services: new Map(),
    } as any;
    // Apply extensions to the mock runtime for each test
    applyRuntimeExtensions(mockRuntime);
  });

  describe('unregisterAction', () => {
    it('should remove an action from the runtime', () => {
      const action: Action = { name: 'TEST_ACTION' } as any;
      mockRuntime.actions.push(action);
      (mockRuntime as any).unregisterAction('TEST_ACTION');
      expect(mockRuntime.actions).toHaveLength(0);
    });
  });

  describe('unregisterService', () => {
    it('should stop and remove a service from the runtime', async () => {
      const service = { stop: mock() } as any;
      mockRuntime.services.set('TEST_SERVICE' as ServiceTypeName, service);
      await (mockRuntime as any).unregisterService('TEST_SERVICE');
      expect(service.stop).toHaveBeenCalled();
      expect(mockRuntime.services.has('TEST_SERVICE' as ServiceTypeName)).toBe(false);
    });
  });
});
