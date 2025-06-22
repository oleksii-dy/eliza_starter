import { logger } from '@elizaos/core';
import { createHelloWorldAction } from './actions/create-hello-world';
import { listHelloWorldsAction } from './actions/list-hello-worlds';
import { createGreetingAction } from './actions/create-greeting';
import { helloWorldProvider } from './providers/hello-world-provider';
import { helloWorldSchema } from './schema';

// Define minimal Plugin interface to avoid import issues
interface Plugin {
  name: string;
  description: string;
  schema?: any;
  priority?: number;
  dependencies?: string[];
  actions?: any[];
  providers?: any[];
  init?: (config: any, runtime: any) => Promise<void>;
}

export const helloWorldPlugin: Plugin = {
  name: 'hello-world',
  description: 'A test plugin for dynamic table creation with real actions and providers',
  schema: helloWorldSchema,
  priority: 100,
  dependencies: ['@elizaos/plugin-sql'],
  
  actions: [
    createHelloWorldAction,
    listHelloWorldsAction,
    createGreetingAction,
  ],
  
  providers: [
    helloWorldProvider,
  ],
  
  init: async (config, runtime) => {
    logger.info('🔌 Hello World Plugin: Initializing with real actions and providers');
    
    // Verify database is available
    if (!runtime.db) {
      logger.error('🔌 Hello World Plugin: Database not available on runtime');
      throw new Error('Database adapter required for Hello World plugin');
    }
    
    logger.info('🔌 Hello World Plugin: Successfully initialized');
    logger.info(`🔌 Hello World Plugin: Registered ${helloWorldPlugin.actions?.length} actions`);
    logger.info(`🔌 Hello World Plugin: Registered ${helloWorldPlugin.providers?.length} providers`);
  },
};

export default helloWorldPlugin; 