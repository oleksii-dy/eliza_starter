import type { 
  IAgentRuntime, 
  UUID, 
  Workflow,
  WorkflowStatus 
} from '@elizaos/core';
import { logger, validateUuid } from '@elizaos/core';
import express from 'express';

/**
 * Creates router for workflow CRUD operations
 */
export function createWorkflowCrudRouter(
  agents: Map<UUID, IAgentRuntime>
): express.Router {
  const router = express.Router();

  // GET /workflows - List all workflows for an agent
  router.get('/:agentId/workflows', async (req: express.Request, res: express.Response) => {
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

      // Get optional status filter
      const status = req.query.status as WorkflowStatus | undefined;

      // Get workflows from database
      const workflows = await (runtime as any).getWorkflows({ agentId, status });

      res.json({
        success: true,
        data: workflows
      });
    } catch (error) {
      logger.error('[Workflow API] Error listing workflows:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list workflows'
      });
    }
  });

  // GET /workflows/:workflowId - Get a specific workflow
  router.get('/:agentId/workflows/:workflowId', async (req: express.Request, res: express.Response) => {
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

      const workflow = await (runtime as any).getWorkflow(workflowId);
      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }

      // Verify workflow belongs to this agent
      if (workflow.agentId !== agentId) {
        return res.status(403).json({
          success: false,
          error: 'Workflow does not belong to this agent'
        });
      }

      res.json({
        success: true,
        data: workflow
      });
    } catch (error) {
      logger.error('[Workflow API] Error getting workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get workflow'
      });
    }
  });

  // POST /workflows - Create a new workflow
  router.post('/:agentId/workflows', async (req: express.Request, res: express.Response) => {
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

      const workflowData = req.body;
      
      // Validate required fields
      if (!workflowData.name || !workflowData.steps || !workflowData.triggers) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, steps, and triggers are required'
        });
      }

      // Create workflow through the workflow service
      const workflowService = runtime.getService('workflow');
      if (!workflowService || !('createWorkflow' in workflowService)) {
        return res.status(503).json({
          success: false,
          error: 'Workflow service not available'
        });
      }

      const workflow = await (workflowService as any).createWorkflow({
        ...workflowData,
        agentId
      });

      res.status(201).json({
        success: true,
        data: workflow
      });
    } catch (error) {
      logger.error('[Workflow API] Error creating workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create workflow'
      });
    }
  });

  // PUT /workflows/:workflowId - Update a workflow
  router.put('/:agentId/workflows/:workflowId', async (req: express.Request, res: express.Response) => {
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
      const existingWorkflow = await (runtime as any).getWorkflow(workflowId);
      if (!existingWorkflow) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }

      if (existingWorkflow.agentId !== agentId) {
        return res.status(403).json({
          success: false,
          error: 'Workflow does not belong to this agent'
        });
      }

      const updates = req.body;

      // Get workflow service
      const workflowService = runtime.getService('workflow');
      if (!workflowService || !('updateWorkflow' in workflowService)) {
        return res.status(503).json({
          success: false,
          error: 'Workflow service not available'
        });
      }

      await (workflowService as any).updateWorkflow(workflowId, updates);

      // Get updated workflow
      const updatedWorkflow = await (runtime as any).getWorkflow(workflowId);

      res.json({
        success: true,
        data: updatedWorkflow
      });
    } catch (error) {
      logger.error('[Workflow API] Error updating workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update workflow'
      });
    }
  });

  // DELETE /workflows/:workflowId - Delete a workflow
  router.delete('/:agentId/workflows/:workflowId', async (req: express.Request, res: express.Response) => {
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
      if (!workflowService || !('deleteWorkflow' in workflowService)) {
        return res.status(503).json({
          success: false,
          error: 'Workflow service not available'
        });
      }

      await (workflowService as any).deleteWorkflow(workflowId);

      res.json({
        success: true,
        message: 'Workflow deleted successfully'
      });
    } catch (error) {
      logger.error('[Workflow API] Error deleting workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete workflow'
      });
    }
  });

  return router;
} 