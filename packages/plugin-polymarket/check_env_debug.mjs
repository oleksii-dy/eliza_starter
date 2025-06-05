console.log('=== Environment Variables Check ===');

const requiredVars = [
  'CLOB_API_URL',
  'CLOB_API_KEY', 
  'CLOB_API_SECRET',
  'CLOB_API_PASSPHRASE',
  'POLYMARKET_PRIVATE_KEY',
  'WALLET_PRIVATE_KEY',
  'PRIVATE_KEY'
];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
  }
});

console.log('\n=== Testing Action Import ===');
try {
  const { cancelMarketOrdersAction } = await import('./dist/index.js');
  console.log('✅ Action imported successfully');
  console.log('Action name:', cancelMarketOrdersAction.name);
  console.log('Action similes:', cancelMarketOrdersAction.similes.slice(0, 3));
} catch (error) {
  console.log('❌ Failed to import action:', error.message);
} 