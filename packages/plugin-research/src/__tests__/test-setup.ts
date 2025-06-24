import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables for tests
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

// Export a function to verify required API keys
export function verifyApiKeys(): void {
  const requiredKeys = [
    'TAVILY_API_KEY',
    'EXA_API_KEY',
    'SERPER_API_KEY',
    'SERPAPI_API_KEY',
    'OPENAI_API_KEY',
    'FIRECRAWL_API_KEY',
  ];

  const missingKeys = requiredKeys.filter((key) => !process.env[key]);

  if (missingKeys.length > 0) {
    console.warn('⚠️  Missing API keys for E2E tests:', missingKeys.join(', '));
    console.warn('Some tests may fail without proper API keys configured.');
  } else {
    console.log('✅ All required API keys are configured');
  }
}

// Call verification on import
verifyApiKeys();
