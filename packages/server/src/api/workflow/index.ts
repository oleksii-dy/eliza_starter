import type { IAgentRuntime, UUID } from '@elizaos/core';
import express from 'express';
import { createWorkflowCrudRouter } from './crud';
import { createWorkflowExecutionRouter } from './execution';

/**
 * Creates the workflow router for workflow management and execution
 */
export function workflowRouter(
  agents: Map<UUID, IAgentRuntime>
): express.Router {
  const router = express.Router();

  // Mount CRUD operations at root level
  router.use('/', createWorkflowCrudRouter(agents));

  // Mount execution operations
  router.use('/', createWorkflowExecutionRouter(agents));

  return router;
} 