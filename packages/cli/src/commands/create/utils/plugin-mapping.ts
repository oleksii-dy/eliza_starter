/**
 * Maps AI model selections to their corresponding plugin packages
 */
export interface AIModelPluginMapping {
  model: string;
  package: string;
  description: string;
}

/**
 * Get the plugin package name for a given AI model selection
 */
export function getPluginForAIModel(aiModel: string): string | null {
  const mappings: Record<string, string> = {
    'openai': '@elizaos/plugin-openai',
    'claude': '@elizaos/plugin-anthropic',
    'openrouter': '@elizaos/plugin-openrouter',
    'ollama': '@elizaos/plugin-ollama',
    'google': '@elizaos/plugin-google-genai',
    'local': '@elizaos/plugin-local-ai',
  };

  return mappings[aiModel] || null;
}

/**
 * Get the plugin package name for a given embedding model selection
 */
export function getPluginForEmbeddingModel(embeddingModel: string): string | null {
  // Same mapping as AI models since they provide both capabilities
  return getPluginForAIModel(embeddingModel);
}

/**
 * Get all AI model plugins that should be installed based on selections
 */
export function getRequiredPlugins(aiModel: string, embeddingModel?: string): string[] {
  const plugins: string[] = [];
  
  const aiPlugin = getPluginForAIModel(aiModel);
  if (aiPlugin) {
    plugins.push(aiPlugin);
  }
  
  // Only add embedding model plugin if it's different from the AI model plugin
  if (embeddingModel && embeddingModel !== aiModel) {
    const embeddingPlugin = getPluginForEmbeddingModel(embeddingModel);
    if (embeddingPlugin && !plugins.includes(embeddingPlugin)) {
      plugins.push(embeddingPlugin);
    }
  }
  
  return plugins;
} 