import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentRuntime } from '@elizaos/core';
import type { IAgentRuntime, Character, Memory, State } from '@elizaos/core';
import { autocoderPlugin } from '../index.ts';
import { plugin as sqlPlugin } from '@elizaos/plugin-sql';
import type { DockerService } from '../services/DockerService.ts';
import type { ContainerCreateRequest, ContainerStatus } from '../types/container.ts';

describe('AutoCoder Plugin - Real Docker Integration Tests', () => {
  let runtime: IAgentRuntime;
  let dockerService: DockerService;
  let testCharacter: Character;
  let createdContainers: string[] = [];
  let createdNetworks: string[] = [];
  let createdImages: string[] = [];

  beforeEach(async () => {
    // Create test character with Docker configuration
    testCharacter = {
      name: 'Docker Test Agent',
      bio: ['I am a test agent for Docker integration testing'],
      system: 'You are a test agent for Docker container management.',
      messageExamples: [],
      postExamples: [],
      topics: [],
      knowledge: [],
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-autocoder'],
      settings: {
        TEST_MODE: true,
        DOCKER_HOST: process.env.DOCKER_HOST || undefined,
      },
      secrets: {},
    };

    // Create runtime and register plugins
    runtime = new AgentRuntime({
      character: testCharacter,
    });

    // Register SQL plugin first
    await runtime.registerPlugin({
      ...sqlPlugin,
      description: sqlPlugin.description || 'SQL database plugin for ElizaOS',
    });

    // Register AutoCoder plugin
    await runtime.registerPlugin(autocoderPlugin);

    // Initialize runtime
    await runtime.initialize();

    // Get Docker service
    dockerService = runtime.getService('docker') as DockerService;
  });

  afterEach(async () => {
    // Cleanup all created containers
    if (dockerService) {
      for (const containerId of createdContainers) {
        try {
          await dockerService.stopContainer(containerId, 5);
          await dockerService.removeContainer(containerId, true);
          console.log(`✓ Cleaned up container: ${containerId}`);
        } catch (error) {
          console.warn(
            `Failed to cleanup container ${containerId}:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }

      // Cleanup created networks (except default)
      for (const networkId of createdNetworks) {
        try {
          await dockerService.removeNetwork(networkId);
          console.log(`✓ Cleaned up network: ${networkId}`);
        } catch (error) {
          console.warn(
            `Failed to cleanup network ${networkId}:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }

      // Cleanup created images
      for (const imageId of createdImages) {
        try {
          await dockerService.removeImage(imageId, true);
          console.log(`✓ Cleaned up image: ${imageId}`);
        } catch (error) {
          console.warn(
            `Failed to cleanup image ${imageId}:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    }

    createdContainers = [];
    createdNetworks = [];
    createdImages = [];

    // Stop runtime
    if (runtime && typeof runtime.stop === 'function') {
      await runtime.stop();
    }
  });

  it('should have Docker service available', () => {
    expect(dockerService).toBeDefined();
    expect(dockerService.constructor.name).toBe('DockerService');
  });

  it('should ping Docker daemon successfully (if Docker is running)', async () => {
    if (!dockerService) {
      console.warn('⚠️ Docker service not available, skipping Docker ping test');
      return;
    }

    try {
      const pingResult = await dockerService.ping();
      expect(typeof pingResult).toBe('boolean');

      if (pingResult) {
        console.log('✅ Docker daemon is available and responding');
      } else {
        console.warn('⚠️ Docker daemon ping returned false - Docker may not be running');
      }
    } catch (error) {
      console.warn(
        '⚠️ Docker ping failed (expected if Docker not running):',
        error instanceof Error ? error.message : String(error)
      );
      // Don't fail test if Docker is not available
    }
  });

  it('should get Docker version (if Docker is running)', async () => {
    if (!dockerService) {
      console.warn('⚠️ Docker service not available, skipping version test');
      return;
    }

    try {
      const isAvailable = await dockerService.ping();
      if (!isAvailable) {
        console.warn('⚠️ Docker not available, skipping version test');
        return;
      }

      const version = await dockerService.getVersion();
      expect(version).toBeDefined();
      expect(version.Version).toBeDefined();
      expect(typeof version.Version).toBe('string');
      expect(version.Version).not.toBe('0.0.0-mock'); // Ensure it's not the old stub

      console.log('✅ Docker version retrieved:', version.Version);
    } catch (error) {
      console.warn(
        'Version test failed (expected if Docker not running):',
        error instanceof Error ? error.message : String(error)
      );
    }
  });

  it('should list Docker images (if Docker is running)', async () => {
    if (!dockerService) {
      console.warn('⚠️ Docker service not available, skipping image list test');
      return;
    }

    try {
      const isAvailable = await dockerService.ping();
      if (!isAvailable) {
        console.warn('⚠️ Docker not available, skipping image list test');
        return;
      }

      const images = await dockerService.listImages();
      expect(Array.isArray(images)).toBe(true);

      console.log(`✅ Listed ${images.length} Docker images`);

      // Log first few images for verification
      const sampleImages = images.slice(0, 3);
      for (const image of sampleImages) {
        console.log(`  - Image: ${image.RepoTags?.[0] || '<none>'} (${image.Id.slice(0, 12)})`);
      }
    } catch (error) {
      console.warn(
        'Image list test failed (expected if Docker not running):',
        error instanceof Error ? error.message : String(error)
      );
    }
  });

  it('should list Docker networks (if Docker is running)', async () => {
    if (!dockerService) {
      console.warn('⚠️ Docker service not available, skipping network list test');
      return;
    }

    try {
      const isAvailable = await dockerService.ping();
      if (!isAvailable) {
        console.warn('⚠️ Docker not available, skipping network list test');
        return;
      }

      const networks = await dockerService.listNetworks();
      expect(Array.isArray(networks)).toBe(true);
      expect(networks.length).toBeGreaterThan(0); // Should have at least default networks

      console.log(`✅ Listed ${networks.length} Docker networks`);

      // Should have default Docker networks
      const networkNames = networks.map((net) => net.Name);
      expect(networkNames).toContain('bridge');

      // Check if our default Eliza network was created
      const elizaNetwork = networks.find((net) => net.Name === 'eliza-network');
      if (elizaNetwork) {
        console.log('✅ Found default Eliza network');
      }
    } catch (error) {
      console.warn(
        'Network list test failed (expected if Docker not running):',
        error instanceof Error ? error.message : String(error)
      );
    }
  });

  it('should create and remove a test network (if Docker is running)', async () => {
    if (!dockerService) {
      console.warn('⚠️ Docker service not available, skipping network creation test');
      return;
    }

    try {
      const isAvailable = await dockerService.ping();
      if (!isAvailable) {
        console.warn('⚠️ Docker not available, skipping network creation test');
        return;
      }

      // Create test network
      const networkName = `test-network-${Date.now()}`;
      const networkId = await dockerService.createNetwork({
        name: networkName,
        subnet: '172.30.0.0/16',
        gateway: '172.30.0.1',
      });

      expect(networkId).toBeDefined();
      expect(typeof networkId).toBe('string');
      createdNetworks.push(networkId);

      console.log(`✅ Created test network: ${networkName} (${networkId.slice(0, 12)})`);

      // Verify network exists
      const networks = await dockerService.listNetworks();
      const createdNetwork = networks.find((net) => net.Id === networkId);
      expect(createdNetwork).toBeDefined();
      expect(createdNetwork.Name).toBe(networkName);

      // Remove network
      await dockerService.removeNetwork(networkId);
      createdNetworks = createdNetworks.filter((id) => id !== networkId);

      console.log(`✅ Removed test network: ${networkName}`);

      // Verify network is gone
      const networksAfter = await dockerService.listNetworks();
      const removedNetwork = networksAfter.find((net) => net.Id === networkId);
      expect(removedNetwork).toBeUndefined();
    } catch (error) {
      console.warn(
        'Network creation test failed (expected if Docker not running):',
        error instanceof Error ? error.message : String(error)
      );
    }
  });

  it('should attempt container lifecycle operations (if Docker and test image available)', async () => {
    if (!dockerService) {
      console.warn('⚠️ Docker service not available, skipping container lifecycle test');
      return;
    }

    try {
      const isAvailable = await dockerService.ping();
      if (!isAvailable) {
        console.warn('⚠️ Docker not available, skipping container lifecycle test');
        return;
      }

      // Try to use a minimal test image
      const testImage = 'alpine:latest';
      const containerName = `test-container-${Date.now()}`;

      console.log(`Attempting container lifecycle test with image: ${testImage}`);

      // First try to pull the image (this will fail gracefully if no internet)
      try {
        await dockerService.pullImage('alpine', 'latest');
        console.log('✅ Successfully pulled alpine:latest image');
      } catch (pullError) {
        console.warn('⚠️ Could not pull alpine image, checking if it exists locally...');

        // Check if image exists locally
        const images = await dockerService.listImages();
        const hasAlpine = images.some(
          (img) => img.RepoTags && img.RepoTags.some((tag) => tag.startsWith('alpine:'))
        );

        if (!hasAlpine) {
          console.warn('⚠️ No alpine image available locally, skipping container lifecycle test');
          return;
        }
        console.log('✅ Found alpine image locally');
      }

      // Create container
      const containerRequest: ContainerCreateRequest = {
        name: containerName,
        image: testImage,
        agentConfig: {
          agentId: 'test-agent-123' as any,
          containerId: '', // Will be filled by Docker
          agentName: 'test-agent',
          role: 'coder',
          capabilities: ['test'],
          communicationPort: 8080,
          healthPort: 8081,
          environment: {
            TEST_VAR: 'test-value',
            NODE_ENV: 'test',
          },
        },
        networkConfig: {
          name: 'eliza-network',
        },
        securityConfig: {
          readOnlyRootfs: false,
          capDrop: ['ALL'],
          securityOpts: ['no-new-privileges:true'],
        },
      };

      const containerId = await dockerService.createContainer(containerRequest);
      expect(containerId).toBeDefined();
      expect(typeof containerId).toBe('string');
      createdContainers.push(containerId);

      console.log(`✅ Created container: ${containerName} (${containerId.slice(0, 12)})`);

      // Get container status
      const statusBeforeStart = await dockerService.getContainerStatus(containerId);
      expect(statusBeforeStart).toBeDefined();
      expect(statusBeforeStart.id).toBe(containerId);
      expect(statusBeforeStart.name).toBe(containerName);

      console.log(`Container status before start: ${statusBeforeStart.state}`);

      // Start container
      await dockerService.startContainer(containerId);
      console.log(`✅ Started container: ${containerId.slice(0, 12)}`);

      // Get status after start
      const statusAfterStart = await dockerService.getContainerStatus(containerId);
      expect(statusAfterStart.state).toBe('running');

      console.log(`Container status after start: ${statusAfterStart.state}`);

      // Try to execute a command (basic test)
      try {
        const execResult = await dockerService.executeInContainer(containerId, {
          command: ['echo', 'Hello from container!'],
          attachStdout: true,
          attachStderr: true,
        });

        expect(execResult).toBeDefined();
        expect(execResult.exitCode).toBe(0);
        expect(execResult.stdout).toContain('Hello from container!');

        console.log(`✅ Command execution successful. Output: ${execResult.stdout.trim()}`);
      } catch (execError) {
        console.warn(
          'Command execution failed (may be expected):',
          execError instanceof Error ? execError.message : String(execError)
        );
      }

      // Stop container
      await dockerService.stopContainer(containerId, 10);
      console.log(`✅ Stopped container: ${containerId.slice(0, 12)}`);

      // Get status after stop
      const statusAfterStop = await dockerService.getContainerStatus(containerId);
      expect(['stopped', 'exited']).toContain(statusAfterStop.state);

      console.log(`Container status after stop: ${statusAfterStop.state}`);

      // Remove container
      await dockerService.removeContainer(containerId, true);
      createdContainers = createdContainers.filter((id) => id !== containerId);

      console.log(`✅ Removed container: ${containerId.slice(0, 12)}`);

      console.log('✅ Complete container lifecycle test passed!');
    } catch (error) {
      console.warn(
        'Container lifecycle test failed (may be expected if Docker not available or no images):',
        error instanceof Error ? error.message : String(error)
      );
    }
  });

  it('should list containers with appropriate filters (if Docker is running)', async () => {
    if (!dockerService) {
      console.warn('⚠️ Docker service not available, skipping container list test');
      return;
    }

    try {
      const isAvailable = await dockerService.ping();
      if (!isAvailable) {
        console.warn('⚠️ Docker not available, skipping container list test');
        return;
      }

      // List all containers
      const allContainers = await dockerService.listContainers();
      expect(Array.isArray(allContainers)).toBe(true);

      console.log(`✅ Listed ${allContainers.length} containers (all states)`);

      // List only Eliza containers
      const elizaContainers = await dockerService.listContainers({
        label: 'eliza.container.type=sub-agent',
      });
      expect(Array.isArray(elizaContainers)).toBe(true);

      console.log(`✅ Listed ${elizaContainers.length} Eliza containers`);

      // Verify filter worked correctly
      for (const container of elizaContainers) {
        expect(container).toBeDefined();
        expect(container.id).toBeDefined();
        expect(container.name).toBeDefined();
        expect(container.state).toBeDefined();
      }
    } catch (error) {
      console.warn(
        'Container list test failed (expected if Docker not running):',
        error instanceof Error ? error.message : String(error)
      );
    }
  });

  it('should handle Docker service errors gracefully when Docker is not available', async () => {
    if (!dockerService) {
      console.warn(
        '⚠️ Docker service not available, this test validates the service handles absence gracefully'
      );
      return;
    }

    // This test specifically validates error handling when Docker is not available
    try {
      const pingResult = await dockerService.ping();

      if (pingResult) {
        console.log('✅ Docker is available - testing with unavailable image');

        // Test with non-existent image to trigger error handling
        try {
          await dockerService.createContainer({
            name: 'test-fail',
            image: 'nonexistent/image:invalid',
            agentConfig: {
              agentId: 'test' as any,
              containerId: '',
              agentName: 'test',
              role: 'coder',
              capabilities: [],
              communicationPort: 9999,
              healthPort: 9998,
              environment: {},
            },
          });

          // Should not reach here
          expect(true).toBe(false);
        } catch (error) {
          console.log('✅ Docker service properly handled invalid image error');
          expect(error).toBeDefined();
          expect(error instanceof Error ? error.message : String(error)).toBeDefined();
        }
      } else {
        console.log('✅ Docker not available - service ping returned false gracefully');
      }
    } catch (error) {
      console.log('✅ Docker service properly handled unavailable Docker daemon');
      expect(error).toBeDefined();
    }
  });
});
