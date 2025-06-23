import { describe, it, expect } from 'bun:test';
import {
  buildProviderPluginMap,
  getRequiredPluginForProvider,
} from '../voice-models';
import { PluginMetadata } from '../plugin-metadata';

describe('voice provider resolution', () => {
  const metadata: PluginMetadata[] = [
    { name: '@elizaos/plugin-elevenlabs', categories: ['voice-provider:elevenlabs'] },
    { name: '@elizaos/plugin-local-ai', categories: ['voice-provider:local'] },
  ];

  it('buildProviderPluginMap extracts provider mapping', () => {
    const map = buildProviderPluginMap(metadata);
    expect(map.elevenlabs).toBe('@elizaos/plugin-elevenlabs');
    expect(map.local).toBe('@elizaos/plugin-local-ai');
  });

  it('getRequiredPluginForProvider resolves plugin from metadata', () => {
    const plugin = getRequiredPluginForProvider('local', metadata);
    expect(plugin).toBe('@elizaos/plugin-local-ai');
  });
});
