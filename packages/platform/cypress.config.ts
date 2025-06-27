import { defineConfig } from 'cypress';
import { register } from 'ts-node';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3333',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 15000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    pageLoadTimeout: 30000,
    // Use Chrome instead of Electron to avoid renderer crashes
    browser: 'chrome',
    experimentalMemoryManagement: true,
    numTestsKeptInMemory: 1,
    env: {
      API_BASE_URL: 'http://localhost:3333/api',
      TEST_USER_EMAIL: 'test@elizaos.ai',
      TEST_USER_PASSWORD: 'TestPassword123!',
      TEST_ORG_NAME: 'ElizaOS Test Organization',
      TEST_ORG_SLUG: 'elizaos-test-org',
      STRIPE_TEST_MODE: true,
      WORKOS_TEST_MODE: true,
      NODE_ENV: 'development', // Set to development to enable dev login
      NEXT_PUBLIC_DEV_MODE: 'true', // Explicitly enable dev mode for frontend
      USE_DATA_CY: true, // Use data-cy attributes for selectors
    },
    setupNodeEvents(on, config) {
      // Register ts-node with path mapping
      register({
        compilerOptions: {
          module: 'commonjs',
          target: 'es2020',
          paths: {
            '@/*': ['./lib/*', './app/*', './components/*'],
          },
          baseUrl: '.',
        },
      });

      // Simplified tasks without complex database operations
      on('task', {
        // Simple tasks that don't require database
        'session:create': (userId: string) => {
          return {
            token: `test_token_${userId}`,
            sessionId: `test_session_${userId}`,
          };
        },
        'stripe:createTestCustomer': (email: string) => {
          return {
            id: `cus_test_${Date.now()}`,
            email,
          };
        },
        clearDatabase: () => {
          console.log('Database clearing would happen here');
          return null;
        },
        getVerificationToken: (email: string) => {
          const token = Buffer.from(email + ':' + Date.now()).toString(
            'base64',
          );
          return token;
        },
        setupTestApiKey: ({ email }: { email: string }) => {
          // Mock API key for testing
          return `eliza_test_${Date.now()}_${Buffer.from(email).toString('base64').substring(0, 8)}`;
        },
        drainCredits: (args: { email: string }) => {
          console.log(`Would drain credits for ${args.email}`);
          return null;
        },
        addTestCredits: (args: { email: string; amount: number }) => {
          console.log(`Would add ${args.amount} credits for ${args.email}`);
          return null;
        },
        makeApiRequest: async ({
          endpoint,
          method = 'GET',
          apiKey,
          body,
        }: {
          endpoint: string;
          method?: string;
          apiKey: string;
          body?: any;
        }) => {
          const response = await fetch(
            `http://localhost:3333/api/v1${endpoint}`,
            {
              method,
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: body ? JSON.stringify(body) : undefined,
            },
          );

          return {
            status: response.status,
            data: await response.json(),
          };
        },
        setupTestEnvironment: () => {
          return {
            stripeMode: 'test',
            hasOpenAI: !!process.env.OPENAI_API_KEY,
            hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
            hasR2: !!(
              process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
            ),
          };
        },
      });

      return config;
    },
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
  },
});
