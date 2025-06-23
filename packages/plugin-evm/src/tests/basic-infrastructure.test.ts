import { describe, it, expect, beforeEach } from 'vitest';
import { createMockRuntime, testPrivateKey, MOCK_PROPOSAL } from './test-config';
import { proposeAction } from '../actions/gov-propose';
import type { IAgentRuntime } from '@elizaos/core';

describe('Basic Test Infrastructure', () => {
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
  });

  describe('Mock Runtime Configuration', () => {
    it('should provide EVM_PRIVATE_KEY', () => {
      const privateKey = mockRuntime.getSetting('EVM_PRIVATE_KEY');
      expect(privateKey).toBe(testPrivateKey);
    });

    it('should provide database URL', () => {
      const dbUrl = mockRuntime.getSetting('WALLET_DATABASE_URL');
      expect(dbUrl).toBe('sqlite::memory:');
    });

    it('should provide RPC URLs', () => {
      const sepoliaRpc = mockRuntime.getSetting('SEPOLIA_RPC_URL');
      expect(sepoliaRpc).toBeTruthy();
    });
  });

  describe('Action Validation', () => {
    it('should validate propose action', async () => {
      const isValid = await proposeAction.validate(mockRuntime);
      expect(isValid).toBe(true);
    });
  });

  describe('Mock Proposal Data', () => {
    it('should have properly formatted proposal data', () => {
      expect(MOCK_PROPOSAL.targets).toHaveLength(1);
      expect(MOCK_PROPOSAL.values).toHaveLength(1);
      expect(MOCK_PROPOSAL.calldatas).toHaveLength(1);
      expect(MOCK_PROPOSAL.description).toBeTruthy();
    });
  });
});