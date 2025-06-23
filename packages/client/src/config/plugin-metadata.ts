export interface PluginMetadata {
  name: string;
  categories: string[];
}

export const installedPluginMetadata: PluginMetadata[] = [
  {
    name: '@elizaos/plugin-elevenlabs',
    categories: ['voice-provider:elevenlabs'],
  },
  {
    name: '@elizaos/plugin-local-ai',
    categories: ['voice-provider:local'],
  },
  {
    name: '@elizaos/plugin-openai',
    categories: ['voice-provider:openai'],
  },
];

export function buildProviderPluginMap(
  metadata: PluginMetadata[] = installedPluginMetadata,
): Record<string, string> {
  const map: Record<string, string> = {};
  const prefix = 'voice-provider:';
  for (const { name, categories } of metadata) {
    for (const cat of categories || []) {
      if (cat.startsWith(prefix)) {
        const provider = cat.slice(prefix.length);
        map[provider] = name;
      }
    }
  }
  return map;
}
