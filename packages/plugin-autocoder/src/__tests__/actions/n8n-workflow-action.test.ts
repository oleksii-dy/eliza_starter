import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { n8nWorkflowAction, checkN8nWorkflowStatusAction } from '../../actions/n8n-workflow-action';
import { N8nWorkflowService } from '../../services/N8nWorkflowService';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';

// Mock the N8nWorkflowService
mock.module('../../services/N8nWorkflowService', () => ({
  N8nWorkflowService: mock()
}));

describe('N8n Workflow Actions', () => {
  let mockRuntime: IAgentRuntime;
  let mockService: N8nWorkflowService;
  let mockMemory: Memory;
  let mockState: State;
  let mockCallback: any;

  beforeEach(() => {
    mock.restore();

    mockService = {
      getActiveJobs: mock().mockReturnValue([]),
      createWorkflow: mock().mockResolvedValue('test-job-id'),
      getJobStatus: mock().mockReturnValue({
        id: 'test-job-id',
        specification: { name: 'test-workflow', description: 'Test workflow' },
        status: 'pending',
        progress: 0,
        startedAt: new Date(),
      }),
      getAllJobs: mock().mockReturnValue([]),
    } as any;

    mockRuntime = {
      getService: mock().mockReturnValue(mockService),
      useModel: mock().mockResolvedValue('{"name":"generated-workflow","description":"Test"}'),
    } as any;

    mockMemory = {
      entityId: '00000000-0000-0000-0000-000000000001',
      roomId: '00000000-0000-0000-0000-000000000002',
      agentId: '00000000-0000-0000-0000-000000000003',
      content: { text: 'Create an n8n workflow that sends emails every morning' },
    } as Memory;

    mockState = {
      values: { /* empty */ },
      data: { /* empty */ },
      text: '',
    } as State;

    mockCallback = mock();
  });

  describe('n8nWorkflowAction', () => {
    it('should validate when service is available and no active jobs', async () => {
      const isValid = await n8nWorkflowAction.validate(mockRuntime, mockMemory, mockState);
      expect(isValid).toBe(true);
    });

    it('should not validate when service is not available', async () => {
      mockRuntime.getService = mock().mockReturnValue(null);
      const isValid = await n8nWorkflowAction.validate(mockRuntime, mockMemory, mockState);
      expect(isValid).toBe(false);
    });

    it('should not validate when there are active jobs', async () => {
      mockService.getActiveJobs = mock().mockReturnValue([{ id: 'active-job' }]);
      const isValid = await n8nWorkflowAction.validate(mockRuntime, mockMemory, mockState);
      expect(isValid).toBe(false);
    });

    it('should create workflow from natural language description', async () => {
      const result = await n8nWorkflowAction.handler(
        mockRuntime,
        mockMemory,
        mockState,
        { /* empty */ },
        mockCallback
      );

      expect(mockService.createWorkflow).toHaveBeenCalled();
      expect(result).toBeTruthy();
      if (result && typeof result === 'object' && 'data' in result) {
        expect(result.data?.success).toBe(true);
        expect(result.data?.jobId).toBe('test-job-id');
      }
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('N8n workflow creation started'),
          action: 'N8N_WORKFLOW_CREATED',
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockService.createWorkflow = mock().mockRejectedValue(new Error('Creation failed'));

      const result = await n8nWorkflowAction.handler(
        mockRuntime,
        mockMemory,
        mockState,
        { /* empty */ },
        mockCallback
      );

      expect(result).toBeTruthy();
      if (result && typeof result === 'object' && 'text' in result) {
        expect(result.text).toContain('Failed to create n8n workflow');
      }
      if (result && typeof result === 'object' && 'data' in result) {
        expect(result.data?.success).toBe(false);
      }
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Failed to create n8n workflow'),
          error: true,
        })
      );
    });

    it('should parse JSON specification when provided', async () => {
      const jsonSpec = {
        name: 'email-workflow',
        description: 'Send daily emails',
        nodes: [{ type: 'n8n-nodes-base.gmail', name: 'Gmail' }],
      };

      mockMemory.content.text = JSON.stringify(jsonSpec);

      await n8nWorkflowAction.handler(mockRuntime, mockMemory, mockState, { /* empty */ }, mockCallback);

      expect(mockService.createWorkflow).toHaveBeenCalledWith(jsonSpec);
    });
  });

  describe('checkN8nWorkflowStatusAction', () => {
    it('should validate when service has active jobs', async () => {
      mockService.getActiveJobs = mock().mockReturnValue([{ id: 'active-job' }]);
      const isValid = await checkN8nWorkflowStatusAction.validate(
        mockRuntime,
        mockMemory,
        mockState
      );
      expect(isValid).toBe(true);
    });

    it('should not validate when no active jobs', async () => {
      const isValid = await checkN8nWorkflowStatusAction.validate(
        mockRuntime,
        mockMemory,
        mockState
      );
      expect(isValid).toBe(false);
    });

    it('should return job status for latest job', async () => {
      const mockJob = {
        id: 'test-job-id',
        specification: { name: 'test-workflow', description: 'Test' },
        status: 'completed',
        progress: 100,
        startedAt: new Date(),
        completedAt: new Date(),
      };

      mockService.getAllJobs = mock().mockReturnValue([mockJob]);
      mockService.getJobStatus = mock().mockReturnValue(mockJob);

      const result = await checkN8nWorkflowStatusAction.handler(mockRuntime, mockMemory, mockState);

      expect(result).toBeTruthy();
      if (result && typeof result === 'object' && 'text' in result) {
        expect(result.text).toContain('Workflow created successfully');
      }
      if (result && typeof result === 'object' && 'data' in result) {
        expect(result.data).toEqual(mockJob);
      }
    });

    it('should handle no jobs found', async () => {
      const result = await checkN8nWorkflowStatusAction.handler(mockRuntime, mockMemory, mockState);

      expect(result).toBeTruthy();
      if (result && typeof result === 'object' && 'text' in result) {
        expect(result.text).toBe('No n8n workflow creation jobs found.');
      }
      if (result && typeof result === 'object' && 'data' in result) {
        expect(result.data?.jobs).toEqual([]);
      }
    });

    it('should show failure message for failed jobs', async () => {
      const mockJob = {
        id: 'test-job-id',
        specification: { name: 'test-workflow', description: 'Test' },
        status: 'failed',
        progress: 50,
        error: 'Validation failed',
        startedAt: new Date(),
        completedAt: new Date(),
      };

      mockService.getAllJobs = mock().mockReturnValue([mockJob]);
      mockService.getJobStatus = mock().mockReturnValue(mockJob);

      const result = await checkN8nWorkflowStatusAction.handler(mockRuntime, mockMemory, mockState);

      expect(result).toBeTruthy();
      if (result && typeof result === 'object' && 'text' in result) {
        expect(result.text).toContain('Creation failed: Validation failed');
      }
    });
  });
});
