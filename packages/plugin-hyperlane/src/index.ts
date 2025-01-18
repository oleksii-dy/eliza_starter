// src/index.ts
import { Plugin } from "@elizaos/core";
import { sendCrossChainMessage, transferTokens, deployWarpRoute } from './actions';
export const hyperlanePlugin: Plugin = {
    name: 'hyperlane-plugin',
    description: 'Provides cross-chain messaging and token transfer capabilities using Hyperlane',


    // Register all actions
    actions: [
        sendCrossChainMessage,
        transferTokens,
        deployWarpRoute
    ],

    // Register providers
    providers: [

    ],

    // Register evaluators
    evaluators: [

    ],

    // Register services
    services: [

    ],

    // Plugin initialization

};

export default hyperlanePlugin;

// Export all components for external use
