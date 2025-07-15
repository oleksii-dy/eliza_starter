import type { Action } from '@elizaos/core';

export const getWorkflowAction: Action = {
    name: 'GET_WORKFLOW',
    description: 'Get details of a specific workflow',
    examples: [],
    async validate() {
        return false;
    },
    async handler() {
        return;
    },
}; 