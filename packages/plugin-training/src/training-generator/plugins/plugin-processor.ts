/**
 * Plugin Processor - Plugin-Specific Training Data Generation
 * 
 * Processes ElizaOS plugins to generate comprehensive training scenarios.
 * Analyzes plugin structure, functionality, and creates detailed creation workflows.
 */

import type { ExtractedFile } from '../core/file-extractor';
import type { TrainingScenario } from '../core/scenario-generator';
import type { IAgentRuntime } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import * as path from 'path';

export interface PluginAnalysis {
  name: string;
  description: string;
  functionality: string[];
  architecture: string;
  dependencies: string[];
  actions: ActionInfo[];
  providers: ProviderInfo[];
  evaluators: EvaluatorInfo[];
  services: ServiceInfo[];
  routes: RouteInfo[];
  tests: TestInfo[];
  mainFile: string;
  packageInfo: PackageInfo;
}

export interface ActionInfo {
  name: string;
  file: string;
  description: string;
  similes: string[];
}

export interface ProviderInfo {
  name: string;
  file: string;
  description: string;
  dynamic: boolean;
}

export interface EvaluatorInfo {
  name: string;
  file: string;
  description: string;
}

export interface ServiceInfo {
  name: string;
  file: string;
  className: string;
  serviceType: string;
}

export interface RouteInfo {
  path: string;
  method: string;
  handler: string;
  file: string;
}

export interface TestInfo {
  file: string;
  type: 'unit' | 'integration' | 'e2e';
  testCount: number;
}

export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export class PluginProcessor {
  constructor(private runtime: IAgentRuntime) {}

  /**
   * Process a complete plugin repository
   */
  async processPlugin(repoDir: string, files: ExtractedFile[]): Promise<TrainingScenario[]> {
    elizaLogger.info(`🔌 Processing plugin in: ${repoDir}`);
    
    // Analyze plugin structure and functionality
    const analysis = await this.analyzePlugin(files);
    
    elizaLogger.info(`📋 Analyzed plugin: ${analysis.name}`);
    elizaLogger.info(`   Actions: ${analysis.actions.length}`);
    elizaLogger.info(`   Providers: ${analysis.providers.length}`);
    elizaLogger.info(`   Services: ${analysis.services.length}`);
    
    // Generate comprehensive plugin description
    const description = await this.generateAnalysisDescription(
      analysis.name, 
      analysis.actions, 
      analysis.providers, 
      analysis.services, 
      files[0]?.content || ''
    );
    
    // Create user query for plugin creation
    const userQuery = await this.generatePluginUserQuery(analysis);
    
    // Generate thinking process for plugin development
    const thinkingProcess = await this.generatePluginThinkingProcess(analysis, files);
    
    // Format all plugin files with detailed markup
    const concatenatedCode = this.concatenatePluginFiles(files, analysis);
    
    // Create main plugin training scenario
    const mainScenario: TrainingScenario = {
      id: `plugin-${analysis.name.replace(/[^a-zA-Z0-9]/g, '-')}`,
      type: 'plugin-creation',
      userQuery,
      context: {
        fileTree: this.generatePluginFileTree(files),
        relatedFiles: files,
        targetFile: files.find(f => f.relativePath === analysis.mainFile) || files[0],
        repositoryContext: this.generatePluginContext(analysis)
      },
      thinkingProcess,
      expectedOutput: concatenatedCode,
      metadata: {
        complexity: this.assessPluginComplexity(analysis),
        estimatedTokens: this.estimateTokens(userQuery + thinkingProcess + concatenatedCode),
        language: 'typescript',
        purpose: `ElizaOS plugin: ${analysis.functionality.join(', ')}`,
        generationTime: Date.now()
      }
    };

    // Generate additional scenarios for individual components
    const componentScenarios = await this.generateComponentScenarios(analysis, files);
    
    elizaLogger.info(`✅ Generated ${1 + componentScenarios.length} scenarios for plugin ${analysis.name}`);
    
    return [mainScenario, ...componentScenarios];
  }

  /**
   * Analyze plugin structure and extract component information
   */
  private async analyzePlugin(files: ExtractedFile[]): Promise<PluginAnalysis> {
    // Find main plugin file
    const mainFile = this.findMainPluginFile(files);
    if (!mainFile) {
      throw new Error('Could not find main plugin file');
    }

    // Find package.json
    const packageFile = files.find(f => f.relativePath.endsWith('package.json'));
    const packageInfo = packageFile ? this.parsePackageJson(packageFile.content) : this.getDefaultPackageInfo();

    // Extract plugin name
    const name = this.extractPluginName(mainFile, packageInfo);

    // Analyze components
    const actions = this.extractActions(files);
    const providers = this.extractProviders(files);
    const evaluators = this.extractEvaluators(files);
    const services = this.extractServices(files);
    const routes = this.extractRoutes(files);
    const tests = this.extractTests(files);

    // Get all dependencies
    const dependencies = this.extractAllDependencies(files);

    // Generate description using LLM
    const description = await this.generateAnalysisDescription(name, actions, providers, services, mainFile.content);

    return {
      name,
      description,
      functionality: this.determineFunctionality(actions, providers, evaluators, services, routes),
      architecture: 'Standard ElizaOS plugin architecture with TypeScript',
      dependencies,
      actions,
      providers,
      evaluators,
      services,
      routes,
      tests,
      mainFile: mainFile.relativePath,
      packageInfo
    };
  }

  /**
   * Find the main plugin file
   */
  private findMainPluginFile(files: ExtractedFile[]): ExtractedFile | null {
    // Look for files that export a Plugin object
    for (const file of files) {
      if (
        (file.relativePath.includes('index.ts') || file.relativePath.includes('plugin.ts')) &&
        (file.content.includes(': Plugin') || file.content.includes('export const') && file.content.includes('Plugin'))
      ) {
        return file;
      }
    }

    // Fallback to any file with Plugin export
    for (const file of files) {
      if (file.content.includes(': Plugin') || file.content.includes('export.*Plugin')) {
        return file;
      }
    }

    return null;
  }

  /**
   * Extract action information from files
   */
  private extractActions(files: ExtractedFile[]): ActionInfo[] {
    const actions: ActionInfo[] = [];

    for (const file of files) {
      // Look for Action exports
      const actionMatches = file.content.matchAll(/export const (\w+):\s*Action\s*=\s*{([^}]+)}/gs);
      
      for (const match of actionMatches) {
        const actionName = match[1];
        const actionBody = match[2];
        
        // Extract description
        const descMatch = actionBody.match(/description:\s*['"`]([^'"`]+)['"`]/);
        const description = descMatch ? descMatch[1] : 'Action description not found';
        
        // Extract similes
        const similesMatch = actionBody.match(/similes:\s*\[([^\]]+)\]/);
        const similes = similesMatch 
          ? similesMatch[1].split(',').map(s => s.trim().replace(/['"`]/g, ''))
          : [];

        actions.push({
          name: actionName,
          file: file.relativePath,
          description,
          similes
        });
      }
    }

    return actions;
  }

  /**
   * Extract provider information from files
   */
  private extractProviders(files: ExtractedFile[]): ProviderInfo[] {
    const providers: ProviderInfo[] = [];

    for (const file of files) {
      const providerMatches = file.content.matchAll(/export const (\w+):\s*Provider\s*=\s*{([^}]+)}/gs);
      
      for (const match of providerMatches) {
        const providerName = match[1];
        const providerBody = match[2];
        
        const descMatch = providerBody.match(/description:\s*['"`]([^'"`]+)['"`]/);
        const description = descMatch ? descMatch[1] : 'Provider description not found';
        
        const dynamicMatch = providerBody.match(/dynamic:\s*(true|false)/);
        const dynamic = dynamicMatch ? dynamicMatch[1] === 'true' : false;

        providers.push({
          name: providerName,
          file: file.relativePath,
          description,
          dynamic
        });
      }
    }

    return providers;
  }

  /**
   * Extract evaluator information from files
   */
  private extractEvaluators(files: ExtractedFile[]): EvaluatorInfo[] {
    const evaluators: EvaluatorInfo[] = [];

    for (const file of files) {
      const evaluatorMatches = file.content.matchAll(/export const (\w+):\s*Evaluator\s*=\s*{([^}]+)}/gs);
      
      for (const match of evaluatorMatches) {
        const evaluatorName = match[1];
        const evaluatorBody = match[2];
        
        const descMatch = evaluatorBody.match(/description:\s*['"`]([^'"`]+)['"`]/);
        const description = descMatch ? descMatch[1] : 'Evaluator description not found';

        evaluators.push({
          name: evaluatorName,
          file: file.relativePath,
          description
        });
      }
    }

    return evaluators;
  }

  /**
   * Extract service information from files
   */
  private extractServices(files: ExtractedFile[]): ServiceInfo[] {
    const services: ServiceInfo[] = [];

    for (const file of files) {
      // Look for classes extending Service
      const serviceMatches = file.content.matchAll(/export class (\w+) extends Service\s*{/g);
      
      for (const match of serviceMatches) {
        const className = match[1];
        
        // Extract service name and type
        const serviceNameMatch = file.content.match(/static serviceName\s*=\s*['"`]([^'"`]+)['"`]/);
        const serviceTypeMatch = file.content.match(/static serviceType\s*=\s*['"`]([^'"`]+)['"`]/);
        
        const serviceName = serviceNameMatch ? serviceNameMatch[1] : className.toLowerCase();
        const serviceType = serviceTypeMatch ? serviceTypeMatch[1] : 'unknown';

        services.push({
          name: serviceName,
          file: file.relativePath,
          className,
          serviceType
        });
      }
    }

    return services;
  }

  /**
   * Extract route information from files
   */
  private extractRoutes(files: ExtractedFile[]): RouteInfo[] {
    const routes: RouteInfo[] = [];

    for (const file of files) {
      // Look for route definitions
      const routeMatches = file.content.matchAll(/{\s*path:\s*['"`]([^'"`]+)['"`],\s*type:\s*['"`]([^'"`]+)['"`],\s*handler:\s*(\w+)/gs);
      
      for (const match of routeMatches) {
        routes.push({
          path: match[1],
          method: match[2],
          handler: match[3],
          file: file.relativePath
        });
      }
    }

    return routes;
  }

  /**
   * Extract test information from files
   */
  private extractTests(files: ExtractedFile[]): TestInfo[] {
    const tests: TestInfo[] = [];

    for (const file of files) {
      if (file.isTestFile) {
        const testMatches = file.content.match(/(?:describe|it|test)\s*\(/g);
        const testCount = testMatches ? testMatches.length : 0;
        
        let type: 'unit' | 'integration' | 'e2e' = 'unit';
        if (file.relativePath.includes('e2e')) type = 'e2e';
        else if (file.relativePath.includes('integration')) type = 'integration';

        tests.push({
          file: file.relativePath,
          type,
          testCount
        });
      }
    }

    return tests;
  }

  /**
   * Generate plugin user query
   */
  private async generatePluginUserQuery(analysis: PluginAnalysis): Promise<string> {
    const prompt = `
Generate a realistic user request that would lead to creating this ElizaOS plugin:

Plugin Name: ${analysis.name}
Description: ${analysis.description}
Functionality: ${analysis.functionality.join(', ')}

Components:
- Actions: ${analysis.actions.map(a => a.name).join(', ')}
- Providers: ${analysis.providers.map(p => p.name).join(', ')}
- Services: ${analysis.services.map(s => s.name).join(', ')}

Requirements:
1. Make it sound like a natural request from someone who needs this functionality
2. Be specific about what they want to accomplish
3. Mention the type of ElizaOS integration they need
4. Include the business use case or problem they're solving
5. Keep it realistic and detailed

Generate only the user request, nothing else.`;

    const response = await this.runtime.useModel('TEXT_LARGE', {
      prompt,
      temperature: 0.7,
      max_tokens: 300
    });

    return (response as string).trim();
  }

  /**
   * Generate plugin thinking process
   */
  private async generatePluginThinkingProcess(analysis: PluginAnalysis, files: ExtractedFile[]): Promise<string> {
    const prompt = `
Generate a comprehensive thinking process for creating this ElizaOS plugin.

Plugin Analysis:
- Name: ${analysis.name}
- Description: ${analysis.description}
- Actions: ${analysis.actions.map(a => `${a.name} (${a.description})`).join(', ')}
- Providers: ${analysis.providers.map(p => `${p.name} (${p.description})`).join(', ')}
- Services: ${analysis.services.map(s => `${s.name} (${s.serviceType})`).join(', ')}
- Dependencies: ${analysis.dependencies.slice(0, 10).join(', ')}

Create a detailed thinking process that covers:

1. **Problem Analysis**: Understanding what the user needs and why
2. **Plugin Architecture**: How to structure this as an ElizaOS plugin
3. **Component Design**: Planning actions, providers, evaluators, and services
4. **Implementation Strategy**: Step-by-step development approach
5. **ElizaOS Integration**: How this fits into the ElizaOS ecosystem
6. **File Organization**: Directory structure and file placement
7. **Core Dependencies**: What ElizaOS core components to use
8. **External Dependencies**: What third-party packages are needed
9. **Configuration**: How users will configure this plugin
10. **Testing Strategy**: How to ensure the plugin works correctly
11. **Error Handling**: How to handle failures gracefully
12. **Performance**: How to make this efficient and scalable

Make this realistic - think like a senior ElizaOS plugin developer.
Include specific reasoning about ElizaOS patterns and conventions.
Be detailed about the implementation approach for each component.`;

    const response = await this.runtime.useModel('TEXT_LARGE', {
      prompt,
      temperature: 0.5,
      max_tokens: 2000
    });

    return `<thinking>\n${response}\n</thinking>`;
  }

  /**
   * Concatenate all plugin files with detailed markup
   */
  private concatenatePluginFiles(files: ExtractedFile[] analysis: PluginAnalysis): string {
    let output = '';
    
    // Add plugin overview
    output += `<plugin_overview>\n`;
    output += `Name: ${analysis.name}\n`;
    output += `Description: ${analysis.description}\n`;
    output += `Main File: ${analysis.mainFile}\n`;
    output += `Components: ${analysis.actions.length} actions, ${analysis.providers.length} providers, ${analysis.services.length} services\n`;
    output += `Dependencies: ${analysis.dependencies.slice(0, 5).join(', ')}\n`;
    output += `</plugin_overview>\n\n`;
    
    // Add file tree
    output += '<file_tree>\n';
    output += this.generatePluginFileTree(files);
    output += '</file_tree>\n\n';
    
    // Add each file with detailed markup
    for (const file of files) {
      const componentType = this.identifyComponentType(file, analysis);
      
      output += `<file path="${file.relativePath}" language="${file.language}" purpose="${file.purpose}" component_type="${componentType}">\n`;
      output += file.content;
      output += '\n</file>\n\n';
    }
    
    return output;
  }

  /**
   * Generate plugin-specific file tree
   */
  private generatePluginFileTree(files: ExtractedFile[]): string {
    const tree: Record<string, any> = {};
    
    for (const file of files) {
      const parts = file.relativePath.split('/');
      let current = tree;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current[part] = {
            type: 'file',
            language: file.language,
            size: `${Math.round(file.size / 1024)}KB`,
            purpose: file.purpose.split(', ')[0]
          };
        } else {
          current[part] = current[part] || { type: 'directory' };
          current = current[part];
        }
      }
    }
    
    return this.formatPluginTree(tree, 0);
  }

  /**
   * Format plugin tree with additional metadata
   */
  private formatPluginTree(obj: any, depth: number): string {
    const indent = '  '.repeat(depth);
    let result = '';
    
    const entries = Object.entries(obj).filter(([key]) => key !== 'type');
    
    for (const [key, value] of entries) {
      if (typeof value === 'object' && value !== null && (value as any).type === 'file') {
        result += `${indent}├── ${key} (${(value as any).language}, ${(value as any).size}, ${(value as any).purpose})\n`;
      } else if (typeof value === 'object' && value !== null && (value as any).type === 'directory') {
        result += `${indent}├── ${key}/\n`;
        result += this.formatPluginTree(value, depth + 1);
      }
    }
    
    return result;
  }

  /**
   * Generate additional scenarios for individual components
   */
  private async generateComponentScenarios(analysis: PluginAnalysis, files: ExtractedFile[]): Promise<TrainingScenario[]> {
    const scenarios: TrainingScenario[] = [];
    
    // Generate scenarios for actions
    for (const action of analysis.actions.slice(0, 3)) { // Limit to first 3
      const actionFile = files.find(f => f.relativePath === action.file);
      if (actionFile) {
        const scenario = await this.generateActionScenario(action, actionFile, analysis);
        scenarios.push(scenario);
      }
    }
    
    // Generate scenarios for services
    for (const service of analysis.services.slice(0, 2)) { // Limit to first 2
      const serviceFile = files.find(f => f.relativePath === service.file);
      if (serviceFile) {
        const scenario = await this.generateServiceScenario(service, serviceFile, analysis);
        scenarios.push(scenario);
      }
    }
    
    return scenarios;
  }

  /**
   * Generate training scenario for a specific action
   */
  private async generateActionScenario(action: ActionInfo, file: ExtractedFile, analysis: PluginAnalysis): Promise<TrainingScenario> {
    const userQuery = `Create an ElizaOS action called ${action.name} that ${action.description.toLowerCase()}`;
    
    const thinkingProcess = `<thinking>
The user wants to create an ElizaOS action for ${action.description}. This will be part of the ${analysis.name} plugin.

An ElizaOS action needs:
1. Name and similes for recognition
2. Validation function to check if action applies
3. Handler function to execute the action
4. Examples for the LLM to understand usage

For this action, I need to:
- Define the action structure with proper typing
- Implement validation logic for when this action should trigger
- Create the handler that performs the actual functionality
- Include proper error handling and response formatting
- Add example interactions to guide the LLM
</thinking>`;

    return {
      id: `action-${analysis.name}-${action.name}`,
      type: 'file-creation',
      userQuery,
      context: {
        fileTree: `src/actions/${path.basename(action.file)}`,
        relatedFiles: []
        targetFile: file,
        repositoryContext: `ElizaOS Plugin: ${analysis.name}`
      },
      thinkingProcess,
      expectedOutput: `<file path="${action.file}" language="typescript" purpose="ElizaOS action">
${file.content}
</file>`,
      metadata: {
        complexity: 'medium',
        estimatedTokens: this.estimateTokens(userQuery + thinkingProcess + file.content),
        language: 'typescript',
        purpose: `ElizaOS action: ${action.description}`,
        generationTime: Date.now()
      }
    };
  }

  /**
   * Generate training scenario for a specific service
   */
  private async generateServiceScenario(service: ServiceInfo, file: ExtractedFile, analysis: PluginAnalysis): Promise<TrainingScenario> {
    const userQuery = `Create an ElizaOS service for ${analysis.name} that manages ${service.serviceType} functionality`;
    
    const thinkingProcess = `<thinking>
The user needs a service for the ${analysis.name} plugin to handle ${service.serviceType} functionality.

ElizaOS services are long-running components that:
1. Extend the Service base class
2. Have static serviceName and serviceType properties
3. Implement start() and stop() lifecycle methods
4. Provide capabilities that actions and providers can use

For this service, I need to:
- Create a class that extends Service
- Define the service metadata (name, type)
- Implement the initialization and cleanup logic
- Provide methods that other components can use
- Handle configuration and error scenarios
</thinking>`;

    return {
      id: `service-${analysis.name}-${service.name}`,
      type: 'file-creation',
      userQuery,
      context: {
        fileTree: `src/services/${path.basename(service.file)}`,
        relatedFiles: []
        targetFile: file,
        repositoryContext: `ElizaOS Plugin: ${analysis.name}`
      },
      thinkingProcess,
      expectedOutput: `<file path="${service.file}" language="typescript" purpose="ElizaOS service">
${file.content}
</file>`,
      metadata: {
        complexity: 'complex',
        estimatedTokens: this.estimateTokens(userQuery + thinkingProcess + file.content),
        language: 'typescript',
        purpose: `ElizaOS service: ${service.serviceType}`,
        generationTime: Date.now()
      }
    };
  }

  // Helper methods...
  
  private extractPluginName(mainFile: ExtractedFile, packageInfo: PackageInfo): string {
    // Try to extract from plugin object
    const nameMatch = mainFile.content.match(/name:\s*['"]([^'"]+)['"]/);
    if (nameMatch) return nameMatch[1];
    
    // Use package name
    if (packageInfo.name) return packageInfo.name;
    
    // Fallback to filename
    return path.basename(mainFile.relativePath, '.ts');
  }

  private parsePackageJson(content: string): PackageInfo {
    try {
      const pkg = JSON.parse(content);
      return {
        name: pkg.name || 'unknown-plugin',
        version: pkg.version || '1.0.0',
        description: pkg.description || '',
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {}
      };
    } catch (error) {
      return this.getDefaultPackageInfo();
    }
  }

  private getDefaultPackageInfo(): PackageInfo {
    return {
      name: 'unknown-plugin',
      version: '1.0.0',
      description: '',
      dependencies: {},
      devDependencies: {}
    };
  }

  private extractAllDependencies(files: ExtractedFile[]): string[] {
    const dependencies = new Set<string>();
    
    for (const file of files) {
      file.dependencies.forEach(dep => dependencies.add(dep));
    }
    
    return Array.from(dependencies);
  }

  private determineFunctionality(actions: ActionInfo[] providers: ProviderInfo[] evaluators: EvaluatorInfo[] services: ServiceInfo[] routes: RouteInfo[]): string[] {
    const functionality: string[] = [];
    
    if (actions.length > 0) functionality.push('actions');
    if (providers.length > 0) functionality.push('providers');
    if (evaluators.length > 0) functionality.push('evaluators');
    if (services.length > 0) functionality.push('services');
    if (routes.length > 0) functionality.push('routes');
    
    return functionality;
  }

  private generatePluginContext(analysis: PluginAnalysis): string {
    return `ElizaOS Plugin: ${analysis.name} - ${analysis.description}. Components: ${analysis.functionality.join(', ')}.`;
  }

  private assessPluginComplexity(analysis: PluginAnalysis): 'simple' | 'medium' | 'complex' {
    const componentCount = analysis.actions.length + analysis.providers.length + analysis.services.length;
    
    if (componentCount > 10) return 'complex';
    if (componentCount > 5) return 'medium';
    return 'simple';
  }

  private identifyComponentType(file: ExtractedFile, analysis: PluginAnalysis): string {
    if (file.relativePath === analysis.mainFile) return 'main_plugin';
    if (file.isTestFile) return 'test';
    if (file.isConfigFile) return 'config';
    if (file.relativePath.includes('actions')) return 'action';
    if (file.relativePath.includes('providers')) return 'provider';
    if (file.relativePath.includes('evaluators')) return 'evaluator';
    if (file.relativePath.includes('services')) return 'service';
    if (file.relativePath.includes('types')) return 'types';
    return 'utility';
  }

  private async generateAnalysisDescription(name: string, actions: ActionInfo[] providers: ProviderInfo[] services: ServiceInfo[] content: string): Promise<string> {
    const prompt = `
Analyze this ElizaOS plugin and provide a concise description:

Plugin Name: ${name}
Actions: ${actions.map(a => a.name).join(', ')}
Providers: ${providers.map(p => p.name).join(', ')}
Services: ${services.map(s => s.name).join(', ')}

Main file content preview:
${content.substring(0, 500)}...

Provide a 1-2 sentence description of what this plugin does and its main functionality.`;

    const response = await this.runtime.useModel('TEXT_LARGE', {
      prompt,
      temperature: 0.3,
      max_tokens: 100
    });

    return (response as string).trim();
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

elizaLogger.info('✅ Plugin processor module loaded');