//  /packages/plugin-twilio/src/config.ts

import { IAgentConfig } from '@elizaos/core';

export const createAgentConfig = (characterConfig: any, storageAdapter: any): IAgentConfig => {
    // Handle bio format (string or array)
    const bioText = Array.isArray(characterConfig.bio) ?
        characterConfig.bio.join('. ') :
        characterConfig.bio;

    // Handle style format
    const styleText = Array.isArray(characterConfig.style?.chat) ?
        characterConfig.style.chat.join('. ') :
        '';

    // Get model settings from character config
    const modelProvider = characterConfig.modelProvider || 'anthropic';
    const model = characterConfig.model || 'claude-3-sonnet-20240229';

    return {
        id: 'sms-agent',
        name: characterConfig.name,
        description: characterConfig.description || 'An agent that handles SMS conversations',
        modelProvider,
        model,
        temperature: 0.7,
        systemPrompt: `You are ${characterConfig.name}. ${bioText}. ${styleText}. Keep responses concise as this is SMS.`,
        databaseAdapter: storageAdapter,
        settings: {
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
            MODEL_PROVIDER: modelProvider,
            FORCE_MODEL_PROVIDER: modelProvider,
            DEFAULT_MODEL_PROVIDER: modelProvider,
            provider: modelProvider,
            forceProvider: true,
            disableLocalModels: true,
            useLocalModels: false
        },
        // Force provider list to only include the character's provider
        providers: [modelProvider],
        // Disable local models
        useLocalModels: false,
        // Add plugins
        plugins: characterConfig.plugins || []
    };
};