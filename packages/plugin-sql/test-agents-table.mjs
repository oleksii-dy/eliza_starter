import { PGlite } from '@electric-sql/pglite';

async function test() {
  const db = new PGlite(':memory:');
  
  try {
    // Test the exact agents table SQL that's failing
    const agentsSQL = `CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      name TEXT NOT NULL,
      username TEXT,
      bio TEXT NOT NULL,
      system TEXT,
      topics TEXT DEFAULT '[]',
      knowledge TEXT DEFAULT '[]',
      message_examples TEXT DEFAULT '[]',
      post_examples TEXT DEFAULT '[]',
      style TEXT DEFAULT '{}',
      style_all TEXT DEFAULT '[]',
      style_chat TEXT DEFAULT '[]',
      style_post TEXT DEFAULT '[]',
      enabled BOOLEAN DEFAULT true,
      status TEXT DEFAULT 'active',
      settings TEXT DEFAULT '{}',
      plugins TEXT DEFAULT '[]'
    )`;
    
    await db.query(agentsSQL);
    console.log('✓ Agents table created successfully with PGLite directly');
    
    // Try with exec instead of query
    await db.exec(agentsSQL);
    console.log('✓ Agents table works with exec too');
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error('Full error:', error);
  }
}

test();
