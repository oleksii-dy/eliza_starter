import { logger } from '@elizaos/core';
import { ClaudeAdapter } from '../claude-sdk/adapter.js';
import type {
  EnvVar,
  ProjectContext,
  ValidationResult,
  ConfigGap,
  ValidationError,
} from './ai-env-config-manager.js';

/**
 * Configuration Validator
 *
 * Validates environment configuration completeness and correctness
 * using AI-powered analysis and rule-based validation.
 */
export class ConfigValidator {
  constructor(private claude: ClaudeAdapter) {}

  /**
   * Validate environment configuration
   */
  async validate(variables: EnvVar[], context: ProjectContext): Promise<ValidationResult> {
    logger.info('✅ Starting configuration validation...');

    const gaps: ConfigGap[] = [];
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 1. Check for required variables based on context
    const contextGaps = await this.checkContextRequirements(variables, context);
    gaps.push(...contextGaps);

    // 2. Validate existing variables
    const variableErrors = await this.validateVariables(variables);
    errors.push(...variableErrors);

    // 3. Security validation
    const securityWarnings = await this.validateSecurity(variables);
    warnings.push(...securityWarnings);

    // 4. Dependency validation
    const dependencyErrors = await this.validateDependencies(variables);
    errors.push(...dependencyErrors);

    // 5. AI-powered validation
    const aiValidation = await this.aiValidate(variables, context);
    gaps.push(...aiValidation.gaps);
    errors.push(...aiValidation.errors);
    warnings.push(...aiValidation.warnings);
    suggestions.push(...aiValidation.suggestions);

    const score = this.calculateScore(variables, gaps, errors);
    const isComplete =
      gaps.length === 0 && errors.filter((e) => e.severity === 'critical').length === 0;

    logger.info(
      `✅ Validation complete: ${score}/100 score, ${gaps.length} gaps, ${errors.length} errors`
    );

    return {
      isComplete,
      score,
      gaps,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Check requirements based on project context
   */
  private async checkContextRequirements(
    variables: EnvVar[],
    context: ProjectContext
  ): Promise<ConfigGap[]> {
    const gaps: ConfigGap[] = [];
    const existingNames = new Set(variables.map((v) => v.name));

    // ElizaOS requirements
    if (context.framework.includes('elizaos')) {
      if (!existingNames.has('ANTHROPIC_API_KEY')) {
        gaps.push({
          varName: 'ANTHROPIC_API_KEY',
          context: 'ElizaOS framework requires Anthropic API for AI functionality',
          codeSnippet: 'import Anthropic from "@anthropic-ai/sdk"',
          severity: 'critical',
          category: 'api',
          reason: 'Required for Claude AI integration in ElizaOS plugins',
        });
      }
    }

    // Database requirements
    if (context.hasDatabase) {
      if (!existingNames.has('DATABASE_URL') && !existingNames.has('DB_HOST')) {
        gaps.push({
          varName: 'DATABASE_URL',
          context: 'Database usage detected but no connection configuration found',
          codeSnippet: 'Database connection required',
          severity: 'critical',
          category: 'database',
          reason: 'Database access requires connection configuration',
        });
      }
    }

    // Authentication requirements
    if (context.hasAuth) {
      if (!existingNames.has('JWT_SECRET') && !existingNames.has('SESSION_SECRET')) {
        gaps.push({
          varName: 'JWT_SECRET',
          context: 'Authentication features detected but no secret configuration found',
          codeSnippet: 'Authentication requires secret key',
          severity: 'critical',
          category: 'auth',
          reason: 'Authentication systems require secret keys for security',
        });
      }
    }

    // API requirements
    if (context.hasAPI) {
      if (!existingNames.has('PORT')) {
        gaps.push({
          varName: 'PORT',
          context: 'API service detected but no port configuration found',
          codeSnippet: 'HTTP server needs port configuration',
          severity: 'medium',
          category: 'service',
          reason: 'API services typically need configurable port numbers',
        });
      }
    }

    // Blockchain requirements
    if (context.hasBlockchain) {
      if (!existingNames.has('RPC_URL')) {
        gaps.push({
          varName: 'RPC_URL',
          context: 'Blockchain integration detected but no RPC endpoint configured',
          codeSnippet: 'Blockchain operations require RPC endpoint',
          severity: 'critical',
          category: 'service',
          reason: 'Blockchain interactions require RPC endpoint configuration',
        });
      }
    }

    return gaps;
  }

  /**
   * Validate individual variables
   */
  private async validateVariables(variables: EnvVar[]): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    for (const variable of variables) {
      // Check required variables have values or defaults
      if (variable.required && !variable.value && !variable.defaultValue) {
        errors.push({
          type: 'missing_required',
          variable: variable.name,
          message: `Required variable ${variable.name} has no value or default`,
          severity: 'critical',
          fix: `Set ${variable.name} in environment or provide a default value`,
        });
      }

      // Validate patterns if specified
      if (variable.validationPattern && variable.value) {
        try {
          const regex = new RegExp(variable.validationPattern);
          if (!regex.test(variable.value)) {
            errors.push({
              type: 'pattern_mismatch',
              variable: variable.name,
              message: `Variable ${variable.name} value does not match expected pattern`,
              severity: 'high',
              fix: `Ensure ${variable.name} matches pattern: ${variable.validationPattern}`,
            });
          }
        } catch (error) {
          logger.warn(`Invalid validation pattern for ${variable.name}:`, error);
        }
      }

      // Type-specific validation
      if (variable.type === 'url' && variable.value) {
        try {
          new URL(variable.value);
        } catch {
          errors.push({
            type: 'invalid_value',
            variable: variable.name,
            message: `Variable ${variable.name} is not a valid URL`,
            severity: 'high',
            fix: `Ensure ${variable.name} is a valid URL format`,
          });
        }
      }

      if (variable.type === 'config' && variable.name.includes('PORT') && variable.value) {
        const port = Number.parseInt(variable.value);
        if (Number.isNaN(port) || port < 1 || port > 65535) {
          errors.push({
            type: 'invalid_value',
            variable: variable.name,
            message: `Variable ${variable.name} is not a valid port number`,
            severity: 'high',
            fix: `Ensure ${variable.name} is a number between 1 and 65535`,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate security configuration
   */
  private async validateSecurity(variables: EnvVar[]): Promise<string[]> {
    const warnings: string[] = [];

    for (const variable of variables) {
      // Check for secrets with default values
      if (variable.securityLevel === 'secret' && variable.defaultValue) {
        warnings.push(`Secret variable ${variable.name} should not have a default value`);
      }

      // Check for weak secrets
      if (variable.securityLevel === 'critical' && variable.value) {
        if (variable.value.length < 32) {
          warnings.push(
            `Critical secret ${variable.name} appears to be too short (< 32 characters)`
          );
        }
      }

      // Check for exposed secrets in non-secret variables
      if (variable.securityLevel === 'public' && variable.value) {
        const suspiciousPatterns = [
          /sk-[a-zA-Z0-9]{32,}/, // OpenAI API keys
          /xoxb-[a-zA-Z0-9-]+/, // Slack tokens
          /ghp_[a-zA-Z0-9]{36}/, // GitHub tokens
        ];

        for (const pattern of suspiciousPatterns) {
          if (pattern.test(variable.value)) {
            warnings.push(
              `Variable ${variable.name} appears to contain a secret but is marked as public`
            );
            break;
          }
        }
      }
    }

    return warnings;
  }

  /**
   * Validate variable dependencies
   */
  private async validateDependencies(variables: EnvVar[]): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const existingNames = new Set(variables.map((v) => v.name));

    for (const variable of variables) {
      for (const dependency of variable.dependencies) {
        if (!existingNames.has(dependency)) {
          errors.push({
            type: 'dependency_missing',
            variable: variable.name,
            message: `Variable ${variable.name} depends on ${dependency} which is not configured`,
            severity: 'high',
            fix: `Configure ${dependency} or remove dependency from ${variable.name}`,
          });
        }
      }
    }

    return errors;
  }

  /**
   * AI-powered validation
   */
  private async aiValidate(
    variables: EnvVar[],
    context: ProjectContext
  ): Promise<{
    gaps: ConfigGap[];
    errors: ValidationError[];
    warnings: string[];
    suggestions: string[];
  }> {
    const prompt = `
<config_validation>
  <project_context>
    <name>${context.name}</name>
    <type>${context.type}</type>
    <frameworks>${context.framework.join(', ')}</frameworks>
    <features>
      <database>${context.hasDatabase}</database>
      <auth>${context.hasAuth}</auth>
      <api>${context.hasAPI}</api>
      <blockchain>${context.hasBlockchain}</blockchain>
      <external_services>${context.hasExternalServices}</external_services>
    </features>
  </project_context>
  
  <current_variables>
    ${variables.map((v) => `${v.name}: ${v.type}/${v.category} (required: ${v.required}, security: ${v.securityLevel})`).join('\n    ')}
  </current_variables>
  
  <validation_request>
    Analyze the current environment configuration and identify:
    
    1. **Missing Critical Variables**: Variables that are essential but not configured
    2. **Security Issues**: Variables that pose security risks
    3. **Configuration Errors**: Inconsistent or problematic settings
    4. **Best Practice Violations**: Configurations that don't follow standards
    5. **Optimization Opportunities**: Ways to improve the configuration
    
    For each issue found, provide:
    - Type of issue
    - Severity (critical/high/medium/low)
    - Description
    - Recommended fix
    - Category (api/database/auth/service/runtime/build/test/deployment)
    
    Return structured analysis focusing on issues with high confidence.
  </validation_request>
</config_validation>
    `;

    try {
      const response = await this.claude.generateMessage(prompt);
      return this.parseAIValidation(response);
    } catch (error) {
      logger.error('AI validation failed:', error);
      return { gaps: [], errors: [], warnings: [], suggestions: [] };
    }
  }

  /**
   * Parse AI validation response
   */
  private parseAIValidation(response: string): {
    gaps: ConfigGap[];
    errors: ValidationError[];
    warnings: string[];
    suggestions: string[];
  } {
    const gaps: ConfigGap[] = [];
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Try to parse structured response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.gaps) gaps.push(...parsed.gaps.map(this.normalizeGap));
        if (parsed.errors) errors.push(...parsed.errors.map(this.normalizeError));
        if (parsed.warnings) warnings.push(...parsed.warnings);
        if (parsed.suggestions) suggestions.push(...parsed.suggestions);
      } else {
        // Fallback to text parsing
        const lines = response.split('\n');
        for (const line of lines) {
          if (line.includes('Missing') || line.includes('missing')) {
            warnings.push(line.trim());
          }
          if (line.includes('Error') || line.includes('error')) {
            warnings.push(line.trim());
          }
          if (line.includes('Suggestion') || line.includes('suggestion')) {
            suggestions.push(line.trim());
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to parse AI validation response:', error);
      // Add generic suggestions based on response content
      if (response.includes('missing')) {
        suggestions.push('Consider adding missing environment variables mentioned in the analysis');
      }
    }

    return { gaps, errors, warnings, suggestions };
  }

  /**
   * Normalize gap from AI response
   */
  private normalizeGap = (gap: any): ConfigGap => {
    return {
      varName: gap.varName || gap.name || 'UNKNOWN',
      context: gap.context || gap.description || 'AI identified gap',
      codeSnippet: gap.codeSnippet || gap.usage || '',
      severity: gap.severity || 'medium',
      category: gap.category || 'runtime',
      reason: gap.reason || gap.description || 'AI analysis recommendation',
    };
  };

  /**
   * Normalize error from AI response
   */
  private normalizeError = (error: any): ValidationError => {
    return {
      type: error.type || 'invalid_value',
      variable: error.variable || error.name || 'UNKNOWN',
      message: error.message || error.description || 'AI identified issue',
      severity: error.severity || 'medium',
      fix: error.fix || error.solution || 'Review and correct the configuration',
    };
  };

  /**
   * Calculate overall configuration score
   */
  private calculateScore(
    variables: EnvVar[],
    gaps: ConfigGap[],
    errors: ValidationError[]
  ): number {
    const baseScore = 100;
    let penalties = 0;

    // Penalty for gaps
    for (const gap of gaps) {
      switch (gap.severity) {
        case 'critical':
          penalties += 25;
          break;
        case 'high':
          penalties += 15;
          break;
        case 'medium':
          penalties += 10;
          break;
        case 'low':
          penalties += 5;
          break;
      }
    }

    // Penalty for errors
    for (const error of errors) {
      switch (error.severity) {
        case 'critical':
          penalties += 20;
          break;
        case 'high':
          penalties += 12;
          break;
        case 'medium':
          penalties += 8;
          break;
        case 'low':
          penalties += 4;
          break;
      }
    }

    // Bonus for good practices
    let bonus = 0;
    const secretVars = variables.filter((v) => v.securityLevel === 'secret');
    const configuredSecrets = secretVars.filter((v) => v.value || v.defaultValue);

    if (secretVars.length > 0 && configuredSecrets.length === secretVars.length) {
      bonus += 5; // All secrets configured
    }

    if (variables.some((v) => v.name === 'NODE_ENV')) {
      bonus += 5; // Environment mode configured
    }

    return Math.max(0, Math.min(100, baseScore - penalties + bonus));
  }
}
