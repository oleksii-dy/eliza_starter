//  /packages/plugin-twilio/src/services/webhook.ts

import { Service, ServiceType, IAgentRuntime } from '@elizaos/core';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { twilioService } from './twilio.js';
import { storageService } from './storage.js';
import { RuntimeContext } from './runtime-context.js';
import { verifyService } from './verify.js';
import { voiceService } from './voice.js';
import twilio from 'twilio';
import { Request, Response, NextFunction } from 'express';

export class WebhookService implements Service {
    private static instance: WebhookService | null = null;
    private static expressApp: express.Express | null = null;
    private static server: any = null;
    private static initializationPromise: Promise<void> | null = null;
    private app: express.Express;
    private runtime: IAgentRuntime | null = null;
    private initialized: boolean = false;

    constructor() {
        // Return existing instance if available
        if (WebhookService.instance) {
            return WebhookService.instance;
        }

        // Create new instance
        if (!WebhookService.expressApp) {
            WebhookService.expressApp = express();
            this.setupMiddleware(WebhookService.expressApp);
        }
        this.app = WebhookService.expressApp;
        WebhookService.instance = this;
    }

    private setupMiddleware(app: express.Express) {
        // Basic middleware
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // CORS headers
        app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, X-Twilio-Signature');
            if (req.method === 'OPTIONS') {
                return res.sendStatus(200);
            }
            next();
        });

        // Request logging
        app.use((req, res, next) => {
            console.log(`${req.method} ${req.url}`, {
                headers: req.headers,
                body: req.body
            });
            next();
        });
    }

    get serviceType(): ServiceType {
        return ServiceType.TEXT_GENERATION;
    }

    async initialize(runtime?: IAgentRuntime): Promise<void> {
        // Return immediately if already initialized
        if (this.initialized) {
            console.log('WebhookService already initialized');
            return;
        }

        try {
            this.runtime = runtime || null;

            // Start webhook server first
            await this.startServer();

            this.initialized = true;
            console.log('WebhookService initialized successfully');
        } catch (error) {
            console.error('Failed to initialize WebhookService:', error);
            throw error;
        }
    }

    private async _initialize(runtime?: IAgentRuntime): Promise<void> {
        this.runtime = runtime || RuntimeContext.getRuntime();
        if (!this.runtime) {
            throw new Error('Runtime not available');
        }

        // Setup routes only if not already set
        if (!this.routesInitialized()) {
            this.setupSMSWebhook();
            this.setupVerificationWebhook();
            this.setupAPIRoutes();
        }

        // Start server only if not already running
        if (!WebhookService.server) {
            await this.startServer();
        }
    }

    private routesInitialized(): boolean {
        const routes = this.app._router?.stack
            ?.filter((r: any) => r.route)
            ?.map((r: any) => `${Object.keys(r.route.methods)} ${r.route.path}`) || [];
        return routes.length > 0;
    }

    private setupSMSWebhook() {
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        const webhookUrl = process.env.WEBHOOK_URL;

        if (!twilioAuthToken || !webhookUrl) {
            throw new Error('TWILIO_AUTH_TOKEN and WEBHOOK_URL are required');
        }

        // Debug middleware
        this.app.use('/webhook/sms', (req, res, next) => {
            console.log('Webhook request details:', {
                url: req.url,
                method: req.method,
                headers: req.headers,
                body: req.body,
                signature: req.headers['x-twilio-signature']
            });
            next();
        });

        // Twilio validation middleware
        this.app.post('/webhook/sms',
            express.urlencoded({ extended: false }),
            (req, res, next) => {
                // Log incoming request for debugging
                console.log('Webhook request:', {
                    url: req.url,
                    method: req.method,
                    headers: {
                        'x-twilio-signature': req.headers['x-twilio-signature'],
                        'content-type': req.headers['content-type']
                    },
                    body: req.body
                });
                next();
            },
            twilio.webhook({
                validate: false, // Only validate in production
                authToken: process.env.TWILIO_AUTH_TOKEN!
            }),
            async (req, res) => {
                try {
                    const phoneNumber = this.normalizePhone(req.body.From);
                    const text = req.body.Body?.toLowerCase() || '';

                    console.log('Processing SMS:', { from: phoneNumber, body: text });

                    // Skip empty messages or messages from our own number
                    if (!text.trim() || phoneNumber === process.env.TWILIO_PHONE_NUMBER) {
                        console.log('Skipping message:', { empty: !text.trim(), fromSelf: phoneNumber === process.env.TWILIO_PHONE_NUMBER });
                        return res.sendStatus(200);
                    }

                    // Get user ID from phone number
                    const userId = await this.getUserIdFromPhone(phoneNumber);
                    console.log('User lookup:', { phoneNumber, userId });

                    // Handle verification requests
                    if (text.startsWith('verify')) {
                        console.log('Handling verification request');
                        await this.handleVerification(phoneNumber, text);
                        return res.sendStatus(200);
                    }

                    // Handle unverified users
                    if (!userId) {
                        console.log('User not verified, sending verification instructions');
                        await twilioService.sendMessage(phoneNumber,
                            "Please verify your number first by texting 'verify'.");
                        return res.sendStatus(200);
                    }

                    // Process message with runtime
                    if (!this.runtime) {
                        throw new Error('Runtime not available');
                    }

                    console.log('Processing message with runtime');
                    const response = await this.runtime.processMessage({
                        userId: userId,
                        content: { text },
                        source: 'sms'
                    });

                    // Send response back to user
                    if (response?.text) {
                        console.log('Sending response:', response.text);
                        await twilioService.sendMessage(phoneNumber, response.text);
                    }

                    res.sendStatus(200);

                } catch (error: any) {
                    console.error('Webhook error:', {
                        message: error.message,
                        stack: error.stack,
                        details: error
                    });
                    res.status(500).send(error.message);
                }
            }
        );
    }

    private setupVerificationWebhook() {
        this.app.post('/webhook/verify', async (req, res) => {
            try {
                const { phoneNumber, code } = req.body;
                const isValid = await verifyService.verifyCode(phoneNumber, code);
                res.json({ success: isValid });
            } catch (error) {
                console.error('Verification error:', error);
                res.status(500).json({ error: 'Verification failed' });
            }
        });
    }

    private setupAPIRoutes() {
        this.app.get('/api/agents', (req, res) => {
            if (!this.runtime?.character) {
                return res.status(404).json({ error: 'No agent available' });
            }

            const { name, description, personality, capabilities } = this.runtime.character;
            res.json({
                name,
                description,
                personality,
                capabilities,
                phoneNumber: process.env.TWILIO_PHONE_NUMBER
            });
        });
    }

    private async startServer(): Promise<void> {
        const WEBHOOK_PORT = Number(process.env.WEBHOOK_PORT || 3003);
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000; // 1 second

        try {
            // Create a new express app specifically for webhooks
            if (!this.app) {
                this.app = express();
                this.setupMiddleware(this.app);
            }

            // Setup routes before starting server
            if (!this.routesInitialized()) {
                this.setupSMSWebhook();
                this.setupVerificationWebhook();
                this.setupAPIRoutes();
            }

            // Close any existing server
            if (WebhookService.server) {
                await new Promise(resolve => WebhookService.server.close(resolve));
                WebhookService.server = null;
            }

            // Try to start server with retries
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    console.log(`Starting Twilio webhook server (attempt ${attempt}/${MAX_RETRIES})...`);

                    WebhookService.server = await new Promise((resolve, reject) => {
                        // Create server but don't start listening yet
                        const server = this.app.listen(WEBHOOK_PORT)
                            .once('listening', () => {
                                console.log(`✓ Twilio webhook server listening on port ${WEBHOOK_PORT}`);
                                resolve(server);
                            })
                            .once('error', (error: any) => {
                                server.removeAllListeners();
                                if (error.code === 'EADDRINUSE') {
                                    console.error(`Port ${WEBHOOK_PORT} is in use. Retrying...`);
                                }
                                reject(error);
                            });
                    });

                    // If we get here, server started successfully
                    if (process.env.WEBHOOK_URL) {
                        console.log(`✓ Webhook URL: ${process.env.WEBHOOK_URL}`);
                    }
                    return;

                } catch (error) {
                    if (attempt === MAX_RETRIES) {
                        throw error;
                    }
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                }
            }

        } catch (error) {
            console.error('Failed to start webhook server:', error);
            throw error;
        }
    }

    private normalizePhone(phone: string): string {
        phone = phone.trim();
        return phone.startsWith('+') ? phone : `+${phone}`;
    }

    private async getUserIdFromPhone(phoneNumber: string): Promise<string | undefined> {
        const users = await storageService.getAllVerifiedUsers();
        for (const [userId, data] of users) {
            if (data.phoneNumber === phoneNumber) {
                return userId;
            }
        }
        return undefined;
    }

    private async handleVerification(phoneNumber: string, text: string) {
        try {
            if (text === 'verify') {
                await verifyService.sendVerificationCode(phoneNumber);
            } else if (text.startsWith('verify code')) {
                const code = text.split(' ')[2];
                const isValid = await verifyService.verifyCode(phoneNumber, code);
                const message = isValid
                    ? "Your number has been verified! You can now use the service."
                    : "Invalid code. Please try again or text 'verify' to get a new code.";
                await twilioService.sendMessage(phoneNumber, message);
            }
        } catch (error: any) {
            if (error.message.includes('A2P 10DLC registration')) {
                await twilioService.sendMessage(
                    phoneNumber,
                    'Sorry, our messaging service is being upgraded for US numbers. ' +
                    'Please try again later or contact support.'
                );
            }
            throw error;
        }
    }

    async shutdown(): Promise<void> {
        if (WebhookService.server) {
            await new Promise(resolve => WebhookService.server.close(resolve));
            WebhookService.server = null;
        }
    }
}

// Export single instance
export const webhookService = new WebhookService();