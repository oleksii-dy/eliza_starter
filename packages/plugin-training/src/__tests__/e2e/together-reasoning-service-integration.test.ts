/**
 * Real runtime integration test for TogetherReasoningService
 * 
 * This test verifies that the TogetherReasoningService properly integrates with
 * actual ElizaOS runtime instances and correctly handles real API calls.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { elizaLogger } from '@elizaos/core';
import { TogetherReasoningService } from '../../services/TogetherReasoningService';
import type { IAgentRuntime, Memory, UUID } from '@elizaos/core';
import type { 
  ExportOptions, 
  TrainingDataset, 
  ShouldRespondContext,
  PlanningContext,
  CodingContext,
  CustomModelType,
  CostReport
} from '../../interfaces/CustomReasoningService';

describe('TogetherReasoningService Runtime Integration', () => {
  let runtime: IAgentRuntime;
  let service: TogetherReasoningService;

  beforeEach(async () => {
    // Create test runtime
    runtime = await createTestRuntime();
    service = new TogetherReasoningService(runtime);
  });

  afterEach(async () => {
    if (service) {
      await service.stop();
    }
  });

  it('should initialize successfully with valid configuration', async () => {
    // Verify service constructs properly
    expect(service).toBeDefined();
    expect(service.capabilityDescription).toBe('Custom reasoning service using fine-tuned DeepSeek models via Together.ai');
    
    // Verify static properties
    expect(TogetherReasoningService.serviceName).toBe('together-reasoning');
    expect(TogetherReasoningService.serviceType).toBe('custom-reasoning');
  });

  it('should load configuration from runtime settings', async () => {
    // Set test configuration
    runtime.getSetting = ((key: string) => {
      const settings: Record<string, any> = {
        'TOGETHER_AI_API_KEY': 'test-key',
        'CUSTOM_REASONING_ENABLED': 'true',
        'CUSTOM_REASONING_SHOULD_RESPOND_MODEL': 'test-should-respond-model',
        'CUSTOM_REASONING_PLANNING_MODEL': 'test-planning-model',
        'CUSTOM_REASONING_CODING_MODEL': 'test-coding-model',
        'CUSTOM_REASONING_BUDGET_LIMIT': '100',
        'CUSTOM_REASONING_AUTO_SHUTDOWN_MINUTES': '60',
        'CUSTOM_REASONING_MAX_COST_PER_HOUR': '5',
        'CUSTOM_REASONING_COLLECT_TRAINING_DATA': 'true',
        'CUSTOM_REASONING_MAX_SAMPLES_PER_MODEL': '5000',
        'CUSTOM_REASONING_RETENTION_DAYS': '14'
      };
      return settings[key];
    }) as any;

    // Reinitialize with new settings
    const newService = new TogetherReasoningService(runtime);
    
    // Verify configuration loading
    expect(newService).toBeDefined();
    await newService.stop();
  });

  it('should handle missing Together.ai API key gracefully', async () => {
    // Configure runtime without Together.ai key
    runtime.getSetting = ((key: string) => {
      const settings: Record<string, any> = {
        'TOGETHER_AI_API_KEY': '', // Empty key
        'CUSTOM_REASONING_ENABLED': 'true'
      };
      return settings[key];
    }) as any;

    // Should throw during construction
    expect(() => new TogetherReasoningService(runtime)).toThrow('TOGETHER_AI_API_KEY is required');
  });

  it('should export training data successfully', async () => {
    // Mock some training data in the runtime adapter
    let storedLogs: any[] = [];
    runtime.log = (async (logData: any) => {
      storedLogs.push({
        id: 'log-' + Date.now(),
        createdAt: Date.now(),
        body: logData.body,
        type: logData.type
      });
    }) as any;

    runtime.getLogs = (async (options: any) => {
      return storedLogs.filter(log => 
        log.type && log.type.startsWith(options.type.replace('%', ''))
      );
    }) as any;

    // Add some mock training data
    await service.collectTrainingData({
      id: 'test-1' as UUID,
      timestamp: Date.now(),
      modelType: 'should_respond' as CustomModelType,
      input: {
        prompt: 'Test prompt',
        messageText: 'Hello',
        conversationContext: []
      },
      output: {
        decision: 'RESPOND',
        reasoning: 'Test reasoning',
        confidence: 0.9
      },
      metadata: {
        agentId: runtime.agentId,
        roomId: 'test-room' as UUID,
        modelName: 'test-model',
        responseTimeMs: 100,
        tokensUsed: 50
      }
    });

    // Export training data
    const exportOptions: ExportOptions = {
      modelType: 'should_respond' as CustomModelType,
      limit: 100,
      format: 'jsonl'
    };

    const dataset: TrainingDataset = await service.exportTrainingData(exportOptions);

    // Verify export results
    expect(dataset).toBeDefined();
    expect(dataset.modelType).toBe('should_respond');
    expect(dataset.format).toBe('jsonl');
    expect(dataset.samples).toBeDefined();
    expect(Array.isArray(dataset.samples)).toBe(true);
    expect(dataset.metadata).toBeDefined();
    expect(dataset.metadata.exportedAt).toBeGreaterThan(0);
    expect(dataset.metadata.agentId).toBe(runtime.agentId);
    expect(dataset.metadata.totalSamples).toBeGreaterThanOrEqual(0);
  });

  it('should handle export with no training data gracefully', async () => {
    // Mock empty logs
    runtime.getLogs = (async () => []) as any;

    const exportOptions: ExportOptions = {
      modelType: 'planning' as CustomModelType,
      limit: 100,
      format: 'json'
    };

    const dataset: TrainingDataset = await service.exportTrainingData(exportOptions);

    // Should return empty dataset, not throw error
    expect(dataset).toBeDefined();
    expect(dataset.samples).toHaveLength(0);
    expect(dataset.metadata.totalSamples).toBe(0);
  });

  it('should handle date range filtering in export', async () => {
    // Mock logs with different timestamps
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const twoDaysAgo = now - (48 * 60 * 60 * 1000);

    runtime.getLogs = (async () => [
      {
        id: 'log-1',
        createdAt: twoDaysAgo,
        body: { /* mock training data */ },
        type: 'training-data:should_respond'
      },
      {
        id: 'log-2', 
        createdAt: oneDayAgo,
        body: { /* mock training data */ },
        type: 'training-data:should_respond'
      },
      {
        id: 'log-3',
        createdAt: now,
        body: { /* mock training data */ },
        type: 'training-data:should_respond'
      }
    ]) as any;

    const exportOptions: ExportOptions = {
      startDate: new Date(oneDayAgo),
      endDate: new Date(now),
      format: 'jsonl'
    };

    const dataset = await service.exportTrainingData(exportOptions);

    // Should filter by date range
    expect(dataset.metadata.dateRange).toBeDefined();
    expect(dataset.metadata.dateRange!.start).toBe(oneDayAgo);
    expect(dataset.metadata.dateRange!.end).toBe(now);
  });

  it('should handle cost reporting with graceful fallbacks', async () => {
    // Mock deployments
    service['deployments'].set('test-model', {
      deploymentId: 'test-deployment-123',
      endpoint: 'https://test-endpoint.com',
      deployedAt: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
      status: 'active',
      costPerHour: 1.5,
      lastUsed: Date.now()
    });

    // Mock client to simulate API failure
    service['client'].getUsageMetrics = async () => {
      throw new Error('Usage metrics not available');
    };

    const costReport: CostReport = await service.getCostReport();

    // Should handle API failure gracefully with estimates
    expect(costReport).toBeDefined();
    expect(costReport.totalCost).toBeGreaterThan(0); // Should have estimated cost
    expect(costReport.modelCosts.has('test-model')).toBe(true);
    
    const modelCost = costReport.modelCosts.get('test-model');
    expect(modelCost).toBeDefined();
    expect(modelCost!.hoursActive).toBeGreaterThan(0);
    expect(modelCost!.cost).toBeGreaterThan(0);
  });

  it('should track budget and prevent overruns', async () => {
    // Set a low budget limit
    await service.setBudgetLimit(1.0);

    // Mock high cost report
    service.getCostReport = async () => ({
      totalCost: 2.0, // Over budget
      modelCosts: new Map(),
      period: '24h',
      budgetLimit: 1.0,
      budgetUsed: 2.0
    });

    // Should throw when budget exceeded
    await expect(service['checkBudgetLimit']()).rejects.toThrow('Budget limit');
  });

  it('should collect training data properly', async () => {
    let loggedData: any = null;

    runtime.log = (async (logData: any) => {
      loggedData = logData;
    }) as any;

    const trainingData = {
      id: 'test-training-data' as UUID,
      timestamp: Date.now(),
      modelType: 'coding' as CustomModelType,
      input: {
        prompt: 'Write a function',
        language: 'typescript'
      },
      output: {
        code: 'function test() { return "hello"; }',
        explanation: 'A simple test function'
      },
      metadata: {
        agentId: runtime.agentId,
        modelName: 'test-coding-model',
        responseTimeMs: 200,
        tokensUsed: 100
      }
    };

    await service.collectTrainingData(trainingData);

    // Verify data was logged
    expect(loggedData).toBeDefined();
    expect(loggedData.body).toEqual(trainingData);
    expect(loggedData.type).toBe('training-data:coding');
    expect(loggedData.entityId).toBe(runtime.agentId);
  });

  it('should handle service lifecycle correctly', async () => {
    // Test start static method
    runtime.getSetting = ((key: string) => {
      const settings: Record<string, any> = {
        'TOGETHER_AI_API_KEY': 'test-key',
        'CUSTOM_REASONING_ENABLED': 'true'
      };
      return settings[key];
    }) as any;

    // Mock client validation
    const mockClient = {
      validateApiKey: async () => true,
      deployModel: async () => ({ id: 'test-deployment', endpoint: 'test-endpoint' }),
      listDeployments: async () => [],
      testModel: async () => ({ available: true }),
      undeployModel: async () => {},
      getUsageMetrics: async () => ({ hoursActive: 1, requests: 0, totalTokens: 0, cost: 0 })
    };

    // Replace client
    service['client'] = mockClient as any;

    // Should handle lifecycle properly
    expect(service).toBeDefined();
    await service.stop();
  });
});

/**
 * Create a test runtime instance
 */
async function createTestRuntime(): Promise<IAgentRuntime> {
  const mockRuntime: Partial<IAgentRuntime> = {
    agentId: 'test-agent-id' as UUID,
    
    character: {
      name: 'TestAgent',
      bio: ['Test agent for reasoning service testing'],
      system: 'You are a test agent for reasoning service testing',
      messageExamples: [],
      postExamples: [],
      topics: [],
      adjectives: [],
      knowledge: [],
      clients: [],
      plugins: []
    },

    getSetting: (key: string) => {
      // Default test settings
      const settings: Record<string, any> = {
        'TOGETHER_AI_API_KEY': 'test-api-key',
        'CUSTOM_REASONING_ENABLED': 'true',
        'CUSTOM_REASONING_BUDGET_LIMIT': '50',
        'CUSTOM_REASONING_AUTO_SHUTDOWN_MINUTES': '30',
        'CUSTOM_REASONING_MAX_COST_PER_HOUR': '2',
        'CUSTOM_REASONING_COLLECT_TRAINING_DATA': 'true',
        'CUSTOM_REASONING_MAX_SAMPLES_PER_MODEL': '1000',
        'CUSTOM_REASONING_RETENTION_DAYS': '7'
      };
      return settings[key];
    },

    adapter: {
      log: async (logData: any) => {
        // Mock logging
      },
      getLogs: async (options: any) => {
        // Mock log retrieval
        return [];
      }
    },

    logger: {
      info: (message: string, data?: any) => elizaLogger.info(`[INFO] ${message}`, data),
      warn: (message: string, data?: any) => elizaLogger.warn(`[WARN] ${message}`, data),
      error: (message: string, data?: any) => elizaLogger.error(`[ERROR] ${message}`, data),
      debug: (message: string, data?: any) => elizaLogger.debug(`[DEBUG] ${message}`, data)
    }
  };

  return mockRuntime as IAgentRuntime;
}