import { describe, it, expect } from 'bun:test';
import { lendingPlugin } from './index.js';
import {
  LendingProtocol,
  LendingActionType,
  InterestRateMode,
  MAINNET_CHAINS
} from './types/index.js';
import { validateAmount, validateChainId, validateTokenAddress } from './utils/validation.js';
import { formatTokenAmount, formatAPY, formatHealthFactor } from './utils/formatters.js';

describe('Lending Plugin', () => {
  it('should export required plugin properties', () => {
    expect(lendingPlugin.name).toBe('plugin-lending');
    expect(lendingPlugin.description).toContain('DeFi lending');
    expect(lendingPlugin.services).toBeDefined();
    expect(lendingPlugin.actions).toBeDefined();
    expect(lendingPlugin.providers).toBeDefined();
    expect(lendingPlugin.tests).toBeDefined();
  });

  it('should have correct service configuration', () => {
    expect(lendingPlugin.services).toHaveLength(1);
    expect(lendingPlugin.services[0].name).toBe('LendingService');
  });

  it('should have lending action', () => {
    expect(lendingPlugin.actions).toHaveLength(1);
    expect(lendingPlugin.actions[0].name).toBe('LENDING_OPERATION');
  });

  it('should have lending info provider', () => {
    expect(lendingPlugin.providers).toHaveLength(1);
    expect(lendingPlugin.providers[0].name).toBe('LENDING_INFO');
  });
});

describe('Lending Types', () => {
  it('should define lending protocols', () => {
    expect(LendingProtocol.AAVE).toBe('aave');
    expect(LendingProtocol.COMPOUND).toBe('compound');
    expect(LendingProtocol.MORPHO).toBe('morpho');
    expect(LendingProtocol.SPARK).toBe('spark');
    expect(LendingProtocol.EULER).toBe('euler');
  });

  it('should define lending action types', () => {
    expect(LendingActionType.SUPPLY).toBe('supply');
    expect(LendingActionType.WITHDRAW).toBe('withdraw');
    expect(LendingActionType.BORROW).toBe('borrow');
    expect(LendingActionType.REPAY).toBe('repay');
  });

  it('should define interest rate modes', () => {
    expect(InterestRateMode.VARIABLE).toBe(2);
    expect(InterestRateMode.STABLE).toBe(1);
    expect(InterestRateMode.NONE).toBe(0);
  });

  it('should define mainnet chains', () => {
    expect(MAINNET_CHAINS.ETHEREUM).toBe(1);
    expect(MAINNET_CHAINS.POLYGON).toBe(137);
    expect(MAINNET_CHAINS.ARBITRUM).toBe(42161);
    expect(MAINNET_CHAINS.OPTIMISM).toBe(10);
    expect(MAINNET_CHAINS.BASE).toBe(8453);
  });
});

describe('Validation Functions', () => {
  it('should validate amounts correctly', () => {
    expect(validateAmount('100')).toBe(true);
    expect(validateAmount('0.5')).toBe(true);
    expect(validateAmount('max')).toBe(true);
    expect(validateAmount('all')).toBe(true);
    expect(validateAmount('0')).toBe(true); // BigNumber considers 0 as positive
    expect(validateAmount('-100')).toBe(false);
    expect(validateAmount('invalid')).toBe(false);
  });

  it('should validate chain IDs correctly', () => {
    expect(validateChainId(1)).toBe(true); // Ethereum
    expect(validateChainId(137)).toBe(true); // Polygon
    expect(validateChainId(999999)).toBe(false); // Invalid chain
  });

  it('should validate token addresses correctly', () => {
    expect(validateTokenAddress('0xdAC17F958D2ee523a2206206994597C13D831ec7')).toBe(true); // Valid ERC20 address (USDT)
    expect(validateTokenAddress('0x0000000000000000000000000000000000000000')).toBe(true); // Native token
    expect(validateTokenAddress('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE')).toBe(true); // Native token alt
    expect(validateTokenAddress('invalid-address')).toBe(false);
  });
});

describe('Formatter Functions', () => {
  it('should format token amounts correctly', () => {
    expect(formatTokenAmount('1000000', 6)).toBe('1'); // 1 USDC
    expect(formatTokenAmount('1000000000000000000', 18)).toBe('1'); // 1 ETH
    expect(formatTokenAmount('1500000', 6)).toBe('1.5'); // 1.5 USDC
    expect(formatTokenAmount('0', 18)).toBe('0');
  });

  it('should format APY correctly', () => {
    expect(formatAPY('5.25')).toBe('5.25%');
    expect(formatAPY('0')).toBe('0.00%');
    expect(formatAPY('12.5678')).toBe('12.57%');
  });

  it('should format health factor correctly', () => {
    expect(formatHealthFactor('2.5')).toContain('Safe ✅');
    expect(formatHealthFactor('1.7')).toContain('Moderate ⚠️');
    expect(formatHealthFactor('1.2')).toContain('Risky ⚠️');
    expect(formatHealthFactor('1.05')).toContain('Critical ⚠️');
  });
});

describe('Plugin Configuration', () => {
  it('should have correct configuration schema', () => {
    expect(lendingPlugin.config).toBeDefined();
    expect(lendingPlugin.config?.EVM_PRIVATE_KEY).toBeDefined();
    expect(lendingPlugin.config?.AAVE_ENABLED).toBeDefined();
    expect(lendingPlugin.config?.COMPOUND_ENABLED).toBeDefined();
  });

  it('should have required configuration marked as required', () => {
    expect(lendingPlugin.config?.EVM_PRIVATE_KEY.required).toBe(true);
    expect(lendingPlugin.config?.EVM_PRIVATE_KEY.secret).toBe(true);
  });

  it('should have default values for protocol enables', () => {
    expect(lendingPlugin.config?.AAVE_ENABLED.default).toBe(true);
    expect(lendingPlugin.config?.COMPOUND_ENABLED.default).toBe(true);
    expect(lendingPlugin.config?.MORPHO_ENABLED.default).toBe(false);
  });
});