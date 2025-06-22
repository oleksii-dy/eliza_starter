import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
console.log(`Loading environment from: ${envPath}`);

config({ path: envPath });

// Verify ANTHROPIC_API_KEY is loaded
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️  ANTHROPIC_API_KEY not found in environment');
  console.warn('   Please ensure your .env file contains ANTHROPIC_API_KEY');
} else {
  console.log('✅ ANTHROPIC_API_KEY loaded successfully');
}

// Export for use in tests if needed
export const testEnv = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
};
