import type { Action } from '@elizaos/core';

export const listWorkflowsAction: Action = {
    name: 'LIST_WORKFLOWS',
    description: 'List all workflows',
    examples: [],
    async validate() {
        return false;
    },
    async handler() {
        return;
    },
}; 