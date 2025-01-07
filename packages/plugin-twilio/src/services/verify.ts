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

        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Add warning for non-US numbers
        const isUSNumber = phoneNumber.startsWith('+1');
        if (!isUSNumber) {
            console.log('Warning: Non-US number may receive SMS from an intermediate carrier');
        }

        this.verificationCodes.set(phoneNumber, code);

        await twilioService.sendMessage(
            phoneNumber,
            `Your verification code is: ${code}. Reply with "verify code ${code}" to verify your number.`
        );
    }

    async verifyCode(phoneNumber: string, code: string): Promise<boolean> {
        console.log('VerifyService: Checking code:', { phoneNumber, code });

        const storedCode = this.verificationCodes.get(phoneNumber);
        console.log('VerifyService: Stored code:', storedCode);

        if (storedCode === code) {
            console.log('VerifyService: Code matches');
            await storageService.storeVerifiedUser(phoneNumber, phoneNumber);
            this.verificationCodes.delete(phoneNumber);
            return true;
        }

        console.log('VerifyService: Code does not match');
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