import type { Action } from '@elizaos/core';

export const updateWorkflowAction: Action = {
    name: 'UPDATE_WORKFLOW',
    description: 'Update an existing workflow',
    examples: [],
    async validate() {
        return false;
    },
    async handler() {
        return;
    },
}; 