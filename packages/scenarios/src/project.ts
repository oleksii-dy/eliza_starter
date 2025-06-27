import type { Project } from '@elizaos/core';
import { defaultTestCharacter } from './default-agent.js';

/**
 * Default project configuration for scenarios package
 */
export const scenariosProject: Project = {
  agents: [
    {
      character: {
        ...defaultTestCharacter,
        plugins: [
          '@elizaos/plugin-sql',
          '@elizaos/plugin-tasks',
          '@elizaos/plugin-planning',
          '@elizaos/plugin-knowledge',
        ],
      },
      init: async (runtime) => {
        console.log(`🧪 Test agent ${runtime.character.name} initialized for scenarios testing`);
      },
    },
  ],
};

export default scenariosProject;