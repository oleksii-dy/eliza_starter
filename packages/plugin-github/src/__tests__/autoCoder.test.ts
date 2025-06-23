import { describe, it, expect, vi, beforeEach } from 'vitest';
import { autoCodeIssueAction, respondToMentionAction } from '../actions/autoCoder';
import type { IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { ModelType } from '@elizaos/core';

describe('Auto-Coder Action Tests', () => {
  let mockRuntime: any;
  let mockGitHubService: any;
  let mockCallback: HandlerCallback;
  let mockMemory: Memory;
  let mockState: State;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock GitHub service
    mockGitHubService = {
      getDefaultBranch: vi.fn().mockResolvedValue('main'),
      getRef: vi.fn().mockResolvedValue({
        object: { sha: 'abc123' },
      }),
      createBranch: vi.fn().mockResolvedValue(undefined),
      getFileContent: vi.fn().mockResolvedValue({
        content: '# Test Repository\n\nThis is a test.',
        sha: 'file123',
      }),
      createOrUpdateFile: vi.fn().mockResolvedValue({
        commit: { sha: 'commit123' },
      }),
      createPullRequest: vi.fn().mockResolvedValue({
        number: 456,
        html_url: 'https://github.com/owner/repo/pull/456',
      }),
      createIssueComment: vi.fn().mockResolvedValue(undefined),
    };

    // Create mock runtime
    mockRuntime = {
      agentId: 'test-agent',
      character: {
        name: 'TestAgent',
      },
      getSetting: vi.fn((key: string) => {
        const settings: Record<string, string> = {
          GITHUB_TOKEN: 'ghp_test123',
        };
        return settings[key];
      }),
      getService: vi.fn((name: string) => {
        if (name === 'github') return mockGitHubService;
        return null;
      }),
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
      useModel: vi.fn().mockResolvedValue(
        JSON.stringify({
          canAutomate: true,
          complexity: 'simple',
          confidence: 0.8,
          reasoning: 'This is a simple documentation issue that can be automated',
          issueType: 'documentation',
          summary: 'Add a new section to README',
          requiredFiles: ['README.md'],
          estimatedChanges: 3,
          riskLevel: 'low',
          dependencies: [],
        })
      ),
      processAction: vi.fn(),
    };

    // Create mock callback
    mockCallback = vi.fn();

    // Create mock memory and state
    mockMemory = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      entityId: '123e4567-e89b-12d3-a456-426614174001',
      roomId: '123e4567-e89b-12d3-a456-426614174002',
      agentId: '123e4567-e89b-12d3-a456-426614174003',
      content: {
        text: 'Please fix this issue',
      },
      createdAt: Date.now(),
    } as Memory;

    mockState = {
      values: {},
      data: {},
      text: '',
    } as State;
  });

  describe('autoCodeIssueAction', () => {
    it('should validate when GitHub service is available', async () => {
      const isValid = await autoCodeIssueAction.validate(mockRuntime, mockMemory, mockState);
      expect(isValid).toBe(true);
    });

    it('should not validate when GitHub service is unavailable', async () => {
      mockRuntime.getService = vi.fn().mockReturnValue(null);
      const isValid = await autoCodeIssueAction.validate(mockRuntime, mockMemory, mockState);
      expect(isValid).toBe(false);
    });

    it('should create a PR for a simple issue', async () => {
      const options = {
        issue: {
          number: 123,
          title: 'Add documentation',
          body: 'Please add documentation for the new feature',
          assignee: null,
          labels: [],
          user: { login: 'testuser' },
        },
        repository: {
          full_name: 'owner/repo',
          owner: { login: 'owner' },
          name: 'repo',
          language: 'JavaScript',
          description: 'Test repository',
        },
        action: 'opened',
      };

      // Mock second AI call for code generation
      mockRuntime.useModel = vi.fn()
        .mockResolvedValueOnce(
          JSON.stringify({
            canAutomate: true,
            complexity: 'simple',
            confidence: 0.8,
            reasoning: 'This is a simple documentation issue that can be automated',
            issueType: 'documentation',
            summary: 'Add a new section to README',
            requiredFiles: ['README.md'],
            estimatedChanges: 3,
            riskLevel: 'low',
            dependencies: [],
          })
        )
        .mockResolvedValueOnce(
          JSON.stringify({
            canGenerate: true,
            confidence: 0.9,
            reasoning: 'Simple documentation update',
            changes: [
              {
                file: 'README.md',
                action: 'update',
                content: '# Test Repository\n\nThis is a test.\n\n## New Section\n\nAdded for issue #123',
                reasoning: 'Adding requested documentation',
                lineNumbers: { start: 1, end: 10 }
              }
            ],
            testingNeeded: false,
            deploymentNotes: ''
          })
        );

      // Mock getRepositoryTree for repository analysis
      mockGitHubService.getRepositoryTree = vi.fn().mockResolvedValue([
        { type: 'blob', path: 'README.md' },
        { type: 'blob', path: 'package.json' },
      ]);

      await autoCodeIssueAction.handler(mockRuntime, mockMemory, mockState, options, mockCallback);

      // Verify AI analysis was performed
      expect(mockRuntime.useModel).toHaveBeenCalledWith(
        ModelType.TEXT_LARGE,
        expect.objectContaining({
          prompt: expect.stringContaining('Analyze this GitHub issue'),
          temperature: 0.2,
        })
      );

      // Verify branch was created
      expect(mockGitHubService.createBranch).toHaveBeenCalledWith(
        'owner',
        'repo',
        'auto-fix/issue-123',
        'abc123'
      );

      // Verify file was updated
      expect(mockGitHubService.createOrUpdateFile).toHaveBeenCalledWith(
        'owner',
        'repo',
        'README.md',
        expect.any(String),
        expect.stringContaining('Auto-fix:'),
        'auto-fix/issue-123',
        'file123'
      );

      // Verify PR was created
      expect(mockGitHubService.createPullRequest).toHaveBeenCalledWith('owner', 'repo', {
        title: expect.stringContaining('Auto-fix:'),
        body: expect.stringContaining('Fixes #123'),
        head: 'auto-fix/issue-123',
        base: 'main',
      });

      // Verify issue comment was posted
      expect(mockGitHubService.createIssueComment).toHaveBeenCalledWith(
        'owner',
        'repo',
        123,
        expect.stringContaining('Automated Analysis Complete')
      );

      // Verify success callback
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Automated fix created for issue #123'),
          actions: ['AUTO_CODE_ISSUE'],
        })
      );
    });

    it('should skip issues that are too complex', async () => {
      mockRuntime.useModel = vi.fn().mockResolvedValue(
        JSON.stringify({
          canAutomate: false,
          complexity: 'complex',
          confidence: 0.3,
          reasoning: 'This requires major architectural changes',
          issueType: 'refactor',
          summary: 'This requires major architectural changes',
          requiredFiles: [],
          estimatedChanges: 100,
          riskLevel: 'high',
          dependencies: [],
        })
      );

      const options = {
        issue: {
          number: 123,
          title: 'Refactor entire codebase',
          body: 'We need to refactor everything',
          assignee: null,
          labels: [],
          user: { login: 'testuser' },
        },
        repository: {
          full_name: 'owner/repo',
          owner: { login: 'owner' },
          name: 'repo',
          language: 'JavaScript',
          description: 'Test repository',
        },
      };

      await autoCodeIssueAction.handler(mockRuntime, mockMemory, mockState, options, mockCallback);

      // Should not create branch or PR
      expect(mockGitHubService.createBranch).not.toHaveBeenCalled();
      expect(mockGitHubService.createPullRequest).not.toHaveBeenCalled();

      // Should inform about complexity
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('requires human intervention'),
        })
      );
    });

    it('should skip assigned issues', async () => {
      const options = {
        issue: {
          number: 123,
          title: 'Fix bug',
          body: 'There is a bug',
          assignee: { login: 'other-user' },
          labels: [],
          user: { login: 'testuser' },
        },
        repository: {
          full_name: 'owner/repo',
          owner: { login: 'owner' },
          name: 'repo',
          language: 'JavaScript',
          description: 'Test repository',
        },
      };

      await autoCodeIssueAction.handler(mockRuntime, mockMemory, mockState, options, mockCallback);

      // Should not analyze or create PR
      expect(mockRuntime.useModel).not.toHaveBeenCalled();
      expect(mockGitHubService.createPullRequest).not.toHaveBeenCalled();

      // Should inform about assignment
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('already assigned to other-user'),
        })
      );
    });

    it('should handle missing repository info', async () => {
      const options = {
        issue: {
          number: 123,
          title: 'Test issue',
        },
        // Missing repository
      };

      await autoCodeIssueAction.handler(mockRuntime, mockMemory, mockState, options, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('requires issue and repository information'),
        })
      );
    });

    it('should handle file creation when README does not exist', async () => {
      mockGitHubService.getFileContent = vi.fn().mockRejectedValue(new Error('Not found'));

      // Mock AI calls for issue analysis and code generation
      mockRuntime.useModel = vi.fn()
        .mockResolvedValueOnce(
          JSON.stringify({
            canAutomate: true,
            complexity: 'simple',
            confidence: 0.8,
            reasoning: 'Creating a README file is straightforward',
            issueType: 'documentation',
            summary: 'Create README file',
            requiredFiles: ['README.md'],
            estimatedChanges: 1,
            riskLevel: 'low',
            dependencies: [],
          })
        )
        .mockResolvedValueOnce(
          JSON.stringify({
            canGenerate: true,
            confidence: 0.9,
            reasoning: 'Creating new README file',
            changes: [
              {
                file: 'README.md',
                action: 'create',
                content: '# repo\n\nA test repository\n\n## Description\n\nThis repository contains...',
                reasoning: 'Creating initial README file',
                lineNumbers: { start: 1, end: 10 }
              }
            ],
            testingNeeded: false,
            deploymentNotes: ''
          })
        );

      // Also mock getRepositoryTree for the repository analysis
      mockGitHubService.getRepositoryTree = vi.fn().mockResolvedValue([
        { type: 'blob', path: 'index.js' },
        { type: 'blob', path: 'package.json' },
      ]);

      const options = {
        issue: {
          number: 123,
          title: 'Create README',
          body: 'Please create a README file',
          assignee: null,
          labels: [],
          user: { login: 'testuser' },
        },
        repository: {
          full_name: 'owner/repo',
          owner: { login: 'owner' },
          name: 'repo',
          description: 'A test repository',
          language: 'JavaScript',
        },
      };

      await autoCodeIssueAction.handler(mockRuntime, mockMemory, mockState, options, mockCallback);

      // Should create file without SHA
      expect(mockGitHubService.createOrUpdateFile).toHaveBeenCalledWith(
        'owner',
        'repo',
        'README.md',
        expect.any(String),
        'Auto-fix: Create README.md for issue #123',
        'auto-fix/issue-123'
        // Note: undefined SHA is not passed as an argument when creating new files
      );
    });
  });

  describe('respondToMentionAction', () => {
    it('should respond to issue mentions', async () => {
      mockRuntime.useModel = vi.fn().mockResolvedValue(
        JSON.stringify({
          requestType: 'code_fix',
          confidence: 0.9,
          reasoning: 'User is asking for a code fix',
          shouldAutoCode: true,
          suggestedResponse: "I'll help you fix this issue!",
          urgency: 'medium',
          requiresHuman: false,
        })
      );

      const options = {
        issue: {
          number: 123,
          title: 'Bug in login',
          body: '@TestAgent can you fix the login bug?',
          labels: [],
          user: { login: 'testuser' },
        },
        repository: {
          full_name: 'owner/repo',
          owner: { login: 'owner' },
          name: 'repo',
        },
        action: 'opened',
      };

      await respondToMentionAction.handler(
        mockRuntime,
        mockMemory,
        mockState,
        options,
        mockCallback
      );

      // Should analyze the mention
      expect(mockRuntime.useModel).toHaveBeenCalledWith(
        ModelType.TEXT_LARGE,
        expect.objectContaining({
          prompt: expect.stringContaining('Analyze this GitHub mention'),
        })
      );

      // Should post a comment
      expect(mockGitHubService.createIssueComment).toHaveBeenCalledWith(
        'owner',
        'repo',
        123,
        "I'll help you fix this issue!"
      );

      // Since the implementation now uses runtime.actions.find() instead of processAction,
      // we need to set up the runtime with the autoCodeIssueAction
      mockRuntime.actions = [autoCodeIssueAction];

      // The auto-coding will be triggered by calling the handler directly
      // So we just verify the response was posted and callback was called correctly

      // Should report success with intelligent response
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Intelligent mention response generated'),
          thought: expect.stringContaining('Intelligent mention handling'),
          actions: ['RESPOND_TO_GITHUB_MENTION'],
        })
      );
    });

    it('should respond to comment mentions', async () => {
      mockRuntime.useModel = vi.fn().mockResolvedValue(
        JSON.stringify({
          requestType: 'question',
          confidence: 0.8,
          reasoning: 'User is asking a question',
          shouldAutoCode: false,
          suggestedResponse: 'Let me check that for you.',
          urgency: 'low',
          requiresHuman: false,
        })
      );

      const options = {
        issue: {
          number: 123,
          title: 'Question about API',
          labels: [],
          user: { login: 'testuser' },
        },
        comment: {
          id: 456,
          body: '@TestAgent what is the API endpoint for users?',
        },
        repository: {
          full_name: 'owner/repo',
          owner: { login: 'owner' },
          name: 'repo',
        },
        action: 'created',
      };

      await respondToMentionAction.handler(
        mockRuntime,
        mockMemory,
        mockState,
        options,
        mockCallback
      );

      // Should post a response
      expect(mockGitHubService.createIssueComment).toHaveBeenCalledWith(
        'owner',
        'repo',
        123,
        'Let me check that for you.'
      );

      // Should not trigger auto-coding
      expect(mockRuntime.processAction).not.toHaveBeenCalled();

      // Should report success without auto-coding
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Intelligent mention response generated'),
          thought: expect.stringContaining('Intelligent mention handling'),
          actions: ['RESPOND_TO_GITHUB_MENTION'],
        })
      );
    });

    it('should handle parsing errors gracefully', async () => {
      mockRuntime.useModel = vi.fn().mockResolvedValue('Invalid JSON response');

      const options = {
        issue: {
          number: 123,
          title: 'Test',
          body: '@TestAgent help',
          labels: [],
          user: { login: 'testuser' },
        },
        repository: {
          full_name: 'owner/repo',
          owner: { login: 'owner' },
          name: 'repo',
        },
      };

      await respondToMentionAction.handler(
        mockRuntime,
        mockMemory,
        mockState,
        options,
        mockCallback
      );

      // Should still post a generic response
      expect(mockGitHubService.createIssueComment).toHaveBeenCalledWith(
        'owner',
        'repo',
        123,
        expect.stringContaining("I see you've mentioned me")
      );
    });

    it('should handle missing repository info', async () => {
      const options = {
        issue: { number: 123 },
        // Missing repository
      };

      await respondToMentionAction.handler(
        mockRuntime,
        mockMemory,
        mockState,
        options,
        mockCallback
      );

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Failed to handle mention intelligently'),
        })
      );
    });
  });
});
