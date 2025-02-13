import { describe, it, expect, beforeEach } from 'vitest';
import { DefiDetectorPlugin } from '../index';
import { MockRuntime } from '../__mocks__/mockRuntime';

describe('DefiDetectorPlugin', () => {
  let mockRuntime: MockRuntime;
  let plugin: DefiDetectorPlugin;
  
  beforeEach(() => {
    mockRuntime = new MockRuntime({
      'wallet.address': '0xMockAddress',
      'api.key': 'mock-api-key'
    });
    plugin = new DefiDetectorPlugin(mockRuntime);
  });

  // Test plugin initialization
  it('should initialize with correct metadata', () => {
    expect(plugin.name).toBe('defi-detector');
    expect(plugin.description).toBe('Token auditing and meme generation for DeFi');
  });

  // Test action registration
  it('should register required actions', () => {
    expect(plugin.actions).toBeDefined();
    expect(plugin.actions.find(a => a.name === 'audit')).toBeDefined();
  });

  // Test action functionality
  it('should handle audit action', async () => {
    const auditAction = plugin.actions.find(a => a.name === 'audit');
    const result = await auditAction?.handler(mockRuntime, {
      content: { text: 'BTC' }
    });
    expect(result).toBeDefined();
  });
});