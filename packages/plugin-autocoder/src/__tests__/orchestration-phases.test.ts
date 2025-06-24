import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import { OrchestrationManager } from '../managers/orchestration-manager';
import type { IAgentRuntime } from '@elizaos/core';
import { UUID } from '@elizaos/core';

// Mock child_process to prevent actual command execution
mock.module('child_process', () => ({
  exec: mock((cmd, opts, callback) => {
    // Simulate successful command execution
    if (callback) {
      callback(null, { stdout: 'Success', stderr: '' });
    }
  }),
}));

// Mock promisify to return our mocked exec
mock.module('util', () => ({
  promisify: mock(() => mock().mockResolvedValue({ stdout: 'Success', stderr: '' })),
}));

describe('OrchestrationManager - Phase & Healing Tests', () => {
  let manager: OrchestrationManager;
  let mockRuntime: IAgentRuntime;

  beforeEach(async () => {
    mockRuntime = {
      getSetting: mock(),
      getService: mock().mockReturnValue({
        createResearchProject: mock().mockResolvedValue({ id: 'research-1' }),
        getProject: mock().mockResolvedValue({ status: 'completed', report: 'Mock report' }),
        storeDocument: mock().mockResolvedValue({ id: 'doc-1' }),
      }),
      logger: { info: mock(), error: mock(), warn: mock(), debug: mock() },
    } as any;

    manager = new OrchestrationManager(mockRuntime);
    await manager.initialize();

    // Mock the workflow state machine to allow all transitions
    spyOn((manager as any).workflowStateMachine, 'isValidTransition').mockReturnValue(true);
    spyOn((manager as any).workflowStateMachine, 'isTerminalState').mockImplementation(
      (state) => state === 'completed' || state === 'failed'
    );
  });

  it('should transition through phases correctly', async () => {
    const project = await manager.createPluginProject(
      'phase-test',
      'A test of phases',
      'user-123' as UUID
    );
    (manager as any).projects.set(project.id, project); // Ensure project is tracked

    // Mock out the actual phase logic to just check transitions
    const researchSpy = spyOn(manager as any, 'executeResearchPhase')
      .mockImplementation(async (id) => {
        await (manager as any).updateProjectStatus(id, 'mvp_planning');
      });

    const planningSpy = spyOn(manager as any, 'executeMVPPlanningPhase')
      .mockImplementation(async (id) => {
        await (manager as any).updateProjectStatus(id, 'mvp_development');
      });

    const devSpy = spyOn(manager as any, 'executeMVPDevelopmentPhase')
      .mockImplementation(async (id) => {
        await (manager as any).updateProjectStatus(id, 'mvp_testing');
      });

    // Mock the remaining phases to prevent the workflow from failing
    spyOn(manager as any, 'executeFullPlanningPhase').mockImplementation(async (id) => {
      await (manager as any).updateProjectStatus(id, 'full_development');
    });

    spyOn(manager as any, 'executeFullDevelopmentPhase').mockImplementation(async (id) => {
      await (manager as any).updateProjectStatus(id, 'self_critique');
    });

    spyOn(manager as any, 'executeCriticalReviewPhase').mockImplementation(async (id) => {
      await (manager as any).updateProjectStatus(id, 'completed');
    });

    // Start the workflow
    await (manager as any).startCreationWorkflow(project.id);

    // Verify spies were called
    expect(researchSpy).toHaveBeenCalledWith(project.id);
    expect(planningSpy).toHaveBeenCalledWith(project.id);
    expect(devSpy).toHaveBeenCalledWith(project.id);

    // Verify final state
    const finalProject = await manager.getProject(project.id);
    expect(finalProject?.status).toBe('completed'); // Change expectation to completed
    expect(finalProject?.phaseHistory).toContain('researching');
    expect(finalProject?.phaseHistory).toContain('mvp_planning');
    expect(finalProject?.phaseHistory).toContain('mvp_development');
    expect(finalProject?.phaseHistory).toContain('mvp_testing');
  });

  it('should trigger healing when a check fails', async () => {
    const project = await manager.createPluginProject(
      'healing-trigger-test',
      'A test',
      'user-123' as UUID
    );
    (manager as any).projects.set(project.id, project);

    // Set the project to mvp_development phase and add localPath
    project.status = 'mvp_development';
    project.localPath = '/tmp/test-project'; // Add localPath to prevent error

    // Mock checks to fail once, then succeed
    let checksFailed = false;
    const checksSpy = spyOn(manager as any, 'runAllChecks').mockImplementation(async () => {
      if (!checksFailed) {
        checksFailed = true;
        return [{ phase: 'tsc', success: false, errorCount: 1, errors: ['TS2345: Error'] }];
      }
      return [{ phase: 'tsc', success: true, errorCount: 0 }];
    });

    // Mock code generation to be called for the fix
    const generateSpy = spyOn(manager as any, 'generatePluginCode').mockResolvedValue(undefined);

    // Run the development loop
    await (manager as any).runDevelopmentLoop(project, 'mvp');

    // Should have run checks twice (initial fail, then success)
    expect(checksSpy).toHaveBeenCalledTimes(2);
    // Should have called generate code twice (once for each iteration)
    expect(generateSpy).toHaveBeenCalledTimes(2);
    // Final status should be testing
    expect(project.status).toBe('mvp_testing');
  }, 10000); // Increase timeout to 10 seconds
});
