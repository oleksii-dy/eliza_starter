import {
    type IAgentRuntime,
    type Workflow,
    type WorkflowStep,
    WorkflowStatus,
} from '../types';
import { logger } from '../logger';

/**
 * Workflow validation result
 */
export interface WorkflowValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validates workflow definitions against the current runtime configuration
 */
export class WorkflowValidator {
    private runtime: IAgentRuntime;

    constructor(runtime: IAgentRuntime) {
        this.runtime = runtime;
    }

    /**
     * Validate a complete workflow definition
     */
    async validateWorkflow(workflow: Partial<Workflow>): Promise<WorkflowValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic structure validation
        if (!workflow.name || workflow.name.trim() === '') {
            errors.push('Workflow name is required');
        }

        if (!workflow.triggers || workflow.triggers.length === 0) {
            errors.push('At least one trigger is required');
        }

        if (!workflow.steps || workflow.steps.length === 0) {
            errors.push('At least one step is required');
        }

        // Validate triggers
        if (workflow.triggers) {
            for (let i = 0; i < workflow.triggers.length; i++) {
                const trigger = workflow.triggers[i];
                const triggerErrors = this.validateTrigger(trigger);
                errors.push(...triggerErrors.map(e => `Trigger ${i + 1}: ${e}`));
            }
        }

        // Validate steps
        if (workflow.steps) {
            const stepIds = new Set<string>();
            for (let i = 0; i < workflow.steps.length; i++) {
                const step = workflow.steps[i];
                const stepResult = await this.validateStep(step, stepIds);
                errors.push(...stepResult.errors.map(e => `Step ${i + 1}: ${e}`));
                warnings.push(...stepResult.warnings.map(w => `Step ${i + 1}: ${w}`));
            }
        }

        // Validate required plugins
        if (workflow.requiredPlugins) {
            const availablePlugins = this.runtime.plugins.map(p => p.name);
            for (const requiredPlugin of workflow.requiredPlugins) {
                if (!availablePlugins.includes(requiredPlugin)) {
                    errors.push(`Required plugin '${requiredPlugin}' is not available`);
                }
            }
        }

        // Validate required actions
        if (workflow.requiredActions) {
            const availableActions = this.runtime.actions.map(a => a.name);
            for (const requiredAction of workflow.requiredActions) {
                if (!availableActions.includes(requiredAction)) {
                    errors.push(`Required action '${requiredAction}' is not available`);
                }
            }
        }

        // Validate configuration
        if (workflow.config) {
            if (workflow.config.maxExecutionTime && workflow.config.maxExecutionTime <= 0) {
                errors.push('Max execution time must be positive');
            }

            if (workflow.config.maxConcurrentExecutions && workflow.config.maxConcurrentExecutions <= 0) {
                errors.push('Max concurrent executions must be positive');
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Validate a trigger configuration
     */
    private validateTrigger(trigger: any): string[] {
        const errors: string[] = [];

        if (!trigger.type) {
            errors.push('Trigger type is required');
            return errors;
        }

        switch (trigger.type) {
            case 'EVENT':
                if (!trigger.eventName) {
                    errors.push('Event name is required for event trigger');
                }
                break;

            case 'CRON':
                if (!trigger.schedule) {
                    errors.push('Schedule is required for cron trigger');
                } else {
                    // Basic cron expression validation
                    const cronParts = trigger.schedule.split(' ');
                    if (cronParts.length < 5) {
                        errors.push('Invalid cron expression - must have at least 5 parts');
                    }
                }
                break;

            case 'WORKFLOW':
                if (!trigger.workflowId) {
                    errors.push('Workflow ID is required for workflow trigger');
                }
                break;

            case 'MANUAL':
                // No additional validation needed
                break;

            default:
                errors.push(`Unknown trigger type: ${trigger.type}`);
        }

        return errors;
    }

    /**
     * Validate a workflow step
     */
    private async validateStep(
        step: WorkflowStep,
        stepIds: Set<string>
    ): Promise<{ errors: string[]; warnings: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate step ID
        if (!step.id || step.id.trim() === '') {
            errors.push('Step ID is required');
        } else if (stepIds.has(step.id)) {
            errors.push(`Duplicate step ID: ${step.id}`);
        } else {
            stepIds.add(step.id);
        }

        // Validate step name
        if (!step.name || step.name.trim() === '') {
            warnings.push('Step name is recommended for clarity');
        }

        // Validate step type
        if (!step.type) {
            errors.push('Step type is required');
            return { errors, warnings };
        }

        // Type-specific validation
        switch (step.type) {
            case 'action':
                if (!step.action) {
                    errors.push('Action name is required for action step');
                } else {
                    // Check if action exists
                    const action = this.runtime.actions.find(a => a.name === step.action);
                    if (!action) {
                        errors.push(`Action '${step.action}' not found`);
                    }
                }
                break;

            case 'condition':
                if (!step.condition) {
                    errors.push('Condition expression is required for condition step');
                }
                if (!step.ifTrue && !step.ifFalse) {
                    warnings.push('Condition step should have at least one branch (ifTrue or ifFalse)');
                }
                // Recursively validate nested steps
                if (step.ifTrue) {
                    for (const subStep of step.ifTrue) {
                        const subResult = await this.validateStep(subStep, stepIds);
                        errors.push(...subResult.errors.map(e => `ifTrue: ${e}`));
                        warnings.push(...subResult.warnings.map(w => `ifTrue: ${w}`));
                    }
                }
                if (step.ifFalse) {
                    for (const subStep of step.ifFalse) {
                        const subResult = await this.validateStep(subStep, stepIds);
                        errors.push(...subResult.errors.map(e => `ifFalse: ${e}`));
                        warnings.push(...subResult.warnings.map(w => `ifFalse: ${w}`));
                    }
                }
                break;

            case 'loop':
                if (!step.loopSteps || step.loopSteps.length === 0) {
                    errors.push('Loop steps are required for loop step');
                }
                if (step.loopConfig) {
                    if (step.loopConfig.maxIterations && step.loopConfig.maxIterations <= 0) {
                        errors.push('Max iterations must be positive');
                    }
                }
                // Recursively validate loop steps
                if (step.loopSteps) {
                    for (const subStep of step.loopSteps) {
                        const subResult = await this.validateStep(subStep, stepIds);
                        errors.push(...subResult.errors.map(e => `loop: ${e}`));
                        warnings.push(...subResult.warnings.map(w => `loop: ${w}`));
                    }
                }
                break;

            case 'parallel':
                if (!step.parallelSteps || step.parallelSteps.length === 0) {
                    errors.push('Parallel steps are required for parallel step');
                }
                // Validate each parallel branch
                if (step.parallelSteps) {
                    for (let i = 0; i < step.parallelSteps.length; i++) {
                        const branch = step.parallelSteps[i];
                        if (!Array.isArray(branch)) {
                            errors.push(`Parallel branch ${i + 1} must be an array`);
                            continue;
                        }
                        for (const subStep of branch) {
                            const subResult = await this.validateStep(subStep, stepIds);
                            errors.push(...subResult.errors.map(e => `parallel[${i + 1}]: ${e}`));
                            warnings.push(...subResult.warnings.map(w => `parallel[${i + 1}]: ${w}`));
                        }
                    }
                }
                break;

            case 'wait':
                if (!step.waitConfig) {
                    errors.push('Wait configuration is required for wait step');
                } else {
                    if (!step.waitConfig.duration && !step.waitConfig.condition) {
                        errors.push('Either duration or condition is required for wait step');
                    }
                    if (step.waitConfig.duration && step.waitConfig.duration <= 0) {
                        errors.push('Wait duration must be positive');
                    }
                    if (step.waitConfig.timeout && step.waitConfig.timeout <= 0) {
                        errors.push('Wait timeout must be positive');
                    }
                }
                break;

            default:
                errors.push(`Unknown step type: ${step.type}`);
        }

        // Validate error handling
        if (step.errorHandling?.onError) {
            for (const errorStep of step.errorHandling.onError) {
                const errorResult = await this.validateStep(errorStep, stepIds);
                errors.push(...errorResult.errors.map(e => `onError: ${e}`));
                warnings.push(...errorResult.warnings.map(w => `onError: ${w}`));
            }
        }

        // Validate timeout
        if (step.timeout && step.timeout <= 0) {
            errors.push('Step timeout must be positive');
        }

        return { errors, warnings };
    }

    /**
     * Check if a workflow can be activated
     */
    canActivate(workflow: Workflow): boolean {
        if (workflow.status === WorkflowStatus.ERROR) {
            logger.warn(`Cannot activate workflow ${workflow.id} - it has errors`);
            return false;
        }

        if (!workflow.requiredPlugins) {
            return true;
        }

        const availablePlugins = this.runtime.plugins.map(p => p.name);
        const missingPlugins = workflow.requiredPlugins.filter(
            p => !availablePlugins.includes(p)
        );

        if (missingPlugins.length > 0) {
            logger.warn(
                `Cannot activate workflow ${workflow.id} - missing plugins: ${missingPlugins.join(', ')}`
            );
            return false;
        }

        if (workflow.requiredActions) {
            const availableActions = this.runtime.actions.map(a => a.name);
            const missingActions = workflow.requiredActions.filter(
                a => !availableActions.includes(a)
            );

            if (missingActions.length > 0) {
                logger.warn(
                    `Cannot activate workflow ${workflow.id} - missing actions: ${missingActions.join(', ')}`
                );
                return false;
            }
        }

        return true;
    }
} 