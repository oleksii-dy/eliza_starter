import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '@elizaos/core';
import plugin, { AletheaService } from '../src/plugin';
import { z } from 'zod';

// Mock logger to avoid console output during tests
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

describe('Alethea Plugin', () => {
    // Store original environment variables
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

    describe('Plugin Structure', () => {
        it('should have all required properties', () => {
            expect(plugin).toHaveProperty('name', 'alethea');
            expect(plugin).toHaveProperty('description');
            expect(plugin).toHaveProperty('config');
            expect(plugin).toHaveProperty('init');
            expect(plugin).toHaveProperty('services');
            expect(plugin).toHaveProperty('actions');
            expect(plugin).toHaveProperty('providers');
        });

        it('should have a valid description', () => {
            expect(plugin.description).toBe('A plugin for interacting with the Alethea AI platform');
        });

        it('should include AletheaService in services array', () => {
            expect(plugin.services).toContain(AletheaService);
            expect(plugin.services).toHaveLength(1);
        });

        it('should have empty action arrays initially', () => {
            expect(plugin.actions).toEqual([]);
        });

        it('should have empty providers array initially', () => {
            expect(plugin.providers).toEqual([]);
        });
    });

    describe('Configuration Schema Validation', () => {
        it('should accept valid configuration', async () => {
            const validConfig = {
                ALETHEA_RPC_URL: 'https://api.alethea.ai',
                PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef12345678',
                ALETHEA_API_KEY: 'valid-api-key-12345',
            };

            await expect(plugin.init!(validConfig, createMockRuntime())).resolves.not.toThrow();
            expect(logger.info).toHaveBeenCalledWith('*** Initializing Alethea AI plugin ***');
            expect(logger.info).toHaveBeenCalledWith('Alethea AI plugin initialized successfully');
        });

        it('should reject invalid ALETHEA_RPC_URL', async () => {
            const invalidConfig = {
                ALETHEA_RPC_URL: 'not-a-url',
                PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef12345678',
                ALETHEA_API_KEY: 'valid-api-key-12345',
            };

            await expect(plugin.init!(invalidConfig, createMockRuntime())).rejects.toThrow(
                'Invalid Alethea AI plugin configuration'
            );
        });

        it('should reject empty ALETHEA_RPC_URL', async () => {
            const invalidConfig = {
                ALETHEA_RPC_URL: '',
                PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef12345678',
                ALETHEA_API_KEY: 'valid-api-key-12345',
            };

            await expect(plugin.init!(invalidConfig, createMockRuntime())).rejects.toThrow(
                'Invalid Alethea AI plugin configuration'
            );
        });

        it('should reject empty PRIVATE_KEY', async () => {
            const invalidConfig = {
                ALETHEA_RPC_URL: 'https://api.alethea.ai',
                PRIVATE_KEY: '',
                ALETHEA_API_KEY: 'valid-api-key-12345',
            };

            await expect(plugin.init!(invalidConfig, createMockRuntime())).rejects.toThrow(
                'Invalid Alethea AI plugin configuration'
            );
        });

        it('should reject empty ALETHEA_API_KEY', async () => {
            const invalidConfig = {
                ALETHEA_RPC_URL: 'https://api.alethea.ai',
                PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef12345678',
                ALETHEA_API_KEY: '',
            };

            await expect(plugin.init!(invalidConfig, createMockRuntime())).rejects.toThrow(
                'Invalid Alethea AI plugin configuration'
            );
        });

        it('should reject missing required fields', async () => {
            const incompleteConfig = {
                ALETHEA_RPC_URL: 'https://api.alethea.ai',
                // Missing PRIVATE_KEY and ALETHEA_API_KEY
            };

            await expect(plugin.init!(incompleteConfig, createMockRuntime())).rejects.toThrow(
                'Invalid Alethea AI plugin configuration'
            );
        });

        it('should set environment variables on successful validation', async () => {
            const validConfig = {
                ALETHEA_RPC_URL: 'https://api.alethea.ai',
                PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef12345678',
                ALETHEA_API_KEY: 'valid-api-key-12345',
            };

            // Clear environment variables
            delete process.env.ALETHEA_RPC_URL;
            delete process.env.PRIVATE_KEY;
            delete process.env.ALETHEA_API_KEY;

            await plugin.init!(validConfig, createMockRuntime());

            expect(process.env.ALETHEA_RPC_URL).toBe('https://api.alethea.ai');
            expect(process.env.PRIVATE_KEY).toBe('0x1234567890abcdef1234567890abcdef12345678');
            expect(process.env.ALETHEA_API_KEY).toBe('valid-api-key-12345');
        });

        it('should handle zod validation errors properly', async () => {
            const invalidConfig = {
                ALETHEA_RPC_URL: 'invalid-url',
                PRIVATE_KEY: '',
                ALETHEA_API_KEY: '',
            };

            try {
                await plugin.init!(invalidConfig, createMockRuntime());
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain('Invalid Alethea AI plugin configuration');
            }
        });

        it('should handle non-zod errors properly', async () => {
            const validConfig = {
                ALETHEA_RPC_URL: 'https://api.alethea.ai',
                PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef12345678',
                ALETHEA_API_KEY: 'valid-api-key-12345',
            };

            // Mock z.object to throw a non-zod error
            const originalParse = z.object;
            vi.spyOn(z, 'object').mockImplementation(() => {
                throw new Error('Non-zod error');
            });

            await expect(plugin.init!(validConfig, createMockRuntime())).rejects.toThrow('Non-zod error');

            // Restore original implementation
            vi.mocked(z.object).mockRestore();
        });
    });

    describe('Configuration from Environment Variables', () => {
        it('should read configuration from environment variables', () => {
            process.env.ALETHEA_RPC_URL = 'https://env.alethea.ai';
            process.env.PRIVATE_KEY = '0xenv1234567890abcdef1234567890abcdef12345678';
            process.env.ALETHEA_API_KEY = 'env-api-key-12345';

            expect(plugin.config.ALETHEA_RPC_URL).toBe('https://env.alethea.ai');
            expect(plugin.config.PRIVATE_KEY).toBe('0xenv1234567890abcdef1234567890abcdef12345678');
            expect(plugin.config.ALETHEA_API_KEY).toBe('env-api-key-12345');
        });

        it('should handle undefined environment variables', () => {
            delete process.env.ALETHEA_RPC_URL;
            delete process.env.PRIVATE_KEY;
            delete process.env.ALETHEA_API_KEY;

            expect(plugin.config.ALETHEA_RPC_URL).toBeUndefined();
            expect(plugin.config.PRIVATE_KEY).toBeUndefined();
            expect(plugin.config.ALETHEA_API_KEY).toBeUndefined();
        });
    });
});

describe('AletheaService', () => {
    let mockRuntime: any;

    beforeEach(() => {
        mockRuntime = createMockRuntime();
        vi.clearAllMocks();
    });

    describe('Service Properties', () => {
        it('should have correct service type', () => {
            expect(AletheaService.serviceType).toBe('alethea');
        });

        it('should have a valid capability description', () => {
            const service = new AletheaService(mockRuntime);
            expect(service.capabilityDescription).toBe(
                'This service provides access to Alethea AI platform, including AliAgents, INFTs, Hive, tokens, and governance.'
            );
        });

        it('should construct with runtime', () => {
            const service = new AletheaService(mockRuntime);
            expect(service).toBeInstanceOf(AletheaService);
        });
    });

    describe('Service Lifecycle', () => {
        it('should start successfully', async () => {
            const service = await AletheaService.start(mockRuntime);
            expect(service).toBeInstanceOf(AletheaService);
            expect(logger.info).toHaveBeenCalledWith('*** Starting Alethea AI service ***');
        });

        it('should stop successfully when service exists', async () => {
            // Mock the service to exist in runtime
            const mockService = new AletheaService(mockRuntime);
            mockService.stop = vi.fn();
            mockRuntime.getService.mockReturnValue(mockService);

            await AletheaService.stop(mockRuntime);

            expect(logger.info).toHaveBeenCalledWith('*** Stopping Alethea AI service ***');
            expect(mockRuntime.getService).toHaveBeenCalledWith('alethea');
            expect(mockService.stop).toHaveBeenCalled();
        });

        it('should throw error when stopping non-existent service', async () => {
            mockRuntime.getService.mockReturnValue(null);

            await expect(AletheaService.stop(mockRuntime)).rejects.toThrow(
                'Alethea AI service not found'
            );
            expect(logger.info).toHaveBeenCalledWith('*** Stopping Alethea AI service ***');
            expect(mockRuntime.getService).toHaveBeenCalledWith('alethea');
        });

        it('should stop instance successfully', async () => {
            const service = new AletheaService(mockRuntime);
            await service.stop();
            expect(logger.info).toHaveBeenCalledWith('*** Stopping Alethea AI service instance ***');
        });
    });
});