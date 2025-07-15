import {
    type Plugin,
    type IAgentRuntime,
    WorkflowRuntimeService,
} from '@elizaos/core';
import { createWorkflowAction } from './actions/createWorkflow';
import { executeWorkflowAction } from './actions/executeWorkflow';
import { listWorkflowsAction } from './actions/listWorkflows';
import { updateWorkflowAction } from './actions/updateWorkflow';
import { deleteWorkflowAction } from './actions/deleteWorkflow';
import { getWorkflowAction } from './actions/getWorkflow';
import { workflowProvider } from './providers/workflowProvider';

export const workflowPlugin: Plugin = {
    name: 'workflow',
    description: 'Workflow automation plugin for ElizaOS',

    async init(config: Record<string, string>, runtime: IAgentRuntime): Promise<void> {
        console.log('Initializing workflow plugin...');
        
        // Important: Workflows can only use actions that are registered in the runtime
        // Make sure required plugins (like @elizaos/plugin-bootstrap) are loaded first
        console.log('Available actions for workflows:', runtime.actions.map(a => a.name));
        
        // Load example workflows after a short delay to ensure service is ready
        setTimeout(async () => {
            try {
                const workflowService = runtime.getService('workflow');
                if (!workflowService) {
                    console.warn('Workflow service not available yet');
                    return;
                }

                // Example workflows data
                const exampleWorkflows = [
                    {
                        name: 'Daily Reminder',
                        description: 'Sends a daily reminder message at 9 AM',
                        agentId: runtime.agentId,
                        status: 'ACTIVE',
                        version: 1,
                        triggers: [
                            {
                                type: 'CRON',
                                schedule: '0 9 * * *',
                                timezone: 'America/Los_Angeles',
                            },
                        ],
                        steps: [
                            {
                                id: 'step1',
                                name: 'Send Reminder',
                                type: 'action',
                                action: 'SEND_MESSAGE',
                                input: {
                                    message: 'Good morning! This is your daily reminder to check your tasks.',
                                },
                            },
                        ],
                    },
                    {
                        name: 'Welcome New Member',
                        description: 'Welcomes new members when they join',
                        agentId: runtime.agentId,
                        status: 'ACTIVE',
                        version: 1,
                        triggers: [
                            {
                                type: 'EVENT',
                                eventName: 'ENTITY_JOINED',
                            },
                        ],
                        steps: [
                            {
                                id: 'step1',
                                name: 'Wait 5 seconds',
                                type: 'wait',
                                waitConfig: {
                                    duration: 5000, // 5 seconds in milliseconds
                                },
                            },
                            {
                                id: 'step2',
                                name: 'Send Welcome Message',
                                type: 'action',
                                action: 'SEND_MESSAGE',
                                input: {
                                    message: 'Welcome to the community, {{user.name}}! 👋',
                                },
                                dependencies: ['step1'],
                            },
                        ],
                    },
                    {
                        name: 'Content Moderation',
                        description: 'Moderates messages and takes action on violations',
                        agentId: runtime.agentId,
                        status: 'PAUSED',
                        version: 1,
                        triggers: [
                            {
                                type: 'EVENT',
                                eventName: 'MESSAGE_RECEIVED',
                                filter: {
                                    contentType: 'text',
                                },
                            },
                        ],
                        steps: [
                            {
                                id: 'check',
                                name: 'Check Content',
                                type: 'condition',
                                condition: {
                                    expression: 'message.content.toLowerCase().includes("spam")',
                                },
                                thenSteps: [
                                    {
                                        id: 'warn',
                                        name: 'Warn User',
                                        type: 'action',
                                        action: 'SEND_MESSAGE',
                                        input: {
                                            message: '⚠️ Your message contains inappropriate content. Please follow community guidelines.',
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                ];

                // Load each example workflow
                for (const workflow of exampleWorkflows) {
                    try {
                        await (workflowService as any).createWorkflow(workflow);
                        console.log(`Loaded example workflow: ${workflow.name}`);
                    } catch (error) {
                        console.error(`Failed to load example workflow ${workflow.name}:`, error);
                    }
                }
            } catch (error) {
                console.error('Failed to load example workflows:', error);
            }
        }, 2000); // 2 second delay
    },

    actions: [
        createWorkflowAction,
        executeWorkflowAction,
        listWorkflowsAction,
        updateWorkflowAction,
        deleteWorkflowAction,
        getWorkflowAction,
    ],

    providers: [workflowProvider],

    services: [WorkflowRuntimeService],
};

// Export plugin and components
export {
    createWorkflowAction,
    executeWorkflowAction,
    listWorkflowsAction,
    updateWorkflowAction,
    deleteWorkflowAction,
    getWorkflowAction,
    workflowProvider,
}; 