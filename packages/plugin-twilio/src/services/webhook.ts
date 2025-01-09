//  /packages/plugin-twilio/src/services/webhook.ts

import { Service, ServiceType, IAgentRuntime, Memory, Content } from '@elizaos/core';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { twilioService } from './twilio.js';
import { verifyService } from './verify.js';
import twilio from 'twilio';
import { randomUUID } from 'crypto';

export class WebhookService implements Service {
    private static instance: WebhookService | null = null;
    private static expressApp: express.Express | null = null;
    private static server: any = null;
    private app: express.Express = express();
    private runtime: IAgentRuntime | null = null;
    private initialized: boolean = false;

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

    async initialize(runtime?: IAgentRuntime): Promise<void> {
        if (this.initialized) return;

        try {
            this.runtime = runtime || null;
            await this.startServer();
            this.initialized = true;
            console.log('WebhookService initialized successfully');
        } catch (error) {
            console.error('Failed to initialize WebhookService:', error);
            throw error;
        }
    }

    private async handleSMSMessage(phoneNumber: string, text: string) {
        // Handle verification command
        if (text.toLowerCase() === 'verify') {
            await verifyService.verifyNumber(phoneNumber);
            await twilioService.sendMessage(phoneNumber,
                "Your number has been verified! You can now chat with me. How can I help you today?");
            return;
        }

        // Check verification status
        if (!verifyService.isVerified(phoneNumber)) {
            await twilioService.sendMessage(phoneNumber,
                "Please verify your number first by texting 'verify'");
            return;
        }

        if (!this.runtime) {
            throw new Error('Runtime not available');
        }

        try {
            const userId = randomUUID();
            const agentId = randomUUID();
            const roomId = randomUUID();

            const message: Memory = {
                userId,
                agentId,
                roomId,
                content: {
                    text,
                    type: 'text'
                }
            };

            const responses: Memory[] = [];
            await this.runtime.processActions(
                message,
                responses,
                undefined,
                async (response: Content) => {
                    if (!response.text || response.text === 'OK') return [];
                    return [{
                        userId,
                        agentId,
                        roomId,
                        content: {
                            text: response.text,
                            type: 'text'
                        }
                    }];
                }
            );

            if (responses.length > 0 && responses[0].content?.text) {
                const responseText = responses[0].content.text;
                if (responseText !== 'OK' && responseText.trim()) {
                    await twilioService.sendMessage(phoneNumber, responseText);
                }
            }
        } catch (error) {
            console.error('Error processing message:', error);
            await twilioService.sendMessage(phoneNumber,
                "I'm sorry, I encountered an error processing your message. Please try again.");
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
                        return res.sendStatus(200);
                    }

                    await this.handleSMSMessage(phoneNumber, text);
                    res.sendStatus(200);
                } catch (error) {
                    console.error('SMS webhook error:', error);
                    res.status(500).send('Internal error');
                }
            }
        );
    }
}

export const webhookService = new WebhookService();