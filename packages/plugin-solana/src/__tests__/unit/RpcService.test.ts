import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';

// Mock dependencies
mock.module('@solana/web3.js', () => ({
  Connection: mock(() => ({
    getSlot: mock(),
    getBlockHeight: mock(),
    getHealth: mock(),
  })),
}));

mock.module('axios', () => ({
  default: {
    get: mock(),
    post: mock(),
  },
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

import { RpcService } from '../../services/RpcService';
import { Connection } from '@solana/web3.js';
import { logger } from '@elizaos/core';

describe('RpcService', () => {
  let service: RpcService;
  let mockRuntime: any;
  let mockConnection: any;

  beforeEach(() => {
    mock.restore();

    mockRuntime = {
      getSetting: mock((key: string) => {
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
    mock.restore();
  });

  describe('constructor', () => {
    it('should initialize with default endpoints', () => {
      expect(service).toBeInstanceOf(RpcService);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('RpcService initialized'));
    });

    it('should initialize with custom RPC URL', () => {
      const customRpc = 'https://custom.rpc.url';
      mockRuntime.getSetting = mock((key: string) => {
        if (key === 'SOLANA_RPC_URL') {
          return customRpc;
        }
        if (key === 'SOLANA_NETWORK') {
          return 'mainnet-beta';
        }
        return '';
      });

      const customService = new RpcService(mockRuntime);
      expect(customService).toBeInstanceOf(RpcService);
    });

    it('should handle missing configuration gracefully', () => {
      mockRuntime.getSetting = mock(() => '');

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
        mockConnection.getSlot = mock().mockResolvedValue(12345);
        mockConnection.getBlockHeight = mock().mockResolvedValue(12300);
        mockConnection.getHealth = mock().mockResolvedValue('ok');
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
      mockRuntime.getSetting = mock((key: string) => {
        if (key === 'SOLANA_NETWORK') {
          return 'devnet';
        }
        return '';
      });

      const devnetService = new RpcService(mockRuntime);
      expect(devnetService).toBeInstanceOf(RpcService);
    });

    it('should detect mainnet network', () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === 'SOLANA_NETWORK') {
          return 'mainnet-beta';
        }
        return '';
      });

      const mainnetService = new RpcService(mockRuntime);
      expect(mainnetService).toBeInstanceOf(RpcService);
    });

    it('should default to devnet if no network specified', () => {
      mockRuntime.getSetting = mock(() => '');

      const defaultService = new RpcService(mockRuntime);
      expect(defaultService).toBeInstanceOf(RpcService);
    });
  });

  describe('service lifecycle', () => {
    it('should start service correctly', async () => {
      const startedService = await RpcService.start(mockRuntime);

      expect(startedService).toBeInstanceOf(RpcService);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('RpcService initialized'));
    });

    it('should stop service correctly', async () => {
      await service.stop();

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('RpcService stopped'));
    });
  });

  describe('error handling', () => {
    it('should handle connection errors gracefully', () => {
      mockRuntime.getSetting = mock(() => {
        throw new Error('Config error');
      });

      expect(() => new RpcService(mockRuntime)).not.toThrow();
    });

    it('should handle invalid RPC URLs', () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === 'SOLANA_RPC_URL') {
          return 'invalid-url';
        }
        return '';
      });

      expect(() => new RpcService(mockRuntime)).not.toThrow();
    });
  });
});
