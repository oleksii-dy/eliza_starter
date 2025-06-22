import { logger } from '@elizaos/core';
import { greetingsTable } from '../schema';
import { withTable, GREETINGS_TABLE_SQL } from '../table-creator';

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

export const createGreetingAction: Action = {
  name: 'CREATE_GREETING',
  similes: [
    'create greeting',
    'add greeting',
    'save greeting',
    'make greeting',
    'create a greeting in',
  ],
  description: 'Creates a new greeting in a specific language',
  examples: [
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Create a greeting in Spanish saying "Hola Mundo"',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: 'I\'ll create that Spanish greeting for you.',
          actions: ['CREATE_GREETING'],
        },
      },
    ],
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Add a greeting "Bonjour" in French',
        },
      },
      {
        user: '{{agent}}',
        content: {
          text: 'Creating a French greeting with "Bonjour".',
          actions: ['CREATE_GREETING'],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    // Check if database is available
    if (!runtime.db) {
      logger.error('CREATE_GREETING: No database available');
      return false;
    }

    // Check if message contains request to create greeting
    const text = message.content?.text?.toLowerCase() || '';
    const keywords = ['create', 'add', 'save', 'make', 'greeting'];
    const hasKeywords = keywords.some(keyword => text.includes(keyword));

    return hasKeywords && text.includes('greeting');
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

      // Extract greeting and language from user input
      const userText = message.content?.text || '';
      let greeting = 'Hello';
      let language = 'en';

      // Try to extract greeting text
      const greetingMatch = userText.match(/["'](.+?)["']|saying (.+?)(?:\s+in\s+|\s*$)/);
      if (greetingMatch) {
        greeting = greetingMatch[1] || greetingMatch[2];
      }

      // Try to extract language
      const languagePatterns = {
        'spanish': 'es',
        'español': 'es',
        'french': 'fr',
        'français': 'fr',
        'english': 'en',
        'japanese': 'ja',
        'german': 'de',
        'deutsch': 'de',
        'italian': 'it',
        'italiano': 'it',
        'portuguese': 'pt',
        'português': 'pt',
        'chinese': 'zh',
        '中文': 'zh',
        'korean': 'ko',
        '한국어': 'ko',
      };

      for (const [pattern, code] of Object.entries(languagePatterns)) {
        if (userText.toLowerCase().includes(pattern)) {
          language = code;
          break;
        }
      }

      // Also check for language codes
      const langCodeMatch = userText.match(/\b(en|es|fr|de|it|pt|ja|zh|ko)\b/i);
      if (langCodeMatch) {
        language = langCodeMatch[1].toLowerCase();
      }

      logger.info(`CREATE_GREETING: Creating greeting - Text: "${greeting}", Language: "${language}"`);

      // Insert into database with dynamic table creation
      const [created] = await withTable(
        db,
        'greetings',
        GREETINGS_TABLE_SQL,
        async () => db.insert(greetingsTable).values({
          greeting: greeting,
          language: language,
          agentId: runtime.agentId,
        }).returning()
      );

      logger.info('CREATE_GREETING: Successfully created greeting:', created);

      // Get language name for response
      const languageNames: Record<string, string> = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ja': 'Japanese',
        'zh': 'Chinese',
        'ko': 'Korean',
      };
      const languageName = languageNames[language] || language.toUpperCase();

      // Send response
      if (callback) {
        await callback({
          text: `✅ Created ${languageName} greeting: "${created.greeting}"`,
          data: {
            created: created,
            action: 'CREATE_GREETING',
          },
        });
      }

      return {
        success: true,
        data: created,
        text: `Created greeting with ID: ${created.id}`,
      };
    } catch (error) {
      logger.error('CREATE_GREETING: Error creating greeting:', error);
      
      if (callback) {
        await callback({
          text: `❌ Failed to create greeting: ${error instanceof Error ? error.message : String(error)}`,
          error: true,
        });
      }

      throw error;
    }
  },
}; 