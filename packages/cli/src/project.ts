import {
  Character,
  Plugin,
  logger,
  type ProjectAgent,
  type UUID,
} from '@elizaos/core';
import { stringToUuid } from '@elizaos/core';
import * as fs from 'node:fs';
import path from 'node:path';
import { getElizaCharacter } from './characters/eliza';
import { detectDirectoryType } from './utils/directory-detection';

/**
 * Interface for a project module that can be loaded.
 */
interface ProjectModule {
  agents?: ProjectAgent[];
  character?: Character;
  init?: (runtime: any) => Promise<void>;
  [key: string]: any;
}

/**
 * Interface for a loaded project.
 */
export interface Project {
  agents: ProjectAgent[];
  dir: string;
  isPlugin?: boolean;
  pluginModule?: Plugin;
}

/**
 * Determine if a loaded module is a plugin
 * @param module The loaded module to check
 * @returns true if this appears to be a plugin
 */
function isPlugin(module: any): boolean {
  if (
    module &&
    typeof module === 'object' &&
    typeof module.name === 'string' &&
    typeof module.description === 'string'
  ) {
    return true;
  }
  if (
    module &&
    typeof module === 'object' &&
    module.default &&
    typeof module.default === 'object' &&
    typeof module.default.name === 'string' &&
    typeof module.default.description === 'string'
  ) {
    return true;
  }
  for (const key in module) {
    if (
      key !== 'default' &&
      module[key] &&
      typeof module[key] === 'object' &&
      typeof module[key].name === 'string' &&
      typeof module[key].description === 'string'
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Extract a Plugin object from a module
 * @param module The module to extract from
 * @returns The plugin object
 */
function extractPlugin(module: any): Plugin {
  if (
    module &&
    typeof module === 'object' &&
    typeof module.name === 'string' &&
    typeof module.description === 'string'
  ) {
    return module as Plugin;
  }
  if (
    module &&
    typeof module === 'object' &&
    module.default &&
    typeof module.default === 'object' &&
    typeof module.default.name === 'string' &&
    typeof module.default.description === 'string'
  ) {
    return module.default as Plugin;
  }
  for (const key in module) {
    if (
      key !== 'default' &&
      module[key] &&
      typeof module[key] === 'object' &&
      typeof module[key].name === 'string' &&
      typeof module[key].description === 'string'
    ) {
      return module[key] as Plugin;
    }
  }
  throw new Error('Could not extract plugin from module');
}

/**
 * Loads a project from the specified directory.
 * @param {string} dir - The directory to load the project from.
 * @returns {Promise<Project>} A promise that resolves to the loaded project.
 */
export async function loadProject(dir: string): Promise<Project> {
  try {
    const dirInfo = detectDirectoryType(dir);
    if (!dirInfo.hasPackageJson) {
      throw new Error(`No package.json found in ${dir}`);
    }

    const packageJson = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    const main = packageJson.main;
    if (!main) {
      logger.warn('No main field found in package.json, using default character');
      const defaultCharacterName = 'Eliza (Default)';
      const elizaCharacter = getElizaCharacter();
      const defaultAgent: ProjectAgent = {
        character: {
          ...elizaCharacter,
          id: stringToUuid(defaultCharacterName) as UUID,
          name: defaultCharacterName,
        },
        init: async () => {
          logger.info('Initializing default Eliza character');
        },
      };
      return {
        agents: [defaultAgent],
        dir,
      };
    }

    const entryPoints = [
      path.join(dir, main),
      path.join(dir, 'dist/index.js'),
      path.join(dir, 'src/index.ts'),
      path.join(dir, 'src/index.js'),
      path.join(dir, 'index.ts'),
      path.join(dir, 'index.js'),
    ];

    let projectModule: ProjectModule | null = null;
    for (const entryPoint of entryPoints) {
      if (fs.existsSync(entryPoint)) {
        try {
          const importPath = path.resolve(entryPoint);
          const importUrl =
            process.platform === 'win32'
              ? 'file:///' + importPath.replace(/\\/g, '/')
              : 'file://' + importPath;
          projectModule = (await import(importUrl)) as ProjectModule;
          logger.info(`Loaded project from ${entryPoint}`);
          break;
        } catch (error) {
          logger.warn(`Failed to import project from ${entryPoint}:`, error);
        }
      }
    }

    if (!projectModule) {
      throw new Error('Could not find project entry point');
    }

    const moduleIsPlugin = isPlugin(projectModule);

    if (moduleIsPlugin) {
      const plugin = extractPlugin(projectModule);
      const characterName = 'Eliza (Test Mode)';
      const elizaCharacter = getElizaCharacter();
      const testCharacter: Character = {
        ...elizaCharacter,
        id: stringToUuid(characterName) as UUID,
        name: characterName,
        system: `${elizaCharacter.system} Testing the plugin: ${plugin.name}.`,
      };
      const testAgent: ProjectAgent = {
        character: testCharacter,
        plugins: [plugin],
        init: async () => {
          logger.info(`Initializing Eliza test agent for plugin: ${plugin.name}`);
        },
      };
      return {
        agents: [testAgent],
        dir,
        isPlugin: true,
        pluginModule: plugin,
      };
    }

    const agents: ProjectAgent[] = [];
    if (
      projectModule.default &&
      typeof projectModule.default === 'object' &&
      Array.isArray(projectModule.default.agents)
    ) {
      agents.push(...(projectModule.default.agents as ProjectAgent[]));
    } else {
      for (const [key, value] of Object.entries(projectModule)) {
        if (key === 'default' && value && typeof value === 'object') {
          if ((value as ProjectModule).character && (value as ProjectModule).init) {
            agents.push(value as ProjectAgent);
          }
        } else if (
          value &&
          typeof value === 'object' &&
          (value as ProjectModule).character &&
          (value as ProjectModule).init
        ) {
          agents.push(value as ProjectAgent);
        }
      }
    }

    if (agents.length === 0) {
      throw new Error('No agents found in project');
    }

    return {
      agents,
      dir,
    };
  } catch (error) {
    logger.error('Error loading project:', error);
    throw error;
  }
} 