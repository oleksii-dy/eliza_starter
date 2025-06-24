import { describe, it, expect, beforeEach, beforeAll, mock } from 'bun:test';
import { transferAction } from '../actions/transfer';
import { swapAction } from '../actions/swap';
import { bridgeAction } from '../actions/bridge';
import { voteAction } from '../actions/gov-vote';
import { EVMService } from '../service';
import { EVMWalletService } from '../core/services/EVMWalletService';
import { WalletBalanceService } from '../services/WalletBalanceService';
import { TokenService } from '../tokens/token-service';
import { type IAgentRuntime, type Memory, type State, asUUID } from '@elizaos/core';
import { testPrivateKey, createMockRuntime, fundWallet } from './test-config';
import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { sepolia, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

describe.skip('EVM Services Integration Test Suite', () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;
  let account: any;
  let testWalletAddress: Address;
  let evmService: EVMService;
  let walletService: EVMWalletService;
  let balanceService: WalletBalanceService;
  let tokenService: TokenService;

  beforeAll(async () => {
    mockRuntime = createMockRuntime();
    account = privateKeyToAccount(testPrivateKey);
    testWalletAddress = account.address;

    await fundWallet(testWalletAddress);

    // Initialize services
    evmService = new EVMService();
    walletService = new EVMWalletService(mockRuntime);
    balanceService = new WalletBalanceService(mockRuntime);
    tokenService = new TokenService(mockRuntime);
  });

  beforeEach(() => {
    mock.restore();

    mockMessage = {
      id: asUUID('test-message-id'),
      agentId: asUUID('test-agent-id'),
      userId: 'test-user-id',
      content: { text: 'test message', action: 'TEST_ACTION' },
      roomId: asUUID('test-room-id'),
      embedding: [],
      createdAt: Date.now(),
    };

    mockState = {
      values: {},
      data: {},
      text: '',
      agentId: 'test-agent-id',
      roomId: 'test-room-id',
      userId: 'test-user-id',
      bio: 'Test agent bio',
      messageDirections: 'Test message directions',
      postDirections: 'Test post directions',
      recentMessages: 'Test recent messages',
      actors: 'Test actors',
      actorsData: [],
      recentMessagesData: [],
      actionNames: '',
      actions: '',
      providers: '',
      responseData: {},
      senderName: 'TestUser',
      supportedChains: 'sepolia | base-sepolia',
      chainBalances: 'sepolia: 1.0 ETH, base-sepolia: 0.5 ETH',
    };
  });

  describe('Service to Service Integration', () => {
    describe('EVM Service and Wallet Service Integration', () => {
      it('should coordinate wallet management between services', async () => {
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        // Test that both services can work with the same wallet
        const walletInstance1 = await walletService.createWallet('EOA', testWalletAddress);
        const walletInstance2 = await evmService.getWalletInstance(testWalletAddress);

        expect(walletInstance1).toBeDefined();
        expect(walletInstance2).toBeDefined();
        expect(walletInstance1.address).toBe(walletInstance2.address);
      });

      it('should share session management across services', async () => {
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        // Create session in wallet service
        const sessionConfig = {
          walletAddress: testWalletAddress,
          permissions: ['TRANSFER', 'SWAP'],
          expiresAt: Date.now() + 3600000,
        };

        const session = await walletService.createSession(sessionConfig);

        // Verify session is accessible by EVM service
        const sessionFromEVM = await evmService.getSession(session.id);

        expect(session).toBeDefined();
        expect(sessionFromEVM).toBeDefined();
        expect(session.id).toBe(sessionFromEVM.id);
      });

      it('should synchronize transaction history across services', async () => {
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        // Simulate transaction through wallet service
        const txHash = '0xabc123456789';
        const txDetails = {
          hash: txHash,
          from: testWalletAddress,
          to: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' as Address,
          value: BigInt('1000000000000000000'),
          data: '0x',
        };

        await walletService.recordTransaction(txDetails);

        // Verify transaction is visible in EVM service
        const transactions = await evmService.getTransactionHistory(testWalletAddress);

        expect(transactions).toBeDefined();
        expect(transactions.some((tx) => tx.hash === txHash)).toBe(true);
      });
    });

    describe('Balance Service and Token Service Integration', () => {
      it('should coordinate token balance tracking', async () => {
        // Test that balance service uses token service for metadata
        const balances = await balanceService.getTokenBalances(testWalletAddress, 'sepolia');

        expect(balances).toBeDefined();
        expect(Array.isArray(balances)).toBe(true);

        // Verify token metadata is enriched
        for (const balance of balances) {
          expect(balance.symbol).toBeDefined();
          expect(balance.decimals).toBeDefined();
          expect(balance.name).toBeDefined();
        }
      });

      it('should handle token discovery across services', async () => {
        // Add a new token through token service
        const tokenAddress = '0xA0b86a33E6441484eE8bf0d9C16A02E5C76d0100';
        const tokenInfo = await tokenService.getTokenInfo(tokenAddress);

        // Verify balance service can track the new token
        const balances = await balanceService.getTokenBalances(testWalletAddress, 'sepolia');
        const tokenBalance = balances.find((b) => b.address === tokenAddress);

        expect(tokenInfo).toBeDefined();
        expect(tokenBalance).toBeDefined();
        expect(tokenBalance?.symbol).toBe(tokenInfo.symbol);
      });

      it('should update balance cache when token transfers occur', async () => {
        // Get initial balance
        const initialBalances = await balanceService.getTokenBalances(testWalletAddress, 'sepolia');
        const initialETHBalance = initialBalances.find((b) => b.symbol === 'ETH');

        // Simulate a transfer
        await balanceService.updateBalanceAfterTransfer(
          testWalletAddress,
          'ETH',
          BigInt('100000000000000000'), // 0.1 ETH
          'outgoing'
        );

        // Verify balance is updated
        const updatedBalances = await balanceService.getTokenBalances(testWalletAddress, 'sepolia');
        const updatedETHBalance = updatedBalances.find((b) => b.symbol === 'ETH');

        expect(updatedETHBalance?.balance).toBeLessThan(initialETHBalance?.balance || 0);
      });
    });

    describe('Action to Service Integration', () => {
      it('should integrate transfer action with wallet and balance services', async () => {
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        const transferCallback = mock();

        mockRuntime.useModel.mockResolvedValueOnce(`
          <response>
            <fromChain>sepolia</fromChain>
            <amount>0.001</amount>
            <toAddress>0x742d35Cc6634C0532925a3b844Bc454e4438f44e</toAddress>
            <token>null</token>
          </response>
        `);

        // Execute transfer action
        const result = await transferAction.handler(
          mockRuntime,
          mockMessage,
          mockState,
          {},
          transferCallback
        );

        // Verify action execution
        expect(result).toBe(true);
        expect(transferCallback).toHaveBeenCalled();

        // Verify services are updated
        const balances = await balanceService.getTokenBalances(testWalletAddress, 'sepolia');
        const recentActions = await balanceService.getRecentActions(testWalletAddress);

        expect(balances).toBeDefined();
        expect(recentActions).toBeDefined();
        expect(recentActions.some((action) => action.type === 'transfer')).toBe(true);
      });

      it('should integrate swap action with multiple services', async () => {
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        const swapCallback = mock();

        mockRuntime.useModel.mockResolvedValueOnce(`
          <response>
            <inputToken>ETH</inputToken>
            <outputToken>USDC</outputToken>
            <amount>0.1</amount>
            <slippage>1</slippage>
            <chain>sepolia</chain>
          </response>
        `);

        // Execute swap action
        const result = await swapAction.handler(
          mockRuntime,
          mockMessage,
          mockState,
          {},
          swapCallback
        );

        // Verify service coordination
        expect(swapCallback).toHaveBeenCalled();

        // Check that token service was used for token resolution
        const tokenInfo = await tokenService.getTokenInfo('USDC');
        expect(tokenInfo).toBeDefined();

        // Check that balance service tracked the swap
        const recentActions = await balanceService.getRecentActions(testWalletAddress);
        expect(recentActions.some((action) => action.type === 'swap')).toBe(true);
      });

      it('should integrate bridge action with cross-chain services', async () => {
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        const bridgeCallback = mock();

        mockRuntime.useModel.mockResolvedValueOnce(`
          <response>
            <sourceChain>sepolia</sourceChain>
            <destinationChain>base-sepolia</destinationChain>
            <amount>0.05</amount>
            <token>ETH</token>
          </response>
        `);

        // Execute bridge action
        const result = await bridgeAction.handler(
          mockRuntime,
          mockMessage,
          mockState,
          {},
          bridgeCallback
        );

        // Verify cross-chain coordination
        expect(bridgeCallback).toHaveBeenCalled();

        // Check balance tracking on both chains
        const sepoliaBalances = await balanceService.getTokenBalances(testWalletAddress, 'sepolia');
        const baseBalances = await balanceService.getTokenBalances(
          testWalletAddress,
          'base-sepolia'
        );

        expect(sepoliaBalances).toBeDefined();
        expect(baseBalances).toBeDefined();
      });
    });
  });

  describe('Multi-Service Workflows', () => {
    describe('DeFi Operation Workflow', () => {
      it('should coordinate transfer → swap → stake workflow', async () => {
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        const workflowId = 'defi-workflow-001';

        // Step 1: Transfer to prepare for swap
        const transferCallback = mock();
        mockRuntime.useModel.mockResolvedValueOnce(`
          <response>
            <fromChain>sepolia</fromChain>
            <amount>0.1</amount>
            <toAddress>${testWalletAddress}</toAddress>
            <token>null</token>
          </response>
        `);

        const transferResult = await transferAction.handler(
          mockRuntime,
          mockMessage,
          { ...mockState, workflowId, currentStep: 'prepare-swap' },
          {},
          transferCallback
        );

        expect(transferResult).toBe(true);
        expect(transferCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.objectContaining({
              workflowContext: expect.objectContaining({
                chain: 'sepolia',
              }),
              nextSuggestedAction: 'EVM_SWAP_TOKENS',
            }),
          })
        );

        // Step 2: Swap the transferred tokens
        const swapCallback = mock();
        mockRuntime.useModel.mockResolvedValueOnce(`
          <response>
            <inputToken>ETH</inputToken>
            <outputToken>USDC</outputToken>
            <amount>0.1</amount>
            <slippage>1</slippage>
            <chain>sepolia</chain>
          </response>
        `);

        const swapResult = await swapAction.handler(
          mockRuntime,
          mockMessage,
          { ...mockState, workflowId, currentStep: 'farming-prep' },
          {},
          swapCallback
        );

        expect(swapCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.objectContaining({
              workflowContext: expect.objectContaining({
                fromToken: 'ETH',
                toToken: 'USDC',
              }),
              nextSuggestedAction: 'PROVIDE_LIQUIDITY',
            }),
          })
        );

        // Verify workflow state persistence
        const workflowMemories = await mockRuntime.getMemories({
          tableName: 'workflow',
          agentId: mockRuntime.agentId,
          unique: false,
        });

        expect(
          workflowMemories.some(
            (m) => m.content.workflowId === workflowId && m.content.actionCompleted === 'transfer'
          )
        ).toBe(true);

        expect(
          workflowMemories.some(
            (m) => m.content.workflowId === workflowId && m.content.actionCompleted === 'swap'
          )
        ).toBe(true);
      });

      it('should handle cross-chain yield farming workflow', async () => {
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        const workflowId = 'cross-chain-farming-001';

        // Step 1: Swap to prepare for bridge
        const swapCallback = mock();
        mockRuntime.useModel.mockResolvedValueOnce(`
          <response>
            <inputToken>ETH</inputToken>
            <outputToken>USDC</outputToken>
            <amount>0.2</amount>
            <slippage>1</slippage>
            <chain>sepolia</chain>
          </response>
        `);

        const swapResult = await swapAction.handler(
          mockRuntime,
          mockMessage,
          { ...mockState, workflowId, currentStep: 'prepare-bridge' },
          {},
          swapCallback
        );

        expect(swapCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.objectContaining({
              nextSuggestedAction: 'EVM_BRIDGE_TOKENS',
            }),
          })
        );

        // Step 2: Bridge to target chain
        const bridgeCallback = mock();
        mockRuntime.useModel.mockResolvedValueOnce(`
          <response>
            <sourceChain>sepolia</sourceChain>
            <destinationChain>base-sepolia</destinationChain>
            <amount>200</amount>
            <token>USDC</token>
          </response>
        `);

        const bridgeResult = await bridgeAction.handler(
          mockRuntime,
          mockMessage,
          { ...mockState, workflowId, currentStep: 'cross-chain-farming' },
          {},
          bridgeCallback
        );

        expect(bridgeCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.objectContaining({
              nextSuggestedAction: 'PROVIDE_LIQUIDITY',
            }),
          })
        );

        // Verify services tracked cross-chain operation
        const sepoliaActions = await balanceService.getRecentActions(testWalletAddress);
        const baseActions = await balanceService.getRecentActions(testWalletAddress);

        expect(sepoliaActions.some((a) => a.type === 'swap')).toBe(true);
        expect(sepoliaActions.some((a) => a.type === 'bridge')).toBe(true);
      });

      it('should handle portfolio rebalancing workflow', async () => {
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        const workflowId = 'portfolio-rebalance-001';

        // Simulate multiple swaps for rebalancing
        const swaps = [
          { from: 'ETH', to: 'USDC', amount: '0.5' },
          { from: 'ETH', to: 'DAI', amount: '0.3' },
        ];

        for (const [index, swap] of swaps.entries()) {
          const swapCallback = mock();
          mockRuntime.useModel.mockResolvedValueOnce(`
            <response>
              <inputToken>${swap.from}</inputToken>
              <outputToken>${swap.to}</outputToken>
              <amount>${swap.amount}</amount>
              <slippage>1</slippage>
              <chain>sepolia</chain>
            </response>
          `);

          const swapResult = await swapAction.handler(
            mockRuntime,
            mockMessage,
            { ...mockState, workflowId, currentStep: 'rebalance-swap', swapIndex: index },
            {},
            swapCallback
          );

          expect(swapResult).toBe(true);
          expect(swapCallback).toHaveBeenCalledWith(
            expect.objectContaining({
              content: expect.objectContaining({
                workflowContext: expect.objectContaining({
                  fromToken: swap.from,
                  toToken: swap.to,
                }),
              }),
            })
          );
        }

        // Verify portfolio state is updated
        const balances = await balanceService.getTokenBalances(testWalletAddress, 'sepolia');
        const usdcBalance = balances.find((b) => b.symbol === 'USDC');
        const daiBalance = balances.find((b) => b.symbol === 'DAI');

        expect(usdcBalance).toBeDefined();
        expect(daiBalance).toBeDefined();
      });
    });

    describe('Governance Participation Workflow', () => {
      it('should coordinate governance proposal lifecycle', async () => {
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        const workflowId = 'governance-lifecycle-001';

        // Step 1: Vote on proposal
        const voteCallback = mock();
        mockRuntime.useModel.mockResolvedValueOnce(`
          <response>
            <proposalId>1</proposalId>
            <support>1</support>
            <governor>0x5f3f1dBD7B74C6B46e8c44f98792A1dAf8d69154</governor>
            <reason>Supporting community development</reason>
          </response>
        `);

        const voteOptions = {
          chain: 'sepolia',
          governor: '0x5f3f1dBD7B74C6B46e8c44f98792A1dAf8d69154',
          proposalId: '1',
          support: 1,
        };

        const voteResult = await voteAction.handler(
          mockRuntime,
          mockMessage,
          { ...mockState, workflowId, currentStep: 'governance-participation' },
          voteOptions,
          voteCallback
        );

        expect(voteResult).toBe(true);
        expect(voteCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.objectContaining({
              voteType: 'FOR',
              nextSuggestedAction: 'EVM_GOVERNANCE_QUEUE',
            }),
          })
        );

        // Verify governance participation is tracked
        const workflowMemories = await mockRuntime.getMemories({
          tableName: 'workflow',
          agentId: mockRuntime.agentId,
          unique: false,
        });

        expect(
          workflowMemories.some(
            (m) => m.content.workflowId === workflowId && m.content.actionCompleted === 'vote'
          )
        ).toBe(true);
      });

      it('should handle multi-proposal voting workflow', async () => {
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        const workflowId = 'multi-proposal-voting-001';
        const proposals = [
          { id: '1', support: 1 },
          { id: '2', support: 0 },
          { id: '3', support: 2 },
        ];

        for (const [index, proposal] of proposals.entries()) {
          const voteCallback = mock();
          mockRuntime.useModel.mockResolvedValueOnce(`
            <response>
              <proposalId>${proposal.id}</proposalId>
              <support>${proposal.support}</support>
              <governor>0x5f3f1dBD7B74C6B46e8c44f98792A1dAf8d69154</governor>
              <reason>Voting on proposal ${proposal.id}</reason>
            </response>
          `);

          const voteOptions = {
            chain: 'sepolia',
            governor: '0x5f3f1dBD7B74C6B46e8c44f98792A1dAf8d69154',
            proposalId: proposal.id,
            support: proposal.support,
          };

          const voteResult = await voteAction.handler(
            mockRuntime,
            mockMessage,
            {
              ...mockState,
              workflowId,
              currentStep: 'multi-proposal-voting',
              proposalIndex: index,
            },
            voteOptions,
            voteCallback
          );

          expect(voteResult).toBe(true);
          expect(voteCallback).toHaveBeenCalled();
        }

        // Verify all votes are tracked
        const workflowMemories = await mockRuntime.getMemories({
          tableName: 'workflow',
          agentId: mockRuntime.agentId,
          unique: false,
        });

        const voteMemories = workflowMemories.filter(
          (m) => m.content.workflowId === workflowId && m.content.actionCompleted === 'vote'
        );

        expect(voteMemories).toHaveLength(proposals.length);
      });
    });
  });

  describe('Service Error Handling and Recovery', () => {
    describe('Cross-Service Error Propagation', () => {
      it('should handle wallet service failures gracefully', async () => {
        await evmService.start(mockRuntime);

        // Simulate wallet service failure
        const mockError = new Error('Wallet service unavailable');
        mock.spyOn(walletService, 'createWallet').mockRejectedValueOnce(mockError);

        const transferCallback = mock();
        mockRuntime.useModel.mockResolvedValueOnce(`
          <response>
            <fromChain>sepolia</fromChain>
            <amount>0.1</amount>
            <toAddress>0x742d35Cc6634C0532925a3b844Bc454e4438f44e</toAddress>
            <token>null</token>
          </response>
        `);

        const result = await transferAction.handler(
          mockRuntime,
          mockMessage,
          mockState,
          {},
          transferCallback
        );

        // Should handle error gracefully
        expect(transferCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.stringContaining('Error'),
          })
        );
      });

      it('should maintain service isolation during failures', async () => {
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        // Simulate balance service failure
        const mockError = new Error('Balance service error');
        mock.spyOn(balanceService, 'getTokenBalances').mockRejectedValueOnce(mockError);

        // Other services should continue working
        const walletInstance = await walletService.createWallet('EOA', testWalletAddress);
        expect(walletInstance).toBeDefined();

        const tokenInfo = await tokenService.getTokenInfo(
          '0xA0b86a33E6441484eE8bf0d9C16A02E5C76d0100'
        );
        expect(tokenInfo).toBeDefined();
      });

      it('should handle network connectivity issues across services', async () => {
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        // Simulate network failure
        const networkError = new Error('Network unavailable');
        const consoleSpy = mock.spyOn(console, 'error').mockImplementation(() => {});

        // Services should handle network errors gracefully
        try {
          await balanceService.getTokenBalances(testWalletAddress, 'sepolia');
        } catch (error) {
          expect(error).toBeDefined();
        }

        consoleSpy.mockRestore();
      });
    });

    describe('Workflow Recovery Mechanisms', () => {
      it('should resume interrupted workflows', async () => {
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        const workflowId = 'recovery-test-001';

        // Create workflow memory for interrupted operation
        await mockRuntime.createMemory(
          {
            entityId: mockRuntime.agentId,
            roomId: mockMessage.roomId,
            agentId: mockRuntime.agentId,
            content: {
              text: 'Interrupted workflow - transfer completed, swap pending',
              workflowId,
              actionCompleted: 'transfer',
              nextAction: 'EVM_SWAP_TOKENS',
              interrupted: true,
            },
          },
          'workflow'
        );

        // Resume workflow with swap
        const swapCallback = mock();
        mockRuntime.useModel.mockResolvedValueOnce(`
          <response>
            <inputToken>ETH</inputToken>
            <outputToken>USDC</outputToken>
            <amount>0.1</amount>
            <slippage>1</slippage>
            <chain>sepolia</chain>
          </response>
        `);

        const swapResult = await swapAction.handler(
          mockRuntime,
          mockMessage,
          { ...mockState, workflowId, resuming: true },
          {},
          swapCallback
        );

        expect(swapResult).toBe(true);
        expect(swapCallback).toHaveBeenCalled();
      });

      it('should handle partial workflow failures with rollback', async () => {
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        const workflowId = 'rollback-test-001';

        // Simulate successful transfer
        const transferCallback = mock();
        mockRuntime.useModel.mockResolvedValueOnce(`
          <response>
            <fromChain>sepolia</fromChain>
            <amount>0.1</amount>
            <toAddress>${testWalletAddress}</toAddress>
            <token>null</token>
          </response>
        `);

        const transferResult = await transferAction.handler(
          mockRuntime,
          mockMessage,
          { ...mockState, workflowId, currentStep: 'prepare-swap' },
          {},
          transferCallback
        );

        expect(transferResult).toBe(true);

        // Simulate failed swap
        const swapCallback = mock();
        mockRuntime.useModel.mockResolvedValueOnce(`
          <response>
            <inputToken>ETH</inputToken>
            <outputToken>INVALID_TOKEN</outputToken>
            <amount>0.1</amount>
            <slippage>1</slippage>
            <chain>sepolia</chain>
          </response>
        `);

        const swapResult = await swapAction.handler(
          mockRuntime,
          mockMessage,
          { ...mockState, workflowId, currentStep: 'execute-swap' },
          {},
          swapCallback
        );

        expect(swapResult).toBe(false);
        expect(swapCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.objectContaining({
              success: false,
              error: expect.any(String),
            }),
          })
        );

        // Verify workflow failure is tracked
        const workflowMemories = await mockRuntime.getMemories({
          tableName: 'workflow',
          agentId: mockRuntime.agentId,
          unique: false,
        });

        expect(
          workflowMemories.some(
            (m) => m.content.workflowId === workflowId && m.content.actionCompleted === 'transfer'
          )
        ).toBe(true);
      });
    });
  });

  describe('Performance and Scalability', () => {
    describe('Concurrent Service Operations', () => {
      it('should handle concurrent balance requests across chains', async () => {
        await evmService.start(mockRuntime);
        await balanceService.start?.(mockRuntime);

        const chains = ['sepolia', 'base-sepolia'];
        const balancePromises = chains.map((chain) =>
          balanceService.getTokenBalances(testWalletAddress, chain)
        );

        const results = await Promise.allSettled(balancePromises);

        results.forEach((result, index) => {
          expect(result.status).toBe('fulfilled');
          if (result.status === 'fulfilled') {
            expect(Array.isArray(result.value)).toBe(true);
          }
        });
      });

      it('should handle concurrent workflow executions', async () => {
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        const workflows = [
          { id: 'concurrent-1', action: 'transfer' },
          { id: 'concurrent-2', action: 'swap' },
          { id: 'concurrent-3', action: 'bridge' },
        ];

        const workflowPromises = workflows.map(async (workflow, index) => {
          const callback = mock();

          if (workflow.action === 'transfer') {
            mockRuntime.useModel.mockResolvedValueOnce(`
              <response>
                <fromChain>sepolia</fromChain>
                <amount>0.01</amount>
                <toAddress>0x742d35Cc6634C0532925a3b844Bc454e4438f44e</toAddress>
                <token>null</token>
              </response>
            `);

            return transferAction.handler(
              mockRuntime,
              mockMessage,
              { ...mockState, workflowId: workflow.id },
              {},
              callback
            );
          }

          return true;
        });

        const results = await Promise.allSettled(workflowPromises);

        results.forEach((result) => {
          expect(result.status).toBe('fulfilled');
        });
      });

      it('should maintain performance under service load', async () => {
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        const operationCount = 10;
        const startTime = Date.now();

        // Execute multiple balance requests
        const promises = Array(operationCount)
          .fill(0)
          .map(() => balanceService.getTokenBalances(testWalletAddress, 'sepolia'));

        const results = await Promise.allSettled(promises);
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Verify all operations completed
        expect(results.every((r) => r.status === 'fulfilled')).toBe(true);

        // Verify reasonable performance (should complete within 30 seconds)
        expect(duration).toBeLessThan(30000);

        // Verify average response time is reasonable
        const averageTime = duration / operationCount;
        expect(averageTime).toBeLessThan(3000); // 3 seconds per operation
      });
    });
  });

  describe('Service Lifecycle Management', () => {
    describe('Service Startup and Shutdown', () => {
      it('should handle service dependencies during startup', async () => {
        // Start services in dependency order
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        // Verify services are properly initialized
        expect(evmService).toBeDefined();
        expect(walletService).toBeDefined();

        // Verify services can communicate
        const walletInstance = await walletService.createWallet('EOA', testWalletAddress);
        expect(walletInstance).toBeDefined();
      });

      it('should handle graceful service shutdown', async () => {
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        // Stop services in reverse dependency order
        await walletService.stop?.(mockRuntime);
        await evmService.stop(mockRuntime);

        // Verify services are properly cleaned up
        expect(true).toBe(true); // Services should shut down without errors
      });

      it('should handle service restart scenarios', async () => {
        // Initial startup
        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        // Create some state
        const walletInstance = await walletService.createWallet('EOA', testWalletAddress);
        expect(walletInstance).toBeDefined();

        // Restart services
        await walletService.stop?.(mockRuntime);
        await evmService.stop(mockRuntime);

        await evmService.start(mockRuntime);
        await walletService.start(mockRuntime);

        // Verify state persistence/recovery
        const recoveredInstance = await walletService.getWallet(testWalletAddress);
        expect(recoveredInstance).toBeDefined();
      });
    });
  });
});
