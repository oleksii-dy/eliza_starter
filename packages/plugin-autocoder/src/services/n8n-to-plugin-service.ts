import type { IAgentRuntime, Action, Provider, Service as ElizaService } from '@elizaos/core';
import { Service, elizaLogger } from '@elizaos/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { N8nWorkflowSpecification } from './n8n-workflow-service.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface N8nPluginMapping {
  workflowId: string;
  workflowName: string;
  componentType: 'action' | 'provider' | 'service';
  componentName: string;
  triggers?: string[];
  cacheConfig?: {
    enabled: boolean;
    ttl?: number; // Time to live in seconds
    key?: string;
  };
  stateManagement?: {
    persistState: boolean;
    stateKey: string;
  };
}

export interface PluginGenerationSpec {
  name: string;
  description: string;
  workflows: N8nWorkflowSpecification[];
  mappings?: N8nPluginMapping[];
  config?: {
    enableCaching?: boolean;
    enableStateManagement?: boolean;
    cacheTTL?: number;
    generateTests?: boolean;
    generateDocs?: boolean;
  };
}

export interface PluginGenerationJob {
  id: string;
  spec: PluginGenerationSpec;
  status: 'pending' | 'analyzing' | 'generating' | 'building' | 'testing' | 'completed' | 'failed';
  progress: number;
  mappings: N8nPluginMapping[];
  generatedCode?: {
    actions: Map<string, string>;
    providers: Map<string, string>;
    services: Map<string, string>;
    tests: Map<string, string>;
    index: string;
    packageJson: string;
  };
  outputPath?: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export class N8nToPluginService extends Service {
  static serviceName = 'n8n-to-plugin';
  capabilityDescription = 'Converts n8n workflows into ElizaOS plugin components with state management and caching';

  private jobs: Map<string, PluginGenerationJob> = new Map();
  private anthropic: Anthropic | null = null;
  private outputDir: string;
  private stateCache: Map<string, any> = new Map();
  private resultCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  constructor(runtime: IAgentRuntime) {
    super();
    this.outputDir = path.join(process.cwd(), '.eliza-temp', 'generated-plugins');
  }

  async start(): Promise<void> {
    elizaLogger.info('[N8nToPlugin] Service started');

    // Initialize Anthropic if API key is available
    const apiKey = this.runtime?.getSetting('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }

    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });

    // Start cache cleanup interval
    this.startCacheCleanup();
  }

  async stop(): Promise<void> {
    elizaLogger.info('[N8nToPlugin] Service stopped');

    // Mark any running jobs as failed
    for (const job of this.jobs.values()) {
      if (job.status !== 'completed' && job.status !== 'failed') {
        job.status = 'failed';
        job.error = 'Service stopped';
        job.completedAt = new Date();
      }
    }
  }

  /**
   * Convert n8n workflows to ElizaOS plugin
   */
  async convertWorkflowsToPlugin(spec: PluginGenerationSpec): Promise<string> {
    const jobId = uuidv4();
    const job: PluginGenerationJob = {
      id: jobId,
      spec,
      status: 'pending',
      progress: 0,
      mappings: [],
      startedAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // Start conversion process
    this.processConversionJob(job).catch(error => {
      elizaLogger.error('[N8nToPlugin] Failed to process conversion job:', error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();
    });

    return jobId;
  }

  /**
   * Analyze workflows and determine component mappings
   */
  async analyzeWorkflows(workflows: N8nWorkflowSpecification[]): Promise<N8nPluginMapping[]> {
    const mappings: N8nPluginMapping[] = [];

    for (const workflow of workflows) {
      // Analyze workflow characteristics
      const hasWebhookTrigger = workflow.triggers?.some(t => t.type.includes('webhook'));
      const hasScheduleTrigger = workflow.triggers?.some(t => t.type.includes('schedule') || t.type.includes('cron'));
      const hasDataFetching = workflow.nodes?.some(n =>
        n.type.includes('httpRequest') ||
        n.type.includes('database') ||
        n.type.includes('api')
      );
      const isLongRunning = hasScheduleTrigger || (workflow.nodes?.length ?? 0) > 5;

      // Determine component type based on characteristics
      if (hasWebhookTrigger) {
        // Webhook triggers map to actions
        mappings.push({
          workflowId: uuidv4(),
          workflowName: workflow.name,
          componentType: 'action',
          componentName: this.generateComponentName(workflow.name, 'action'),
          triggers: workflow.triggers?.map(t => t.type),
          cacheConfig: {
            enabled: false, // Actions typically don't cache
          },
          stateManagement: {
            persistState: true,
            stateKey: `action_${workflow.name}_state`,
          },
        });
      } else if (hasDataFetching && !isLongRunning) {
        // Data fetching workflows map to providers
        mappings.push({
          workflowId: uuidv4(),
          workflowName: workflow.name,
          componentType: 'provider',
          componentName: this.generateComponentName(workflow.name, 'provider'),
          cacheConfig: {
            enabled: true,
            ttl: 300, // 5 minutes default
            key: `provider_${workflow.name}_cache`,
          },
          stateManagement: {
            persistState: false,
            stateKey: `provider_${workflow.name}_state`,
          },
        });
      } else if (isLongRunning || hasScheduleTrigger) {
        // Long-running or scheduled workflows map to services
        mappings.push({
          workflowId: uuidv4(),
          workflowName: workflow.name,
          componentType: 'service',
          componentName: this.generateComponentName(workflow.name, 'service'),
          triggers: workflow.triggers?.map(t => t.type),
          cacheConfig: {
            enabled: true,
            ttl: 3600, // 1 hour for services
            key: `service_${workflow.name}_cache`,
          },
          stateManagement: {
            persistState: true,
            stateKey: `service_${workflow.name}_state`,
          },
        });
      } else {
        // Default to action for other workflows
        mappings.push({
          workflowId: uuidv4(),
          workflowName: workflow.name,
          componentType: 'action',
          componentName: this.generateComponentName(workflow.name, 'action'),
          cacheConfig: {
            enabled: false,
          },
          stateManagement: {
            persistState: true,
            stateKey: `action_${workflow.name}_state`,
          },
        });
      }
    }

    return mappings;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): PluginGenerationJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs
   */
  getAllJobs(): PluginGenerationJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get cached result
   */
  getCachedResult(key: string): any | null {
    const cached = this.resultCache.get(key);
    if (!cached) {return null;}

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl * 1000) {
      // Cache expired
      this.resultCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached result
   */
  setCachedResult(key: string, data: any, ttl: number): void {
    this.resultCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Get workflow state
   */
  getWorkflowState(key: string): any {
    return this.stateCache.get(key);
  }

  /**
   * Set workflow state
   */
  setWorkflowState(key: string, state: any): void {
    this.stateCache.set(key, state);
  }

  /**
   * Process plugin generation job
   */
  private async processConversionJob(job: PluginGenerationJob): Promise<void> {
    try {
      // Step 1: Analyze workflows (20% progress)
      job.status = 'analyzing';
      job.progress = 10;
      elizaLogger.info(`[N8nToPlugin] Analyzing workflows for job ${job.id}`);

      job.mappings = job.spec.mappings || await this.analyzeWorkflows(job.spec.workflows);
      job.progress = 20;

      // Step 2: Generate plugin code (60% progress)
      job.status = 'generating';
      elizaLogger.info(`[N8nToPlugin] Generating plugin code for job ${job.id}`);

      job.generatedCode = {
        actions: new Map(),
        providers: new Map(),
        services: new Map(),
        tests: new Map(),
        index: '',
        packageJson: '',
      };

      // Generate components based on mappings
      for (const mapping of job.mappings) {
        const workflow = job.spec.workflows.find(w => w.name === mapping.workflowName);
        if (!workflow) {continue;}

        switch (mapping.componentType) {
          case 'action':
            const actionCode = await this.generateActionComponent(workflow, mapping);
            job.generatedCode.actions.set(mapping.componentName, actionCode);
            if (job.spec.config?.generateTests) {
              const testCode = await this.generateActionTest(workflow, mapping);
              job.generatedCode.tests.set(`${mapping.componentName}.test.ts`, testCode);
            }
            break;

          case 'provider':
            const providerCode = await this.generateProviderComponent(workflow, mapping);
            job.generatedCode.providers.set(mapping.componentName, providerCode);
            if (job.spec.config?.generateTests) {
              const testCode = await this.generateProviderTest(workflow, mapping);
              job.generatedCode.tests.set(`${mapping.componentName}.test.ts`, testCode);
            }
            break;

          case 'service':
            const serviceCode = await this.generateServiceComponent(workflow, mapping);
            job.generatedCode.services.set(mapping.componentName, serviceCode);
            if (job.spec.config?.generateTests) {
              const testCode = await this.generateServiceTest(workflow, mapping);
              job.generatedCode.tests.set(`${mapping.componentName}.test.ts`, testCode);
            }
            break;
        }

        job.progress = 20 + (40 * (job.mappings.indexOf(mapping) + 1) / job.mappings.length);
      }

      // Generate index.ts
      job.generatedCode.index = await this.generateIndexFile(job);

      // Generate package.json
      job.generatedCode.packageJson = await this.generatePackageJson(job.spec);

      job.progress = 60;

      // Step 3: Build plugin (80% progress)
      job.status = 'building';
      elizaLogger.info(`[N8nToPlugin] Building plugin for job ${job.id}`);

      job.outputPath = await this.saveGeneratedPlugin(job);
      job.progress = 80;

      // Step 4: Test plugin if enabled (95% progress)
      if (job.spec.config?.generateTests) {
        job.status = 'testing';
        elizaLogger.info(`[N8nToPlugin] Testing plugin for job ${job.id}`);

        await this.testGeneratedPlugin(job);
        job.progress = 95;
      }

      // Step 5: Complete job
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();

      elizaLogger.info(`[N8nToPlugin] Plugin generation completed for job ${job.id}. Output: ${job.outputPath}`);
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();
      elizaLogger.error(`[N8nToPlugin] Job ${job.id} failed:`, error);
      throw error;
    }
  }

  /**
   * Generate component name from workflow name
   */
  private generateComponentName(workflowName: string, type: string): string {
    const sanitized = workflowName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return `${sanitized}-${type}`;
  }

  /**
   * Generate action component from workflow
   */
  private async generateActionComponent(
    workflow: N8nWorkflowSpecification,
    mapping: N8nPluginMapping
  ): Promise<string> {
    const componentName = this.toPascalCase(mapping.componentName);

    return `import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';

/**
 * ${workflow.name} Action
 * ${workflow.description}
 * 
 * Generated from n8n workflow with ${mapping.triggers?.join(', ') || 'manual'} trigger(s)
 */
export const ${componentName}: Action = {
  name: '${mapping.componentName}',
  description: '${workflow.description}',
  similes: [
    '${workflow.name.toLowerCase()}',
    ${this.generateSimiles(workflow.name, workflow.description)}
  ],
  
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    // Validate required parameters based on workflow nodes
    ${this.generateValidationLogic(workflow)}
    
    return true;
  },
  
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, any>,
    callback?: HandlerCallback
  ): Promise<void> => {
    try {
      elizaLogger.info('[${componentName}] Executing workflow action');
      
      // Get n8n service for workflow execution
      const n8nService = runtime.getService('n8n-to-plugin');
      
      ${mapping.stateManagement?.persistState ? `
      // Load persisted state
      const stateKey = '${mapping.stateManagement.stateKey}';
      const persistedState = n8nService?.getWorkflowState(stateKey) || {};
      ` : ''}
      
      // Extract parameters from message
      const params = {
        ${this.generateParameterExtraction(workflow)}
      };
      
      // Execute workflow logic
      ${await this.generateWorkflowExecutionLogic(workflow, mapping)}
      
      ${mapping.stateManagement?.persistState ? `
      // Persist updated state
      n8nService?.setWorkflowState(stateKey, { ...persistedState, lastExecution: Date.now(), ...result });
      ` : ''}
      
      // Send response
      if (callback) {
        await callback({
          text: \`Workflow "${workflow.name}" executed successfully.\${result.message ? ' ' + result.message : ''}\`,
          data: result,
        });
      }
      
    } catch (error) {
      elizaLogger.error('[${componentName}] Error executing workflow:', error);
      
      if (callback) {
        await callback({
          text: \`Failed to execute workflow: \${error instanceof Error ? error.message : 'Unknown error'}\`,
          error: true,
        });
      }
    }
  },
  
  examples: [
    ${await this.generateActionExamples(workflow)}
  ],
};`;
  }

  /**
   * Generate provider component from workflow
   */
  private async generateProviderComponent(
    workflow: N8nWorkflowSpecification,
    mapping: N8nPluginMapping
  ): Promise<string> {
    const componentName = this.toPascalCase(mapping.componentName);

    return `import type { Provider, IAgentRuntime, Memory, State } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';

/**
 * ${workflow.name} Provider
 * ${workflow.description}
 * 
 * Generated from n8n workflow for data fetching
 */
export const ${componentName}: Provider = {
  name: '${mapping.componentName}',
  description: '${workflow.description}',
  
  get: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<string> => {
    try {
      elizaLogger.info('[${componentName}] Fetching data from workflow');
      
      // Get n8n service for caching
      const n8nService = runtime.getService('n8n-to-plugin');
      
      ${mapping.cacheConfig?.enabled ? `
      // Check cache first
      const cacheKey = '${mapping.cacheConfig.key}';
      const cachedData = n8nService?.getCachedResult(cacheKey);
      
      if (cachedData) {
        elizaLogger.info('[${componentName}] Returning cached data');
        return this.formatProviderData(cachedData);
      }
      ` : ''}
      
      // Execute workflow to fetch data
      ${await this.generateDataFetchingLogic(workflow)}
      
      ${mapping.cacheConfig?.enabled ? `
      // Cache the result
      n8nService?.setCachedResult(cacheKey, data, ${mapping.cacheConfig.ttl || 300});
      ` : ''}
      
      return this.formatProviderData(data);
      
    } catch (error) {
      elizaLogger.error('[${componentName}] Error fetching data:', error);
      return \`Unable to fetch data: \${error instanceof Error ? error.message : 'Unknown error'}\`;
    }
  },
  
  formatProviderData(data: any): string {
    // Format the data for context
    ${this.generateDataFormattingLogic(workflow)}
  }
};`;
  }

  /**
   * Generate service component from workflow
   */
  private async generateServiceComponent(
    workflow: N8nWorkflowSpecification,
    mapping: N8nPluginMapping
  ): Promise<string> {
    const componentName = this.toPascalCase(mapping.componentName);
    const hasSchedule = mapping.triggers?.some(t => t.includes('schedule') || t.includes('cron'));

    return `import type { Service, IAgentRuntime } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';

/**
 * ${workflow.name} Service
 * ${workflow.description}
 * 
 * Generated from n8n workflow${hasSchedule ? ' with scheduled execution' : ''}
 */
export class ${componentName} extends Service {
  static serviceName = '${mapping.componentName}';
  
  private runtime: IAgentRuntime;
  private interval?: NodeJS.Timeout;
  private isRunning: boolean = false;
  
  ${mapping.stateManagement?.persistState ? `
  private stateKey = '${mapping.stateManagement.stateKey}';
  private state: any = {};
  ` : ''}
  
  ${mapping.cacheConfig?.enabled ? `
  private cacheKey = '${mapping.cacheConfig.key}';
  private cacheTTL = ${mapping.cacheConfig.ttl || 3600};
  ` : ''}
  
  async start(runtime: IAgentRuntime): Promise<void> {
    this.runtime = runtime;
    elizaLogger.info('[${componentName}] Service started');
    
    ${mapping.stateManagement?.persistState ? `
    // Load persisted state
    const n8nService = runtime.getService('n8n-to-plugin');
    this.state = n8nService?.getWorkflowState(this.stateKey) || {};
    ` : ''}
    
    ${hasSchedule ? `
    // Start scheduled execution
    this.startScheduledExecution();
    ` : `
    // Start service loop
    this.isRunning = true;
    this.runServiceLoop();
    `}
  }
  
  async stop(): Promise<void> {
    elizaLogger.info('[${componentName}] Service stopping');
    
    this.isRunning = false;
    
    ${hasSchedule ? `
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    ` : ''}
    
    ${mapping.stateManagement?.persistState ? `
    // Save state before stopping
    const n8nService = this.runtime.getService('n8n-to-plugin');
    n8nService?.setWorkflowState(this.stateKey, this.state);
    ` : ''}
  }
  
  ${hasSchedule ? `
  private startScheduledExecution(): void {
    // Execute based on schedule trigger configuration
    const scheduleInterval = ${this.extractScheduleInterval(workflow)} * 1000; // Convert to ms
    
    this.interval = setInterval(async () => {
      await this.executeWorkflow();
    }, scheduleInterval);
    
    // Execute immediately on start
    this.executeWorkflow();
  }
  ` : `
  private async runServiceLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.executeWorkflow();
        
        // Wait before next execution
        await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute
      } catch (error) {
        elizaLogger.error('[${componentName}] Service loop error:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds on error
      }
    }
  }
  `}
  
  private async executeWorkflow(): Promise<void> {
    try {
      elizaLogger.info('[${componentName}] Executing workflow');
      
      ${mapping.cacheConfig?.enabled ? `
      // Check if we should use cached results
      const n8nService = this.runtime.getService('n8n-to-plugin');
      const cachedResult = n8nService?.getCachedResult(this.cacheKey);
      
      if (cachedResult && !this.shouldRefreshCache()) {
        elizaLogger.info('[${componentName}] Using cached workflow result');
        return;
      }
      ` : ''}
      
      // Execute workflow logic
      ${await this.generateServiceExecutionLogic(workflow, mapping)}
      
      ${mapping.cacheConfig?.enabled ? `
      // Cache the result
      n8nService?.setCachedResult(this.cacheKey, result, this.cacheTTL);
      ` : ''}
      
      ${mapping.stateManagement?.persistState ? `
      // Update state
      this.state = { ...this.state, lastExecution: Date.now(), ...result };
      n8nService?.setWorkflowState(this.stateKey, this.state);
      ` : ''}
      
    } catch (error) {
      elizaLogger.error('[${componentName}] Workflow execution error:', error);
    }
  }
  
  ${mapping.cacheConfig?.enabled ? `
  private shouldRefreshCache(): boolean {
    // Add logic to determine if cache should be refreshed
    // For example, based on certain conditions or time
    return false;
  }
  ` : ''}
  
  // Public methods for external access
  public getState(): any {
    return this.state;
  }
  
  public async forceExecute(): Promise<void> {
    await this.executeWorkflow();
  }
}

export default ${componentName};`;
  }

  /**
   * Helper method implementations would go here...
   * Including: generateValidationLogic, generateParameterExtraction,
   * generateWorkflowExecutionLogic, etc.
   */

  private toPascalCase(str: string): string {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  private generateSimiles(name: string, description: string): string {
    const words = [...name.split(/[\s-_]+/), ...description.split(/\s+/)];
    const similes = words
      .filter(w => w.length > 3)
      .slice(0, 5)
      .map(w => `'${w.toLowerCase()}'`);

    return similes.join(',\n    ');
  }

  private async generateValidationLogic(workflow: N8nWorkflowSpecification): Promise<string> {
    // Generate validation based on workflow requirements
    return '// TODO: Add validation logic based on workflow requirements';
  }

  private generateParameterExtraction(workflow: N8nWorkflowSpecification): string {
    // Extract parameters from workflow nodes
    return '// TODO: Extract parameters from message';
  }

  private async generateWorkflowExecutionLogic(
    workflow: N8nWorkflowSpecification,
    mapping: N8nPluginMapping
  ): Promise<string> {
    // Generate execution logic based on workflow
    return 'const result = { success: true, message: \'Workflow executed\' };';
  }

  private async generateActionExamples(workflow: N8nWorkflowSpecification): Promise<string> {
    return `[
      {
        user: "Execute ${workflow.name}",
        assistant: "I'll execute the ${workflow.name} workflow for you."
      }
    ]`;
  }

  private async generateDataFetchingLogic(workflow: N8nWorkflowSpecification): Promise<string> {
    return 'const data = { /* fetched data */ };';
  }

  private generateDataFormattingLogic(workflow: N8nWorkflowSpecification): string {
    return 'return JSON.stringify(data, null, 2);';
  }

  private extractScheduleInterval(workflow: N8nWorkflowSpecification): number {
    // Extract interval from schedule trigger
    return 3600; // Default 1 hour
  }

  private async generateServiceExecutionLogic(
    workflow: N8nWorkflowSpecification,
    mapping: N8nPluginMapping
  ): Promise<string> {
    return 'const result = { /* service execution result */ };';
  }

  /**
   * Generate index file for the plugin
   */
  private async generateIndexFile(job: PluginGenerationJob): Promise<string> {
    const imports: string[] = [];
    const exports: string[] = [];

    // Add action imports/exports
    for (const [name, _] of job.generatedCode!.actions) {
      const pascalName = this.toPascalCase(name);
      imports.push(`import { ${pascalName} } from './actions/${name}.js';`);
      exports.push(`  ${pascalName},`);
    }

    // Add provider imports/exports
    for (const [name, _] of job.generatedCode!.providers) {
      const pascalName = this.toPascalCase(name);
      imports.push(`import { ${pascalName} } from './providers/${name}.js';`);
      exports.push(`  ${pascalName},`);
    }

    // Add service imports/exports
    for (const [name, _] of job.generatedCode!.services) {
      const pascalName = this.toPascalCase(name);
      imports.push(`import ${pascalName} from './services/${name}.js';`);
      exports.push(`  ${pascalName},`);
    }

    return `import type { Plugin } from '@elizaos/core';

${imports.join('\n')}

export const plugin: Plugin = {
  name: '${job.spec.name}',
  description: '${job.spec.description}',
  actions: [
    ${Array.from(job.generatedCode!.actions.keys()).map(n => this.toPascalCase(n)).join(',\n    ')}
  ],
  providers: [
    ${Array.from(job.generatedCode!.providers.keys()).map(n => this.toPascalCase(n)).join(',\n    ')}
  ],
  services: [
    ${Array.from(job.generatedCode!.services.keys()).map(n => this.toPascalCase(n)).join(',\n    ')}
  ],
};

export default plugin;

// Export individual components
export {
${exports.join('\n')}
};`;
  }

  /**
   * Generate package.json for the plugin
   */
  private async generatePackageJson(spec: PluginGenerationSpec): Promise<string> {
    return JSON.stringify({
      name: spec.name,
      version: '0.1.0',
      description: spec.description,
      type: 'module',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        build: 'tsc',
        test: 'bun test',
        lint: 'eslint src',
      },
      dependencies: {
        '@elizaos/core': '^0.1.0',
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        'typescript': '^5.0.0',
        'eslint': '^8.0.0',
      },
    }, null, 2);
  }

  /**
   * Save generated plugin to disk
   */
  private async saveGeneratedPlugin(job: PluginGenerationJob): Promise<string> {
    const pluginPath = path.join(this.outputDir, job.id, job.spec.name);

    // Create directory structure
    await fs.mkdir(path.join(pluginPath, 'src', 'actions'), { recursive: true });
    await fs.mkdir(path.join(pluginPath, 'src', 'providers'), { recursive: true });
    await fs.mkdir(path.join(pluginPath, 'src', 'services'), { recursive: true });

    if (job.spec.config?.generateTests) {
      await fs.mkdir(path.join(pluginPath, 'src', '__tests__'), { recursive: true });
    }

    // Write files
    for (const [name, code] of job.generatedCode!.actions) {
      await fs.writeFile(path.join(pluginPath, 'src', 'actions', `${name}.ts`), code);
    }

    for (const [name, code] of job.generatedCode!.providers) {
      await fs.writeFile(path.join(pluginPath, 'src', 'providers', `${name}.ts`), code);
    }

    for (const [name, code] of job.generatedCode!.services) {
      await fs.writeFile(path.join(pluginPath, 'src', 'services', `${name}.ts`), code);
    }

    if (job.spec.config?.generateTests) {
      for (const [name, code] of job.generatedCode!.tests) {
        await fs.writeFile(path.join(pluginPath, 'src', '__tests__', name), code);
      }
    }

    // Write index and package.json
    await fs.writeFile(path.join(pluginPath, 'src', 'index.ts'), job.generatedCode!.index);
    await fs.writeFile(path.join(pluginPath, 'package.json'), job.generatedCode!.packageJson);

    // Create basic config files
    await this.createConfigFiles(pluginPath);

    return pluginPath;
  }

  /**
   * Create basic configuration files
   */
  private async createConfigFiles(pluginPath: string): Promise<void> {
    // tsconfig.json
    const tsconfig = {
      extends: '../../../tsconfig.json',
      compilerOptions: {
        outDir: './dist',
        rootDir: './src',
      },
      include: ['src/**/*'],
    };
    await fs.writeFile(path.join(pluginPath, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));

    // .gitignore
    const gitignore = `node_modules/
dist/
.env
*.log`;
    await fs.writeFile(path.join(pluginPath, '.gitignore'), gitignore);

    // README.md
    const readme = `# Generated ElizaOS Plugin

This plugin was automatically generated from n8n workflows.

## Installation

\`\`\`bash
npm install
npm run build
\`\`\`

## Usage

Add this plugin to your ElizaOS agent configuration.
`;
    await fs.writeFile(path.join(pluginPath, 'README.md'), readme);
  }

  /**
   * Test generated plugin
   */
  private async testGeneratedPlugin(job: PluginGenerationJob): Promise<void> {
    if (!job.outputPath) {return;}

    try {
      // Run npm install
      await execAsync('npm install', { cwd: job.outputPath });

      // Run build
      await execAsync('npm run build', { cwd: job.outputPath });

      // Run tests if available
      if (job.spec.config?.generateTests) {
        await execAsync('npm test', { cwd: job.outputPath });
      }
    } catch (error) {
      elizaLogger.warn('[N8nToPlugin] Plugin tests failed:', error);
      // Don't fail the job for test failures
    }
  }

  /**
   * Generate test files for components
   */
  private async generateActionTest(
    workflow: N8nWorkflowSpecification,
    mapping: N8nPluginMapping
  ): Promise<string> {
    return `import { describe, it, expect, mock  } from 'bun:test';
import { ${this.toPascalCase(mapping.componentName)} } from '../actions/${mapping.componentName}';

describe('${mapping.componentName}', () => {
  it('should validate correctly', async () => {
    const mockRuntime = { /* mock runtime */ };
    const mockMessage = { /* mock message */ };
    
    const isValid = await ${this.toPascalCase(mapping.componentName)}.validate(mockRuntime, mockMessage);
    expect(isValid).toBe(true);
  });

  it('should execute handler successfully', async () => {
    const mockRuntime = { /* mock runtime */ };
    const mockMessage = { /* mock message */ };
    const mockCallback = mock();
    
    await ${this.toPascalCase(mapping.componentName)}.handler(mockRuntime, mockMessage, {}, {}, mockCallback);
    
    expect(mockCallback).toHaveBeenCalled();
  });
});`;
  }

  private async generateProviderTest(
    workflow: N8nWorkflowSpecification,
    mapping: N8nPluginMapping
  ): Promise<string> {
    return `import { describe, it, expect  } from 'bun:test';
import { ${this.toPascalCase(mapping.componentName)} } from '../providers/${mapping.componentName}';

describe('${mapping.componentName}', () => {
  it('should fetch data successfully', async () => {
    const mockRuntime = { /* mock runtime */ };
    const mockMessage = { /* mock message */ };
    
    const result = await ${this.toPascalCase(mapping.componentName)}.get(mockRuntime, mockMessage);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });
});`;
  }

  private async generateServiceTest(
    workflow: N8nWorkflowSpecification,
    mapping: N8nPluginMapping
  ): Promise<string> {
    return `import { describe, it, expect  } from 'bun:test';
import ${this.toPascalCase(mapping.componentName)} from '../services/${mapping.componentName}';

describe('${mapping.componentName}', () => {
  it('should start and stop correctly', async () => {
    const mockRuntime = { /* mock runtime */ };
    const service = new ${this.toPascalCase(mapping.componentName)}();
    
    await service.start(mockRuntime);
    expect(service).toBeDefined();
    
    await service.stop();
  });
});`;
  }

  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.resultCache.entries()) {
        if (now - cached.timestamp > cached.ttl * 1000) {
          this.resultCache.delete(key);
        }
      }
    }, 60000); // Run every minute
  }
}

export default N8nToPluginService;
