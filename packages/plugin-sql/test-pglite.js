const { PGlite } = require('@electric-sql/pglite');

async function test() {
  const db = new PGlite(':memory:');
  
  try {
    // Test 1: Simple table
    await db.query('CREATE TABLE test1 (id TEXT PRIMARY KEY, name TEXT)');
    console.log('✓ Simple table works');
    
    // Test 2: Table with defaults
    await db.query('CREATE TABLE test2 (id TEXT PRIMARY KEY, name TEXT DEFAULT \'test\')');
    console.log('✓ Table with DEFAULT works');
    
    // Test 3: Table with JSONB
    await db.query('CREATE TABLE test3 (id TEXT PRIMARY KEY, data JSONB)');
    console.log('✓ Table with JSONB works');
    
    // Test 4: Multi-line SQL
    const multilineSQL = `CREATE TABLE test4 (
      id TEXT PRIMARY KEY,
      name TEXT DEFAULT 'test'
    )`;
    await db.query(multilineSQL);
    console.log('✓ Multi-line SQL works');
    
    // Test 5: Complex defaults like the agents table
    await db.query("CREATE TABLE test5 (id TEXT PRIMARY KEY, settings TEXT DEFAULT '{}')");
    console.log('✓ Complex defaults work');
    
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

test();
