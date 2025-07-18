// Test setup for NEAR plugin
import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
const testEnvPath = path.join(__dirname, 'test.env');
config({ path: testEnvPath });

// Set default test environment if not specified
process.env.NEAR_NETWORK = process.env.NEAR_NETWORK || 'testnet';
process.env.NODE_ENV = 'test';

// Skip contract verification in tests
process.env.SKIP_CONTRACT_VERIFICATION = 'true';

console.log('NEAR Plugin Test Setup Loaded');
console.log('Network:', process.env.NEAR_NETWORK);
