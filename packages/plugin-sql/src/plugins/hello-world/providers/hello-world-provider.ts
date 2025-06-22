import { logger } from '@elizaos/core';
import { helloWorldTable, greetingsTable } from '../schema';
import { desc, eq, sql } from 'drizzle-orm';
import { withTable, HELLO_WORLD_TABLE_SQL, GREETINGS_TABLE_SQL } from '../table-creator';

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

interface Provider {
  name: string;
  description: string;
  get: (runtime: IAgentRuntime, message: Memory, state?: State) => Promise<{
    values?: Record<string, any>;
    data?: Record<string, any>;
    text?: string;
  }>;
}

export const helloWorldProvider: Provider = {
  name: 'helloWorldContext',
  description: 'Provides context about hello world messages and greetings',

  get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    try {
      const db = runtime.db?.db || runtime.db;
      if (!db) {
        logger.warn('helloWorldProvider: Database not available');
        return {
          text: 'Hello world database not available.',
          values: { available: false },
        };
      }

      // Get recent hello world messages with dynamic table creation
      const recentMessages = await withTable(
        db,
        'hello_world',
        HELLO_WORLD_TABLE_SQL,
        async () => db
          .select()
          .from(helloWorldTable)
          .orderBy(desc(helloWorldTable.createdAt))
          .limit(5)
      );

      // Get greeting statistics with dynamic table creation
      const greetingStats = await withTable(
        db,
        'greetings',
        GREETINGS_TABLE_SQL,
        async () => db
          .select({
            language: greetingsTable.language,
            count: sql<number>`count(*)::int`,
          })
          .from(greetingsTable)
          .groupBy(greetingsTable.language)
      );

      // Format context
      let contextText = '';
      
      if (recentMessages.length > 0) {
        contextText += `Recent hello world messages:\n`;
        recentMessages.forEach((msg, i) => {
          contextText += `${i + 1}. "${msg.message}" by ${msg.author}\n`;
        });
      }

      if (greetingStats.length > 0) {
        contextText += `\nGreeting languages: `;
        contextText += greetingStats.map(s => `${s.language} (${s.count})`).join(', ');
      }

      if (!contextText) {
        contextText = 'No hello world data available yet.';
      }

      logger.debug('helloWorldProvider: Providing context', {
        messageCount: recentMessages.length,
        languageCount: greetingStats.length,
      });

      return {
        text: contextText.trim(),
        values: {
          helloWorldCount: recentMessages.length,
          greetingLanguages: greetingStats.length,
        },
        data: {
          recentMessages,
          greetingStats,
        },
      };
    } catch (error) {
      logger.error('helloWorldProvider: Error getting context:', error);
      return {
        text: 'Unable to retrieve hello world context.',
        values: { error: true },
      };
    }
  },
}; 