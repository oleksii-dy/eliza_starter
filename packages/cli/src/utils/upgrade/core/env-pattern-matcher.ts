import { logger } from '@elizaos/core';
import { ClaudeAdapter } from '../claude-sdk/adapter.js';
import type { EnvVar, ProjectContext } from './ai-env-config-manager.js';

export interface PatternTemplate {
  name: string;
  category: string;
  variables: EnvVar[];
  conditions: string[];
  confidence: number;
  description: string;
  examples: string[];
}

export interface MatchResult {
  pattern: PatternTemplate;
  matches: EnvVar[];
  confidence: number;
  reason: string;
}

/**
 * Environment Variable Pattern Matcher
 *
 * Matches environment variable patterns from similar projects and known configurations
 * using AI-powered analysis and pre-defined templates.
 */
export class EnvPatternMatcher {
  private patterns: Map<string, PatternTemplate[]> = new Map();
  private knowledgeBase: Map<string, any> = new Map();

  constructor(private claude: ClaudeAdapter) {
    this.initializePatterns();
  }

  /**
   * Find matching patterns for the given project context
   */
  async findPatterns(context: ProjectContext, detected: EnvVar[]): Promise<EnvVar[]> {
    logger.info('🔗 Starting pattern matching analysis...');

    const matches: EnvVar[] = [];
    const matchResults: MatchResult[] = [];

    // 1. Framework-based pattern matching
    const frameworkMatches = await this.matchFrameworkPatterns(context);
    matches.push(...frameworkMatches);

    // 2. Project type pattern matching
    const typeMatches = await this.matchProjectTypePatterns(context);
    matches.push(...typeMatches);

    // 3. Dependency-based pattern matching
    const dependencyMatches = await this.matchDependencyPatterns(context);
    matches.push(...dependencyMatches);

    // 4. AI-powered similar project analysis
    const aiMatches = await this.aiMatchSimilarProjects(context, detected);
    matches.push(...aiMatches);

    // 5. Feature-based pattern matching
    const featureMatches = await this.matchFeaturePatterns(context);
    matches.push(...featureMatches);

    // Deduplicate and enhance confidence scores
    const uniqueMatches = this.deduplicateAndEnhance(matches, detected);

    logger.info(`🔗 Pattern matching found ${uniqueMatches.length} additional variables`);
    return uniqueMatches;
  }

  /**
   * Get patterns for a specific category
   */
  async getPatterns(category: string): Promise<PatternTemplate[]> {
    return this.patterns.get(category) || [];
  }

  /**
   * Initialize built-in pattern templates
   */
  private initializePatterns(): void {
    this.initializeElizaOSPatterns();
    this.initializeBlockchainPatterns();
    this.initializeAPIPatterns();
    this.initializeDatabasePatterns();
    this.initializeAuthPatterns();
    this.initializeMonitoringPatterns();
    this.initializeDeploymentPatterns();
  }

  /**
   * ElizaOS-specific patterns
   */
  private initializeElizaOSPatterns(): void {
    const elizaPatterns: PatternTemplate[] = [
      {
        name: 'ElizaOS Plugin',
        category: 'elizaos',
        variables: [
          {
            name: 'ANTHROPIC_API_KEY',
            type: 'secret',
            category: 'api',
            required: true,
            description: 'Anthropic API key for Claude integration',
            dependencies: [],
            usageContext: ['claude-integration'],
            confidence: 0.95,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'secret',
          },
          {
            name: 'OPENAI_API_KEY',
            type: 'secret',
            category: 'api',
            required: false,
            description: 'OpenAI API key for alternative AI models',
            dependencies: [],
            usageContext: ['openai-integration'],
            confidence: 0.8,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'secret',
          },
          {
            name: 'LOG_LEVEL',
            type: 'config',
            category: 'runtime',
            required: false,
            description: 'Logging level for runtime output',
            defaultValue: 'info',
            dependencies: [],
            usageContext: ['logging'],
            confidence: 0.9,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'public',
          },
          {
            name: 'NODE_ENV',
            type: 'config',
            category: 'runtime',
            required: true,
            description: 'Node.js environment mode',
            defaultValue: 'development',
            dependencies: [],
            usageContext: ['runtime'],
            confidence: 0.95,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'public',
          },
        ],
        conditions: ['framework includes elizaos'],
        confidence: 0.95,
        description: 'Standard ElizaOS plugin configuration',
        examples: ['plugin-evm', 'plugin-twitter', 'plugin-discord'],
      },
    ];

    this.patterns.set('elizaos', elizaPatterns);
  }

  /**
   * Blockchain-specific patterns
   */
  private initializeBlockchainPatterns(): void {
    const blockchainPatterns: PatternTemplate[] = [
      {
        name: 'Ethereum Integration',
        category: 'blockchain',
        variables: [
          {
            name: 'RPC_URL',
            type: 'url',
            category: 'service',
            required: true,
            description: 'Ethereum RPC endpoint URL',
            dependencies: [],
            usageContext: ['blockchain'],
            confidence: 0.95,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'internal',
          },
          {
            name: 'PRIVATE_KEY',
            type: 'secret',
            category: 'auth',
            required: false,
            description: 'Private key for wallet operations',
            dependencies: [],
            usageContext: ['wallet'],
            confidence: 0.9,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'critical',
          },
          {
            name: 'CHAIN_ID',
            type: 'config',
            category: 'blockchain',
            required: true,
            description: 'Blockchain network chain ID',
            dependencies: ['RPC_URL'],
            usageContext: ['blockchain'],
            confidence: 0.85,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'public',
          },
          {
            name: 'GAS_LIMIT',
            type: 'config',
            category: 'blockchain',
            required: false,
            description: 'Default gas limit for transactions',
            defaultValue: '21000',
            dependencies: [],
            usageContext: ['transactions'],
            confidence: 0.8,
            source: 'pattern',
            deploymentSpecific: false,
            securityLevel: 'public',
          },
        ],
        conditions: ['hasBlockchain', 'dependencies includes viem OR ethers'],
        confidence: 0.9,
        description: 'Standard Ethereum blockchain integration',
        examples: ['DeFi protocols', 'NFT platforms', 'Web3 applications'],
      },
    ];

    this.patterns.set('blockchain', blockchainPatterns);
  }

  /**
   * API service patterns
   */
  private initializeAPIPatterns(): void {
    const apiPatterns: PatternTemplate[] = [
      {
        name: 'REST API Service',
        category: 'api',
        variables: [
          {
            name: 'PORT',
            type: 'config',
            category: 'service',
            required: false,
            description: 'HTTP server port',
            defaultValue: '3000',
            dependencies: [],
            usageContext: ['http-server'],
            confidence: 0.9,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'public',
          },
          {
            name: 'HOST',
            type: 'config',
            category: 'service',
            required: false,
            description: 'HTTP server host address',
            defaultValue: 'localhost',
            dependencies: [],
            usageContext: ['http-server'],
            confidence: 0.85,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'public',
          },
          {
            name: 'API_BASE_URL',
            type: 'url',
            category: 'service',
            required: false,
            description: 'Base URL for API endpoints',
            dependencies: ['HOST', 'PORT'],
            usageContext: ['api'],
            confidence: 0.8,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'public',
          },
          {
            name: 'CORS_ORIGIN',
            type: 'config',
            category: 'service',
            required: false,
            description: 'CORS allowed origins',
            defaultValue: '*',
            dependencies: [],
            usageContext: ['cors'],
            confidence: 0.75,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'internal',
          },
        ],
        conditions: ['hasAPI', 'type is service'],
        confidence: 0.85,
        description: 'Standard REST API service configuration',
        examples: ['Express.js apps', 'Fastify services', 'Koa applications'],
      },
    ];

    this.patterns.set('api', apiPatterns);
  }

  /**
   * Database patterns
   */
  private initializeDatabasePatterns(): void {
    const dbPatterns: PatternTemplate[] = [
      {
        name: 'PostgreSQL Database',
        category: 'database',
        variables: [
          {
            name: 'DATABASE_URL',
            type: 'url',
            category: 'database',
            required: true,
            description: 'PostgreSQL connection string',
            dependencies: [],
            usageContext: ['database'],
            confidence: 0.95,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'secret',
          },
          {
            name: 'DB_HOST',
            type: 'config',
            category: 'database',
            required: false,
            description: 'Database host address',
            defaultValue: 'localhost',
            dependencies: [],
            usageContext: ['database'],
            confidence: 0.9,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'internal',
          },
          {
            name: 'DB_PORT',
            type: 'config',
            category: 'database',
            required: false,
            description: 'Database port number',
            defaultValue: '5432',
            dependencies: [],
            usageContext: ['database'],
            confidence: 0.85,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'internal',
          },
          {
            name: 'DB_NAME',
            type: 'config',
            category: 'database',
            required: false,
            description: 'Database name',
            dependencies: [],
            usageContext: ['database'],
            confidence: 0.9,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'internal',
          },
          {
            name: 'DB_USER',
            type: 'config',
            category: 'database',
            required: false,
            description: 'Database username',
            dependencies: [],
            usageContext: ['database'],
            confidence: 0.9,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'secret',
          },
          {
            name: 'DB_PASSWORD',
            type: 'secret',
            category: 'database',
            required: false,
            description: 'Database password',
            dependencies: [],
            usageContext: ['database'],
            confidence: 0.9,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'secret',
          },
        ],
        conditions: ['hasDatabase', 'dependencies includes pg OR postgres'],
        confidence: 0.9,
        description: 'PostgreSQL database configuration',
        examples: ['PostgREST APIs', 'Prisma applications', 'TypeORM projects'],
      },
    ];

    this.patterns.set('database', dbPatterns);
  }

  /**
   * Authentication patterns
   */
  private initializeAuthPatterns(): void {
    const authPatterns: PatternTemplate[] = [
      {
        name: 'JWT Authentication',
        category: 'auth',
        variables: [
          {
            name: 'JWT_SECRET',
            type: 'secret',
            category: 'auth',
            required: true,
            description: 'JWT token signing secret',
            dependencies: [],
            usageContext: ['authentication'],
            confidence: 0.95,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'critical',
          },
          {
            name: 'JWT_EXPIRES_IN',
            type: 'config',
            category: 'auth',
            required: false,
            description: 'JWT token expiration time',
            defaultValue: '1h',
            dependencies: ['JWT_SECRET'],
            usageContext: ['authentication'],
            confidence: 0.8,
            source: 'pattern',
            deploymentSpecific: false,
            securityLevel: 'public',
          },
          {
            name: 'REFRESH_TOKEN_SECRET',
            type: 'secret',
            category: 'auth',
            required: false,
            description: 'Refresh token signing secret',
            dependencies: ['JWT_SECRET'],
            usageContext: ['authentication'],
            confidence: 0.85,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'critical',
          },
        ],
        conditions: ['hasAuth', 'dependencies includes jsonwebtoken OR jwt'],
        confidence: 0.9,
        description: 'JWT-based authentication system',
        examples: ['User authentication', 'API authentication', 'Session management'],
      },
    ];

    this.patterns.set('auth', authPatterns);
  }

  /**
   * Monitoring and observability patterns
   */
  private initializeMonitoringPatterns(): void {
    const monitoringPatterns: PatternTemplate[] = [
      {
        name: 'Application Monitoring',
        category: 'monitoring',
        variables: [
          {
            name: 'LOG_LEVEL',
            type: 'config',
            category: 'runtime',
            required: false,
            description: 'Application logging level',
            defaultValue: 'info',
            dependencies: [],
            usageContext: ['logging'],
            confidence: 0.9,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'public',
          },
          {
            name: 'METRICS_ENABLED',
            type: 'flag',
            category: 'monitoring',
            required: false,
            description: 'Enable metrics collection',
            defaultValue: 'false',
            dependencies: [],
            usageContext: ['metrics'],
            confidence: 0.75,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'public',
          },
          {
            name: 'SENTRY_DSN',
            type: 'secret',
            category: 'monitoring',
            required: false,
            description: 'Sentry error tracking DSN',
            dependencies: [],
            usageContext: ['error-tracking'],
            confidence: 0.8,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'secret',
          },
        ],
        conditions: ['type is service OR application'],
        confidence: 0.8,
        description: 'Application monitoring and observability',
        examples: ['Error tracking', 'Performance monitoring', 'Health checks'],
      },
    ];

    this.patterns.set('monitoring', monitoringPatterns);
  }

  /**
   * Deployment patterns
   */
  private initializeDeploymentPatterns(): void {
    const deploymentPatterns: PatternTemplate[] = [
      {
        name: 'Container Deployment',
        category: 'deployment',
        variables: [
          {
            name: 'NODE_ENV',
            type: 'config',
            category: 'runtime',
            required: true,
            description: 'Node.js environment mode',
            examples: ['development', 'production', 'staging'],
            dependencies: [],
            usageContext: ['runtime'],
            confidence: 0.95,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'public',
          },
          {
            name: 'TZ',
            type: 'config',
            category: 'runtime',
            required: false,
            description: 'Timezone for the application',
            defaultValue: 'UTC',
            dependencies: [],
            usageContext: ['timezone'],
            confidence: 0.7,
            source: 'pattern',
            deploymentSpecific: true,
            securityLevel: 'public',
          },
        ],
        conditions: ['always'],
        confidence: 0.8,
        description: 'Standard deployment configuration',
        examples: ['Docker containers', 'Cloud functions', 'Server deployments'],
      },
    ];

    this.patterns.set('deployment', deploymentPatterns);
  }

  /**
   * Match framework-specific patterns
   */
  private async matchFrameworkPatterns(context: ProjectContext): Promise<EnvVar[]> {
    const matches: EnvVar[] = [];

    for (const framework of context.framework) {
      const patterns = this.patterns.get(framework.toLowerCase()) || [];

      for (const pattern of patterns) {
        if (this.evaluateConditions(pattern.conditions, context)) {
          const frameMatches = pattern.variables.map((v) => ({
            ...v,
            description: `${v.description} (${framework} pattern)`,
            confidence: v.confidence * pattern.confidence,
          }));
          matches.push(...frameMatches);
        }
      }
    }

    return matches;
  }

  /**
   * Match project type-specific patterns
   */
  private async matchProjectTypePatterns(context: ProjectContext): Promise<EnvVar[]> {
    const matches: EnvVar[] = [];
    const typePatterns = this.patterns.get(context.type) || [];

    for (const pattern of typePatterns) {
      if (this.evaluateConditions(pattern.conditions, context)) {
        const typeMatches = pattern.variables.map((v) => ({
          ...v,
          description: `${v.description} (${context.type} pattern)`,
          confidence: v.confidence * pattern.confidence,
        }));
        matches.push(...typeMatches);
      }
    }

    return matches;
  }

  /**
   * Match dependency-based patterns
   */
  private async matchDependencyPatterns(context: ProjectContext): Promise<EnvVar[]> {
    const matches: EnvVar[] = [];

    // Check all pattern categories
    for (const [category, patterns] of this.patterns) {
      for (const pattern of patterns) {
        if (this.evaluateConditions(pattern.conditions, context)) {
          const depMatches = pattern.variables.map((v) => ({
            ...v,
            description: `${v.description} (dependency pattern)`,
            confidence: v.confidence * pattern.confidence,
          }));
          matches.push(...depMatches);
        }
      }
    }

    return matches;
  }

  /**
   * AI-powered similar project analysis
   */
  private async aiMatchSimilarProjects(
    context: ProjectContext,
    detected: EnvVar[]
  ): Promise<EnvVar[]> {
    const prompt = `
<similar_project_analysis>
  <project_context>
    <name>${context.name}</name>
    <type>${context.type}</type>
    <frameworks>${context.framework.join(', ')}</frameworks>
    <dependencies>${context.dependencies.slice(0, 20).join(', ')}</dependencies>
    <features>
      <database>${context.hasDatabase}</database>
      <auth>${context.hasAuth}</auth>
      <api>${context.hasAPI}</api>
      <blockchain>${context.hasBlockchain}</blockchain>
      <external_services>${context.hasExternalServices}</external_services>
    </features>
  </project_context>
  
  <detected_variables>
    ${detected.map((v) => `${v.name}: ${v.type}/${v.category}`).join('\n    ')}
  </detected_variables>
  
  <analysis_request>
    Based on the project context, identify environment variables commonly used in similar projects.
    Consider:
    
    1. **Industry Standards**: Common variables for this type of project
    2. **Framework Requirements**: Variables typically needed for these frameworks
    3. **Service Integrations**: Variables for external services and APIs
    4. **Security Standards**: Standard security-related variables
    5. **Deployment Practices**: Variables for different deployment environments
    
    Focus on variables with high probability of being needed (confidence > 0.7).
    
    Return as JSON array with format:
    {
      "name": "VARIABLE_NAME",
      "type": "secret|config|flag|url|path",
      "category": "api|database|auth|service|runtime|build|test|deployment",
      "required": boolean,
      "description": "Purpose and usage",
      "confidence": 0.0-1.0,
      "reason": "Why this variable is likely needed"
    }
  </analysis_request>
</similar_project_analysis>
    `;

    try {
      const response = await this.claude.generateMessage(prompt);
      return this.parseAIResponse(response);
    } catch (error) {
      logger.error('AI similar project analysis failed:', error);
      return [];
    }
  }

  /**
   * Match feature-based patterns
   */
  private async matchFeaturePatterns(context: ProjectContext): Promise<EnvVar[]> {
    const matches: EnvVar[] = [];

    // Map features to pattern categories
    const featureMapping = {
      hasDatabase: 'database',
      hasAuth: 'auth',
      hasAPI: 'api',
      hasBlockchain: 'blockchain',
    };

    for (const [feature, category] of Object.entries(featureMapping)) {
      if (context[feature as keyof ProjectContext]) {
        const patterns = this.patterns.get(category) || [];

        for (const pattern of patterns) {
          if (this.evaluateConditions(pattern.conditions, context)) {
            const featureMatches = pattern.variables.map((v) => ({
              ...v,
              description: `${v.description} (${feature} pattern)`,
              confidence: v.confidence * pattern.confidence,
            }));
            matches.push(...featureMatches);
          }
        }
      }
    }

    return matches;
  }

  /**
   * Evaluate pattern conditions against project context
   */
  private evaluateConditions(conditions: string[], context: ProjectContext): boolean {
    for (const condition of conditions) {
      if (condition === 'always') return true;

      // Framework conditions
      if (condition.includes('framework includes')) {
        const framework = condition.split('framework includes ')[1];
        if (!context.framework.some((f) => f.toLowerCase().includes(framework.toLowerCase()))) {
          return false;
        }
      }

      // Feature conditions
      if (condition.includes('has')) {
        const feature = condition.replace('has', '').trim();
        const featureKey =
          `has${feature.charAt(0).toUpperCase() + feature.slice(1)}` as keyof ProjectContext;
        if (!context[featureKey]) {
          return false;
        }
      }

      // Dependency conditions
      if (condition.includes('dependencies includes')) {
        const deps = condition.split('dependencies includes ')[1].split(' OR ');
        if (
          !deps.some((dep) =>
            context.dependencies.some((d) => d.toLowerCase().includes(dep.toLowerCase()))
          )
        ) {
          return false;
        }
      }

      // Type conditions
      if (condition.includes('type is')) {
        const type = condition.split('type is ')[1];
        if (context.type !== type) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Parse AI response into environment variables
   */
  private parseAIResponse(response: string): EnvVar[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed) ? parsed.map(this.normalizeAIVariable) : [];
      }
      return [];
    } catch (error) {
      logger.error('Failed to parse AI response:', error);
      return [];
    }
  }

  /**
   * Normalize AI response variable to EnvVar format
   */
  private normalizeAIVariable = (variable: any): EnvVar => {
    return {
      name: variable.name || 'UNKNOWN',
      type: variable.type || 'config',
      category: variable.category || 'runtime',
      required: variable.required !== false,
      description: variable.description || 'AI pattern matched variable',
      dependencies: [],
      usageContext: ['pattern_matching'],
      confidence: Math.min(Math.max(variable.confidence || 0.8, 0), 1),
      source: 'pattern' as const,
      deploymentSpecific: true,
      securityLevel: variable.securityLevel || this.inferSecurityLevel(variable.name || ''),
    };
  };

  /**
   * Deduplicate and enhance confidence scores
   */
  private deduplicateAndEnhance(matches: EnvVar[], detected: EnvVar[]): EnvVar[] {
    const seen = new Map<string, EnvVar>();
    const detectedNames = new Set(detected.map((v) => v.name));

    for (const match of matches) {
      // Skip if already detected with higher confidence
      if (detectedNames.has(match.name)) {
        continue;
      }

      const existing = seen.get(match.name);
      if (!existing) {
        seen.set(match.name, match);
      } else {
        // Keep the one with higher confidence
        if (match.confidence > existing.confidence) {
          seen.set(match.name, match);
        }
      }
    }

    return Array.from(seen.values()).filter((v) => v.confidence > 0.7);
  }

  /**
   * Infer security level from variable name
   */
  private inferSecurityLevel(varName: string): EnvVar['securityLevel'] {
    if (varName.includes('SECRET') || varName.includes('PRIVATE') || varName.includes('PASSWORD')) {
      return 'critical';
    }
    if (varName.includes('KEY') || varName.includes('TOKEN') || varName.includes('AUTH')) {
      return 'secret';
    }
    if (varName.includes('URL') || varName.includes('ENDPOINT') || varName.includes('HOST')) {
      return 'internal';
    }
    return 'public';
  }
}
