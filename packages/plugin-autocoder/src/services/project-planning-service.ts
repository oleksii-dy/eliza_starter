import { Service, IAgentRuntime, ServiceType, elizaLogger, asUUID } from '@elizaos/core';
import { FormsService } from '@elizaos/plugin-forms';
import type { Form, FormTemplate } from '@elizaos/plugin-forms';
import { v4 as uuidv4 } from 'uuid';
import type {
  ProjectMetadata,
  ProjectType,
  ProjectStatus,
  IProjectPlanningService,
} from '../types';

/**
 * Project Planning Service
 * Manages project creation workflow using forms
 */
export class ProjectPlanningService extends Service implements IProjectPlanningService {
  static serviceName = 'project-planning';
  static serviceType = ServiceType.TASK;

  private projects: Map<string, ProjectMetadata> = new Map();
  private formsService: FormsService | null = null;

  capabilityDescription = 'Project planning and management service for auto-coding workflows';

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  async initialize(): Promise<void> {
    // Get forms service
    this.formsService = this.runtime.getService<FormsService>('forms');
    if (!this.formsService) {
      throw new Error('Forms service is required but not available');
    }

    // Register project planning form templates
    this.registerFormTemplates();
  }

  private registerFormTemplates() {
    if (!this.formsService) {
      return;
    }

    // Plugin project template
    const pluginTemplate: FormTemplate = {
      name: 'plugin-project',
      description: 'Create a new ElizaOS plugin',
      steps: [
        {
          id: 'basic-info',
          name: 'Basic Information',
          fields: [
            {
              id: 'projectName',
              label: 'Plugin Name',
              type: 'text',
              description: 'Name of your plugin (e.g., "weather-plugin")',
              criteria: 'Lowercase, hyphen-separated',
            },
            {
              id: 'projectDescription',
              label: 'Description',
              type: 'textarea',
              description: 'What does your plugin do?',
            },
          ],
        },
        {
          id: 'technical-details',
          name: 'Technical Details',
          fields: [
            {
              id: 'primaryFunction',
              label: 'Primary Function',
              type: 'textarea',
              description: 'Describe the main functionality in detail',
            },
            {
              id: 'keyFeatures',
              label: 'Key Features',
              type: 'textarea',
              description: 'List the key features (one per line)',
            },
            {
              id: 'requiredServices',
              label: 'Required Services',
              type: 'textarea',
              description: 'Any external services or APIs needed?',
              optional: true,
            },
          ],
        },
        {
          id: 'integration',
          name: 'Integration Requirements',
          fields: [
            {
              id: 'requiredPlugins',
              label: 'Required Plugins',
              type: 'textarea',
              description: 'Other ElizaOS plugins this depends on',
              optional: true,
            },
            {
              id: 'apiKeys',
              label: 'API Keys Needed',
              type: 'textarea',
              description: 'List any API keys or secrets needed',
              optional: true,
              secret: true,
            },
          ],
        },
      ],
    };

    // Agent project template
    const agentTemplate: FormTemplate = {
      name: 'agent-project',
      description: 'Create a new ElizaOS agent',
      steps: [
        {
          id: 'agent-basics',
          name: 'Agent Basics',
          fields: [
            {
              id: 'agentName',
              label: 'Agent Name',
              type: 'text',
              description: 'Name of your agent',
            },
            {
              id: 'agentPersonality',
              label: 'Personality',
              type: 'textarea',
              description: "Describe the agent's personality and behavior",
            },
            {
              id: 'agentGoals',
              label: 'Goals',
              type: 'textarea',
              description: 'What should this agent accomplish?',
            },
          ],
        },
        {
          id: 'agent-capabilities',
          name: 'Capabilities',
          fields: [
            {
              id: 'plugins',
              label: 'Plugins to Include',
              type: 'textarea',
              description: 'Which plugins should this agent use?',
            },
            {
              id: 'customActions',
              label: 'Custom Actions',
              type: 'textarea',
              description: 'Any custom actions needed?',
              optional: true,
            },
          ],
        },
      ],
    };

    // Register templates
    this.formsService.registerTemplate(pluginTemplate);
    this.formsService.registerTemplate(agentTemplate);
  }

  /**
   * Create a new project
   */
  async createProject(type: ProjectType, initialData?: any): Promise<ProjectMetadata> {
    if (!this.formsService) {
      throw new Error('Forms service not available');
    }

    const projectId = asUUID(uuidv4());

    // Determine form template based on project type
    let templateName: string;
    switch (type) {
      case 'plugin':
        templateName = 'plugin-project';
        break;
      case 'agent':
        templateName = 'agent-project';
        break;
      default:
        templateName = 'plugin-project'; // Default to plugin for now
    }

    // Create form with callbacks
    const form = await this.formsService.createForm(templateName, {
      projectId,
      projectType: type,
    });

    // Set up form completion callback
    form.onComplete = async (completedForm: Form) => {
      await this.handleFormCompletion(projectId, completedForm);
    };

    // Create project metadata
    const project: ProjectMetadata = {
      id: projectId,
      name: `New ${type} Project`,
      description: `Creating a new ${type}`,
      type,
      status: 'planning',
      formId: form.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      details: initialData || {},
    };

    this.projects.set(projectId, project);
    elizaLogger.info(`Created project ${projectId} of type ${type}`);

    return project;
  }

  /**
   * Handle form completion
   */
  private async handleFormCompletion(projectId: string, form: Form) {
    const project = this.projects.get(projectId);
    if (!project) {
      elizaLogger.error(`Project ${projectId} not found`);
      return;
    }

    // Extract form data
    const formData: Record<string, any> = {};
    for (const step of form.steps) {
      for (const field of step.fields) {
        if (field.value !== undefined) {
          formData[field.id] = field.value;
        }
      }
    }

    // Update project details
    project.details = {
      ...project.details,
      ...formData,
      keyFeatures: formData.keyFeatures?.split('\n').filter((f: string) => f.trim()),
      requiredPlugins: formData.requiredPlugins?.split('\n').filter((p: string) => p.trim()),
    };

    project.status = 'generating';
    project.updatedAt = Date.now();

    elizaLogger.info(`Project ${projectId} planning completed, ready for generation`);

    // Trigger project generation
    // Note: In a real implementation, this would call the code generation service
    setTimeout(() => {
      this.generateProject(projectId);
    }, 1000);
  }

  /**
   * Update an existing project
   */
  async updateProject(
    projectId: string,
    updates: Partial<ProjectMetadata>
  ): Promise<ProjectMetadata> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Update project metadata
    Object.assign(project, updates, {
      updatedAt: Date.now(),
    });

    elizaLogger.info(`Updated project ${projectId}`);
    return project;
  }

  /**
   * Get a project by ID
   */
  async getProject(projectId: string): Promise<ProjectMetadata | null> {
    return this.projects.get(projectId) || null;
  }

  /**
   * List all projects
   */
  async listProjects(status?: ProjectStatus): Promise<ProjectMetadata[]> {
    const projects = Array.from(this.projects.values());

    if (status) {
      return projects.filter((p) => p.status === status);
    }

    return projects;
  }

  /**
   * Generate project code
   */
  async generateProject(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    elizaLogger.info(`Generating code for project ${projectId}`);

    try {
      // Simulate code generation
      // In real implementation, this would:
      // 1. Call code generation service
      // 2. Create project files
      // 3. Run tests
      // 4. Deploy/publish if needed

      project.status = 'testing';
      project.updatedAt = Date.now();

      // Simulate test phase
      setTimeout(() => {
        project.status = 'completed';
        project.completedAt = Date.now();
        project.artifacts = {
          files: [
            {
              path: 'package.json',
              content: `{ "name": "${project.details?.projectName}" }`,
            },
            {
              path: 'src/index.ts',
              content: '// Generated plugin code',
            },
          ],
          testResults: {
            passed: true,
            summary: 'All tests passed',
            details: {},
          },
        };

        elizaLogger.info(`Project ${projectId} completed successfully`);
      }, 3000);
    } catch (error) {
      project.status = 'failed';
      project.error = error instanceof Error ? error.message : 'Unknown error';
      project.updatedAt = Date.now();

      elizaLogger.error(`Project ${projectId} generation failed:`, error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    // Cleanup if needed
  }
}
