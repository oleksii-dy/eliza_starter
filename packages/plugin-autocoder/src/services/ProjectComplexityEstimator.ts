import { Service, elizaLogger } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';

export interface ProjectRequirements {
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  estimatedHours: number;
  requiredAgents: {
    total: number;
    roles: AgentRole[];
  };
  tasks: ProjectTask[];
  dependencies: TaskDependency[];
}

export interface AgentRole {
  role: 'lead' | 'backend' | 'frontend' | 'database' | 'testing' | 'devops' | 'reviewer';
  count: number;
  skills: string[];
}

export interface ProjectTask {
  id: string;
  name: string;
  description: string;
  assignedRole: string;
  estimatedHours: number;
  dependencies: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'blocked' | 'review' | 'completed';
}

export interface TaskDependency {
  taskId: string;
  dependsOn: string[];
  type: 'blocking' | 'soft';
}

interface ComplexityFactors {
  technologies: string[];
  features: string[];
  integrations: string[];
  hasAuth: boolean;
  hasDatabase: boolean;
  hasRealtime: boolean;
  hasPayments: boolean;
  hasML: boolean;
  hasBlockchain: boolean;
  requiresScaling: boolean;
  requiresSecurity: boolean;
}

/**
 * Service for estimating project complexity and determining agent requirements
 */
export class ProjectComplexityEstimator extends Service {
  static _serviceName = 'project-complexity-estimator';
  static serviceType = 'planning' as const;

  capabilityDescription = 'Estimates project complexity and determines optimal agent allocation';

  constructor(_runtime?: IAgentRuntime) {
    super(_runtime);
  }

  static async start(_runtime: IAgentRuntime): Promise<ProjectComplexityEstimator> {
    const service = new ProjectComplexityEstimator(_runtime);
    elizaLogger.info('ProjectComplexityEstimator service started');
    return service;
  }

  /**
   * Estimate project requirements based on description
   */
  async estimateProject(description: string): Promise<ProjectRequirements> {
    elizaLogger.info('Estimating project complexity', { description });

    // Extract complexity factors from description
    const factors = this.extractComplexityFactors(description);

    // Calculate complexity score
    const complexityScore = this.calculateComplexityScore(factors);

    // Determine complexity level
    const complexity = this.getComplexityLevel(complexityScore);

    // Generate tasks based on requirements
    const tasks = this.generateTasks(factors, complexity);

    // Determine agent requirements
    const requiredAgents = this.determineAgentRequirements(tasks, complexity);

    // Calculate estimated hours
    const estimatedHours = tasks.reduce((sum, task) => sum + task.estimatedHours, 0);

    // Build dependency graph
    const dependencies = this.buildDependencies(tasks);

    return {
      complexity,
      estimatedHours,
      requiredAgents,
      tasks,
      dependencies,
    };
  }

  private extractComplexityFactors(description: string): ComplexityFactors {
    const lower = description.toLowerCase();

    return {
      technologies: this.extractTechnologies(lower),
      features: this.extractFeatures(lower),
      integrations: this.extractIntegrations(lower),
      hasAuth: /auth|login|user|account|sign|oauth|jwt/i.test(lower),
      hasDatabase: /database|db|postgres|mysql|mongo|redis|sql/i.test(lower),
      hasRealtime: /realtime|real-time|websocket|live|chat|notification/i.test(lower),
      hasPayments: /payment|stripe|paypal|billing|subscription|checkout/i.test(lower),
      hasML: /machine learning|ml|ai|neural|model|prediction/i.test(lower),
      hasBlockchain: /blockchain|smart contract|web3|crypto|defi|nft/i.test(lower),
      requiresScaling: /scale|scaling|performance|load|concurrent|million/i.test(lower),
      requiresSecurity: /security|secure|encryption|compliance|gdpr|hipaa/i.test(lower),
    };
  }

  private extractTechnologies(text: string): string[] {
    const technologies = [];

    // Frontend frameworks
    if (/react|nextjs|next\.js/i.test(text)) technologies.push('react');
    if (/vue|nuxt/i.test(text)) technologies.push('vue');
    if (/angular/i.test(text)) technologies.push('angular');
    if (/svelte/i.test(text)) technologies.push('svelte');

    // Backend frameworks
    if (/node|express|fastify|nestjs/i.test(text)) technologies.push('node');
    if (/python|django|flask|fastapi/i.test(text)) technologies.push('python');
    if (/ruby|rails/i.test(text)) technologies.push('ruby');
    if (/java|spring/i.test(text)) technologies.push('java');
    if (/go|golang/i.test(text)) technologies.push('go');

    // Databases
    if (/postgres|postgresql/i.test(text)) technologies.push('postgresql');
    if (/mysql|mariadb/i.test(text)) technologies.push('mysql');
    if (/mongo|mongodb/i.test(text)) technologies.push('mongodb');
    if (/redis/i.test(text)) technologies.push('redis');

    // Other
    if (/docker|kubernetes|k8s/i.test(text)) technologies.push('containerization');
    if (/graphql/i.test(text)) technologies.push('graphql');
    if (/rest|api/i.test(text)) technologies.push('rest-api');

    return technologies;
  }

  private extractFeatures(text: string): string[] {
    const features = [];

    if (/crud|create|read|update|delete/i.test(text)) features.push('crud');
    if (/search/i.test(text)) features.push('search');
    if (/filter|sort/i.test(text)) features.push('filtering');
    if (/upload|file|image|media/i.test(text)) features.push('file-upload');
    if (/email|mail|notification/i.test(text)) features.push('notifications');
    if (/dashboard|analytics|report/i.test(text)) features.push('dashboard');
    if (/admin|management/i.test(text)) features.push('admin-panel');
    if (/mobile|responsive/i.test(text)) features.push('mobile');
    if (/offline|pwa/i.test(text)) features.push('offline');
    if (/export|pdf|excel|csv/i.test(text)) features.push('export');
    if (/import|bulk/i.test(text)) features.push('import');
    if (/workflow|automation/i.test(text)) features.push('workflow');

    return features;
  }

  private extractIntegrations(text: string): string[] {
    const integrations = [];

    if (/stripe/i.test(text)) integrations.push('stripe');
    if (/paypal/i.test(text)) integrations.push('paypal');
    if (/aws|amazon/i.test(text)) integrations.push('aws');
    if (/google|gcp/i.test(text)) integrations.push('google');
    if (/azure/i.test(text)) integrations.push('azure');
    if (/slack/i.test(text)) integrations.push('slack');
    if (/discord/i.test(text)) integrations.push('discord');
    if (/twitter|x\.com/i.test(text)) integrations.push('twitter');
    if (/github/i.test(text)) integrations.push('github');
    if (/openai|gpt|claude/i.test(text)) integrations.push('ai-api');

    return integrations;
  }

  private calculateComplexityScore(factors: ComplexityFactors): number {
    let score = 0;

    // Technology stack complexity
    score += factors.technologies.length * 2;

    // Feature complexity
    score += factors.features.length * 1.5;

    // Integration complexity
    score += factors.integrations.length * 3;

    // Special requirements
    if (factors.hasAuth) score += 3;
    if (factors.hasDatabase) score += 2;
    if (factors.hasRealtime) score += 4;
    if (factors.hasPayments) score += 5;
    if (factors.hasML) score += 8;
    if (factors.hasBlockchain) score += 7;
    if (factors.requiresScaling) score += 5;
    if (factors.requiresSecurity) score += 4;

    return score;
  }

  private getComplexityLevel(score: number): ProjectRequirements['complexity'] {
    if (score < 10) return 'simple';
    if (score < 25) return 'moderate';
    if (score < 50) return 'complex';
    return 'enterprise';
  }

  private generateTasks(
    factors: ComplexityFactors,
    complexity: ProjectRequirements['complexity']
  ): ProjectTask[] {
    const tasks: ProjectTask[] = [];
    let taskId = 1;

    // Core setup tasks
    tasks.push({
      id: `task-${taskId++}`,
      name: 'Project Setup',
      description: 'Initialize repository, setup development environment, configure build tools',
      assignedRole: 'lead',
      estimatedHours: 2,
      dependencies: [],
      priority: 'critical',
      status: 'pending',
    });

    // Database tasks
    if (factors.hasDatabase) {
      tasks.push({
        id: `task-${taskId++}`,
        name: 'Database Design',
        description: 'Design database schema, create models, setup migrations',
        assignedRole: 'database',
        estimatedHours: 4,
        dependencies: ['task-1'],
        priority: 'critical',
        status: 'pending',
      });
    }

    // Backend tasks
    if (factors.technologies.some((t) => ['node', 'python', 'ruby', 'java', 'go'].includes(t))) {
      tasks.push({
        id: `task-${taskId++}`,
        name: 'API Development',
        description: 'Implement RESTful/GraphQL API endpoints',
        assignedRole: 'backend',
        estimatedHours: 8,
        dependencies: factors.hasDatabase ? ['task-2'] : ['task-1'],
        priority: 'high',
        status: 'pending',
      });
    }

    // Frontend tasks
    if (factors.technologies.some((t) => ['react', 'vue', 'angular', 'svelte'].includes(t))) {
      tasks.push({
        id: `task-${taskId++}`,
        name: 'UI Components',
        description: 'Build reusable UI components and layouts',
        assignedRole: 'frontend',
        estimatedHours: 6,
        dependencies: ['task-1'],
        priority: 'high',
        status: 'pending',
      });
    }

    // Authentication
    if (factors.hasAuth) {
      tasks.push({
        id: `task-${taskId++}`,
        name: 'Authentication System',
        description: 'Implement user authentication and authorization',
        assignedRole: 'backend',
        estimatedHours: 6,
        dependencies: ['task-3'],
        priority: 'high',
        status: 'pending',
      });
    }

    // Feature-specific tasks
    factors.features.forEach((feature) => {
      const hours = complexity === 'simple' ? 2 : complexity === 'moderate' ? 4 : 6;
      tasks.push({
        id: `task-${taskId++}`,
        name: `Implement ${feature}`,
        description: `Build ${feature} functionality`,
        assignedRole:
          feature.includes('ui') || feature.includes('dashboard') ? 'frontend' : 'backend',
        estimatedHours: hours,
        dependencies: ['task-3'],
        priority: 'medium',
        status: 'pending',
      });
    });

    // Testing tasks
    tasks.push({
      id: `task-${taskId++}`,
      name: 'Unit Tests',
      description: 'Write unit tests for core functionality',
      assignedRole: 'testing',
      estimatedHours: 4,
      dependencies: tasks.slice(1, -1).map((t) => t.id),
      priority: 'medium',
      status: 'pending',
    });

    // Review task
    tasks.push({
      id: `task-${taskId++}`,
      name: 'Code Review',
      description: 'Review all code for quality and security',
      assignedRole: 'reviewer',
      estimatedHours: 2,
      dependencies: [tasks[tasks.length - 1].id],
      priority: 'high',
      status: 'pending',
    });

    return tasks;
  }

  private determineAgentRequirements(
    tasks: ProjectTask[],
    complexity: ProjectRequirements['complexity']
  ): ProjectRequirements['requiredAgents'] {
    const roleCount = new Map<string, number>();

    // Count tasks per role
    tasks.forEach((task) => {
      roleCount.set(task.assignedRole, (roleCount.get(task.assignedRole) || 0) + 1);
    });

    // Determine agent count based on complexity
    const roles: AgentRole[] = [];

    // Always need a lead
    roles.push({
      role: 'lead',
      count: 1,
      skills: ['project-management', 'architecture', 'coordination'],
    });

    // Add other roles based on task distribution
    if (roleCount.get('backend')) {
      const count = complexity === 'simple' ? 1 : complexity === 'moderate' ? 2 : 3;
      roles.push({
        role: 'backend',
        count: Math.min(count, Math.ceil((roleCount.get('backend') || 0) / 3)),
        skills: ['api', 'database', 'business-logic'],
      });
    }

    if (roleCount.get('frontend')) {
      const count = complexity === 'simple' ? 1 : complexity === 'moderate' ? 1 : 2;
      roles.push({
        role: 'frontend',
        count: Math.min(count, Math.ceil((roleCount.get('frontend') || 0) / 3)),
        skills: ['ui', 'ux', 'responsive-design'],
      });
    }

    if (roleCount.get('database')) {
      roles.push({
        role: 'database',
        count: 1,
        skills: ['schema-design', 'optimization', 'migrations'],
      });
    }

    // Always include testing and review
    roles.push({
      role: 'testing',
      count: 1,
      skills: ['unit-testing', 'e2e-testing', 'test-automation'],
    });

    roles.push({
      role: 'reviewer',
      count: 1,
      skills: ['code-review', 'security', 'best-practices'],
    });

    const total = roles.reduce((sum, role) => sum + role.count, 0);

    return { total, roles };
  }

  private buildDependencies(tasks: ProjectTask[]): TaskDependency[] {
    return tasks
      .filter((task) => task.dependencies.length > 0)
      .map((task) => ({
        taskId: task.id,
        dependsOn: task.dependencies,
        type: 'blocking' as const,
      }));
  }

  /**
   * Get next available tasks for an agent
   */
  getAvailableTasks(tasks: ProjectTask[], role: string): ProjectTask[] {
    return tasks.filter((task) => {
      // Task must be for this role
      if (task.assignedRole !== role) return false;

      // Task must be pending
      if (task.status !== 'pending') return false;

      // All dependencies must be completed
      const deps = tasks.filter((t) => task.dependencies.includes(t.id));
      return deps.every((dep) => dep.status === 'completed');
    });
  }

  /**
   * Check if an agent should sleep
   */
  shouldAgentSleep(tasks: ProjectTask[], role: string): boolean {
    const availableTasks = this.getAvailableTasks(tasks, role);

    if (availableTasks.length > 0) return false;

    // Check if there are any pending tasks for this role
    const pendingForRole = tasks.some(
      (task) => task.assignedRole === role && task.status === 'pending'
    );

    // If there are pending tasks but none available, agent should sleep
    return pendingForRole;
  }

  /**
   * Update task status
   */
  updateTaskStatus(tasks: ProjectTask[], taskId: string, status: ProjectTask['status']): void {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = status;
      elizaLogger.info('Task status updated', { taskId, status });
    }
  }

  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    elizaLogger.info('Stopping ProjectComplexityEstimator service');
  }
}
