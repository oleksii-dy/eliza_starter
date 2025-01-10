//  /packages/plugin-twilio/examples/start-webhook-server.ts

import { AgentRuntime, ServiceType, RuntimeOptions, ModelProviderName } from '@elizaos/core';
import plugin from '../src/index.js';
import { webhookService } from '../src/services/webhook.js';
import { storageService } from '../src/services/storage.js';
import { twilioService } from '../src/services/twilio.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import { SafeLogger } from '../src/utils/logger.js';
import { randomUUID } from 'crypto';

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory's .env file
dotenv.config({
    path: join(__dirname, '../../../.env')
});

// Replace console.log with SafeLogger
SafeLogger.info('ANTHROPIC_API_KEY status:', !!process.env.ANTHROPIC_API_KEY);

// Force environment variables
process.env.MODEL_PROVIDER = 'anthropic';
process.env.FORCE_MODEL_PROVIDER = 'anthropic';
process.env.DEFAULT_MODEL_PROVIDER = 'anthropic';
process.env.USE_LOCAL_MODELS = 'false';
process.env.DISABLE_LOCAL_MODELS = 'true';
process.env.PROVIDER = 'anthropic';

// Get process arguments in a safe way
const processArgs = {
    ARGV: process.argv,
    CWD: process.cwd()
};

// Add helper function for runtime initialization
async function initializeRuntime(characterConfig: any) {
    const runtimeOptions: RuntimeOptions = {
        databaseAdapter: storageService.getDatabaseAdapter(),
        token: randomUUID(),
        modelProvider: ModelProviderName.ANTHROPIC,
        character: characterConfig,
        plugins: [plugin],
        providers: ['anthropic'],
        settings: {
            secrets: {
                ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
            },
            providers: {
                anthropic: {
                    apiKey: process.env.ANTHROPIC_API_KEY,
                    headers: {
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json',
                        'accept': 'application/json',
                        'client-sdk': '@anthropic-ai/sdk@0.10.2'
                    },
                    defaultModel: 'claude-3-sonnet-20240229'
                }
            }
        },
        services: []
    };

    SafeLogger.runtime('Initializing', { status: 'starting' });
    const runtime = new AgentRuntime(runtimeOptions);
    await runtime.initialize();

    // Use agent logger instead of runtime for agent-specific info
    SafeLogger.agent('Initialized', {
        character: characterConfig.name,
        model: characterConfig.config?.model
    });

    return runtime;
}

// Add character file constant
const characterFile = 'dad-bot-3000.character.json';

// Disable debug logging
SafeLogger.setDebugMode(false);

async function startServer() {
    try {
        SafeLogger.info('Starting SMS agent...');

        await storageService.initialize();
        await twilioService.initialize();
        await webhookService.initialize();

        const characterPath = path.resolve(process.cwd(), '../..', 'characters', characterFile);
        const characterConfig = JSON.parse(await fs.readFile(characterPath, 'utf-8'));

        const runtime = await initializeRuntime(characterConfig);
        await webhookService.configure(runtime, characterConfig);

        SafeLogger.info('SMS agent ready');
    } catch (error) {
        SafeLogger.error('Startup failed:', error);
        process.exit(1);
    }
}

// Core logger wrapping
SafeLogger.wrapCoreLogger('Loading settings', {
    ARGV: '[REDACTED]',
    CWD: '[REDACTED]'
});

startServer();