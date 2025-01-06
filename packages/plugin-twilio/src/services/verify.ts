import pkg from 'twilio';
const { Twilio } = pkg;
import { Service, ServiceType } from '@elizaos/core';

export class VerifyService implements Service {
    private client: Twilio | null = null;
    private verifyServiceSid: string | null = null;

    get serviceType(): ServiceType {
        return ServiceType.TEXT_GENERATION;
    }

    async initialize(): Promise<void> {
        try {
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;

            if (!accountSid || !authToken) {
                console.warn('Missing Twilio credentials. Verification service will be disabled.');
                return;
            }

            this.client = new Twilio(accountSid, authToken);

            // Create or get existing Verify service
            const services = await this.client.verify.v2.services.list();
            const existingService = services.find(s => s.friendlyName === 'ElizaVerification');

            if (existingService) {
                this.verifyServiceSid = existingService.sid;
            } else {
                const service = await this.client.verify.v2.services.create({
                    friendlyName: 'ElizaVerification'
                });
                this.verifyServiceSid = service.sid;
            }

            console.log('Twilio verification service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Twilio verification service:', error);
            // Don't throw - allow service to initialize in disabled state
        }
    }

    async sendVerificationCode(phoneNumber: string): Promise<void> {
        if (!this.client || !this.verifyServiceSid) {
            throw new Error('Verify service not initialized');
        }

        await this.client.verify.v2
            .services(this.verifyServiceSid)
            .verifications
            .create({ to: phoneNumber, channel: 'sms' });
    }

    async checkVerificationCode(phoneNumber: string, code: string): Promise<boolean> {
        if (!this.client || !this.verifyServiceSid) {
            throw new Error('Verify service not initialized');
        }

        const verification = await this.client.verify.v2
            .services(this.verifyServiceSid)
            .verificationChecks
            .create({ to: phoneNumber, code });

        return verification.status === 'approved';
    }
}

const verifyService = new VerifyService();
export { verifyService };