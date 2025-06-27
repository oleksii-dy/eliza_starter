import type { Action, ActionExample, Handler, Validator } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import type { AgentCommunicationBridge } from '../services/AgentCommunicationBridge.js';

/**
 * Agent Coordination Action
 * Enables real-time communication and coordination between agents in workflows
 */

const agentCoordinationExamples: ActionExample[][] = [
  [
    {
      name: 'MainAgent',
      content: { text: 'I need to coordinate with the coder agent to work on GitHub issue #123' },
    },
    {
      name: 'Agent',
      content: {
        text: "I'll establish communication with the coder agent and coordinate the work assignment for issue #123.",
        actions: ['AGENT_COORDINATION'],
      },
    },
  ],
  [
    {
      name: 'CoderAgent',
      content: { text: 'I have completed the implementation. Please review the pull request.' },
    },
    {
      name: 'Agent',
      content: {
        text: "I'll coordinate the PR review process and notify the appropriate reviewers.",
        actions: ['AGENT_COORDINATION'],
      },
    },
  ],
  [
    {
      name: 'User',
      content: { text: 'Send a status update to all agents in the workflow' },
    },
    {
      name: 'Agent',
      content: {
        text: "I'll broadcast a status update to all participating agents in the current workflow.",
        actions: ['AGENT_COORDINATION'],
      },
    },
  ],
];

const agentCoordinationHandler: Handler = async (runtime, message, state, _options, callback) => {
  elizaLogger.info('Agent Coordination action triggered', {
    messageId: message.id,
    content: message.content.text,
  });

  try {
    // Get the communication bridge service
    const communicationBridge = runtime.getService<AgentCommunicationBridge>(
      'agent-communication-bridge'
    );

    if (!communicationBridge) {
      throw new Error('Agent Communication Bridge service not available');
    }

    const content = message.content.text?.toLowerCase() || '';
    let coordinationType = 'general';
    let responseText = '';

    // Determine coordination type based on message content
    if (content.includes('assign') || content.includes('task')) {
      coordinationType = 'task_assignment';
    } else if (content.includes('status') || content.includes('update')) {
      coordinationType = 'status_update';
    } else if (
      content.includes('review') ||
      content.includes('pr') ||
      content.includes('pull request')
    ) {
      coordinationType = 'review_coordination';
    } else if (content.includes('broadcast') || content.includes('all agents')) {
      coordinationType = 'broadcast';
    } else if (content.includes('workflow') || content.includes('coordinate')) {
      coordinationType = 'workflow_management';
    }

    elizaLogger.debug('Determined coordination type', { coordinationType, content });

    switch (coordinationType) {
      case 'task_assignment': {
        responseText += '🎯 **Task Assignment Coordination**\n\n';

        // Look for issue number or task details in message
        const issueMatch = message.content.text?.match(/#(\d+)/);
        const issueNumber = issueMatch ? issueMatch[1] : null;

        // Find available coder agents
        const coderAgents = communicationBridge.getConnectedAgents({
          role: 'coder',
          status: 'connected',
        });

        if (coderAgents.length === 0) {
          responseText += '❌ **No Coder Agents Available**\n';
          responseText += 'No coder agents are currently connected to handle task assignments.\n\n';
          responseText += '**Next Steps:**\n';
          responseText += '• Wait for coder agent to connect\n';
          responseText += '• Check agent availability\n';
          responseText += '• Retry task assignment later\n';
        } else {
          // Assign to the first available coder agent
          const targetAgent = coderAgents[0];

          responseText += '✅ **Task Assigned Successfully**\n';
          responseText += `**Target Agent:** ${targetAgent.role} (${targetAgent.agentId})\n`;
          responseText += `**Capabilities:** ${targetAgent.capabilities.join(', ')}\n`;

          if (issueNumber) {
            responseText += `**GitHub Issue:** #${issueNumber}\n`;
          }

          responseText += '\n';

          // Send task assignment message
          const messageId = await communicationBridge.sendMessage({
            fromAgentId: runtime.agentId,
            toAgentId: targetAgent.agentId,
            messageType: 'task_assignment',
            content: {
              text: message.content.text || 'Task assignment from coordination system',
              data: {
                taskType: 'github_issue_resolution',
                issueNumber: issueNumber ? parseInt(issueNumber, 10) : undefined,
                assignment: 'code_implementation',
                priority: 'high',
                tags: ['github', 'development', 'coordination'],
              },
              metadata: {
                coordinatedBy: runtime.agentId,
                originalMessage: message.content.text,
              },
            },
            priority: 'high',
            requiresResponse: true,
          });

          responseText += `**Message Sent:** \`${messageId}\`\n`;
          responseText += '**Status:** Task assignment sent to agent\n';
          responseText += '**Expected Response:** Agent acknowledgment and work plan\n';
        }
        break;
      }

      case 'status_update': {
        responseText += '📊 **Status Update Coordination**\n\n';

        // Get all connected agents
        const connectedAgents = communicationBridge.getConnectedAgents();
        const activeWorkflows = communicationBridge.getActiveWorkflows();

        responseText += `**Connected Agents:** ${connectedAgents.length}\n`;

        connectedAgents.forEach((agent) => {
          responseText += `• **${agent.role}** (${agent.status}) - ${agent.capabilities.join(', ')}\n`;
        });

        responseText += `\n**Active Workflows:** ${activeWorkflows.length}\n`;

        activeWorkflows.forEach((workflow) => {
          responseText += `• **${workflow.workflowId}** - ${workflow.status} (${workflow.currentPhase})\n`;
        });

        responseText += '\n';

        // Send status update to all agents
        const messageIds = await communicationBridge.broadcastMessage({
          fromAgentId: runtime.agentId,
          messageType: 'status_update',
          content: {
            text: 'Workflow status update from coordination system',
            data: {
              event: 'coordination_status_update',
              timestamp: Date.now(),
              connectedAgents: connectedAgents.length,
              activeWorkflows: activeWorkflows.length,
              systemStatus: 'operational',
            },
          },
          priority: 'medium',
        });

        responseText += `**Broadcast Sent:** ${messageIds.length} messages delivered\n`;
        responseText += '**Recipients:** All connected agents\n';
        break;
      }

      case 'review_coordination': {
        responseText += '👁️ **Review Coordination**\n\n';

        // Find reviewer agents
        const reviewerAgents = communicationBridge.getConnectedAgents({
          role: 'reviewer',
        });

        if (reviewerAgents.length === 0) {
          responseText += '⚠️ **No Reviewer Agents Available**\n';
          responseText += 'Proceeding with main agent review process.\n\n';
        } else {
          responseText += `✅ **Reviewer Agents Found:** ${reviewerAgents.length}\n\n`;

          // Send review request to reviewers
          for (const reviewer of reviewerAgents) {
            const messageId = await communicationBridge.sendMessage({
              fromAgentId: runtime.agentId,
              toAgentId: reviewer.agentId,
              messageType: 'coordination',
              content: {
                text: 'Code review requested',
                data: {
                  event: 'review_request',
                  requestType: 'code_review',
                  priority: 'high',
                  details: message.content.text,
                },
              },
              priority: 'high',
            });

            responseText += `**Review Request Sent:** \`${messageId}\` to ${reviewer.role}\n`;
          }
        }

        responseText += '\n**Review Process Initiated**\n';
        responseText += '• Pull request review coordination\n';
        responseText += '• Quality assurance validation\n';
        responseText += '• Feedback collection and management\n';
        break;
      }

      case 'broadcast': {
        responseText += '📢 **Broadcast Coordination**\n\n';

        const connectedAgents = communicationBridge.getConnectedAgents();

        if (connectedAgents.length <= 1) {
          responseText += '⚠️ **Limited Recipients**\n';
          responseText += `Only ${connectedAgents.length} agent(s) connected for broadcast.\n\n`;
        }

        // Extract broadcast message from original content
        const broadcastContent =
          message.content.text?.replace(/broadcast|send|all agents/gi, '').trim() ||
          'General coordination broadcast';

        const messageIds = await communicationBridge.broadcastMessage({
          fromAgentId: runtime.agentId,
          messageType: 'coordination',
          content: {
            text: broadcastContent,
            data: {
              event: 'coordination_broadcast',
              timestamp: Date.now(),
              broadcastType: 'general_coordination',
            },
          },
          priority: 'medium',
        });

        responseText += '✅ **Broadcast Complete**\n';
        responseText += `**Recipients:** ${messageIds.length} agents\n`;
        responseText += `**Message:** "${broadcastContent}"\n`;
        responseText += '**Delivery Status:** All messages sent successfully\n';
        break;
      }

      case 'workflow_management': {
        responseText += '⚙️ **Workflow Management Coordination**\n\n';

        const activeWorkflows = communicationBridge.getActiveWorkflows();

        if (activeWorkflows.length === 0) {
          responseText += 'ℹ️ **No Active Workflows**\n';
          responseText += 'No workflows are currently being managed.\n\n';
        } else {
          responseText += `**Active Workflows:** ${activeWorkflows.length}\n\n`;

          for (const workflow of activeWorkflows) {
            responseText += `**${workflow.workflowId}**\n`;
            responseText += `• Status: ${workflow.status}\n`;
            responseText += `• Phase: ${workflow.currentPhase}\n`;
            responseText += `• Participants: ${workflow.participantIds.length}\n`;
            responseText += `• Updated: ${workflow.updatedAt.toISOString()}\n\n`;

            // Send workflow status update to participants
            await communicationBridge.updateWorkflowStatus(
              workflow.workflowId,
              workflow.status,
              workflow.currentPhase,
              {
                lastCoordination: Date.now(),
                coordinatedBy: runtime.agentId,
              }
            );
          }

          responseText += '**Coordination Actions:**\n';
          responseText += '• Workflow status synchronized\n';
          responseText += '• Participant notifications sent\n';
          responseText += '• Progress tracking updated\n';
        }
        break;
      }

      default: {
        responseText += '🤝 **General Agent Coordination**\n\n';

        const stats = communicationBridge.getStatistics();

        responseText += '**System Status:**\n';
        responseText += `• Connected Agents: ${stats.connectedAgents}\n`;
        responseText += `• Active Workflows: ${stats.activeWorkflows}\n`;
        responseText += `• Queued Messages: ${stats.queuedMessages}\n\n`;

        responseText += '**Coordination Capabilities:**\n';
        responseText += '• Task assignment and delegation\n';
        responseText += '• Status updates and synchronization\n';
        responseText += '• Review coordination and quality assurance\n';
        responseText += '• Broadcast communication\n';
        responseText += '• Workflow management and tracking\n\n';

        responseText += '**Available Commands:**\n';
        responseText += '• "Assign task [details]" - Delegate work to agents\n';
        responseText += '• "Send status update" - Synchronize all agents\n';
        responseText += '• "Coordinate review" - Initiate code review process\n';
        responseText += '• "Broadcast [message]" - Send to all agents\n';
        responseText += '• "Manage workflow" - Update workflow status\n';
      }
    }

    const actionResult = {
      text: responseText,
      values: {
        success: true,
        coordinationType,
        connectedAgents: communicationBridge.getConnectedAgents().length,
        activeWorkflows: communicationBridge.getActiveWorkflows().length,
        systemStatus: 'operational',
      },
      data: {
        bridgeStatistics: communicationBridge.getStatistics(),
        connectedAgents: communicationBridge.getConnectedAgents(),
        activeWorkflows: communicationBridge.getActiveWorkflows(),
      },
    };

    elizaLogger.info('Agent coordination completed', {
      coordinationType,
      success: true,
    });

    if (callback) {
      await callback(actionResult);
    }

    return actionResult;
  } catch (error) {
    elizaLogger.error('Agent Coordination action failed', {
      messageId: message.id,
      error: error.message,
    });

    const errorText = `❌ **Agent Coordination Failed**\n\nError: ${error.message}`;

    if (callback) {
      await callback({
        values: {
          success: false,
          error: error.message,
        },
        text: errorText,
      });
    }

    return {
      text: errorText,
      values: { success: false, error: error.message },
    };
  }
};

const agentCoordinationValidator: Validator = async (runtime, message) => {
  const content = message.content.text?.toLowerCase() || '';

  const coordinationPatterns = [
    /coordinate|coordination/i,
    /assign.*task|task.*assign/i,
    /send.*status|status.*update/i,
    /broadcast.*agents?|send.*all/i,
    /review.*coordinate|coordinate.*review/i,
    /workflow.*manage|manage.*workflow/i,
    /agent.*communication|communicate.*agent/i,
    /notify.*agents?|alert.*agents?/i,
  ];

  return coordinationPatterns.some((pattern) => pattern.test(content));
};

export const agentCoordinationAction: Action = {
  name: 'AGENT_COORDINATION',
  similes: [
    'COORDINATE_AGENTS',
    'MANAGE_AGENT_COMMUNICATION',
    'AGENT_TASK_ASSIGNMENT',
    'WORKFLOW_COORDINATION',
  ],
  description:
    'Coordinates communication and task assignment between multiple agents in collaborative workflows',
  examples: agentCoordinationExamples,
  validate: agentCoordinationValidator,
  handler: agentCoordinationHandler,
  effects: {
    provides: [
      'agent_coordination',
      'task_assignment',
      'status_synchronization',
      'workflow_management',
    ],
    requires: ['agent_communication_bridge'],
    modifies: ['agent_tasks', 'workflow_status', 'communication_state'],
  },
};
