//  /packages/plugin-twilio/src/services/webhook.ts

import { Service, ServiceType, IAgentRuntime, Memory, Content, generateMessageResponse } from '@elizaos/core';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { twilioService } from './twilio.js';
import { verifyService } from './verify.js';
import twilio from 'twilio';
import { randomUUID } from 'crypto';
import { Anthropic } from '@anthropic-ai/sdk';

// API key validation helper
const validateApiKey = (apiKey: string | undefined): string => {
    if (!apiKey?.trim()) {
        throw new Error('ANTHROPIC_API_KEY is not set');
    }
    const cleanKey = apiKey.trim();
    if (!cleanKey.startsWith('sk-ant-')) {
        throw new Error('Invalid API key format - must start with sk-ant-');
    }
    if (cleanKey.length < 40) {
        throw new Error('API key appears too short');
    }
    return cleanKey;
};

export class WebhookService implements Service {
    private static instance: WebhookService | null = null;
    private static expressApp: express.Express | null = null;
    private static server: any = null;
    private app: express.Express = express();
    private runtime: IAgentRuntime | null = null;
    private initialized: boolean = false;
    private characterConfig: any = null;
    private anthropicClient: Anthropic | null = null;

    constructor() {
        if (WebhookService.instance) {
            return WebhookService.instance;
        }
        WebhookService.instance = this;
        this.setupMiddleware();
    }

    get serviceType(): ServiceType {
        return ServiceType.TEXT_GENERATION;
    }

    private setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.setupSMSWebhook();
    }

    private async startServer() {
        const port = process.env.WEBHOOK_PORT ? parseInt(process.env.WEBHOOK_PORT) : 3003;

        return new Promise((resolve) => {
            WebhookService.server = this.app.listen(port, '0.0.0.0', () => {
                console.log(`Webhook server listening on http://0.0.0.0:${port}`);
                resolve(true);
            });
        });
    }

    async setRuntime(runtime: IAgentRuntime): Promise<void> {
        if (!runtime) {
            throw new Error('Runtime is required');
        }
        this.runtime = runtime;
        console.log('Runtime set in webhook service');
    }

    async initialize(runtime?: IAgentRuntime, characterConfig?: any): Promise<void> {
        if (this.initialized) {
            console.log('WebhookService already initialized');
            return;
        }

        try {
            // Validate character config first
            if (!characterConfig) {
                throw new Error('Character configuration is required');
            }

            // Store character config
            this.characterConfig = characterConfig;
            console.log('Webhook service storing character config:', {
                name: this.characterConfig.name,
                hasConfig: !!this.characterConfig
            });

            // Initialize Anthropic client
            const apiKey = validateApiKey(process.env.ANTHROPIC_API_KEY);
            this.anthropicClient = new Anthropic({
                apiKey: apiKey,
            });

            // Start server
            await this.startServer();
            this.initialized = true;

            // Store runtime if provided
            if (runtime) {
                this.runtime = runtime;
                console.log('Runtime stored in webhook service');
            }

            console.log('Webhook service initialized with character:', this.characterConfig.name);
        } catch (error) {
            console.error('Webhook Service Initialization Error:', error);
            throw error;
        }
    }

    private async handleSMSMessage(phoneNumber: string, text: string) {
        try {
            if (!this.runtime || !this.anthropicClient) {
                throw new Error('Runtime or Anthropic client not available');
            }

            if (!this.characterConfig) {
                throw new Error('Character configuration not available');
            }

            // Build system prompt from character config with SMS-specific instructions
            const systemPrompt = `
                ${this.characterConfig.config.systemPrompt}

                Additional instructions:
                - Keep your responses very short (max 160 characters) since these are SMS messages
                - Get straight to the point or joke
                - No introductions or lengthy explanations
                - One joke/response per message
                - Skip greetings unless specifically asked to greet

                Additional context:
                - Your name is: ${this.characterConfig.name}
                - Your personality: ${this.characterConfig.personality}
                - Your phone number: ${process.env.TWILIO_PHONE_NUMBER}
            `;

            // Use Anthropic client with character context and reduced max tokens
            const response = await this.anthropicClient.messages.create({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 100, // Reduced from 1024 to encourage shorter responses
                temperature: 0.7,
                messages: [{
                    role: 'user',
                    content: text
                }],
                system: systemPrompt
            });

            if (!response || !response.content[0].text) {
                throw new Error('Failed to generate response');
            }

            // Trim any extra whitespace and limit length if needed
            let responseText = response.content[0].text.trim();
            if (responseText.length > 160) {
                responseText = responseText.substring(0, 157) + '...';
            }

            await twilioService.sendMessage(phoneNumber, responseText);

        } catch (error: any) {
            console.error('SMS Handler Error:', error);
            await twilioService.sendMessage(
                phoneNumber,
                "Sorry, I hit a snag. Try again!"  // Shorter error message
            );
            throw error;
        }
    }

    private setupSMSWebhook() {
        this.app.post('/webhook/sms',
            express.urlencoded({ extended: false }),
            twilio.webhook({ validate: false }),
            async (req, res) => {
                try {
                    const phoneNumber = req.body.From;
                    const text = req.body.Body?.trim();

                    if (!text || phoneNumber === process.env.TWILIO_PHONE_NUMBER) {
                        return res.status(200).type('text/xml').send('<Response></Response>');
                    }

                    await this.handleSMSMessage(phoneNumber, text);
                    // Return empty TwiML response to prevent automatic reply
                    res.status(200).type('text/xml').send('<Response></Response>');
                } catch (error) {
                    console.error('SMS webhook error:', error);
                    res.status(500).type('text/xml').send('<Response></Response>');
                }
            }
        );
    }
}

export const webhookService = new WebhookService();