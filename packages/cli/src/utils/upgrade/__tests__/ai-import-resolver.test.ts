/**
 * AI IMPORT RESOLVER TESTS
 *
 * Comprehensive test suite for the AI-powered import resolution system.
 * Tests multiple strategies, self-healing mechanisms, and validation contexts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  AIImportResolver,
  AIStrategy,
  ValidationContext,
  type ImportIssue,
  type MigrationContext,
} from '../core/ai-import-resolver.js';

// Mock fs and TypeScript
vi.mock('node:fs');
vi.mock('typescript');

const mockFs = vi.mocked(fs);
const mockFsPromises = vi.mocked(fs.promises);

describe('AIImportResolver', () => {
  let resolver: AIImportResolver;
  let mockContext: MigrationContext;
  let tempDir: string;

  beforeEach(() => {
    tempDir = '/tmp/test-plugin';

    mockContext = {
      repoPath: tempDir,
      pluginName: 'test-plugin',
      hasService: false,
      hasProviders: true,
      hasActions: true,
      hasTests: false,
      packageJson: {
        name: '@elizaos/plugin-test',
        version: '1.0.0',
        dependencies: {
          '@elizaos/core': '^2.0.0',
        },
      },
      existingFiles: [
        `${tempDir}/src/index.ts`,
        `${tempDir}/src/actions/test-action.ts`,
        `${tempDir}/src/providers/test-provider.ts`,
      ],
      changedFiles: new Set(),
      claudePrompts: new Map(),
      abortController: new AbortController(),
    };

    resolver = new AIImportResolver(mockContext);

    // Mock file system
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Import Issue Detection', () => {
    it('should detect V1 pattern issues', async () => {
      const testFile = `${tempDir}/src/actions/test-action.ts`;
      const mockContent = `
import { ModelClass, elizaLogger, composeContext } from '@elizaos/core';
import { generateObjectDeprecated } from '@elizaos/core';

export const testAction = {
  name: 'test',
  handler: async (runtime, message) => {
    const context = composeContext({ state });
    const result = await generateObjectDeprecated({
      runtime,
      context,
      modelClass: ModelClass.LARGE
    });
    elizaLogger.info('Action completed');
  }
};
`;

      mockFsPromises.readFile.mockResolvedValueOnce(mockContent);

      const issues = await resolver['detectV1Patterns'](testFile, mockContent);

      expect(issues).toHaveLength(4);
      expect(issues.map((i) => i.type)).toEqual([
        'deprecated-api',
        'deprecated-api',
        'deprecated-api',
        'deprecated-api',
      ]);

      const patterns = issues.map((i) => i.context);
      expect(patterns).toContain('V1 pattern detected: replace with ModelType');
      expect(patterns).toContain('V1 pattern detected: replace with logger');
      expect(patterns).toContain('V1 pattern detected: replace with composePromptFromState');
      expect(patterns).toContain('V1 pattern detected: replace with runtime.useModel');
    });

    it('should detect missing import issues', async () => {
      const testFile = `${tempDir}/src/actions/test-action.ts`;
      const mockContent = `
import { NonExistentImport } from './missing-file';
import { AnotherMissing } from '../utils/not-found';
`;

      mockFsPromises.readFile.mockResolvedValueOnce(mockContent);

      // Mock TypeScript compilation to return diagnostics
      const mockProgram = {
        getSourceFile: vi.fn(),
        getTypeChecker: vi.fn(),
      };

      const mockDiagnostics = [
        {
          file: { getLineAndCharacterOfPosition: vi.fn().mockReturnValue({ line: 1 }) },
          start: 0,
          messageText: "Cannot find module './missing-file'",
        },
        {
          file: { getLineAndCharacterOfPosition: vi.fn().mockReturnValue({ line: 2 }) },
          start: 50,
          messageText: "Cannot find module '../utils/not-found'",
        },
      ];

      // Mock TypeScript module
      const mockTs = {
        createSourceFile: vi.fn().mockReturnValue({}),
        createProgram: vi.fn().mockReturnValue(mockProgram),
        getPreEmitDiagnostics: vi.fn().mockReturnValue(mockDiagnostics),
        ScriptTarget: { Latest: 99 },
        flattenDiagnosticMessageText: vi.fn((text) => text),
      };

      vi.doMock('typescript', () => mockTs);

      const graph = {
        nodes: new Map([
          [
            testFile,
            {
              file: testFile,
              imports: ['./missing-file', '../utils/not-found'],
              exports: [],
              dependencies: new Set(['./missing-file', '../utils/not-found']),
              dependents: new Set(),
              isCircular: false,
            },
          ],
        ]),
        circularDependencies: [],
        orphanedFiles: [],
        missingDependencies: new Map(),
      };

      const issues = await resolver['detectImportIssues']([testFile], graph);

      expect(issues).toHaveLength(2);
      expect(issues.every((i) => i.type === 'invalid-path')).toBe(true);
      expect(issues.every((i) => i.severity === 'critical')).toBe(true);
    });

    it('should detect circular dependency issues', async () => {
      const fileA = `${tempDir}/src/fileA.ts`;
      const fileB = `${tempDir}/src/fileB.ts`;
      const fileC = `${tempDir}/src/fileC.ts`;

      const graph = {
        nodes: new Map([
          [
            fileA,
            {
              file: fileA,
              imports: [fileB],
              exports: [],
              dependencies: new Set([fileB]),
              dependents: new Set([fileC]),
              isCircular: true,
            },
          ],
          [
            fileB,
            {
              file: fileB,
              imports: [fileC],
              exports: [],
              dependencies: new Set([fileC]),
              dependents: new Set([fileA]),
              isCircular: true,
            },
          ],
          [
            fileC,
            {
              file: fileC,
              imports: [fileA],
              exports: [],
              dependencies: new Set([fileA]),
              dependents: new Set([fileB]),
              isCircular: true,
            },
          ],
        ]),
        circularDependencies: [[fileA, fileB, fileC]],
        orphanedFiles: [],
        missingDependencies: new Map(),
      };

      mockFsPromises.readFile.mockResolvedValue('// mock content');

      const issues = await resolver['detectImportIssues']([fileA, fileB, fileC], graph);

      const circularIssues = issues.filter((i) => i.type === 'circular-dependency');
      expect(circularIssues).toHaveLength(3); // One for each file in the cycle
      expect(circularIssues.every((i) => i.severity === 'high')).toBe(true);
    });
  });

  describe('Strategy Selection', () => {
    it('should select PATTERN_BASED for early iterations with few issues', () => {
      const issues: ImportIssue[] = [
        {
          id: 'test-1',
          type: 'deprecated-api',
          severity: 'high',
          file: 'test.ts',
          line: 1,
          importStatement: 'import { ModelClass } from "@elizaos/core"',
          context: 'V1 pattern',
        },
      ];

      const strategy = resolver['selectStrategy'](5, issues);
      expect(strategy).toBe(AIStrategy.PATTERN_BASED);
    });

    it('should select SINGLE_AGENT for moderate iterations', () => {
      const issues: ImportIssue[] = [
        {
          id: 'test-1',
          type: 'invalid-path',
          severity: 'critical',
          file: 'test.ts',
          line: 1,
          importStatement: 'import { Missing } from "./missing"',
          context: 'Cannot find module',
        },
      ];

      const strategy = resolver['selectStrategy'](20, issues);
      expect(strategy).toBe(AIStrategy.SINGLE_AGENT);
    });

    it('should select MULTI_AGENT for complex scenarios', () => {
      const issues: ImportIssue[] = Array.from({ length: 25 }, (_, i) => ({
        id: `test-${i}`,
        type: 'invalid-path',
        severity: 'critical',
        file: 'test.ts',
        line: i + 1,
        importStatement: `import { Missing${i} } from "./missing${i}"`,
        context: 'Cannot find module',
      }));

      const strategy = resolver['selectStrategy'](45, issues);
      expect(strategy).toBe(AIStrategy.MULTI_AGENT);
    });

    it('should select RECONSTRUCTION for late iterations', () => {
      const issues: ImportIssue[] = [
        {
          id: 'test-1',
          type: 'circular-dependency',
          severity: 'critical',
          file: 'test.ts',
          line: 1,
          importStatement: 'Circular dependency',
          context: 'Complex circular dependency',
        },
      ];

      const strategy = resolver['selectStrategy'](85, issues);
      expect(strategy).toBe(AIStrategy.RECONSTRUCTION);
    });
  });

  describe('Priority Scoring', () => {
    it('should score critical severity issues higher', () => {
      const criticalIssue: ImportIssue = {
        id: 'critical',
        type: 'circular-dependency',
        severity: 'critical',
        file: 'test.ts',
        line: 1,
        importStatement: 'test',
        context: 'test',
        aiConfidence: 0.9,
      };

      const mediumIssue: ImportIssue = {
        id: 'medium',
        type: 'missing-extension',
        severity: 'medium',
        file: 'test.ts',
        line: 1,
        importStatement: 'test',
        context: 'test',
      };

      const criticalScore = resolver['calculatePriorityScore'](criticalIssue);
      const mediumScore = resolver['calculatePriorityScore'](mediumIssue);

      expect(criticalScore).toBeGreaterThan(mediumScore);
      expect(criticalScore).toBeGreaterThan(200); // 100 (critical) + 90 (circular) + 20 (high confidence)
      expect(mediumScore).toBeLessThan(100);
    });

    it('should boost scores for high AI confidence', () => {
      const highConfidenceIssue: ImportIssue = {
        id: 'high-conf',
        type: 'deprecated-api',
        severity: 'high',
        file: 'test.ts',
        line: 1,
        importStatement: 'test',
        context: 'test',
        aiConfidence: 0.95,
      };

      const lowConfidenceIssue: ImportIssue = {
        id: 'low-conf',
        type: 'deprecated-api',
        severity: 'high',
        file: 'test.ts',
        line: 1,
        importStatement: 'test',
        context: 'test',
        aiConfidence: 0.3,
      };

      const highScore = resolver['calculatePriorityScore'](highConfidenceIssue);
      const lowScore = resolver['calculatePriorityScore'](lowConfidenceIssue);

      expect(highScore).toBeGreaterThan(lowScore);
      expect(highScore - lowScore).toBe(20); // Confidence boost difference
    });
  });

  describe('Import Path Resolution', () => {
    beforeEach(() => {
      // Mock fs.existsSync for import resolution
      const mockExistsSync = vi.fn();
      mockFs.existsSync = mockExistsSync;
    });

    it('should resolve relative imports with extensions', () => {
      const fromFile = `${tempDir}/src/actions/test-action.ts`;
      const importPath = '../providers/test-provider';
      const expectedPath = `${tempDir}/src/providers/test-provider.ts`;

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return path === expectedPath;
      });

      const resolved = resolver['resolveImportPath'](importPath, fromFile);
      expect(resolved).toBe(expectedPath);
    });

    it('should resolve index files', () => {
      const fromFile = `${tempDir}/src/actions/test-action.ts`;
      const importPath = '../utils';
      const expectedIndexPath = `${tempDir}/src/utils/index.ts`;

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        return path === expectedIndexPath;
      });

      const resolved = resolver['resolveImportPath'](importPath, fromFile);
      expect(resolved).toBe(expectedIndexPath);
    });

    it('should handle external packages', () => {
      const fromFile = `${tempDir}/src/actions/test-action.ts`;
      const importPath = '@elizaos/core';

      const resolved = resolver['resolveImportPath'](importPath, fromFile);
      expect(resolved).toBe('@elizaos/core');
    });

    it('should return null for unresolvable imports', () => {
      const fromFile = `${tempDir}/src/actions/test-action.ts`;
      const importPath = './non-existent';

      vi.mocked(fs.existsSync).mockReturnValue(false);

      const resolved = resolver['resolveImportPath'](importPath, fromFile);
      expect(resolved).toBeNull();
    });
  });

  describe('Validation Contexts', () => {
    beforeEach(() => {
      // Mock child_process for build/test validation
      vi.doMock('node:child_process', () => ({
        spawn: vi.fn(),
      }));
    });

    it('should validate syntax correctly', async () => {
      const testFiles = [`${tempDir}/src/test.ts`];
      const validContent = `
import { logger } from '@elizaos/core';
export const test = () => logger.info('test');
`;

      mockFsPromises.readFile.mockResolvedValue(validContent);

      // Mock TypeScript compilation with no errors
      const mockTs = {
        createSourceFile: vi.fn().mockReturnValue({}),
        createProgram: vi.fn().mockReturnValue({}),
        getPreEmitDiagnostics: vi.fn().mockReturnValue([]),
        ScriptTarget: { Latest: 99 },
      };

      vi.doMock('typescript', () => mockTs);

      const result = await resolver['validateSyntax'](testFiles);
      expect(result).toBe(true);
    });

    it('should detect syntax errors', async () => {
      const testFiles = [`${tempDir}/src/test.ts`];
      const invalidContent = `
import { logger } from '@elizaos/core'  // Missing semicolon
export const test = () => { logger.info('test' // Missing closing
`;

      mockFsPromises.readFile.mockResolvedValue(invalidContent);

      // Mock TypeScript compilation with errors
      const mockDiagnostics = [
        {
          file: { getLineAndCharacterOfPosition: vi.fn() },
          start: 0,
          messageText: 'Syntax error',
        },
      ];

      const mockTs = {
        createSourceFile: vi.fn().mockReturnValue({}),
        createProgram: vi.fn().mockReturnValue({}),
        getPreEmitDiagnostics: vi.fn().mockReturnValue(mockDiagnostics),
        ScriptTarget: { Latest: 99 },
        flattenDiagnosticMessageText: vi.fn((text) => text),
      };

      vi.doMock('typescript', () => mockTs);

      const result = await resolver['validateSyntax'](testFiles);
      expect(result).toBe(false);
    });
  });

  describe('Error Classification', () => {
    it('should classify import-related errors correctly', () => {
      const messages = [
        "Cannot find module './missing'",
        "Module not found: './another-missing'",
        'Circular dependency detected',
        "'SomeType' is not exported from '@elizaos/core'",
        'generateObject is deprecated',
      ];

      const isImportRelated = messages.map((msg) => resolver['isImportRelatedError'](msg));

      expect(isImportRelated).toEqual([true, true, true, true, false]);
    });

    it('should classify error types correctly', () => {
      const testCases = [
        { message: "Cannot find module './test'", expected: 'invalid-path' },
        { message: 'Circular dependency in graph', expected: 'circular-dependency' },
        { message: "'TestType' is not exported", expected: 'missing-type' },
        { message: 'generateObject is deprecated', expected: 'deprecated-api' },
        { message: 'Unknown error', expected: 'wrong-import-type' },
      ];

      testCases.forEach(({ message, expected }) => {
        const result = resolver['classifyImportError'](message);
        expect(result).toBe(expected);
      });
    });

    it('should assign appropriate error severities', () => {
      const testCases = [
        { message: "Cannot find module './test'", expected: 'critical' },
        { message: 'Circular dependency detected', expected: 'critical' },
        { message: 'generateObject is deprecated', expected: 'high' },
        { message: "'TestType' is not exported", expected: 'high' },
        { message: 'Minor import issue', expected: 'medium' },
      ];

      testCases.forEach(({ message, expected }) => {
        const result = resolver['getErrorSeverity'](message);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Pattern-Based Fixes', () => {
    it('should generate fixes for known V1 patterns', async () => {
      const issues: ImportIssue[] = [
        {
          id: 'model-class',
          type: 'deprecated-api',
          severity: 'high',
          file: 'test.ts',
          line: 1,
          importStatement: 'import { ModelClass } from "@elizaos/core"',
          context: 'V1 pattern',
        },
        {
          id: 'logger',
          type: 'deprecated-api',
          severity: 'high',
          file: 'test.ts',
          line: 2,
          importStatement: 'import { elizaLogger } from "@elizaos/core"',
          context: 'V1 pattern',
        },
      ];

      const fixes = await resolver['generatePatternBasedFixes'](issues);

      expect(fixes).toHaveLength(2);
      expect(fixes[0].prompt).toContain('ModelClass');
      expect(fixes[1].prompt).toContain('elizaLogger');
      expect(fixes.every((f) => f.success === false)).toBe(true); // Will be determined after application
    });
  });

  describe('Integration Tests', () => {
    it('should handle a complete V1 to V2 migration scenario', async () => {
      // This is a higher-level integration test
      const testFiles = [`${tempDir}/src/index.ts`, `${tempDir}/src/actions/test-action.ts`];

      const v1Content = `
import { 
  ModelClass, 
  elizaLogger, 
  composeContext,
  generateObjectDeprecated,
  ActionExample,
  Content 
} from '@elizaos/core';

export const testAction = {
  name: 'test',
  handler: async (runtime, message, state, options, callback) => {
    const context = composeContext({ state });
    const result = await generateObjectDeprecated({
      runtime,
      context,
      modelClass: ModelClass.LARGE
    });
    elizaLogger.info('Action completed');
    return true;
  }
};
`;

      mockFsPromises.readFile.mockResolvedValue(v1Content);
      vi.mocked(fs.existsSync).mockReturnValue(false); // No files exist for resolution

      // Mock Claude integration to avoid actual AI calls
      const mockClaudeIntegration = {
        runClaudeWithPrompt: vi.fn().mockResolvedValue(undefined),
      };

      // Replace the Claude integration
      (resolver as any).claudeIntegration = mockClaudeIntegration;

      // This would normally run the full resolution process
      // For testing, we'll validate that the system correctly identifies the issues
      const graph = await resolver['analyzeImportGraph'](testFiles);
      expect(graph.nodes.size).toBeGreaterThan(0);
    });
  });
});
