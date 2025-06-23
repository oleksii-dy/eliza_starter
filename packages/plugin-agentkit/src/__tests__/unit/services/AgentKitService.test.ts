import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { AgentKitService } from '../../../services/AgentKitService';
import { createMockRuntime } from '../../test-utils';
import type { IAgentRuntime } from '../../../types/core.d';
import { AgentKit } from '@coinbase/agentkit';

// The mocks are set up in test-setup.ts

describe('AgentKitService', () => {
    let mockRuntime: IAgentRuntime;
    let service: AgentKitService;
    
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Set up process.env as fallback
        process.env.CDP_API_KEY_NAME = 'test-api-key';
        process.env.CDP_API_KEY_PRIVATE_KEY = 'test-private-key';
        process.env.CDP_AGENT_KIT_NETWORK = 'base-sepolia';
        
        // Create mock runtime
        mockRuntime = createMockRuntime();
        
        // Create service instance with runtime
        service = new AgentKitService(mockRuntime);
    });

    afterEach(() => {
        // Clean up env vars
        delete process.env.CDP_API_KEY_NAME;
        delete process.env.CDP_API_KEY_PRIVATE_KEY;
        delete process.env.CDP_AGENT_KIT_NETWORK;
    });

    describe('initialization', () => {
        it('should initialize with runtime settings', async () => {
            await service.initialize();

            expect(mockRuntime.getSetting).toHaveBeenCalledWith('CDP_API_KEY_NAME');
            expect(mockRuntime.getSetting).toHaveBeenCalledWith('CDP_API_KEY_PRIVATE_KEY');
        });

        it('should fall back to environment variables when settings are not available', async () => {
            mockRuntime.getSetting = vi.fn().mockReturnValue(null);

            await service.initialize();

            expect(service.isReady()).toBe(true);
        });

        it('should throw error when no credentials are available', async () => {
            mockRuntime.getSetting = vi.fn().mockReturnValue(null);
            delete process.env.CDP_API_KEY_NAME;
            delete process.env.CDP_API_KEY_PRIVATE_KEY;

            await expect(service.initialize()).rejects.toThrow(
                '[AgentKit] Missing required CDP API credentials'
            );
        });

        it('should handle initialization errors gracefully', async () => {
            const mockError = new Error('AgentKit initialization failed');
            (AgentKit.from as any).mockRejectedValueOnce(mockError);

            await expect(service.initialize()).rejects.toThrow(
                'AgentKit initialization failed'
            );
        });
    });

    describe('isReady', () => {
        it('should return false before initialization', () => {
            expect(service.isReady()).toBe(false);
        });

        it('should return true after successful initialization', async () => {
            await service.initialize();
            expect(service.isReady()).toBe(true);
        });
    });

    describe('getAgentKit', () => {
        it('should return agentkit instance after initialization', async () => {
            await service.initialize();
            const agentKit = service.getAgentKit();
            
            expect(agentKit).toBeDefined();
            expect(agentKit).not.toBeNull();
        });

        it('should throw error before initialization', () => {
            expect(() => service.getAgentKit()).toThrow('AgentKit service not initialized');
        });
    });

    describe('stop', () => {
        it('should clean up resources', async () => {
            await service.initialize();
            await service.stop();
            
            expect(service.isReady()).toBe(false);
            expect(() => service.getAgentKit()).toThrow('AgentKit service not initialized');
        });

        it('should handle stop when not initialized', async () => {
            await expect(service.stop()).resolves.not.toThrow();
        });
    });

    describe('static start method', () => {
        it('should create and initialize service', async () => {
            const service = await AgentKitService.start(mockRuntime);
            
            expect(service).toBeInstanceOf(AgentKitService);
            expect(service.isReady()).toBe(true);
        });

        it('should pass through initialization errors', async () => {
            mockRuntime.getSetting = vi.fn().mockReturnValue(null);
            delete process.env.CDP_API_KEY_NAME;
            delete process.env.CDP_API_KEY_PRIVATE_KEY;

            await expect(AgentKitService.start(mockRuntime)).rejects.toThrow(
                '[AgentKit] Missing required CDP API credentials'
            );
        });
    });

    describe('capabilityDescription', () => {
        it('should return correct description', () => {
            expect(service.capabilityDescription).toBe('CDP AgentKit service for blockchain interactions');
        });
    });
}); 