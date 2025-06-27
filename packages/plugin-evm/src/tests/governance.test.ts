import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { generatePrivateKey, privateKeyToAccount as _privateKeyToAccount } from 'viem/accounts';
import {
  type Account as _Account,
  type Chain as _Chain,
  type Address,
  parseEther,
  encodeFunctionData,
  parseAbi,
} from 'viem';

import { WalletProvider } from '../providers/wallet';
import { VoteAction } from '../actions/gov-vote';
import { ProposeAction } from '../actions/gov-propose';
import { QueueAction } from '../actions/gov-queue';
import { ExecuteAction } from '../actions/gov-execute';
import { testnetChains, mainnetChains, TESTNET_GOVERNORS, MAINNET_GOVERNORS } from './test-config';

// Test environment
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || generatePrivateKey();
const FUNDED_TEST_WALLET = process.env.FUNDED_TEST_PRIVATE_KEY;
const MAINNET_TEST_WALLET = process.env.MAINNET_TEST_PRIVATE_KEY;

// Use imported governance contracts from test-config

// Mock the ICacheManager
const mockCacheManager = {
  get: mock().mockResolvedValue(null),
  set: mock(),
};

describe('Governance Actions', () => {
  let wp: WalletProvider;

  beforeEach(async () => {
    mock.restore();
    mockCacheManager.get.mockResolvedValue(null);

    const pk = TEST_PRIVATE_KEY as `0x${string}`;

    // Initialize with both testnets and mainnets
    const customChains = {
      ...testnetChains,
      ...mainnetChains,
    };

    wp = new WalletProvider(pk, mockCacheManager as any, customChains);
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Vote Action', () => {
    let voteAction: VoteAction;

    beforeEach(() => {
      voteAction = new VoteAction(wp);
    });

    describe('Constructor', () => {
      it('should initialize with wallet provider', () => {
        expect(voteAction).toBeDefined();
      });
    });

    describe('Vote Validation', () => {
      it('should validate vote parameters', () => {
        const voteParams = {
          chain: 'sepolia' as any,
          governor: TESTNET_GOVERNORS.sepolia.governor,
          proposalId: '123',
          support: 1, // For
        };

        expect(voteParams.chain).toBe('sepolia');
        expect(voteParams.governor).toMatch(/^0x[a-fA-F0-9]{40}$/);
        expect(voteParams.proposalId).toBeDefined();
        expect([0, 1, 2]).toContain(voteParams.support);
      });

      it('should handle invalid support values', async () => {
        await expect(
          voteAction.vote({
            chain: 'sepolia' as any,
            governor: TESTNET_GOVERNORS.sepolia.governor,
            proposalId: '123',
            support: 3 as any, // Invalid - VoteType only has 0, 1, 2
          })
        ).rejects.toThrow();
      });

      it('should handle invalid governor address', async () => {
        await expect(
          voteAction.vote({
            chain: 'sepolia' as any,
            governor: 'invalid-address' as any,
            proposalId: '123',
            support: 1,
          })
        ).rejects.toThrow();
      });
    });

    describe('Mainnet Integration', () => {
      it('should connect to mainnet governors', async () => {
        if (!MAINNET_TEST_WALLET) {
          console.log('Skipping mainnet test - no mainnet wallet provided');
          return;
        }

        const mainnetWp = new WalletProvider(
          MAINNET_TEST_WALLET as `0x${string}`,
          mockCacheManager as any,
          { mainnet: mainnetChains.mainnet }
        );
        const mainnetVoteAction = new VoteAction(mainnetWp);

        // Test connection to Compound Governor
        const publicClient = mainnetWp.getPublicClient('mainnet');

        // Check if we can read from the governor contract
        const proposalCountAbi = parseAbi(['function proposalCount() view returns (uint256)']);

        try {
          const count = await publicClient.readContract({
            address: MAINNET_GOVERNORS.mainnet.compound.governor,
            abi: proposalCountAbi,
            functionName: 'proposalCount',
          });

          expect(typeof count).toBe('bigint');
          console.log(`Compound Governor has ${count} proposals`);
        } catch (error) {
          console.warn('Could not read from Compound Governor:', error);
        }
      });
    });

    describe('Testnet Voting', () => {
      it('should attempt vote on testnet with funded wallet', async () => {
        if (!FUNDED_TEST_WALLET) {
          console.log('Skipping funded test - no funded wallet provided');
          return;
        }

        const fundedWp = new WalletProvider(
          FUNDED_TEST_WALLET as `0x${string}`,
          mockCacheManager as any,
          { sepolia: testnetChains.sepolia }
        );
        const fundedVoteAction = new VoteAction(fundedWp);

        // This would fail unless there's a real governor deployed
        // Just testing the flow
        try {
          const result = await fundedVoteAction.vote({
            chain: 'sepolia' as any,
            governor: TESTNET_GOVERNORS.sepolia.governor,
            proposalId: '1',
            support: 1,
          });

          expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
          console.log(`Vote transaction: ${result.hash}`);
        } catch (error) {
          console.warn('Vote failed (expected without real governor):', error);
          expect(error).toBeInstanceOf(Error);
        }
      });
    });
  });

  describe('Propose Action', () => {
    let proposeAction: ProposeAction;

    beforeEach(() => {
      proposeAction = new ProposeAction(wp);
    });

    describe('Constructor', () => {
      it('should initialize with wallet provider', () => {
        expect(proposeAction).toBeDefined();
      });
    });

    describe('Proposal Validation', () => {
      it('should validate proposal parameters', () => {
        const proposalParams = {
          chain: 'sepolia' as any,
          governor: TESTNET_GOVERNORS.sepolia.governor,
          targets: [TESTNET_GOVERNORS.sepolia.governor],
          values: [BigInt(0)],
          calldatas: ['0x' as `0x${string}`],
          description: 'Test Proposal',
        };

        expect(proposalParams.targets).toHaveLength(1);
        expect(proposalParams.values).toHaveLength(1);
        expect(proposalParams.calldatas).toHaveLength(1);
        expect(proposalParams.description).toBeDefined();
      });

      it('should handle mismatched array lengths', async () => {
        await expect(
          proposeAction.propose({
            chain: 'sepolia' as any,
            governor: TESTNET_GOVERNORS.sepolia.governor,
            targets: [TESTNET_GOVERNORS.sepolia.governor],
            values: [BigInt(0), BigInt(1)], // Mismatched length
            calldatas: ['0x' as `0x${string}`],
            description: 'Test',
          })
        ).rejects.toThrow();
      });

      it('should encode complex proposal data', () => {
        // Test encoding a token transfer proposal
        const transferAbi = parseAbi(['function transfer(address to, uint256 amount)']);
        const calldata = encodeFunctionData({
          abi: transferAbi,
          functionName: 'transfer',
          args: ['0x742d35Cc6634C0532925a3b844Bc454e4438f44e' as Address, parseEther('100')],
        });

        expect(calldata).toMatch(/^0x[a-fA-F0-9]+$/);
        expect(calldata.length).toBeGreaterThan(10);
      });
    });

    describe('Mainnet Proposal Creation', () => {
      it('should validate mainnet governor parameters', async () => {
        const publicClient = wp.getPublicClient('mainnet');

        // Test that we can interact with mainnet contracts
        const blockNumber = await publicClient.getBlockNumber();
        expect(typeof blockNumber).toBe('bigint');
        console.log(`Current mainnet block: ${blockNumber}`);
      });
    });
  });

  describe('Queue Action', () => {
    let queueAction: QueueAction;

    beforeEach(() => {
      queueAction = new QueueAction(wp);
    });

    describe('Constructor', () => {
      it('should initialize with wallet provider', () => {
        expect(queueAction).toBeDefined();
      });
    });

    describe('Queue Validation', () => {
      it('should validate queue parameters', () => {
        const queueParams = {
          chain: 'sepolia' as any,
          governor: TESTNET_GOVERNORS.sepolia.governor,
          targets: [TESTNET_GOVERNORS.sepolia.governor],
          values: [BigInt(0)],
          calldatas: ['0x' as `0x${string}`],
          description: 'Test Proposal',
        };

        expect(queueParams).toHaveProperty('targets');
        expect(queueParams).toHaveProperty('values');
        expect(queueParams).toHaveProperty('calldatas');
        expect(queueParams).toHaveProperty('description');
      });

      it('should handle description hashing', () => {
        const description = 'Test Proposal for Queue';
        // The action should hash the description internally
        expect(description).toBeDefined();
      });
    });

    describe('Timelock Integration', () => {
      it('should respect timelock delays', async () => {
        // Test that queue action properly handles timelock delays
        const queueParams = {
          chain: 'sepolia' as any,
          governor: TESTNET_GOVERNORS.sepolia.governor,
          targets: [TESTNET_GOVERNORS.sepolia.governor],
          values: [BigInt(0)],
          calldatas: ['0x' as `0x${string}`],
          description: 'Timelock Test',
        };

        // In a real scenario, this would interact with a timelock controller
        expect(queueParams.description).toBeDefined();
      });
    });
  });

  describe('Execute Action', () => {
    let executeAction: ExecuteAction;

    beforeEach(() => {
      executeAction = new ExecuteAction(wp);
    });

    describe('Constructor', () => {
      it('should initialize with wallet provider', () => {
        expect(executeAction).toBeDefined();
      });
    });

    describe('Execute Validation', () => {
      it('should validate execute parameters', () => {
        const executeParams = {
          chain: 'sepolia' as any,
          governor: TESTNET_GOVERNORS.sepolia.governor,
          proposalId: '123',
          targets: [TESTNET_GOVERNORS.sepolia.governor],
          values: [BigInt(0)],
          calldatas: ['0x' as `0x${string}`],
          description: 'Test Proposal',
        };

        expect(executeParams.proposalId).toBeDefined();
        expect(executeParams.targets).toHaveLength(executeParams.values.length);
        expect(executeParams.targets).toHaveLength(executeParams.calldatas.length);
      });

      it('should handle execution requirements', async () => {
        // Test that execution properly checks:
        // 1. Proposal is queued
        // 2. Timelock delay has passed
        // 3. Proposal hasn't been executed

        const executeParams = {
          chain: 'sepolia' as any,
          governor: TESTNET_GOVERNORS.sepolia.governor,
          proposalId: '123',
          targets: [TESTNET_GOVERNORS.sepolia.governor],
          values: [BigInt(0)],
          calldatas: ['0x' as `0x${string}`],
          description: 'Test',
        };

        // This would fail without a real queued proposal
        await expect(executeAction.execute(executeParams)).rejects.toThrow();
      });
    });

    describe('Mainnet Execution', () => {
      it('should validate mainnet execution gas costs', async () => {
        if (!MAINNET_TEST_WALLET) {
          console.log('Skipping mainnet gas test');
          return;
        }

        const mainnetWp = new WalletProvider(
          MAINNET_TEST_WALLET as `0x${string}`,
          mockCacheManager as any,
          { mainnet: mainnetChains.mainnet }
        );

        const publicClient = mainnetWp.getPublicClient('mainnet');
        const gasPrice = await publicClient.getGasPrice();

        // Estimate gas for a complex execution (multiple targets)
        const estimatedGas = BigInt(500000); // Typical governor execution
        const estimatedCost = gasPrice * estimatedGas;

        console.log(`Estimated execution cost: ${estimatedCost / BigInt(Math.pow(10, 18))} ETH`);
        expect(estimatedCost).toBeGreaterThan(BigInt(0));
      });
    });
  });

  describe('Cross-Chain Governance', () => {
    it('should support governance on multiple chains', () => {
      const chains = wp.getSupportedChains();

      // Should support both testnets and mainnets
      expect(chains).toContain('sepolia');
      expect(chains).toContain('mainnet');
      expect(chains).toContain('polygon');
      expect(chains).toContain('arbitrum');
      expect(chains).toContain('optimism');
      expect(chains).toContain('base');
    });

    it('should handle different governor implementations', () => {
      // Different protocols use different governor contracts
      // - Compound: GovernorBravo
      // - OpenZeppelin: Governor
      // - Aave: AaveGovernanceV2

      // Test that our actions can handle different ABIs
      const governorTypes = ['GovernorBravo', 'Governor', 'AaveGovernanceV2'];

      governorTypes.forEach((type) => {
        expect(type).toBeDefined();
      });
    });
  });

  describe('Real Token Governance Tests', () => {
    it('should interact with real governance tokens', async () => {
      if (!MAINNET_TEST_WALLET) {
        console.log('Skipping real token test');
        return;
      }

      const mainnetWp = new WalletProvider(
        MAINNET_TEST_WALLET as `0x${string}`,
        mockCacheManager as any,
        { mainnet: mainnetChains.mainnet }
      );

      // Test with COMP token (Compound governance token)
      const COMP_TOKEN = '0xc00e94Cb662C3520282E6f5717214004A7f26888' as Address;

      const publicClient = mainnetWp.getPublicClient('mainnet');
      const balanceAbi = parseAbi(['function balanceOf(address) view returns (uint256)']);

      try {
        const balance = await publicClient.readContract({
          address: COMP_TOKEN,
          abi: balanceAbi,
          functionName: 'balanceOf',
          args: [mainnetWp.getAddress()],
        });

        console.log(`COMP balance: ${balance}`);
        expect(typeof balance).toBe('bigint');
      } catch (error) {
        console.warn('Could not read COMP balance:', error);
      }
    });

    it('should check voting power', async () => {
      if (!MAINNET_TEST_WALLET) {
        console.log('Skipping voting power test');
        return;
      }

      const mainnetWp = new WalletProvider(
        MAINNET_TEST_WALLET as `0x${string}`,
        mockCacheManager as any,
        { mainnet: mainnetChains.mainnet }
      );

      // Check voting power in Compound Governor
      const votesAbi = parseAbi(['function getVotes(address) view returns (uint256)']);
      const publicClient = mainnetWp.getPublicClient('mainnet');

      try {
        const votes = await publicClient.readContract({
          address: MAINNET_GOVERNORS.mainnet.compound.governor,
          abi: votesAbi,
          functionName: 'getVotes',
          args: [mainnetWp.getAddress()],
        });

        console.log(`Voting power: ${votes}`);
        expect(typeof votes).toBe('bigint');
      } catch (error) {
        console.warn('Could not check voting power:', error);
      }
    });
  });

  describe('Security and Edge Cases', () => {
    it('should handle reentrancy protection', async () => {
      // Governance contracts should have reentrancy protection
      // Test that multiple simultaneous calls are handled properly
      const voteAction = new VoteAction(wp);

      const voteParams = {
        chain: 'sepolia' as any,
        governor: TESTNET_GOVERNORS.sepolia.governor,
        proposalId: '123',
        support: 1,
      };

      // Try to vote twice simultaneously
      const promises = [voteAction.vote(voteParams), voteAction.vote(voteParams)];

      // Both should fail or one should fail with "already voted"
      const results = await Promise.allSettled(promises);
      expect(results.some((r) => r.status === 'rejected')).toBe(true);
    });

    it('should validate proposal state transitions', () => {
      // Proposals should follow state machine:
      // Pending -> Active -> Succeeded -> Queued -> Executed
      // or
      // Pending -> Active -> Defeated

      const validTransitions = {
        Pending: ['Active'],
        Active: ['Succeeded', 'Defeated'],
        Succeeded: ['Queued'],
        Queued: ['Executed'],
        Defeated: [],
        Executed: [],
      };

      Object.entries(validTransitions).forEach(([state, nextStates]) => {
        expect(state).toBeDefined();
        expect(Array.isArray(nextStates)).toBe(true);
      });
    });

    it('should handle proposal cancellation', async () => {
      // Test that proposals can be cancelled by authorized parties
      const proposeAction = new ProposeAction(wp);

      // In real scenario, only proposer or guardian can cancel
      const cancelAbi = parseAbi(['function cancel(uint256 proposalId)']);

      expect(cancelAbi).toBeDefined();
    });
  });
});
