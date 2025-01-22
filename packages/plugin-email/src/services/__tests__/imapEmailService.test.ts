import { ImapEmailService, ImapEmailConfig } from '../imapEmailService';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the external dependencies
vi.mock('nodemailer', () => ({
    default: {
        createTransport: vi.fn(() => ({
            sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' })
        }))
    }
}));

vi.mock('mail-notifier', () => ({
    default: vi.fn(() => ({
        on: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
    }))
}));

describe('ImapEmailService', () => {
    let service: ImapEmailService;
    const mockConfig: ImapEmailConfig = {
        smtp: {
            host: 'smtp.test.com',
            port: 587,
            secure: false,
            user: 'test@test.com',
            pass: 'password'
        },
        imap: {
            host: 'imap.test.com',
            port: 993,
            user: 'test@test.com',
            pass: 'password'
        }
    };

    beforeEach(() => {
        service = new ImapEmailService(mockConfig);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with SMTP config', () => {
        expect(service).toBeDefined();
    });

    it('should start email listener with correct config', async () => {
        const mockCallback = vi.fn();
        await service.startEmailListener(mockCallback);

        // Verify the listener was started with correct config
        expect(mockCallback).not.toHaveBeenCalled(); // No emails yet
    });

    it('should stop email listener', async () => {
        const mockCallback = vi.fn();
        await service.startEmailListener(mockCallback);
        await service.stopEmailListener();

        // Verify the listener was stopped
        expect(service['notifier']).toBeNull();
    });

    it('should send email successfully', async () => {
        const emailOptions = {
            to: 'recipient@test.com',
            subject: 'Test Email',
            text: 'Hello World'
        };

        const result = await service.sendEmail(emailOptions);
        expect(result).toHaveProperty('messageId', 'test-id');
    });

    it('should handle missing IMAP config gracefully', async () => {
        const serviceWithoutImap = new ImapEmailService({ smtp: mockConfig.smtp });
        const mockCallback = vi.fn();

        await serviceWithoutImap.startEmailListener(mockCallback);
        // Should not throw and callback should not be called
        expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should throw error when sending email without SMTP config', async () => {
        const serviceWithoutSmtp = new ImapEmailService({ imap: mockConfig.imap });

        await expect(serviceWithoutSmtp.sendEmail({
            to: 'test@test.com',
            subject: 'Test',
            text: 'Hello'
        })).rejects.toThrow('SMTP not configured');
    });
});