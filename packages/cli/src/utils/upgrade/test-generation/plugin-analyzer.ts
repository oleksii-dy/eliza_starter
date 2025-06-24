/**
 * ENHANCED PLUGIN ANALYZER WITH DEEP INTROSPECTION
 *
 * Responsibilities:
 * - Analyze plugin directory structure
 * - Detect services, actions, providers, evaluators
 * - Extract plugin metadata for test generation
 * - DEEP ANALYSIS: Parse actual exported components
 * - COMPREHENSIVE: Discover methods, validation rules, behaviors
 */

import { logger } from '@elizaos/core';
import * as fs from 'fs-extra';
import * as path from 'node:path';
import type { PluginAnalysis } from './types.js';

export class PluginAnalyzer {
  private repoPath: string;
  private pluginName: string;

  constructor(repoPath: string, pluginName: string) {
    this.repoPath = repoPath;
    this.pluginName = pluginName;
  }

  /**
   * ENHANCED: Analyze plugin structure with deep introspection
   */
  async analyzePlugin(): Promise<PluginAnalysis> {
    const analysis: PluginAnalysis = {
      name: this.pluginName || 'unknown',
      description: '',
      hasServices: false,
      hasActions: false,
      hasProviders: false,
      hasEvaluators: false,
      hasTests: false,
      packageJson: {},
      complexity: 1,
      services: [],
      actions: [],
      providers: [],
      evaluators: [],
    };

    try {
      // ENHANCED: Load and parse package.json
      const packageJsonPath = path.join(this.repoPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        analysis.packageJson = await fs.readJson(packageJsonPath);
        analysis.description = analysis.packageJson?.description || '';
      }

      // ENHANCED: Deep analysis of index.ts to find actual exports
      await this.analyzeMainExports(analysis);

      // ENHANCED: Deep analysis of each component type
      await this.deepAnalyzeServices(analysis);
      await this.deepAnalyzeActions(analysis);
      await this.deepAnalyzeProviders(analysis);
      await this.deepAnalyzeEvaluators(analysis);

      // ENHANCED: Calculate complexity based on actual component counts
      analysis.complexity = this.calculateComplexity(analysis);

      logger.info(`📊 Enhanced Plugin Analysis: ${analysis.name}`, {
        services: analysis.services.length,
        actions: analysis.actions.length,
        providers: analysis.providers.length,
        evaluators: analysis.evaluators.length,
        complexity: analysis.complexity,
      });
    } catch (error) {
      logger.warn('⚠️  Could not fully analyze plugin structure:', error);
    }

    return analysis;
  }

  /**
   * ENHANCED: Analyze main index.ts exports to understand plugin structure
   */
  private async analyzeMainExports(analysis: PluginAnalysis): Promise<void> {
    const indexPath = path.join(this.repoPath, 'src', 'index.ts');
    if (!(await fs.pathExists(indexPath))) return;

    try {
      const content = await fs.readFile(indexPath, 'utf-8');

      // Check for export patterns
      if (content.includes('actions:') || content.includes('export.*actions')) {
        analysis.hasActions = true;
      }

      if (content.includes('providers:') || content.includes('export.*providers')) {
        analysis.hasProviders = true;
      }

      if (content.includes('services:') || content.includes('export.*services')) {
        analysis.hasServices = true;
      }

      if (content.includes('evaluators:') || content.includes('export.*evaluators')) {
        analysis.hasEvaluators = true;
      }

      // Ensure evaluators array is initialized
      if (!analysis.evaluators) {
        analysis.evaluators = [];
      }

      logger.info('📄 Analyzed main exports in index.ts');
    } catch (error) {
      logger.warn('⚠️ Could not analyze main index.ts:', error);
    }
  }

  /**
   * ENHANCED: Deep analysis of services with actual method discovery
   */
  private async deepAnalyzeServices(analysis: PluginAnalysis): Promise<void> {
    const servicesPath = path.join(this.repoPath, 'src', 'services');
    if (!(await fs.pathExists(servicesPath))) return;

    const serviceFiles = await fs.readdir(servicesPath);

    for (const file of serviceFiles.filter((f) => f.endsWith('.ts'))) {
      try {
        const filePath = path.join(servicesPath, file);
        const content = await fs.readFile(filePath, 'utf-8');

        const serviceName = file.replace('.ts', '');
        const methods = this.extractMethods(content);
        const serviceType = this.extractServiceType(content);

        analysis.services.push({
          name: serviceName,
          type: serviceType || 'service',
          methods,
          filePath: `src/services/${file}`,
          hasStart: content.includes('start(') || content.includes('start :'),
          hasStop: content.includes('stop(') || content.includes('stop :'),
          hasServiceType: content.includes('serviceType'),
          complexity: Math.min(methods.length + 2, 10),
        });

        analysis.hasServices = true;
      } catch (error) {
        logger.warn(`⚠️ Could not analyze service ${file}:`, error);
      }
    }
  }

  /**
   * ENHANCED: Deep analysis of actions with validation and handler discovery
   */
  private async deepAnalyzeActions(analysis: PluginAnalysis): Promise<void> {
    const actionsPath = path.join(this.repoPath, 'src', 'actions');
    if (!(await fs.pathExists(actionsPath))) return;

    const actionFiles = await fs.readdir(actionsPath);

    for (const file of actionFiles.filter((f) => f.endsWith('.ts'))) {
      try {
        const filePath = path.join(actionsPath, file);
        const content = await fs.readFile(filePath, 'utf-8');

        const actionName = file.replace('.ts', '');
        const description = this.extractDescription(content);
        const handler = this.extractHandler(content);
        const validationRules = this.extractValidationRules(content);
        const examples = this.extractExamples(content);

        analysis.actions.push({
          name: actionName,
          description: description || `Action: ${actionName}`,
          handler: handler || 'handler',
          filePath: `src/actions/${file}`,
          hasValidate: content.includes('validate(') || content.includes('validate :'),
          hasHandler: content.includes('handler(') || content.includes('handler :'),
          hasExamples: content.includes('examples') || content.includes('similes'),
          validationRules,
          examples: examples.slice(0, 3), // Limit to 3 examples
          complexity: this.calculateActionComplexity(content),
        });

        analysis.hasActions = true;
      } catch (error) {
        logger.warn(`⚠️ Could not analyze action ${file}:`, error);
      }
    }
  }

  /**
   * ENHANCED: Deep analysis of providers with method discovery
   */
  private async deepAnalyzeProviders(analysis: PluginAnalysis): Promise<void> {
    const providersPath = path.join(this.repoPath, 'src', 'providers');
    if (!(await fs.pathExists(providersPath))) return;

    const providerFiles = await fs.readdir(providersPath);

    for (const file of providerFiles.filter((f) => f.endsWith('.ts'))) {
      try {
        const filePath = path.join(providersPath, file);
        const content = await fs.readFile(filePath, 'utf-8');

        const providerName = file.replace('.ts', '');
        const description = this.extractDescription(content);
        const methods = this.extractMethods(content);
        const dependencies = this.extractDependencies(content);

        analysis.providers.push({
          name: providerName,
          description: description || `Provider: ${providerName}`,
          methods,
          filePath: `src/providers/${file}`,
          hasGet: content.includes('get(') || content.includes('get :'),
          dependencies,
          isAsync: content.includes('async ') || content.includes('Promise'),
          complexity: Math.min(methods.length + dependencies.length, 10),
        });

        analysis.hasProviders = true;
      } catch (error) {
        logger.warn(`⚠️ Could not analyze provider ${file}:`, error);
      }
    }
  }

  /**
   * ENHANCED: Deep analysis of evaluators
   */
  private async deepAnalyzeEvaluators(analysis: PluginAnalysis): Promise<void> {
    const evaluatorsPath = path.join(this.repoPath, 'src', 'evaluators');
    if (!(await fs.pathExists(evaluatorsPath))) return;

    const evaluatorFiles = await fs.readdir(evaluatorsPath);

    for (const file of evaluatorFiles.filter((f) => f.endsWith('.ts'))) {
      try {
        const filePath = path.join(evaluatorsPath, file);
        const content = await fs.readFile(filePath, 'utf-8');

        const evaluatorName = file.replace('.ts', '');
        const description = this.extractDescription(content);
        const criteria = this.extractEvaluationCriteria(content);

        analysis.evaluators.push({
          name: evaluatorName,
          description: description || `Evaluator: ${evaluatorName}`,
          filePath: `src/evaluators/${file}`,
          hasHandler: content.includes('handler(') || content.includes('handler :'),
          criteria,
          complexity: Math.min(criteria.length + 2, 10),
        });

        analysis.hasEvaluators = true;
      } catch (error) {
        logger.warn(`⚠️ Could not analyze evaluator ${file}:`, error);
      }
    }
  }

  /**
   * HELPER: Extract methods from TypeScript content
   */
  private extractMethods(content: string): string[] {
    const methods: string[] = [];

    // Match method definitions: methodName( or methodName :
    const methodPattern = /(?:async\s+)?(\w+)\s*[\(:](?:\s*\()?/g;
    let match;

    while ((match = methodPattern.exec(content)) !== null) {
      const methodName = match[1];
      if (
        methodName &&
        !['import', 'export', 'const', 'let', 'var', 'class', 'interface', 'type'].includes(
          methodName
        ) &&
        !methods.includes(methodName)
      ) {
        methods.push(methodName);
      }
    }

    return methods.slice(0, 10); // Limit to 10 methods
  }

  /**
   * HELPER: Extract description from comments or exports
   */
  private extractDescription(content: string): string {
    // Look for description in comments
    const descriptionMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)(?:\n|\*\/)/);
    if (descriptionMatch) {
      return descriptionMatch[1].trim();
    }

    // Look for description property
    const propMatch = content.match(/description:\s*['"`]([^'"`]+)['"`]/);
    if (propMatch) {
      return propMatch[1];
    }

    return '';
  }

  /**
   * HELPER: Extract handler name
   */
  private extractHandler(content: string): string {
    const handlerMatch = content.match(/handler:\s*(\w+)/);
    return handlerMatch ? handlerMatch[1] : '';
  }

  /**
   * HELPER: Extract service type
   */
  private extractServiceType(content: string): string {
    const typeMatch = content.match(/serviceType:\s*['"`]([^'"`]+)['"`]/);
    return typeMatch ? typeMatch[1] : '';
  }

  /**
   * HELPER: Extract validation rules
   */
  private extractValidationRules(content: string): string[] {
    const rules: string[] = [];

    // Look for common validation patterns
    const patterns = [
      /\.includes\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /\.startsWith\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /\.match\s*\(\s*['"`]([^'"`]+)['"`]/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        rules.push(match[1]);
      }
    }

    return rules.slice(0, 5); // Limit to 5 rules
  }

  /**
   * HELPER: Extract examples
   */
  private extractExamples(content: string): string[] {
    const examples: string[] = [];

    // Look for examples array
    const exampleMatch = content.match(/examples:\s*\[([\s\S]*?)\]/);
    if (exampleMatch) {
      const exampleContent = exampleMatch[1];
      const textMatches = exampleContent.match(/text:\s*['"`]([^'"`]+)['"`]/g);
      if (textMatches) {
        for (const textMatch of textMatches) {
          const text = textMatch.match(/['"`]([^'"`]+)['"`]/);
          if (text) {
            examples.push(text[1]);
          }
        }
      }
    }

    return examples;
  }

  /**
   * HELPER: Extract dependencies
   */
  private extractDependencies(content: string): string[] {
    const deps: string[] = [];

    // Look for import statements
    const importPattern = /import\s+.+?\s+from\s+['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = importPattern.exec(content)) !== null) {
      const dep = match[1];
      if (!dep.startsWith('.') && !dep.startsWith('@elizaos')) {
        deps.push(dep);
      }
    }

    return deps.slice(0, 5); // Limit to 5 dependencies
  }

  /**
   * HELPER: Extract evaluation criteria
   */
  private extractEvaluationCriteria(content: string): string[] {
    const criteria: string[] = [];

    // Look for common evaluation patterns
    const patterns = [
      /score\s*[><=]+\s*([0-9.]+)/g,
      /threshold\s*[><=]+\s*([0-9.]+)/g,
      /confidence\s*[><=]+\s*([0-9.]+)/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        criteria.push(`threshold: ${match[1]}`);
      }
    }

    return criteria;
  }

  /**
   * HELPER: Calculate action complexity
   */
  private calculateActionComplexity(content: string): number {
    let complexity = 1;

    if (content.includes('validate')) complexity += 1;
    if (content.includes('handler')) complexity += 1;
    if (content.includes('examples')) complexity += 1;
    if (content.includes('async')) complexity += 1;
    if (content.includes('await')) complexity += 1;

    return Math.min(complexity, 10);
  }

  /**
   * HELPER: Calculate overall plugin complexity
   */
  private calculateComplexity(analysis: PluginAnalysis): number {
    let complexity = 1;

    complexity += analysis.actions.length * 2;
    complexity += analysis.providers.length * 2;
    complexity += analysis.services.length * 3;
    complexity += analysis.evaluators.length * 2;

    return Math.min(complexity, 10);
  }
}
