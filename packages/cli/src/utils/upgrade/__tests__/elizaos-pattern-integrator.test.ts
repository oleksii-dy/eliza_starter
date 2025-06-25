import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ElizaOSPatternIntegrator,
  ElizaOSPattern,
  PatternCollection,
  PatternValidationResult
} from '../core/elizaos-pattern-integrator';
import * as fs from 'node:fs/promises';

// Mock fs module
vi.mock('node:fs/promises');
const mockFs = vi.mocked(fs);

describe('ElizaOSPatternIntegrator', () => {
  let integrator: ElizaOSPatternIntegrator;
  let mockRepoPath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepoPath = '/test/repo';
    integrator = new ElizaOSPatternIntegrator(mockRepoPath);

    // Mock pattern files content
    mockFs.readFile.mockImplementation(async (filePath: string) => {
      if (filePath.includes('plugin-action-migration-guide.md')) {
        return 'Action migration guide content';
      }
      
      if (filePath.includes('plugin-provider-action-items.md')) {
        return 'Provider migration content';
      }
      
      throw new Error('File not found');
    });
  });

  describe('pattern loading', () => {
    it('should load patterns from migration guide files successfully', async () => {
      const collection = await integrator.loadPatterns();
      
      expect(collection).toBeDefined();
      expect(collection.patterns).toBeDefined();
      expect(collection.patterns.length).toBeGreaterThan(0);
      expect(collection.byId).toBeInstanceOf(Map);
      expect(collection.byCategory).toBeInstanceOf(Map);
      expect(collection.versionHash).toBeDefined();
      expect(collection.loadedAt).toBeInstanceOf(Date);
    });

    it('should validate composeContext to composePromptFromState transformation', async () => {
      await integrator.loadPatterns();
      
      const before = 'import { composeContext } from "@elizaos/core";';
      const after = 'import { composePromptFromState } from "@elizaos/core";';
      
      const result = await integrator.validateTransformation(before, after, 'import-update');
      
      expect(result.isValidPattern).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.isComplete).toBe(true);
    });

    it('should provide pattern version information', async () => {
      await integrator.loadPatterns();
      
      const version = await integrator.getPatternVersion();
      
      expect(version).toBeDefined();
      expect(version.version).toBe('2.0.0');
      expect(version.hash).toBeDefined();
    });

    it('should detect invalid transformations', async () => {
      await integrator.loadPatterns();
      
      const before = 'import { composeContext } from "@elizaos/core";';
      const after = 'import { wrongFunction } from "@elizaos/core";';
      
      const result = await integrator.validateTransformation(before, after, 'import-update');
      
      expect(result.isValidPattern).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });
});
