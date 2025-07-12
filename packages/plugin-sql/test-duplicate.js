const { PGlite } = require('@electric-sql/pglite');
const { drizzle } = require('drizzle-orm/pglite');
const { pgTable, uuid, text, jsonb, timestamp } = require('drizzle-orm/pg-core');
const { v4: uuidv4 } = require('uuid');

// Define the entities table schema
const entityTable = pgTable('entities', {
  id: uuid('id').primaryKey().notNull(),
  agent_id: uuid('agent_id').notNull(),
  names: jsonb('names').notNull().default([]),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at').notNull().$defaultFn(() => new Date()),
  updated_at: timestamp('updated_at').notNull().$defaultFn(() => new Date()),
});

async function testDuplicate() {
  const pgLite = new PGlite(':memory:');
  const db = drizzle(pgLite);

  // Create the table
  await db.execute(`
    CREATE TABLE entities (
      id UUID PRIMARY KEY NOT NULL,
      agent_id UUID NOT NULL,
      names JSONB NOT NULL DEFAULT '[]',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  const testId = uuidv4();
  const agentId = uuidv4();

  const entity = {
    id: testId,
    agent_id: agentId,
    names: ['Test Entity'],
    metadata: {},
    created_at: new Date(),
    updated_at: new Date(),
  };

  console.log('First insertion...');
  try {
    await db.insert(entityTable).values([entity]);
    console.log('✓ First insertion succeeded');
  } catch (error) {
    console.log('✗ First insertion failed:', error.message);
  }

  console.log('Second insertion (duplicate)...');
  try {
    await db.insert(entityTable).values([entity]);
    console.log('✗ Second insertion succeeded (this should not happen\!)');
  } catch (error) {
    console.log('✓ Second insertion failed as expected:', error.message);
  }

  await pgLite.close();
}

testDuplicate().catch(console.error);
