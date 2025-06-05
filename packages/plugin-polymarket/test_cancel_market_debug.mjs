import { cancelMarketOrdersAction } from './dist/index.js';

// Mock runtime with required settings
const mockRuntime = {
  getSetting: (key) => {
    const settings = {
      'CLOB_API_URL': 'https://clob.polymarket.com',
      'CLOB_API_KEY': 'test-key',
      'CLOB_API_SECRET': 'test-secret', 
      'CLOB_API_PASSPHRASE': 'test-passphrase',
      'POLYMARKET_PRIVATE_KEY': 'test-private-key'
    };
    console.log(`Getting setting: ${key} = ${settings[key]}`);
    return settings[key];
  }
};

// Mock message
const mockMessage = {
  content: {
    text: 'Cancel all orders for market 0xbd31dc8a20211944f6b70f31557f1001557b59905b7738480ca09bd4532f84af'
  }
};

console.log('Testing cancelMarketOrdersAction validation...');

try {
  // Test validation
  const isValid = await cancelMarketOrdersAction.validate(mockRuntime, mockMessage);
  console.log('Validation result:', isValid);
  
  if (isValid) {
    console.log('✅ Validation passed - action should be called');
  } else {
    console.log('❌ Validation failed - action will not be called');
  }
  
  // Test different message types
  console.log('\n--- Testing different message variations ---');
  
  const testMessages = [
    'Cancel all orders for market 0xbd31dc8a20211944f6b70f31557f1001557b59905b7738480ca09bd4532f84af',
    'cancel orders in market xyz123',
    'stop market orders',
    'remove all orders from market abc',
    'get market details', // Should fail
    'cancel order by id 123', // Should fail
  ];
  
  for (const text of testMessages) {
    const testMsg = { content: { text } };
    const valid = await cancelMarketOrdersAction.validate(mockRuntime, testMsg);
    console.log(`"${text}" -> ${valid ? '✅ Valid' : '❌ Invalid'}`);
  }
  
} catch (error) {
  console.error('Error testing action:', error);
} 