import { Service, ServiceType } from '@elizaos/core';
import { twilioService } from './twilio.js';
import { storageService } from './storage.js';

export class VerifyService implements Service {
    private verificationCodes = new Map<string, string>();

    get serviceType(): ServiceType {
        return ServiceType.TEXT_GENERATION;
    }

    async initialize(): Promise<void> {
        console.log('Twilio verification service initialized successfully');
    }

    async sendVerificationCode(phoneNumber: string): Promise<void> {
        console.log('VerifyService: Starting verification for:', phoneNumber);

        // Generate code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        console.log('VerifyService: Generated code:', code);

        this.verificationCodes.set(phoneNumber, code);
        console.log('VerifyService: Stored code in map');

        // Send via SMS
        try {
            console.log('VerifyService: Attempting to send SMS via twilioService');
            await twilioService.sendMessage(
                phoneNumber,
                `Your verification code is: ${code}. Reply with "verify code ${code}" to verify your number.`
            );
            console.log('VerifyService: SMS sent successfully');
        } catch (error) {
            console.error('VerifyService: Failed to send SMS:', error as Error);
            throw error;
        }
    }

    async verifyCode(phoneNumber: string, code: string): Promise<boolean> {
        const storedCode = this.verificationCodes.get(phoneNumber);
        if (storedCode === code) {
            await storageService.storeVerifiedUser(phoneNumber, phoneNumber);
            this.verificationCodes.delete(phoneNumber);
            return true;
        }
        return false;
    }

    async getVerifiedUserId(phoneNumber: string): Promise<string | undefined> {
        const users = await storageService.getAllVerifiedUsers();
        for (const [userId, data] of users) {
            if (data.phoneNumber === phoneNumber) {
                return userId;
            }
        }
        return undefined;
    }

    async sendVoiceVerificationCode(phoneNumber: string): Promise<void> {
        console.log('Generating voice verification code for:', phoneNumber);

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        console.log('Generated code:', code);

        this.verificationCodes.set(phoneNumber, code);

        // Send code via voice call
        const message = `Your verification code is: ${code.split('').join(', ')}. Again, your code is: ${code.split('').join(', ')}`;
        await twilioService.makeVoiceCall(phoneNumber, message);
        console.log('Voice verification call initiated');
    }

    async storePhoneNumber(phoneNumber: string): Promise<void> {
        console.log('Storing phone number:', phoneNumber);

        // Remove verification from any other user with this number
        await storageService.removeVerificationByPhone(phoneNumber);

        // Store the phone number for the current user
        await storageService.storePhoneNumber(phoneNumber);
    }
}

const verifyService = new VerifyService();
export { verifyService };