import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import plugin from '../src/plugin';
import { z } from 'zod';

// Mock logger
vi.mock('@elizaos/core', async () => {
    const actual = await vi.importActual('@elizaos/core');
    return {
        ...actual,
        logger: {
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        },
    };
});

// Create a mock runtime for testing
const createMockRuntime = () => ({
    character: {
        name: 'Test Character',
        system: 'Test system prompt',
    },
    getSetting: vi.fn().mockReturnValue(null),
    getService: vi.fn().mockReturnValue(null),
    processActions: vi.fn().mockResolvedValue(undefined),
    actions: [],
    providers: [],
});

describe('Plugin Configuration Schema', () => {
    // Create a backup of the original env values
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset environment variables before each test
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        // Restore original environment variables after each test
        process.env = { ...originalEnv };
    });

    it('should accept valid configuration', async () => {
        const validConfig = {
            ALETHEA_RPC_URL: 'https://api.alethea.ai',
            PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef12345678',
            ALETHEA_API_KEY: 'valid-api-key',
        };

        if (plugin.init) {
            let error = null;
            try {
                await plugin.init(validConfig, createMockRuntime());
            } catch (e) {
                error = e;
            }
            expect(error).toBeNull();
        }
    });

    it('should accept configuration with additional properties', async () => {
        const configWithExtra = {
            ALETHEA_RPC_URL: 'https://api.alethea.ai',
            PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef12345678',
            ALETHEA_API_KEY: 'valid-api-key',
            EXTRA_PROPERTY: 'should be ignored',
        };

        if (plugin.init) {
            let error = null;
            try {
                await plugin.init(configWithExtra, createMockRuntime());
            } catch (e) {
                error = e;
            }
            expect(error).toBeNull();
        }
    });

    it('should reject invalid ALETHEA_RPC_URL format', async () => {
        const invalidConfig = {
            ALETHEA_RPC_URL: 'not-a-valid-url',
            PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef12345678',
            ALETHEA_API_KEY: 'valid-api-key',
        };

        if (plugin.init) {
            let error = null;
            try {
                await plugin.init(invalidConfig, createMockRuntime());
            } catch (e) {
                error = e;
            }
            expect(error).not.toBeNull();
            expect((error as Error).message).toContain('Invalid Alethea AI plugin configuration');
        }
    });

    it('should reject empty ALETHEA_RPC_URL', async () => {
        const invalidConfig = {
            ALETHEA_RPC_URL: '',
            PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef12345678',
            ALETHEA_API_KEY: 'valid-api-key',
        };

        if (plugin.init) {
            let error = null;
            try {
                await plugin.init(invalidConfig, createMockRuntime());
            } catch (e) {
                error = e;
            }
            expect(error).not.toBeNull();
            expect((error as Error).message).toContain('Invalid Alethea AI plugin configuration');
        }
    });

    it('should reject empty PRIVATE_KEY', async () => {
        const invalidConfig = {
            ALETHEA_RPC_URL: 'https://api.alethea.ai',
            PRIVATE_KEY: '',
            ALETHEA_API_KEY: 'valid-api-key',
        };

        if (plugin.init) {
            let error = null;
            try {
                await plugin.init(invalidConfig, createMockRuntime());
            } catch (e) {
                error = e;
            }
            expect(error).not.toBeNull();
            expect((error as Error).message).toContain('Invalid Alethea AI plugin configuration');
        }
    });

    it('should reject empty ALETHEA_API_KEY', async () => {
        const invalidConfig = {
            ALETHEA_RPC_URL: 'https://api.alethea.ai',
            PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef12345678',
            ALETHEA_API_KEY: '',
        };

        if (plugin.init) {
            let error = null;
            try {
                await plugin.init(invalidConfig, createMockRuntime());
            } catch (e) {
                error = e;
            }
            expect(error).not.toBeNull();
            expect((error as Error).message).toContain('Invalid Alethea AI plugin configuration');
        }
    });

    it('should reject configuration with missing required fields', async () => {
        const incompleteConfig = {
            ALETHEA_RPC_URL: 'https://api.alethea.ai',
            // Missing PRIVATE_KEY and ALETHEA_API_KEY
        };

        if (plugin.init) {
            let error = null;
            try {
                await plugin.init(incompleteConfig, createMockRuntime());
            } catch (e) {
                error = e;
            }
            expect(error).not.toBeNull();
            expect((error as Error).message).toContain('Invalid Alethea AI plugin configuration');
        }
    });

    it('should handle multiple validation errors', async () => {
        const invalidConfig = {
            ALETHEA_RPC_URL: 'invalid-url',
            PRIVATE_KEY: '',
            ALETHEA_API_KEY: '',
        };

        if (plugin.init) {
            let error = null;
            try {
                await plugin.init(invalidConfig, createMockRuntime());
            } catch (e) {
                error = e;
            }
            expect(error).not.toBeNull();
            expect((error as Error).message).toContain('Invalid Alethea AI plugin configuration');
            // Should contain information about multiple validation errors
            expect((error as Error).message.includes('ALETHEA_RPC_URL') ||
                (error as Error).message.includes('PRIVATE_KEY') ||
                (error as Error).message.includes('ALETHEA_API_KEY')).toBe(true);
        }
    });

    it('should validate URL format for ALETHEA_RPC_URL', async () => {
        const testCases = [
            { url: 'https://api.alethea.ai', shouldPass: true },
            { url: 'http://localhost:8080', shouldPass: true },
            { url: 'https://test.example.com/api', shouldPass: true },
            { url: 'not-a-url', shouldPass: false },
            { url: 'ftp://invalid.protocol', shouldPass: false },
            { url: '', shouldPass: false },
        ];

        for (const testCase of testCases) {
            const config = {
                ALETHEA_RPC_URL: testCase.url,
                PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef12345678',
                ALETHEA_API_KEY: 'valid-api-key',
            };

            if (plugin.init) {
                let error = null;
                try {
                    await plugin.init(config, createMockRuntime());
                } catch (e) {
                    error = e;
                }

                if (testCase.shouldPass) {
                    expect(error).toBeNull();
                } else {
                    expect(error).not.toBeNull();
                }
            }
        }
    });
});