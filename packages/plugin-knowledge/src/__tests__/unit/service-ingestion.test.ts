import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KnowledgeService } from '../../service';
import type { IAgentRuntime, UUID } from '@elizaos/core';
import type { GitHubIngestionOptions, WebPageIngestionOptions } from '../../types';

describe('KnowledgeService Ingestion Methods', () => {
  let service: KnowledgeService;
  let mockRuntime: Partial<IAgentRuntime>;

  beforeEach(() => {
    mockRuntime = {
      agentId: 'test-agent-id' as UUID,
      character: {
        name: 'TestAgent',
        bio: ['Test bio'],
        system: 'Test system',
        messageExamples: []
        postExamples: []
        topics: []
        knowledge: []
        plugins: []
      },
      getSetting: vi.fn(() => 'test-value'),
    };

    service = new KnowledgeService(mockRuntime as IAgentRuntime);
  });

  describe('ingestGitHubRepository', () => {
    it('should have ingestGitHubRepository method', () => {
      expect(typeof service.ingestGitHubRepository).toBe('function');
    });

    it('should validate GitHub ingestion options structure', () => {
      const options: GitHubIngestionOptions = {
        repoUrl: 'https://github.com/test/repo',
        subdirectories: ['docs'],
        branch: 'main',
        maxFileSize: 1024 * 1024,
        allowedExtensions: ['.md', '.txt'],
        excludePatterns: ['node_modules'],
        metadata: { source: 'test' },
      };

      // Verify the options structure is properly typed
      expect(options.repoUrl).toBe('https://github.com/test/repo');
      expect(options.subdirectories).toEqual(['docs']);
      expect(options.branch).toBe('main');
      expect(options.maxFileSize).toBe(1024 * 1024);
      expect(options.allowedExtensions).toEqual(['.md', '.txt']);
      expect(options.excludePatterns).toEqual(['node_modules']);
      expect(options.metadata?.source).toBe('test');
    });
  });

  describe('ingestWebPage', () => {
    it('should have ingestWebPage method', () => {
      expect(typeof service.ingestWebPage).toBe('function');
    });

    it('should validate web page ingestion options structure', () => {
      const options: WebPageIngestionOptions = {
        url: 'https://example.com/page',
        minTextLength: 30,
        excludeSelectors: ['nav', 'footer'],
        includeSelectors: ['main', 'article'],
        followLinks: false,
        maxDepth: 1,
        metadata: { source: 'web' },
      };

      // Verify the options structure is properly typed
      expect(options.url).toBe('https://example.com/page');
      expect(options.minTextLength).toBe(30);
      expect(options.excludeSelectors).toEqual(['nav', 'footer']);
      expect(options.includeSelectors).toEqual(['main', 'article']);
      expect(options.followLinks).toBe(false);
      expect(options.maxDepth).toBe(1);
      expect(options.metadata?.source).toBe('web');
    });
  });

  describe('getContentTypeFromPath', () => {
    it('should return correct content types for various file extensions', () => {
      const testCases = [
        { path: 'README.md', expected: 'text/markdown' },
        { path: 'script.js', expected: 'application/javascript' },
        { path: 'data.json', expected: 'application/json' },
        { path: 'style.css', expected: 'text/css' },
        { path: 'doc.pdf', expected: 'application/pdf' },
        { path: 'script.py', expected: 'text/x-python' },
        { path: 'unknown.xyz', expected: 'text/plain' },
        { path: 'no-extension', expected: 'text/plain' },
      ];

      testCases.forEach(({ path, expected }) => {
        const result = (service as any).getContentTypeFromPath(path);
        expect(result).toBe(expected);
      });
    });
  });

  describe('service configuration', () => {
    it('should initialize with proper service type and name', () => {
      expect(KnowledgeService.serviceType).toBe('knowledge');
      expect(KnowledgeService.serviceName).toBe('knowledge');
    });

    it('should have capability description', () => {
      expect(service.capabilityDescription).toContain('Retrieval Augmented Generation');
    });
  });
});
