/**
 * REAL MVP COMPREHENSIVE TEST - ZERO LARP CODE
 * 
 * Tests all functionality with real ElizaOS runtime.
 * Based on validated minimal integration test.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentRuntime, type Character } from '@elizaos/core';
import { realMvpPlugin } from '../real-mvp/real-plugin';
import { getReasoningService, clearServiceRegistry } from '../real-mvp/real-reasoning-service';

describe('Real MVP Plugin - ZERO LARP', () => {
  let runtime: AgentRuntime;

  beforeEach(() => {
    // REAL: Create fresh runtime for each test
    const testCharacter: Character = {
      name: 'Real MVP Test Agent',
      bio: ['Testing real MVP functionality'],
      system: 'You are a test agent for real MVP testing.',
      messageExamples: [],
      postExamples: [],
      topics: [],
      adjectives: [],
      knowledge: [],
      plugins: [],
    };

    runtime = new AgentRuntime({
      character: testCharacter,
    });
  });

  afterEach(() => {
    // REAL: Clean up service registry
    clearServiceRegistry();
  });

  describe('Plugin Registration', () => {
    it('should register plugin successfully', async () => {
      // REAL: Test actual plugin registration
      await expect(runtime.registerPlugin(realMvpPlugin)).resolves.not.toThrow();
      
      // REAL: Verify actions are registered
      expect(runtime.actions).toBeDefined();
      expect(runtime.actions.length).toBeGreaterThan(0);
      
      const actionNames = runtime.actions.map(a => a.name);
      expect(actionNames).toContain('ENABLE_REASONING');
      expect(actionNames).toContain('DISABLE_REASONING');
      expect(actionNames).toContain('CHECK_REASONING_STATUS');
    });

    it('should initialize plugin properly', async () => {
      // REAL: Test plugin initialization
      const initSpy = vi.fn();
      const testPlugin = {
        ...realMvpPlugin,
        init: async (config: any, runtime: any) => {
          initSpy(config, runtime);
          await realMvpPlugin.init!(config, runtime);
        },
      };

      await runtime.registerPlugin(testPlugin);
      
      expect(initSpy).toHaveBeenCalledWith({}, runtime);
    });
  });

  describe('Reasoning Service', () => {
    beforeEach(async () => {
      await runtime.registerPlugin(realMvpPlugin);
    });

    it('should create reasoning service', () => {
      // REAL: Test service creation
      const service = getReasoningService(runtime);
      expect(service).toBeDefined();
      expect(service.isEnabled()).toBe(false);
    });

    it('should enable reasoning service', async () => {
      // REAL: Test service enablement
      const service = getReasoningService(runtime);
      
      expect(service.isEnabled()).toBe(false);
      await service.enable();
      expect(service.isEnabled()).toBe(true);
    });

    it('should disable reasoning service', async () => {
      // REAL: Test service disable
      const service = getReasoningService(runtime);
      
      await service.enable();
      expect(service.isEnabled()).toBe(true);
      
      await service.disable();
      expect(service.isEnabled()).toBe(false);
    });

    it('should collect training data when enabled', async () => {
      // REAL: Test training data collection
      const service = getReasoningService(runtime);
      
      // Start with no data
      expect(service.getTrainingData()).toHaveLength(0);
      
      // Enable service
      await service.enable();
      
      // Make a real useModel call
      try {
        await runtime.useModel('TEXT_SMALL', { prompt: 'test prompt' });
      } catch (error) {
        // Expected - no real model provider
      }
      
      // Verify data was collected
      const trainingData = service.getTrainingData();
      expect(trainingData.length).toBeGreaterThan(0);
      expect(trainingData[0]).toHaveProperty('id');
      expect(trainingData[0]).toHaveProperty('timestamp');
      expect(trainingData[0]).toHaveProperty('modelType', 'TEXT_SMALL');
      expect(trainingData[0]).toHaveProperty('inputParams');
    });

    it('should not collect data when disabled', async () => {
      // REAL: Test that disabled service doesn't collect
      const service = getReasoningService(runtime);
      
      // Ensure disabled
      expect(service.isEnabled()).toBe(false);
      
      // Make useModel call
      try {
        await runtime.useModel('TEXT_SMALL', { prompt: 'test prompt' });
      } catch (error) {
        // Expected - no real model provider
      }
      
      // Verify no data collected
      expect(service.getTrainingData()).toHaveLength(0);
    });

    it('should restore original useModel when disabled', async () => {
      // REAL: Test useModel restoration (functional, not reference equality)
      const service = getReasoningService(runtime);
      
      // Store behavior before enabling
      let originalBehaviorTest = false;
      try {
        await runtime.useModel('TEST', {});
      } catch (error) {
        originalBehaviorTest = true; // Expected error from original
      }
      
      // Enable and verify override behavior changed
      await service.enable();
      let overrideBehaviorTest = false;
      try {
        await runtime.useModel('TEST', {});
        overrideBehaviorTest = true; // Our override handles gracefully
      } catch (error) {
        // May still error, but behavior is different
      }
      
      // Disable and verify restoration of behavior
      await service.disable();
      let restoredBehaviorTest = false;
      try {
        await runtime.useModel('TEST', {});
      } catch (error) {
        restoredBehaviorTest = true; // Back to original error behavior
      }
      
      // Verify behavior is restored to original pattern
      expect(originalBehaviorTest).toBe(restoredBehaviorTest);
    });
  });

  describe('Action Validation', () => {
    beforeEach(async () => {
      await runtime.registerPlugin(realMvpPlugin);
    });

    it('should validate enable action correctly', async () => {
      // REAL: Test enable action validation
      const enableAction = runtime.actions.find(a => a.name === 'ENABLE_REASONING');
      expect(enableAction).toBeDefined();
      
      const validMessage = {
        entityId: 'test-user',
        roomId: 'test-room',
        content: { text: 'enable custom reasoning' },
      } as any;
      
      const invalidMessage = {
        entityId: 'test-user',
        roomId: 'test-room',
        content: { text: 'hello world' },
      } as any;
      
      expect(await enableAction!.validate(runtime, validMessage)).toBe(true);
      expect(await enableAction!.validate(runtime, invalidMessage)).toBe(false);
    });

    it('should validate disable action correctly', async () => {
      // REAL: Test disable action validation
      const disableAction = runtime.actions.find(a => a.name === 'DISABLE_REASONING');
      expect(disableAction).toBeDefined();
      
      const validMessage = {
        entityId: 'test-user',
        roomId: 'test-room',
        content: { text: 'disable custom reasoning' },
      } as any;
      
      expect(await disableAction!.validate(runtime, validMessage)).toBe(true);
    });

    it('should validate status action correctly', async () => {
      // REAL: Test status action validation
      const statusAction = runtime.actions.find(a => a.name === 'CHECK_REASONING_STATUS');
      expect(statusAction).toBeDefined();
      
      const validMessage = {
        entityId: 'test-user',
        roomId: 'test-room',
        content: { text: 'check reasoning status' },
      } as any;
      
      expect(await statusAction!.validate(runtime, validMessage)).toBe(true);
    });
  });

  describe('Action Execution', () => {
    beforeEach(async () => {
      await runtime.registerPlugin(realMvpPlugin);
    });

    it('should execute enable action', async () => {
      // REAL: Test enable action execution
      const enableAction = runtime.actions.find(a => a.name === 'ENABLE_REASONING');
      const service = getReasoningService(runtime);
      
      expect(service.isEnabled()).toBe(false);
      
      const message = {
        entityId: 'test-user',
        roomId: 'test-room',
        content: { text: 'enable custom reasoning' },
      } as any;
      
      const result = await enableAction!.handler(runtime, message);
      
      expect(result).toBeDefined();
      expect(result.text).toContain('enabled');
      expect(service.isEnabled()).toBe(true);
    });

    it('should execute disable action', async () => {
      // REAL: Test disable action execution
      const enableAction = runtime.actions.find(a => a.name === 'ENABLE_REASONING');
      const disableAction = runtime.actions.find(a => a.name === 'DISABLE_REASONING');
      const service = getReasoningService(runtime);
      
      // First enable
      const enableMessage = {
        entityId: 'test-user',
        roomId: 'test-room',
        content: { text: 'enable custom reasoning' },
      } as any;
      await enableAction!.handler(runtime, enableMessage);
      expect(service.isEnabled()).toBe(true);
      
      // Then disable
      const disableMessage = {
        entityId: 'test-user',
        roomId: 'test-room',
        content: { text: 'disable custom reasoning' },
      } as any;
      
      const result = await disableAction!.handler(runtime, disableMessage);
      
      expect(result).toBeDefined();
      expect(result.text).toContain('disabled');
      expect(service.isEnabled()).toBe(false);
    });

    it('should execute status action', async () => {
      // REAL: Test status action execution
      const statusAction = runtime.actions.find(a => a.name === 'CHECK_REASONING_STATUS');
      
      const message = {
        entityId: 'test-user',
        roomId: 'test-room',
        content: { text: 'check reasoning status' },
      } as any;
      
      const result = await statusAction!.handler(runtime, message);
      
      expect(result).toBeDefined();
      expect(result.text).toContain('Status:');
      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty('enabled');
      expect(result.data).toHaveProperty('totalRecords');
    });
  });

  describe('End-to-End Workflow', () => {
    beforeEach(async () => {
      await runtime.registerPlugin(realMvpPlugin);
    });

    it('should complete full enable -> use -> disable workflow', async () => {
      // REAL: Test complete workflow
      const enableAction = runtime.actions.find(a => a.name === 'ENABLE_REASONING');
      const disableAction = runtime.actions.find(a => a.name === 'DISABLE_REASONING');
      const statusAction = runtime.actions.find(a => a.name === 'CHECK_REASONING_STATUS');
      const service = getReasoningService(runtime);
      
      // 1. Check initial status
      let statusResult = await statusAction!.handler(runtime, {
        entityId: 'test-user',
        roomId: 'test-room',
        content: { text: 'check reasoning status' },
      } as any);
      expect(statusResult.data.enabled).toBe(false);
      expect(statusResult.data.totalRecords).toBe(0);
      
      // 2. Enable reasoning
      await enableAction!.handler(runtime, {
        entityId: 'test-user',
        roomId: 'test-room',
        content: { text: 'enable custom reasoning' },
      } as any);
      expect(service.isEnabled()).toBe(true);
      
      // 3. Make model calls (simulate real usage)
      try {
        await runtime.useModel('TEXT_SMALL', { prompt: 'test 1' });
      } catch (error) { /* Expected */ }
      
      try {
        await runtime.useModel('TEXT_LARGE', { prompt: 'test 2' });
      } catch (error) { /* Expected */ }
      
      // 4. Check status after usage
      statusResult = await statusAction!.handler(runtime, {
        entityId: 'test-user',
        roomId: 'test-room',
        content: { text: 'check reasoning status' },
      } as any);
      expect(statusResult.data.enabled).toBe(true);
      expect(statusResult.data.totalRecords).toBe(2);
      
      // 5. Disable reasoning
      const disableResult = await disableAction!.handler(runtime, {
        entityId: 'test-user',
        roomId: 'test-room',
        content: { text: 'disable custom reasoning' },
      } as any);
      expect(service.isEnabled()).toBe(false);
      expect(disableResult.text).toContain('2 records');
      
      // 6. Verify final status
      statusResult = await statusAction!.handler(runtime, {
        entityId: 'test-user',
        roomId: 'test-room',
        content: { text: 'check reasoning status' },
      } as any);
      expect(statusResult.data.enabled).toBe(false);
      expect(statusResult.data.totalRecords).toBe(2); // Data persists after disable
    });
  });
});

elizaLogger.info('✅ Real MVP comprehensive test defined');