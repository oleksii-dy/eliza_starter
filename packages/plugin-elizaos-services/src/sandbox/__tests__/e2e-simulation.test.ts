/**
 * End-to-End Simulation Test
 * Demonstrates the complete todo app development workflow using MockSandboxManager
 */

import { describe, test, expect } from 'bun:test';
import { MockSandboxManager } from '../MockSandboxManager.js';
import { logger } from '@elizaos/core';

describe('End-to-End Todo App Development Simulation', () => {
  test('should complete full todo app development workflow', async () => {
    logger.info('🚀 Starting end-to-end todo app development simulation...');

    // 1. Initialize the mock sandbox manager
    const sandboxManager = new MockSandboxManager();
    expect(sandboxManager).toBeDefined();

    // 2. Create sandbox environment
    logger.info('📦 Creating development sandbox...');
    const sandboxId = await sandboxManager.createSandbox('eliza-dev-team');
    expect(sandboxId).toMatch(/^mock-sandbox-/);
    logger.info(`✅ Sandbox created: ${sandboxId}`);

    // 3. Deploy specialized development agents
    logger.info('👥 Deploying development team...');
    const agents = [
      {
        character: 'backend-specialist.json',
        role: 'backend',
        workspace: '/workspace',
        plugins: ['node', 'express', 'sqlite'],
      },
      {
        character: 'frontend-specialist.json',
        role: 'frontend',
        workspace: '/workspace',
        plugins: ['react', 'vite', 'tailwind'],
      },
      {
        character: 'devops-specialist.json',
        role: 'devops',
        workspace: '/workspace',
        plugins: ['docker', 'github', 'deployment'],
      },
    ];

    await sandboxManager.deployAgents(sandboxId, agents);

    const sandboxInfo = sandboxManager.getSandboxInfo(sandboxId);
    expect(sandboxInfo?.agents).toHaveLength(3);
    expect(sandboxInfo?.agents.map((a) => a.role)).toEqual(['backend', 'frontend', 'devops']);
    logger.info('✅ All agents deployed successfully');

    // 4. Create shared room for team coordination
    logger.info('🏠 Setting up team communication room...');
    const roomId = await sandboxManager.createRoom(sandboxId, 'Todo App Development');
    expect(roomId).toMatch(/^mock-room-/);
    logger.info(`✅ Team room created: ${roomId}`);

    // 5. Connect sandbox to host for real-time updates
    logger.info('🔗 Connecting sandbox to host...');
    await sandboxManager.connectToHost(sandboxId, 'http://localhost:3000', roomId);
    logger.info('✅ WebSocket bridge established');

    // 6. Set up project structure
    logger.info('📁 Setting up project structure...');
    const setupResult = await sandboxManager.executeSandboxCommand(
      sandboxId,
      'mkdir -p /workspace/frontend /workspace/backend && ls -la /workspace'
    );
    expect(setupResult).toContain('Directories created successfully');
    logger.info('✅ Project structure created');

    // 7. Sync initial project files
    logger.info('📄 Syncing project files...');
    const projectFiles = [
      {
        path: 'package.json',
        content: '{"name": "todo-app", "version": "1.0.0"}',
        type: 'file' as const,
      },
      {
        path: 'frontend/package.json',
        content: '{"name": "todo-frontend", "dependencies": {"react": "^18.0.0"}}',
        type: 'file' as const,
      },
      {
        path: 'backend/package.json',
        content: '{"name": "todo-backend", "dependencies": {"express": "^4.18.0"}}',
        type: 'file' as const,
      },
      {
        path: 'README.md',
        content: '# Todo List Application\nA collaborative todo app built by AI agents',
        type: 'file' as const,
      },
    ];

    await sandboxManager.syncFiles(sandboxId, projectFiles);
    await sandboxManager.uploadFile(
      sandboxId,
      '/workspace/.gitignore',
      'node_modules/\n.env\ndist/'
    );
    logger.info('✅ Project files synced');

    // 8. Simulate the complete development workflow
    logger.info('🔨 Starting collaborative development...');
    const developmentUpdates = await sandboxManager.simulateTeamCollaboration(sandboxId);

    // Verify the development process
    expect(developmentUpdates).toBeDefined();
    expect(developmentUpdates.length).toBeGreaterThan(8);

    // Check that all agents contributed
    const hasDevOpsWork = developmentUpdates.some(
      (update) => update.includes('DevOps Agent') && update.includes('Project structure')
    );
    const hasBackendWork = developmentUpdates.some(
      (update) => update.includes('Backend Agent') && update.includes('REST API')
    );
    const hasFrontendWork = developmentUpdates.some(
      (update) => update.includes('Frontend Agent') && update.includes('React component')
    );
    const hasIntegration = developmentUpdates.some((update) => update.includes('integrated'));
    const hasCompletion = developmentUpdates.some((update) =>
      update.includes('Todo list application is complete')
    );

    expect(hasDevOpsWork).toBe(true);
    expect(hasBackendWork).toBe(true);
    expect(hasFrontendWork).toBe(true);
    expect(hasIntegration).toBe(true);
    expect(hasCompletion).toBe(true);

    logger.info('✅ Development workflow completed successfully');

    // 9. Log the development progress
    logger.info('📊 Development Updates:');
    developmentUpdates.forEach((update, index) => {
      logger.info(`  ${index + 1}. ${update}`);
    });

    // 10. Verify final sandbox state
    const finalSandboxInfo = sandboxManager.getSandboxInfo(sandboxId);
    expect(finalSandboxInfo?.status).toBe('running');
    expect(finalSandboxInfo?.agents).toHaveLength(3);
    expect(finalSandboxInfo?.roomId).toBe(roomId);

    // 11. Clean up sandbox
    logger.info('🧹 Cleaning up sandbox...');
    await sandboxManager.destroySandbox(sandboxId);
    expect(sandboxManager.getSandboxInfo(sandboxId)).toBeNull();
    logger.info('✅ Sandbox cleaned up');

    // 12. Final verification
    logger.info('🎉 End-to-end simulation completed successfully!');
    logger.info(`📋 Simulated ${developmentUpdates.length} development steps`);
    logger.info('✅ Todo list application ready for demo');
    logger.info('🚀 Multi-agent development team scenario verified working');

    expect(true).toBe(true); // Test passes if we reach here without errors
  }, 15000); // 15 second timeout for the full workflow

  test('should handle project requirements and scaling', async () => {
    logger.info('📈 Testing project scaling capabilities...');

    const sandboxManager = new MockSandboxManager();
    const sandboxId = await sandboxManager.createSandbox('eliza-dev-team-advanced');

    // Deploy a larger team with specialized roles
    const expandedTeam = [
      {
        character: 'backend-lead.json',
        role: 'backend',
        workspace: '/workspace',
        plugins: ['node', 'postgres', 'redis'],
      },
      {
        character: 'frontend-lead.json',
        role: 'frontend',
        workspace: '/workspace',
        plugins: ['react', 'typescript', 'storybook'],
      },
      {
        character: 'devops-lead.json',
        role: 'devops',
        workspace: '/workspace',
        plugins: ['docker', 'kubernetes', 'monitoring'],
      },
      {
        character: 'qa-specialist.json',
        role: 'qa',
        workspace: '/workspace',
        plugins: ['cypress', 'jest', 'playwright'],
      },
      {
        character: 'ui-designer.json',
        role: 'design',
        workspace: '/workspace',
        plugins: ['figma', 'design-tokens'],
      },
    ];

    await sandboxManager.deployAgents(sandboxId, expandedTeam);

    const sandboxInfo = sandboxManager.getSandboxInfo(sandboxId);
    expect(sandboxInfo?.agents).toHaveLength(5);

    // Test complex project commands
    const complexCommands = [
      'npm install --workspace=frontend --workspace=backend',
      'docker-compose up -d postgres redis',
      'git init && git add . && git commit -m "Initial commit"',
    ];

    for (const command of complexCommands) {
      const result = await sandboxManager.executeSandboxCommand(sandboxId, command);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    }

    await sandboxManager.destroySandbox(sandboxId);
    logger.info('✅ Project scaling test completed');
  });

  test('should demonstrate sandbox error recovery', async () => {
    logger.info('🔧 Testing error recovery capabilities...');

    const sandboxManager = new MockSandboxManager();

    // Test error handling for non-existent sandbox
    await expect(sandboxManager.deployAgents('invalid-sandbox-id', [])).rejects.toThrow(
      'Sandbox invalid-sandbox-id not found'
    );

    await expect(sandboxManager.createRoom('invalid-sandbox-id')).rejects.toThrow(
      'Sandbox invalid-sandbox-id not found'
    );

    await expect(sandboxManager.simulateTeamCollaboration('invalid-sandbox-id')).rejects.toThrow(
      'Sandbox invalid-sandbox-id not found'
    );

    logger.info('✅ Error recovery test completed');
  });
});
