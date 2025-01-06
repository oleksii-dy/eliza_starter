import { Service, ServiceType } from '@elizaos/core';
import { Twilio } from 'twilio';
import { VerifiedPhone } from '../models/verified-phone.js';

export class VerifyService implements Service {
    private client: Twilio | null = null;
    private verifyServiceSid: string | null = null;

    get serviceType(): ServiceType {
        return ServiceType.VERIFICATION;
    }

    async initialize(): Promise<void> {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

        if (!accountSid || !authToken || !serviceSid) {
            throw new Error('Missing required Twilio credentials');
        }

        this.client = new Twilio(accountSid, authToken);
        this.verifyServiceSid = serviceSid;
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

    async checkVerificationCode(phoneNumber: string, code: string, userId: string): Promise<boolean> {
        if (!this.client || !this.verifyServiceSid) {
            throw new Error('Verify service not initialized');
        }

        const verification = await this.client.verify.v2
            .services(this.verifyServiceSid)
            .verificationChecks
            .create({ to: phoneNumber, code });

        if (verification.status === 'approved') {
            // Store the verified phone number
            await VerifiedPhone.create({
                userId,
                phoneNumber
            });
            return true;
        }

        return false;
    }

    async isPhoneVerified(phoneNumber: string, userId: string): Promise<boolean> {
        const verifiedPhone = await VerifiedPhone.findOne({
            userId,
            phoneNumber
        });
        return !!verifiedPhone;
    }
}

const verifyService = new VerifyService();
export { verifyService };