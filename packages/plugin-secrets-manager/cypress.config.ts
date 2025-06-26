import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    experimentalStudio: true,
    env: {
      // Test configuration
      TEST_USER_ID: 'test-user-123',
      TEST_AGENT_ID: 'test-agent-456',
      TEST_ROOM_ID: 'test-room-789',
      // OAuth provider test configs
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      GITHUB_CLIENT_ID: 'test-github-client-id',
      DISCORD_CLIENT_ID: 'test-discord-client-id',
      // Test secrets
      TEST_API_KEY: 'test-api-key-value',
      TEST_TOKEN: 'test-token-value',
      // Ngrok configuration
      NGROK_AUTH_TOKEN: 'test-ngrok-token',
      NGROK_DOMAIN: 'test-domain.ngrok-free.app'
    }
  },
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts',
  },
});
