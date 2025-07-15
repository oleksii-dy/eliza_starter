import {
    type IAgentRuntime,
    type UUID,
    type Workflow,
    type WorkflowExecution,
    type WorkflowStep,
    type IWorkflowService,
    type IWorkflowDatabaseAdapter,
    type Memory,
    type State,
    WorkflowStatus,
    WorkflowExecutionStatus,
    WorkflowTriggerType,
    WorkflowEventType,
    Service,
} from '../types';
import { WorkflowValidator } from './validator';
import { logger } from '../logger';
import { v4 as uuidv4 } from 'uuid';

// Dynamic import for node-cron, only in Node.js environments
let nodeCron: any = null;

// Check if we're in a Node.js environment
const isNode = typeof process !== 'undefined' && 
    process.versions && 
    process.versions.node;

// Dynamically import node-cron only in Node.js
if (isNode) {
    try {
        nodeCron = require('node-cron');
    } catch (err) {
        logger.warn('node-cron not available, cron triggers will be disabled');
    }
}

enum ServiceStatus {
    STARTING = 'STARTING',
    RUNNING = 'RUNNING',
    STOPPING = 'STOPPING',
    STOPPED = 'STOPPED',
    ERROR = 'ERROR',
}

/**
 * Service that manages workflow execution independently from chat
 */
export class WorkflowRuntimeService extends Service implements IWorkflowService {
    public static serviceType = 'workflow' as const;
    public serviceType = 'workflow' as const;

    protected declare runtime: IAgentRuntime;
    private validator: WorkflowValidator;
    private dbAdapter: IWorkflowDatabaseAdapter;
    private activeWorkflows: Map<UUID, Workflow> = new Map();
    private cronJobs: Map<UUID, any> = new Map(); // Store any type, could be cron task or null
    private eventListeners: Map<string, Set<UUID>> = new Map();
    private runningExecutions: Map<UUID, WorkflowExecution> = new Map();
    private status: ServiceStatus = ServiceStatus.STOPPED;

    /**
     * Start the WorkflowRuntimeService with the given runtime.
     * @param {IAgentRuntime} runtime - The runtime for the WorkflowRuntimeService.
     * @returns {Promise<Service>} A promise that resolves with the WorkflowRuntimeService instance.
     */
    static async start(runtime: IAgentRuntime): Promise<Service> {
        const service = new WorkflowRuntimeService(runtime);
        await service.initialize(runtime);
        return service;
    }

    constructor(runtime: IAgentRuntime) {
        super();
        this.runtime = runtime;
        this.validator = new WorkflowValidator(runtime);
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
        this.runtime = runtime;
        this.dbAdapter = runtime as unknown as IWorkflowDatabaseAdapter;
        
        // Check if database adapter supports workflows
        if (!this.dbAdapter.createWorkflow) {
            logger.warn('Database adapter does not support workflows - workflow service will be limited');
        }
    }

    async start(): Promise<void> {
        this.status = ServiceStatus.STARTING;
        logger.info('Starting Workflow Runtime Service...');

        try {
            // Load all active workflows for this agent
            if (this.dbAdapter.listWorkflows) {
                const workflows = await this.dbAdapter.listWorkflows(this.runtime.agentId);
                for (const workflow of workflows) {
                    if (workflow.status === WorkflowStatus.ACTIVE) {
                        await this.activateWorkflow(workflow);
                    }
                }
            }

            this.status = ServiceStatus.RUNNING;
            logger.info(`Workflow Runtime Service started - ${this.activeWorkflows.size} workflows active`);
        } catch (error) {
            this.status = ServiceStatus.ERROR;
            logger.error('Failed to start Workflow Runtime Service:', error);
            throw error;
        }
    }

    async stop(): Promise<void> {
        this.status = ServiceStatus.STOPPING;
        logger.info('Stopping Workflow Runtime Service...');

        // Stop all cron jobs
        for (const [workflowId, job] of this.cronJobs) {
            if (job && typeof job.stop === 'function') {
                job.stop();
            }
        }
        this.cronJobs.clear();

        // Clear event listeners
        this.eventListeners.clear();

        // Cancel running executions
        for (const execution of this.runningExecutions.values()) {
            await this.cancelExecution(execution.id);
        }

        this.activeWorkflows.clear();
        this.status = ServiceStatus.STOPPED;
        logger.info('Workflow Runtime Service stopped');
    }

    async createWorkflow(workflowData: Omit<Workflow, 'id'>): Promise<Workflow> {
        const workflow: Workflow = {
            ...workflowData,
            id: uuidv4() as UUID,
            version: 1,
            status: WorkflowStatus.DRAFT,
            metadata: {
                ...workflowData.metadata,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            },
        };

        // Validate workflow
        const validation = await this.validator.validateWorkflow(workflow);
        if (!validation.valid) {
            workflow.status = WorkflowStatus.ERROR;
            logger.error('Workflow validation failed:', validation.errors);
        }

        // Store in database
        await this.dbAdapter.createWorkflow(workflow);

        // Emit event
        await this.runtime.emitEvent(WorkflowEventType.WORKFLOW_CREATED, {
            workflowId: workflow.id,
            timestamp: Date.now(),
        });

        return workflow;
    }

    async updateWorkflow(id: UUID, updates: Partial<Workflow>): Promise<Workflow> {
        const existing = await this.getWorkflow(id);
        if (!existing) {
            throw new Error(`Workflow ${id} not found`);
        }

        const updated: Workflow = {
            ...existing,
            ...updates,
            id: existing.id, // Ensure ID doesn't change
            version: existing.version + 1,
            metadata: {
                ...existing.metadata,
                ...updates.metadata,
                updatedAt: Date.now(),
            },
        };

        // Validate if structure changed
        if (updates.steps || updates.triggers) {
            const validation = await this.validator.validateWorkflow(updated);
            if (!validation.valid) {
                updated.status = WorkflowStatus.ERROR;
                logger.error('Updated workflow validation failed:', validation.errors);
            } else if (updated.status === WorkflowStatus.ERROR) {
                // Clear error status if validation passes
                updated.status = WorkflowStatus.DRAFT;
            }
        }

        // Deactivate old version if active
        if (this.activeWorkflows.has(id)) {
            await this.deactivateWorkflow(id);
        }

        // Update in database
        if (this.dbAdapter.updateWorkflow) {
            await this.dbAdapter.updateWorkflow(id, updated);
        }

        // Reactivate if was active and still valid
        if (existing.status === WorkflowStatus.ACTIVE && updated.status !== WorkflowStatus.ERROR) {
            updated.status = WorkflowStatus.ACTIVE;
            await this.activateWorkflow(updated);
        }

        // Emit event
        await this.runtime.emitEvent(WorkflowEventType.WORKFLOW_UPDATED, {
            workflowId: updated.id,
            timestamp: Date.now(),
        });

        return updated;
    }

    async deleteWorkflow(id: UUID): Promise<void> {
        // Deactivate if active
        if (this.activeWorkflows.has(id)) {
            await this.deactivateWorkflow(id);
        }

        // Delete from database
        if (this.dbAdapter.deleteWorkflow) {
            await this.dbAdapter.deleteWorkflow(id);
        }

        // Emit event
        await this.runtime.emitEvent(WorkflowEventType.WORKFLOW_DELETED, {
            workflowId: id,
            timestamp: Date.now(),
        });
    }

    async getWorkflow(id: UUID): Promise<Workflow | null> {
        if (this.dbAdapter.getWorkflow) {
            return await this.dbAdapter.getWorkflow(id);
        }
        return this.activeWorkflows.get(id) || null;
    }

    async listWorkflows(agentId: UUID): Promise<Workflow[]> {
        if (this.dbAdapter.listWorkflows) {
            return await this.dbAdapter.listWorkflows(agentId);
        }
        return Array.from(this.activeWorkflows.values()).filter(
            w => w.agentId === agentId
        );
    }

    async validateWorkflow(workflow: Partial<Workflow>): Promise<{ valid: boolean; errors?: string[] }> {
        const result = await this.validator.validateWorkflow(workflow);
        return {
            valid: result.valid,
            errors: result.errors.length > 0 ? result.errors : undefined,
        };
    }

    async executeWorkflow(workflowId: UUID, trigger?: any): Promise<WorkflowExecution> {
        const workflow = await this.getWorkflow(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }

        if (workflow.status !== WorkflowStatus.ACTIVE) {
            throw new Error(`Workflow ${workflowId} is not active`);
        }

        // Check concurrent execution limits
        if (workflow.config?.allowConcurrent === false) {
            const hasRunning = Array.from(this.runningExecutions.values()).some(
                e => e.workflowId === workflowId && e.status === WorkflowExecutionStatus.RUNNING
            );
            if (hasRunning) {
                throw new Error(`Workflow ${workflowId} is already running and concurrent execution is disabled`);
            }
        }

        const execution: WorkflowExecution = {
            id: uuidv4() as UUID,
            workflowId,
            status: WorkflowExecutionStatus.RUNNING,
            startedAt: Date.now(),
            trigger: {
                type: trigger?.type || WorkflowTriggerType.MANUAL,
                data: trigger,
            },
            context: {
                variables: { ...workflow.variables },
                stepOutputs: {},
                triggerMemory: trigger?.memory,
            },
            history: [],
        };

        // Store execution
        this.runningExecutions.set(execution.id, execution);
        if (this.dbAdapter.createWorkflowExecution) {
            await this.dbAdapter.createWorkflowExecution(execution);
        }

        // Emit start event
        await this.runtime.emitEvent(WorkflowEventType.WORKFLOW_STARTED, {
            workflowId,
            executionId: execution.id,
            timestamp: Date.now(),
        });

        // Execute workflow asynchronously
        this.executeWorkflowSteps(workflow, execution).catch(error => {
            logger.error(`Workflow execution ${execution.id} failed:`, error);
        });

        return execution;
    }

    private async executeWorkflowSteps(workflow: Workflow, execution: WorkflowExecution): Promise<void> {
        try {
            // Execute steps sequentially
            for (const step of workflow.steps) {
                if (execution.status !== WorkflowExecutionStatus.RUNNING) {
                    break;
                }

                await this.executeStep(step, execution);
            }

            // Mark as completed if still running
            if (execution.status === WorkflowExecutionStatus.RUNNING) {
                execution.status = WorkflowExecutionStatus.COMPLETED;
                execution.endedAt = Date.now();
            }

            // Emit completion event
            await this.runtime.emitEvent(WorkflowEventType.WORKFLOW_COMPLETED, {
                workflowId: workflow.id,
                executionId: execution.id,
                timestamp: Date.now(),
            });
        } catch (error) {
            // Mark as failed
            execution.status = WorkflowExecutionStatus.FAILED;
            execution.endedAt = Date.now();
            execution.error = {
                message: error.message,
                stack: error.stack,
                timestamp: Date.now(),
            };

            // Emit failure event
            await this.runtime.emitEvent(WorkflowEventType.WORKFLOW_FAILED, {
                workflowId: workflow.id,
                executionId: execution.id,
                error: error.message,
                timestamp: Date.now(),
            });
        } finally {
            // Remove from running executions
            this.runningExecutions.delete(execution.id);

            // Update in database
            if (this.dbAdapter.updateWorkflowExecution) {
                await this.dbAdapter.updateWorkflowExecution(execution.id, execution);
            }
        }
    }

    private async executeStep(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
        const historyItem: any = {
            stepId: step.id,
            stepName: step.name,
            startedAt: Date.now(),
            status: 'running',
            input: step.input,
        };

        execution.currentStep = step.id;
        execution.history.push(historyItem);

        // Emit step start event
        await this.runtime.emitEvent(WorkflowEventType.WORKFLOW_STEP_STARTED, {
            workflowId: execution.workflowId,
            executionId: execution.id,
            stepId: step.id,
            timestamp: Date.now(),
        });

        try {
            let output: any;

            switch (step.type) {
                case 'action':
                    output = await this.executeActionStep(step, execution);
                    break;
                case 'condition':
                    output = await this.executeConditionStep(step, execution);
                    break;
                case 'loop':
                    output = await this.executeLoopStep(step, execution);
                    break;
                case 'parallel':
                    output = await this.executeParallelStep(step, execution);
                    break;
                case 'wait':
                    output = await this.executeWaitStep(step, execution);
                    break;
                default:
                    throw new Error(`Unknown step type: ${step.type}`);
            }

            // Update history
            historyItem.status = 'completed';
            historyItem.endedAt = Date.now();
            historyItem.output = output;

            // Store output
            execution.context.stepOutputs[step.id] = output;

            // Emit step completion event
            await this.runtime.emitEvent(WorkflowEventType.WORKFLOW_STEP_COMPLETED, {
                workflowId: execution.workflowId,
                executionId: execution.id,
                stepId: step.id,
                timestamp: Date.now(),
            });

            return output;
        } catch (error) {
            historyItem.status = 'failed';
            historyItem.endedAt = Date.now();
            historyItem.error = error.message;

            // Emit step failure event
            await this.runtime.emitEvent(WorkflowEventType.WORKFLOW_STEP_FAILED, {
                workflowId: execution.workflowId,
                executionId: execution.id,
                stepId: step.id,
                error: error.message,
                timestamp: Date.now(),
            });

            // Handle error based on configuration
            if (step.errorHandling?.continueOnError) {
                logger.warn(`Step ${step.id} failed but continuing:`, error);
                return null;
            }

            throw error;
        }
    }

    private async executeActionStep(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
        if (!step.action) {
            throw new Error('Action name is required for action step');
        }

        const action = this.runtime.actions.find(a => a.name === step.action);
        if (!action) {
            throw new Error(`Action '${step.action}' not found`);
        }

        // Prepare memory object for action
        const memory: Memory = {
            id: uuidv4() as UUID,
            entityId: this.runtime.agentId,
            roomId: uuidv4() as UUID, // Workflow execution context
            content: {
                text: JSON.stringify(step.input || {}),
            },
            createdAt: Date.now(),
        };

        // Prepare state
        const state: State = {
            ...execution.context.state,
            workflowId: execution.workflowId,
            executionId: execution.id,
            stepId: step.id,
            variables: execution.context.variables,
            stepOutputs: execution.context.stepOutputs,
        };

        // Execute action
        return await action.handler(this.runtime, memory, state);
    }

    private async executeConditionStep(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
        if (!step.condition) {
            throw new Error('Condition expression is required for condition step');
        }

        // Evaluate condition (simplified - in real implementation, use a safe expression evaluator)
        const conditionResult = await this.evaluateExpression(step.condition, execution.context);

        const stepsToExecute = conditionResult ? step.ifTrue : step.ifFalse;
        if (stepsToExecute) {
            for (const subStep of stepsToExecute) {
                await this.executeStep(subStep, execution);
            }
        }

        return { conditionResult };
    }

    private async executeLoopStep(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
        if (!step.loopSteps || step.loopSteps.length === 0) {
            throw new Error('Loop steps are required for loop step');
        }

        const maxIterations = step.loopConfig?.maxIterations || 100;
        const outputs: any[] = [];

        for (let i = 0; i < maxIterations; i++) {
            // Set loop variables
            if (step.loopConfig?.indexVariable) {
                execution.context.variables[step.loopConfig.indexVariable] = i;
            }

            // Execute loop body
            const loopOutputs: any[] = [];
            for (const loopStep of step.loopSteps) {
                const output = await this.executeStep(loopStep, execution);
                loopOutputs.push(output);
            }
            outputs.push(loopOutputs);

            // Check loop condition (if any)
            // This is simplified - real implementation would have proper loop control
        }

        return outputs;
    }

    private async executeParallelStep(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
        if (!step.parallelSteps || step.parallelSteps.length === 0) {
            throw new Error('Parallel steps are required for parallel step');
        }

        // Execute all branches in parallel
        const branchPromises = step.parallelSteps.map(async (branch) => {
            const branchOutputs: any[] = [];
            for (const branchStep of branch) {
                const output = await this.executeStep(branchStep, execution);
                branchOutputs.push(output);
            }
            return branchOutputs;
        });

        return await Promise.all(branchPromises);
    }

    private async executeWaitStep(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
        if (!step.waitConfig) {
            throw new Error('Wait configuration is required for wait step');
        }

        if (step.waitConfig.duration) {
            // Wait for specified duration
            await new Promise(resolve => setTimeout(resolve, step.waitConfig!.duration));
        } else if (step.waitConfig.condition) {
            // Wait for condition (simplified - real implementation would poll)
            const timeout = step.waitConfig.timeout || 60000; // 1 minute default
            const startTime = Date.now();

            while (Date.now() - startTime < timeout) {
                const conditionMet = await this.evaluateExpression(step.waitConfig.condition, execution.context);
                if (conditionMet) {
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second
            }
        }

        return { waitCompleted: true };
    }

    private async evaluateExpression(expression: string, context: any): Promise<any> {
        // This is a simplified expression evaluator
        // In a real implementation, use a safe expression evaluator library
        try {
            // Very basic evaluation - just check for simple conditions
            if (expression === 'true') return true;
            if (expression === 'false') return false;
            
            // For now, just return false for any complex expression
            logger.warn(`Complex expression evaluation not implemented: ${expression}`);
            return false;
        } catch (error) {
            logger.error('Error evaluating expression:', error);
            return false;
        }
    }

    async getExecution(executionId: UUID): Promise<WorkflowExecution | null> {
        const running = this.runningExecutions.get(executionId);
        if (running) {
            return running;
        }

        if (this.dbAdapter.getWorkflowExecution) {
            return await this.dbAdapter.getWorkflowExecution(executionId);
        }

        return null;
    }

    async listExecutions(workflowId: UUID, limit?: number): Promise<WorkflowExecution[]> {
        if (this.dbAdapter.listWorkflowExecutions) {
            return await this.dbAdapter.listWorkflowExecutions(workflowId, limit);
        }

        // Return running executions for this workflow
        return Array.from(this.runningExecutions.values())
            .filter(e => e.workflowId === workflowId)
            .slice(0, limit);
    }

    async cancelExecution(executionId: UUID): Promise<void> {
        const execution = this.runningExecutions.get(executionId);
        if (execution) {
            execution.status = WorkflowExecutionStatus.CANCELLED;
            execution.endedAt = Date.now();

            if (this.dbAdapter.updateWorkflowExecution) {
                await this.dbAdapter.updateWorkflowExecution(executionId, execution);
            }

            this.runningExecutions.delete(executionId);
        }
    }

    registerTriggers(workflow: Workflow): void {
        for (const trigger of workflow.triggers) {
            switch (trigger.type) {
                case WorkflowTriggerType.EVENT:
                    this.registerEventTrigger(workflow.id, trigger);
                    break;
                case WorkflowTriggerType.CRON:
                    this.registerCronTrigger(workflow.id, trigger);
                    break;
                // Other trigger types don't need registration
            }
        }
    }

    private registerEventTrigger(workflowId: UUID, trigger: any): void {
        const eventName = trigger.eventName;
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, new Set());
        }
        this.eventListeners.get(eventName)!.add(workflowId);

        // Register event handler with runtime
        this.runtime.events.set(eventName, [
            ...(this.runtime.events.get(eventName) || []),
            async (payload: any) => {
                // Check if this workflow should be triggered
                if (this.shouldTriggerWorkflow(trigger, payload)) {
                    await this.executeWorkflow(workflowId, {
                        type: WorkflowTriggerType.EVENT,
                        eventName,
                        payload,
                    });
                }
            },
        ]);
    }

    private registerCronTrigger(workflowId: UUID, trigger: any): void {
        if (!nodeCron) {
            logger.warn(`Cron triggers are not available in this environment. Skipping cron trigger for workflow ${workflowId}`);
            return;
        }

        try {
            const job = nodeCron.schedule(trigger.schedule, async () => {
                await this.executeWorkflow(workflowId, {
                    type: WorkflowTriggerType.CRON,
                    schedule: trigger.schedule,
                });
            }, {
                scheduled: true,
                timezone: trigger.timezone,
            });

            this.cronJobs.set(workflowId, job);
        } catch (error) {
            logger.error(`Failed to register cron trigger for workflow ${workflowId}:`, error);
        }
    }

    private shouldTriggerWorkflow(trigger: any, payload: any): boolean {
        if (!trigger.filter) {
            return true;
        }

        // Check filter conditions
        if (trigger.filter.roomId && payload.roomId !== trigger.filter.roomId) {
            return false;
        }

        if (trigger.filter.agentId && payload.agentId !== trigger.filter.agentId) {
            return false;
        }

        // Custom filter would be evaluated here
        if (trigger.filter.customFilter) {
            // In real implementation, use safe expression evaluator
            logger.warn('Custom filter evaluation not implemented');
        }

        return true;
    }

    unregisterTriggers(workflow: Workflow): void {
        // Remove cron job if exists
        const cronJob = this.cronJobs.get(workflow.id);
        if (cronJob && typeof cronJob.stop === 'function') {
            cronJob.stop();
            this.cronJobs.delete(workflow.id);
        }

        // Remove from event listeners
        for (const [eventName, workflows] of this.eventListeners) {
            workflows.delete(workflow.id);
            if (workflows.size === 0) {
                this.eventListeners.delete(eventName);
            }
        }
    }

    private async activateWorkflow(workflow: Workflow): Promise<void> {
        if (!this.validator.canActivate(workflow)) {
            logger.warn(`Cannot activate workflow ${workflow.id} - validation failed`);
            return;
        }

        this.activeWorkflows.set(workflow.id, workflow);
        this.registerTriggers(workflow);
        logger.info(`Activated workflow: ${workflow.name} (${workflow.id})`);
    }

    private async deactivateWorkflow(workflowId: UUID): Promise<void> {
        const workflow = this.activeWorkflows.get(workflowId);
        if (workflow) {
            this.unregisterTriggers(workflow);
            this.activeWorkflows.delete(workflowId);
            logger.info(`Deactivated workflow: ${workflow.name} (${workflowId})`);
        }
    }

    get capabilityDescription(): string {
        return 'Workflow execution engine for automating multi-step processes';
    }
} 