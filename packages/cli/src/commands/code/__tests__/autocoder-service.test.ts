import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { AutocoderService, type AutocoderOptions } from '../services/autocoder-service.js';

// Mock fs operations
const mockFs = {
  mkdir: mock(() => Promise.resolve()),
  writeFile: mock(() => Promise.resolve()),
  readFile: mock(() => Promise.resolve('test file content')),
  access: mock(() => Promise.reject(new Error('File not found'))),
  stat: mock(() => Promise.resolve({ 
    size: 1024,
    isFile: () => true,
    isDirectory: () => false,
    mtime: new Date(),
  })),
  readdir: mock(() => Promise.resolve([])),
  unlink: mock(() => Promise.resolve()),
};

const mockPath = {
  dirname: mock(() => '/test/dir'),
  resolve: mock(() => '/test/dir/.test-autocoder'),
  join: mock((...args: string[]) => args.join('/')),
  basename: mock((filePath: string) => filePath.split('/').pop() || ''),
  extname: mock((filePath: string) => {
    const parts = filePath.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  }),
};

// Apply mocks
mock.module('fs/promises', () => mockFs);
mock.module('path', () => mockPath);

const mockTelemetryService = {
  logEvent: mock(() => Promise.resolve()),
  start: mock(() => Promise.resolve()),
  stop: mock(() => Promise.resolve()),
};

const mockErrorLogService = {
  logError: mock(() => Promise.resolve()),
  logWarning: mock(() => Promise.resolve()),
  start: mock(() => Promise.resolve()),
  stop: mock(() => Promise.resolve()),
};

const mockArtifactStorageService = {
  storeArtifact: mock(() => Promise.resolve({
    id: 'artifact-123',
    name: 'test.js',
    path: 'artifacts/test.js',
    type: 'code',
    agentId: 'autocoder',
    version: 1,
    createdAt: new Date().toISOString(),
    localPath: '/test/artifacts/test.js',
  })),
  getArtifact: mock(() => Promise.resolve({
    id: 'artifact-123',
    content: 'test content',
  })),
};

const mockCodeInterfaceService = {
  trackRequest: mock(() => Promise.resolve('req-123')),
  completeRequest: mock(() => Promise.resolve()),
  recordFeedback: mock(() => Promise.resolve()),
};

// Mock LLM provider
const mockLLMProvider = {
  generateText: mock(() => Promise.resolve('Generated code content')),
  analyzeCode: mock(() => Promise.resolve({
    language: 'javascript',
    complexity: 'medium',
    suggestions: ['Use const instead of var', 'Add error handling'],
  })),
  explainCode: mock(() => Promise.resolve('This code creates a simple function')),
};

describe('AutocoderService', () => {
  let autocoderService: AutocoderService;
  let mockOptions: AutocoderOptions;

  beforeEach(() => {
    // Clear all mocks
    Object.values(mockFs).forEach(mockFn => mockFn.mockReset());
    Object.values(mockPath).forEach(mockFn => mockFn.mockReset());
    mockTelemetryService.logEvent.mockReset();
    mockErrorLogService.logError.mockReset();
    mockErrorLogService.logWarning.mockReset();
    mockArtifactStorageService.storeArtifact.mockReset();
    mockArtifactStorageService.getArtifact.mockReset();
    mockCodeInterfaceService.trackRequest.mockReset();
    mockCodeInterfaceService.completeRequest.mockReset();
    mockCodeInterfaceService.recordFeedback.mockReset();
    mockLLMProvider.generateText.mockReset();
    mockLLMProvider.analyzeCode.mockReset();
    mockLLMProvider.explainCode.mockReset();
    
    mockOptions = {
      enabled: true,
      model: 'gpt-4',
      maxTokens: 4000,
      temperature: 0.7,
      enableCodeAnalysis: true,
      enableArtifactGeneration: true,
      telemetryService: mockTelemetryService as any,
      errorLogService: mockErrorLogService as any,
      artifactStorageService: mockArtifactStorageService as any,
      codeInterfaceService: mockCodeInterfaceService as any,
      llmProvider: mockLLMProvider as any,
      debug: true,
    };

    // Setup path mocks
    mockPath.dirname.mockReturnValue('/test/dir');
    mockPath.resolve.mockReturnValue('/test/dir/.test-autocoder');
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.basename.mockImplementation((filePath) => filePath.split('/').pop() || '');
    mockPath.extname.mockImplementation((filePath) => {
      const parts = filePath.split('.');
      return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
    });

    // Setup fs mocks
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('test file content');
    mockFs.access.mockRejectedValue(new Error('File not found'));
    mockFs.stat.mockResolvedValue({ 
      size: 1024,
      isFile: () => true,
      isDirectory: () => false,
      mtime: new Date(),
    } as any);
    mockFs.readdir.mockResolvedValue([]);
    mockFs.unlink.mockResolvedValue(undefined);

    autocoderService = new AutocoderService(mockOptions);
  });

  afterEach(async () => {
    if (autocoderService) {
      await autocoderService.stop();
    }
  });

  describe('initialization', () => {
    it('should create an AutocoderService instance', () => {
      expect(autocoderService).toBeInstanceOf(AutocoderService);
    });

    it('should start successfully with enabled service', async () => {
      await expect(autocoderService.start()).resolves.not.toThrow();
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'autocoder_service_started',
        expect.objectContaining({
          model: 'gpt-4',
          maxTokens: 4000,
          temperature: 0.7,
          enableCodeAnalysis: true,
          enableArtifactGeneration: true,
        }),
        'autocoder'
      );
    });

    it('should skip initialization when disabled', async () => {
      const disabledService = new AutocoderService({ 
        ...mockOptions, 
        enabled: false 
      });
      
      await disabledService.start();
      expect(mockTelemetryService.logEvent).not.toHaveBeenCalled();
    });

    it('should validate LLM provider on start', async () => {
      const invalidService = new AutocoderService({
        ...mockOptions,
        llmProvider: null as any,
      });
      
      await expect(invalidService.start()).rejects.toThrow('LLM provider is required');
    });

    it('should handle missing dependencies gracefully', async () => {
      const partialService = new AutocoderService({
        ...mockOptions,
        artifactStorageService: null as any,
      });
      
      await partialService.start();
      expect(mockErrorLogService.logWarning).toHaveBeenCalledWith(
        'Artifact storage service not available, artifacts will not be saved',
        expect.any(Object),
        'autocoder'
      );
    });
  });

  describe('code generation', () => {
    beforeEach(async () => {
      await autocoderService.start();
    });

    it('should generate code from prompts', async () => {
      const request = {
        prompt: 'Create a React component for displaying user profiles',
        language: 'typescript',
        framework: 'react',
        sessionId: 'session-123',
        userId: 'user-123',
      };

      mockLLMProvider.generateText.mockResolvedValueOnce(`
import React from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserProfileProps {
  user: User;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
};`);

      const result = await autocoderService.generateCode(request);
      
      expect(result).toEqual({
        content: expect.stringContaining('export const UserProfile'),
        language: 'typescript',
        framework: 'react',
        tokensUsed: expect.any(Number),
        processingTime: expect.any(Number),
        artifacts: expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringMatching(/UserProfile\.(tsx|ts)$/),
            type: 'code',
            content: expect.stringContaining('React.FC'),
          }),
        ]),
        metadata: expect.objectContaining({
          model: 'gpt-4',
          prompt: request.prompt,
          sessionId: 'session-123',
        }),
      });

      expect(mockCodeInterfaceService.trackRequest).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          prompt: request.prompt,
          type: 'code_generation',
        })
      );

      expect(mockCodeInterfaceService.completeRequest).toHaveBeenCalledWith(
        'req-123',
        expect.objectContaining({
          success: true,
          tokensUsed: expect.any(Number),
          responseTime: expect.any(Number),
        })
      );
    });

    it('should handle different programming languages', async () => {
      const languages = ['javascript', 'typescript', 'python', 'java', 'go', 'rust'];
      
      for (const language of languages) {
        mockLLMProvider.generateText.mockResolvedValueOnce(`// ${language} code here`);
        
        const result = await autocoderService.generateCode({
          prompt: `Create a simple function in ${language}`,
          language,
          sessionId: 'session-123',
          userId: 'user-123',
        });
        
        expect(result.language).toBe(language);
        expect(result.content).toContain(`// ${language} code here`);
      }
    });

    it('should handle different frameworks', async () => {
      const frameworks = ['react', 'vue', 'angular', 'svelte', 'express', 'fastapi'];
      
      for (const framework of frameworks) {
        mockLLMProvider.generateText.mockResolvedValueOnce(`// ${framework} specific code`);
        
        const result = await autocoderService.generateCode({
          prompt: `Create a component using ${framework}`,
          language: 'typescript',
          framework,
          sessionId: 'session-123',
          userId: 'user-123',
        });
        
        expect(result.framework).toBe(framework);
        expect(result.content).toContain(`// ${framework} specific code`);
      }
    });

    it('should include context from previous messages', async () => {
      const request = {
        prompt: 'Add error handling to the previous function',
        language: 'javascript',
        sessionId: 'session-123',
        userId: 'user-123',
        context: [
          { role: 'user', content: 'Create a function to fetch user data' },
          { role: 'assistant', content: 'async function fetchUser(id) { return await api.getUser(id); }' },
        ],
      };

      mockLLMProvider.generateText.mockResolvedValueOnce(`
async function fetchUser(id) {
  try {
    if (!id) throw new Error('User ID is required');
    return await api.getUser(id);
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
}`);

      const result = await autocoderService.generateCode(request);
      
      expect(result.content).toContain('try');
      expect(result.content).toContain('catch');
      expect(mockLLMProvider.generateText).toHaveBeenCalledWith(
        expect.stringContaining('Create a function to fetch user data')
      );
    });

    it('should handle generation errors gracefully', async () => {
      mockLLMProvider.generateText.mockRejectedValueOnce(new Error('API rate limit exceeded'));
      
      const request = {
        prompt: 'Create a simple function',
        language: 'javascript',
        sessionId: 'session-123',
        userId: 'user-123',
      };

      await expect(autocoderService.generateCode(request)).rejects.toThrow('API rate limit exceeded');
      
      expect(mockCodeInterfaceService.completeRequest).toHaveBeenCalledWith(
        'req-123',
        expect.objectContaining({
          success: false,
          error: 'API rate limit exceeded',
        })
      );

      expect(mockErrorLogService.logError).toHaveBeenCalledWith(
        'Code generation failed',
        expect.any(Error),
        expect.objectContaining({
          prompt: request.prompt,
          sessionId: 'session-123',
        }),
        'autocoder'
      );
    });
  });

  describe('code analysis', () => {
    beforeEach(async () => {
      await autocoderService.start();
    });

    it('should analyze code structure and quality', async () => {
      const codeToAnalyze = `
function calculateTotal(items) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}`;

      mockLLMProvider.analyzeCode.mockResolvedValueOnce({
        language: 'javascript',
        complexity: 'low',
        maintainability: 'good',
        suggestions: [
          'Use const/let instead of var',
          'Consider using array methods like reduce()',
          'Add input validation',
        ],
        metrics: {
          lines: 6,
          functions: 1,
          cyclomaticComplexity: 2,
        },
        issues: [
          {
            type: 'warning',
            message: 'Using var instead of const/let',
            line: 2,
            severity: 'medium',
          },
        ],
      });

      const result = await autocoderService.analyzeCode({
        code: codeToAnalyze,
        language: 'javascript',
        sessionId: 'session-123',
        userId: 'user-123',
      });

      expect(result).toEqual({
        language: 'javascript',
        complexity: 'low',
        maintainability: 'good',
        suggestions: expect.arrayContaining([
          'Use const/let instead of var',
          'Consider using array methods like reduce()',
        ]),
        metrics: expect.objectContaining({
          lines: 6,
          functions: 1,
          cyclomaticComplexity: 2,
        }),
        issues: expect.arrayContaining([
          expect.objectContaining({
            type: 'warning',
            message: 'Using var instead of const/let',
            severity: 'medium',
          }),
        ]),
        processingTime: expect.any(Number),
        tokensUsed: expect.any(Number),
      });

      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'code_analyzed',
        expect.objectContaining({
          language: 'javascript',
          complexity: 'low',
          linesOfCode: expect.any(Number),
          issuesFound: 1,
        }),
        'autocoder'
      );
    });

    it('should handle analysis when disabled', async () => {
      const disabledService = new AutocoderService({
        ...mockOptions,
        enableCodeAnalysis: false,
      });
      
      await disabledService.start();
      
      const result = await disabledService.analyzeCode({
        code: 'console.log("test");',
        language: 'javascript',
        sessionId: 'session-123',
        userId: 'user-123',
      });

      expect(result).toEqual({
        language: 'javascript',
        message: 'Code analysis is disabled',
        processingTime: expect.any(Number),
        tokensUsed: 0,
      });
    });

    it('should detect different programming languages', async () => {
      const codeSnippets = [
        { code: 'print("Hello, World!")', expected: 'python' },
        { code: 'console.log("Hello, World!");', expected: 'javascript' },
        { code: 'System.out.println("Hello, World!");', expected: 'java' },
        { code: 'fmt.Println("Hello, World!")', expected: 'go' },
      ];

      for (const snippet of codeSnippets) {
        mockLLMProvider.analyzeCode.mockResolvedValueOnce({
          language: snippet.expected,
          complexity: 'low',
          suggestions: [],
          metrics: { lines: 1 },
          issues: [],
        });

        const result = await autocoderService.analyzeCode({
          code: snippet.code,
          sessionId: 'session-123',
          userId: 'user-123',
        });

        expect(result.language).toBe(snippet.expected);
      }
    });
  });

  describe('code explanation', () => {
    beforeEach(async () => {
      await autocoderService.start();
    });

    it('should explain code functionality', async () => {
      const codeToExplain = `
const fibonacci = (n) => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
};`;

      mockLLMProvider.explainCode.mockResolvedValueOnce(`
This is a recursive implementation of the Fibonacci sequence function:

1. It takes a parameter 'n' representing the position in the sequence
2. Base case: if n is 0 or 1, it returns n directly
3. Recursive case: it returns the sum of the two previous Fibonacci numbers
4. Time complexity is O(2^n) which is inefficient for large values

The function calculates Fibonacci numbers but has exponential time complexity due to redundant calculations.
`);

      const result = await autocoderService.explainCode({
        code: codeToExplain,
        language: 'javascript',
        sessionId: 'session-123',
        userId: 'user-123',
        level: 'detailed',
      });

      expect(result).toEqual({
        explanation: expect.stringContaining('recursive implementation'),
        keyPoints: expect.arrayContaining([
          expect.stringContaining('Base case'),
          expect.stringContaining('Recursive case'),
        ]),
        complexity: expect.objectContaining({
          time: expect.stringContaining('O(2^n)'),
          description: expect.stringContaining('exponential'),
        }),
        suggestions: expect.arrayContaining([
          expect.stringContaining('memoization'),
        ]),
        processingTime: expect.any(Number),
        tokensUsed: expect.any(Number),
      });

      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'code_explained',
        expect.objectContaining({
          language: 'javascript',
          level: 'detailed',
          codeLength: expect.any(Number),
        }),
        'autocoder'
      );
    });

    it('should provide explanations at different levels', async () => {
      const levels = ['basic', 'detailed', 'expert'];
      
      for (const level of levels) {
        mockLLMProvider.explainCode.mockResolvedValueOnce(`${level} level explanation`);
        
        const result = await autocoderService.explainCode({
          code: 'const x = 5;',
          language: 'javascript',
          sessionId: 'session-123',
          userId: 'user-123',
          level,
        });

        expect(result.explanation).toContain(`${level} level explanation`);
      }
    });
  });

  describe('artifact generation', () => {
    beforeEach(async () => {
      await autocoderService.start();
    });

    it('should generate and store artifacts', async () => {
      const request = {
        prompt: 'Create a complete REST API with Express',
        language: 'javascript',
        framework: 'express',
        sessionId: 'session-123',
        userId: 'user-123',
        projectId: 'project-123',
      };

      mockLLMProvider.generateText.mockResolvedValueOnce(`
// server.js
const express = require('express');
const app = express();

app.use(express.json());

app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

// package.json
{
  "name": "api-server",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.0"
  }
}
`);

      const result = await autocoderService.generateCode(request);
      
      expect(result.artifacts).toHaveLength(2);
      expect(result.artifacts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'server.js',
            type: 'code',
            content: expect.stringContaining('express'),
          }),
          expect.objectContaining({
            name: 'package.json',
            type: 'configuration',
            content: expect.stringContaining('"express"'),
          }),
        ])
      );

      expect(mockArtifactStorageService.storeArtifact).toHaveBeenCalledTimes(2);
    });

    it('should handle artifact storage when disabled', async () => {
      const disabledService = new AutocoderService({
        ...mockOptions,
        enableArtifactGeneration: false,
      });
      
      await disabledService.start();
      
      mockLLMProvider.generateText.mockResolvedValueOnce('const x = 5;');
      
      const result = await disabledService.generateCode({
        prompt: 'Create a variable',
        language: 'javascript',
        sessionId: 'session-123',
        userId: 'user-123',
      });

      expect(result.artifacts).toEqual([]);
      expect(mockArtifactStorageService.storeArtifact).not.toHaveBeenCalled();
    });

    it('should handle different artifact types', async () => {
      const artifacts = [
        { extension: '.js', type: 'code' },
        { extension: '.ts', type: 'code' },
        { extension: '.json', type: 'configuration' },
        { extension: '.md', type: 'documentation' },
        { extension: '.test.js', type: 'test' },
        { extension: '.yml', type: 'configuration' },
      ];

      for (const artifact of artifacts) {
        const filename = `test${artifact.extension}`;
        const content = `// ${filename} content`;
        
        mockLLMProvider.generateText.mockResolvedValueOnce(content);
        
        const result = await autocoderService.generateCode({
          prompt: `Create a ${filename} file`,
          language: 'javascript',
          sessionId: 'session-123',
          userId: 'user-123',
        });

        const generatedArtifact = result.artifacts.find(a => a.name === filename);
        expect(generatedArtifact?.type).toBe(artifact.type);
      }
    });
  });

  describe('refactoring', () => {
    beforeEach(async () => {
      await autocoderService.start();
    });

    it('should refactor code based on instructions', async () => {
      const originalCode = `
function calculateTotal(items) {
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}`;

      const instructions = 'Convert to modern ES6+ syntax using array methods';

      mockLLMProvider.generateText.mockResolvedValueOnce(`
const calculateTotal = (items) => {
  return items.reduce((total, item) => total + item.price, 0);
};`);

      const result = await autocoderService.refactorCode({
        code: originalCode,
        instructions,
        language: 'javascript',
        sessionId: 'session-123',
        userId: 'user-123',
      });

      expect(result).toEqual({
        refactoredCode: expect.stringContaining('reduce'),
        changes: expect.arrayContaining([
          expect.stringContaining('Converted to arrow function'),
          expect.stringContaining('Replaced for loop with reduce'),
        ]),
        improvements: expect.arrayContaining([
          expect.stringContaining('More functional approach'),
          expect.stringContaining('Reduced code complexity'),
        ]),
        processingTime: expect.any(Number),
        tokensUsed: expect.any(Number),
      });

      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'code_refactored',
        expect.objectContaining({
          language: 'javascript',
          originalLength: expect.any(Number),
          refactoredLength: expect.any(Number),
          instructions,
        }),
        'autocoder'
      );
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await autocoderService.start();
    });

    it('should handle LLM provider errors gracefully', async () => {
      mockLLMProvider.generateText.mockRejectedValueOnce(new Error('LLM service unavailable'));
      
      await expect(autocoderService.generateCode({
        prompt: 'Test prompt',
        language: 'javascript',
        sessionId: 'session-123',
        userId: 'user-123',
      })).rejects.toThrow('LLM service unavailable');

      expect(mockErrorLogService.logError).toHaveBeenCalledWith(
        'Code generation failed',
        expect.any(Error),
        expect.any(Object),
        'autocoder'
      );
    });

    it('should validate input parameters', async () => {
      await expect(autocoderService.generateCode({
        prompt: '', // Empty prompt
        language: 'javascript',
        sessionId: 'session-123',
        userId: 'user-123',
      })).rejects.toThrow('Prompt cannot be empty');

      await expect(autocoderService.generateCode({
        prompt: 'Valid prompt',
        language: 'invalid-language' as any,
        sessionId: 'session-123',
        userId: 'user-123',
      })).rejects.toThrow('Unsupported language');
    });

    it('should handle artifact storage failures gracefully', async () => {
      mockArtifactStorageService.storeArtifact.mockRejectedValueOnce(new Error('Storage failed'));
      
      mockLLMProvider.generateText.mockResolvedValueOnce('const x = 5;');
      
      const result = await autocoderService.generateCode({
        prompt: 'Create a variable',
        language: 'javascript',
        sessionId: 'session-123',
        userId: 'user-123',
      });

      // Should still return generated code even if artifact storage fails
      expect(result.content).toContain('const x = 5');
      expect(mockErrorLogService.logError).toHaveBeenCalledWith(
        'Failed to store artifact',
        expect.any(Error),
        expect.any(Object),
        'autocoder'
      );
    });
  });

  describe('stop and cleanup', () => {
    beforeEach(async () => {
      await autocoderService.start();
    });

    it('should stop gracefully', async () => {
      await expect(autocoderService.stop()).resolves.not.toThrow();
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'autocoder_service_stopped',
        expect.objectContaining({
          uptime: expect.any(Number),
        }),
        'autocoder'
      );
    });

    it('should handle stop errors gracefully', async () => {
      // Mock cleanup to fail
      const originalCleanup = (autocoderService as any).cleanup;
      (autocoderService as any).cleanup = mock(() => Promise.reject(new Error('Cleanup failed')));
      
      await expect(autocoderService.stop()).resolves.not.toThrow();
      expect(mockErrorLogService.logError).toHaveBeenCalledWith(
        'Error during autocoder service cleanup',
        expect.any(Error),
        {},
        'autocoder'
      );
      
      // Restore original function
      (autocoderService as any).cleanup = originalCleanup;
    });

    it('should save final statistics on stop', async () => {
      // Generate some activity
      mockLLMProvider.generateText.mockResolvedValue('test code');
      
      await autocoderService.generateCode({
        prompt: 'Test prompt',
        language: 'javascript',
        sessionId: 'session-123',
        userId: 'user-123',
      });

      await autocoderService.stop();
      
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'autocoder_service_stopped',
        expect.objectContaining({
          totalRequests: expect.any(Number),
          totalTokensUsed: expect.any(Number),
          uptime: expect.any(Number),
        }),
        'autocoder'
      );
    });
  });
});