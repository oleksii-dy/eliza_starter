import { logger } from '@elizaos/core';
import { helloWorldTable } from '../schema';
import { desc } from 'drizzle-orm';
import { withTable, HELLO_WORLD_TABLE_SQL } from '../table-creator';

// Define minimal types
interface IAgentRuntime {
  agentId: string;
  db?: any;
  [key: string]: any;
}

interface Memory {
  id?: string;
  content: {
    text?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface State {
  values?: Record<string, any>;
  data?: Record<string, any>;
  text?: string;
}

interface Action {
  name: string;
  similes: string[];
  description: string;
  examples: any[][];
  validate: (runtime: IAgentRuntime, message: Memory) => Promise<boolean>;
  handler: (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: any
  ) => Promise<any>;
}

export const listHelloWorldsAction: Action = {
  name: 'LIST_HELLO_WORLDS',
  similes: [
    'list hello world',
    'show hello world',
    'get all hello world',
    'display hello world messages',
    'view hello world entries',
  ],
  description: 'Lists all hello world messages from the database',
  examples: [
    [
      {
        user: '{{user1}}',
        content: {
          text: 'List all hello world messages',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: 'Here are all the hello world messages:',
          actions: ['LIST_HELLO_WORLDS'],
        },
      },
    ],
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Show me the hello world entries',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: 'I\'ll retrieve all hello world entries for you.',
          actions: ['LIST_HELLO_WORLDS'],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    // Check if database is available
    if (!runtime.db) {
      logger.error('LIST_HELLO_WORLDS: No database available');
      return false;
    }

    // Check if message contains request to list hello worlds
    const text = message.content?.text?.toLowerCase() || '';
    const keywords = ['list', 'show', 'get', 'display', 'view', 'all', 'hello world'];
    const hasListKeyword = ['list', 'show', 'get', 'display', 'view'].some(k => text.includes(k));
    const hasHelloWorld = text.includes('hello world');

    return hasListKeyword && hasHelloWorld;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: any
  ) => {
    try {
      const db = runtime.db?.db || runtime.db;
      if (!db) {
        throw new Error('Database not available');
      }

      logger.info('LIST_HELLO_WORLDS: Retrieving all hello world messages');

      // Query all hello world entries with dynamic table creation
      const entries = await withTable(
        db,
        'hello_world',
        HELLO_WORLD_TABLE_SQL,
        async () => db
          .select()
          .from(helloWorldTable)
          .orderBy(desc(helloWorldTable.createdAt))
      );

      logger.info(`LIST_HELLO_WORLDS: Found ${entries.length} entries`);

      // Format the response
      let responseText = '';
      if (entries.length === 0) {
        responseText = '📭 No hello world messages found.';
      } else {
        responseText = `📬 Found ${entries.length} hello world message${entries.length > 1 ? 's' : ''}:\n\n`;
        entries.forEach((entry, index) => {
          const date = new Date(entry.createdAt).toLocaleString();
          responseText += `${index + 1}. "${entry.message}" - by ${entry.author} (${date})\n`;
        });
      }

      // Send response
      if (callback) {
        await callback({
          text: responseText,
          data: {
            entries: entries,
            count: entries.length,
            action: 'LIST_HELLO_WORLDS',
          },
        });
      }

      return {
        success: true,
        data: entries,
        text: responseText,
      };
    } catch (error) {
      logger.error('LIST_HELLO_WORLDS: Error listing entries:', error);
      
      if (callback) {
        await callback({
          text: `❌ Failed to list hello world messages: ${error instanceof Error ? error.message : String(error)}`,
          error: true,
        });
      }

      throw error;
    }
  },
}; 