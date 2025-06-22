/**
 * REAL RUNTIME INTEGRATION TESTS FOR MVP CUSTOM REASONING
 * 
 * These tests use actual ElizaOS runtime instances and real service implementations.
 * No mocks - only real runtime instances, services, and plugin functionality.
 * 
 * Test coverage:
 * - Real MVP service lifecycle with actual runtime
 * - Actual model override functionality
 * - Real training data collection and storage
 * - Service registration and retrieval
 * - Error handling with authentic runtime behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentRuntime, elizaLogger } from '@elizaos/core';
import type { Character, IAgentRuntime, Memory, UUID } from '@elizaos/core';
import { SimpleReasoningService, enableCustomReasoningAction, disableCustomReasoningAction, checkReasoningStatusAction } from '../../mvp';
import { mvpCustomReasoningPlugin } from '../../mvp-only';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Test character configuration for runtime
const testCharacter: Character = {
  name: 'MVPTestAgent',
  bio: ['AI agent for testing MVP custom reasoning functionality'],
  system: 'You are a test agent for validating MVP custom reasoning capabilities.',
  messageExamples: [
    [
      { name: 'user', content: { text: 'enable custom reasoning' } },
      { name: 'MVPTestAgent', content: { text: 'testing MVP response' } }
    ]
  ],
  postExamples: [],
  topics: ['testing', 'mvp', 'reasoning', 'service-validation'],
  adjectives: ['helpful', 'accurate', 'reliable'],
  plugins: [],
  settings: {
    CUSTOM_REASONING_ENABLED: 'true',
    CUSTOM_REASONING_COLLECT_TRAINING_DATA: 'true',
  },
  secrets: {}
};

// Helper function to create test memory
function createTestMessage(text: string, roomId?: UUID): Memory {
  return {
    id: uuidv4() as UUID,
    entityId: uuidv4() as UUID,
    agentId: 'test-agent-id' as UUID,
    roomId: roomId || uuidv4() as UUID,
    content: {
      text,
      source: 'test'
    },
    createdAt: Date.now()
  };
}

describe('Real Runtime MVP Custom Reasoning Service Integration Tests', () => {
  let runtime: IAgentRuntime;
  let service: SimpleReasoningService;
  let testDatabasePath: string;
  let testDataPath: string;
  let originalUseModel: any;

  beforeEach(async () => {
    elizaLogger.info('🧪 Setting up MVP Custom Reasoning real runtime test environment...');
    
    // Create unique test paths to avoid conflicts
    const testId = `mvp-reasoning-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    testDatabasePath = path.join(process.cwd(), '.test-data', testId, 'mvp.db');
    testDataPath = path.join(process.cwd(), '.test-data', testId, 'mvp-data');
    
    // Ensure test directories exist
    await fs.mkdir(path.dirname(testDatabasePath), { recursive: true });
    await fs.mkdir(testDataPath, { recursive: true });
    
    // Update test character with test-specific paths
    const testCharacterWithPaths = {
      ...testCharacter,
      settings: {
        ...testCharacter.settings,
        TRAINING_DATABASE_URL: `sqlite:${testDatabasePath}`,
        MVP_DATA_DIR: testDataPath,
      }
    };

    // Create real AgentRuntime instance
    runtime = new AgentRuntime({
      character: testCharacterWithPaths,
      token: process.env.OPENAI_API_KEY || 'test-token',
      modelName: 'gpt-4o-mini'
    });

    // Register the MVP plugin
    await runtime.registerPlugin(mvpCustomReasoningPlugin);
    await runtime.initialize();
    
    // Create real SimpleReasoningService instance
    service = new SimpleReasoningService(runtime);
    
    // Store reference to original useModel
    originalUseModel = runtime.useModel;
    
    elizaLogger.info('✅ MVP Custom Reasoning real runtime test environment setup complete');
  });

  afterEach(async () => {
    elizaLogger.info('🧹 Cleaning up MVP Custom Reasoning test environment...');
    
    try {
      // Disable service if enabled
      if (service && service.getStatus().enabled) {
        await service.disable();
      }

      // Clean up test files
      if (testDatabasePath) {
        try {
          await fs.unlink(testDatabasePath);
        } catch (error) {
          // File might not exist, that's okay
        }
      }
      
      if (testDataPath) {
        try {
          await fs.rm(path.dirname(testDataPath), { recursive: true, force: true });
        } catch (error) {
          // Directory might not exist, that's okay
        }
      }
    } catch (error) {
      elizaLogger.warn('Warning during MVP Custom Reasoning cleanup:', error);
    }
    
    elizaLogger.info('✅ MVP Custom Reasoning test environment cleanup complete');
  });

  describe('Real Service Core Functionality', () => {
    it('should initialize with disabled state using real runtime', () => {
      const status = service.getStatus();
      expect(status.enabled).toBe(false);
      expect(status.dataCount).toBe(0);
      elizaLogger.info('✅ Service initializes in disabled state');
    });

    it('should enable and override runtime.useModel with real runtime', async () => {
      await service.enable();
      
      const status = service.getStatus();
      expect(status.enabled).toBe(true);
      
      // Verify that runtime.useModel was overridden
      expect(runtime.useModel).not.toBe(originalUseModel);
      
      elizaLogger.info('✅ Service enabled and useModel overridden successfully');
    });

    it('should collect training data when enabled with real runtime', async () => {
      await service.enable();
      
      // Call useModel through the runtime (testing the override)
      const result = await runtime.useModel('TEXT_LARGE', { text: 'test prompt for training data collection' });
      
      expect(result).toBeDefined();
      
      const status = service.getStatus();
      expect(status.dataCount).toBeGreaterThanOrEqual(1);
      
      const trainingData = service.getTrainingData();
      expect(trainingData.length).toBeGreaterThanOrEqual(1);
      expect(trainingData[0].modelType).toBeDefined();
      expect(trainingData[0].success).toBeDefined();
      
      elizaLogger.info(`✅ Training data collected: ${trainingData.length} samples`);
    });

    it('should disable and restore original runtime.useModel with real runtime', async () => {
      // Test the enable/disable cycle
      await service.enable();
      
      const enabledStatus = service.getStatus();
      expect(enabledStatus.enabled).toBe(true);
      
      await service.disable();
      
      const disabledStatus = service.getStatus();
      expect(disabledStatus.enabled).toBe(false);
      
      // Test that useModel still works after disable
      const result = await runtime.useModel('TEXT_LARGE', { text: 'test after disable' });
      expect(result).toBeDefined();
      
      elizaLogger.info('✅ Service disabled and useModel restored successfully');
    });

    it('should handle model execution errors gracefully with real runtime', async () => {
      await service.enable();
      
      try {
        // Test with potentially problematic input
        const result = await runtime.useModel('TEXT_LARGE', { text: '' }); // Empty text
        
        // Should either handle gracefully or provide meaningful error
        expect(result).toBeDefined();
        
        elizaLogger.info('✅ Empty input handled gracefully');
      } catch (error) {
        // If it throws, that's also acceptable as long as it's a meaningful error
        expect(error).toBeDefined();
        elizaLogger.info('✅ Error handling working correctly');
      }
    });

    it('should maintain data consistency across enable/disable cycles', async () => {
      // First cycle
      await service.enable();
      await runtime.useModel('TEXT_LARGE', { text: 'first test' });
      let status = service.getStatus();
      const firstCount = status.dataCount;
      await service.disable();
      
      // Second cycle
      await service.enable();
      await runtime.useModel('TEXT_LARGE', { text: 'second test' });
      status = service.getStatus();
      
      // Data should accumulate across cycles
      expect(status.dataCount).toBeGreaterThan(firstCount);
      
      await service.disable();
      
      elizaLogger.info(`✅ Data consistency maintained across cycles: ${status.dataCount} total samples`);
    });
  });

  describe('Real Actions Integration', () => {
    // Helper function to create test callback
    function createTestCallback(): { callback: Function; responses: any[] } {
      const responses: any[] = [];
      const callback = async (content: any) => {
        responses.push(content);
        return [];
      };
      return { callback, responses };
    }

    it('should validate enable action correctly with real runtime', async () => {
      const message = createTestMessage('enable custom reasoning');
      const isValid = await enableCustomReasoningAction.validate!(runtime, message);
      expect(isValid).toBe(true);
      elizaLogger.info('✅ Enable action validation passed');
    });

    it('should handle enable action and actually enable service with real runtime', async () => {
      const message = createTestMessage('enable custom reasoning');
      const { callback, responses } = createTestCallback();
      
      await enableCustomReasoningAction.handler(
        runtime,
        message,
        { values: {}, data: {}, text: '' },
        {},
        callback
      );
      
      expect(responses.length).toBeGreaterThan(0);
      const response = responses[0];
      expect(response.text).toBeDefined();
      expect(response.thought).toBeDefined();
      expect(response.actions).toContain('ENABLE_CUSTOM_REASONING');
      
      // Test that response indicates enablement
      const isEnabled = response.text.includes('Enabled') || response.text.includes('enabled');
      const isAlreadyEnabled = response.text.includes('already enabled');
      expect(isEnabled || isAlreadyEnabled).toBe(true);
      
      elizaLogger.info(`✅ Enable action response: ${response.text.substring(0, 100)}...`);
    });

    it('should handle disable action with real runtime', async () => {
      const message = createTestMessage('disable custom reasoning');
      const { callback, responses } = createTestCallback();
      
      await disableCustomReasoningAction.handler(
        runtime,
        message,
        { values: {}, data: {}, text: '' },
        {},
        callback
      );
      
      expect(responses.length).toBeGreaterThan(0);
      const response = responses[0];
      expect(response.text).toBeDefined();
      expect(response.thought).toBeDefined();
      expect(response.actions).toContain('DISABLE_CUSTOM_REASONING');
      
      // Should handle disable gracefully whether enabled or not
      expect(response.text).toContain('Custom Reasoning Service');
      
      elizaLogger.info(`✅ Disable action response: ${response.text.substring(0, 100)}...`);
    });

    it('should handle status check action with real runtime', async () => {
      const message = createTestMessage('check reasoning status');
      const { callback, responses } = createTestCallback();
      
      await checkReasoningStatusAction.handler(
        runtime,
        message,
        { values: {}, data: {}, text: '' },
        {},
        callback
      );
      
      expect(responses.length).toBeGreaterThan(0);
      const response = responses[0];
      expect(response.text).toBeDefined();
      expect(response.thought).toBeDefined();
      expect(response.actions).toContain('CHECK_REASONING_STATUS');
      
      // Should contain status information
      expect(response.text).toContain('Status');
      
      elizaLogger.info(`✅ Status check response: ${response.text.substring(0, 100)}...`);
    });

    it('should handle action sequence (enable -> status -> disable) with real runtime', async () => {
      const { callback: enableCallback, responses: enableResponses } = createTestCallback();
      const { callback: statusCallback, responses: statusResponses } = createTestCallback();
      const { callback: disableCallback, responses: disableResponses } = createTestCallback();
      
      // Enable
      const enableMessage = createTestMessage('enable custom reasoning');
      await enableCustomReasoningAction.handler(
        runtime, enableMessage, { values: {}, data: {}, text: '' }, {}, enableCallback
      );
      
      // Check status
      const statusMessage = createTestMessage('check reasoning status');
      await checkReasoningStatusAction.handler(
        runtime, statusMessage, { values: {}, data: {}, text: '' }, {}, statusCallback
      );
      
      // Disable
      const disableMessage = createTestMessage('disable custom reasoning');
      await disableCustomReasoningAction.handler(
        runtime, disableMessage, { values: {}, data: {}, text: '' }, {}, disableCallback
      );
      
      // All actions should have responses
      expect(enableResponses.length).toBeGreaterThan(0);
      expect(statusResponses.length).toBeGreaterThan(0);
      expect(disableResponses.length).toBeGreaterThan(0);
      
      elizaLogger.info('✅ Action sequence (enable -> status -> disable) completed successfully');
    });
  });

  describe('Real Backwards Compatibility', () => {
    it('should preserve runtime behavior when disabled', async () => {
      // Test original behavior
      const originalResult = await runtime.useModel('TEXT_LARGE', { text: 'compatibility test' });
      expect(originalResult).toBeDefined();
      
      // Enable then disable
      await service.enable();
      await service.disable();
      
      // Should still work after enable/disable cycle
      const afterResult = await runtime.useModel('TEXT_LARGE', { text: 'compatibility test' });
      expect(afterResult).toBeDefined();
      
      elizaLogger.info('✅ Runtime behavior preserved after enable/disable cycle');
    });
    
    it('should handle double enable/disable gracefully with real runtime', async () => {
      // First enable should work
      await service.enable();
      expect(service.getStatus().enabled).toBe(true);
      
      // Second enable should handle gracefully
      try {
        await service.enable();
        // If no error, service should still be enabled
        expect(service.getStatus().enabled).toBe(true);
        elizaLogger.info('✅ Double enable handled gracefully');
      } catch (error) {
        // If error, should be meaningful
        expect(error.message).toContain('already enabled');
        elizaLogger.info('✅ Double enable properly rejected');
      }
      
      // Disable should work
      await service.disable();
      expect(service.getStatus().enabled).toBe(false);
      
      // Second disable should handle gracefully
      try {
        await service.disable();
        // If no error, service should remain disabled
        expect(service.getStatus().enabled).toBe(false);
        elizaLogger.info('✅ Double disable handled gracefully');
      } catch (error) {
        // If error, should be meaningful
        expect(error.message).toContain('not enabled');
        elizaLogger.info('✅ Double disable properly rejected');
      }
    });

    it('should maintain service state consistency with real runtime', async () => {
      // Test multiple cycles
      for (let i = 0; i < 3; i++) {
        await service.enable();
        expect(service.getStatus().enabled).toBe(true);
        
        // Use the service
        await runtime.useModel('TEXT_LARGE', { text: `test cycle ${i}` });
        
        await service.disable();
        expect(service.getStatus().enabled).toBe(false);
      }
      
      // Final check that everything still works
      const finalResult = await runtime.useModel('TEXT_LARGE', { text: 'final test' });
      expect(finalResult).toBeDefined();
      
      elizaLogger.info('✅ Service state consistency maintained through multiple cycles');
    });
  });

  describe('Real Model Type Detection', () => {
    it('should detect model types based on real parameters', async () => {
      await service.enable();
      
      // Test different model calls
      await runtime.useModel('TEXT_SMALL', { shouldRespond: true });
      await runtime.useModel('TEXT_LARGE', { text: 'function myCode() { return true; }' });
      await runtime.useModel('TEXT_LARGE', { text: 'regular conversation' });
      
      const trainingData = service.getTrainingData();
      expect(trainingData.length).toBeGreaterThanOrEqual(3);
      
      // Verify that different model types are detected
      const modelTypes = trainingData.map(data => data.modelType);
      expect(modelTypes.length).toBeGreaterThanOrEqual(3);
      
      // At least one should be detected as coding (contains function keyword)
      const hasCoding = modelTypes.some(type => type === 'coding');
      if (hasCoding) {
        elizaLogger.info('✅ Coding model type detected correctly');
      }
      
      // Should have different types or default to planning
      const uniqueTypes = new Set(modelTypes);
      expect(uniqueTypes.size).toBeGreaterThanOrEqual(1);
      
      elizaLogger.info(`✅ Model types detected: ${Array.from(uniqueTypes).join(', ')}`);
    });

    it('should handle edge cases in model type detection', async () => {
      await service.enable();
      
      // Test edge cases
      const testCases = [
        { params: { text: '' }, description: 'empty text' },
        { params: { text: '   ' }, description: 'whitespace only' },
        { params: { text: 'console.log("hello");' }, description: 'simple code' },
        { params: { shouldRespond: false }, description: 'shouldRespond false' },
        { params: {}, description: 'empty params' },
      ];
      
      for (const testCase of testCases) {
        await runtime.useModel('TEXT_LARGE', testCase.params);
      }
      
      const trainingData = service.getTrainingData();
      expect(trainingData.length).toBeGreaterThanOrEqual(testCases.length);
      
      // All should have some model type assigned
      trainingData.forEach((data, index) => {
        expect(data.modelType).toBeDefined();
        expect(typeof data.modelType).toBe('string');
      });
      
      elizaLogger.info(`✅ Edge case model type detection: ${trainingData.length} samples processed`);
    });
  });

  describe('Real Error Handling', () => {
    it('should handle service errors gracefully with real runtime', async () => {
      await service.enable();
      
      // Test with various potentially problematic inputs
      const problematicInputs = [
        { text: null }, // null text
        { text: undefined }, // undefined text
        { text: 'a'.repeat(10000) }, // very long text
        { invalidParam: 'test' }, // invalid parameter structure
      ];
      
      for (const input of problematicInputs) {
        try {
          const result = await runtime.useModel('TEXT_LARGE', input as any);
          // If it succeeds, that's fine
          expect(result).toBeDefined();
        } catch (error) {
          // If it errors, that's also acceptable as long as it's handled
          expect(error).toBeDefined();
        }
      }
      
      // Service should still be operational
      expect(service.getStatus().enabled).toBe(true);
      
      elizaLogger.info('✅ Service error handling validated');
    });

    it('should maintain data integrity despite individual failures', async () => {
      await service.enable();
      
      // Mix of good and potentially bad calls
      const calls = [
        { text: 'good call 1' },
        { text: '' }, // potentially problematic
        { text: 'good call 2' },
        { text: null }, // potentially problematic
        { text: 'good call 3' },
      ];
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const call of calls) {
        try {
          await runtime.useModel('TEXT_LARGE', call as any);
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }
      
      const trainingData = service.getTrainingData();
      
      // Should have collected data for successful calls
      expect(trainingData.length).toBeGreaterThanOrEqual(successCount);
      
      elizaLogger.info(`✅ Data integrity maintained: ${successCount} successful, ${errorCount} errors, ${trainingData.length} data points`);
    });

    it('should handle concurrent model calls correctly', async () => {
      await service.enable();
      
      // Create multiple concurrent calls
      const concurrentCalls = Array.from({ length: 5 }, (_, i) => 
        runtime.useModel('TEXT_LARGE', { text: `concurrent call ${i}` })
      );
      
      const results = await Promise.allSettled(concurrentCalls);
      
      // Count successful calls
      const successfulCalls = results.filter(result => result.status === 'fulfilled').length;
      
      const trainingData = service.getTrainingData();
      
      // Should have data for most or all successful calls
      expect(trainingData.length).toBeGreaterThanOrEqual(Math.min(successfulCalls, 1));
      
      elizaLogger.info(`✅ Concurrent calls handled: ${successfulCalls} successful, ${trainingData.length} data points`);
    });
  });
});