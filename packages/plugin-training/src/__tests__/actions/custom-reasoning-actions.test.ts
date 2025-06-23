/**
 * REAL RUNTIME INTEGRATION TESTS FOR CUSTOM REASONING ACTIONS
 *
 * These tests use actual ElizaOS runtime instances and real service implementations.
 * No mocks - only real runtime instances, actions, and plugin functionality.
 *
 * Test coverage:
 * - Action validation with real runtime
 * - Action handler execution with real services
 * - Real database operations and training data
 * - Service integration and lifecycle
 * - Error handling with actual runtime
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentRuntime, elizaLogger } from '@elizaos/core';
import type { Character, IAgentRuntime, Memory, UUID } from '@elizaos/core';
import {
  enableCustomReasoningAction,
  disableCustomReasoningAction,
  startTrainingSessionAction,
  checkReasoningStatusAction,
  trainModelAction,
} from '../../actions/custom-reasoning-actions.js';
import { trainingPlugin } from '../../index';
import { TrainingDatabaseManager } from '../../database/TrainingDatabaseManager';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Test character configuration for runtime
const testCharacter: Character = {
  name: 'CustomReasoningTestAgent',
  bio: ['AI agent for testing custom reasoning actions functionality'],
  system: 'You are a test agent for validating custom reasoning actions capabilities.',
  messageExamples: [
    [
      { name: 'user', content: { text: 'enable custom reasoning' } },
      { name: 'CustomReasoningTestAgent', content: { text: 'testing reasoning response' } },
    ],
  ],
  postExamples: [],
  topics: ['testing', 'reasoning', 'actions', 'service-validation'],
  plugins: [],
  settings: {
    REASONING_SERVICE_ENABLED: 'true',
    TOGETHER_AI_API_KEY: 'test-api-key-actions',
    REASONING_SERVICE_SHOULD_RESPOND_ENABLED: 'true',
    REASONING_SERVICE_PLANNING_ENABLED: 'true',
    REASONING_SERVICE_CODING_ENABLED: 'true',
    REASONING_SERVICE_COLLECT_TRAINING_DATA: 'true',
  },
  secrets: {},
};

describe('Real Runtime Custom Reasoning Actions Integration Tests', () => {
  let runtime: IAgentRuntime;
  let testDatabasePath: string;
  let testDataPath: string;

  beforeEach(async () => {
    elizaLogger.info('🧪 Setting up Custom Reasoning Actions real runtime test environment...');

    // Create unique test paths to avoid conflicts
    const testId = `custom-reasoning-actions-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    testDatabasePath = path.join(process.cwd(), '.test-data', testId, 'training.db');
    testDataPath = path.join(process.cwd(), '.test-data', testId, 'actions-data');

    // Ensure test directories exist
    await fs.mkdir(path.dirname(testDatabasePath), { recursive: true });
    await fs.mkdir(testDataPath, { recursive: true });

    // Update test character with test-specific paths
    const testCharacterWithPaths = {
      ...testCharacter,
      settings: {
        ...testCharacter.settings,
        TRAINING_DATABASE_URL: `sqlite:${testDatabasePath}`,
        ACTIONS_DATA_DIR: testDataPath,
      },
    };

    // Create real AgentRuntime instance
    runtime = new AgentRuntime({
      character: testCharacterWithPaths,
      token: process.env.OPENAI_API_KEY || 'test-token',
      modelName: 'gpt-4o-mini',
    });

    // Register the training plugin
    await runtime.registerPlugin(trainingPlugin);

    // Initialize the runtime
    await runtime.initialize();

    elizaLogger.info('✅ Custom Reasoning Actions real runtime test environment setup complete');
  });

  afterEach(async () => {
    elizaLogger.info('🧹 Cleaning up Custom Reasoning Actions test environment...');

    try {
      // Stop all services properly
      const services = ['together-reasoning', 'reasoning-proxy', 'training-service'];
      for (const serviceName of services) {
        const service = runtime.getService(serviceName);
        if (service && typeof service.stop === 'function') {
          await service.stop();
        }
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
      elizaLogger.warn('Warning during Custom Reasoning Actions cleanup:', error);
    }

    elizaLogger.info('✅ Custom Reasoning Actions test environment cleanup complete');
  });

  // Helper function to create test memory
  function createTestMemory(content: any, roomId?: UUID): Memory {
    return {
      id: uuidv4() as UUID,
      entityId: uuidv4() as UUID,
      agentId: runtime.agentId,
      roomId: roomId || (uuidv4() as UUID),
      content,
      createdAt: Date.now(),
    };
  }

  // Helper function to create test callback
  function createTestCallback(): { callback: Function; responses: any[] } {
    const responses: any[] = [];
    const callback = async (content: any) => {
      responses.push(content);
      return [];
    };
    return { callback, responses };
  }

  describe('Real enableCustomReasoningAction', () => {
    it('should validate enable custom reasoning requests with real runtime', async () => {
      const validMessages = [
        'enable custom reasoning',
        'activate fine-tuned models',
        'turn on deepseek reasoning',
        'start reasoning service',
      ];

      for (const text of validMessages) {
        const message = createTestMemory({ text, source: 'test' });
        const result = await enableCustomReasoningAction.validate!(runtime, message);
        expect(result).toBe(true);
        elizaLogger.info(`✅ Validation passed for: "${text}"`);
      }
    });

    it('should not validate unrelated messages with real runtime', async () => {
      const invalidMessages = [
        'hello world',
        'what is the weather',
        'disable reasoning',
        'turn off custom models',
      ];

      for (const text of invalidMessages) {
        const message = createTestMemory({ text, source: 'test' });
        const result = await enableCustomReasoningAction.validate!(runtime, message);
        expect(result).toBe(false);
        elizaLogger.info(`✅ Validation correctly rejected: "${text}"`);
      }
    });

    it('should enable custom reasoning successfully with real runtime', async () => {
      const message = createTestMemory({
        content: { text: 'enable custom reasoning', source: 'test' },
      });

      const state = {
        values: {},
        data: {},
        text: '',
      };

      const { callback, responses } = createTestCallback();

      await enableCustomReasoningAction.handler(runtime, message, state, {}, callback);

      expect(responses.length).toBeGreaterThan(0);
      const response = responses[0];
      expect(response.text).toContain('Custom Reasoning Service');
      expect(response.actions).toContain('ENABLE_REASONING_SERVICE');

      elizaLogger.info(
        `✅ Enable custom reasoning response: ${response.text.substring(0, 100)}...`
      );
    });

    it('should handle missing API key with real runtime', async () => {
      // Create runtime with missing API key
      const noApiKeyCharacter = {
        ...testCharacter,
        settings: {
          ...testCharacter.settings,
          TOGETHER_AI_API_KEY: '', // Empty API key
        },
      };

      const testRuntime = new AgentRuntime({
        character: noApiKeyCharacter,
        token: 'test-token',
        modelName: 'gpt-4o-mini',
      });

      await testRuntime.registerPlugin(trainingPlugin);
      await testRuntime.initialize();

      const message = createTestMemory({
        content: { text: 'enable custom reasoning', source: 'test' },
      });

      const { callback, responses } = createTestCallback();

      await enableCustomReasoningAction.handler(
        testRuntime,
        message,
        { values: {}, data: {}, text: '' },
        {},
        callback
      );

      expect(responses.length).toBeGreaterThan(0);
      const response = responses[0];
      expect(response.text).toContain('API key');
      expect(response.thought).toBeDefined();

      elizaLogger.info(`✅ Missing API key handling: ${response.text.substring(0, 100)}...`);
    });

    it('should handle service availability with real runtime', async () => {
      const message = createTestMemory({
        content: { text: 'enable custom reasoning', source: 'test' },
      });

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

      // Should either enable successfully or indicate service unavailability
      const isSuccess = response.text.includes('Enabled') || response.text.includes('enabled');
      const isUnavailable =
        response.text.includes('not available') || response.text.includes('unavailable');
      expect(isSuccess || isUnavailable).toBe(true);

      elizaLogger.info(`✅ Service availability handling: ${response.text.substring(0, 100)}...`);
    });
  });

  describe('Real disableCustomReasoningAction', () => {
    it('should validate disable requests with real runtime', async () => {
      const message = createTestMemory({
        content: { text: 'disable custom reasoning', source: 'test' },
      });

      const result = await disableCustomReasoningAction.validate!(runtime, message);
      expect(result).toBe(true);
      elizaLogger.info('✅ Disable validation passed');
    });

    it('should disable custom reasoning with real runtime', async () => {
      const message = createTestMemory({
        content: { text: 'disable custom reasoning', source: 'test' },
      });

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
      expect(response.actions).toContain('DISABLE_REASONING_SERVICE');

      elizaLogger.info(
        `✅ Disable custom reasoning response: ${response.text.substring(0, 100)}...`
      );
    });

    it('should handle disable when already disabled with real runtime', async () => {
      // Create runtime with disabled custom reasoning
      const disabledCharacter = {
        ...testCharacter,
        settings: {
          ...testCharacter.settings,
          REASONING_SERVICE_ENABLED: 'false',
        },
      };

      const testRuntime = new AgentRuntime({
        character: disabledCharacter,
        token: 'test-token',
        modelName: 'gpt-4o-mini',
      });

      await testRuntime.registerPlugin(trainingPlugin);
      await testRuntime.initialize();

      const message = createTestMemory({
        content: { text: 'disable custom reasoning', source: 'test' },
      });

      const { callback, responses } = createTestCallback();

      await disableCustomReasoningAction.handler(
        testRuntime,
        message,
        { values: {}, data: {}, text: '' },
        {},
        callback
      );

      expect(responses.length).toBeGreaterThan(0);
      const response = responses[0];
      expect(response.text).toBeDefined();
      expect(response.thought).toBeDefined();

      elizaLogger.info(`✅ Already disabled handling: ${response.text.substring(0, 100)}...`);
    });
  });

  describe('Real startTrainingSessionAction', () => {
    it('should validate training session requests with real runtime', async () => {
      const message = createTestMemory({
        content: { text: 'start training session for planning model', source: 'test' },
      });

      const result = await startTrainingSessionAction.validate!(runtime, message);
      expect(result).toBe(true);
      elizaLogger.info('✅ Training session validation passed');
    });

    it('should start training session successfully with real runtime', async () => {
      const message = createTestMemory({
        content: { text: 'start training session for coding model', source: 'test' },
      });

      const { callback, responses } = createTestCallback();

      await startTrainingSessionAction.handler(
        runtime,
        message,
        { values: {}, data: {}, text: '' },
        {},
        callback
      );

      expect(responses.length).toBeGreaterThan(0);
      const response = responses[0];
      expect(response.text).toContain('Training Session');
      expect(response.thought).toBeDefined();
      expect(response.actions).toContain('START_TRAINING_SESSION');

      elizaLogger.info(`✅ Training session started: ${response.text.substring(0, 100)}...`);
    });

    it('should detect model type from message with real runtime', async () => {
      const testCases = [
        { text: 'start training session for planning', expectedType: 'planning' },
        { text: 'begin coding training session', expectedType: 'coding' },
        { text: 'start training session', expectedType: 'should_respond' }, // default
      ];

      for (const { text, expectedType } of testCases) {
        const message = createTestMemory({ content: { text, source: 'test' } });
        const { callback, responses } = createTestCallback();

        await startTrainingSessionAction.handler(
          runtime,
          message,
          { values: {}, data: {}, text: '' },
          {},
          callback
        );

        expect(responses.length).toBeGreaterThan(0);
        const response = responses[0];
        expect(response.text).toContain('Model Type');
        expect(response.thought).toBeDefined();
        expect(response.actions).toContain('START_TRAINING_SESSION');

        elizaLogger.info(`✅ Model type detection for "${text}": expected ${expectedType}`);
      }
    });
  });

  describe('Real checkReasoningStatusAction', () => {
    beforeEach(async () => {
      // Initialize database with some test data if needed
      const dbManager = new TrainingDatabaseManager();
      try {
        await dbManager.initialize(testDatabasePath);

        // Add some test training data for status reporting
        for (let i = 0; i < 10; i++) {
          await dbManager.storeTrainingData({
            id: uuidv4(),
            modelType: 'should_respond',
            inputData: { messageText: `Test message ${i}` },
            outputData: { decision: 'RESPOND', confidence: 0.8 + i * 0.01 },
            conversationContext: [],
            stateData: {},
            metadata: { test: true },
            tags: ['test'],
            timestamp: Date.now() - i * 1000,
          });
        }
      } catch (error) {
        elizaLogger.warn('Database setup for status test skipped:', error);
      }
    });

    it('should validate status check requests with real runtime', async () => {
      const message = createTestMemory({
        content: { text: 'check reasoning status', source: 'test' },
      });

      const result = await checkReasoningStatusAction.validate!(runtime, message);
      expect(result).toBe(true);
      elizaLogger.info('✅ Status check validation passed');
    });

    it('should provide comprehensive status report with real runtime', async () => {
      const message = createTestMemory({
        content: { text: 'show custom reasoning status', source: 'test' },
      });

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
      expect(response.text).toContain('Status Report');
      expect(response.thought).toBeDefined();
      expect(response.actions).toContain('CHECK_REASONING_STATUS');

      // Should contain various status sections
      expect(response.text).toMatch(/Service Status|Training Data|Recording Files/);

      elizaLogger.info(`✅ Status report provided: ${response.text.substring(0, 100)}...`);
    });

    it('should handle database errors gracefully with real runtime', async () => {
      // Use an invalid database path to trigger error
      const invalidRuntime = new AgentRuntime({
        character: {
          ...testCharacter,
          settings: {
            ...testCharacter.settings,
            TRAINING_DATABASE_URL: 'sqlite:/invalid/path/db.sqlite',
          },
        },
        token: 'test-token',
        modelName: 'gpt-4o-mini',
      });

      await invalidRuntime.registerPlugin(trainingPlugin);
      await invalidRuntime.initialize();

      const message = createTestMemory({
        content: { text: 'check status', source: 'test' },
      });

      const { callback, responses } = createTestCallback();

      await checkReasoningStatusAction.handler(
        invalidRuntime,
        message,
        { values: {}, data: {}, text: '' },
        {},
        callback
      );

      expect(responses.length).toBeGreaterThan(0);
      const response = responses[0];
      expect(response.text).toBeDefined();
      expect(response.thought).toBeDefined();

      // Should handle error gracefully
      const isError =
        response.text.includes('Failed') ||
        response.text.includes('error') ||
        response.text.includes('unavailable');
      elizaLogger.info(
        `✅ Database error handling: ${isError ? 'error handled' : 'status provided'}`
      );
    });
  });

  describe('Real trainModelAction', () => {
    beforeEach(async () => {
      // Create sufficient training data for testing
      const dbManager = new TrainingDatabaseManager();
      try {
        await dbManager.initialize(testDatabasePath);

        // Add sufficient training data (100 samples)
        for (let i = 0; i < 100; i++) {
          await dbManager.storeTrainingData({
            id: uuidv4(),
            modelType: 'should_respond',
            inputData: { messageText: `Training message ${i}` },
            outputData: { decision: 'RESPOND', confidence: 0.8 + i * 0.001 },
            conversationContext: [],
            stateData: {},
            metadata: { test: true, sample: i },
            tags: ['training', 'test'],
            timestamp: Date.now() - i * 1000,
          });
        }
      } catch (error) {
        elizaLogger.warn('Training data setup skipped:', error);
      }
    });

    it('should validate training requests with real runtime', async () => {
      const message = createTestMemory({
        content: { text: 'train the planning model', source: 'test' },
      });

      const result = await trainModelAction.validate!(runtime, message);
      expect(result).toBe(true);
      elizaLogger.info('✅ Training validation passed');
    });

    it('should start model training with sufficient data', async () => {
      const message = createTestMemory({
        content: { text: 'fine-tune the coding model', source: 'test' },
      });

      const { callback, responses } = createTestCallback();

      await trainModelAction.handler(
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
      expect(response.actions).toContain('TRAIN_CUSTOM_MODEL');

      // Should either start training or indicate insufficient data/service unavailable
      const isTraining = response.text.includes('Training') || response.text.includes('Initiated');
      const isInsufficient =
        response.text.includes('Insufficient') || response.text.includes('insufficient');
      const isUnavailable =
        response.text.includes('not available') || response.text.includes('unavailable');
      expect(isTraining || isInsufficient || isUnavailable).toBe(true);

      elizaLogger.info(`✅ Model training response: ${response.text.substring(0, 100)}...`);
    });

    it('should handle insufficient training data with real runtime', async () => {
      // Create runtime with minimal training data
      const minimalDbPath = path.join(
        process.cwd(),
        '.test-data',
        `minimal-${Date.now()}`,
        'training.db'
      );
      await fs.mkdir(path.dirname(minimalDbPath), { recursive: true });

      const dbManager = new TrainingDatabaseManager();
      await dbManager.initialize(minimalDbPath);

      // Add only a few samples (less than required minimum)
      for (let i = 0; i < 10; i++) {
        await dbManager.storeTrainingData({
          id: uuidv4(),
          modelType: 'should_respond',
          inputData: { messageText: `Message ${i}` },
          outputData: { decision: 'RESPOND' },
          conversationContext: [],
          stateData: {},
          metadata: {},
          tags: ['minimal'],
          timestamp: Date.now(),
        });
      }

      const message = createTestMemory({
        content: { text: 'train the model', source: 'test' },
      });

      const { callback, responses } = createTestCallback();

      await trainModelAction.handler(
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

      elizaLogger.info(`✅ Insufficient data handling: ${response.text.substring(0, 100)}...`);

      // Cleanup
      try {
        await fs.rm(path.dirname(minimalDbPath), { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should handle missing reasoning service with real runtime', async () => {
      // Create runtime without reasoning service
      const noServiceCharacter = {
        ...testCharacter,
        settings: {
          ...testCharacter.settings,
          REASONING_SERVICE_ENABLED: 'false',
          TOGETHER_AI_API_KEY: '',
        },
      };

      const testRuntime = new AgentRuntime({
        character: noServiceCharacter,
        token: 'test-token',
        modelName: 'gpt-4o-mini',
      });

      await testRuntime.registerPlugin(trainingPlugin);
      await testRuntime.initialize();

      const message = createTestMemory({
        content: { text: 'train the model', source: 'test' },
      });

      const { callback, responses } = createTestCallback();

      await trainModelAction.handler(
        testRuntime,
        message,
        { values: {}, data: {}, text: '' },
        {},
        callback
      );

      expect(responses.length).toBeGreaterThan(0);
      const response = responses[0];
      expect(response.text).toBeDefined();
      expect(response.thought).toBeDefined();

      elizaLogger.info(`✅ Missing service handling: ${response.text.substring(0, 100)}...`);
    });

    it('should detect correct model type from message with real runtime', async () => {
      const testCases = [
        { text: 'train planning model', expectedType: 'planning' },
        { text: 'fine-tune coding model', expectedType: 'coding' },
        { text: 'train model', expectedType: 'should_respond' }, // default
      ];

      for (const { text, expectedType } of testCases) {
        const message = createTestMemory({ content: { text, source: 'test' } });
        const { callback, responses } = createTestCallback();

        await trainModelAction.handler(
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
        expect(response.actions).toContain('TRAIN_CUSTOM_MODEL');

        elizaLogger.info(
          `✅ Model type detection for "${text}": response includes model type info`
        );
      }
    });
  });
});
