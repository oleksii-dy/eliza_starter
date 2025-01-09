import { Service, ServiceType } from '@elizaos/core';
import { twilioService } from './twilio.js';

export class VerifyService implements Service {
    // Simple in-memory store of verified numbers
    private verifiedNumbers: Set<string> = new Set();

    get serviceType(): ServiceType {
        return ServiceType.TEXT_GENERATION;
    }

    // Add required initialize method
    async initialize(): Promise<void> {
        // Nothing to initialize
    }

    isVerified(phoneNumber: string): boolean {
        return this.verifiedNumbers.has(phoneNumber);
    }

    async verifyNumber(phoneNumber: string): Promise<void> {
        // Add to verified numbers after first successful interaction
        this.verifiedNumbers.add(phoneNumber);
        console.log(`Verified number: ${phoneNumber}`);
    }
}

export const verifyService = new VerifyService();