import { Service, ServiceType } from '@elizaos/core';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { twilioService } from './twilio.js';
import { storageService } from './storage.js';
import { RuntimeContext } from './runtime-context.js';
import { verifyService } from './verify.js';

export class WebhookService implements Service {
    private app: express.Express = express();
    private server: any = null;

    get serviceType(): ServiceType {
        return ServiceType.TEXT_GENERATION;
    }

    async initialize(): Promise<void> {
        const runtime = RuntimeContext.getRuntime();
        if (!runtime) {
            throw new Error('Runtime not available');
        }

        this.app.use(express.urlencoded({ extended: true }));

        // Handle incoming SMS
        this.app.post('/webhook/sms', async (req, res) => {
            try {
                const runtime = RuntimeContext.getRuntime();
                if (!runtime) {
                    console.error('Runtime not available for request');
                    return res.sendStatus(500);
                }

                const normalizePhone = (phone: string) => {
                    phone = phone.trim();
                    return phone.startsWith('+') ? phone : `+${phone}`;
                };

                const phoneNumber = normalizePhone(req.body.From);
                const text = req.body.Body?.toLowerCase() || '';

                console.log('Received SMS message:', {
                    from: phoneNumber,
                    body: text
                });

                // Handle verification requests
                if (text.startsWith('verify')) {
                    if (text === 'verify') {
                        // Send new verification code
                        await verifyService.sendVerificationCode(phoneNumber);
                        return res.sendStatus(200);
                    } else if (text.startsWith('verify code')) {
                        // Verify the code
                        const code = text.split(' ')[2];
                        const isValid = await verifyService.verifyCode(phoneNumber, code);
                        if (isValid) {
                            await twilioService.sendMessage(phoneNumber, "Your number has been verified! You can now use the service.");
                        } else {
                            await twilioService.sendMessage(phoneNumber, "Invalid code. Please try again or text 'verify' to get a new code.");
                        }
                        return res.sendStatus(200);
                    }
                }

                // Get userId for verified users
                const userId = await this.getUserIdFromPhone(phoneNumber);
                if (!userId) {
                    console.log('No verified user found for:', phoneNumber);
                    await twilioService.sendMessage(phoneNumber,
                        "To start using this service, text 'verify' to receive a verification code.");
                    return res.sendStatus(200);
                }

                // Handle normal messages for verified users
                const response = await runtime.processMessage({
                    userId,
                    content: { text },
                    source: 'sms'
                });

                await twilioService.sendMessage(phoneNumber, response.text);
                res.sendStatus(200);
            } catch (error) {
                console.error('Webhook handler error:', error);
                res.sendStatus(500);
            }
        });

        // Start server
        await this.startServer();
    }

    async shutdown(): Promise<void> {
        if (this.server) {
            await new Promise(resolve => this.server.close(resolve));
        }
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

    getPort(): number {
        if (!this.server) {
            throw new Error('Server not initialized');
        }
        const addr = this.server.address();
        return addr.port;
    }

    private async startServer(): Promise<void> {
        const startPort = Number(process.env.WEBHOOK_PORT) || 4000;
        const maxRetries = 10;

        for (let port = startPort; port < startPort + maxRetries; port++) {
            try {
                this.server = await new Promise((resolve, reject) => {
                    const server = this.app.listen(port);

                    server.once('listening', () => {
                        console.log(`✓ Webhook server listening on port ${port}`);
                        resolve(server);
                    });

                    server.once('error', (err: any) => {
                        if (err.code === 'EADDRINUSE') {
                            console.log(`Port ${port} in use, trying next port...`);
                            server.close();
                            resolve(null);
                        } else {
                            reject(err);
                        }
                    });
                });

                if (this.server) {
                    break; // Successfully bound to a port
                }
            } catch (error) {
                console.error(`Error starting server on port ${port}:`, error);
                if (port === startPort + maxRetries - 1) {
                    throw new Error('Could not find an available port');
                }
            }
        }

        if (!this.server) {
            throw new Error('Failed to start webhook server');
        }
    }
}

const webhookService = new WebhookService();
export { webhookService };

export async function handleIncomingSMS(from: string, body: string) {
    // Don't respond to messages from our own number
    if (from === process.env.TWILIO_PHONE_NUMBER) {
        console.log('Ignoring message from our own number');
        return;
    }

    const userId = await verifyService.getVerifiedUserId(from);
    if (!userId && !body.toLowerCase().includes('verify')) {
        await twilioService.sendMessage(
            from,
            "To start using this service, text 'verify' to receive a verification code."
        );
    }
}