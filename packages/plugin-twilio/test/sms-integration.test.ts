import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TwilioPlugin } from '../src/twilio-plugin.js';
import { twilioService } from '../src/services/twilio.js';
import { storageService } from '../src/services/storage.js';
import { webhookService } from '../src/services/webhook.js';

describe('SMS Integration Tests', () => {
    const mockRuntime = {
        getSetting: jest.fn(),
        processMessage: jest.fn(),
    };

    const testUserId = 'test-user-123';
    const testPhone = '+1234567890';
    const testMessage = 'Hello from SMS';

    beforeEach(async () => {
        // Clear storage
        await storageService.initialize();
        // Initialize webhook service with mock runtime
        await webhookService.initialize(mockRuntime);
    });

    it('should handle phone verification flow', async () => {
        // 1. Request verification
        const verifyResponse = await twilioService.sendVerificationCode(testPhone);
        expect(verifyResponse).toBeDefined();

        // 2. Verify code
        const isVerified = await twilioService.checkVerificationCode(testPhone, '123456');
        expect(isVerified).toBe(true);

        // 3. Check storage
        const user = await storageService.getVerifiedUser(testUserId);
        expect(user?.phoneNumber).toBe(testPhone);
    });

    it('should handle incoming SMS from verified user', async () => {
        // Setup verified user
        await storageService.storeVerifiedUser(testUserId, testPhone);

        // Mock runtime response
        mockRuntime.processMessage.mockResolvedValue({
            text: 'Response from Eliza'
        });

        // Simulate webhook request
        const response = await fetch('http://localhost:3000/webhook/sms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                From: testPhone,
                Body: testMessage
            })
        });

        expect(response.status).toBe(200);
        expect(mockRuntime.processMessage).toHaveBeenCalledWith({
            userId: testUserId,
            content: { text: testMessage },
            source: 'sms'
        });
    });

    it('should reject unverified numbers', async () => {
        // Simulate webhook request from unverified number
        const response = await fetch('http://localhost:3000/webhook/sms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                From: '+1999999999',
                Body: testMessage
            })
        });

        expect(response.status).toBe(200);
        expect(mockRuntime.processMessage).not.toHaveBeenCalled();
    });
});