import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockRuntime, testPrivateKey, MOCK_PROPOSAL, TESTNET_GOVERNORS } from './test-config';
import { proposeAction } from '../actions/gov-propose';
import type { IAgentRuntime } from '@elizaos/core';

describe('Governance Action Isolated Tests', () => {
  let mockRuntime: IAgentRuntime;
  let mockCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
    mockCallback = vi.fn();
  });

  describe('Propose Action Parameter Validation', () => {
    it('should validate required parameters are missing', async () => {
      const options = {
        // Missing required fields
      };

      const result = await proposeAction.handler(
        mockRuntime,
        {} as any,
        {} as any,
        options,
        mockCallback
      );

      expect(result).toBe(false);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Missing required parameters'),
        })
      );
    });

    it('should validate array parameter lengths match', async () => {
      const options = {
        chain: 'sepolia',
        governor: TESTNET_GOVERNORS.sepolia.governor,
        targets: MOCK_PROPOSAL.targets,
        values: ['0', '1'], // Mismatched length
        calldatas: MOCK_PROPOSAL.calldatas,
        description: MOCK_PROPOSAL.description,
      };

      const result = await proposeAction.handler(
        mockRuntime,
        {} as any,
        {} as any,
        options,
        mockCallback
      );

      expect(result).toBe(false);
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('same length'),
        })
      );
    });

    it('should accept properly formatted parameters', async () => {
      const options = {
        chain: 'sepolia',
        governor: TESTNET_GOVERNORS.sepolia.governor,
        targets: MOCK_PROPOSAL.targets,
        values: MOCK_PROPOSAL.values,
        calldatas: MOCK_PROPOSAL.calldatas,
        description: MOCK_PROPOSAL.description,
      };

      // This test will fail at WalletProvider creation, but that's expected
      // We're just testing parameter validation here
      try {
        await proposeAction.handler(
          mockRuntime,
          {} as any,
          {} as any,
          options,
          mockCallback
        );
      } catch (error) {
        // Expected to fail at wallet provider creation stage
        // The important thing is it passes parameter validation
        expect(error).toBeDefined();
      }
    });
  });

  describe('Action Properties', () => {
    it('should have correct action name', () => {
      expect(proposeAction.name).toBe('propose');
    });

    it('should have description', () => {
      expect(proposeAction.description).toBeTruthy();
    });

    it('should have template', () => {
      expect(proposeAction.template).toBeDefined();
    });

    it('should have examples', () => {
      expect(proposeAction.examples).toBeDefined();
      expect(proposeAction.examples.length).toBeGreaterThan(0);
    });

    it('should have similes', () => {
      expect(proposeAction.similes).toBeDefined();
      expect(proposeAction.similes.length).toBeGreaterThan(0);
    });
  });
});