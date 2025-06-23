import { describe, it, expect, vi, beforeEach } from 'vitest';
import { walletProvider } from '../../provider';
import { createMockRuntime, createMockMemory, createMockState } from '../test-utils';
import type { IAgentRuntime } from '../../types/core.d';

describe('walletProvider', () => {
    let mockRuntime: IAgentRuntime;
    let mockAgentKitService: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create mock AgentKit service
        mockAgentKitService = {
            isReady: vi.fn().mockReturnValue(true),
            getAgentKit: vi.fn().mockReturnValue({
                wallet: {
                    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
                },
                walletProvider: {
                    getNetwork: vi.fn().mockResolvedValue('base-sepolia')
                }
            }),
        };

        // Create mock runtime with agentkit service
        mockRuntime = createMockRuntime({
            getService: vi.fn((name: string) => {
                if (name === 'agentkit') {
                    return mockAgentKitService;
                }
                return null;
            }),
        });
    });

    describe('get', () => {
        it('should provide wallet information when service is available', async () => {
            const mockMessage = createMockMemory();
            const mockState = createMockState();
            
            const result = await walletProvider.get(mockRuntime, mockMessage, mockState);

            expect(result).toBeDefined();
            expect(result.text).toContain('Wallet address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
            expect(result.text).toContain('Network: base-sepolia');
            expect(result.values).toEqual({
                walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                network: 'base-sepolia'
            });
        });

        it('should return service not initialized when service is not available', async () => {
            mockRuntime.getService = vi.fn().mockReturnValue(null);
            const mockMessage = createMockMemory();
            const mockState = createMockState();

            const result = await walletProvider.get(mockRuntime, mockMessage, mockState);

            expect(result.text).toBe('[AgentKit] Service not initialized');
            expect(result.values).toEqual({ walletAddress: null });
        });

        it('should return service not initialized when service is not ready', async () => {
            mockAgentKitService.isReady.mockReturnValue(false);
            const mockMessage = createMockMemory();
            const mockState = createMockState();

            const result = await walletProvider.get(mockRuntime, mockMessage, mockState);

            expect(result.text).toBe('[AgentKit] Service not initialized');
            expect(result.values).toEqual({ walletAddress: null });
        });

        it('should handle errors gracefully', async () => {
            mockAgentKitService.getAgentKit.mockImplementation(() => {
                throw new Error('AgentKit error');
            });
            const mockMessage = createMockMemory();
            const mockState = createMockState();

            const result = await walletProvider.get(mockRuntime, mockMessage, mockState);

            expect(result.text).toBe('[AgentKit] Error: AgentKit error');
            expect(result.values).toEqual({ walletAddress: null, error: true });
        });

        it('should handle missing wallet address', async () => {
            mockAgentKitService.getAgentKit.mockReturnValue({
                // No wallet property
            });
            const mockMessage = createMockMemory();
            const mockState = createMockState();

            const result = await walletProvider.get(mockRuntime, mockMessage, mockState);

            expect(result.text).toContain('Wallet address: Unknown');
            expect(result.values?.walletAddress).toBe('Unknown');
        });
    });

    describe('properties', () => {
        it('should have correct metadata', () => {
            expect(walletProvider.name).toBe('agentKitWallet');
            expect(walletProvider.description).toBeDefined();
        });
    });
}); 