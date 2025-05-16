import { describe, it, expect, beforeEach, vi, afterEach, type Mock } from 'vitest';
import {
  HeimdallService,
  VoteOption,
  type TextProposal,
  type ParameterChangeProposal,
  type ParamChange,
} from '../../services/HeimdallService';
import {
  DirectSecp256k1HdWallet,
  coins,
  type OfflineSigner,
  type BIP44HDPath,
} from '@cosmjs/proto-signing';
import {
  type SigningStargateClient as ConcreteSigningStargateClient,
  SigningStargateClient,
  type SigningStargateClient as ICSClient,
  type SigningStargateClientOptions,
} from '@cosmjs/stargate';
import type { logger, IAgentRuntime, Service } from '@elizaos/core';

// --- Module Mocks ---
vi.mock('@elizaos/core', async () => {
  const originalCore = await vi.importActual<typeof import('@elizaos/core')>('@elizaos/core');
  return {
    ...originalCore,
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  };
});

// Mock these functions without using top-level variables
vi.mock('@cosmjs/proto-signing', async () => {
  const originalProtoSigning =
    await vi.importActual<typeof import('@cosmjs/proto-signing')>('@cosmjs/proto-signing');
  return {
    ...originalProtoSigning,
    DirectSecp256k1HdWallet: {
      ...originalProtoSigning.DirectSecp256k1HdWallet,
      fromMnemonic: vi.fn(),
    },
    coins: originalProtoSigning.coins,
  };
});

vi.mock('@cosmjs/stargate', async () => {
  const originalStargate =
    await vi.importActual<typeof import('@cosmjs/stargate')>('@cosmjs/stargate');
  return {
    ...originalStargate,
    SigningStargateClient: {
      ...originalStargate.SigningStargateClient,
      connectWithSigner: vi.fn(),
    },
  };
});

// --- Typed Mocks and Variables ---
type VitestFn<Args extends any[] = any[], Return = any> = Mock<(...args: Args) => Return>;

type MockedLogger = { [K in keyof typeof logger]: VitestFn };

const coreImports = await import('@elizaos/core');
const mockedLogger = coreImports.logger as unknown as MockedLogger;

const mockGetSetting = vi.fn();
const mockRuntime: Partial<IAgentRuntime> = {
  getSetting: mockGetSetting,
};

const HEIMDALL_RPC_URL = 'http://localhost:26657';
const PRIVATE_KEY =
  'test_mnemonic_phrase_please_ignore_if_you_are_a_human_being_reading_this_thank_you_very_much';
const VOTER_ADDRESS = 'heimdall1testvoter';
const PROPOSER_ADDRESS = 'heimdall1testproposer';
const SENDER_ADDRESS = 'heimdall1testsender';

// Expected fee structure from HeimdallService private constants
const EXPECTED_FEE = {
  amount: coins('5000000000000000', 'matic'), // Matches HeimdallService.DEFAULT_FEE_AMOUNT and DEFAULT_DENOM
  gas: '200000', // Matches HeimdallService.DEFAULT_GAS_LIMIT
};

describe('HeimdallService', () => {
  let service: HeimdallService;
  let mockSigner: Partial<OfflineSigner> & {
    getAccounts: VitestFn<[], Promise<{ address: string }[]>>;
  };
  let mockStargateClient: Partial<ConcreteSigningStargateClient> & {
    signAndBroadcast: VitestFn<[string, readonly any[], any, (string | undefined)?], Promise<any>>;
    getChainId: VitestFn<[], Promise<string>>;
    disconnect: VitestFn<[], void>;
  };

  beforeEach(() => {
    vi.clearAllMocks(); // Clears all mocks

    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'HEIMDALL_RPC_URL') return HEIMDALL_RPC_URL;
      if (key === 'PRIVATE_KEY') return PRIVATE_KEY;
      return null;
    });

    mockSigner = {
      getAccounts: vi.fn().mockResolvedValue([{ address: VOTER_ADDRESS }]) as VitestFn<
        [],
        Promise<{ address: string }[]>
      >,
    };

    // Important: Set up the fromMnemonic mock
    vi.mocked(DirectSecp256k1HdWallet.fromMnemonic).mockResolvedValue(
      mockSigner as unknown as OfflineSigner
    );

    mockStargateClient = {
      signAndBroadcast: vi.fn().mockResolvedValue({
        code: 0,
        transactionHash: 'TEST_TX_HASH',
      }) as VitestFn<[string, readonly any[], any, (string | undefined)?], Promise<any>>,
      getChainId: vi.fn().mockResolvedValue('heimdall-testnet') as VitestFn<[], Promise<string>>,
      disconnect: vi.fn() as VitestFn<[], void>,
    };

    // Important: Set up the connectWithSigner mock
    vi.mocked(SigningStargateClient.connectWithSigner).mockResolvedValue(
      mockStargateClient as unknown as ConcreteSigningStargateClient
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization and Connection', () => {
    it('should initialize and connect successfully', async () => {
      service = await HeimdallService.start(mockRuntime as IAgentRuntime);

      // Check the initialization part
      expect(mockGetSetting).toHaveBeenCalledWith('HEIMDALL_RPC_URL');
      expect(mockGetSetting).toHaveBeenCalledWith('PRIVATE_KEY');

      // Force a call to getSigningClient which will create the signer and connect
      await (service as any).getSigningClient();

      // Now these mocks should have been called
      expect(DirectSecp256k1HdWallet.fromMnemonic).toHaveBeenCalledWith(PRIVATE_KEY, {
        prefix: 'heimdall',
      });
      expect(SigningStargateClient.connectWithSigner).toHaveBeenCalledWith(
        HEIMDALL_RPC_URL,
        mockSigner,
        {}
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'HeimdallService initialized with necessary configurations.'
      );
    });

    it('should throw if HEIMDALL_RPC_URL is not configured', async () => {
      mockGetSetting.mockImplementation((key: string) => {
        if (key === 'PRIVATE_KEY') return PRIVATE_KEY;
        return null;
      });
      await expect(HeimdallService.start(mockRuntime as IAgentRuntime)).rejects.toThrow(
        'Heimdall RPC URL is not configured.'
      );
    });

    it('should throw if PRIVATE_KEY is not configured', async () => {
      mockGetSetting.mockImplementation((key: string) => {
        if (key === 'HEIMDALL_RPC_URL') return HEIMDALL_RPC_URL;
        return null;
      });
      await expect(HeimdallService.start(mockRuntime as IAgentRuntime)).rejects.toThrow(
        'Heimdall private key is not configured.'
      );
    });

    it('should handle signer creation failure', async () => {
      // Reset all previous mock implementations
      vi.resetAllMocks();

      // Re-setup required mocks for this test
      mockGetSetting.mockImplementation((key: string) => {
        if (key === 'HEIMDALL_RPC_URL') return HEIMDALL_RPC_URL;
        if (key === 'PRIVATE_KEY') return PRIVATE_KEY;
        return null;
      });

      // Directly access and mock the fromMnemonic method
      const fromMnemonicMock = DirectSecp256k1HdWallet.fromMnemonic;
      // Set up to reject for this specific test
      fromMnemonicMock.mockImplementationOnce(() => {
        return Promise.reject(new Error('Signer fail'));
      });

      // First start the service (which only initializes config)
      const service = await HeimdallService.start(mockRuntime as IAgentRuntime);

      // Now force a call to getSigner() by calling getSigningClient() which will trigger the error
      await expect((service as any).getSigner()).rejects.toThrow(
        'Failed to create Heimdall signer.'
      );
    });

    it('should handle client connection failure', async () => {
      vi.mocked(SigningStargateClient.connectWithSigner).mockRejectedValueOnce(
        new Error('Client connect fail')
      );

      const tempService: HeimdallService = new HeimdallService(mockRuntime as IAgentRuntime);
      (tempService as any).heimdallRpcUrl = HEIMDALL_RPC_URL;
      (tempService as any).privateKey = PRIVATE_KEY;
      await expect((tempService as any).getSigningClient()).rejects.toThrow(
        'Failed to connect to Heimdall RPC with signer.'
      );
    });

    it('stop service should clear configurations', async () => {
      service = await HeimdallService.start(mockRuntime as IAgentRuntime);
      await service.stop();
      const serviceWithPrivates = service as any;
      expect(serviceWithPrivates.heimdallRpcUrl).toBeNull();
      expect(serviceWithPrivates.privateKey).toBeNull();

      const getServiceMock = vi.fn().mockReturnValue(service);
      const runtimeWithMockedGetService: Partial<IAgentRuntime> = {
        ...mockRuntime,
        getService: getServiceMock,
      };
      await HeimdallService.stop(runtimeWithMockedGetService as IAgentRuntime);
      expect(mockedLogger.info).toHaveBeenCalledWith('Stopping HeimdallService...');
    });
  });

  describe('voteOnProposal', () => {
    beforeEach(async () => {
      service = await HeimdallService.start(mockRuntime as IAgentRuntime);
      mockSigner.getAccounts.mockResolvedValue([{ address: VOTER_ADDRESS }]);
    });

    it('should successfully vote on a proposal', async () => {
      const proposalId = '123';
      const option = VoteOption.VOTE_OPTION_YES;
      const txHash = await service.voteOnProposal(proposalId, option);

      expect(txHash).toBe('TEST_TX_HASH');
      expect(mockStargateClient.signAndBroadcast).toHaveBeenCalledWith(
        VOTER_ADDRESS,
        [
          {
            typeUrl: '/cosmos.gov.v1beta1.MsgVote',
            value: {
              proposalId: proposalId,
              voter: VOTER_ADDRESS,
              option: option,
            },
          },
        ],
        EXPECTED_FEE
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        `Successfully voted on proposal ${proposalId}, tx hash: TEST_TX_HASH`
      );
    });

    it('should throw if no accounts found in wallet', async () => {
      mockSigner.getAccounts.mockResolvedValue([]);
      await expect(service.voteOnProposal('123', VoteOption.VOTE_OPTION_YES)).rejects.toThrow(
        'No accounts found in wallet'
      );
    });

    it('should handle transaction broadcast failure (code != 0)', async () => {
      mockStargateClient.signAndBroadcast.mockResolvedValue({
        code: 1,
        rawLog: 'failed tx',
        transactionHash: 'FAIL_TX_HASH',
      });
      await expect(service.voteOnProposal('123', VoteOption.VOTE_OPTION_YES)).rejects.toThrow(
        'Error when broadcasting tx: failed tx'
      );
    });

    it('should handle specific error message for insufficient fee', async () => {
      mockStargateClient.signAndBroadcast.mockRejectedValue(new Error('insufficient fee'));
      await expect(service.voteOnProposal('123', VoteOption.VOTE_OPTION_YES)).rejects.toThrow(
        'Vote failed: Insufficient fee for Heimdall transaction. Try increasing the fee amount.'
      );
    });

    it('should handle specific error message for proposal not found', async () => {
      mockStargateClient.signAndBroadcast.mockRejectedValue(new Error('proposal not found'));
      await expect(service.voteOnProposal('123', VoteOption.VOTE_OPTION_YES)).rejects.toThrow(
        'Vote failed: Proposal 123 not found or no longer in voting period.'
      );
    });

    it('should handle specific error message for already voted', async () => {
      mockStargateClient.signAndBroadcast.mockRejectedValue(new Error('already voted on proposal'));
      await expect(service.voteOnProposal('123', VoteOption.VOTE_OPTION_YES)).rejects.toThrow(
        'Vote failed: This account has already voted on proposal 123.'
      );
    });

    it('should handle generic broadcast error', async () => {
      mockStargateClient.signAndBroadcast.mockRejectedValue(new Error('Some generic error'));
      await expect(service.voteOnProposal('123', VoteOption.VOTE_OPTION_YES)).rejects.toThrow(
        'Vote failed: Some generic error'
      );
    });
  });

  describe('submitProposal', () => {
    const initialDepositAmount = '10000000';
    const initialDepositDenom = 'matic';

    beforeEach(async () => {
      service = await HeimdallService.start(mockRuntime as IAgentRuntime);
      mockSigner.getAccounts.mockResolvedValue([{ address: PROPOSER_ADDRESS }]);
    });

    it('should successfully submit a TextProposal', async () => {
      const content: TextProposal = {
        title: 'Test Text Proposal',
        description: 'This is a test text proposal.',
      };
      const txHash = await service.submitProposal(
        content,
        initialDepositAmount,
        initialDepositDenom
      );

      expect(txHash).toBe('TEST_TX_HASH');
      expect(mockStargateClient.signAndBroadcast).toHaveBeenCalledWith(
        PROPOSER_ADDRESS,
        [
          {
            typeUrl: '/cosmos.gov.v1beta1.MsgSubmitProposal',
            value: {
              content: {
                typeUrl: '/cosmos.gov.v1beta1.TextProposal',
                value: content,
              },
              initialDeposit: coins(initialDepositAmount, initialDepositDenom),
              proposer: PROPOSER_ADDRESS,
            },
          },
        ],
        EXPECTED_FEE
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Successfully submitted proposal, tx hash: TEST_TX_HASH' // Fixed template literal
      );
    });

    it('should successfully submit a ParameterChangeProposal', async () => {
      const changes: ParamChange[] = [
        {
          subspace: 'staking',
          key: 'MaxValidators',
          value: '110',
        },
      ];
      const content: ParameterChangeProposal = {
        title: 'Test Param Change',
        description: 'Change MaxValidators to 110',
        changes: changes,
      };
      const txHash = await service.submitProposal(
        content,
        initialDepositAmount,
        initialDepositDenom
      );

      expect(txHash).toBe('TEST_TX_HASH');
      expect(mockStargateClient.signAndBroadcast).toHaveBeenCalledWith(
        PROPOSER_ADDRESS,
        [
          {
            typeUrl: '/cosmos.gov.v1beta1.MsgSubmitProposal',
            value: {
              content: {
                typeUrl: '/cosmos.params.v1beta1.ParameterChangeProposal',
                value: content,
              },
              initialDeposit: coins(initialDepositAmount, initialDepositDenom),
              proposer: PROPOSER_ADDRESS,
            },
          },
        ],
        EXPECTED_FEE
      );
    });

    it('should handle specific error for insufficient fee on submitProposal', async () => {
      const content: TextProposal = { title: 't', description: 'd' };
      mockStargateClient.signAndBroadcast.mockRejectedValue(new Error('insufficient fee'));
      await expect(service.submitProposal(content, initialDepositAmount)).rejects.toThrow(
        'Proposal submission failed: Insufficient fee for Heimdall transaction. Try increasing the fee amount.'
      );
    });

    it('should handle specific error for minimum deposit on submitProposal', async () => {
      const content: TextProposal = { title: 't', description: 'd' };
      mockStargateClient.signAndBroadcast.mockRejectedValue(new Error('minimum deposit too small'));
      await expect(service.submitProposal(content, initialDepositAmount)).rejects.toThrow(
        'Proposal submission failed: The initial deposit is below the minimum required for proposals.'
      );
    });
  });

  describe('transferHeimdallTokens', () => {
    const recipientAddress = 'heimdall1recipient';
    const amount = '500000';
    const denom = 'matic';

    beforeEach(async () => {
      service = await HeimdallService.start(mockRuntime as IAgentRuntime);
      mockSigner.getAccounts.mockResolvedValue([{ address: SENDER_ADDRESS }]);
    });

    it('should successfully transfer tokens', async () => {
      const txHash = await service.transferHeimdallTokens(recipientAddress, amount, denom);

      expect(txHash).toBe('TEST_TX_HASH');
      expect(mockStargateClient.signAndBroadcast).toHaveBeenCalledWith(
        SENDER_ADDRESS,
        [
          {
            typeUrl: '/cosmos.bank.v1beta1.MsgSend',
            value: {
              fromAddress: SENDER_ADDRESS,
              toAddress: recipientAddress,
              amount: coins(amount, denom),
            },
          },
        ],
        EXPECTED_FEE
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        `Successfully transferred ${amount} ${denom} to ${recipientAddress}, tx hash: TEST_TX_HASH`
      );
    });

    it('should throw if recipient address is invalid', async () => {
      await expect(service.transferHeimdallTokens('invalidaddress', amount, denom)).rejects.toThrow(
        'Transfer failed: Invalid recipient address format: invalidaddress. Must start with "heimdall"'
      );
    });

    it('should handle specific error for insufficient fee on transfer', async () => {
      mockStargateClient.signAndBroadcast.mockRejectedValue(new Error('insufficient fee'));
      await expect(service.transferHeimdallTokens(recipientAddress, amount, denom)).rejects.toThrow(
        'Transfer failed: Insufficient fee for Heimdall transaction. Try increasing the fee amount.'
      );
    });

    it('should handle specific error for insufficient funds on transfer', async () => {
      mockStargateClient.signAndBroadcast.mockRejectedValue(new Error('insufficient funds'));
      await expect(service.transferHeimdallTokens(recipientAddress, amount, denom)).rejects.toThrow(
        `Transfer failed: Insufficient funds to transfer ${amount} ${denom}. Check your balance on Heimdall.`
      );
    });
  });
});
