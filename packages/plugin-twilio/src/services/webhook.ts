//  /packages/plugin-twilio/src/services/webhook.ts

import { Service, ServiceType, IAgentRuntime } from '@elizaos/core';
import express from 'express';
import { twilioService } from './twilio.js';
import twilio from 'twilio';
import { randomUUID } from 'crypto';
import { Anthropic } from '@anthropic-ai/sdk';
import { LogSanitizer } from '../utils/sanitizer.js';

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

// Add proper type for Anthropic response
interface AnthropicResponse {
    content: Array<{
        type: string;
        text: string;
    }>;
}

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
        console.log('Setting up webhook middleware...');

        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        this.setupWebhooks();

        // Add catch-all route with proper typing
        this.app.use((req, res, next) => {
            console.log(`Received ${req.method} request to ${req.path}`);
            next();
        });

        // Log routes with proper typing
        console.log('Registered routes:',
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

    async initialize(): Promise<void> {
        if (this.initialized) {
            console.log('WebhookService already initialized');
            return;
        }

        try {
            // Initialize Anthropic client
            const apiKey = validateApiKey(process.env.ANTHROPIC_API_KEY);
            this.anthropicClient = new Anthropic({
                apiKey: apiKey,
            });

            // Start server
            await this.startServer();
            this.initialized = true;

            console.log('Webhook service initialized');
        } catch (error) {
            console.error('Webhook Service Initialization Error:', error);
            throw error;
        }
    }

    async configure(runtime?: IAgentRuntime, characterConfig?: any): Promise<void> {
        if (!characterConfig) {
            throw new Error('Character configuration is required');
        }

        // Store configs
        this.characterConfig = characterConfig;
        if (runtime) {
            this.runtime = runtime;
            console.log(`Runtime configured with character: ${characterConfig.name}`);
        }

        // Ensure Anthropic client is initialized
        if (!this.anthropicClient) {
            const apiKey = validateApiKey(process.env.ANTHROPIC_API_KEY);
            this.anthropicClient = new Anthropic({
                apiKey: apiKey,
            });
        }

        // Log successful configuration
        console.log(`Webhook service configured with character: ${characterConfig.name}`);
        console.log('Character config:', {
            name: characterConfig.name,
            model: characterConfig.config?.model,
            personality: characterConfig.personality?.substring(0, 50) + '...'
        });
    }

    private async handleSMSMessage(phoneNumber: string, text: string) {
        try {
            if (!this.runtime || !this.anthropicClient || !this.characterConfig) {
                throw new Error('Runtime, Anthropic client, or character config not available');
            }

            // Use character's model settings if available
            const model = this.characterConfig.config.model || 'claude-3-sonnet-20240229';
            const temperature = this.characterConfig.config.temperature || 0.7;

            const response = await this.anthropicClient.messages.create({
                model,
                max_tokens: 100,
                temperature,
                messages: [{
                    role: 'user',
                    content: text
                }],
                system: this.getSystemPrompt()
            }) as AnthropicResponse;

            if (!response?.content?.[0]?.text) {
                throw new Error('Failed to generate response');
            }

            const responseText = response.content[0].text.trim();
            console.log(this.sanitizeLog(`Sending SMS to ${phoneNumber}: ${responseText}`));
            await twilioService.sendMessage(phoneNumber,
                responseText.length > 160 ?
                    responseText.substring(0, 157) + '...' :
                    responseText
            );

        } catch (error: any) {
            console.error(this.sanitizeLog('SMS Handler Error: ' + error.message));
            await twilioService.sendMessage(
                phoneNumber,
                "Sorry, I hit a snag. Try again!"
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
                    console.error('Voice webhook error:', error);
                    const twiml = new twilio.twiml.VoiceResponse();
                    twiml.say('Sorry, I encountered an error. Please try again later.');
                    res.type('text/xml').send(twiml.toString());
                }
            }
        );
    }

    private async generateVoiceResponse(phoneNumber: string, userInput?: string): Promise<string> {
        if (!this.anthropicClient) {
            throw new Error('Anthropic client not available');
        }

        if (!this.characterConfig) {
            throw new Error('Character configuration not available');
        }

        const defaultResponse = 'Tell me a dad joke';
        const promptContent = userInput || defaultResponse;

        try {
            const response = await this.anthropicClient.messages.create({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 100,
                temperature: 0.7,
                messages: [{
                    role: 'user',
                    content: promptContent
                }],
                system: this.getSystemPrompt()
            }) as AnthropicResponse;

            // Ensure text is a string before returning
            const text = response?.content?.[0]?.text;
            if (typeof text !== 'string') {
                return 'Sorry, I had trouble generating a response. Let me try again!';
            }

            return text.trim();
        } catch (error) {
            return 'Sorry, I encountered an error. Please try again!';
        }
    }

    private getSystemPrompt(): string {
        if (!this.characterConfig) {
            throw new Error('Character configuration not available');
        }

        // Get character's system prompt and personality
        const systemPrompt = this.characterConfig.config.systemPrompt || '';
        const personality = this.characterConfig.personality || '';
        const name = this.characterConfig.name || '';

        return `
            ${systemPrompt}
            ${personality}

            Critical Instructions:
            - NEVER use text actions like *clears throat*, *pauses*, etc.
            - NEVER use emojis or special characters
            - Keep responses under 160 characters but NEVER cut a joke or sentence mid-way
            - For first message only: "Hi, I'm ${name}! Want to hear a dad joke?"
            - For all other messages: Just tell the joke directly without any introduction
            - Never mention your name after first message
            - Keep responses light and fun
            - Use simple language suitable for SMS and voice
            - Include natural pauses with commas
            - If user asks a question, acknowledge it before responding
            - Focus on delivering complete jokes, even if short
            - Use only plain text - no symbols, emojis, or formatting
        `;
    }

    async makeVoiceCall(toNumber: string, message: string): Promise<string> {
        try {
            if (!this.initialized) {
                throw new Error('Webhook service not initialized');
            }

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

            console.log('Voice call initiated:', call.sid);
            return call.sid;

        } catch (error) {
            console.error('Failed to make voice call:', error);
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

    // Add log sanitization
    private sanitizeLog(log: string): string {
        return LogSanitizer.sanitize(log);
    }
}

export const webhookService = new WebhookService();