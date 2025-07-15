import type {
    Action,
    IAgentRuntime,
    Memory,
    State,
} from '@elizaos/core';

// Import workflow types directly since they're not yet exported from core
interface IWorkflowService {
    createWorkflow(workflow: Omit<Workflow, 'id'>): Promise<Workflow>;
}

interface Workflow {
    id: string;
    name: string;
    description?: string;
    agentId: string;
    status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ERROR';
    version: number;
    triggers: Array<{
        type: 'EVENT' | 'CRON' | 'MANUAL' | 'WORKFLOW';
        eventName?: string;
        schedule?: string;
        workflowId?: string;
    }>;
    steps: Array<{
        id: string;
        name: string;
        type: 'action' | 'condition' | 'loop' | 'parallel' | 'wait';
        action?: string;
        input?: Record<string, any>;
    }>;
}

export const createWorkflowAction: Action = {
    name: 'CREATE_WORKFLOW',
    description: 'Create a new workflow from a JSON definition',
    examples: [
        [
            {
                name: 'user',
                content: {
                    text: 'Create a workflow that sends a daily reminder at 9am',
                },
            },
            {
                name: 'assistant',
                content: {
                    text: 'I\'ll create a daily reminder workflow for you.',
                    action: 'CREATE_WORKFLOW',
                },
            },
        ],
        [
            {
                name: 'user',
                content: {
                    text: 'Create a workflow to welcome new members',
                },
            },
            {
                name: 'assistant',
                content: {
                    text: 'I\'ll create a workflow to welcome new members.',
                    action: 'CREATE_WORKFLOW',
                },
            },
        ],
    ],

    async validate(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
        const text = message.content.text?.toLowerCase() || '';
        return text.includes('create') && text.includes('workflow');
    },

    async handler(runtime: IAgentRuntime, message: Memory, state?: State): Promise<any> {
        const workflowService = runtime.getService('workflow') as unknown as IWorkflowService;
        if (!workflowService) {
            throw new Error('Workflow service not available');
        }

        // For now, create a simple example workflow
        // In a real implementation, this would parse the user's request or accept JSON
        const workflowData: Omit<Workflow, 'id'> = {
            name: 'Example Workflow',
            description: 'An example workflow created from chat',
            agentId: runtime.agentId,
            status: 'DRAFT',
            version: 1,
            triggers: [
                {
                    type: 'MANUAL',
                },
            ],
            steps: [
                {
                    id: 'step1',
                    name: 'Send Message',
                    type: 'action',
                    action: 'SEND_MESSAGE',
                    input: {
                        message: 'Hello from workflow!',
                    },
                },
            ],
        };

        const workflow = await workflowService.createWorkflow(workflowData);

        return {
            text: `Created workflow "${workflow.name}" with ID: ${workflow.id}`,
            workflow,
        };
    },
}; 