import { describe, it, expect } from 'bun:test';
import { getPluginType } from '../../../src/utils/registry/schema';

const adapterPkg = {
  name: '@elizaos/plugin-sql',
  keywords: ['adapter', 'database'],
};

const clientPkg = {
  name: '@elizaos/plugin-discord',
  agentConfig: {
    pluginType: 'elizaos:client:1.0.0',
  },
};

const pluginPkg = {
  name: '@elizaos/plugin-starter',
  packageType: 'plugin',
};

describe('getPluginType', () => {
  it('detects adapter via keywords', () => {
    expect(getPluginType(adapterPkg)).toBe('adapter');
  });

  it('detects client via agentConfig', () => {
    expect(getPluginType(clientPkg)).toBe('client');
  });

  it('detects plugin via packageType', () => {
    expect(getPluginType(pluginPkg)).toBe('plugin');
  });

  it('falls back to name heuristics', () => {
    expect(getPluginType('@elizaos/plugin-twitter')).toBe('client');
  });
});
