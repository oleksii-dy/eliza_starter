import { IAgent, IAgentConfig, AgentRuntime } from '@elizaos/core';
import { TwilioPlugin } from '../src/index.js';
import { webhookService } from '../src/services/webhook.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function startServer() {
    try {
        // Create agent configuration
        const config: IAgentConfig = {
            id: 'sms-agent',
            name: 'SMS Agent',
            description: 'An agent that handles SMS conversations',
            model: process.env.MEDIUM_OPENAI_MODEL || 'gpt-4',
            plugins: [TwilioPlugin],
            temperature: 0.7,
            systemPrompt: `You are a helpful AI assistant communicating via SMS.
                Be concise but friendly in your responses.
                Always provide meaningful responses to user questions.
                Never respond with just 'OK'.`
        };

        // Initialize the agent runtime
        const runtime = new AgentRuntime(config);
        await runtime.initialize();

        // Initialize webhook service with runtime
        await webhookService.initialize(runtime);

        console.log('SMS Agent and webhook server started successfully');
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();