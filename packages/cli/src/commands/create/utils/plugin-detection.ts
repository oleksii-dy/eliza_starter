import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getPluginForAIModel } from './plugin-mapping';
import colors from 'yoctocolors';

interface MissingPlugin {
  envKey: string;
  pluginPackage: string;
  modelType: string;
}

/**
 * Maps environment variable keys to their corresponding AI models and plugins
 */
const ENV_TO_MODEL_MAP: Record<string, { model: string; description: string }> = {
  'OPENAI_API_KEY': { model: 'openai', description: 'OpenAI' },
  'ANTHROPIC_API_KEY': { model: 'claude', description: 'Anthropic Claude' },
  'OPENROUTER_API_KEY': { model: 'openrouter', description: 'OpenRouter' },
  'OLLAMA_API_ENDPOINT': { model: 'ollama', description: 'Ollama' },
  'GOOGLE_GENERATIVE_AI_API_KEY': { model: 'google', description: 'Google Generative AI' },
};

/**
 * Detects missing AI model plugins based on environment variables
 */
export async function detectMissingPlugins(projectDir: string): Promise<MissingPlugin[]> {
  const missingPlugins: MissingPlugin[] = [];
  
  // Check if .env file exists
  const envPath = path.join(projectDir, '.env');
  if (!existsSync(envPath)) {
    return missingPlugins;
  }
  
  // Read .env file
  const envContent = await fs.readFile(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  // Parse environment variables
  const envVars: Record<string, string> = {};
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      // Check if the value is not a placeholder
      if (value && !value.includes('your_') && !value.includes('_here')) {
        envVars[key.trim()] = value;
      }
    }
  }
  
  // Check package.json for installed dependencies
  const packageJsonPath = path.join(projectDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return missingPlugins;
  }
  
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  
  // Check for each environment variable
  for (const [envKey, modelInfo] of Object.entries(ENV_TO_MODEL_MAP)) {
    if (envVars[envKey]) {
      const pluginPackage = getPluginForAIModel(modelInfo.model);
      if (pluginPackage && !allDependencies[pluginPackage]) {
        missingPlugins.push({
          envKey,
          pluginPackage,
          modelType: modelInfo.description,
        });
      }
    }
  }
  
  return missingPlugins;
}

/**
 * Suggests missing plugins to the user
 */
export async function suggestMissingPlugins(projectDir: string): Promise<void> {
  const missingPlugins = await detectMissingPlugins(projectDir);
  
  if (missingPlugins.length === 0) {
    return;
  }
  
  console.info(`\n${colors.yellow('⚠')} Detected API keys without corresponding plugins:`);
  
  for (const missing of missingPlugins) {
    console.info(`  - ${missing.envKey} is set but ${missing.pluginPackage} is not installed`);
  }
  
  console.info(`\n${colors.cyan('💡')} To install missing plugins, run:`);
  const installCommands = missingPlugins.map(p => `bun add ${p.pluginPackage}`);
  console.info(`  ${installCommands.join(' && ')}\n`);
} 