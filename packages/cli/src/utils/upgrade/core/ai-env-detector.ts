import { logger } from '@elizaos/core';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import { globby } from 'globby';
import { ClaudeAdapter } from '../claude-sdk/adapter.js';
import type { EnvVar, ProjectContext } from './ai-env-config-manager.js';

export interface DetectionStrategy {
  name: string;
  priority: number;
  confidence: number;
  execute(): Promise<EnvVar[]>;
}

export interface SemanticAnalysis {
  features: {
    database: boolean;
    authentication: boolean;
    api: boolean;
    blockchain: boolean;
    externalServices: boolean;
    fileOperations: boolean;
    networking: boolean;
    encryption: boolean;
    monitoring: boolean;
    caching: boolean;
  };
  patterns: string[];
  frameworks: string[];
  services: string[];
  dependencies: Map<string, string[]>;
  usage: Map<string, string[]>;
}

/**
 * AI-Powered Environment Variable Detector
 *
 * Performs sophisticated multi-strategy detection of environment variables
 * through deep semantic analysis, pattern recognition, and AI inference.
 */
export class AIEnvDetector {
  private strategies: DetectionStrategy[] = [];
  private semanticCache: Map<string, SemanticAnalysis> = new Map();
  private detectionCache: Map<string, EnvVar[]> = new Map();

  constructor(
    private repoPath: string,
    private claude: ClaudeAdapter
  ) {
    this.initializeStrategies();
  }

  /**
   * Detect all environment variables using multiple strategies
   */
  async detectAll(context: ProjectContext): Promise<EnvVar[]> {
    logger.info('🔍 Starting comprehensive environment variable detection...');

    const allDetected: EnvVar[] = [];
    const strategyResults: Map<string, EnvVar[]> = new Map();

    // Execute all detection strategies
    for (const strategy of this.strategies) {
      try {
        logger.info(`🎯 Executing strategy: ${strategy.name}`);
        const detected = await strategy.execute();
        strategyResults.set(strategy.name, detected);
        allDetected.push(...detected);
        logger.info(`✅ Strategy ${strategy.name}: ${detected.length} variables detected`);
      } catch (error) {
        logger.error(`❌ Strategy ${strategy.name} failed:`, error);
      }
    }

    // Enrich with semantic context
    const enriched = await this.enrichWithSemantics(allDetected, context);
    logger.info(`🧠 Semantic enrichment: ${enriched.length} total variables`);

    return enriched;
  }

  /**
   * AI-powered inference of missing environment variables
   */
  async inferMissing(context: ProjectContext, detected: EnvVar[]): Promise<EnvVar[]> {
    logger.info('🧠 Starting AI-powered inference of missing variables...');

    const prompt = this.buildInferencePrompt(context, detected);

    try {
      const response = await this.claude.generateMessage(prompt);
      const inferred = this.parseInferredVariables(response);

      // Add semantic analysis for each inferred variable
      const enrichedInferred = await this.enrichInferredVariables(inferred, context);

      logger.info(`✨ AI inference: ${enrichedInferred.length} variables inferred`);
      return enrichedInferred;
    } catch (error) {
      logger.error('Failed to infer missing variables:', error);
      return [];
    }
  }

  /**
   * Basic detection for emergency fallback
   */
  async detectBasic(repoPath: string): Promise<EnvVar[]> {
    const variables: EnvVar[] = [];

    try {
      const files = await globby(['src/**/*.ts', '*.ts'], {
        cwd: repoPath,
        ignore: ['node_modules/**', 'dist/**'],
      });

      for (const file of files) {
        const filePath = path.join(repoPath, file);
        const content = await fs.readFile(filePath, 'utf-8');

        // Basic regex detection
        const envPattern = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
        let match: RegExpExecArray | null;

        while ((match = envPattern.exec(content)) !== null) {
          const varName = match[1];
          if (!['NODE_ENV', 'PATH', 'HOME', 'USER', 'PWD'].includes(varName)) {
            variables.push({
              name: varName,
              type: this.inferType(varName),
              category: this.inferCategory(varName),
              required: true,
              description: `Basic detection from ${file}`,
              dependencies: [],
              usageContext: [file],
              confidence: 0.7,
              source: 'detected',
              deploymentSpecific: false,
              securityLevel: this.inferSecurityLevel(varName),
            });
          }
        }
      }
    } catch (error) {
      logger.error('Basic detection failed:', error);
    }

    return variables;
  }

  /**
   * Initialize all detection strategies
   */
  private initializeStrategies(): void {
    this.strategies = [
      {
        name: 'DirectReferences',
        priority: 10,
        confidence: 0.95,
        execute: () => this.detectDirectReferences(),
      },
      {
        name: 'ConfigObjects',
        priority: 8,
        confidence: 0.9,
        execute: () => this.detectConfigObjects(),
      },
      {
        name: 'DynamicAccess',
        priority: 7,
        confidence: 0.8,
        execute: () => this.detectDynamicAccess(),
      },
      {
        name: 'Comments',
        priority: 6,
        confidence: 0.7,
        execute: () => this.detectFromComments(),
      },
      {
        name: 'ImportAnalysis',
        priority: 5,
        confidence: 0.85,
        execute: () => this.detectFromImports(),
      },
      {
        name: 'PackageScripts',
        priority: 4,
        confidence: 0.8,
        execute: () => this.detectFromPackageScripts(),
      },
      {
        name: 'DockerFiles',
        priority: 3,
        confidence: 0.9,
        execute: () => this.detectFromDockerFiles(),
      },
      {
        name: 'ConfigFiles',
        priority: 2,
        confidence: 0.85,
        execute: () => this.detectFromConfigFiles(),
      },
    ];

    // Sort by priority
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Strategy 1: Direct process.env references
   */
  private async detectDirectReferences(): Promise<EnvVar[]> {
    const variables: EnvVar[] = [];

    const files = await globby(['src/**/*.ts', '*.ts', 'src/**/*.js', '*.js'], {
      cwd: this.repoPath,
      ignore: ['node_modules/**', 'dist/**', 'build/**'],
    });

    for (const file of files) {
      const filePath = path.join(this.repoPath, file);
      const content = await fs.readFile(filePath, 'utf-8');

      // Enhanced regex patterns for different access patterns
      const patterns = [
        /process\.env\.([A-Z_][A-Z0-9_]*)/g,
        /process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g,
        /env\.([A-Z_][A-Z0-9_]*)/g,
        /config\.([A-Z_][A-Z0-9_]*)/g,
      ];

      for (const pattern of patterns) {
        let match: RegExpExecArray | null;
        pattern.lastIndex = 0; // Reset regex

        while ((match = pattern.exec(content)) !== null) {
          const varName = match[1];

          if (this.isValidEnvVar(varName)) {
            const context = this.extractUsageContext(content, match.index, file);

            variables.push({
              name: varName,
              type: this.inferType(varName),
              category: this.inferCategory(varName),
              required: this.inferRequired(varName, context),
              description: `Detected from direct reference in ${file}`,
              dependencies: [],
              usageContext: [file],
              confidence: 0.95,
              source: 'detected',
              deploymentSpecific: this.inferDeploymentSpecific(varName),
              securityLevel: this.inferSecurityLevel(varName),
            });
          }
        }
      }
    }

    return this.deduplicateVariables(variables);
  }

  /**
   * Strategy 2: Configuration objects and structured access
   */
  private async detectConfigObjects(): Promise<EnvVar[]> {
    const variables: EnvVar[] = [];

    const files = await globby(['src/**/*.ts', '*.ts', 'config/**/*.ts'], {
      cwd: this.repoPath,
      ignore: ['node_modules/**', 'dist/**'],
    });

    for (const file of files) {
      const filePath = path.join(this.repoPath, file);
      const content = await fs.readFile(filePath, 'utf-8');

      // Look for config object patterns
      const configPatterns = [
        /const\s+(\w+)\s*=\s*{\s*[\s\S]*?process\.env\.([A-Z_][A-Z0-9_]*)/g,
        /export\s+(?:const|default)\s+{\s*[\s\S]*?([A-Z_][A-Z0-9_]*)\s*:\s*process\.env\.([A-Z_][A-Z0-9_]*)/g,
        /(\w+)\s*:\s*process\.env\.([A-Z_][A-Z0-9_]*)/g,
      ];

      for (const pattern of configPatterns) {
        let match: RegExpExecArray | null;
        pattern.lastIndex = 0;

        while ((match = pattern.exec(content)) !== null) {
          const varName = match[2] || match[1];

          if (this.isValidEnvVar(varName)) {
            variables.push({
              name: varName,
              type: this.inferType(varName),
              category: this.inferCategory(varName),
              required: true,
              description: `Detected from configuration object in ${file}`,
              dependencies: [],
              usageContext: [file],
              confidence: 0.9,
              source: 'detected',
              deploymentSpecific: true,
              securityLevel: this.inferSecurityLevel(varName),
            });
          }
        }
      }
    }

    return this.deduplicateVariables(variables);
  }

  /**
   * Strategy 3: Dynamic environment variable access
   */
  private async detectDynamicAccess(): Promise<EnvVar[]> {
    const variables: EnvVar[] = [];

    const files = await globby(['src/**/*.ts', '*.ts'], {
      cwd: this.repoPath,
      ignore: ['node_modules/**', 'dist/**'],
    });

    for (const file of files) {
      const filePath = path.join(this.repoPath, file);
      const content = await fs.readFile(filePath, 'utf-8');

      // Look for dynamic access patterns
      const dynamicPatterns = [
        /process\.env\[([^[\]]+)\]/g,
        /getEnv\(['"]([A-Z_][A-Z0-9_]*)['"]\)/g,
        /runtime\.getSetting\(['"]([A-Z_][A-Z0-9_]*)['"]\)/g,
        /config\.get\(['"]([A-Z_][A-Z0-9_]*)['"]\)/g,
      ];

      for (const pattern of dynamicPatterns) {
        let match: RegExpExecArray | null;
        pattern.lastIndex = 0;

        while ((match = pattern.exec(content)) !== null) {
          let varName = match[1];

          // Handle quoted variables
          if (varName.startsWith('"') || varName.startsWith("'")) {
            varName = varName.slice(1, -1);
          }

          if (this.isValidEnvVar(varName)) {
            variables.push({
              name: varName,
              type: this.inferType(varName),
              category: this.inferCategory(varName),
              required: true,
              description: `Detected from dynamic access in ${file}`,
              dependencies: [],
              usageContext: [file],
              confidence: 0.8,
              source: 'detected',
              deploymentSpecific: true,
              securityLevel: this.inferSecurityLevel(varName),
            });
          }
        }
      }
    }

    return this.deduplicateVariables(variables);
  }

  /**
   * Strategy 4: Comments and documentation analysis
   */
  private async detectFromComments(): Promise<EnvVar[]> {
    const variables: EnvVar[] = [];

    const files = await globby(['src/**/*.ts', '*.ts', '*.md', '*.txt'], {
      cwd: this.repoPath,
      ignore: ['node_modules/**', 'dist/**'],
    });

    for (const file of files) {
      const filePath = path.join(this.repoPath, file);
      const content = await fs.readFile(filePath, 'utf-8');

      // Look for environment variables mentioned in comments
      const commentPatterns = [
        /\/\/.*?([A-Z_][A-Z0-9_]*)\s*=\s*/g,
        /\/\*[\s\S]*?([A-Z_][A-Z0-9_]*)\s*[\s\S]*?\*\//g,
        /#.*?([A-Z_][A-Z0-9_]*)\s*=/g,
        /Set\s+([A-Z_][A-Z0-9_]*)/gi,
        /export\s+([A-Z_][A-Z0-9_]*)/gi,
      ];

      for (const pattern of commentPatterns) {
        let match: RegExpExecArray | null;
        pattern.lastIndex = 0;

        while ((match = pattern.exec(content)) !== null) {
          const varName = match[1];

          if (this.isValidEnvVar(varName)) {
            variables.push({
              name: varName,
              type: this.inferType(varName),
              category: this.inferCategory(varName),
              required: false,
              description: `Detected from comments/documentation in ${file}`,
              dependencies: [],
              usageContext: [file],
              confidence: 0.7,
              source: 'detected',
              deploymentSpecific: false,
              securityLevel: this.inferSecurityLevel(varName),
            });
          }
        }
      }
    }

    return this.deduplicateVariables(variables);
  }

  /**
   * Strategy 5: Import analysis for external service requirements
   */
  private async detectFromImports(): Promise<EnvVar[]> {
    const variables: EnvVar[] = [];

    const files = await globby(['src/**/*.ts', '*.ts'], {
      cwd: this.repoPath,
      ignore: ['node_modules/**', 'dist/**'],
    });

    for (const file of files) {
      const filePath = path.join(this.repoPath, file);
      const content = await fs.readFile(filePath, 'utf-8');

      // Analyze imports for known patterns
      const importPatterns = [
        { pattern: /@anthropic-ai\/sdk/, vars: ['ANTHROPIC_API_KEY'] },
        { pattern: /openai/, vars: ['OPENAI_API_KEY'] },
        { pattern: /redis/, vars: ['REDIS_URL', 'REDIS_PASSWORD'] },
        { pattern: /postgres|pg/, vars: ['DATABASE_URL', 'DB_HOST', 'DB_USER', 'DB_PASSWORD'] },
        { pattern: /mongodb|mongoose/, vars: ['MONGODB_URI', 'MONGO_URL'] },
        { pattern: /stripe/, vars: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] },
        { pattern: /aws-sdk/, vars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'] },
        { pattern: /discord/, vars: ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'] },
        { pattern: /twitter/, vars: ['TWITTER_API_KEY', 'TWITTER_API_SECRET'] },
        { pattern: /viem|ethers/, vars: ['RPC_URL', 'PRIVATE_KEY'] },
      ];

      for (const { pattern, vars } of importPatterns) {
        if (pattern.test(content)) {
          for (const varName of vars) {
            variables.push({
              name: varName,
              type:
                varName.includes('KEY') ||
                varName.includes('SECRET') ||
                varName.includes('PASSWORD')
                  ? 'secret'
                  : 'config',
              category: this.inferCategory(varName),
              required: true,
              description: `Inferred from import of ${pattern.source} in ${file}`,
              dependencies: [],
              usageContext: [file],
              confidence: 0.85,
              source: 'inferred',
              deploymentSpecific: true,
              securityLevel: this.inferSecurityLevel(varName),
            });
          }
        }
      }
    }

    return this.deduplicateVariables(variables);
  }

  /**
   * Strategy 6: Package.json scripts analysis
   */
  private async detectFromPackageScripts(): Promise<EnvVar[]> {
    const variables: EnvVar[] = [];

    const packageJsonPath = path.join(this.repoPath, 'package.json');

    try {
      const packageJson = await fs.readJson(packageJsonPath);
      const scripts = packageJson.scripts || {};

      for (const [scriptName, script] of Object.entries(scripts)) {
        if (typeof script === 'string') {
          const envPattern = /\$\{?([A-Z_][A-Z0-9_]*)\}?/g;
          let match: RegExpExecArray | null;

          while ((match = envPattern.exec(script)) !== null) {
            const varName = match[1];

            if (this.isValidEnvVar(varName)) {
              variables.push({
                name: varName,
                type: 'config',
                category: 'build',
                required: true,
                description: `Detected from package.json script: ${scriptName}`,
                dependencies: [],
                usageContext: [`package.json:${scriptName}`],
                confidence: 0.8,
                source: 'detected',
                deploymentSpecific: true,
                securityLevel: 'public',
              });
            }
          }
        }
      }
    } catch (error) {
      logger.warn('Could not analyze package.json scripts:', error);
    }

    return variables;
  }

  /**
   * Strategy 7: Docker files analysis
   */
  private async detectFromDockerFiles(): Promise<EnvVar[]> {
    const variables: EnvVar[] = [];

    const dockerFiles = await globby(
      ['**/Dockerfile*', '**/.dockerignore', '**/docker-compose*.yml'],
      {
        cwd: this.repoPath,
        ignore: ['node_modules/**'],
      }
    );

    for (const file of dockerFiles) {
      const filePath = path.join(this.repoPath, file);
      const content = await fs.readFile(filePath, 'utf-8');

      const dockerPatterns = [
        /ENV\s+([A-Z_][A-Z0-9_]*)/g,
        /environment:\s*[\s\S]*?-\s*([A-Z_][A-Z0-9_]*)/g,
        /\$\{([A-Z_][A-Z0-9_]*)\}/g,
      ];

      for (const pattern of dockerPatterns) {
        let match: RegExpExecArray | null;
        pattern.lastIndex = 0;

        while ((match = pattern.exec(content)) !== null) {
          const varName = match[1];

          if (this.isValidEnvVar(varName)) {
            variables.push({
              name: varName,
              type: 'config',
              category: 'deployment',
              required: true,
              description: `Detected from Docker configuration in ${file}`,
              dependencies: [],
              usageContext: [file],
              confidence: 0.9,
              source: 'detected',
              deploymentSpecific: true,
              securityLevel: 'internal',
            });
          }
        }
      }
    }

    return variables;
  }

  /**
   * Strategy 8: Configuration files analysis
   */
  private async detectFromConfigFiles(): Promise<EnvVar[]> {
    const variables: EnvVar[] = [];

    const configFiles = await globby(
      [
        '**/.env*',
        '**/config/*.json',
        '**/config/*.yml',
        '**/config/*.yaml',
        '**/config.json',
        '**/config.yml',
      ],
      {
        cwd: this.repoPath,
        ignore: ['node_modules/**', 'dist/**'],
      }
    );

    for (const file of configFiles) {
      const filePath = path.join(this.repoPath, file);
      const content = await fs.readFile(filePath, 'utf-8');

      if (file.includes('.env')) {
        // Parse .env files
        const envLines = content.split('\n');
        for (const line of envLines) {
          const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
          if (match) {
            const varName = match[1];
            variables.push({
              name: varName,
              type: this.inferType(varName),
              category: this.inferCategory(varName),
              required: true,
              description: `Detected from environment file: ${file}`,
              dependencies: [],
              usageContext: [file],
              confidence: 0.95,
              source: 'detected',
              deploymentSpecific: true,
              securityLevel: this.inferSecurityLevel(varName),
            });
          }
        }
      } else {
        // Parse JSON/YAML config files
        const configPattern = /([A-Z_][A-Z0-9_]*)/g;
        let match: RegExpExecArray | null;

        while ((match = configPattern.exec(content)) !== null) {
          const varName = match[1];

          if (this.isValidEnvVar(varName)) {
            variables.push({
              name: varName,
              type: 'config',
              category: 'runtime',
              required: false,
              description: `Detected from configuration file: ${file}`,
              dependencies: [],
              usageContext: [file],
              confidence: 0.85,
              source: 'detected',
              deploymentSpecific: true,
              securityLevel: 'internal',
            });
          }
        }
      }
    }

    return variables;
  }

  /**
   * Build comprehensive inference prompt for AI
   */
  private buildInferencePrompt(context: ProjectContext, detected: EnvVar[]): string {
    return `
<env_var_inference>
  <project_analysis>
    <name>${context.name}</name>
    <type>${context.type}</type>
    <frameworks>${context.framework.join(', ')}</frameworks>
    <dependencies>${context.dependencies.slice(0, 20).join(', ')}</dependencies>
    <features>
      <database>${context.hasDatabase}</database>
      <authentication>${context.hasAuth}</authentication>
      <api>${context.hasAPI}</api>
      <blockchain>${context.hasBlockchain}</blockchain>
      <external_services>${context.hasExternalServices}</external_services>
    </features>
    <deployment_targets>${context.deploymentTargets.join(', ')}</deployment_targets>
  </project_analysis>
  
  <detected_variables>
    ${detected.map((v) => `${v.name} (${v.type}/${v.category}) - ${v.description}`).join('\n    ')}
  </detected_variables>
  
  <inference_instructions>
    Based on the project analysis and detected variables, infer additional environment variables
    that are likely needed but not explicitly detected. Consider:
    
    1. **Security Requirements**: API keys, secrets, certificates
    2. **Service Configuration**: Endpoints, ports, timeouts
    3. **Database Settings**: Connection strings, pool sizes, migrations
    4. **Authentication**: JWT secrets, OAuth credentials, session keys
    5. **Monitoring**: Logging levels, metrics endpoints, health checks
    6. **Performance**: Cache settings, rate limits, resource limits
    7. **Deployment**: Environment names, feature flags, debug modes
    8. **Integration**: Webhook URLs, callback endpoints, service tokens
    
    For each inferred variable, provide JSON with:
    {
      "name": "VARIABLE_NAME",
      "type": "secret|config|flag|url|path",
      "category": "api|database|auth|service|runtime|build|test|deployment",
      "required": boolean,
      "description": "Clear purpose and usage",
      "defaultValue": "safe_default_if_applicable",
      "securityLevel": "public|internal|secret|critical",
      "confidence": 0.0-1.0,
      "deploymentSpecific": boolean,
      "validationPattern": "regex_if_applicable",
      "dependencies": ["related_vars"],
      "examples": ["example_values"]
    }
    
    Return as JSON array. Focus on variables with high confidence (>0.7).
  </inference_instructions>
</env_var_inference>
    `;
  }

  /**
   * Parse AI response into structured environment variables
   */
  private parseInferredVariables(response: string): EnvVar[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed) ? parsed.map(this.normalizeInferredVariable) : [];
      }

      // Fallback to line-by-line parsing
      return this.parseInferredVariablesFromText(response);
    } catch (error) {
      logger.error('Failed to parse inferred variables:', error);
      return [];
    }
  }

  /**
   * Normalize inferred variable to match EnvVar interface
   */
  private normalizeInferredVariable(variable: any): EnvVar {
    return {
      name: variable.name || 'UNKNOWN',
      type: variable.type || 'config',
      category: variable.category || 'runtime',
      required: variable.required !== false,
      description: variable.description || 'AI inferred variable',
      defaultValue: variable.defaultValue,
      validationPattern: variable.validationPattern,
      dependencies: Array.isArray(variable.dependencies) ? variable.dependencies : [],
      usageContext: ['ai_inference'],
      confidence: Math.min(Math.max(variable.confidence || 0.8, 0), 1),
      source: 'inferred' as const,
      examples: Array.isArray(variable.examples) ? variable.examples : [],
      deploymentSpecific: variable.deploymentSpecific !== false,
      securityLevel: variable.securityLevel || 'internal',
    };
  }

  /**
   * Fallback text parsing for AI responses
   */
  private parseInferredVariablesFromText(response: string): EnvVar[] {
    const variables: EnvVar[] = [];
    const lines = response.split('\n');

    for (const line of lines) {
      const match = line.match(/([A-Z_][A-Z0-9_]*)/);
      if (match) {
        const varName = match[1];
        if (this.isValidEnvVar(varName)) {
          variables.push({
            name: varName,
            type: this.inferType(varName),
            category: this.inferCategory(varName),
            required: true,
            description: `AI inferred from text analysis`,
            dependencies: [],
            usageContext: ['ai_inference'],
            confidence: 0.7,
            source: 'inferred',
            deploymentSpecific: true,
            securityLevel: this.inferSecurityLevel(varName),
          });
        }
      }
    }

    return variables;
  }

  /**
   * Enrich detected variables with semantic context
   */
  private async enrichWithSemantics(
    variables: EnvVar[],
    context: ProjectContext
  ): Promise<EnvVar[]> {
    const enriched: EnvVar[] = [];

    for (const variable of variables) {
      const enhanced = { ...variable };

      // Add context-specific enrichment
      if (context.hasDatabase && variable.name.includes('DB')) {
        enhanced.category = 'database';
        enhanced.required = true;
      }

      if (context.hasAuth && variable.name.includes('AUTH')) {
        enhanced.category = 'auth';
        enhanced.securityLevel = 'secret';
      }

      if (context.hasBlockchain && variable.name.includes('RPC')) {
        enhanced.category = 'service';
        enhanced.deploymentSpecific = true;
      }

      enriched.push(enhanced);
    }

    return enriched;
  }

  /**
   * Enrich inferred variables with additional context
   */
  private async enrichInferredVariables(
    variables: EnvVar[],
    context: ProjectContext
  ): Promise<EnvVar[]> {
    // Add project-specific context to inferred variables
    return variables.map((variable) => ({
      ...variable,
      usageContext: [...variable.usageContext, `${context.type}_project`],
      description: `${variable.description} (inferred for ${context.type} project)`,
    }));
  }

  // Utility methods
  private isValidEnvVar(name: string): boolean {
    return (
      /^[A-Z_][A-Z0-9_]*$/.test(name) &&
      name.length > 1 &&
      !['NODE_ENV', 'PATH', 'HOME', 'USER', 'PWD'].includes(name)
    );
  }

  private extractUsageContext(content: string, index: number, file: string): string {
    const start = Math.max(0, index - 100);
    const end = Math.min(content.length, index + 100);
    return content.slice(start, end).replace(/\n/g, ' ').trim();
  }

  private inferType(varName: string): EnvVar['type'] {
    if (
      varName.includes('KEY') ||
      varName.includes('SECRET') ||
      varName.includes('TOKEN') ||
      varName.includes('PASSWORD')
    ) {
      return 'secret';
    }
    if (varName.includes('URL') || varName.includes('ENDPOINT') || varName.includes('HOST')) {
      return 'url';
    }
    if (varName.includes('PATH') || varName.includes('DIR') || varName.includes('FILE')) {
      return 'path';
    }
    if (varName.includes('ENABLE') || varName.includes('DISABLE') || varName.includes('FLAG')) {
      return 'flag';
    }
    return 'config';
  }

  private inferCategory(varName: string): EnvVar['category'] {
    if (varName.includes('API') || varName.includes('KEY')) return 'api';
    if (
      varName.includes('DB') ||
      varName.includes('DATABASE') ||
      varName.includes('POSTGRES') ||
      varName.includes('MONGO')
    )
      return 'database';
    if (varName.includes('AUTH') || varName.includes('JWT') || varName.includes('OAUTH'))
      return 'auth';
    if (varName.includes('PORT') || varName.includes('HOST') || varName.includes('URL'))
      return 'service';
    if (varName.includes('NODE_ENV') || varName.includes('ENV')) return 'runtime';
    if (varName.includes('TEST')) return 'test';
    if (varName.includes('BUILD') || varName.includes('COMPILE')) return 'build';
    if (varName.includes('DEPLOY') || varName.includes('PROD') || varName.includes('STAGE'))
      return 'deployment';
    return 'runtime';
  }

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

  private inferRequired(varName: string, context: string): boolean {
    const criticalVars = ['API_KEY', 'SECRET', 'TOKEN', 'PASSWORD', 'DATABASE_URL', 'JWT_SECRET'];
    return criticalVars.some((critical) => varName.includes(critical));
  }

  private inferDeploymentSpecific(varName: string): boolean {
    const deploymentVars = ['URL', 'HOST', 'PORT', 'ENV', 'STAGE', 'PROD', 'DEV'];
    return deploymentVars.some((deploy) => varName.includes(deploy));
  }

  private deduplicateVariables(variables: EnvVar[]): EnvVar[] {
    const seen = new Map<string, EnvVar>();

    for (const variable of variables) {
      const existing = seen.get(variable.name);
      if (!existing) {
        seen.set(variable.name, variable);
      } else {
        // Keep the one with higher confidence
        if (variable.confidence > existing.confidence) {
          seen.set(variable.name, variable);
        }
      }
    }

    return Array.from(seen.values());
  }
}
