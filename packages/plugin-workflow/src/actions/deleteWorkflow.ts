import type { Action } from '@elizaos/core';

export const deleteWorkflowAction: Action = {
    name: 'DELETE_WORKFLOW',
    description: 'Delete a workflow',
    examples: [],
    async validate() {
        return false;
    },
    async handler() {
        return;
    },
}; 