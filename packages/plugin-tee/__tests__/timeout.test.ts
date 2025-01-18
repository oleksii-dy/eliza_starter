import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RemoteAttestationProvider } from '../src/providers/remoteAttestationProvider';
import { DeriveKeyProvider } from '../src/providers/deriveKeyProvider';
import { TEEMode } from '../src/types/tee';
import { TappdClient } from '@phala/dstack-sdk';

// Mock TappdClient
vi.mock('@phala/dstack-sdk', () => ({
    TappdClient: vi.fn().mockImplementation(() => ({
        tdxQuote: vi.fn(),
        deriveKey: vi.fn()
    }))
}));

describe('TEE Provider Timeout Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('RemoteAttestationProvider', () => {
        it('should handle API timeout during attestation generation', async () => {
            // Mock TappdClient to simulate timeout
            vi.mocked(TappdClient).mockImplementationOnce(() => ({
                tdxQuote: vi.fn().mockRejectedValue(new Error('Request timed out')),
                deriveKey: vi.fn()
            }));

            const provider = new RemoteAttestationProvider(TEEMode.LOCAL);
            await expect(() => provider.generateAttestation('test-data'))
                .rejects
                .toThrow('Failed to generate TDX Quote: Request timed out');
        });
    });

    describe('DeriveKeyProvider', () => {
        it('should handle API timeout during key derivation', async () => {
            // Mock TappdClient to simulate timeout
            vi.mocked(TappdClient).mockImplementationOnce(() => ({
                tdxQuote: vi.fn(),
                deriveKey: vi.fn().mockRejectedValue(new Error('Request timed out'))
            }));

            const provider = new DeriveKeyProvider(TEEMode.LOCAL);
            await expect(() => provider.rawDeriveKey('test-path', 'test-subject'))
                .rejects
                .toThrow('Request timed out');
        });

        it('should handle API timeout during Ed25519 key derivation', async () => {
            // Mock TappdClient to simulate timeout
            vi.mocked(TappdClient).mockImplementationOnce(() => ({
                tdxQuote: vi.fn(),
                deriveKey: vi.fn().mockRejectedValue(new Error('Request timed out'))
            }));

            const provider = new DeriveKeyProvider(TEEMode.LOCAL);
            await expect(() => provider.deriveEd25519Keypair('test-path', 'test-subject'))
                .rejects
                .toThrow('Request timed out');
        });
    });
});
