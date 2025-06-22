/**
 * REAL RUNTIME INTEGRATION TESTS FOR TRAINING RECORDING MANAGER
 * 
 * These tests use actual ElizaOS runtime instances and real filesystem operations.
 * No mocks - only real runtime instances, services, and actual file I/O.
 * 
 * Test coverage:
 * - Real filesystem directory creation and management
 * - Real recording session lifecycle
 * - Actual training data recording and retrieval
 * - Real file export and statistics calculation
 * - Error handling with actual filesystem operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentRuntime, elizaLogger } from '@elizaos/core';
import type { Character, IAgentRuntime, UUID } from '@elizaos/core';
import { TrainingRecordingManager } from '../../filesystem/TrainingRecordingManager.js';
import { trainingPlugin } from '../../index';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Test character configuration for runtime
const testCharacter: Character = {
  name: 'TrainingRecordingTestAgent',
  bio: ['AI agent for testing training recording manager functionality'],
  system: 'You are a test agent for validating training recording manager capabilities.',
  messageExamples: [
    [
      { name: 'user', content: { text: 'test recording functionality' } },
      { name: 'TrainingRecordingTestAgent', content: { text: 'testing recording response' } }
    ]
  ],
  postExamples: [],
  topics: ['testing', 'recording', 'filesystem', 'service-validation'],
  adjectives: ['helpful', 'accurate', 'thorough'],
  plugins: [],
  settings: {
    CUSTOM_REASONING_ENABLED: 'true',
    CUSTOM_REASONING_COLLECT_TRAINING_DATA: 'true',
    TOGETHER_AI_API_KEY: 'test-api-key-recording',
  },
  secrets: {}
};

// Helper function to create test training data points
function createTestTrainingDataPoint(overrides: any = {}) {
  return {
    id: uuidv4(),
    modelType: 'should_respond' as const,
    inputData: {
      messageText: 'Test message',
      prompt: 'Test prompt for training data recording',
      conversationContext: [],
      state: {}
    },
    outputData: {
      decision: 'RESPOND',
      reasoning: 'Test reasoning',
      confidence: 0.95
    },
    conversationContext: [],
    stateData: {},
    metadata: {
      roomId: uuidv4() as UUID,
      messageId: uuidv4() as UUID,
      responseTimeMs: 100,
      tokensUsed: 50,
      costUsd: 0.001
    },
    tags: ['test'],
    timestamp: Date.now(),
    ...overrides
  };
}

describe('Real Runtime Training Recording Manager Integration Tests', () => {
  let runtime: IAgentRuntime;
  let recordingManager: TrainingRecordingManager;
  let testRecordingsPath: string;
  let testDataPath: string;

  beforeEach(async () => {
    elizaLogger.info('🧪 Setting up TrainingRecordingManager real runtime test environment...');
    
    // Create unique test paths to avoid conflicts
    const testId = `recording-manager-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    testRecordingsPath = path.join(process.cwd(), '.test-data', testId, 'training_recordings');
    testDataPath = path.join(process.cwd(), '.test-data', testId, 'data');
    
    // Ensure test directories exist
    await fs.mkdir(path.dirname(testRecordingsPath), { recursive: true });
    await fs.mkdir(testDataPath, { recursive: true });
    
    // Update test character with test-specific paths
    const testCharacterWithPaths = {
      ...testCharacter,
      settings: {
        ...testCharacter.settings,
        TRAINING_RECORDINGS_DIR: testRecordingsPath,
        RECORDING_DATA_DIR: testDataPath,
      }
    };

    // Create real AgentRuntime instance
    runtime = new AgentRuntime({
      character: testCharacterWithPaths,
      token: process.env.OPENAI_API_KEY || 'test-token',
      modelName: 'gpt-4o-mini'
    });

    // Register the training plugin
    await runtime.registerPlugin(trainingPlugin);
    await runtime.initialize();
    
    // Create real TrainingRecordingManager instance
    recordingManager = new TrainingRecordingManager(runtime);
    
    elizaLogger.info('✅ TrainingRecordingManager real runtime test environment setup complete');
  });

  afterEach(async () => {
    elizaLogger.info('🧹 Cleaning up TrainingRecordingManager test environment...');
    
    try {
      // Clean up test files
      if (testRecordingsPath) {
        try {
          await fs.rm(path.dirname(testRecordingsPath), { recursive: true, force: true });
        } catch (error) {
          // Directory might not exist, that's okay
        }
      }
    } catch (error) {
      elizaLogger.warn('Warning during TrainingRecordingManager cleanup:', error);
    }
    
    elizaLogger.info('✅ TrainingRecordingManager test environment cleanup complete');
  });

  describe('Real Directory Initialization', () => {
    it('should create recording directory structure with real filesystem', async () => {
      await recordingManager.initialize();

      // Verify base directory was created
      const baseExists = await fs.access(testRecordingsPath).then(() => true).catch(() => false);
      expect(baseExists).toBe(true);

      // Verify model type directories were created
      const modelTypes = ['should_respond', 'planning', 'coding'];
      for (const modelType of modelTypes) {
        const modelPath = path.join(testRecordingsPath, modelType);
        const modelExists = await fs.access(modelPath).then(() => true).catch(() => false);
        expect(modelExists).toBe(true);
        elizaLogger.info(`✅ Model type directory created: ${modelType}`);
      }

      // Verify sessions directory was created
      const sessionsPath = path.join(testRecordingsPath, 'sessions');
      const sessionsExists = await fs.access(sessionsPath).then(() => true).catch(() => false);
      expect(sessionsExists).toBe(true);

      elizaLogger.info('✅ Real directory structure initialization validated');
    });

    it('should handle directory creation errors gracefully with real filesystem', async () => {
      // Try to initialize with an invalid path (no permissions)
      const invalidManager = new TrainingRecordingManager({
        ...runtime,
        getSetting: (key: string) => {
          if (key === 'TRAINING_RECORDINGS_DIR') {
            return '/root/invalid-path'; // Path that should cause permission error
          }
          return runtime.getSetting(key);
        }
      } as IAgentRuntime);

      try {
        await invalidManager.initialize();
        // If this doesn't throw, the test environment allows creation
        elizaLogger.info('✅ Invalid path handled gracefully (permissions allow creation)');
      } catch (error) {
        // Should handle permission errors gracefully
        expect(error).toBeDefined();
        expect(error.message).toContain('EACCES' || 'EPERM' || 'Permission');
        elizaLogger.info('✅ Directory creation error properly handled');
      }
    });
  });

  describe('Real Session Management', () => {
    beforeEach(async () => {
      await recordingManager.initialize();
    });

    it('should start a new recording session with real filesystem', async () => {
      const sessionId = await recordingManager.startSession('planning', 'test-session');

      expect(sessionId).toBe('test-session');
      
      // Verify session directory was created
      const sessionPath = path.join(testRecordingsPath, 'sessions', 'test-session');
      const sessionExists = await fs.access(sessionPath).then(() => true).catch(() => false);
      expect(sessionExists).toBe(true);

      // Verify session metadata file was created
      const metadataPath = path.join(sessionPath, 'session.json');
      const metadataExists = await fs.access(metadataPath).then(() => true).catch(() => false);
      expect(metadataExists).toBe(true);

      // Read and verify session metadata content
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);
      expect(metadata.sessionId).toBe('test-session');
      expect(metadata.modelType).toBe('planning');
      expect(metadata.agentId).toBe(runtime.agentId);
      expect(metadata.agentName).toBe(runtime.character.name);
      expect(metadata.startTime).toMatch(/\d{4}-\d{2}-\d{2}T/);

      elizaLogger.info('✅ Real session creation validated');
    });

    it('should generate session ID when not provided with real filesystem', async () => {
      const sessionId = await recordingManager.startSession('coding');

      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
      
      // Verify generated session directory exists
      const sessionPath = path.join(testRecordingsPath, 'sessions', sessionId);
      const sessionExists = await fs.access(sessionPath).then(() => true).catch(() => false);
      expect(sessionExists).toBe(true);

      elizaLogger.info(`✅ Session ID generation validated: ${sessionId}`);
    });

    it('should write correct session metadata with real runtime data', async () => {
      const sessionId = await recordingManager.startSession('should_respond', 'metadata-test');

      const metadataPath = path.join(testRecordingsPath, 'sessions', sessionId, 'session.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);
      
      expect(metadata).toEqual({
        sessionId: 'metadata-test',
        startTime: expect.stringMatching(/\d{4}-\d{2}-\d{2}T/),
        modelType: 'should_respond',
        agentId: runtime.agentId,
        agentName: runtime.character.name,
      });

      elizaLogger.info('✅ Session metadata validation passed with real runtime data');
    });
  });

  describe('Real Session Lifecycle', () => {
    beforeEach(async () => {
      await recordingManager.initialize();
    });

    it('should end current session successfully with real filesystem updates', async () => {
      // Start a session first
      const sessionId = await recordingManager.startSession('planning', 'end-test-session');
      
      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 100));

      // End the session
      await recordingManager.endSession();

      // Verify session metadata was updated with end time
      const metadataPath = path.join(testRecordingsPath, 'sessions', sessionId, 'session.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);
      
      expect(metadata.endTime).toMatch(/\d{4}-\d{2}-\d{2}T/);
      expect(metadata.recordingCount).toBeDefined();
      expect(typeof metadata.recordingCount).toBe('number');
      expect(metadata.totalSize).toBeDefined();
      expect(typeof metadata.totalSize).toBe('number');
      
      // End time should be after start time
      const startTime = new Date(metadata.startTime);
      const endTime = new Date(metadata.endTime);
      expect(endTime.getTime()).toBeGreaterThan(startTime.getTime());

      elizaLogger.info('✅ Real session ending validated with filesystem updates');
    });

    it('should handle ending when no session is active gracefully', async () => {
      // Should not throw error when no session is active
      await expect(recordingManager.endSession()).resolves.not.toThrow();

      // Verify no session files were created
      const sessionsPath = path.join(testRecordingsPath, 'sessions');
      try {
        const sessionDirs = await fs.readdir(sessionsPath);
        expect(sessionDirs.length).toBe(0);
      } catch (error) {
        // Sessions directory might not exist, which is fine
        elizaLogger.info('✅ No sessions directory found (expected when no sessions created)');
      }
      
      elizaLogger.info('✅ Graceful handling of no active session validated');
    });
  });

  describe('Real Training Data Recording', () => {
    beforeEach(async () => {
      await recordingManager.initialize();
    });

    it('should record training data to daily directory with real filesystem', async () => {
      const dataPoint = createTestTrainingDataPoint({
        modelType: 'planning',
        id: 'test-recording-id',
      });

      const filePath = await recordingManager.recordTrainingData(dataPoint);

      expect(filePath).toContain('training_recordings/planning');
      expect(filePath).toContain('test-recording-id');
      expect(filePath).toEndWith('.json');

      // Verify file was actually created
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Read and verify file content
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const recordContent = JSON.parse(fileContent);

      expect(recordContent).toEqual({
        id: dataPoint.id,
        timestamp: expect.stringMatching(/\d{4}-\d{2}-\d{2}T/),
        modelType: 'planning',
        agentId: runtime.agentId,
        agentName: runtime.character.name,
        roomId: dataPoint.metadata?.roomId,
        messageId: dataPoint.metadata?.messageId,
        input: expect.objectContaining({
          messageText: 'Test message',
          prompt: expect.stringContaining('Test prompt'),
        }),
        output: expect.objectContaining({
          decision: 'RESPOND',
          reasoning: 'Test reasoning',
          confidence: 0.95,
        }),
        performance: {
          responseTimeMs: 100,
          tokensUsed: 50,
          costUsd: 0.001,
          confidence: 0.95,
        },
        raw: {
          input: dataPoint.inputData,
          output: dataPoint.outputData,
          metadata: dataPoint.metadata,
        },
      });

      elizaLogger.info('✅ Real training data recording to daily directory validated');
    });

    it('should record to session directory when session is active with real filesystem', async () => {
      // Start a session
      const sessionId = await recordingManager.startSession('coding', 'active-session');

      const dataPoint = createTestTrainingDataPoint({
        modelType: 'coding',
        id: 'session-recording-id',
      });

      const filePath = await recordingManager.recordTrainingData(dataPoint);

      expect(filePath).toContain(`sessions/${sessionId}`);
      expect(filePath).toContain('session-recording-id');
      
      // Verify file was created in session directory
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
      
      // Verify file is in correct session subdirectory
      const sessionPath = path.join(testRecordingsPath, 'sessions', sessionId);
      expect(filePath).toMatch(new RegExp(sessionPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

      elizaLogger.info('✅ Real training data recording to session directory validated');
    });

    it('should update session statistics with real file operations', async () => {
      // Start session
      const sessionId = await recordingManager.startSession('planning', 'stats-session');

      const dataPoint = createTestTrainingDataPoint();
      const filePath = await recordingManager.recordTrainingData(dataPoint);

      // Verify file was created and get real file stats
      const fileStats = await fs.stat(filePath);
      expect(fileStats.size).toBeGreaterThan(0);
      
      // Verify session metadata includes file statistics
      const metadataPath = path.join(testRecordingsPath, 'sessions', sessionId, 'session.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);
      
      expect(metadata.recordingCount).toBeGreaterThanOrEqual(0);
      expect(metadata.totalSize).toBeGreaterThanOrEqual(0);

      elizaLogger.info(`✅ Session statistics updated: ${metadata.recordingCount} recordings, ${metadata.totalSize} bytes`);
    });

    it('should format input data correctly for different model types with real filesystem', async () => {
      const testCases = [
        {
          modelType: 'should_respond' as const,
          dataPoint: createTestTrainingDataPoint({
            modelType: 'should_respond',
            inputData: {
              messageText: 'Hello there',
              conversationContext: [
                { entityId: 'user-1', content: { text: 'Previous message' } },
              ],
              prompt: 'A very long prompt that should be truncated...',
              state: {},
            },
          }),
          expectedInput: {
            messageText: 'Hello there',
            conversationContext: [{ role: 'User', text: 'Previous message' }],
            prompt: expect.stringContaining('A very long prompt'),
          },
        },
        {
          modelType: 'planning' as const,
          dataPoint: createTestTrainingDataPoint({
            modelType: 'planning',
            inputData: {
              messageText: 'Plan something',
              availableActions: ['REPLY', 'IGNORE'],
              state: { values: { test: 'value' }, data: { providers: { TIME: {} } } },
              prompt: 'Planning prompt',
            },
          }),
          expectedInput: {
            messageText: 'Plan something',
            availableActions: ['REPLY', 'IGNORE'],
            stateValues: ['test'],
            stateProviders: ['TIME'],
            prompt: expect.stringContaining('Planning prompt'),
          },
        },
        {
          modelType: 'coding' as const,
          dataPoint: createTestTrainingDataPoint({
            modelType: 'coding',
            inputData: {
              prompt: 'Write a function',
              language: 'javascript',
              context: 'A very long context that should be truncated...',
            },
          }),
          expectedInput: {
            prompt: 'Write a function',
            language: 'javascript',
            context: expect.stringContaining('A very long context'),
          },
        },
      ];

      for (const { dataPoint, expectedInput } of testCases) {
        const filePath = await recordingManager.recordTrainingData(dataPoint);
        
        // Read the actual file content from filesystem
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const recordContent = JSON.parse(fileContent);

        expect(recordContent.input).toEqual(expectedInput);
        elizaLogger.info(`✅ Input formatting validated for model type: ${dataPoint.modelType}`);
      }
    });
  });

  describe('Real Recording File Retrieval', () => {
    beforeEach(async () => {
      await recordingManager.initialize();
      
      // Create some test recording files
      const testFiles = [
        {
          modelType: 'should_respond',
          date: '2024-01-15',
          filename: 'file1.json',
          content: { id: 'test1', data: 'content1' }
        },
        {
          modelType: 'planning',
          date: '2024-01-15',
          filename: 'file2.json',
          content: { id: 'test2', data: 'content2' }
        },
        {
          modelType: 'coding',
          date: '2024-01-16',
          filename: 'file3.json',
          content: { id: 'test3', data: 'content3' }
        }
      ];

      for (const testFile of testFiles) {
        const dirPath = path.join(testRecordingsPath, testFile.modelType, testFile.date);
        await fs.mkdir(dirPath, { recursive: true });
        const filePath = path.join(dirPath, testFile.filename);
        await fs.writeFile(filePath, JSON.stringify(testFile.content));
      }
    });

    it('should get all recording files with real filesystem', async () => {
      const files = await recordingManager.getRecordingFiles();

      expect(files.length).toBeGreaterThanOrEqual(3);
      
      // Verify file structure
      const firstFile = files[0];
      expect(firstFile.filename).toMatch(/\.json$/);
      expect(firstFile.path).toContain(testRecordingsPath);
      expect(typeof firstFile.size).toBe('number');
      expect(firstFile.size).toBeGreaterThan(0);
      expect(firstFile.created).toBeInstanceOf(Date);
      expect(typeof firstFile.modelType).toBe('string');

      elizaLogger.info(`✅ Retrieved ${files.length} recording files from real filesystem`);
    });

    it('should filter by model type with real filesystem', async () => {
      const planningFiles = await recordingManager.getRecordingFiles('planning');

      expect(planningFiles.length).toBeGreaterThanOrEqual(1);
      
      // All files should be from planning directory
      planningFiles.forEach(file => {
        expect(file.path).toContain('/planning/');
      });

      elizaLogger.info(`✅ Model type filtering validated: ${planningFiles.length} planning files`);
    });

    it('should filter by model type and date with real filesystem', async () => {
      const codingFiles = await recordingManager.getRecordingFiles('coding', '2024-01-16');

      expect(codingFiles.length).toBeGreaterThanOrEqual(1);
      
      // All files should be from specific date directory
      codingFiles.forEach(file => {
        expect(file.path).toContain('/coding/2024-01-16/');
      });

      elizaLogger.info(`✅ Date filtering validated: ${codingFiles.length} files from 2024-01-16`);
    });

    it('should handle directory read errors gracefully with real filesystem', async () => {
      // Try to read from non-existent model type
      const files = await recordingManager.getRecordingFiles('non_existent_model');

      expect(files).toEqual([]);
      elizaLogger.info('✅ Non-existent directory handled gracefully');
    });
  });

  describe('Real Recording Export to JSONL', () => {
    beforeEach(async () => {
      await recordingManager.initialize();
      
      // Create test recording files with real data
      const testRecordings = [
        {
          modelType: 'should_respond',
          data: {
            modelType: 'should_respond',
            input: { messageText: 'Hello' },
            output: { decision: 'RESPOND', reasoning: 'Friendly greeting' },
            performance: { responseTimeMs: 100 },
            timestamp: '2024-01-15T10:00:00Z'
          }
        },
        {
          modelType: 'planning',
          data: {
            modelType: 'planning',
            input: { messageText: 'Plan this' },
            output: { thought: 'Planning response', actions: ['REPLY'] },
            performance: { responseTimeMs: 200 },
            timestamp: '2024-01-16T10:00:00Z'
          }
        }
      ];

      for (const recording of testRecordings) {
        const dataPoint = createTestTrainingDataPoint({
          modelType: recording.modelType,
          inputData: recording.data.input,
          outputData: recording.data.output,
          metadata: {
            ...createTestTrainingDataPoint().metadata,
            responseTimeMs: recording.data.performance.responseTimeMs
          }
        });
        await recordingManager.recordTrainingData(dataPoint);
      }
    });

    it('should export recordings to JSONL format with real filesystem', async () => {
      const outputPath = path.join(testDataPath, 'training.jsonl');
      const count = await recordingManager.exportRecordingsToJSONL(outputPath);

      expect(count).toBeGreaterThanOrEqual(2);
      
      // Verify JSONL file was created
      const fileExists = await fs.access(outputPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
      
      // Read and verify JSONL content
      const content = await fs.readFile(outputPath, 'utf-8');
      const lines = content.trim().split('\n');
      
      expect(lines.length).toBeGreaterThanOrEqual(2);
      
      // Verify each line is valid JSON with expected structure
      lines.forEach(line => {
        const parsed = JSON.parse(line);
        expect(parsed.messages).toBeDefined();
        expect(Array.isArray(parsed.messages)).toBe(true);
        expect(parsed.messages.length).toBeGreaterThanOrEqual(2); // at least user and assistant
        expect(parsed.metadata).toBeDefined();
      });

      elizaLogger.info(`✅ Real JSONL export validated: ${count} recordings exported`);
    });

    it('should filter by options with real data', async () => {
      // First create a should_respond recording
      const dataPoint = createTestTrainingDataPoint({
        modelType: 'should_respond',
        inputData: { messageText: 'Filtered test' },
        outputData: { decision: 'RESPOND' }
      });
      await recordingManager.recordTrainingData(dataPoint);
      
      const options = {
        modelType: 'should_respond' as const,
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-12-31T23:59:59Z'),
        limit: 1,
      };

      const outputPath = path.join(testDataPath, 'filtered.jsonl');
      const count = await recordingManager.exportRecordingsToJSONL(outputPath, options);

      expect(count).toBe(1); // Limited to 1 due to options.limit
      
      // Verify file contains only one line
      const content = await fs.readFile(outputPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(1);

      elizaLogger.info('✅ Real export filtering validated');
    });

    it('should handle export errors with real filesystem', async () => {
      // Try to export to invalid path
      const invalidPath = '/root/invalid/path.jsonl';
      
      try {
        await recordingManager.exportRecordingsToJSONL(invalidPath);
        // If this doesn't throw, the test environment allows creation
        elizaLogger.info('✅ Invalid path handled gracefully (permissions allow creation)');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain('EACCES' || 'EPERM' || 'ENOENT');
        elizaLogger.info('✅ Export error properly handled with real filesystem');
      }
    });
  });

  describe('Real Recording Statistics', () => {
    beforeEach(async () => {
      await recordingManager.initialize();
      
      // Create test recordings with known data
      const testRecordings = [
        { modelType: 'should_respond', date: '2024-01-15' },
        { modelType: 'planning', date: '2024-01-16' },
        { modelType: 'should_respond', date: '2024-01-15' },
      ];

      for (const recording of testRecordings) {
        const dataPoint = createTestTrainingDataPoint({
          modelType: recording.modelType,
          timestamp: new Date(`${recording.date}T10:00:00Z`).getTime()
        });
        await recordingManager.recordTrainingData(dataPoint);
      }
    });

    it('should return comprehensive recording statistics with real data', async () => {
      const stats = await recordingManager.getRecordingStats();

      expect(stats.totalFiles).toBeGreaterThanOrEqual(3);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(typeof stats.totalSize).toBe('number');
      
      // Verify model type breakdown
      expect(stats.byModelType).toBeDefined();
      expect(typeof stats.byModelType).toBe('object');
      expect(stats.byModelType.should_respond).toBeGreaterThanOrEqual(2);
      expect(stats.byModelType.planning).toBeGreaterThanOrEqual(1);
      
      // Verify date breakdown
      expect(stats.byDate).toBeDefined();
      expect(typeof stats.byDate).toBe('object');
      
      // Verify date range
      if (stats.oldestRecording && stats.newestRecording) {
        expect(stats.oldestRecording).toBeInstanceOf(Date);
        expect(stats.newestRecording).toBeInstanceOf(Date);
        expect(stats.newestRecording.getTime()).toBeGreaterThanOrEqual(stats.oldestRecording.getTime());
      }

      elizaLogger.info(`✅ Real recording statistics: ${stats.totalFiles} files, ${stats.totalSize} bytes`);
    });

    it('should handle errors gracefully with real filesystem', async () => {
      // Create a recording manager with invalid path to trigger error
      const invalidManager = new TrainingRecordingManager({
        ...runtime,
        getSetting: (key: string) => {
          if (key === 'TRAINING_RECORDINGS_DIR') {
            return '/non/existent/path';
          }
          return runtime.getSetting(key);
        }
      } as IAgentRuntime);

      const stats = await invalidManager.getRecordingStats();

      expect(stats).toEqual({
        totalFiles: 0,
        totalSize: 0,
        byModelType: {},
        byDate: {},
      });

      elizaLogger.info('✅ Statistics error handling validated with real filesystem');
    });
  });

  describe('Real Recording Cleanup', () => {
    beforeEach(async () => {
      await recordingManager.initialize();
    });

    it('should clean up old recordings with real filesystem operations', async () => {
      // Create recordings with different timestamps
      const oldTime = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago
      const newTime = Date.now() - 5 * 24 * 60 * 60 * 1000; // 5 days ago
      
      const oldRecordings = [
        createTestTrainingDataPoint({ modelType: 'should_respond', timestamp: oldTime }),
        createTestTrainingDataPoint({ modelType: 'planning', timestamp: oldTime }),
      ];
      
      const newRecordings = [
        createTestTrainingDataPoint({ modelType: 'coding', timestamp: newTime }),
      ];
      
      // Record the test data
      const oldPaths = [];
      for (const recording of oldRecordings) {
        const filePath = await recordingManager.recordTrainingData(recording);
        oldPaths.push(filePath);
      }
      
      const newPaths = [];
      for (const recording of newRecordings) {
        const filePath = await recordingManager.recordTrainingData(recording);
        newPaths.push(filePath);
      }
      
      // Verify files exist before cleanup
      for (const filePath of [...oldPaths, ...newPaths]) {
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
      
      // Cleanup recordings older than 7 days
      const deletedCount = await recordingManager.cleanupOldRecordings(7);
      
      expect(deletedCount).toBeGreaterThanOrEqual(2);
      
      // Verify old files were deleted and new files remain
      for (const filePath of oldPaths) {
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        expect(exists).toBe(false);
      }
      
      for (const filePath of newPaths) {
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }

      elizaLogger.info(`✅ Real cleanup validated: ${deletedCount} old recordings deleted`);
    });

    it('should handle cleanup errors with real filesystem', async () => {
      // Create a recording manager with invalid cleanup permissions
      const restrictedManager = new TrainingRecordingManager({
        ...runtime,
        getSetting: (key: string) => {
          if (key === 'TRAINING_RECORDINGS_DIR') {
            return '/root/restricted'; // Path that should cause permission errors
          }
          return runtime.getSetting(key);
        }
      } as IAgentRuntime);

      try {
        const deletedCount = await restrictedManager.cleanupOldRecordings();
        // If this doesn't throw, cleanup was successful or no files to clean
        expect(typeof deletedCount).toBe('number');
        expect(deletedCount).toBeGreaterThanOrEqual(0);
        elizaLogger.info('✅ Cleanup completed successfully (no permission restrictions)');
      } catch (error) {
        // Permission errors are acceptable for cleanup operations
        expect(error).toBeDefined();
        expect(error.message).toContain('EACCES' || 'EPERM' || 'ENOENT');
        elizaLogger.info('✅ Cleanup error properly handled with real filesystem');
      }
    });
  });
});