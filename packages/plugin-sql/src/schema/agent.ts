import { getSchemaFactory, createLazyTableProxy } from './factory.js';

/**
 * Lazy-loaded agent table definition.
 * This function returns the agent table schema when called,
 * ensuring the database type is set before schema creation.
 */
function createAgentTable() {
  const factory = getSchemaFactory();

  const tableColumns = {
    id: (() => {
      const defaultUuid = factory.defaultRandomUuid();
      const column = factory.uuid('id').primaryKey();
      return defaultUuid ? column.default(defaultUuid) : column;
    })(),
    createdAt: factory.timestamp('created_at').notNull().default(factory.defaultTimestamp()),
    updatedAt: factory.timestamp('updated_at').notNull().default(factory.defaultTimestamp()),
    name: factory.text('name').notNull(),
    username: factory.text('username'),
    bio: factory.text('bio').notNull(),
    system: factory.text('system'),
    topics: factory.json('topics').$type<string[]>().default([]),
    knowledge: factory.json('knowledge').$type<string[]>().default([]),
    messageExamples: factory.json('message_examples').$type<any[]>().default([]),
    postExamples: factory.json('post_examples').$type<string[]>().default([]),
    style: factory
      .json('style')
      .$type<{ all?: string[]; chat?: string[]; post?: string[] }>()
      .default({}),
    styleAll: factory.json('style_all').$type<string[]>().default([]),
    styleChat: factory.json('style_chat').$type<string[]>().default([]),
    stylePost: factory.json('style_post').$type<string[]>().default([]),
    enabled: factory.boolean('enabled').default(true),
    status: factory.text('status').default('active'),
    settings: factory
      .json('settings')
      .$type<{
        secrets?: Record<string, string>;
        intiface?: boolean;
        imageSettings?: {
          steps?: number;
          width?: number;
          height?: number;
          negativePrompt?: string;
          numIterations?: number;
          guidanceScale?: number;
          seed?: number;
          modelId?: string;
          jobId?: string;
          count?: number;
          stylePreset?: string;
          [key: string]: any;
        };
        voice?: {
          model?: string;
          url?: string;
          elevenlabsVoiceId?: string;
        };
        model?: string;
        embeddingModel?: string;
      }>()
      .default({}),
    plugins: factory.json('plugins').$type<string[]>().default([]),
  };

  return factory.table('agents', tableColumns, (table) => ({
    nameIdx: factory.index('agents_name_idx').on(table.name),
  }));
}

/**
 * Represents a table for storing agent data.
 * Uses lazy initialization to ensure proper database type configuration.
 */
export const agentTable = createLazyTableProxy(createAgentTable);
