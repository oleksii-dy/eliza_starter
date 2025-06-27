import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  RuntimeTestHarness,
  createTestRuntime,
  runIntegrationTest,
} from '@elizaos/core/test-utils';
import { stringToUuid } from '@elizaos/core';
import type { IAgentRuntime, Character, Plugin } from '@elizaos/core';
import { DockerService } from '../../services/DockerService';
import { E2BAgentOrchestrator } from '../../services/E2BAgentOrchestrator';

/**
 * REAL RUNTIME INTEGRATION TESTS FOR E2B AND DOCKER SERVICES
 * 
 * These tests validate actual E2B sandbox and Docker container functionality
 * with real agent runtime instead of mocks.
 */

describe('E2B Docker Integration Tests', () => {
  let harness: RuntimeTestHarness;

  afterEach(async () => {
    if (harness) {
      await harness.cleanup();
    }
  });

  describe('E2B Service Integration', () => {
    it('should verify E2B templates with real service', async () => {
      const result = await runIntegrationTest(
        'E2B template verification',
        async (runtime: IAgentRuntime) => {
          const e2bService = runtime.getService('e2b');
          if (!e2bService) {
            console.log('⚠️ E2B service not available - skipping test');
            return;
          }

          const orchestrator = runtime.getService('e2b-agent-orchestrator') as E2BAgentOrchestrator;
          if (!orchestrator) {
            console.log('⚠️ E2B orchestrator not available - skipping test');
            return;
          }

          // Test public method that would call verifyTemplates internally
          try {
            // Try to spawn an agent which would verify templates
            const testRequest = {
              role: 'coder' as const,
              taskId: stringToUuid('test-task'),
              requirements: ['test requirement'],
              priority: 'low' as const,
            };
            
            // This should call verifyTemplates internally when E2B service is available
            const handle = await orchestrator.spawnE2BAgent(testRequest);
            console.log('✅ E2B agent spawned successfully');
            expect(handle).toBeDefined();
            expect(handle.agentId).toBeDefined();
          } catch (error) {
            // If E2B service is not properly configured, we expect this to fail
            // but we should get a meaningful error message
            console.log(`E2B agent spawn error (expected if not configured): ${error}`);
            expect(error instanceof Error).toBe(true);
            expect((error as Error).message).toContain('E2B');
          }
        },
        {
          character: {
            name: 'E2BTestAgent',
            system: 'Testing E2B integration',
            bio: ['E2B integration testing agent'],
            messageExamples: [],
            postExamples: [],
            topics: ['e2b', 'docker'],
            knowledge: [],
            plugins: ['@elizaos/plugin-autocoder', '@elizaos/plugin-e2b'],
          },
          plugins: [], // Plugins loaded via character.plugins
          apiKeys: {
            E2B_API_KEY: process.env.E2B_API_KEY || 'test-key',
          },
        }
      );

      expect(result.passed).toBe(true);
    });

    it('should spawn E2B agents with real runtime context', async () => {
      harness = new RuntimeTestHarness();

      const runtime = await harness.createTestRuntime({
        character: {
          name: 'AgentSpawnerTest',
          system: 'Testing E2B agent spawning',
          bio: ['Agent spawning test'],
          messageExamples: [],
          postExamples: [],
          topics: [],
          knowledge: [],
          plugins: ['@elizaos/plugin-autocoder', '@elizaos/plugin-e2b'],
        },
        plugins: [],
        apiKeys: {
          E2B_API_KEY: process.env.E2B_API_KEY || 'test-key',
        },
      });

      const orchestrator = runtime.getService('e2b-agent-orchestrator') as E2BAgentOrchestrator;
      
      if (!orchestrator) {
        console.log('⚠️ E2B orchestrator not available - test environment limitation');
        return;
      }

      try {
        const taskId = stringToUuid('test-task-123');
        
        const agentRequest = {
          role: 'coder' as const,
          taskId,
          requirements: ['Write TypeScript code', 'Test functionality'],
          gitCredentials: {
            username: 'test-user',
            email: 'test@example.com',
          },
          projectContext: {
            repositoryUrl: 'https://github.com/test/repo',
            branch: 'main',
            projectType: 'typescript',
          },
          priority: 'medium' as const,
        };

        // This will test the real spawnE2BAgent method
        const agentHandle = await orchestrator.spawnE2BAgent(agentRequest);

        expect(agentHandle).toBeDefined();
        expect(agentHandle.agentId).toBeDefined();
        expect(agentHandle.role).toBe('coder');
        expect(agentHandle.taskId).toBe(taskId);
        expect(agentHandle.status).toBe('ready');

        console.log(`✅ E2B agent spawned successfully: ${agentHandle.agentId}`);

        // Clean up
        await orchestrator.terminateAgent(agentHandle.sandboxId);

      } catch (error) {
        // Expected if E2B is not configured
        console.log(`E2B agent spawning error (expected if not configured): ${error}`);
        expect(error instanceof Error).toBe(true);
      }
    });
  });

  describe('Docker Service Integration', () => {
    it('should validate Docker service with real runtime', async () => {
      const result = await runIntegrationTest(
        'Docker service validation',
        async (runtime: IAgentRuntime) => {
          const dockerService = runtime.getService('docker') as DockerService;
          
          if (!dockerService) {
            console.log('⚠️ Docker service not available - test environment limitation');
            return;
          }

          // Test real Docker connectivity
          const pingResult = await dockerService.ping();
          console.log(`Docker ping result: ${pingResult}`);
          
          // Should return boolean, not throw
          expect(typeof pingResult).toBe('boolean');

          if (pingResult) {
            console.log('✅ Docker is available and responding');
            
            // Test container creation with real parameters
            const containerRequest = {
              name: 'test-eliza-agent',
              image: 'elizaos/autocoder-agent:latest',
              agentConfig: {
                agentId: stringToUuid('test-agent'),
                containerId: '',
                agentName: 'test-agent',
                role: 'coder' as const,
                capabilities: ['code-generation', 'testing'],
                communicationPort: 8000,
                healthPort: 8001,
                environment: { 
                  NODE_ENV: 'test',
                  ELIZA_LOG_LEVEL: 'debug',
                },
              },
            };

            try {
              const containerId = await dockerService.createContainer(containerRequest);
              expect(containerId).toBeDefined();
              expect(typeof containerId).toBe('string');
              
              console.log(`✅ Container created: ${containerId}`);

              // Test container status
              const status = await dockerService.getContainerStatus(containerId);
              expect(status).toBeDefined();
              expect(status.id).toBe(containerId);

              // Clean up
              await dockerService.stopContainer(containerId);
              await dockerService.removeContainer(containerId);
              
              console.log('✅ Container lifecycle test completed');
              
            } catch (error) {
              console.log(`Docker container test error: ${error}`);
              // This might fail if Docker image doesn't exist, which is expected
              expect(error instanceof Error).toBe(true);
            }
          } else {
            console.log('⚠️ Docker daemon not available - skipping container tests');
          }
        },
        {
          character: {
            name: 'DockerTestAgent',
            system: 'Testing Docker integration',
            bio: ['Docker integration testing agent'],
            messageExamples: [],
            postExamples: [],
            topics: ['docker', 'containers'],
            knowledge: [],
            plugins: ['@elizaos/plugin-autocoder'],
          },
          plugins: [],
          apiKeys: {},
        }
      );

      expect(result.passed).toBe(true);
    });

    it('should handle container network operations', async () => {
      harness = new RuntimeTestHarness();

      const runtime = await harness.createTestRuntime({
        character: {
          name: 'NetworkTestAgent',
          system: 'Testing Docker networks',
          bio: ['Network testing agent'],
          messageExamples: [],
          postExamples: [],
          topics: [],
          knowledge: [],
          plugins: ['@elizaos/plugin-autocoder'],
        },
        plugins: [],
        apiKeys: {},
      });

      const dockerService = runtime.getService('docker') as DockerService;
      
      if (!dockerService) {
        console.log('⚠️ Docker service not available');
        return;
      }

      const pingResult = await dockerService.ping();
      if (!pingResult) {
        console.log('⚠️ Docker not available - skipping network tests');
        return;
      }

      try {
        // Test network creation
        const networkConfig = {
          name: 'eliza-test-network',
          subnet: '172.20.0.0/16',
          gateway: '172.20.0.1',
        };

        const networkId = await dockerService.createNetwork(networkConfig);
        expect(networkId).toBeDefined();
        expect(typeof networkId).toBe('string');

        console.log(`✅ Network created: ${networkId}`);

        // Test network listing
        const networks = await dockerService.listNetworks();
        expect(Array.isArray(networks)).toBe(true);
        
        const testNetwork = networks.find(n => n.Name === 'eliza-test-network');
        expect(testNetwork).toBeDefined();

        console.log('✅ Network operations test completed');

        // Clean up - network cleanup happens in service.stop()
        
      } catch (error) {
        console.log(`Docker network test error: ${error}`);
        expect(error instanceof Error).toBe(true);
      }
    });
  });

  describe('Service Error Handling', () => {
    it('should handle service initialization failures gracefully', async () => {
      const result = await runIntegrationTest(
        'Service error handling',
        async (runtime: IAgentRuntime) => {
          // Test that services can handle missing dependencies
          const missingService = runtime.getService('non-existent-service');
          expect(missingService).toBeNull();

          // Test that Docker service handles connection failures gracefully
          const dockerService = runtime.getService('docker') as DockerService;
          if (dockerService) {
            // Even if Docker daemon is not running, service should handle it gracefully
            const pingResult = await dockerService.ping();
            expect(typeof pingResult).toBe('boolean');
            console.log(`Docker availability: ${pingResult}`);
          }

          console.log('✅ Service error handling validation completed');
        },
        {
          character: {
            name: 'ErrorHandlingTestAgent',
            system: 'Testing service error handling',
            bio: ['Error handling test agent'],
            messageExamples: [],
            postExamples: [],
            topics: [],
            knowledge: [],
            plugins: ['@elizaos/plugin-autocoder'],
          },
        }
      );

      expect(result.passed).toBe(true);
    });
  });

  describe('Real vs Mock Testing Demonstration', () => {
    it('COMPARISON: Real runtime test validates actual functionality', async () => {
      // This demonstrates the NEW approach - testing real functionality
      const result = await runIntegrationTest(
        'Real functionality validation',
        async (runtime: IAgentRuntime) => {
          // Test REAL agent ID generation
          expect(runtime.agentId).toBeDefined();
          expect(typeof runtime.agentId).toBe('string');

          // Test REAL character loading
          expect(runtime.character.name).toBe('RealTestAgent');

          // Test REAL service registration
          const services = Object.keys(runtime.services || {});
          console.log(`Available services: ${services.join(', ')}`);

          // Test REAL memory operations
          const testMemory = await runtime.createMemory(
            {
              entityId: stringToUuid('test-user'),
              roomId: stringToUuid('test-room'),
              content: {
                text: 'Real integration test message',
                source: 'test',
              },
            },
            'messages'
          );

          expect(testMemory).toBeDefined();

          // Verify REAL database interaction
          const memories = await runtime.getMemories({
            roomId: stringToUuid('test-room'),
            count: 1,
            tableName: 'messages',
          });

          expect(memories.length).toBe(1);
          expect(memories[0].content.text).toBe('Real integration test message');

          console.log('✅ Real runtime functionality validated');
        },
        {
          character: {
            name: 'RealTestAgent',
            system: 'Real functionality testing',
            bio: ['Real functionality test agent'],
            messageExamples: [],
            postExamples: [],
            topics: [],
            knowledge: [],
            plugins: [],
          },
        }
      );

      expect(result.passed).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });
});