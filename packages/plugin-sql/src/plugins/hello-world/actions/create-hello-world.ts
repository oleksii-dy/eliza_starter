import { logger } from '@elizaos/core';
import { helloWorldTable } from '../schema';
import { withTable, HELLO_WORLD_TABLE_SQL } from '../table-creator';

// Define minimal types to avoid import issues
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

export const createHelloWorldAction: Action = {
  name: 'CREATE_HELLO_WORLD',
  similes: [
    'create hello world',
    'make hello world',
    'add hello world message',
    'create a hello world entry',
    'save hello world',
  ],
  description: 'Creates a new hello world message in the database',
  examples: [
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Create a hello world message saying "Hello from ElizaOS!"',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: 'I\'ll create that hello world message for you.',
          actions: ['CREATE_HELLO_WORLD'],
        },
      },
    ],
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Add a hello world entry with the message "Testing dynamic tables"',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: 'Creating a new hello world entry with your message.',
          actions: ['CREATE_HELLO_WORLD'],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    // Check if database is available
    if (!runtime.db) {
      logger.error('CREATE_HELLO_WORLD: No database available');
      return false;
    }

    // Check if message contains request to create hello world
    const text = message.content?.text?.toLowerCase() || '';
    const keywords = ['create', 'make', 'add', 'save', 'hello world'];
    const hasKeywords = keywords.some(keyword => text.includes(keyword));

    return hasKeywords;
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

      // Extract message from user input
      const userText = message.content?.text || '';
      let extractedMessage = 'Hello World!';
      let author = 'User';

      // Try to extract custom message
      const messageMatch = userText.match(/saying ["'](.+?)["']|message ["'](.+?)["']|"(.+?)"/);
      if (messageMatch) {
        extractedMessage = messageMatch[1] || messageMatch[2] || messageMatch[3];
      }

      // Try to extract author
      const authorMatch = userText.match(/from ["'](.+?)["']|by ["'](.+?)["']|author ["'](.+?)["']/);
      if (authorMatch) {
        author = authorMatch[1] || authorMatch[2] || authorMatch[3];
      }

      logger.info(`CREATE_HELLO_WORLD: Creating entry - Message: "${extractedMessage}", Author: "${author}"`);

      // Insert into database with dynamic table creation
      const [created] = await withTable(
        db,
        'hello_world',
        HELLO_WORLD_TABLE_SQL,
        async () => db.insert(helloWorldTable).values({
          message: extractedMessage,
          author: author,
          agentId: runtime.agentId,
        }).returning()
      );

      logger.info('CREATE_HELLO_WORLD: Successfully created entry:', created);

      // Send response
      if (callback) {
        await callback({
          text: `✅ Created hello world message: "${created.message}" by ${created.author}`,
          data: {
            created: created,
            action: 'CREATE_HELLO_WORLD',
          },
        });
      }

      return {
        success: true,
        data: created,
        text: `Created hello world entry with ID: ${created.id}`,
      };
    } catch (error) {
      logger.error('CREATE_HELLO_WORLD: Error creating entry:', error);
      
      if (callback) {
        await callback({
          text: `❌ Failed to create hello world message: ${error instanceof Error ? error.message : String(error)}`,
          error: true,
        });
      }

      throw error;
    }
  },
}; 