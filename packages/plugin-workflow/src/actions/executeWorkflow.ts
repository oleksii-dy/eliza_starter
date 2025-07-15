import type { Action } from '@elizaos/core';

export const executeWorkflowAction: Action = {
    name: 'EXECUTE_WORKFLOW',
    description: 'Execute a workflow by ID',
    examples: [],
    async validate() {
        return false; // Placeholder
    },
    async handler() {
        // Return void for now
        return;
    },
}; 