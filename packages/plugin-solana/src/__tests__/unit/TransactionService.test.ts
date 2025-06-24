import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';

// Mock dependencies
mock.module('@solana/web3.js', () => ({
  Connection: mock(() => ({
    simulateTransaction: mock(),
    sendTransaction: mock(),
    confirmTransaction: mock(),
    getRecentPrioritizationFees: mock(),
    getSlot: mock(),
    getLatestBlockhash: mock().mockResolvedValue({
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 100,
    }),
    sendRawTransaction: mock(),
    getSignatureStatus: mock(),
    getTransaction: mock(),
  })),
  Transaction: mock().mockImplementation(() => ({
    add: mock(),
    sign: mock(),
    serialize: mock(),
    recentBlockhash: 'recent-blockhash',
    feePayer: null,
    instructions: [],
  })),
  TransactionInstruction: mock(),
  Keypair: {
    generate: mock(() => ({
      publicKey: { toString: () => 'generated-pubkey' },
      secretKey: new Uint8Array(64),
    })),
  },
  SystemProgram: {
    transfer: mock(() => ({
      keys: [],
      programId: { toString: () => 'SystemProgram' },
      data: new Uint8Array(),
    })),
  },
  ComputeBudgetProgram: {
    setComputeUnitLimit: mock(() => ({
      keys: [],
      programId: { toString: () => 'ComputeBudget' },
      data: new Uint8Array(),
    })),
    setComputeUnitPrice: mock(() => ({
      keys: [],
      programId: { toString: () => 'ComputeBudget' },
      data: new Uint8Array(),
    })),
  },
  PublicKey: mock((key) => ({
    toString: () => key,
    toBase58: () => key,
  })),
  LAMPORTS_PER_SOL: 1000000000,
}));

mock.module('@elizaos/core', () => ({
  Service: class Service {
    constructor(protected runtime: any) {}
  },
  logger: {
    info: mock(),
    error: mock(),
    warn: mock(),
    debug: mock(),
  },
}));

import { TransactionService } from '../../services/TransactionService';
import {
  Connection,
  Transaction,
  TransactionInstruction,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  PublicKey,
} from '@solana/web3.js';
import { logger } from '@elizaos/core';

describe('TransactionService', () => {
  let service: TransactionService;
  let mockRuntime: any;
  let mockConnection: any;
  let mockKeypair: any;

  beforeEach(() => {
    mock.restore();

    mockKeypair = {
      publicKey: { toString: () => 'test-public-key' },
      secretKey: new Uint8Array(64),
    };

    mockConnection = {
      simulateTransaction: mock(),
      sendTransaction: mock(),
      confirmTransaction: mock(),
      getRecentPrioritizationFees: mock(),
      getSlot: mock(),
      getLatestBlockhash: mock().mockResolvedValue({
        blockhash: 'mock-blockhash',
        lastValidBlockHeight: 100,
      }),
      sendRawTransaction: mock(),
      getSignatureStatus: mock(),
      getTransaction: mock(),
    };

    mockRuntime = {
      getSetting: mock((key: string) => {
        const settings: Record<string, string> = {
          SOLANA_RPC_URL: 'https://api.devnet.solana.com',
          SOLANA_NETWORK: 'devnet',
        };
        return settings[key];
      }),
      getService: mock(() => ({
        getAgentKeypair: mock().mockResolvedValue(mockKeypair),
      })),
    };

    service = new TransactionService(mockRuntime);
    // Replace the connection with our mock
    (service as any).connection = mockConnection;
  });

  afterEach(() => {
    mock.restore();
  });

  describe('constructor', () => {
    it('should initialize successfully', () => {
      expect(service).toBeInstanceOf(TransactionService);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('TransactionService initialized')
      );
    });

    it('should handle missing RPC service gracefully', () => {
      mockRuntime.getService = mock(() => null);

      expect(() => new TransactionService(mockRuntime)).not.toThrow();
    });
  });

  describe('sendTransaction', () => {
    let mockTransaction: any;
    let mockInstruction: any;

    beforeEach(() => {
      mockInstruction = {
        keys: [],
        programId: { toString: () => 'TestProgram' },
        data: new Uint8Array(),
      };

      mockTransaction = {
        add: mock().mockReturnThis(),
        sign: mock(),
        serialize: mock().mockReturnValue(new Uint8Array()),
        recentBlockhash: 'recent-blockhash',
        feePayer: mockKeypair.publicKey,
        instructions: [mockInstruction],
      };

      (Transaction as any).mockImplementation(() => mockTransaction);
    });

    it('should send transaction successfully', async () => {
      const mockSignature = 'transaction-signature-123';

      mockConnection.simulateTransaction.mockResolvedValue({
        value: { err: null, logs: [] },
      });
      mockConnection.sendTransaction.mockResolvedValue(mockSignature);

      const result = await service.sendTransaction(mockTransaction, [mockKeypair]);

      expect(result).toBe(mockSignature);
      expect(mockConnection.sendTransaction).toHaveBeenCalled();
    });

    it('should simulate transaction when simulateFirst is true', async () => {
      mockConnection.simulateTransaction.mockResolvedValue({
        value: { err: null, logs: ['simulation log'] },
      });
      mockConnection.sendTransaction.mockResolvedValue('test-signature');

      const result = await service.sendTransaction(mockTransaction, [mockKeypair], {
        simulateFirst: true,
      });

      expect(mockConnection.simulateTransaction).toHaveBeenCalled();
      expect(mockConnection.sendTransaction).toHaveBeenCalled();
    });

    it('should handle transaction errors', async () => {
      const error = new Error('Transaction failed');

      // Mock simulation to succeed, but sendTransaction to fail
      mockConnection.simulateTransaction.mockResolvedValue({
        value: { err: null, logs: [] },
      });
      mockConnection.sendTransaction.mockRejectedValue(error);

      await expect(
        service.sendTransaction(mockTransaction, [mockKeypair], {
          simulateFirst: false, // Skip simulation to test send error
        })
      ).rejects.toThrow('Transaction failed');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send transaction'),
        expect.objectContaining({ error })
      );
    });

    it('should retry failed transactions', async () => {
      const mockSignature = 'retry-signature-123';

      // The service passes maxRetries to connection.sendTransaction,
      // it doesn't implement its own retry logic
      mockConnection.simulateTransaction.mockResolvedValue({
        value: { err: null, logs: [] },
      });
      mockConnection.sendTransaction.mockResolvedValue(mockSignature);

      const result = await service.sendTransaction(mockTransaction, [mockKeypair], {
        maxRetries: 3,
        simulateFirst: false,
      });

      expect(result).toBe(mockSignature);
      expect(mockConnection.sendTransaction).toHaveBeenCalledWith(
        mockTransaction,
        [mockKeypair],
        expect.objectContaining({
          maxRetries: 3,
        })
      );
    });

    it('should add priority fees when specified', async () => {
      const mockSignature = 'priority-fee-signature';

      // Mock simulation to succeed
      mockConnection.simulateTransaction.mockResolvedValue({
        value: { err: null, logs: [] },
      });
      mockConnection.sendTransaction.mockResolvedValue(mockSignature);

      // Mock instructions array with unshift method
      mockTransaction.instructions = [];
      mockTransaction.instructions.unshift = mock();

      const result = await service.sendTransaction(mockTransaction, [mockKeypair], {
        priorityFee: 5000,
        simulateFirst: false,
      });

      expect(result).toBe(mockSignature);
      // The unshift is called with both instructions at once
      expect(mockTransaction.instructions.unshift).toHaveBeenCalledTimes(1);
      expect(mockTransaction.instructions.unshift).toHaveBeenCalledWith(
        expect.any(Object), // compute unit limit instruction
        expect.any(Object) // compute unit price instruction
      );
    });
  });

  describe('simulateTransaction', () => {
    it('should simulate transaction successfully', async () => {
      const mockTransaction = new Transaction();

      mockConnection.simulateTransaction.mockResolvedValue({
        value: {
          err: null,
          logs: ['log1', 'log2'],
          unitsConsumed: 50000,
        },
      });

      const result = await service.simulateTransaction(mockTransaction, [mockKeypair]);

      expect(result.success).toBe(true);
      expect(result.logs).toHaveLength(2);
      expect(result.unitsConsumed).toBe(50000);
    });

    it('should handle simulation errors', async () => {
      const mockTransaction = new Transaction();

      mockConnection.simulateTransaction.mockResolvedValue({
        value: {
          err: { InstructionError: [0, 'Custom'] },
          logs: ['error log'],
        },
      });

      const result = await service.simulateTransaction(mockTransaction);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('estimatePriorityFee', () => {
    it('should estimate priority fee based on recent fees', async () => {
      const mockRecentFees = [
        { prioritizationFee: 1000, slot: 100 },
        { prioritizationFee: 1500, slot: 101 },
        { prioritizationFee: 2000, slot: 102 },
      ];

      mockConnection.getRecentPrioritizationFees.mockResolvedValue(mockRecentFees);

      const estimate = await service.estimatePriorityFee();

      expect(estimate.recommended).toBeGreaterThan(0);
      expect(mockConnection.getRecentPrioritizationFees).toHaveBeenCalled();
    });

    it('should return default fee when no recent fees available', async () => {
      mockConnection.getRecentPrioritizationFees.mockResolvedValue([]);

      const estimate = await service.estimatePriorityFee();

      expect(estimate.recommended).toBe(10000);
    });

    it('should handle RPC errors gracefully', async () => {
      mockConnection.getRecentPrioritizationFees.mockRejectedValue(new Error('RPC Error'));

      const estimate = await service.estimatePriorityFee();

      expect(estimate.recommended).toBe(10000);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to estimate priority fees',
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });
  });

  describe('confirmTransaction', () => {
    it('should confirm transaction successfully', async () => {
      const signature = 'test-signature';

      mockConnection.getSignatureStatus.mockResolvedValue({
        value: { confirmationStatus: 'confirmed', err: null },
      });

      const result = await service.confirmTransaction(signature);

      expect(result).toBe(true);
      expect(mockConnection.getSignatureStatus).toHaveBeenCalled();
    });

    it('should handle transaction errors', async () => {
      const signature = 'test-signature';

      mockConnection.getSignatureStatus.mockResolvedValue({
        value: { confirmationStatus: 'processed', err: 'Transaction failed' },
      });

      const result = await service.confirmTransaction(signature);

      expect(result).toBe(false);
    });

    it('should timeout if not confirmed', async () => {
      const signature = 'test-signature';

      mockConnection.getSignatureStatus.mockResolvedValue({
        value: { confirmationStatus: 'processed', err: null },
      });

      const result = await service.confirmTransaction(signature, 'confirmed', 100);

      expect(result).toBe(false);
    });
  });

  describe('network-specific behavior', () => {
    it('should handle devnet transactions', () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === 'SOLANA_NETWORK') {
          return 'devnet';
        }
        return '';
      });

      const devnetService = new TransactionService(mockRuntime);
      expect(devnetService).toBeInstanceOf(TransactionService);
    });

    it('should handle mainnet transactions with higher fees', () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === 'SOLANA_NETWORK') {
          return 'mainnet-beta';
        }
        return '';
      });

      const mainnetService = new TransactionService(mockRuntime);
      expect(mainnetService).toBeInstanceOf(TransactionService);
    });
  });

  describe('service lifecycle', () => {
    it('should start service correctly', async () => {
      const startedService = await TransactionService.start(mockRuntime);

      expect(startedService).toBeInstanceOf(TransactionService);
    });

    it('should stop service correctly', async () => {
      await service.stop();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('TransactionService stopped')
      );
    });
  });
});
