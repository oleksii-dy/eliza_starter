//  /packages/plugin-twilio/examples/start-webhook-server.ts

import { modelConfig } from '../src/modelConfig.js';
import { AgentRuntime, IAgentConfig, ModelProviderName, generateMessageResponse, ServiceType } from '@elizaos/core';
import plugin from '../src/index.js';
import { webhookService } from '../src/services/webhook.js';
import { storageService } from '../src/services/storage.js';
import { twilioService } from '../src/services/twilio.js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createAgentConfig } from '../src/config.js';
import { randomUUID } from 'crypto';
import { Anthropic } from '@anthropic-ai/sdk';

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory's .env file
dotenv.config({
    path: join(__dirname, '../../../.env')
});

// Log API key presence for debugging
console.log('ANTHROPIC_API_KEY is set:', !!process.env.ANTHROPIC_API_KEY);

// Force environment variables
process.env.MODEL_PROVIDER = 'anthropic';
process.env.FORCE_MODEL_PROVIDER = 'anthropic';
process.env.DEFAULT_MODEL_PROVIDER = 'anthropic';
process.env.USE_LOCAL_MODELS = 'false';
process.env.DISABLE_LOCAL_MODELS = 'true';
process.env.PROVIDER = 'anthropic';

async function startServer() {
    try {
        // Initialize storage service first
        await storageService.initialize();
        console.log('Storage service initialized');

        // Initialize Twilio service
        await twilioService.initialize({
            accountSid: process.env.TWILIO_ACCOUNT_SID,
            authToken: process.env.TWILIO_AUTH_TOKEN,
            phoneNumber: process.env.TWILIO_PHONE_NUMBER
        });
        console.log('Twilio service initialized');

        // Load character configuration
        const characterPath = join(__dirname, '../../../characters/test-character.json');
        console.log('Loading character from:', characterPath);

        const data = await readFile(characterPath, 'utf-8');
        const characterConfig = JSON.parse(data);

        // Initialize webhook service first with character config
        console.log('Pre-initializing webhook service...');
        await webhookService.initialize(null, characterConfig);
        console.log('Webhook service pre-initialized with character:', characterConfig.name);

        // Create runtime options
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
                            'x-api-key': process.env.ANTHROPIC_API_KEY,
                            'anthropic-version': '2023-06-01',
                            'content-type': 'application/json',
                            'accept': 'application/json',
                            'client-sdk': '@anthropic-ai/sdk@0.10.2'
                        },
                        defaultModel: 'claude-3-sonnet-20240229'
                    }
                }
            },
            services: [webhookService]
        };

        // Initialize runtime with pre-initialized webhook service
        console.log('Initializing runtime...');
        const runtime = new AgentRuntime(runtimeOptions);
        await runtime.initialize();
        console.log('Runtime initialized with character:', characterConfig.name);

        // Update webhook service with runtime reference
        await webhookService.setRuntime(runtime);
        console.log('Webhook service updated with runtime');

        console.log('SMS Agent started successfully with character:', characterConfig.name);

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();