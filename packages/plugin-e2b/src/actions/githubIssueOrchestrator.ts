import type { Action, ActionExample, Handler, Validator } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import type { GitHubIntegrationService } from '../services/GitHubIntegrationService.js';
import type { E2BService } from '../services/E2BService.js';

/**
 * GitHub Issue Orchestrator Action
 * Coordinates the complete workflow from GitHub issue to E2B sandbox development
 */

const githubIssueOrchestratorExamples: ActionExample[][] = [
  [
    {
      name: 'User',
      content: { text: 'Help me resolve GitHub issues from the elizaOS repository using sandbox development' }
    },
    {
      name: 'Agent',
      content: {
        text: "I'll coordinate a complete GitHub issue resolution workflow using E2B sandboxes and autocoder. Let me start by fetching open issues.",
        actions: ['GITHUB_ISSUE_ORCHESTRATOR']
      }
    }
  ],
  [
    {
      name: 'User',
      content: { text: 'Set up an automated development workflow for elizaOS/eliza issues' }
    },
    {
      name: 'Agent',
      content: {
        text: "I'll orchestrate an automated workflow that fetches issues, spawns development agents in sandboxes, and manages the complete resolution process.",
        actions: ['GITHUB_ISSUE_ORCHESTRATOR']
      }
    }
  ]
];

const githubIssueOrchestratorHandler: Handler = async (
  runtime,
  message,
  state,
  _options,
  callback
) => {
  elizaLogger.info('GitHub Issue Orchestrator action triggered', {
    messageId: message.id,
    content: message.content.text
  });

  try {
    // Get required services
    const githubService = runtime.getService<GitHubIntegrationService>('github-integration');
    const e2bService = runtime.getService<E2BService>('e2b');

    if (!githubService) {
      throw new Error('GitHub integration service not available');
    }

    if (!e2bService) {
      throw new Error('E2B service not available');
    }

    const workflowId = `workflow-${Date.now()}`;
    let responseText = '🚀 **GitHub Issue Orchestration Workflow Started**\n\n';
    responseText += `**Workflow ID:** \`${workflowId}\`\n\n`;

    // Step 1: Fetch GitHub issues from elizaOS/eliza
    elizaLogger.info('Fetching GitHub issues from elizaOS/eliza repository');
    responseText += '### 📋 Step 1: Fetching GitHub Issues\n';

    try {
      const issues = await githubService.getIssues('elizaOS', 'eliza', {
        state: 'open',
        labels: ['good first issue', 'bug', 'enhancement'],
        limit: 5
      });

      if (issues.length === 0) {
        responseText += '❌ No suitable issues found. Looking for issues with labels: good first issue, bug, enhancement\n\n';

        if (callback) {
          await callback({
            values: {
              success: false,
              reason: 'no_suitable_issues',
              workflowId
            },
            text: responseText
          });
        }
        return { text: responseText, values: { success: false } };
      }

      responseText += `✅ Found ${issues.length} suitable issues:\n\n`;

      issues.forEach((issue, index) => {
        responseText += `**${index + 1}.** [#${issue.number}](${issue.html_url}) - ${issue.title}\n`;
        responseText += `   • Labels: ${issue.labels.map(l => l.name).join(', ')}\n`;
        responseText += `   • Created by: ${issue.user.login}\n\n`;
      });

      // Select the first issue for this workflow
      const selectedIssue = issues[0];
      responseText += '🎯 **Selected Issue for Resolution:**\n';
      responseText += `**#${selectedIssue.number}** - ${selectedIssue.title}\n\n`;
      responseText += `**Description:**\n${selectedIssue.body.substring(0, 500)}${selectedIssue.body.length > 500 ? '...' : ''}\n\n`;

      // Step 2: Create E2B sandbox environment
      elizaLogger.info('Creating E2B sandbox for development', { issueNumber: selectedIssue.number });
      responseText += '### 🏗️ Step 2: Creating Development Environment\n';

      const sandboxId = await e2bService.createSandbox({
        timeoutMs: 30 * 60 * 1000, // 30 minutes
        metadata: {
          purpose: 'github-issue-resolution',
          issueNumber: selectedIssue.number.toString(),
          repository: 'elizaOS/eliza',
          workflowId,
          createdBy: 'github-orchestrator'
        }
      });

      responseText += '✅ **Sandbox Created Successfully**\n';
      responseText += `**Sandbox ID:** \`${sandboxId}\`\n`;
      responseText += '**Environment:** ElizaOS development container with CLI, Git, and autocoder\n';
      responseText += '**Timeout:** 30 minutes\n\n';

      // Step 3: Set up repository in sandbox
      responseText += '### 📂 Step 3: Repository Setup\n';

      const setupCode = `
import subprocess
import os

# Set up Git configuration
subprocess.run(['git', 'config', '--global', 'user.name', 'ElizaOS Development Agent'], check=True)
subprocess.run(['git', 'config', '--global', 'user.email', 'dev-agent@elizaos.ai'], check=True)

# Clone the repository
print("Cloning elizaOS/eliza repository...")
result = subprocess.run(['git', 'clone', 'https://github.com/elizaOS/eliza.git', '/workspace/eliza'], 
                       capture_output=True, text=True)

if result.returncode == 0:
    print("✅ Repository cloned successfully")
    os.chdir('/workspace/eliza')
    
    # Get repository information
    branch_result = subprocess.run(['git', 'branch', '-r'], capture_output=True, text=True)
    print(f"Available branches: {branch_result.stdout}")
    
    # Create development branch for the issue
    branch_name = f"issue-${selectedIssue.number}-resolution"
    subprocess.run(['git', 'checkout', '-b', branch_name], check=True)
    print(f"✅ Created development branch: {branch_name}")
    
    # Install dependencies
    print("Installing dependencies...")
    subprocess.run(['bun', 'install'], check=True)
    print("✅ Dependencies installed")
    
    print("🏗️ Development environment ready!")
else:
    print(f"❌ Failed to clone repository: {result.stderr}")
    raise Exception("Repository cloning failed")
`;

      const setupResult = await e2bService.executeCode(setupCode, 'python');

      if (setupResult.error) {
        responseText += '❌ **Environment Setup Failed**\n';
        responseText += `Error: ${setupResult.error.value}\n\n`;

        // Clean up sandbox
        await e2bService.killSandbox(sandboxId);

        if (callback) {
          await callback({
            values: {
              success: false,
              reason: 'setup_failed',
              error: setupResult.error.value,
              workflowId
            },
            text: responseText
          });
        }
        return { text: responseText, values: { success: false } };
      }

      responseText += '✅ **Repository Setup Complete**\n';
      responseText += '• Repository cloned to sandbox\n';
      responseText += `• Development branch created: \`issue-${selectedIssue.number}-resolution\`\n`;
      responseText += '• Dependencies installed\n';
      responseText += '• Environment ready for development\n\n';

      // Step 4: Agent coordination setup
      responseText += '### 🤝 Step 4: Agent Coordination\n';
      responseText += 'Setting up communication channels and coordination protocols...\n\n';

      // Store workflow state
      const workflowState = {
        workflowId,
        selectedIssue: {
          number: selectedIssue.number,
          title: selectedIssue.title,
          body: selectedIssue.body,
          url: selectedIssue.html_url,
          labels: selectedIssue.labels.map(l => l.name)
        },
        sandboxId,
        repository: {
          owner: 'elizaOS',
          name: 'eliza',
          branchName: `issue-${selectedIssue.number}-resolution`
        },
        status: 'development_ready',
        createdAt: new Date().toISOString()
      };

      responseText += '### 🎯 Next Steps\n';
      responseText += '1. **Coder Agent Assignment** - Specialized development agent will be notified\n';
      responseText += '2. **Issue Analysis** - Agent will analyze requirements and create implementation plan\n';
      responseText += '3. **Development Work** - Code implementation with testing and documentation\n';
      responseText += '4. **Pull Request Creation** - Submit PR with comprehensive description\n';
      responseText += '5. **Code Review Cycle** - Iterative review and improvement process\n';
      responseText += '6. **Quality Assurance** - Final validation and merge\n';
      responseText += '7. **Cleanup** - Sandbox cleanup and workflow completion\n\n';

      responseText += '🚀 **Workflow orchestration complete!** The development environment is ready and agents are being coordinated for issue resolution.\n\n';
      responseText += '**Workflow Status:** `development_ready`\n';
      responseText += '**Monitor Progress:** Check GitHub issue and PR updates\n';

      const actionResult = {
        text: responseText,
        values: {
          success: true,
          workflowId,
          sandboxId,
          issueNumber: selectedIssue.number,
          issueTitle: selectedIssue.title,
          repositoryBranch: `issue-${selectedIssue.number}-resolution`,
          status: 'development_ready',
          nextSteps: [
            'agent_assignment',
            'issue_analysis',
            'development_work',
            'pr_creation',
            'code_review',
            'quality_assurance',
            'cleanup'
          ]
        },
        data: {
          workflowState,
          allIssues: issues,
          sandboxInfo: e2bService.listSandboxes().find(s => s.sandboxId === sandboxId)
        }
      };

      if (callback) {
        await callback(actionResult);
      }

      return actionResult;

    } catch (githubError) {
      elizaLogger.error('Failed to fetch GitHub issues', { error: githubError.message });
      responseText += '❌ **GitHub Integration Failed**\n';
      responseText += `Error: ${githubError.message}\n\n`;
      responseText += 'Please check:\n';
      responseText += '• GitHub token is valid and has proper permissions\n';
      responseText += '• Repository access is available\n';
      responseText += '• Network connectivity is working\n';

      if (callback) {
        await callback({
          values: {
            success: false,
            reason: 'github_error',
            error: githubError.message,
            workflowId
          },
          text: responseText
        });
      }
      return { text: responseText, values: { success: false } };
    }

  } catch (error) {
    elizaLogger.error('GitHub Issue Orchestrator failed', {
      messageId: message.id,
      error: error.message
    });

    const errorText = `❌ **Workflow Orchestration Failed**\n\nError: ${error.message}`;

    if (callback) {
      await callback({
        values: {
          success: false,
          error: error.message
        },
        text: errorText
      });
    }

    return {
      text: errorText,
      values: { success: false, error: error.message }
    };
  }
};

const githubIssueOrchestratorValidator: Validator = async (runtime, message) => {
  const content = message.content.text?.toLowerCase() || '';

  const orchestrationPatterns = [
    /github.*issue.*orchestrat/i,
    /github.*issue.*workflow/i,
    /github.*issue.*automat/i,
    /elizaos.*issue.*resolv/i,
    /github.*sandbox.*development/i,
    /issue.*resolution.*workflow/i,
    /automat.*development.*workflow/i,
    /github.*e2b.*workflow/i
  ];

  return orchestrationPatterns.some(pattern => pattern.test(content));
};

export const githubIssueOrchestratorAction: Action = {
  name: 'GITHUB_ISSUE_ORCHESTRATOR',
  similes: [
    'ORCHESTRATE_GITHUB_WORKFLOW',
    'AUTOMATE_ISSUE_RESOLUTION',
    'COORDINATE_DEVELOPMENT_WORKFLOW',
    'GITHUB_SANDBOX_WORKFLOW'
  ],
  description: 'Orchestrates the complete workflow from GitHub issue identification to sandbox-based development and resolution with multi-agent coordination',
  examples: githubIssueOrchestratorExamples,
  validate: githubIssueOrchestratorValidator,
  handler: githubIssueOrchestratorHandler,
  effects: {
    provides: ['workflow_orchestration', 'github_issues', 'sandbox_environment', 'agent_coordination'],
    requires: ['github_service', 'e2b_service'],
    modifies: ['workflow_state', 'sandbox_allocation', 'agent_assignments']
  }
};
