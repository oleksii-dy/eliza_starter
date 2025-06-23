import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('@solana/web3.js', () => ({
    Connection: vi.fn(() => ({
        getSlot: vi.fn(),
        getBlockHeight: vi.fn(),
        getHealth: vi.fn(),
    })),
}));

vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    }
}));

vi.mock('@elizaos/core', () => ({
    Service: class Service {
        constructor(protected runtime: any) {}
    },
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

import { RpcService } from '../../services/RpcService';
import { Connection } from '@solana/web3.js';
import { logger } from '@elizaos/core';

describe('RpcService', () => {
    let service: RpcService;
    let mockRuntime: any;
    let mockConnection: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockRuntime = {
            getSetting: vi.fn((key: string) => {
                const settings: Record<string, string> = {
                    SOLANA_RPC_URL: 'https://api.devnet.solana.com',
                    SOLANA_NETWORK: 'devnet',
                    HELIUS_API_KEY: 'test-helius-key',
                };
                return settings[key];
            }),
        };

        service = new RpcService(mockRuntime);
        mockConnection = (Connection as any).mock.results[0]?.value;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with default endpoints', () => {
            expect(service).toBeInstanceOf(RpcService);
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('RpcService initialized')
            );
        });

        it('should initialize with custom RPC URL', () => {
            const customRpc = 'https://custom.rpc.url';
            mockRuntime.getSetting = vi.fn((key: string) => {
                if (key === 'SOLANA_RPC_URL') return customRpc;
                if (key === 'SOLANA_NETWORK') return 'mainnet-beta';
                return '';
            });

            const customService = new RpcService(mockRuntime);
            expect(customService).toBeInstanceOf(RpcService);
        });

        it('should handle missing configuration gracefully', () => {
            mockRuntime.getSetting = vi.fn(() => '');

            const serviceWithoutConfig = new RpcService(mockRuntime);
            expect(serviceWithoutConfig).toBeInstanceOf(RpcService);
        });
    });

    describe('getConnection', () => {
        it('should return a connection', () => {
            const connection = service.getConnection();
            expect(connection).toBeDefined();
        });

        it('should return the same connection on subsequent calls', () => {
            const connection1 = service.getConnection();
            const connection2 = service.getConnection();
            expect(connection1).toBe(connection2);
        });
    });

    describe('getStatus', () => {
        beforeEach(() => {
            if (mockConnection) {
                mockConnection.getSlot = vi.fn().mockResolvedValue(12345);
                mockConnection.getBlockHeight = vi.fn().mockResolvedValue(12300);
                mockConnection.getHealth = vi.fn().mockResolvedValue('ok');
            }
        });

        it('should return service status', async () => {
            const status = service.getStatus();
            
            expect(status).toEqual({
                healthy: expect.any(Boolean),
                endpointCount: expect.any(Number),
                currentEndpoint: expect.any(String),
                endpoints: expect.any(Array),
            });
        });

        it('should indicate healthy status with good endpoints', () => {
            const status = service.getStatus();
            expect(status.healthy).toBe(true);
        });
    });

    describe('network detection', () => {
        it('should detect devnet network', () => {
            mockRuntime.getSetting = vi.fn((key: string) => {
                if (key === 'SOLANA_NETWORK') return 'devnet';
                return '';
            });

            const devnetService = new RpcService(mockRuntime);
            expect(devnetService).toBeInstanceOf(RpcService);
        });

        it('should detect mainnet network', () => {
            mockRuntime.getSetting = vi.fn((key: string) => {
                if (key === 'SOLANA_NETWORK') return 'mainnet-beta';
                return '';
            });

            const mainnetService = new RpcService(mockRuntime);
            expect(mainnetService).toBeInstanceOf(RpcService);
        });

        it('should default to devnet if no network specified', () => {
            mockRuntime.getSetting = vi.fn(() => '');

            const defaultService = new RpcService(mockRuntime);
            expect(defaultService).toBeInstanceOf(RpcService);
        });
    });

    describe('service lifecycle', () => {
        it('should start service correctly', async () => {
            const startedService = await RpcService.start(mockRuntime);
            
            expect(startedService).toBeInstanceOf(RpcService);
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('RpcService initialized')
            );
        });

        it('should stop service correctly', async () => {
            await service.stop();
            
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('RpcService stopped')
            );
        });
    });

    describe('error handling', () => {
        it('should handle connection errors gracefully', () => {
            mockRuntime.getSetting = vi.fn(() => {
                throw new Error('Config error');
            });

            expect(() => new RpcService(mockRuntime)).not.toThrow();
        });

        it('should handle invalid RPC URLs', () => {
            mockRuntime.getSetting = vi.fn((key: string) => {
                if (key === 'SOLANA_RPC_URL') return 'invalid-url';
                return '';
            });

            expect(() => new RpcService(mockRuntime)).not.toThrow();
        });
    });
});