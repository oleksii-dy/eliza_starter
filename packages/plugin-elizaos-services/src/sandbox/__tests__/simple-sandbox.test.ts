/**
 * Simple Sandbox Test
 * Tests core sandbox functionality without complex runtime dependencies
 */

import { describe, test, expect } from 'bun:test';
import { MockSandboxManager } from '../MockSandboxManager.js';

describe('Simple Sandbox Functionality', () => {
  test('MockSandboxManager can be instantiated', () => {
    const manager = new MockSandboxManager();
    expect(manager).toBeDefined();
    expect(manager.capabilityDescription).toContain('Mock sandbox manager');
  });

  test('can create and manage sandbox', async () => {
    const manager = new MockSandboxManager();

    // Create sandbox
    const sandboxId = await manager.createSandbox();
    expect(sandboxId).toMatch(/^mock-sandbox-/);

    // Check sandbox info
    const info = manager.getSandboxInfo(sandboxId);
    expect(info).toBeDefined();
    expect(info?.status).toBe('running');

    // List sandboxes
    const sandboxes = manager.listSandboxes();
    expect(sandboxes).toHaveLength(1);
    expect(sandboxes[0].id).toBe(sandboxId);
  });

  test('can deploy agents to sandbox', async () => {
    const manager = new MockSandboxManager();
    const sandboxId = await manager.createSandbox();

    const agents = [
      { character: 'backend.json', role: 'backend', workspace: '/workspace', plugins: [] },
      { character: 'frontend.json', role: 'frontend', workspace: '/workspace', plugins: [] },
      { character: 'devops.json', role: 'devops', workspace: '/workspace', plugins: [] },
    ];

    await manager.deployAgents(sandboxId, agents);

    const info = manager.getSandboxInfo(sandboxId);
    expect(info?.agents).toHaveLength(3);
    expect(info?.agents.map((a) => a.role)).toEqual(['backend', 'frontend', 'devops']);
  });

  test('can simulate team collaboration', async () => {
    const manager = new MockSandboxManager();
    const sandboxId = await manager.createSandbox();

    const agents = [
      { character: 'backend.json', role: 'backend', workspace: '/workspace', plugins: [] },
      { character: 'frontend.json', role: 'frontend', workspace: '/workspace', plugins: [] },
      { character: 'devops.json', role: 'devops', workspace: '/workspace', plugins: [] },
    ];

    await manager.deployAgents(sandboxId, agents);

    const updates = await manager.simulateTeamCollaboration(sandboxId);

    expect(updates).toBeDefined();
    expect(updates.length).toBeGreaterThan(5);

    // Check that all agents contributed
    const hasDevOps = updates.some((update) => update.includes('DevOps Agent'));
    const hasBackend = updates.some((update) => update.includes('Backend Agent'));
    const hasFrontend = updates.some((update) => update.includes('Frontend Agent'));

    expect(hasDevOps).toBe(true);
    expect(hasBackend).toBe(true);
    expect(hasFrontend).toBe(true);

    // Check final completion
    const hasCompletion = updates.some((update) =>
      update.includes('Todo list application is complete')
    );
    expect(hasCompletion).toBe(true);
  });

  test('can create rooms and connect to host', async () => {
    const manager = new MockSandboxManager();
    const sandboxId = await manager.createSandbox();

    const roomId = await manager.createRoom(sandboxId, 'Test Room');
    expect(roomId).toMatch(/^mock-room-/);

    await manager.connectToHost(sandboxId, 'http://localhost:3000', roomId);

    const info = manager.getSandboxInfo(sandboxId);
    expect(info?.roomId).toBe(roomId);
  });

  test('can execute commands and sync files', async () => {
    const manager = new MockSandboxManager();
    const sandboxId = await manager.createSandbox();

    const result = await manager.executeSandboxCommand(sandboxId, 'mkdir -p /workspace/src');
    expect(result).toContain('Directories created successfully');

    const files = [
      { path: 'package.json', content: '{}', type: 'file' as const },
      { path: 'src/index.js', content: 'console.log("hello");', type: 'file' as const },
    ];

    await manager.syncFiles(sandboxId, files);

    await manager.uploadFile(sandboxId, '/workspace/README.md', '# Test Project');
  });

  test('can destroy sandbox', async () => {
    const manager = new MockSandboxManager();
    const sandboxId = await manager.createSandbox();

    expect(manager.getSandboxInfo(sandboxId)).toBeDefined();

    await manager.destroySandbox(sandboxId);

    expect(manager.getSandboxInfo(sandboxId)).toBeNull();
    expect(manager.listSandboxes()).toHaveLength(0);
  });

  test('handles errors gracefully', async () => {
    const manager = new MockSandboxManager();

    // Try to deploy agents to non-existent sandbox
    await expect(manager.deployAgents('invalid-id', [])).rejects.toThrow(
      'Sandbox invalid-id not found'
    );

    // Try to create room for non-existent sandbox
    await expect(manager.createRoom('invalid-id')).rejects.toThrow('Sandbox invalid-id not found');

    // Try to simulate collaboration for non-existent sandbox
    await expect(manager.simulateTeamCollaboration('invalid-id')).rejects.toThrow(
      'Sandbox invalid-id not found'
    );
  });
});
