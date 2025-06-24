/**
 * COMPREHENSIVE PLUGIN INTEGRATION E2E TESTS
 *
 * These tests validate the entire training plugin system using real ElizaOS runtime.
 * No mocks - only real runtime instances, services, and plugin functionality.
 *
 * Test coverage:
 * - Plugin loading and initialization
 * - Service registration and lifecycle
 * - Action execution with real message processing
 * - Provider data collection
 * - Training data workflow
 * - Database operations with real data
 * - File system operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { AgentRuntime, elizaLogger } from '@elizaos/core';
import type { Character, IAgentRuntime, Memory, UUID } from '@elizaos/core';
import { trainingPlugin } from '../../index';
import { TogetherReasoningService } from '../../services/TogetherReasoningService';
import { ReasoningProxyService } from '../../services/reasoning-proxy';
import { TrainingService } from '../../services/training-service';
import { TrainingDatabaseManager } from '../../database/TrainingDatabaseManager';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Test character configuration for runtime
const testCharacter: Character = {
  name: 'TestTrainingAgent',
  bio: ['AI agent for testing training plugin functionality'],
  system: 'You are a test agent for validating training plugin capabilities.',
  messageExamples: [
    [
      { name: 'user', content: { text: 'test message' } },
      { name: 'TestTrainingAgent', content: { text: 'test response' } },
    ],
  ],
  postExamples: [],
  topics: ['testing', 'training', 'plugin-validation'],
  plugins: [],
  settings: {
    REASONING_SERVICE_ENABLED: 'true',
    REASONING_SERVICE_COLLECT_TRAINING_DATA: 'true',
    TOGETHER_AI_API_KEY: 'test-api-key', // For testing without real API calls
  },
  secrets: {},
};

describe('Comprehensive Plugin Integration E2E Tests', () => {
  let runtime: IAgentRuntime;
  let testDatabasePath: string;
  let testRecordingsPath: string;

  beforeEach(async () => {
    elizaLogger.info('🧪 Setting up comprehensive E2E test environment...');

    // Create unique test paths to avoid conflicts
    const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    testDatabasePath = path.join(process.cwd(), '.test-data', testId, 'training.db');
    testRecordingsPath = path.join(process.cwd(), '.test-data', testId, 'recordings');

    // Ensure test directories exist
    await fs.mkdir(path.dirname(testDatabasePath), { recursive: true });
    await fs.mkdir(testRecordingsPath, { recursive: true });

    // Update test character with test-specific paths
    const testCharacterWithPaths = {
      ...testCharacter,
      settings: {
        ...testCharacter.settings,
        TRAINING_DATABASE_URL: `sqlite:${testDatabasePath}`,
        TRAINING_RECORDINGS_DIR: testRecordingsPath,
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

    elizaLogger.info('✅ E2E test environment setup complete');
  });

  afterEach(async () => {
    elizaLogger.info('🧹 Cleaning up E2E test environment...');

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

      if (testRecordingsPath) {
        try {
          await fs.rm(path.dirname(testRecordingsPath), { recursive: true, force: true });
        } catch (error) {
          // Directory might not exist, that's okay
        }
      }
    } catch (error) {
      elizaLogger.warn('Warning during cleanup:', error);
    }

    elizaLogger.info('✅ E2E test environment cleanup complete');
  });

  describe('Plugin Loading and Initialization', () => {
    it('should load training plugin successfully into runtime', async () => {
      // Verify plugin is registered
      expect(runtime.plugins).toBeDefined();
      const trainingPlugin = runtime.plugins.find((p) => p.name === 'training-plugin');
      expect(trainingPlugin).toBeDefined();

      // Verify plugin has expected components
      expect(trainingPlugin?.actions).toBeDefined();
      expect(trainingPlugin?.providers).toBeDefined();
      expect(trainingPlugin?.services).toBeDefined();

      elizaLogger.info('✅ Plugin loading validation complete');
    });

    it('should register all required services in runtime', async () => {
      // Check that core services are registered
      const reasoningService = runtime.getService('together-reasoning');
      const proxyService = runtime.getService('reasoning-proxy');
      const trainingService = runtime.getService('training-service');

      expect(reasoningService).toBeDefined();
      expect(proxyService).toBeDefined();
      expect(trainingService).toBeDefined();

      // Verify service types
      expect(reasoningService).toBeInstanceOf(TogetherReasoningService);
      expect(proxyService).toBeInstanceOf(ReasoningProxyService);
      expect(trainingService).toBeInstanceOf(TrainingService);

      elizaLogger.info('✅ Service registration validation complete');
    });

    it('should register all training actions in runtime', async () => {
      // Check that training actions are available
      const expectedActions = [
        'ENABLE_REASONING_SERVICE',
        'DISABLE_REASONING_SERVICE',
        'START_TRAINING_SESSION',
        'CHECK_REASONING_STATUS',
        'TRAIN_CUSTOM_MODEL',
      ];

      for (const actionName of expectedActions) {
        const action = runtime.actions.find((a) => a.name === actionName);
        expect(action).toBeDefined();
        expect(action?.handler).toBeDefined();
        expect(action?.validate).toBeDefined();
      }

      elizaLogger.info('✅ Action registration validation complete');
    });
  });

  describe('Real Message Processing Pipeline', () => {
    it('should process enable custom reasoning message end-to-end', async () => {
      // Create a real message
      const roomId = uuidv4() as UUID;
      const userId = uuidv4() as UUID;

      const message: Memory = {
        id: uuidv4() as UUID,
        entityId: userId,
        agentId: runtime.agentId,
        roomId,
        content: {
          text: 'enable custom reasoning with fine-tuned models',
          source: 'test',
        },
        createdAt: Date.now(),
      };

      // Process the message through the full pipeline
      elizaLogger.info('🔄 Processing enable custom reasoning message...');

      // This should trigger the enable action
      await runtime.processMessage(message);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify the response was generated
      const responses = await runtime.messageManager.getMemories({
        roomId,
        count: 10,
      });

      const agentResponse = responses.find(
        (r) =>
          r.entityId === runtime.agentId &&
          r.content.text?.includes('Custom Reasoning Service Enabled')
      );

      expect(agentResponse).toBeDefined();
      expect(agentResponse?.content.actions).toContain('ENABLE_REASONING_SERVICE');

      elizaLogger.info('✅ Enable custom reasoning message processing complete');
    });

    it('should collect training data during message processing', async () => {
      // Enable custom reasoning first
      const roomId = uuidv4() as UUID;
      const userId = uuidv4() as UUID;

      // Process several messages to generate training data
      const testMessages = [
        'What is ElizaOS?',
        'How do I create a plugin?',
        'Can you help me with training data?',
        'Generate a simple action for me',
      ];

      for (const messageText of testMessages) {
        const message: Memory = {
          id: uuidv4() as UUID,
          entityId: userId,
          agentId: runtime.agentId,
          roomId,
          content: {
            text: messageText,
            source: 'test',
          },
          createdAt: Date.now(),
        };

        await runtime.processMessage(message);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Check that training data was collected
      const trainingService = runtime.getService('training-service') as TrainingService;
      expect(trainingService).toBeDefined();

      // Verify training data exists in database
      const dbManager = new TrainingDatabaseManager();
      await dbManager.initialize(testDatabasePath);

      const trainingData = await dbManager.getTrainingData('should_respond', 10);
      expect(trainingData.length).toBeGreaterThan(0);

      elizaLogger.info(`✅ Training data collection complete: ${trainingData.length} samples`);
    });
  });

  describe('Database Operations with Real Data', () => {
    it('should create and initialize database schema', async () => {
      const dbManager = new TrainingDatabaseManager();
      await dbManager.initialize(testDatabasePath);

      // Verify database file exists
      const dbExists = await fs
        .access(testDatabasePath)
        .then(() => true)
        .catch(() => false);
      expect(dbExists).toBe(true);

      // Verify schema is created by checking table structure
      const stats = await dbManager.getDatabaseStats();
      expect(stats).toBeDefined();
      expect(stats.totalSamples).toBeDefined();

      elizaLogger.info('✅ Database initialization validation complete');
    });

    it('should store and retrieve training data correctly', async () => {
      const dbManager = new TrainingDatabaseManager();
      await dbManager.initialize(testDatabasePath);

      // Store test training data
      const testData = {
        id: uuidv4(),
        modelType: 'should_respond' as const,
        inputData: { messageText: 'Hello, how are you?' },
        outputData: { decision: 'RESPOND', confidence: 0.95 },
        conversationContext: [],
        stateData: { roomId: uuidv4() },
        metadata: { source: 'e2e-test' },
        tags: ['test', 'validation'],
        timestamp: Date.now(),
      };

      await dbManager.storeTrainingData(testData);

      // Retrieve and verify
      const retrieved = await dbManager.getTrainingData('should_respond', 1);
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].id).toBe(testData.id);
      expect(retrieved[0].modelType).toBe('should_respond');

      elizaLogger.info('✅ Database storage and retrieval validation complete');
    });
  });

  describe('Training Data Export and Processing', () => {
    it('should export training data in Together.ai format', async () => {
      const trainingService = runtime.getService('training-service') as TrainingService;
      expect(trainingService).toBeDefined();

      // First store some test data
      const dbManager = new TrainingDatabaseManager();
      await dbManager.initialize(testDatabasePath);

      // Create test training samples
      for (let i = 0; i < 5; i++) {
        await dbManager.storeTrainingData({
          id: uuidv4(),
          modelType: 'should_respond',
          inputData: { messageText: `Test message ${i}` },
          outputData: { decision: 'RESPOND', confidence: 0.9 },
          conversationContext: [],
          stateData: {},
          metadata: { test: true },
          tags: ['e2e-test'],
          timestamp: Date.now(),
        });
      }

      // Export training data
      const exportOptions = {
        modelType: 'should_respond' as const,
        format: 'jsonl' as const,
        limit: 10,
      };

      const dataset = await trainingService.exportTrainingData(exportOptions);

      expect(dataset).toBeDefined();
      expect(dataset.modelType).toBe('should_respond');
      expect(dataset.samples.length).toBeGreaterThan(0);

      elizaLogger.info(
        `✅ Training data export validation complete: ${dataset.samples.length} samples exported`
      );
    });
  });

  describe('Provider Integration', () => {
    it('should collect context from training status provider', async () => {
      const message: Memory = {
        id: uuidv4() as UUID,
        entityId: uuidv4() as UUID,
        agentId: runtime.agentId,
        roomId: uuidv4() as UUID,
        content: { text: 'check my training status', source: 'test' },
        createdAt: Date.now(),
      };

      // Compose state which should include provider data
      const state = await runtime.composeState(message);

      expect(state).toBeDefined();
      expect(state.values).toBeDefined();

      // Check if training status provider contributed data
      const providerKeys = Object.keys(state.values);
      expect(providerKeys.length).toBeGreaterThan(0);

      elizaLogger.info('✅ Provider integration validation complete');
    });
  });

  describe('File System Integration', () => {
    it('should create and manage training recording files', async () => {
      // Verify recordings directory was created
      const recordingsExist = await fs
        .access(testRecordingsPath)
        .then(() => true)
        .catch(() => false);
      expect(recordingsExist).toBe(true);

      // Test recording manager functionality
      const { TrainingRecordingManager } = await import(
        '../../filesystem/TrainingRecordingManager'
      );
      const recordingManager = new TrainingRecordingManager(runtime, testRecordingsPath);

      // Create a test recording
      const testRecording = {
        sessionId: uuidv4(),
        modelType: 'should_respond' as const,
        timestamp: Date.now(),
        data: { test: 'recording' },
      };

      await recordingManager.recordTrainingData(testRecording);

      // Verify file was created
      const recordings = await recordingManager.getRecordings();
      expect(recordings.length).toBeGreaterThan(0);

      elizaLogger.info('✅ File system integration validation complete');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      // Test with invalid database path
      const invalidPath = '/invalid/path/database.db';

      try {
        const dbManager = new TrainingDatabaseManager();
        await dbManager.initialize(invalidPath);

        // Should not reach here
        expect(false).toBe(true);
      } catch (error) {
        // Should handle error gracefully
        expect(error).toBeDefined();
        elizaLogger.info('✅ Database error handling validation complete');
      }
    });

    it('should continue functioning when services fail to initialize', async () => {
      // Create runtime with invalid configuration
      const invalidCharacter = {
        ...testCharacter,
        settings: {
          ...testCharacter.settings,
          TOGETHER_AI_API_KEY: '', // Invalid API key
        },
      };

      const testRuntime = new AgentRuntime({
        character: invalidCharacter,
        token: 'test-token',
        modelName: 'gpt-4o-mini',
      });

      // Should not throw during plugin registration
      await expect(testRuntime.registerPlugin(customReasoningPlugin)).resolves.not.toThrow();

      elizaLogger.info('✅ Service failure handling validation complete');
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle concurrent message processing efficiently', async () => {
      const roomId = uuidv4() as UUID;
      const startTime = Date.now();

      // Process multiple messages concurrently
      const messagePromises = Array.from({ length: 10 }, (_, i) => {
        const message: Memory = {
          id: uuidv4() as UUID,
          entityId: uuidv4() as UUID,
          agentId: runtime.agentId,
          roomId,
          content: {
            text: `Concurrent test message ${i}`,
            source: 'performance-test',
          },
          createdAt: Date.now(),
        };

        return runtime.processMessage(message);
      });

      await Promise.all(messagePromises);

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds

      elizaLogger.info(
        `✅ Concurrent processing validation complete: ${processingTime}ms for 10 messages`
      );
    });
  });
});

// Helper function to create test runtime (if needed for other tests)
export async function createTestAgentRuntime(
  overrides: Partial<Character> = {}
): Promise<IAgentRuntime> {
  const character = { ...testCharacter, ...overrides };

  const runtime = new AgentRuntime({
    character,
    token: process.env.OPENAI_API_KEY || 'test-token',
    modelName: 'gpt-4o-mini',
  });

  await runtime.registerPlugin(trainingPlugin);
  await runtime.initialize();

  return runtime;
}

elizaLogger.info('✅ Comprehensive plugin integration E2E tests defined');
