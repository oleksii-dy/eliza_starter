import type { IAgentRuntime } from '@elizaos/core';
import { Service, elizaLogger } from '@elizaos/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';

const execAsync = promisify(exec);

export interface N8nWorkflowSpecification {
  name: string;
  description: string;
  nodes?: Array<{
    type: string;
    name: string;
    parameters?: Record<string, any>;
    credentials?: string[];
  }>;
  connections?: Array<{
    from: { node: string; output: string };
    to: { node: string; input: string };
  }>;
  triggers?: Array<{
    type: string;
    parameters?: Record<string, any>;
  }>;
  settings?: {
    executionOrder?: 'v0' | 'v1';
    timezone?: string;
    errorWorkflow?: string;
  };
  credentials?: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
  variables?: Record<string, any>;
}

export interface N8nWorkflowJob {
  id: string;
  specification: N8nWorkflowSpecification;
  status: 'pending' | 'generating' | 'validating' | 'completed' | 'failed';
  progress: number;
  result?: {
    workflowJson?: any;
    integrationCode?: string;
    documentation?: string;
    requiredCredentials?: string[];
  };
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export class N8nWorkflowService extends Service {
  static serviceName = 'n8n-workflow';
  capabilityDescription = 'Creates and manages n8n workflow configurations with AI assistance';

  private jobs: Map<string, N8nWorkflowJob> = new Map();
  private anthropic: Anthropic | null = null;
  private outputDir: string;

  constructor(runtime: IAgentRuntime) {
    super();
    this.outputDir = path.join(process.cwd(), '.eliza-temp', 'n8n-workflows');
  }

  async start(): Promise<void> {
    elizaLogger.info('[N8n] N8n Workflow Service started');

    // Initialize Anthropic if API key is available
    const apiKey = this.runtime?.getSetting('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }

    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });
  }

  async stop(): Promise<void> {
    elizaLogger.info('[N8n] N8n Workflow Service stopped');

    // Mark any running jobs as failed
    for (const job of this.jobs.values()) {
      if (job.status === 'pending' || job.status === 'generating' || job.status === 'validating') {
        job.status = 'failed';
        job.error = 'Service stopped';
        job.completedAt = new Date();
      }
    }
  }

  /**
   * Create an n8n workflow from specification
   */
  async createWorkflow(specification: N8nWorkflowSpecification): Promise<string> {
    const jobId = uuidv4();
    const job: N8nWorkflowJob = {
      id: jobId,
      specification,
      status: 'pending',
      progress: 0,
      startedAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // Start workflow creation process
    this.processWorkflowJob(job).catch((error) => {
      elizaLogger.error('[N8n] Failed to process workflow job:', error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();
    });

    return jobId;
  }

  /**
   * Convert natural language to workflow specification
   */
  async convertNaturalLanguageToSpec(description: string): Promise<N8nWorkflowSpecification> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    const prompt = `Convert this natural language description into an n8n workflow specification:

"${description}"

Create a JSON specification with:
- name: A short, descriptive name
- description: A clear description of what the workflow does
- nodes: Array of workflow nodes with types, names, and parameters
- connections: How nodes connect to each other
- triggers: Any trigger nodes needed
- credentials: Required credentials for integrations

Common n8n node types include:
- n8n-nodes-base.webhook (for webhooks)
- n8n-nodes-base.httpRequest (for API calls)
- n8n-nodes-base.function (for custom code)
- n8n-nodes-base.slack (for Slack integration)
- n8n-nodes-base.gmail (for email)
- n8n-nodes-base.postgres (for database)
- n8n-nodes-base.if (for conditionals)
- n8n-nodes-base.merge (for combining data)

Return ONLY valid JSON, no explanations.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Extract JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const spec = JSON.parse(jsonMatch[0]) as N8nWorkflowSpecification;

      // Validate required fields
      if (!spec.name || !spec.description) {
        throw new Error('Invalid specification: missing required fields');
      }

      return spec;
    } catch (error) {
      elizaLogger.error('[N8n] Failed to convert natural language to spec:', error);
      throw error;
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): N8nWorkflowJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all active (pending, generating, validating) jobs
   */
  getActiveJobs(): N8nWorkflowJob[] {
    return Array.from(this.jobs.values()).filter(
      (job) =>
        job.status === 'pending' || job.status === 'generating' || job.status === 'validating'
    );
  }

  /**
   * Get all jobs
   */
  getAllJobs(): N8nWorkflowJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Process workflow creation job
   */
  private async processWorkflowJob(job: N8nWorkflowJob): Promise<void> {
    try {
      // Step 1: Generate workflow JSON (40% progress)
      job.status = 'generating';
      job.progress = 20;
      elizaLogger.info(`[N8n] Generating workflow JSON for job ${job.id}`);

      const workflowJson = await this.generateWorkflowJson(job.specification);
      job.progress = 40;

      // Step 2: Generate integration code if needed (60% progress)
      let integrationCode: string | undefined;
      if (this.requiresIntegrationCode(job.specification)) {
        elizaLogger.info(`[N8n] Generating integration code for job ${job.id}`);
        integrationCode = await this.generateIntegrationCode(job.specification, workflowJson);
      }
      job.progress = 60;

      // Step 3: Validate workflow (80% progress)
      job.status = 'validating';
      elizaLogger.info(`[N8n] Validating workflow for job ${job.id}`);

      const validationResult = await this.validateWorkflow(workflowJson);
      if (!validationResult.valid) {
        throw new Error(`Workflow validation failed: ${validationResult.errors?.join(', ')}`);
      }
      job.progress = 80;

      // Step 4: Generate documentation (90% progress)
      const documentation = await this.generateDocumentation(job.specification, workflowJson);
      job.progress = 90;

      // Step 5: Save workflow and complete job
      const savedPath = await this.saveWorkflow(job.id, job.specification.name, {
        workflow: workflowJson,
        integrationCode,
        documentation,
      });

      job.status = 'completed';
      job.progress = 100;
      job.result = {
        workflowJson,
        integrationCode,
        documentation,
        requiredCredentials: this.extractRequiredCredentials(job.specification),
      };
      job.completedAt = new Date();

      elizaLogger.info(
        `[N8n] Workflow job ${job.id} completed successfully. Saved to: ${savedPath}`
      );
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();
      elizaLogger.error(`[N8n] Workflow job ${job.id} failed:`, error);
      throw error;
    }
  }

  /**
   * Generate n8n workflow JSON from specification
   */
  private async generateWorkflowJson(spec: N8nWorkflowSpecification): Promise<any> {
    const workflow: any = {
      name: spec.name,
      nodes: [],
      connections: {},
      active: false,
      settings: spec.settings || {},
      versionId: uuidv4(),
      id: uuidv4(),
    };

    // Generate Start node (always required)
    workflow.nodes.push({
      parameters: {},
      id: uuidv4(),
      name: 'Start',
      type: 'n8n-nodes-base.start',
      typeVersion: 1,
      position: [250, 300],
    });

    // Add trigger nodes
    let xPosition = 450;
    for (const trigger of spec.triggers || []) {
      const triggerId = uuidv4();
      workflow.nodes.push({
        parameters: trigger.parameters || {},
        id: triggerId,
        name: trigger.type.split('.').pop() || 'Trigger',
        type: trigger.type,
        typeVersion: 1,
        position: [xPosition, 300],
      });
      xPosition += 200;
    }

    // Add workflow nodes
    for (let i = 0; i < (spec.nodes || []).length; i++) {
      const node = spec.nodes![i];
      const nodeId = uuidv4();

      workflow.nodes.push({
        parameters: node.parameters || {},
        id: nodeId,
        name: node.name,
        type: node.type,
        typeVersion: 1,
        position: [xPosition, 300],
        credentials: node.credentials ? this.mapCredentials(node.credentials) : undefined,
      });

      xPosition += 200;
    }

    // Generate connections
    if (spec.connections && spec.connections.length > 0) {
      for (const conn of spec.connections) {
        const fromNode = workflow.nodes.find((n: any) => n.name === conn.from.node);
        const toNode = workflow.nodes.find((n: any) => n.name === conn.to.node);

        if (fromNode && toNode) {
          if (!workflow.connections[fromNode.name]) {
            workflow.connections[fromNode.name] = {};
          }

          const outputKey = conn.from.output || 'main';
          if (!workflow.connections[fromNode.name][outputKey]) {
            workflow.connections[fromNode.name][outputKey] = [];
          }

          workflow.connections[fromNode.name][outputKey].push([
            {
              node: toNode.name,
              type: 'main',
              index: parseInt(conn.to.input) || 0,
            },
          ]);
        }
      }
    } else {
      // Auto-generate sequential connections if not specified
      const connectableNodes = workflow.nodes.filter((n: any) => n.type !== 'n8n-nodes-base.start');
      for (let i = 0; i < connectableNodes.length - 1; i++) {
        const fromNode = connectableNodes[i];
        const toNode = connectableNodes[i + 1];

        if (!workflow.connections[fromNode.name]) {
          workflow.connections[fromNode.name] = { main: [[]] };
        }

        workflow.connections[fromNode.name].main[0].push({
          node: toNode.name,
          type: 'main',
          index: 0,
        });
      }
    }

    // Add variables if specified
    if (spec.variables) {
      workflow.variables = spec.variables;
    }

    return workflow;
  }

  /**
   * Check if workflow requires custom integration code
   */
  private requiresIntegrationCode(spec: N8nWorkflowSpecification): boolean {
    // Check if any nodes are custom functions or require complex logic
    return (spec.nodes || []).some(
      (node) =>
        node.type === 'n8n-nodes-base.function' ||
        node.type === 'n8n-nodes-base.functionItem' ||
        node.parameters?.code
    );
  }

  /**
   * Generate integration code for complex workflows
   */
  private async generateIntegrationCode(
    spec: N8nWorkflowSpecification,
    workflowJson: any
  ): Promise<string> {
    if (!this.anthropic) {
      return '// Integration code generation requires Anthropic API key';
    }

    const prompt = `Generate integration code for this n8n workflow:

Workflow: ${spec.name}
Description: ${spec.description}

Nodes that need code:
${(spec.nodes || [])
  .filter((n) => n.type.includes('function'))
  .map((n) => `- ${n.name}: ${n.parameters?.description || 'Custom logic'}`)
  .join('\n')}

Generate clean, well-commented JavaScript code for each function node.
Include error handling and logging.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return content.text;
    } catch (error) {
      elizaLogger.error('[N8n] Failed to generate integration code:', error);
      return '// Error generating integration code';
    }
  }

  /**
   * Validate workflow structure
   */
  private async validateWorkflow(
    workflowJson: any
  ): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    // Basic validation
    if (!workflowJson.name) {
      errors.push('Workflow must have a name');
    }

    if (!workflowJson.nodes || workflowJson.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    // Validate node structure
    for (const node of workflowJson.nodes || []) {
      if (!node.type) {
        errors.push(`Node ${node.name || 'unnamed'} must have a type`);
      }
      if (!node.name) {
        errors.push(`Node must have a name`);
      }
    }

    // Validate connections
    for (const [fromNode, connections] of Object.entries(workflowJson.connections || {})) {
      const fromNodeExists = workflowJson.nodes.some((n: any) => n.name === fromNode);
      if (!fromNodeExists) {
        errors.push(`Connection from non-existent node: ${fromNode}`);
      }

      for (const [output, targets] of Object.entries(connections as any)) {
        for (const targetList of targets as any[]) {
          for (const target of targetList) {
            const toNodeExists = workflowJson.nodes.some((n: any) => n.name === target.node);
            if (!toNodeExists) {
              errors.push(`Connection to non-existent node: ${target.node}`);
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Generate documentation for the workflow
   */
  private async generateDocumentation(
    spec: N8nWorkflowSpecification,
    workflowJson: any
  ): Promise<string> {
    const sections = [
      `# ${spec.name}`,
      '',
      `## Description`,
      spec.description,
      '',
      `## Workflow Overview`,
      `This workflow contains ${workflowJson.nodes.length} nodes.`,
      '',
    ];

    // Document triggers
    if (spec.triggers && spec.triggers.length > 0) {
      sections.push('## Triggers');
      for (const trigger of spec.triggers) {
        sections.push(`- **${trigger.type}**: Activates the workflow`);
      }
      sections.push('');
    }

    // Document nodes
    if (spec.nodes && spec.nodes.length > 0) {
      sections.push('## Nodes');
      for (const node of spec.nodes) {
        sections.push(`### ${node.name}`);
        sections.push(`- **Type**: ${node.type}`);
        if (node.parameters && Object.keys(node.parameters).length > 0) {
          sections.push(`- **Parameters**: ${JSON.stringify(node.parameters, null, 2)}`);
        }
        if (node.credentials && node.credentials.length > 0) {
          sections.push(`- **Required Credentials**: ${node.credentials.join(', ')}`);
        }
        sections.push('');
      }
    }

    // Document required credentials
    const requiredCreds = this.extractRequiredCredentials(spec);
    if (requiredCreds.length > 0) {
      sections.push('## Required Credentials');
      sections.push('The following credentials must be configured in n8n:');
      for (const cred of requiredCreds) {
        sections.push(`- ${cred}`);
      }
      sections.push('');
    }

    // Add setup instructions
    sections.push('## Setup Instructions');
    sections.push('1. Import the workflow JSON into n8n');
    sections.push('2. Configure all required credentials');
    sections.push('3. Test each node individually');
    sections.push('4. Activate the workflow when ready');

    return sections.join('\n');
  }

  /**
   * Save workflow files
   */
  private async saveWorkflow(
    jobId: string,
    workflowName: string,
    content: {
      workflow: any;
      integrationCode?: string;
      documentation?: string;
    }
  ): Promise<string> {
    const safeName = workflowName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const workflowDir = path.join(this.outputDir, `${safeName}-${jobId}`);

    await fs.mkdir(workflowDir, { recursive: true });

    // Save workflow JSON
    await fs.writeFile(
      path.join(workflowDir, 'workflow.json'),
      JSON.stringify(content.workflow, null, 2)
    );

    // Save integration code if present
    if (content.integrationCode) {
      await fs.writeFile(path.join(workflowDir, 'integration.js'), content.integrationCode);
    }

    // Save documentation
    if (content.documentation) {
      await fs.writeFile(path.join(workflowDir, 'README.md'), content.documentation);
    }

    // Create import instructions
    const importInstructions = `# Import Instructions

1. Open n8n
2. Go to Workflows > Import
3. Select workflow.json from this directory
4. Configure credentials as listed in README.md
5. Test and activate the workflow
`;

    await fs.writeFile(path.join(workflowDir, 'IMPORT.md'), importInstructions);

    return workflowDir;
  }

  /**
   * Extract required credentials from specification
   */
  private extractRequiredCredentials(spec: N8nWorkflowSpecification): string[] {
    const credentials = new Set<string>();

    // From explicit credentials
    if (spec.credentials) {
      spec.credentials.forEach((cred) => credentials.add(cred.name));
    }

    // From nodes
    if (spec.nodes) {
      spec.nodes.forEach((node) => {
        if (node.credentials) {
          node.credentials.forEach((cred) => credentials.add(cred));
        }
      });
    }

    return Array.from(credentials);
  }

  /**
   * Map credential names to n8n format
   */
  private mapCredentials(credentials: string[]): Record<string, any> {
    const mapped: Record<string, any> = {};

    for (const cred of credentials) {
      // Map common credential types
      if (cred.includes('api') || cred.includes('key')) {
        mapped[cred] = { id: null, name: cred };
      } else {
        mapped[cred] = { id: null, name: cred };
      }
    }

    return mapped;
  }
}
