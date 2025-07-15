import type { 
  IAgentRuntime, 
  UUID,
  WorkflowExecutionStatus 
} from '@elizaos/core';
import { logger, validateUuid } from '@elizaos/core';
import express from 'express';

/**
 * Creates router for workflow execution operations
 */
export function createWorkflowExecutionRouter(
  agents: Map<UUID, IAgentRuntime>
): express.Router {
  const router = express.Router();

  // GET /workflows/:workflowId/executions - List executions for a workflow
  router.get('/:agentId/workflows/:workflowId/executions', async (req: express.Request, res: express.Response) => {
    try {
      const agentId = validateUuid(req.params.agentId);
      const workflowId = validateUuid(req.params.workflowId);
      
      if (!agentId || !workflowId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID format'
        });
      }

      const runtime = agents.get(agentId);
      if (!runtime) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

      // Get optional status filter
      const status = req.query.status as WorkflowExecutionStatus | undefined;

      // Get executions from database
      const executions = await (runtime as any).getWorkflowExecutions({ 
        workflowId, 
        agentId, 
        status 
      });

      res.json({
        success: true,
        data: executions
      });
    } catch (error) {
      logger.error('[Workflow API] Error listing executions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list workflow executions'
      });
    }
  });

  // GET /executions/:executionId - Get a specific execution
  router.get('/:agentId/workflows/executions/:executionId', async (req: express.Request, res: express.Response) => {
    try {
      const agentId = validateUuid(req.params.agentId);
      const executionId = validateUuid(req.params.executionId);
      
      if (!agentId || !executionId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID format'
        });
      }

      const runtime = agents.get(agentId);
      if (!runtime) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

      const execution = await (runtime as any).getWorkflowExecution(executionId);
      if (!execution) {
        return res.status(404).json({
          success: false,
          error: 'Execution not found'
        });
      }

      // Verify execution belongs to this agent
      if (execution.agentId !== agentId) {
        return res.status(403).json({
          success: false,
          error: 'Execution does not belong to this agent'
        });
      }

      res.json({
        success: true,
        data: execution
      });
    } catch (error) {
      logger.error('[Workflow API] Error getting execution:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get workflow execution'
      });
    }
  });

  // POST /workflows/:workflowId/execute - Execute a workflow
  router.post('/:agentId/workflows/:workflowId/execute', async (req: express.Request, res: express.Response) => {
    try {
      const agentId = validateUuid(req.params.agentId);
      const workflowId = validateUuid(req.params.workflowId);
      
      if (!agentId || !workflowId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID format'
        });
      }

      const runtime = agents.get(agentId);
      if (!runtime) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

      // Verify workflow exists and belongs to this agent
      const workflow = await (runtime as any).getWorkflow(workflowId);
      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }

      if (workflow.agentId !== agentId) {
        return res.status(403).json({
          success: false,
          error: 'Workflow does not belong to this agent'
        });
      }

      // Get workflow service
      const workflowService = runtime.getService('workflow');
      if (!workflowService || !('executeWorkflow' in workflowService)) {
        return res.status(503).json({
          success: false,
          error: 'Workflow service not available'
        });
      }

      // Execute workflow with optional trigger data from request body
      const { triggerData } = req.body || {};
      const executionId = await (workflowService as any).executeWorkflow(workflowId, {
        type: 'MANUAL',
        data: triggerData
      });

      // Get the execution details
      const execution = await (runtime as any).getWorkflowExecution(executionId);

      res.status(202).json({
        success: true,
        data: execution,
        message: 'Workflow execution started'
      });
    } catch (error) {
      logger.error('[Workflow API] Error executing workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute workflow'
      });
    }
  });

  // POST /executions/:executionId/cancel - Cancel a running execution
  router.post('/:agentId/workflows/executions/:executionId/cancel', async (req: express.Request, res: express.Response) => {
    try {
      const agentId = validateUuid(req.params.agentId);
      const executionId = validateUuid(req.params.executionId);
      
      if (!agentId || !executionId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ID format'
        });
      }

      const runtime = agents.get(agentId);
      if (!runtime) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

      // Verify execution exists and belongs to this agent
      const execution = await (runtime as any).getWorkflowExecution(executionId);
      if (!execution) {
        return res.status(404).json({
          success: false,
          error: 'Execution not found'
        });
      }

      if (execution.agentId !== agentId) {
        return res.status(403).json({
          success: false,
          error: 'Execution does not belong to this agent'
        });
      }

      // Check if execution is in a cancelable state
      if (execution.status !== 'RUNNING' && execution.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          error: `Cannot cancel execution in ${execution.status} state`
        });
      }

      // Get workflow service
      const workflowService = runtime.getService('workflow');
      if (!workflowService || !('cancelExecution' in workflowService)) {
        return res.status(503).json({
          success: false,
          error: 'Workflow service not available'
        });
      }

      await (workflowService as any).cancelExecution(executionId);

      res.json({
        success: true,
        message: 'Workflow execution cancelled'
      });
    } catch (error) {
      logger.error('[Workflow API] Error cancelling execution:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel workflow execution'
      });
    }
  });

  // GET /executions - List all executions for an agent
  router.get('/:agentId/workflows/executions', async (req: express.Request, res: express.Response) => {
    try {
      const agentId = validateUuid(req.params.agentId);
      
      if (!agentId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid agent ID format'
        });
      }

      const runtime = agents.get(agentId);
      if (!runtime) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

      // Get optional filters
      const status = req.query.status as WorkflowExecutionStatus | undefined;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      // Get executions from database
      const executions = await (runtime as any).getWorkflowExecutions({ 
        agentId, 
        status 
      });

      // Apply pagination
      const paginatedExecutions = executions.slice(offset, offset + limit);

      res.json({
        success: true,
        data: paginatedExecutions,
        total: executions.length,
        limit,
        offset
      });
    } catch (error) {
      logger.error('[Workflow API] Error listing all executions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list workflow executions'
      });
    }
  });

  return router;
} 