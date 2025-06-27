import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  elizaLogger,
} from '@elizaos/core';
import type { UUID } from '@elizaos/core';
import type { GitWorkflowManager } from '../services/GitWorkflowManager.js';
import type { E2BAgentOrchestrator } from '../services/E2BAgentOrchestrator.js';

interface CodeReviewRequest {
  taskId: string;
  prNumber?: number;
  reviewType: 'security' | 'quality' | 'performance' | 'comprehensive';
  files?: string[];
  focusAreas?: string[];
}

interface ReviewComment {
  file: string;
  line: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: string;
  message: string;
  suggestion?: string;
}

/**
 * Action for initiating code review by reviewer agents
 */
export const codeReviewAction: Action = {
  name: 'code-review',
  description: 'Initiate code review by specialized reviewer agents',

  similes: ['review code', 'check code quality', 'analyze code', 'inspect changes', 'audit code'],

  examples: [
    [
      {
        name: 'user',
        content: {
          text: 'Review the code changes for security issues',
          type: 'text',
        },
      },
      {
        name: 'assistant',
        content: {
          text: "I'll have the reviewer agent analyze the code for security vulnerabilities...",
          type: 'text',
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Perform a comprehensive code review on PR #42',
          type: 'text',
        },
      },
      {
        name: 'assistant',
        content: {
          text: 'Starting comprehensive code review for PR #42. The reviewer agent will check code quality, security, and performance...',
          type: 'text',
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    // Check if Git workflow manager is available
    const gitWorkflow = runtime.getService('git-workflow-manager');
    if (!gitWorkflow) {
      elizaLogger.warn('Git workflow manager not available');
      return false;
    }

    // Check if message contains review request
    const text = message.content?.text?.toLowerCase() || '';
    const keywords = ['review', 'check', 'analyze', 'inspect', 'audit', 'examine'];

    return keywords.some((keyword) => text.includes(keyword));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      elizaLogger.info('Starting code review handler');

      // Get services
      const gitWorkflow = runtime.getService('git-workflow-manager') as GitWorkflowManager;
      const orchestrator = runtime.getService(
        'e2b-agent-orchestrator'
      ) as E2BAgentOrchestrator | null;

      if (!gitWorkflow) {
        await callback?.({
          text: 'Code review service is not available. Please ensure the Git workflow manager is configured.',
          type: 'text',
        });
        return false;
      }

      // Parse review request
      const request = parseReviewRequest(message.content?.text || '', state);

      if (!request.taskId && !request.prNumber) {
        await callback?.({
          text: 'Please specify either a task ID or PR number for the code review.',
          type: 'text',
        });
        return false;
      }

      await callback?.({
        text: `🔍 Starting ${request.reviewType} code review${request.prNumber ? ` for PR #${request.prNumber}` : ''}...`,
        type: 'text',
      });

      // Get workflow information
      let workflow;
      if (request.taskId) {
        workflow = await gitWorkflow.getWorkflow(request.taskId as UUID);
      } else if (request.prNumber) {
        // Find workflow by PR number
        const workflows = await gitWorkflow.listWorkflows();
        workflow = workflows.find((w) => w.prNumber === request.prNumber);
      }

      if (!workflow) {
        await callback?.({
          text: 'Could not find the specified workflow or PR.',
          type: 'text',
        });
        return false;
      }

      // Check if reviewer agent exists
      const reviewerAgent = Array.from(workflow.agents.values()).find(
        (agent) => agent.role === 'reviewer'
      );

      if (!reviewerAgent) {
        await callback?.({
          text: 'No reviewer agent found for this workflow. Would you like me to spawn one?',
          type: 'text',
        });
        return false;
      }

      // Perform the review
      const reviewResults = await performCodeReview(gitWorkflow, workflow, request, callback);

      // Format and send results
      await callback?.({
        text: formatReviewResults(reviewResults),
        type: 'text',
      });

      // Update workflow status if all reviews pass
      if (reviewResults.approved) {
        await gitWorkflow.requestReview(workflow.taskId, reviewerAgent.agentId);
        await callback?.({
          text: '✅ Code review completed. The changes look good!',
          type: 'text',
        });
      } else {
        await callback?.({
          text: `⚠️ Code review completed with ${reviewResults.totalIssues} issues found. Please address them before merging.`,
          type: 'text',
        });
      }

      return true;
    } catch (error) {
      elizaLogger.error('Error in code review handler:', error);

      await callback?.({
        text: `Error performing code review: ${error instanceof Error ? error.message : String(error)}`,
        type: 'text',
      });

      return false;
    }
  },
};

// Helper functions

function parseReviewRequest(text: string, state?: State): CodeReviewRequest {
  const lowerText = text.toLowerCase();

  // Extract PR number if mentioned
  const prMatch = text.match(/pr\s*#?(\d+)/i);
  const prNumber = prMatch ? parseInt(prMatch[1]) : undefined;

  // Determine review type
  let reviewType: CodeReviewRequest['reviewType'] = 'comprehensive';
  if (lowerText.includes('security')) {
    reviewType = 'security';
  } else if (lowerText.includes('performance')) {
    reviewType = 'performance';
  } else if (lowerText.includes('quality')) {
    reviewType = 'quality';
  }

  // Extract focus areas
  const focusAreas = [];
  if (lowerText.includes('sql') || lowerText.includes('database')) {
    focusAreas.push('sql-injection');
  }
  if (lowerText.includes('auth') || lowerText.includes('authentication')) {
    focusAreas.push('authentication');
  }
  if (lowerText.includes('input') || lowerText.includes('validation')) {
    focusAreas.push('input-validation');
  }

  return {
    taskId: state?.taskId || '',
    prNumber,
    reviewType,
    focusAreas: focusAreas.length > 0 ? focusAreas : undefined,
  };
}

async function performCodeReview(
  gitWorkflow: GitWorkflowManager,
  workflow: any,
  request: CodeReviewRequest,
  callback?: HandlerCallback
): Promise<{
  approved: boolean;
  totalIssues: number;
  comments: ReviewComment[];
  summary: string;
}> {
  // Simulate code review process
  await callback?.({
    text: '📋 Analyzing code structure...',
    type: 'text',
  });

  const comments: ReviewComment[] = [];

  // Security review
  if (request.reviewType === 'security' || request.reviewType === 'comprehensive') {
    await callback?.({
      text: '🔒 Checking for security vulnerabilities...',
      type: 'text',
    });

    // Simulate finding security issues
    comments.push({
      file: 'src/api/auth.ts',
      line: 45,
      severity: 'warning',
      category: 'security',
      message: 'Potential SQL injection vulnerability in user query',
      suggestion: 'Use parameterized queries or an ORM to prevent SQL injection',
    });
  }

  // Code quality review
  if (request.reviewType === 'quality' || request.reviewType === 'comprehensive') {
    await callback?.({
      text: '✨ Evaluating code quality...',
      type: 'text',
    });

    comments.push({
      file: 'src/components/UserList.tsx',
      line: 23,
      severity: 'info',
      category: 'quality',
      message: 'Function complexity is high (cyclomatic complexity: 12)',
      suggestion: 'Consider breaking this function into smaller, more focused functions',
    });
  }

  // Performance review
  if (request.reviewType === 'performance' || request.reviewType === 'comprehensive') {
    await callback?.({
      text: '⚡ Analyzing performance implications...',
      type: 'text',
    });

    comments.push({
      file: 'src/services/DataService.ts',
      line: 89,
      severity: 'warning',
      category: 'performance',
      message: 'N+1 query pattern detected in data fetching',
      suggestion: 'Use eager loading or batch queries to reduce database calls',
    });
  }

  // Calculate results
  const criticalIssues = comments.filter((c) => c.severity === 'critical').length;
  const errorIssues = comments.filter((c) => c.severity === 'error').length;
  const approved = criticalIssues === 0 && errorIssues === 0;

  return {
    approved,
    totalIssues: comments.length,
    comments,
    summary: generateReviewSummary(comments, request.reviewType),
  };
}

function generateReviewSummary(comments: ReviewComment[], reviewType: string): string {
  const byCategory = comments.reduce(
    (acc, comment) => {
      acc[comment.category] = (acc[comment.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const bySeverity = comments.reduce(
    (acc, comment) => {
      acc[comment.severity] = (acc[comment.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  let summary = `${reviewType.charAt(0).toUpperCase() + reviewType.slice(1)} Review Summary:\n\n`;

  summary += 'Issues by Category:\n';
  Object.entries(byCategory).forEach(([category, count]) => {
    summary += `  - ${category}: ${count} issue${count > 1 ? 's' : ''}\n`;
  });

  summary += '\nIssues by Severity:\n';
  Object.entries(bySeverity).forEach(([severity, count]) => {
    const emoji =
      {
        critical: '🔴',
        error: '🟠',
        warning: '🟡',
        info: '🔵',
      }[severity] || '⚪';
    summary += `  ${emoji} ${severity}: ${count}\n`;
  });

  return summary;
}

function formatReviewResults(results: {
  approved: boolean;
  totalIssues: number;
  comments: ReviewComment[];
  summary: string;
}): string {
  let output = '## Code Review Results\n\n';

  output += results.summary + '\n';

  if (results.comments.length > 0) {
    output += '\n### Detailed Findings:\n\n';

    results.comments.forEach((comment, index) => {
      const emoji =
        {
          critical: '🔴',
          error: '🟠',
          warning: '🟡',
          info: '🔵',
        }[comment.severity] || '⚪';

      output += `${index + 1}. ${emoji} **${comment.severity.toUpperCase()}** - ${comment.category}\n`;
      output += `   📁 \`${comment.file}:${comment.line}\`\n`;
      output += `   ${comment.message}\n`;
      if (comment.suggestion) {
        output += `   💡 **Suggestion:** ${comment.suggestion}\n`;
      }
      output += '\n';
    });
  }

  return output;
}
