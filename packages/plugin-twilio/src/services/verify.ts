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

        // Check if it's a US number
        const isUSNumber = phoneNumber.startsWith('+1');

        try {
            this.verificationCodes.set(phoneNumber, code);

            if (isUSNumber) {
                // For US numbers, use messaging service
                await twilioService.sendMessage(
                    phoneNumber,
                    `Your verification code is: ${code}. Reply with "verify code ${code}" to verify your number.`
                );
            } else {
                // For non-US numbers, proceed as normal
                await twilioService.sendMessage(
                    phoneNumber,
                    `Your verification code is: ${code}. Reply with "verify code ${code}" to verify your number.`
                );
            }
        } catch (error: any) {
            // Remove the code if sending fails
            this.verificationCodes.delete(phoneNumber);

            if (error.message.includes('A2P 10DLC registration')) {
                throw new Error(
                    'Unable to send verification code to US numbers at this time. ' +
                    'Our messaging service is being upgraded. Please try again later or ' +
                    'contact support for assistance.'
                );
            }
            throw error;
        }
    }

    async verifyCode(phoneNumber: string, code: string): Promise<boolean> {
        console.log('Verifying code:', {
            phoneNumber,
            receivedCode: code,
            storedCode: this.verificationCodes.get(phoneNumber)
        });

        const storedCode = this.verificationCodes.get(phoneNumber);
        const isValid = storedCode === code;

        console.log('Verification result:', {
            isValid,
            storedCode,
            receivedCode: code
        });

        if (isValid) {
            await storageService.storeVerifiedUser(phoneNumber, phoneNumber);
            this.verificationCodes.delete(phoneNumber);
        }

        return isValid;
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

    getStoredCodes(): Map<string, string> {
        return new Map(this.verificationCodes);
    }
}

const verifyService = new VerifyService();
export { verifyService };