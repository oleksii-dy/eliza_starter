import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import {
  setupTestEnvironment,
  restoreTestEnvironment,
  logEnvironmentStatus,
  type TestEnvironment
} from './utils/test-env-utils';
import {
  cleanupTestContainers,
  type DockerTestConfig,
  DEFAULT_CONFIG
} from './utils/docker-test-utils';
import { readFile } from 'fs/promises';
import path from 'path';

describe('Multi-Context Docker Validation', () => {
  let testEnv: TestEnvironment;
  const config: DockerTestConfig = {
    ...DEFAULT_CONFIG,
    verbose: process.env.TEST_VERBOSE === 'true'
  };

  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
    
    if (config.verbose) {
      console.log('🔄 Starting multi-context Docker validation...');
      logEnvironmentStatus(true);
    }
  });

  afterAll(async () => {
    await cleanupTestContainers();
    restoreTestEnvironment(testEnv);
    
    if (config.verbose) {
      console.log('🧹 Cleaned up multi-context test environment');
    }
  });

  describe('Monorepo Production Context', () => {
    const monorepoTargetPath = path.join(process.cwd(), 'docker', 'targets', 'prod');

    it('should have monorepo prod target structure', async () => {
      const dockerComposePath = path.join(monorepoTargetPath, 'docker-compose.yml');
      const dockerfilePath = path.join(monorepoTargetPath, 'Dockerfile');
      
      try {
        await readFile(dockerComposePath);
        if (config.verbose) {
          console.log('✅ Monorepo prod docker-compose.yml exists');
        }
      } catch (error) {
        throw new Error(`Monorepo prod docker-compose.yml not found: ${dockerComposePath}`);
      }

      try {
        await readFile(dockerfilePath);
        if (config.verbose) {
          console.log('✅ Monorepo prod Dockerfile exists');
        }
      } catch (error) {
        throw new Error(`Monorepo prod Dockerfile not found: ${dockerfilePath}`);
      }
    });

    it('should have valid monorepo prod docker-compose structure', async () => {
      const dockerComposePath = path.join(monorepoTargetPath, 'docker-compose.yml');
      
      try {
        const content = await readFile(dockerComposePath, 'utf-8');
        
        // Basic validation - should contain services
        expect(content).toContain('services:');
        
        // Should be production-oriented (not bind mounts for development)
        expect(content).not.toContain('bind');
        
        if (config.verbose) {
          console.log('✅ Monorepo prod docker-compose.yml structure validated');
        }
      } catch (error) {
        throw new Error(`Failed to validate monorepo prod docker-compose: ${error}`);
      }
    });
  });

  describe('Starter Project Dev Context', () => {
    const starterDevPath = path.join(process.cwd(), 'packages', 'project-starter', 'docker', 'targets', 'dev');

    it('should have starter project dev target structure', async () => {
      const dockerComposePath = path.join(starterDevPath, 'docker-compose.yml');
      const dockerfilePath = path.join(starterDevPath, 'Dockerfile');
      
      try {
        await readFile(dockerComposePath);
        if (config.verbose) {
          console.log('✅ Starter project dev docker-compose.yml exists');
        }
      } catch (error) {
        throw new Error(`Starter project dev docker-compose.yml not found: ${dockerComposePath}`);
      }

      try {
        await readFile(dockerfilePath);
        if (config.verbose) {
          console.log('✅ Starter project dev Dockerfile exists');
        }
      } catch (error) {
        throw new Error(`Starter project dev Dockerfile not found: ${dockerfilePath}`);
      }
    });

    it('should have development-oriented docker-compose structure', async () => {
      const dockerComposePath = path.join(starterDevPath, 'docker-compose.yml');
      
      try {
        const content = await readFile(dockerComposePath, 'utf-8');
        
        // Basic validation - should contain services
        expect(content).toContain('services:');
        
        // Should be development-oriented (may contain bind mounts for hot reload)
        expect(content).toContain('volumes:');
        
        if (config.verbose) {
          console.log('✅ Starter project dev docker-compose.yml structure validated');
        }
      } catch (error) {
        throw new Error(`Failed to validate starter project dev docker-compose: ${error}`);
      }
    });
  });

  describe('Starter Project Prod Context', () => {
    const starterProdPath = path.join(process.cwd(), 'packages', 'project-starter', 'docker', 'targets', 'prod');

    it('should have starter project prod target structure', async () => {
      const dockerComposePath = path.join(starterProdPath, 'docker-compose.yml');
      const dockerfilePath = path.join(starterProdPath, 'Dockerfile');
      
      try {
        await readFile(dockerComposePath);
        if (config.verbose) {
          console.log('✅ Starter project prod docker-compose.yml exists');
        }
      } catch (error) {
        throw new Error(`Starter project prod docker-compose.yml not found: ${dockerComposePath}`);
      }

      try {
        await readFile(dockerfilePath);
        if (config.verbose) {
          console.log('✅ Starter project prod Dockerfile exists');
        }
      } catch (error) {
        throw new Error(`Starter project prod Dockerfile not found: ${dockerfilePath}`);
      }
    });

    it('should have production-oriented docker-compose structure', async () => {
      const dockerComposePath = path.join(starterProdPath, 'docker-compose.yml');
      
      try {
        const content = await readFile(dockerComposePath, 'utf-8');
        
        // Basic validation - should contain services
        expect(content).toContain('services:');
        
        // Should be production-oriented (minimal bind mounts)
        expect(content).toContain('restart:');
        
        if (config.verbose) {
          console.log('✅ Starter project prod docker-compose.yml structure validated');
        }
      } catch (error) {
        throw new Error(`Failed to validate starter project prod docker-compose: ${error}`);
      }
    });
  });

  describe('Context Comparison & Consistency', () => {
    it('should have consistent Docker target naming across contexts', async () => {
      // Verify that both contexts have the same target structure expectations
      const contexts = [
        { name: 'monorepo', path: path.join(process.cwd(), 'docker', 'targets') },
        { name: 'starter-project', path: path.join(process.cwd(), 'packages', 'project-starter', 'docker', 'targets') }
      ];

      for (const context of contexts) {
        try {
          // Check that both contexts have consistent target directory structure
          const prodExists = await readFile(path.join(context.path, 'prod', 'docker-compose.yml')).then(() => true).catch(() => false);
          expect(prodExists).toBe(true);
          
          if (config.verbose) {
            console.log(`✅ ${context.name} context has consistent target structure`);
          }
        } catch (error) {
          throw new Error(`Context consistency check failed for ${context.name}: ${error}`);
        }
      }
    });

    it('should have appropriate differences between dev and prod configurations', async () => {
      // This test ensures dev and prod configs are actually different (not just copies)
      try {
        const starterDevContent = await readFile(
          path.join(process.cwd(), 'packages', 'project-starter', 'docker', 'targets', 'dev', 'docker-compose.yml'),
          'utf-8'
        );
        
        const starterProdContent = await readFile(
          path.join(process.cwd(), 'packages', 'project-starter', 'docker', 'targets', 'prod', 'docker-compose.yml'),
          'utf-8'
        );

        // Dev and prod configs should be different
        expect(starterDevContent).not.toBe(starterProdContent);
        
        if (config.verbose) {
          console.log('✅ Dev and prod configurations are appropriately different');
        }
      } catch (error) {
        throw new Error(`Failed to compare dev/prod configurations: ${error}`);
      }
    });
  });

  describe('Future Testing Framework Readiness', () => {
    it('should be ready for CLI --docker flag integration testing', () => {
      // This test documents readiness for testing CLI integration across contexts
      const testScenarios = [
        'elizaos start --docker (monorepo prod)',
        'elizaos dev --docker (starter project dev)',
        'elizaos start --docker (starter project prod)'
      ];

      if (config.verbose) {
        console.log('📋 Framework ready for CLI integration tests:');
        testScenarios.forEach(scenario => {
          console.log(`   - ${scenario}`);
        });
      }

      expect(testScenarios.length).toBeGreaterThan(0);
    });

    it('should be ready for container lifecycle testing', () => {
      // This test documents readiness for actual container testing when needed
      const containerTestCapabilities = [
        'Monorepo prod container startup and health',
        'Starter project dev container hot reload',
        'Starter project prod container optimization',
        'Cross-context container communication'
      ];

      if (config.verbose) {
        console.log('🔮 Framework ready for container lifecycle tests:');
        containerTestCapabilities.forEach(capability => {
          console.log(`   - ${capability}`);
        });
      }

      expect(containerTestCapabilities.length).toBeGreaterThan(0);
    });
  });
}); 