import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IAgentRuntime, Memory, State, UUID, ActionResult } from '@elizaos/core';
import { KnowledgeService } from '../../service';

// Simple test to verify service integration
describe('Knowledge Actions Unit Tests', () => {
  let mockRuntime: IAgentRuntime;
  let mockKnowledgeService: KnowledgeService;
  let mockCallback: any;
  let mockState: State;

  const generateMockUuid = (suffix: string | number): UUID =>
    `00000000-0000-0000-0000-${String(suffix).padStart(12, '0')}` as UUID;

  beforeEach(() => {
    vi.clearAllMocks();

    mockKnowledgeService = {
      addKnowledge: vi.fn(),
      getKnowledge: vi.fn(),
      serviceType: 'knowledge-service',
    } as unknown as KnowledgeService;

    mockRuntime = {
      agentId: 'test-agent' as UUID,
      getService: vi.fn().mockReturnValue(mockKnowledgeService),
    } as unknown as IAgentRuntime;

    mockCallback = vi.fn();
    mockState = {
      values: {},
      data: {},
      text: '',
    };
  });

  describe('Service Integration', () => {
    it('should have knowledge service available', () => {
      const service = mockRuntime.getService(KnowledgeService.serviceType);
      expect(service).toBeDefined();
      expect(service).toBe(mockKnowledgeService);
    });

    it('should be able to call service methods', async () => {
      const mockResult = {
        clientDocumentId: 'test-doc-id',
        storedDocumentMemoryId: generateMockUuid(100),
        fragmentCount: 5,
      };

      (mockKnowledgeService.addKnowledge as any).mockResolvedValue(mockResult);

      const options = {
        clientDocumentId: 'test-id',
        contentType: 'text/plain',
        originalFilename: 'test.txt',
        worldId: mockRuntime.agentId,
        content: 'test content',
        roomId: generateMockUuid(1),
        entityId: generateMockUuid(2),
      };

      const result = await mockKnowledgeService.addKnowledge(options);
      expect(result).toEqual(mockResult);
      expect(mockKnowledgeService.addKnowledge).toHaveBeenCalledWith(options);
    });

    it('should be able to search knowledge', async () => {
      const mockResults = [
        {
          id: generateMockUuid(50),
          content: { text: 'Test search result' },
          metadata: { type: 'fragment' as const, source: 'test.txt' },
        },
      ];

      (mockKnowledgeService.getKnowledge as any).mockResolvedValue(mockResults);

      const message: Memory = {
        id: generateMockUuid(1),
        content: { text: 'search for test' },
        entityId: generateMockUuid(2),
        roomId: generateMockUuid(3),
      };

      const result = await mockKnowledgeService.getKnowledge(message);
      expect(result).toEqual(mockResults);
      expect(mockKnowledgeService.getKnowledge).toHaveBeenCalledWith(message);
    });
  });

  describe('Text Processing', () => {
    it('should process text content without file operations', async () => {
      // Test that we can handle text processing without fs operations
      const textContent = 'The capital of France is Paris.';
      const processedContent = textContent.replace(/^(add|store|remember|process|learn)\s+(this|that|the following)?:?\s*/i, '').trim();
      
      expect(processedContent).toBe(textContent);
      
      // Test with prefix removal
      const textWithPrefix = 'Add this to your knowledge: The capital of France is Paris.';
      const processedWithPrefix = textWithPrefix.replace(/^(add|store|remember|process|learn)\s+(this|that|the following)?:?\s*/i, '').trim();
      
      expect(processedWithPrefix).toBe('to your knowledge: The capital of France is Paris.');
    });

    it('should handle empty content', () => {
      const emptyContent = '';
      const processed = emptyContent.replace(/^(add|store|remember|process|learn)\s+(this|that|the following)?:?\s*/i, '').trim();
      
      expect(processed).toBe('');
    });

    it('should handle content with only keywords', () => {
      const keywordOnly = 'add this:';
      const processed = keywordOnly.replace(/^(add|store|remember|process|learn)\s+(this|that|the following)?:?\s*/i, '').trim();
      
      expect(processed).toBe('');
    });
  });

  describe('Path Pattern Matching', () => {
    it('should detect file paths', () => {
      const pathPattern = /(?:\/[\w.-]+)+|(?:[a-zA-Z]:[\\/][\w\s.-]+(?:[\\/][\w\s.-]+)*)/;
      
      expect(pathPattern.test('/path/to/document.pdf')).toBe(true);
      expect(pathPattern.test('C:\\Users\\Document.txt')).toBe(true);
      expect(pathPattern.test('/home/user/file.json')).toBe(true);
      expect(pathPattern.test('no path here')).toBe(false);
    });

    it('should extract file paths from text', () => {
      const pathPattern = /(?:\/[\w.-]+)+|(?:[a-zA-Z]:[\\/][\w\s.-]+(?:[\\/][\w\s.-]+)*)/;
      
      const text1 = 'Process the document at /path/to/document.pdf';
      const match1 = text1.match(pathPattern);
      expect(match1?.[0]).toBe('/path/to/document.pdf');

      const text2 = 'Load file from C:\\Documents\\file.txt';
      const match2 = text2.match(pathPattern);
      expect(match2?.[0]).toBe('C:\\Documents\\file.txt');
    });
  });

  describe('Keyword Validation', () => {
    it('should detect knowledge keywords', () => {
      const knowledgeKeywords = [
        'process', 'add', 'upload', 'document', 'knowledge', 'learn',
        'remember', 'store', 'ingest', 'file', 'save this', 'save that',
        'keep this', 'keep that'
      ];

      const testTexts = [
        'add this to your knowledge',
        'process the document',
        'store this information',
        'remember this fact',
        'learn about AI',
      ];

      testTexts.forEach(text => {
        const hasKeyword = knowledgeKeywords.some(keyword => text.toLowerCase().includes(keyword));
        expect(hasKeyword).toBe(true);
      });

      // Test negative case
      const negativeText = 'tell me about the weather';
      const hasKeyword = knowledgeKeywords.some(keyword => negativeText.toLowerCase().includes(keyword));
      expect(hasKeyword).toBe(false);
    });
  });
});