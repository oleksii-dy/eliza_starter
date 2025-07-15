import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';

export const workflowProvider: Provider = {
    name: 'workflowInfo',
    description: 'Provides information about available workflows',
    
    async get(runtime: IAgentRuntime, message: Memory, state: State) {
        const workflowService = runtime.getService('workflow');
        
        if (!workflowService) {
            return {
                text: 'Workflow service is not available.',
            };
        }

        // Placeholder - in real implementation would list workflows
        return {
            text: '[WORKFLOW INFO]\nWorkflow system is active and ready.\n[/WORKFLOW INFO]',
            data: {
                workflowServiceAvailable: true,
                activeWorkflows: 0,
            },
        };
    },
}; 