/**
 * PRODUCTION VALIDATION TESTS
 *
 * End-to-end validation of the entire training plugin system in production-like scenarios.
 * These tests simulate real-world usage patterns and validate complete workflows.
 *
 * Test scenarios:
 * - Complete training data collection pipeline
 * - Dataset creation and export workflows
 * - Model training and deployment simulation
 * - Custom reasoning integration with real models
 * - Performance testing with realistic data volumes
 * - Production configuration validation
 * - Cross-platform deployment testing
 * - Error recovery and resilience testing
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { AgentRuntime, elizaLogger } from '@elizaos/core';
import type { Character, IAgentRuntime, Memory, UUID } from '@elizaos/core';
import { trainingPlugin } from '../../index';
import { TrainingService } from '../../services/training-service';
import { TogetherReasoningService } from '../../services/TogetherReasoningService';
import { TrainingDatabaseManager } from '../../database/TrainingDatabaseManager';
import { TrainingRecordingManager } from '../../filesystem/TrainingRecordingManager';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

// Import SQL plugin for database adapter
import { plugin as sqlPlugin } from '@elizaos/plugin-sql';

// Production-like character configuration
const productionCharacter: Character = {
  name: 'ProductionAgent',
  bio: ['Production AI agent for comprehensive training validation'],
  system: 'You are a production AI agent designed to validate comprehensive training workflows.',
  messageExamples: [
    [
      { name: 'user', content: { text: 'Enable custom reasoning for production use' } },
      {
        name: 'ProductionAgent',
        content: { text: 'Enabling custom reasoning with full production configuration.' },
      },
    ],
  ],
  postExamples: []
  topics: ['production', 'training', 'validation', 'deployment'],
  plugins: ['@elizaos/plugin-sql'], // Required for database adapter
  settings: {
    // Production-like settings
    REASONING_SERVICE_ENABLED: 'true',
    REASONING_SERVICE_COLLECT_TRAINING_DATA: 'true',
    REASONING_SERVICE_SHOULD_RESPOND_ENABLED: 'true',
    REASONING_SERVICE_PLANNING_ENABLED: 'true',
    REASONING_SERVICE_CODING_ENABLED: 'true',
    REASONING_SERVICE_BUDGET_LIMIT: '100',
    REASONING_SERVICE_AUTO_SHUTDOWN_MINUTES: '60',
    REASONING_SERVICE_MAX_COST_PER_HOUR: '10',
    REASONING_SERVICE_MAX_SAMPLES_PER_MODEL: '10000',
    REASONING_SERVICE_RETENTION_DAYS: '30',
    TOGETHER_AI_API_KEY: process.env.TOGETHER_AI_API_KEY || 'test-production-key',
  },
  secrets: {},
};

describe('Production Validation Tests', () => {
  let runtime: IAgentRuntime;
  let tempDir: string;
  let dbPath: string;
  let recordingsPath: string;

  beforeAll(async () => {
    elizaLogger.info('🏭 Starting production validation test suite...');

    // Create temporary directory for production testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'eliza-production-test-'));
    dbPath = path.join(tempDir, 'production.db');
    recordingsPath = path.join(tempDir, 'recordings');

    await fs.mkdir(recordingsPath, { recursive: true });

    elizaLogger.info(`📁 Production test workspace: ${tempDir}`);
  });

  afterAll(async () => {
    elizaLogger.info('🧹 Cleaning up production test environment...');

    try {
      // Stop runtime if it exists
      if (runtime) {
        const services = ['training-service', 'together-reasoning'];
        for (const serviceName of services) {
          const service = runtime.getService(serviceName);
          if (service && typeof service.stop === 'function') {
            await service.stop();
          }
        }
      }

      // Clean up temporary files
      await fs.rm(tempDir, { recursive: true, force: true });
      elizaLogger.info('✅ Production test cleanup complete');
    } catch (error) {
      elizaLogger.warn('Warning during production cleanup:', error);
    }
  });

  beforeEach(async () => {
    elizaLogger.info('🔧 Setting up production test case...');

    // Create fresh runtime for each test
    const characterWithPaths = {
      ...productionCharacter,
      settings: {
        ...productionCharacter.settings,
        TRAINING_DATABASE_URL: `sqlite:${dbPath}`,
        TRAINING_RECORDINGS_DIR: recordingsPath,
        SQLITE_DATA_DIR: tempDir, // Add this for SQL plugin
      },
    };

    elizaLogger.info(`Database path: ${dbPath}`);
    elizaLogger.info(`Recordings path: ${recordingsPath}`);
    elizaLogger.info(`Temp dir: ${tempDir}`);

    runtime = new AgentRuntime({
      character: characterWithPaths,
      token: process.env.OPENAI_API_KEY || 'test-token',
      modelName: 'gpt-4o-mini',
    });

    // Register SQL plugin first for database adapter
    await runtime.registerPlugin(sqlPlugin);
    await runtime.registerPlugin(trainingPlugin);

    try {
      await runtime.initialize();
    } catch (error) {
      elizaLogger.error('Runtime initialization failed:', error);
      throw error;
    }

    elizaLogger.info('✅ Production test case setup complete');
  });

  afterEach(async () => {
    if (runtime) {
      const services = ['training-service', 'together-reasoning'];
      for (const serviceName of services) {
        const service = runtime.getService(serviceName);
        if (service && typeof service.stop === 'function') {
          await service.stop();
        }
      }
    }
  });

  describe('Complete Training Data Collection Pipeline', () => {
    it('should collect training data from realistic conversation flows', async () => {
      elizaLogger.info('🔄 Testing complete training data collection pipeline...');

      const roomId = uuidv4() as UUID;
      const userId = uuidv4() as UUID;

      // Simulate realistic conversation flow
      const conversationFlow = [
        'Hello! Can you help me write a TypeScript function?',
        'I need to create a REST API endpoint for user authentication',
        "What's the best way to handle JWT tokens securely?",
        'Can you show me how to implement rate limiting?',
        'How do I add proper error handling to this code?',
      ];

      elizaLogger.info(`📝 Processing ${conversationFlow.length} messages in conversation flow...`);

      for (let i = 0; i < conversationFlow.length; i++) {
        const message: Memory = {
          id: uuidv4() as UUID,
          entityId: userId,
          agentId: runtime.agentId,
          roomId,
          content: {
            text: conversationFlow[i],
            source: 'production-test',
          },
          createdAt: Date.now() + i * 1000,
        };

        // Process message through full pipeline
        await runtime.processMessage(message);

        // Wait for processing and data collection
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Verify training data was collected
      const dbManager = new TrainingDatabaseManager();
      await dbManager.initialize(dbPath);

      const collectedData = await dbManager.getTrainingData('should_respond', 100);
      expect(collectedData.length).toBeGreaterThan(0);

      // Verify data quality
      for (const dataPoint of collectedData) {
        expect(dataPoint.id).toBeDefined();
        expect(dataPoint.modelType).toBe('should_respond');
        expect(JSON.parse(dataPoint.inputData)).toHaveProperty('messageText');
        expect(JSON.parse(dataPoint.outputData)).toHaveProperty('decision');
      }

      elizaLogger.info(
        `✅ Collected ${collectedData.length} training data points from conversation`
      );
    });

    it('should handle high-volume message processing without data loss', async () => {
      elizaLogger.info('📊 Testing high-volume message processing...');

      const roomId = uuidv4() as UUID;
      const userId = uuidv4() as UUID;
      const messageCount = 50;

      // Generate high volume of messages
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        id: uuidv4() as UUID,
        entityId: userId,
        agentId: runtime.agentId,
        roomId,
        content: {
          text: `High volume test message ${i + 1}: Write a function to process data efficiently`,
          source: 'production-volume-test',
        },
        createdAt: Date.now() + i * 100,
      }));

      const startTime = Date.now();

      // Process messages in batches to simulate realistic load
      const batchSize = 10;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);

        const batchPromises = batch.map((message) => runtime.processMessage(message));
        await Promise.all(batchPromises);

        // Brief pause between batches
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      const processingTime = Date.now() - startTime;
      elizaLogger.info(`⏱️  Processed ${messageCount} messages in ${processingTime}ms`);

      // Verify all data was collected
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Allow final processing

      const dbManager = new TrainingDatabaseManager();
      await dbManager.initialize(dbPath);

      const stats = await dbManager.getDatabaseStats();
      expect(stats.totalSamples).toBeGreaterThan(messageCount * 0.8); // Allow for some variance

      elizaLogger.info(`📈 Database contains ${stats.totalSamples} total training samples`);

      // Performance validation
      const avgProcessingTime = processingTime / messageCount;
      expect(avgProcessingTime).toBeLessThan(1000); // Should process within 1 second per message

      elizaLogger.info(`🚀 Average processing time: ${avgProcessingTime.toFixed(2)}ms per message`);
    });
  });

  describe('Dataset Creation and Export Workflows', () => {
    it('should create production-ready datasets with proper formatting', async () => {
      elizaLogger.info('📦 Testing production dataset creation and export...');

      // First, seed the database with realistic training data
      const dbManager = new TrainingDatabaseManager();
      await dbManager.initialize(dbPath);

      // Create diverse training data samples
      const modelTypes = ['should_respond', 'planning', 'coding'] as const;
      const samplesPerType = 20;

      for (const modelType of modelTypes) {
        for (let i = 0; i < samplesPerType; i++) {
          await dbManager.storeTrainingData({
            id: uuidv4(),
            modelType,
            inputData: {
              messageText: `Production test input ${i + 1} for ${modelType}`,
              conversationContext: []
              state: {},
            },
            outputData:
              modelType === 'should_respond'
                ? {
                    decision: 'RESPOND',
                    reasoning: `Production reasoning ${i + 1}`,
                    confidence: 0.85 + i * 0.001,
                  }
                : modelType === 'planning'
                  ? { thought: `Production thought ${i + 1}`, actions: ['REPLY'], confidence: 0.9 }
                  : {
                      code: `// Production code ${i + 1}\nfunction example() { return true; }`,
                      explanation: `Production explanation ${i + 1}`,
                    },
            conversationContext: []
            stateData: {},
            metadata: {
              agentId: runtime.agentId,
              roomId: uuidv4() as UUID,
              responseTimeMs: 100 + i * 5,
              tokensUsed: 50 + i * 2,
              costUsd: 0.001 + i * 0.0001,
            },
            tags: [`production-${modelType}`, 'high-quality'],
            timestamp: Date.now() - i * 60000, // Spread over time
          });
        }
      }

      // Test dataset export for each model type
      const trainingService = runtime.getService('training-service') as TrainingService;
      expect(trainingService).toBeDefined();

      for (const modelType of modelTypes) {
        elizaLogger.info(`📊 Exporting dataset for ${modelType}...`);

        const dataset = await trainingService.exportTrainingData({
          modelType,
          format: 'jsonl',
          limit: samplesPerType,
          minConfidence: 0.7,
        });

        expect(dataset).toBeDefined();
        expect(dataset.modelType).toBe(modelType);
        expect(dataset.format).toBe('jsonl');
        expect(dataset.samples.length).toBeGreaterThan(0);
        expect(dataset.metadata.totalSamples).toBeGreaterThan(0);
        expect(dataset.metadata.exportedAt).toBeGreaterThan(0);

        // Validate dataset quality
        for (const sample of dataset.samples) {
          expect(sample.input).toBeDefined();
          expect(sample.output).toBeDefined();

          // Validate JSONL format compatibility
          const jsonlLine = JSON.stringify(sample);
          expect(() => JSON.parse(jsonlLine)).not.toThrow();
        }

        elizaLogger.info(`✅ ${modelType} dataset: ${dataset.samples.length} samples exported`);
      }
    });

    it('should handle dataset export with filtering and quality controls', async () => {
      elizaLogger.info('🔍 Testing dataset export with quality filtering...');

      const dbManager = new TrainingDatabaseManager();
      await dbManager.initialize(dbPath);

      // Create mixed quality data
      const qualityLevels = [
        { confidence: 0.95, quality: 'high' },
        { confidence: 0.75, quality: 'medium' },
        { confidence: 0.45, quality: 'low' },
      ];

      for (const level of qualityLevels) {
        for (let i = 0; i < 10; i++) {
          await dbManager.storeTrainingData({
            id: uuidv4(),
            modelType: 'should_respond',
            inputData: {
              messageText: `${level.quality} quality message ${i + 1}`,
              conversationContext: []
            },
            outputData: {
              decision: 'RESPOND',
              reasoning: `${level.quality} quality reasoning`,
              confidence: level.confidence,
            },
            conversationContext: []
            stateData: {},
            metadata: {
              agentId: runtime.agentId,
              roomId: uuidv4() as UUID,
              quality: level.quality,
            },
            tags: [level.quality],
            timestamp: Date.now(),
          });
        }
      }

      const trainingService = runtime.getService('training-service') as TrainingService;

      // Test high-quality filtering
      const highQualityDataset = await trainingService.exportTrainingData({
        modelType: 'should_respond',
        format: 'jsonl',
        minConfidence: 0.9,
        limit: 100,
      });

      expect(highQualityDataset.samples.length).toBe(10); // Only high quality samples

      // Test medium+ quality filtering
      const mediumQualityDataset = await trainingService.exportTrainingData({
        modelType: 'should_respond',
        format: 'jsonl',
        minConfidence: 0.7,
        limit: 100,
      });

      expect(mediumQualityDataset.samples.length).toBe(20); // High + medium quality samples

      elizaLogger.info(
        `📊 Quality filtering: ${highQualityDataset.samples.length} high-quality, ${mediumQualityDataset.samples.length} medium+ quality samples`
      );
    });
  });

  describe('Custom Reasoning Integration', () => {
    it('should integrate custom reasoning models in production workflow', async () => {
      elizaLogger.info('🧠 Testing custom reasoning integration...');

      // Enable custom reasoning
      const reasoningService = runtime.getService('together-reasoning') as TogetherReasoningService;
      expect(reasoningService).toBeDefined();

      const roomId = uuidv4() as UUID;
      const userId = uuidv4() as UUID;

      // Test should-respond custom reasoning
      const shouldRespondMessage: Memory = {
        id: uuidv4() as UUID,
        entityId: userId,
        agentId: runtime.agentId,
        roomId,
        content: {
          text: 'Should the agent respond to this production test message?',
          source: 'production-reasoning-test',
        },
        createdAt: Date.now(),
      };

      // Process through custom reasoning pipeline
      await runtime.processMessage(shouldRespondMessage);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify response generation
      const responses = await runtime.messageManager.getMemories({
        roomId,
        count: 10,
      });

      const agentResponse = responses.find(
        (r) => r.entityId === runtime.agentId && r.id !== shouldRespondMessage.id
      );

      expect(agentResponse).toBeDefined();
      elizaLogger.info(`🤖 Agent response: ${agentResponse?.content.text?.substring(0, 100)}...`);

      // Test custom coding reasoning
      const codingMessage: Memory = {
        id: uuidv4() as UUID,
        entityId: userId,
        agentId: runtime.agentId,
        roomId,
        content: {
          text: 'Write a TypeScript function to validate user input for production use',
          source: 'production-coding-test',
        },
        createdAt: Date.now(),
      };

      await runtime.processMessage(codingMessage);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify training data collection from custom reasoning
      const dbManager = new TrainingDatabaseManager();
      await dbManager.initialize(dbPath);

      const collectedData = await dbManager.getTrainingData('should_respond', 50);
      expect(collectedData.length).toBeGreaterThan(0);

      elizaLogger.info(
        `📚 Collected ${collectedData.length} training samples from custom reasoning`
      );
    });
  });

  describe('Performance and Scale Testing', () => {
    it('should handle concurrent training workflows efficiently', async () => {
      elizaLogger.info('⚡ Testing concurrent training workflow performance...');

      const concurrentRooms = 5;
      const messagesPerRoom = 10;

      const startTime = Date.now();

      // Create concurrent room workflows
      const roomPromises = Array.from({ length: concurrentRooms }, async (_, roomIndex) => {
        const roomId = uuidv4() as UUID;
        const userId = uuidv4() as UUID;

        // Process messages in each room concurrently
        const messagePromises = Array.from({ length: messagesPerRoom }, async (_, msgIndex) => {
          const message: Memory = {
            id: uuidv4() as UUID,
            entityId: userId,
            agentId: runtime.agentId,
            roomId,
            content: {
              text: `Concurrent test room ${roomIndex + 1}, message ${msgIndex + 1}: Implement a scalable solution`,
              source: 'concurrent-test',
            },
            createdAt: Date.now() + msgIndex * 100,
          };

          return runtime.processMessage(message);
        });

        return Promise.all(messagePromises);
      });

      // Execute all concurrent workflows
      await Promise.all(roomPromises);

      const totalTime = Date.now() - startTime;
      const totalMessages = concurrentRooms * messagesPerRoom;

      elizaLogger.info(
        `⚡ Processed ${totalMessages} messages across ${concurrentRooms} concurrent rooms in ${totalTime}ms`
      );

      // Verify data collection efficiency
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Allow final processing

      const dbManager = new TrainingDatabaseManager();
      await dbManager.initialize(dbPath);

      const stats = await dbManager.getDatabaseStats();
      expect(stats.totalSamples).toBeGreaterThan(totalMessages * 0.7); // Allow for processing variance

      // Performance validation
      const avgTimePerMessage = totalTime / totalMessages;
      expect(avgTimePerMessage).toBeLessThan(2000); // Should handle concurrent load efficiently

      elizaLogger.info(
        `📊 Concurrent performance: ${avgTimePerMessage.toFixed(2)}ms average per message`
      );
      elizaLogger.info(
        `📈 Final database stats: ${stats.totalSamples} samples, avg confidence: ${stats.avgConfidence?.toFixed(3)}`
      );
    });
  });

  describe('Production Configuration Validation', () => {
    it('should validate all production configuration scenarios', async () => {
      elizaLogger.info('⚙️  Testing production configuration validation...');

      // Test configuration validation
      const requiredSettings = [
        'REASONING_SERVICE_ENABLED',
        'REASONING_SERVICE_COLLECT_TRAINING_DATA',
        'TRAINING_DATABASE_URL',
        'TRAINING_RECORDINGS_DIR',
      ];

      for (const setting of requiredSettings) {
        const value = runtime.getSetting(setting);
        expect(value).toBeDefined();
        elizaLogger.info(
          `✅ ${setting}: ${typeof value === 'string' ? value.substring(0, 50) : value}`
        );
      }

      // Test service availability
      const requiredServices = ['training-service', 'together-reasoning'];

      for (const serviceName of requiredServices) {
        const service = runtime.getService(serviceName);
        expect(service).toBeDefined();
        elizaLogger.info(`✅ Service available: ${serviceName}`);
      }

      // Test database connectivity
      const dbManager = new TrainingDatabaseManager();
      await dbManager.initialize(dbPath);

      const stats = await dbManager.getDatabaseStats();
      expect(stats).toBeDefined();
      elizaLogger.info(`✅ Database connectivity: ${stats.totalSamples} samples`);

      // Test recording manager
      const recordingManager = new TrainingRecordingManager(runtime, recordingsPath);
      await recordingManager.initialize();

      const recordings = await recordingManager.getRecordings();
      expect(Array.isArray(recordings)).toBe(true);
      elizaLogger.info(`✅ Recording manager: ${recordings.length} existing recordings`);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should gracefully handle production error scenarios', async () => {
      elizaLogger.info('🛡️  Testing error recovery and resilience...');

      const roomId = uuidv4() as UUID;
      const userId = uuidv4() as UUID;

      // Test malformed message handling
      const malformedMessage: Memory = {
        id: uuidv4() as UUID,
        entityId: userId,
        agentId: runtime.agentId,
        roomId,
        content: {
          text: '', // Empty text
          source: 'error-test',
        },
        createdAt: Date.now(),
      };

      // Should not crash the system
      await expect(runtime.processMessage(malformedMessage)).resolves.not.toThrow();

      // Test extremely long message handling
      const longMessage: Memory = {
        id: uuidv4() as UUID,
        entityId: userId,
        agentId: runtime.agentId,
        roomId,
        content: {
          text: 'x'.repeat(10000), // Very long message
          source: 'stress-test',
        },
        createdAt: Date.now(),
      };

      await expect(runtime.processMessage(longMessage)).resolves.not.toThrow();

      // Test rapid message burst
      const burstMessages = Array.from({ length: 20 }, (_, i) => ({
        id: uuidv4() as UUID,
        entityId: userId,
        agentId: runtime.agentId,
        roomId,
        content: {
          text: `Burst message ${i}`,
          source: 'burst-test',
        },
        createdAt: Date.now() + i,
      }));

      // Send all at once
      const burstPromises = burstMessages.map((msg) => runtime.processMessage(msg));
      await expect(Promise.all(burstPromises)).resolves.not.toThrow();

      elizaLogger.info('✅ System maintained stability under error conditions');

      // Verify system is still functional after errors
      const normalMessage: Memory = {
        id: uuidv4() as UUID,
        entityId: userId,
        agentId: runtime.agentId,
        roomId,
        content: {
          text: 'System should still work after error scenarios',
          source: 'recovery-test',
        },
        createdAt: Date.now(),
      };

      await runtime.processMessage(normalMessage);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check that normal operation continues
      const dbManager = new TrainingDatabaseManager();
      await dbManager.initialize(dbPath);
      const finalStats = await dbManager.getDatabaseStats();

      expect(finalStats.totalSamples).toBeGreaterThan(0);
      elizaLogger.info(
        `✅ System recovery: ${finalStats.totalSamples} total samples after error testing`
      );
    });
  });
});

elizaLogger.info('✅ Production validation test suite loaded');
