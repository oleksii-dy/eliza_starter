//  /packages/plugin-twilio/src/services/webhook.ts

import { Service, ServiceType, IAgentRuntime } from '@elizaos/core';
import express from 'express';
import { twilioService } from './twilio.js';
import twilio from 'twilio';
import { Anthropic } from '@anthropic-ai/sdk';
import { SafeLogger } from '../utils/logger.js';

// Add proper typing for Anthropic response
interface AnthropicMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface AnthropicResponse {
    content: Array<{
        type: string;
        text: string;
    }>;
}

// Add types for router stack
interface RouteInfo {
    route?: {
        path: string;
        methods: { [key: string]: boolean };
    };
}

// Add type for Gather input
type GatherInput = 'speech' | 'dtmf';

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
    private conversations: Map<string, { isFirstMessage: boolean }> = new Map();

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
        SafeLogger.info('Setting up webhook middleware...');

        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        this.setupWebhooks();

        // Add catch-all route with proper typing
        this.app.use((req, res, next) => {
            SafeLogger.debug('Request received:', {
                method: req.method,
                path: req.path
            });
            next();
        });

        // Log routes with proper typing
        SafeLogger.info('Routes registered:',
            (this.app._router.stack as RouteInfo[])
                .filter((r: RouteInfo) => r.route)
                .map((r: RouteInfo) => `${Object.keys(r.route?.methods || {})} ${r.route?.path}`)
        );

        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'ok',
                routes: (this.app._router.stack as RouteInfo[])
                    .filter((r: RouteInfo) => r.route)
                    .map((r: RouteInfo) => `${Object.keys(r.route?.methods || {})} ${r.route?.path}`)
            });
        });
    }

    private async startServer() {
        const port = process.env.WEBHOOK_PORT ? parseInt(process.env.WEBHOOK_PORT) : 3003;

        return new Promise((resolve) => {
            WebhookService.server = this.app.listen(port, '0.0.0.0', () => {
                SafeLogger.service('Webhook', `listening on port ${port}`);
                resolve(true);
            });
        });
    }

    async setRuntime(runtime: IAgentRuntime): Promise<void> {
        if (!runtime) {
            throw new Error('Runtime is required');
        }
        this.runtime = runtime;
        SafeLogger.service('Runtime', 'set in webhook service');
    }

    async initialize(): Promise<void> {
        if (this.initialized) {
            SafeLogger.service('Webhook', 'already initialized');
            return;
        }

        try {
            const apiKey = validateApiKey(process.env.ANTHROPIC_API_KEY);
            this.anthropicClient = new Anthropic({ apiKey });
            await this.startServer();
            this.initialized = true;
            SafeLogger.service('Webhook', 'initialized');
        } catch (error) {
            SafeLogger.error('Webhook Service Initialization Error:', error);
            throw error;
        }
    }

    async configure(runtime?: IAgentRuntime, characterConfig?: any): Promise<void> {
        if (!characterConfig) {
            throw new Error('Character configuration is required');
        }

        // Store configs
        this.characterConfig = characterConfig;

        // Configure runtime if provided
        if (runtime) {
            this.runtime = runtime;
            SafeLogger.agent('Runtime configured', {
                character: characterConfig.name,
                model: characterConfig.config?.model
            });
        }

        // Only log character config once
        if (!this.initialized) {
            SafeLogger.character(characterConfig.name, characterConfig);
            this.initialized = true;
        }

        // Ensure Anthropic client is initialized
        if (!this.anthropicClient) {
            const apiKey = validateApiKey(process.env.ANTHROPIC_API_KEY);
            this.anthropicClient = new Anthropic({ apiKey });
        }

        // Log service status only if not already configured
        if (!this.initialized) {
            SafeLogger.service('Webhook', 'configured');
        }
    }

    private async handleSMSMessage(phoneNumber: string, text: string) {
        try {
            if (!this.anthropicClient || !this.characterConfig) {
                throw new Error('Anthropic client or character config not available');
            }

            // Check if this is the first message for this number
            const conversation = this.conversations.get(phoneNumber) || { isFirstMessage: true };

            // Only log essential request info
            SafeLogger.info('Processing message:', {
                type: 'inbound',
                isFirstMessage: conversation.isFirstMessage
            });

            const response = await this.anthropicClient.messages.create({
                model: this.characterConfig.config.model || 'claude-3-sonnet-20240229',
                max_tokens: 100,
                temperature: 0.7,
                messages: [{
                    role: 'user',
                    content: text
                }],
                system: this.getSystemPrompt(conversation.isFirstMessage)
            }) as AnthropicResponse;

            // Mark that we've handled the first message
            if (conversation.isFirstMessage) {
                this.conversations.set(phoneNumber, { isFirstMessage: false });
            }

            const responseText = response?.content?.[0]?.text?.trim();
            if (!responseText) {
                throw new Error('Invalid response format');
            }

            // Only log essential response info
            SafeLogger.info('Sending response:', {
                type: 'outbound',
                length: responseText.length
            });

            await twilioService.sendMessage(phoneNumber,
                responseText.length > 160 ?
                    responseText.substring(0, 157) + '...' :
                    responseText
            );

        } catch (error) {
            SafeLogger.error('SMS Error:', error);
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
                    SafeLogger.error('SMS webhook error:', error);
                    res.status(500).type('text/xml').send('<Response></Response>');
                }
            }
        );
    }

    private setupVoiceWebhook() {
        this.app.post('/webhook/voice',
            express.urlencoded({ extended: false }),
            twilio.webhook({ validate: false }),
            async (req, res) => {
                try {
                    const phoneNumber = req.body.From;
                    const userInput = req.body.SpeechResult ?? undefined;
                    const twiml = new twilio.twiml.VoiceResponse();

                    if (!this.characterConfig) {
                        twiml.say('Sorry, I am not configured properly at the moment.');
                        res.type('text/xml').send(twiml.toString());
                        return;
                    }

                    const response = await this.generateVoiceResponse(phoneNumber, userInput);

                    twiml.say({
                        voice: 'Polly.Matthew',
                        language: 'en-US'
                    }, response);

                    const gather = twiml.gather({
                        input: ['speech'] as GatherInput[],
                        language: 'en-US',
                        speechTimeout: 'auto',
                        action: '/webhook/voice',
                        method: 'POST'
                    });

                    gather.say({
                        voice: 'Polly.Matthew',
                        language: 'en-US'
                    }, 'Feel free to respond or ask me another question!');

                    twiml.redirect('/webhook/voice');

                    res.type('text/xml').send(twiml.toString());
                } catch (error) {
                    SafeLogger.error('Voice webhook error:', error);
                    const twiml = new twilio.twiml.VoiceResponse();
                    twiml.say('Sorry, I encountered an error. Please try again later.');
                    res.type('text/xml').send(twiml.toString());
                }
            }
        );
    }

    private async generateVoiceResponse(phoneNumber: string, userInput?: string): Promise<string> {
        try {
            if (!this.anthropicClient || !this.characterConfig) {
                throw new Error('Anthropic client or character config not available');
            }

            const conversation = this.conversations.get(phoneNumber) || { isFirstMessage: true };
            const defaultResponse = 'Tell me about yourself';
            const promptContent = userInput || defaultResponse;

            // Only log essential request info
            SafeLogger.info('Processing voice:', {
                type: 'inbound',
                isFirstMessage: conversation.isFirstMessage,
                hasUserInput: !!userInput
            });

            const response = await this.anthropicClient.messages.create({
                model: this.characterConfig.config.model || 'claude-3-sonnet-20240229',
                max_tokens: 100,
                temperature: 0.7,
                messages: [{
                    role: 'user',
                    content: promptContent
                }],
                system: this.getSystemPrompt(conversation.isFirstMessage)
            }) as AnthropicResponse;

            const responseText = response?.content?.[0]?.text?.trim();
            if (!responseText) {
                throw new Error('Invalid response format');
            }

            // Only log essential response info
            SafeLogger.info('Sending voice response:', {
                type: 'outbound',
                length: responseText.length
            });

            // Update conversation state after successful response
            if (conversation.isFirstMessage) {
                this.conversations.set(phoneNumber, { isFirstMessage: false });
            }

            return responseText;
        } catch (error) {
            SafeLogger.error('Voice Error:', error);
            return 'Sorry, I encountered an error. Please try again!';
        }
    }

    private getSystemPrompt(isFirstMessage: boolean): string {
        if (!this.characterConfig) {
            throw new Error('Character configuration not available');
        }

        // Get character's configuration
        const systemPrompt = this.characterConfig.config.systemPrompt || '';
        const personality = this.characterConfig.personality || '';
        const name = this.characterConfig.name || '';

        return `
            ${systemPrompt}
            ${personality}

            Critical SMS/Voice Instructions:
            ${isFirstMessage ?
                `- For this first message, respond EXACTLY with: "Hi, I'm ${name}! Want to chat?"` :
                `- Since user has already received the introduction, respond directly to their message
                 - If user says "yes" or similar, engage with them based on your character
                 - If user asks a question, acknowledge it then respond appropriately`
            }
            - NEVER use text actions like *clears throat*, *pauses*, etc.
            - NEVER use emojis or special characters
            - Keep responses under 300 characters but NEVER EVER cut sentences nor ideas nor concepts mid-way
            - NEVER mention your name after the first message
            - Use simple language suitable for SMS and voice
            - Include natural pauses with commas
            - Use only plain text - no symbols, emojis, or formatting
        `;
    }

    async makeVoiceCall(toNumber: string, message: string): Promise<string> {
        try {
            if (!this.initialized) {
                throw new Error('Webhook service not initialized');
            }

            SafeLogger.info('Initiating voice call:', {
                type: 'outbound',
                length: message.length
            });

            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            const fromNumber = process.env.TWILIO_PHONE_NUMBER;

            if (!accountSid || !authToken || !fromNumber) {
                throw new Error('Required Twilio credentials are not set');
            }

            const twilioClient = twilio(accountSid, authToken);
            const call = await twilioClient.calls.create({
                twiml: `<Response><Say voice="Polly.Matthew" language="en-US">${message}</Say></Response>`,
                to: toNumber,
                from: fromNumber
            });

            SafeLogger.info('Voice call connected:', { sid: '***' });
            return call.sid;

        } catch (error) {
            SafeLogger.error('Voice call failed:', error);
            throw error;
        }
    }

    private setupWebhooks() {
        // Existing webhooks
        this.setupSMSWebhook();
        this.setupVoiceWebhook();

        // Future integrations
        this.setupDiscordWebhook();
        this.setupTwitterWebhook();
    }

    private setupDiscordWebhook() {
        this.app.post('/webhook/discord',
            express.json(),
            async (req, res) => {
                // Handle Discord events
                // Use same AI response generation
                // Just different output formatting
            }
        );
    }

    private setupTwitterWebhook() {
        this.app.post('/webhook/twitter',
            express.json(),
            async (req, res) => {
                // Handle Twitter events
                // Use same voice transcription
                // Use same AI response generation
            }
        );
    }
}

export const webhookService = new WebhookService();