import type { Plugin } from '@elizaos/core';
import { retrieveVolatilityState } from './actions/retrieveVolatilityState.ts';

export const xtreamlyPlugin: Plugin = {
    name: 'xtreamly',
    description: 'Xtreamly Plugin for Eliza',
    actions: [retrieveVolatilityState],
    providers: [],
    services: [],
};
