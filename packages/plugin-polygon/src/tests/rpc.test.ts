import { describe, it, expect, beforeAll, vi } from 'vitest';
import { PolygonRpcProvider } from '../providers/PolygonRpcProvider';
import { DEFAULT_RPC_URLS } from '../config';

// Mock the elizaLogger to avoid dependency issues
vi.mock('@elizaos/core', () => ({
  elizaLogger: {
    log: vi.fn(),
    error: vi.fn()
  },
  IAgentRuntime: vi.fn(),
  Service: class MockService {
    constructor() {}
  }
}));

describe('PolygonRpcProvider', () => {
  let provider: PolygonRpcProvider;
  const testPrivateKey = '0x0000000000000000000000000000000000000000000000000000000000000001';
  
  beforeAll(() => {
    // Create the provider with Infura RPC URLs
    provider = new PolygonRpcProvider(
      DEFAULT_RPC_URLS.ETHEREUM_RPC_URL,
      DEFAULT_RPC_URLS.POLYGON_RPC_URL,
      testPrivateKey
    );
  });
  
  describe('Provider Initialization', () => {
    it('should initialize provider correctly', () => {
      expect(provider).toBeDefined();
    });
    
    it('should have the correct RPC URLs', () => {
      expect(provider['l1Chain'].rpcUrls.default.http[0]).toContain('infura.io');
      expect(provider['l2Chain'].rpcUrls.default.http[0]).toContain('infura.io');
    });
  });
  
  describe('Network Interaction', () => {
    it('should get the current block number', async () => {
      const blockNumber = await provider.getBlockNumber('L2');
      expect(typeof blockNumber).toBe('number');
      expect(blockNumber).toBeGreaterThan(0);
    });
    
    it('should get native balance for an address', async () => {
      const polygonBridgeAddress = '0x8484Ef722627bf18ca5Ae6BcF031c23E6e922B30';
      const balance = await provider.getNativeBalance(polygonBridgeAddress, 'L2');
      expect(typeof balance).toBe('bigint');
    });
  });
}); 