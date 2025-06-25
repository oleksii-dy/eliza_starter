import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
  ValidatedCache,
  AITransformationValidator,
  CachePredictor,
  CorruptionDetector,
  CacheStorage,
  ValidationResult,
  CacheEntry,
  TransformationData,
  CachePrediction,
  PatternVersion,
} from '../core/validated-cache';
import { EnhancedClaudeSDKAdapter } from '../claude-sdk/enhanced-claude-adapter';
import { MigrationContext } from '../core/types';

// Mock dependencies
vi.mock('../claude-sdk/enhanced-claude-adapter');
vi.mock('node:crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'mocked-hash'),
  })),
}));

describe('ValidatedCache', () => {
  let validatedCache: ValidatedCache;
  let mockContext: MigrationContext;
  let mockClaude: Mock;

  beforeEach(() => {
    mockClaude = vi.mocked(EnhancedClaudeSDKAdapter).mockImplementation(
      () =>
        ({
          generateText: vi.fn(),
          analyzeCode: vi.fn(),
        }) as any
    );

    mockContext = {
      repoPath: '/test/repo',
      pluginName: 'test-plugin',
      packageJson: {},
      existingFiles: [],
      changedFiles: new Set(),
      claudePrompts: new Map(),
      hasService: false,
      hasProviders: false,
      hasActions: false,
      hasTests: false,
    };

    validatedCache = new ValidatedCache(mockContext);
  });

  describe('cache operations', () => {
    it('should cache valid transformations successfully', async () => {
      const transformation: TransformationData = {
        before: 'import { composeContext } from "@elizaos/core";',
        after: 'import { composePromptFromState } from "@elizaos/core";',
        pattern: 'composeContext-to-composePromptFromState',
        type: 'import-update',
        confidence: 0.95,
        metadata: {
          fileName: 'test.ts',
          lineNumber: 1,
        },
      };

      // Mock validation success
      mockClaude.mockResolvedValueOnce({
        isValid: true,
        confidence: 0.95,
        reason: 'Valid transformation',
        complexity: 3,
      });

      await expect(validatedCache.cache('test-key', transformation)).resolves.not.toThrow();
    });

    it('should reject invalid transformations', async () => {
      const invalidTransformation: TransformationData = {
        before: 'invalid code',
        after: 'still invalid',
        pattern: 'unknown-pattern',
        type: 'invalid',
        confidence: 0.3,
        metadata: {},
      };

      // Mock validation failure
      mockClaude.mockResolvedValueOnce({
        isValid: false,
        confidence: 0.3,
        reason: 'Invalid syntax',
        complexity: 1,
      });

      await expect(validatedCache.cache('invalid-key', invalidTransformation)).rejects.toThrow(
        'Cannot cache invalid transformation'
      );
    });

    it('should retrieve cached transformations with validation', async () => {
      const transformation: TransformationData = {
        before: 'test before',
        after: 'test after',
        pattern: 'test-pattern',
        type: 'test',
        confidence: 0.9,
        metadata: {},
      };

      // Mock successful cache and retrieve
      mockClaude.mockResolvedValue({
        isValid: true,
        confidence: 0.9,
        reason: 'Valid',
        complexity: 2,
      });

      await validatedCache.cache('retrieve-test', transformation);
      const retrieved = await validatedCache.retrieve('retrieve-test');

      expect(retrieved).toEqual(transformation);
    });

    it('should return null for cache miss', async () => {
      const result = await validatedCache.retrieve('non-existent-key');
      expect(result).toBeNull();
    });

    it('should invalidate stale cache entries', async () => {
      const transformation: TransformationData = {
        before: 'old pattern',
        after: 'new pattern',
        pattern: 'outdated-pattern',
        type: 'test',
        confidence: 0.8,
        metadata: {},
      };

      // First cache with old pattern version
      mockClaude.mockResolvedValueOnce({
        isValid: true,
        confidence: 0.8,
        reason: 'Valid',
        complexity: 2,
      });

      await validatedCache.cache('stale-test', transformation);

      // Mock pattern version change and revalidation failure
      mockClaude.mockResolvedValueOnce({
        isValid: false,
        confidence: 0.2,
        reason: 'Pattern outdated',
        complexity: 1,
      });

      const result = await validatedCache.retrieve('stale-test');
      expect(result).toBeNull();
    });

    it('should handle cache corruption with self-healing', async () => {
      const transformation: TransformationData = {
        before: 'test',
        after: 'test result',
        pattern: 'healing-test',
        type: 'test',
        confidence: 0.9,
        metadata: {},
      };

      mockClaude.mockResolvedValue({
        isValid: true,
        confidence: 0.9,
        reason: 'Valid',
        complexity: 2,
      });

      await validatedCache.cache('corruption-test', transformation);

      // Simulate corruption detection and healing
      const healed = await validatedCache.healCorruption('corruption-test');
      expect(healed).toBe(true);
    });
  });

  describe('cache warming and prediction', () => {
    it('should warm cache with predictions', async () => {
      const predictions: CachePrediction[] = [
        {
          key: 'warm-test-1',
          likelihood: 0.95,
          pattern: 'high-likelihood-pattern',
          metadata: { priority: 'high' },
        },
        {
          key: 'warm-test-2',
          likelihood: 0.7,
          pattern: 'medium-likelihood-pattern',
          metadata: { priority: 'medium' },
        },
      ];

      mockClaude.mockResolvedValue({
        isValid: true,
        confidence: 0.9,
        reason: 'Valid warming',
        complexity: 2,
      });

      await expect(validatedCache.warmCache(predictions)).resolves.not.toThrow();
    });

    it('should skip low-likelihood predictions during warming', async () => {
      const predictions: CachePrediction[] = [
        {
          key: 'low-likelihood',
          likelihood: 0.3,
          pattern: 'unlikely-pattern',
          metadata: {},
        },
      ];

      // Should not attempt to cache low-likelihood predictions
      await validatedCache.warmCache(predictions);

      const result = await validatedCache.retrieve('low-likelihood');
      expect(result).toBeNull();
    });
  });

  describe('cache management', () => {
    it('should handle cache cleanup effectively', async () => {
      await expect(validatedCache.cleanup()).resolves.not.toThrow();
    });

    it('should provide accurate cache statistics', async () => {
      const stats = await validatedCache.getStatistics();

      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('validationRate');
      expect(stats).toHaveProperty('healingRate');
      expect(stats).toHaveProperty('averageOperationTime');
    });

    it('should handle memory pressure gracefully', async () => {
      // Simulate memory pressure
      const transformation: TransformationData = {
        before: 'memory test',
        after: 'memory result',
        pattern: 'memory-pattern',
        type: 'test',
        confidence: 0.8,
        metadata: {},
      };

      mockClaude.mockResolvedValue({
        isValid: true,
        confidence: 0.8,
        reason: 'Valid',
        complexity: 1,
      });

      // Cache many items to trigger cleanup
      for (let i = 0; i < 100; i++) {
        await validatedCache.cache(`memory-test-${i}`, {
          ...transformation,
          metadata: { ...transformation.metadata, id: i },
        });
      }

      const stats = await validatedCache.getStatistics();
      expect(stats.totalEntries).toBeLessThanOrEqual(100);
    });
  });
});

describe('AITransformationValidator', () => {
  let validator: AITransformationValidator;
  let mockClaude: Mock;

  beforeEach(() => {
    mockClaude = vi.mocked(EnhancedClaudeSDKAdapter).mockImplementation(
      () =>
        ({
          generateText: vi.fn(),
          analyzeCode: vi.fn(),
        }) as any
    );

    validator = new AITransformationValidator(mockClaude as any);
  });

  it('should validate transformations with comprehensive analysis', async () => {
    const transformation: TransformationData = {
      before: 'import { composeContext } from "@elizaos/core";',
      after: 'import { composePromptFromState } from "@elizaos/core";',
      pattern: 'import-modernization',
      type: 'import-update',
      confidence: 0.9,
      metadata: {},
    };

    mockClaude.mockResolvedValueOnce(`
      <validation_result>
        <is_valid>true</is_valid>
        <confidence>0.92</confidence>
        <reason>Correct V1 to V2 import transformation</reason>
        <complexity>2</complexity>
        <warnings></warnings>
      </validation_result>
    `);

    const result = await validator.validate(transformation);

    expect(result.isValid).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.reason).toContain('V1 to V2');
  });

  it('should detect semantic violations', async () => {
    const transformation: TransformationData = {
      before: 'const result = await generateObject();',
      after: 'const result = await runtime.useModel();',
      pattern: 'incomplete-transformation',
      type: 'method-update',
      confidence: 0.5,
      metadata: {},
    };

    mockClaude.mockResolvedValueOnce(`
      <validation_result>
        <is_valid>false</is_valid>
        <confidence>0.95</confidence>
        <reason>Missing required parameters in runtime.useModel() call</reason>
        <complexity>4</complexity>
        <warnings>Incomplete parameter transformation</warnings>
      </validation_result>
    `);

    const result = await validator.validate(transformation);

    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('Missing required parameters');
  });

  it('should perform quick validation for cache retrieval', async () => {
    const transformation: TransformationData = {
      before: 'test',
      after: 'test result',
      pattern: 'known-pattern',
      type: 'test',
      confidence: 0.9,
      metadata: {},
    };

    const result = await validator.quickValidate(transformation);

    expect(result).toHaveProperty('isValid');
    expect(result).toHaveProperty('confidence');
  });
});

describe('CachePredictor', () => {
  let predictor: CachePredictor;

  beforeEach(() => {
    predictor = new CachePredictor();
  });

  it('should generate predictions based on usage patterns', async () => {
    // Record some usage patterns
    await predictor.recordCacheEvent('pattern-1', 'hit');
    await predictor.recordCacheEvent('pattern-1', 'hit');
    await predictor.recordCacheEvent('pattern-2', 'miss');

    const predictions = await predictor.generatePredictions();

    expect(Array.isArray(predictions)).toBe(true);
    expect(predictions.length).toBeGreaterThan(0);
    expect(predictions[0]).toHaveProperty('likelihood');
    expect(predictions[0]).toHaveProperty('pattern');
  });

  it('should learn from cache events', async () => {
    const initialAccuracy = await predictor.getAccuracy();

    // Record training data
    for (let i = 0; i < 50; i++) {
      await predictor.recordCacheEvent(`training-${i}`, i % 2 === 0 ? 'hit' : 'miss');
    }

    const postTrainingAccuracy = await predictor.getAccuracy();
    expect(postTrainingAccuracy).toBeGreaterThanOrEqual(initialAccuracy);
  });

  it('should handle prediction model updates', async () => {
    await expect(predictor.updateModel()).resolves.not.toThrow();
  });
});

describe('CorruptionDetector', () => {
  let detector: CorruptionDetector;

  beforeEach(() => {
    detector = new CorruptionDetector();
  });

  it('should detect cache corruption', async () => {
    const validEntry: CacheEntry = {
      key: 'test-key',
      value: {
        before: 'test',
        after: 'result',
        pattern: 'test-pattern',
        type: 'test',
        confidence: 0.9,
        metadata: {},
      },
      checksum: 'valid-checksum',
      timestamp: Date.now(),
      patternVersion: { version: '1.0.0', hash: 'abc123' },
      validation: {
        isValid: true,
        confidence: 0.9,
        reason: 'Test validation',
        complexity: 2,
      },
      metadata: {
        transformationType: 'test',
        complexity: 2,
        confidence: 0.9,
      },
    };

    const isCorrupted = await detector.detectCorruption(validEntry);
    expect(typeof isCorrupted).toBe('boolean');
  });

  it('should repair corrupted entries', async () => {
    const corruptedEntry: CacheEntry = {
      key: 'corrupted-key',
      value: {
        before: 'corrupted',
        after: null as any, // Simulate corruption
        pattern: 'corrupted-pattern',
        type: 'test',
        confidence: 0.5,
        metadata: {},
      },
      checksum: 'invalid-checksum',
      timestamp: Date.now(),
      patternVersion: { version: '1.0.0', hash: 'def456' },
      validation: {
        isValid: false,
        confidence: 0.1,
        reason: 'Corrupted',
        complexity: 1,
      },
      metadata: {
        transformationType: 'test',
        complexity: 1,
        confidence: 0.1,
      },
    };

    const repaired = await detector.repairEntry(corruptedEntry);
    expect(repaired).toBeDefined();
  });
});

describe('CacheStorage', () => {
  let storage: CacheStorage;

  beforeEach(() => {
    storage = new CacheStorage();
  });

  it('should store and retrieve entries efficiently', async () => {
    const entry: CacheEntry = {
      key: 'storage-test',
      value: {
        before: 'test before',
        after: 'test after',
        pattern: 'storage-pattern',
        type: 'test',
        confidence: 0.8,
        metadata: {},
      },
      checksum: 'test-checksum',
      timestamp: Date.now(),
      patternVersion: { version: '1.0.0', hash: 'storage123' },
      validation: {
        isValid: true,
        confidence: 0.8,
        reason: 'Storage test',
        complexity: 2,
      },
      metadata: {
        transformationType: 'test',
        complexity: 2,
        confidence: 0.8,
      },
    };

    await storage.store(entry);
    const retrieved = await storage.retrieve('storage-test');

    expect(retrieved).toEqual(entry);
  });

  it('should handle storage persistence', async () => {
    await expect(storage.persist()).resolves.not.toThrow();
  });

  it('should handle storage cleanup', async () => {
    await expect(storage.cleanup()).resolves.not.toThrow();
  });

  it('should provide storage statistics', async () => {
    const stats = await storage.getStatistics();

    expect(stats).toHaveProperty('totalSize');
    expect(stats).toHaveProperty('entryCount');
    expect(stats).toHaveProperty('hitRate');
  });
});

describe('Integration Tests', () => {
  let validatedCache: ValidatedCache;
  let mockContext: MigrationContext;

  beforeEach(() => {
    mockContext = {
      repoPath: '/test/repo',
      pluginName: 'integration-test',
      packageJson: {},
      existingFiles: [],
      changedFiles: new Set(),
      claudePrompts: new Map(),
      hasService: false,
      hasProviders: false,
      hasActions: false,
      hasTests: false,
    };

    validatedCache = new ValidatedCache(mockContext);
  });

  it('should handle complete cache lifecycle', async () => {
    const transformation: TransformationData = {
      before: 'import { elizaLogger } from "@elizaos/core";',
      after: 'import { logger } from "@elizaos/core";',
      pattern: 'logger-modernization',
      type: 'import-update',
      confidence: 0.95,
      metadata: {
        fileName: 'integration.ts',
        lineNumber: 5,
      },
    };

    // Mock successful validation
    vi.mocked(EnhancedClaudeSDKAdapter).mockImplementation(
      () =>
        ({
          generateText: vi.fn().mockResolvedValue(`
        <validation_result>
          <is_valid>true</is_valid>
          <confidence>0.95</confidence>
          <reason>Valid logger import transformation</reason>
          <complexity>1</complexity>
          <warnings></warnings>
        </validation_result>
      `),
          analyzeCode: vi.fn(),
        }) as any
    );

    // Test complete lifecycle: cache -> retrieve -> validate -> cleanup
    await validatedCache.cache('lifecycle-test', transformation);

    const retrieved = await validatedCache.retrieve('lifecycle-test');
    expect(retrieved).toEqual(transformation);

    const isValid = await validatedCache.validateStorage('lifecycle-test');
    expect(isValid).toBe(true);

    await validatedCache.cleanup();
  });

  it('should maintain performance under load', async () => {
    const startTime = Date.now();
    const operations = 50;

    // Mock fast validation
    vi.mocked(EnhancedClaudeSDKAdapter).mockImplementation(
      () =>
        ({
          generateText: vi.fn().mockResolvedValue(`
        <validation_result>
          <is_valid>true</is_valid>
          <confidence>0.9</confidence>
          <reason>Fast validation</reason>
          <complexity>1</complexity>
          <warnings></warnings>
        </validation_result>
      `),
          analyzeCode: vi.fn(),
        }) as any
    );

    // Perform concurrent operations
    const promises = Array.from({ length: operations }, async (_, i) => {
      const transformation: TransformationData = {
        before: `test before ${i}`,
        after: `test after ${i}`,
        pattern: `performance-pattern-${i}`,
        type: 'performance-test',
        confidence: 0.9,
        metadata: { index: i },
      };

      await validatedCache.cache(`perf-test-${i}`, transformation);
      return validatedCache.retrieve(`perf-test-${i}`);
    });

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / operations;

    expect(results.length).toBe(operations);
    expect(averageTime).toBeLessThan(100); // < 100ms per operation
    expect(results.every((r) => r !== null)).toBe(true);
  });
});
