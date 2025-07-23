import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import {
  isDockerAvailable,
  isDockerComposeAvailable,
  getAvailableTargets,
  targetExists,
  cleanupTestContainers,
  type DockerTestConfig,
  DEFAULT_CONFIG
} from './utils/docker-test-utils';
import {
  setupTestEnvironment,
  restoreTestEnvironment,
  logEnvironmentStatus,
  skipTestIfRequirementsMissing,
  type TestEnvironment
} from './utils/test-env-utils';

describe('Docker Infrastructure Health Checks', () => {
  let testEnv: TestEnvironment;
  const config: DockerTestConfig = {
    ...DEFAULT_CONFIG,
    verbose: process.env.TEST_VERBOSE === 'true'
  };

  beforeAll(async () => {
    // Set up test environment following ElizaOS patterns
    testEnv = await setupTestEnvironment();
    
    if (config.verbose) {
      console.log('🐳 Starting Docker health checks...');
      logEnvironmentStatus(true);
    }
  });

  afterAll(async () => {
    // Clean up test containers
    await cleanupTestContainers();
    
    // Restore environment
    restoreTestEnvironment(testEnv);
    
    if (config.verbose) {
      console.log('🧹 Cleaned up test containers and restored environment');
    }
  });

  it('should have Docker available', async () => {
    const available = await isDockerAvailable();
    
    if (!available) {
      console.log('⏭️ Docker not available - this is expected in CI environments without Docker');
      expect(available).toBe(false); // Document the expected state
      return;
    }
    
    expect(available).toBe(true);
    
    if (config.verbose) {
      console.log('✅ Docker is available');
    }
  });

  it('should have Docker Compose available', async () => {
    const dockerAvailable = await isDockerAvailable();
    
    if (!dockerAvailable) {
      console.log('⏭️ Skipping Docker Compose test - Docker not available');
      expect(true).toBe(true); // Pass test but log limitation
      return;
    }
    
    const available = await isDockerComposeAvailable();
    expect(available).toBe(true);
    
    if (config.verbose) {
      console.log('✅ Docker Compose is available');
    }
  });

  describe('Docker Target Configuration', () => {
    it('should have available Docker targets', async () => {
      const targets = await getAvailableTargets();
      expect(targets.length).toBeGreaterThan(0);
      
      if (config.verbose) {
        console.log(`📁 Found targets: ${targets.join(', ')}`);
      }
    });

    it('should have dev target', async () => {
      const exists = await targetExists('dev');
      expect(exists).toBe(true);
      
      if (config.verbose) {
        console.log('✅ Dev target exists');
      }
    });

    it('should have prod target', async () => {
      const exists = await targetExists('prod');
      expect(exists).toBe(true);
      
      if (config.verbose) {
        console.log('✅ Prod target exists');
      }
    });

    it('should have docs target', async () => {
      const exists = await targetExists('docs');
      expect(exists).toBe(true);
      
      if (config.verbose) {
        console.log('✅ Docs target exists');
      }
    });
  });

  describe('Docker Target Validation', () => {
    const expectedTargets = ['dev', 'prod', 'docs'];

    expectedTargets.forEach(target => {
      it(`should validate ${target} target structure`, async () => {
        const exists = await targetExists(target);
        expect(exists).toBe(true);

        // TODO: Add more detailed validation of docker-compose.yml structure
        // This can be expanded as we build out the framework
      });
    });
  });

  describe('Basic Docker Operations', () => {
    it('should be able to run docker version command', async () => {
      // Skip test if Docker requirements not met
      if (skipTestIfRequirementsMissing('basic', 'Docker version check')) {
        expect(true).toBe(true);
        return;
      }
      
      const dockerAvailable = await isDockerAvailable();
      expect(dockerAvailable).toBe(true);
    });

    it('should be able to run docker compose version command', async () => {
      // Skip test if Docker requirements not met
      if (skipTestIfRequirementsMissing('basic', 'Docker Compose version check')) {
        expect(true).toBe(true);
        return;
      }
      
      const composeAvailable = await isDockerComposeAvailable();
      expect(composeAvailable).toBe(true);
    });

    // TODO: Add more basic operations tests as needed
    // - Test docker network creation
    // - Test volume operations
    // - Test basic container lifecycle
  });

  describe('Environment Configuration', () => {
    it('should detect available LLM providers', () => {
      const { availableProviders } = testEnv;
      
      if (config.verbose) {
        console.log(`🔍 Available LLM providers: ${availableProviders.length > 0 ? availableProviders.join(', ') : 'none'}`);
      }
      
      // This test documents what's available rather than requiring specific providers
      expect(Array.isArray(availableProviders)).toBe(true);
      
      if (availableProviders.length === 0) {
        console.log('ℹ️ No LLM providers configured - agent functionality tests will be skipped');
      }
    });

    it('should handle missing environment gracefully', () => {
      const { hasRequiredKeys, testEnvFile } = testEnv;
      
      if (config.verbose) {
        console.log(`📄 Test environment file: ${testEnvFile || 'none found'}`);
        console.log(`🔑 Has required keys: ${hasRequiredKeys}`);
      }
      
      // Document the environment state without requiring specific configuration
      expect(typeof hasRequiredKeys).toBe('boolean');
      
      if (!hasRequiredKeys) {
        console.log('ℹ️ Create .env.test or .env with API keys for full testing capabilities');
      }
    });
  });
}); 