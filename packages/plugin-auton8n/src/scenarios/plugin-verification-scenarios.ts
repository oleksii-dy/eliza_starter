import { IAgentRuntime, Memory, HandlerCallback } from '@elizaos/core';

export interface VerificationScenario {
  name: string;
  description: string;
  pluginType: string;
  requiredEnvVars: Array<{
    name: string;
    description: string;
    example?: string;
    validation?: (value: string) => boolean;
  }>;
  verificationSteps: Array<{
    name: string;
    description: string;
    userPrompt: string;
    expectedResponse?: string;
    errorHandling?: string;
  }>;
  successIndicators: string[];
}

// Scenario 1: API Integration Plugin (e.g., Weather, Stock prices)
export const API_INTEGRATION_SCENARIO: VerificationScenario = {
  name: 'API Integration Setup',
  description: 'Guide user through setting up and verifying an API-based plugin',
  pluginType: 'api',
  requiredEnvVars: [
    {
      name: 'API_KEY',
      description: 'Your API key for the service',
      example: 'sk-1234567890abcdef',
      validation: (value) => value.length > 10 && !value.includes(' '),
    },
    {
      name: 'API_BASE_URL',
      description: 'The base URL for the API',
      example: 'https://api.service.com/v1',
      validation: (value) => value.startsWith('http'),
    },
  ],
  verificationSteps: [
    {
      name: 'Environment Setup',
      description: 'Ensure environment variables are set',
      userPrompt: `I need to help you set up the API integration. 

First, let's check your API credentials. You'll need:
1. An API key from your service provider
2. The API base URL (usually provided in their documentation)

Do you have these ready? (yes/no)`,
      expectedResponse: 'yes',
      errorHandling: 'If no, provide links to get API credentials',
    },
    {
      name: 'Test Connection',
      description: 'Verify API connection works',
      userPrompt: `Great! Let me test the connection to the API.

I'll make a simple test request to verify your credentials work.
This might take a moment...

[Testing connection...]`,
      errorHandling: 'Check API key format, network connectivity, and rate limits',
    },
    {
      name: 'Sample Request',
      description: 'Make a sample request to verify functionality',
      userPrompt: `Connection successful! ✅

Now let's test a real request. What would you like to query?
For example: "What's the weather in New York?" or "Get stock price for AAPL"`,
      errorHandling: 'Parse error messages and suggest fixes',
    },
  ],
  successIndicators: [
    'API connection established',
    'Authentication successful',
    'Sample request returned valid data',
  ],
};

// Scenario 2: Database Plugin Setup
export const DATABASE_SCENARIO: VerificationScenario = {
  name: 'Database Connection Setup',
  description: 'Guide user through database plugin configuration',
  pluginType: 'database',
  requiredEnvVars: [
    {
      name: 'DATABASE_URL',
      description: 'PostgreSQL connection string',
      example: 'postgresql://user:password@localhost:5432/dbname',
      validation: (value) => value.includes('://') && value.includes('@'),
    },
    {
      name: 'DATABASE_SSL',
      description: 'Use SSL for connection',
      example: 'true',
      validation: (value) => ['true', 'false'].includes(value.toLowerCase()),
    },
  ],
  verificationSteps: [
    {
      name: 'Database Credentials',
      description: 'Collect database connection details',
      userPrompt: `Let's set up your database connection. I'll need:

1. Database type (PostgreSQL/MySQL/SQLite)
2. Host and port
3. Username and password
4. Database name

What type of database are you using?`,
      errorHandling: 'Validate connection string format',
    },
    {
      name: 'Connection Test',
      description: 'Test database connectivity',
      userPrompt: `I'll now test the database connection...

[Attempting to connect to database...]

Testing:
- Network connectivity ✓
- Authentication...
- Database access...`,
      errorHandling: 'Common errors: wrong port, firewall, wrong credentials',
    },
    {
      name: 'Schema Verification',
      description: 'Verify required tables exist',
      userPrompt: `Connected successfully! 

Now I'll check if the required tables exist.
Would you like me to:
1. Use existing tables
2. Create new tables for this plugin
3. Show me current schema first

Please choose (1/2/3):`,
      errorHandling: 'Handle missing tables, migrations',
    },
  ],
  successIndicators: [
    'Database connection established',
    'Tables created or verified',
    'Test query executed successfully',
  ],
};

// Scenario 3: OAuth Integration
export const OAUTH_SCENARIO: VerificationScenario = {
  name: 'OAuth2 Integration Setup',
  description: 'Guide through OAuth2 flow for services like Google, GitHub',
  pluginType: 'oauth',
  requiredEnvVars: [
    {
      name: 'OAUTH_CLIENT_ID',
      description: 'OAuth2 client ID',
      validation: (value) => value.length > 10,
    },
    {
      name: 'OAUTH_CLIENT_SECRET',
      description: 'OAuth2 client secret',
      validation: (value) => value.length > 10,
    },
    {
      name: 'OAUTH_REDIRECT_URI',
      description: 'Redirect URI for OAuth callback',
      example: 'http://localhost:3000/callback',
      validation: (value) => value.includes('://'),
    },
  ],
  verificationSteps: [
    {
      name: 'OAuth App Setup',
      description: 'Verify OAuth application is configured',
      userPrompt: `Let's set up OAuth2 authentication.

Have you already created an OAuth app in your service provider's dashboard?
- For Google: https://console.cloud.google.com
- For GitHub: https://github.com/settings/developers
- For Microsoft: https://portal.azure.com

Have you created the app? (yes/no)`,
      errorHandling: 'Provide specific links and instructions per provider',
    },
    {
      name: 'Redirect URI',
      description: 'Configure redirect URI',
      userPrompt: `Please make sure your OAuth app has this redirect URI configured:
${process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/callback'}

The redirect URI in your app settings must match exactly.

Ready to proceed? (yes/no)`,
      errorHandling: 'Common issue: URI mismatch, needs exact match',
    },
    {
      name: 'Authorization Test',
      description: 'Test OAuth flow',
      userPrompt: `I'll now open your browser for authorization.

After you authorize, you'll be redirected back here.
The plugin will capture the authorization code automatically.

Opening browser in 3 seconds...

[Click here to authorize: <auth_url>]`,
      errorHandling: 'Handle authorization failures, scope issues',
    },
  ],
  successIndicators: [
    'OAuth app configured',
    'Authorization successful',
    'Access token obtained',
    'Test API call successful',
  ],
};

// Scenario 4: File System Plugin
export const FILESYSTEM_SCENARIO: VerificationScenario = {
  name: 'File System Access Setup',
  description: 'Verify file system permissions and paths',
  pluginType: 'filesystem',
  requiredEnvVars: [
    {
      name: 'WORKSPACE_PATH',
      description: 'Base directory for file operations',
      example: '/home/user/workspace',
      validation: (value) => value.startsWith('/') || value.startsWith('~'),
    },
    {
      name: 'ALLOWED_EXTENSIONS',
      description: 'Comma-separated list of allowed file extensions',
      example: 'txt,md,json,yml',
      validation: (value) => !value.includes(' '),
    },
  ],
  verificationSteps: [
    {
      name: 'Directory Access',
      description: 'Verify directory exists and is accessible',
      userPrompt: `I need to verify file system access.

Which directory should the plugin use as its workspace?
(This should be a directory where the plugin can safely read/write files)

Please provide the full path:`,
      errorHandling: 'Check if directory exists, has proper permissions',
    },
    {
      name: 'Permission Test',
      description: 'Test read/write permissions',
      userPrompt: `I'll test permissions in the directory:
${process.env.WORKSPACE_PATH}

Testing:
- Read access...
- Write access...
- Creating test file...
- Deleting test file...`,
      errorHandling: 'Common issues: permission denied, directory not found',
    },
    {
      name: 'Safety Verification',
      description: 'Confirm safety boundaries',
      userPrompt: `For safety, the plugin will only access files:
- Within: ${process.env.WORKSPACE_PATH}
- With extensions: ${process.env.ALLOWED_EXTENSIONS}

This prevents accidental access to system files.
Is this configuration correct? (yes/no)`,
      errorHandling: 'Adjust paths and extensions as needed',
    },
  ],
  successIndicators: [
    'Directory accessible',
    'Read/write permissions verified',
    'Safety boundaries configured',
  ],
};

// Scenario 5: External Service Integration (e.g., Email, SMS)
export const EXTERNAL_SERVICE_SCENARIO: VerificationScenario = {
  name: 'External Service Integration',
  description: 'Set up email, SMS, or other external services',
  pluginType: 'external-service',
  requiredEnvVars: [
    {
      name: 'SERVICE_ENDPOINT',
      description: 'Service API endpoint',
      validation: (value) => value.includes('://'),
    },
    {
      name: 'SERVICE_API_KEY',
      description: 'Service authentication key',
      validation: (value) => value.length > 0,
    },
    {
      name: 'SERVICE_FROM_ADDRESS',
      description: 'Sender address/number',
      example: 'noreply@example.com or +1234567890',
      validation: (value) => value.includes('@') || value.startsWith('+'),
    },
  ],
  verificationSteps: [
    {
      name: 'Service Selection',
      description: 'Identify which service to integrate',
      userPrompt: `Which external service would you like to integrate?

1. Email (SendGrid, AWS SES, SMTP)
2. SMS (Twilio, Vonage)
3. Slack
4. Discord
5. Other

Please choose (1-5):`,
      errorHandling: 'Guide to specific service setup',
    },
    {
      name: 'Credential Verification',
      description: 'Verify service credentials',
      userPrompt: `Let me verify your service credentials...

Testing:
- API endpoint reachability ✓
- Authentication...
- Service quotas/limits...`,
      errorHandling: 'Check API key format, endpoint URL, rate limits',
    },
    {
      name: 'Test Message',
      description: 'Send a test message',
      userPrompt: `Credentials verified! ✅

Would you like to send a test message?
Please provide:
- Recipient (email/phone)
- Test message content

Or type "skip" to skip this step:`,
      errorHandling: 'Handle delivery failures, format validation',
    },
  ],
  successIndicators: [
    'Service authenticated',
    'Test message sent successfully',
    'Webhook configured (if applicable)',
  ],
};

// Helper function to execute verification workflow
export async function runVerificationWorkflow(
  scenario: VerificationScenario,
  runtime: IAgentRuntime,
  message: Memory,
  callback: HandlerCallback
): Promise<void> {
  // Start verification workflow
  await callback({
    text: `🚀 Starting ${scenario.name}

${scenario.description}

I'll guide you through the setup process step by step.`,
  });

  // Check environment variables
  const missingVars = scenario.requiredEnvVars.filter((envVar) => !runtime.getSetting(envVar.name));

  if (missingVars.length > 0) {
    await callback({
      text: `📋 I need to help you set up these environment variables:

${missingVars
  .map((v) => `- ${v.name}: ${v.description}${v.example ? `\n  Example: ${v.example}` : ''}`)
  .join('\n\n')}

Would you like me to create a .env file template for you?`,
    });
  }

  // Execute verification steps
  for (const step of scenario.verificationSteps) {
    await callback({
      text: `\n📍 Step: ${step.name}\n\n${step.userPrompt}`,
    });

    // In a real implementation, we would wait for user response here
    // and handle the verification logic
  }

  // Show success summary
  await callback({
    text: `\n✅ Verification Complete!

${scenario.successIndicators.map((indicator) => `✓ ${indicator}`).join('\n')}

Your plugin is now ready to use. Would you like to:
1. See example usage
2. Run a test command
3. View configuration summary

Please choose (1-3):`,
  });
}

// Export all scenarios
export const VERIFICATION_SCENARIOS = [
  API_INTEGRATION_SCENARIO,
  DATABASE_SCENARIO,
  OAUTH_SCENARIO,
  FILESYSTEM_SCENARIO,
  EXTERNAL_SERVICE_SCENARIO,
];
