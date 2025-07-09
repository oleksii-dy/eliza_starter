import {
  Service,
  elizaLogger,
  type IAgentRuntime,
  type Memory,
  type State,
  ModelType,
} from '@elizaos/core';
import { FormsService, type Form } from '@elizaos/plugin-forms';
import { E2BService } from '@elizaos/plugin-e2b';
import { GitHubService } from './GitHubService';
import { SecretsManagerService } from './SecretsManagerService';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface CodeGenerationRequest {
  projectName: string;
  description: string;
  requirements: string[];
  apis: string[];
  targetType: 'plugin' | 'agent' | 'workflow' | 'mcp' | 'full-stack';
  githubRepo?: string;
  testScenarios?: string[];
}

export interface GenerationFile {
  path: string;
  content: string;
}

export interface ExecutionResults {
  testsPass: boolean;
  lintPass: boolean;
  typesPass: boolean;
  buildPass: boolean;
  securityPass: boolean;
}

export interface GenerationResult {
  success: boolean;
  projectPath?: string;
  githubUrl?: string;
  agentId?: string;
  files?: GenerationFile[];
  executionResults?: ExecutionResults;
  errors?: string[];
  warnings?: string[];
}

interface ResearchResult {
  apis: {
    name: string;
    documentation: string;
    examples: string[];
    bestPractices: string[];
  }[];
  similarProjects: {
    name: string;
    description: string;
    relevantCode: string[];
    patterns: string[];
  }[];
  elizaContext: {
    coreTypes: string[];
    patterns: string[];
    conventions: string[];
  };
}

interface QAResult {
  passed: boolean;
  lintErrors: number;
  typeErrors: number;
  testsFailed: number;
  buildSuccess: boolean;
  securityIssues: string[];
  coverage?: number;
  details: string[];
}

export class CodeGenerationService extends Service {
  static serviceName: string = 'code-generation';
  protected runtime: IAgentRuntime;
  private e2bService?: E2BService;
  private formsService?: FormsService;
  private githubService?: GitHubService;
  private secretsManager?: SecretsManagerService;
  private sandboxId?: string;

  constructor(runtime: IAgentRuntime) {
    super();
    this.runtime = runtime;
  }

  get capabilityDescription(): string {
    return 'Generates complete ElizaOS projects using Claude Code in sandboxed environments';
  }

  async start(): Promise<void> {
    elizaLogger.info('Starting CodeGenerationService');

    // Get required services
    const e2bService = this.runtime.getService<E2BService>('e2b');
    if (!e2bService) {
      throw new Error('E2B service is required for code generation');
    }
    this.e2bService = e2bService;

    const formsService = this.runtime.getService<FormsService>('forms');
    if (!formsService) {
      throw new Error('Forms service is required for code generation');
    }
    this.formsService = formsService;

    this.githubService = this.runtime.getService<GitHubService>('github') || undefined;
    this.secretsManager =
      this.runtime.getService<SecretsManagerService>('secrets-manager') || undefined;

    elizaLogger.info('CodeGenerationService started successfully');
  }

  async stop(): Promise<void> {
    elizaLogger.info('Stopping CodeGenerationService');

    if (this.sandboxId && this.e2bService) {
      try {
        await this.e2bService.killSandbox(this.sandboxId);
      } catch (error) {
        elizaLogger.error('Error stopping sandbox:', error);
      }
    }
  }

  /**
   * Research APIs, similar projects, and ElizaOS patterns
   */
  private async performResearch(request: CodeGenerationRequest): Promise<ResearchResult> {
    elizaLogger.info('Performing research for project:', request.projectName);

    // Use o3-research-preview for API research
    const apiResearch = await Promise.all(
      request.apis.map(async (api) => {
        const prompt = `Research the ${api} API for integration in an ElizaOS ${request.targetType}. 
          Provide documentation links, code examples, authentication methods, and best practices.`;

        const response = await this.generateCodeWithTimeout(prompt, 2000, 60000); // 1 minute timeout for API research

        return {
          name: api,
          documentation: response,
          examples: this.extractCodeExamples(response),
          bestPractices: this.extractBestPractices(response),
        };
      })
    );

    // Search for similar projects in the codebase
    const similarProjects = await this.searchSimilarProjects(request);

    // Get ElizaOS context
    const elizaContext = await this.getElizaContext(request.targetType);

    return {
      apis: apiResearch,
      similarProjects,
      elizaContext,
    };
  }

  /**
   * Generate PRD and implementation plan
   */
  private async generatePRD(
    request: CodeGenerationRequest,
    research: ResearchResult
  ): Promise<string> {
    elizaLogger.info('Generating PRD and implementation plan');

    const prompt = `Generate a comprehensive Product Requirements Document (PRD) and implementation plan for:

Project: ${request.projectName}
Type: ${request.targetType}
Description: ${request.description}

Requirements:
${request.requirements.map((r) => `- ${r}`).join('\n')}

API Research:
${research.apis
  .map(
    (api) => `
${api.name}:
${api.documentation}
Examples: ${api.examples.join(', ')}
`
  )
  .join('\n')}

Similar Projects:
${research.similarProjects
  .map(
    (p) => `
${p.name}: ${p.description}
Patterns: ${p.patterns.join(', ')}
`
  )
  .join('\n')}

ElizaOS Context:
- Core Types: ${research.elizaContext.coreTypes.join(', ')}
- Patterns: ${research.elizaContext.patterns.join(', ')}
- Conventions: ${research.elizaContext.conventions.join(', ')}

Generate a detailed PRD following ElizaOS best practices including:
1. User stories and scenarios
2. Technical architecture
3. File structure
4. Implementation steps
5. Testing strategy
6. Security considerations`;

    const response = await this.generateCodeWithTimeout(prompt, 4000, 90000); // 1.5 minute timeout for PRD

    return response;
  }

  /**
   * Quality assurance - run linting, type checking, building, and testing
   */
  private async performQA(projectPath: string): Promise<QAResult> {
    elizaLogger.info('Performing quality assurance on project');

    const results: QAResult = {
      passed: false,
      lintErrors: 0,
      typeErrors: 0,
      testsFailed: 0,
      buildSuccess: false,
      securityIssues: [],
      details: [],
    };

    // Get E2B service for direct execution
    const e2bService = this.runtime.getService('e2b');
    if (!e2bService) {
      throw new Error('E2B service not available for QA');
    }

    try {
      // Run lint
      const lintResult = await e2bService.executeCode(`
import subprocess
import os

os.chdir("${projectPath}")

# Check if package.json has lint script
try:
    with open("package.json", "r") as f:
        import json
        package_data = json.load(f)
        scripts = package_data.get("scripts", {})
        
        if "lint" in scripts:
            result = subprocess.run(["bun", "run", "lint"], 
                                  capture_output=True, text=True, timeout=60)
            print("LINT_OUTPUT:", result.stdout)
            print("LINT_ERRORS:", result.stderr)
            print("LINT_EXIT_CODE:", result.returncode)
        else:
            print("LINT_OUTPUT: No lint script found")
            print("LINT_EXIT_CODE: 0")
except Exception as e:
    print("LINT_ERROR:", str(e))
    print("LINT_EXIT_CODE: 1")
`, 'python');

      if (lintResult.error) {
        results.lintErrors = 1;
        results.details.push(`Lint errors: ${results.lintErrors}`);
      } else {
        const exitCode = lintResult.text?.match(/LINT_EXIT_CODE:\s*(\d+)/)?.[1];
        if (exitCode && parseInt(exitCode) !== 0) {
          results.lintErrors = this.countErrors(lintResult.text || '', 'error');
          results.details.push(`Lint errors: ${results.lintErrors}`);
        }
      }

      // Run type check
      const typeResult = await e2bService.executeCode(`
import subprocess
import os

os.chdir("${projectPath}")

# Run TypeScript type checking
try:
    result = subprocess.run(["bun", "run", "tsc", "--noEmit"], 
                          capture_output=True, text=True, timeout=120)
    print("TYPE_OUTPUT:", result.stdout)
    print("TYPE_ERRORS:", result.stderr)
    print("TYPE_EXIT_CODE:", result.returncode)
except Exception as e:
    print("TYPE_ERROR:", str(e))
    print("TYPE_EXIT_CODE: 1")
`, 'python');

      if (typeResult.error) {
        results.typeErrors = 1;
        results.details.push(`Type errors: ${results.typeErrors}`);
      } else {
        const exitCode = typeResult.text?.match(/TYPE_EXIT_CODE:\s*(\d+)/)?.[1];
        if (exitCode && parseInt(exitCode) !== 0) {
          results.typeErrors = this.countErrors(typeResult.text || '', 'error');
          results.details.push(`Type errors: ${results.typeErrors}`);
        }
      }

      // Run build
      const buildResult = await e2bService.executeCode(`
import subprocess
import os

os.chdir("${projectPath}")

# Run build
try:
    result = subprocess.run(["bun", "run", "build"], 
                          capture_output=True, text=True, timeout=180)
    print("BUILD_OUTPUT:", result.stdout)
    print("BUILD_ERRORS:", result.stderr)
    print("BUILD_EXIT_CODE:", result.returncode)
except Exception as e:
    print("BUILD_ERROR:", str(e))
    print("BUILD_EXIT_CODE: 1")
`, 'python');

      if (buildResult.error) {
        results.buildSuccess = false;
        results.details.push('Build: Failed (E2B error)');
      } else {
        const exitCode = buildResult.text?.match(/BUILD_EXIT_CODE:\s*(\d+)/)?.[1];
        results.buildSuccess = exitCode ? parseInt(exitCode) === 0 : false;
        results.details.push(`Build: ${results.buildSuccess ? 'Success' : 'Failed'}`);
      }

      // Run tests
      const testResult = await e2bService.executeCode(`
import subprocess
import os

os.chdir("${projectPath}")

# Run tests
try:
    result = subprocess.run(["bun", "test"], 
                          capture_output=True, text=True, timeout=240)
    print("TEST_OUTPUT:", result.stdout)
    print("TEST_ERRORS:", result.stderr)
    print("TEST_EXIT_CODE:", result.returncode)
except Exception as e:
    print("TEST_ERROR:", str(e))
    print("TEST_EXIT_CODE: 1")
`, 'python');

      if (testResult.error) {
        results.testsFailed = 1;
        results.details.push(`Tests failed: ${results.testsFailed}`);
      } else {
        const exitCode = testResult.text?.match(/TEST_EXIT_CODE:\s*(\d+)/)?.[1];
        if (exitCode && parseInt(exitCode) !== 0) {
          results.testsFailed = this.countErrors(testResult.text || '', 'failed');
          results.details.push(`Tests failed: ${results.testsFailed}`);
        }
      }

      // Security review using AI model
      const securityPrompt = `Perform a security review of the project at ${projectPath}. 
        Check for:
        - Exposed secrets or API keys in code
        - Vulnerable dependencies
        - Security best practices
        - Unsafe code patterns
        - Input validation issues
        
        Provide a list of specific security issues found.`;

      const securityResponse = await this.generateCodeWithTimeout(securityPrompt, 1000, 30000); // 30 second timeout for security scan

      if (securityResponse) {
        results.securityIssues = this.extractSecurityIssues(securityResponse as string);
        results.details.push(`Security issues: ${results.securityIssues.length}`);
      }

      // Determine if QA passed
      results.passed =
        results.lintErrors === 0 &&
        results.typeErrors === 0 &&
        results.testsFailed === 0 &&
        results.buildSuccess &&
        results.securityIssues.length === 0;
    } catch (error) {
      elizaLogger.error('QA error:', error);
      results.details.push(`QA error: ${(error as Error).message}`);
    }

    return results;
  }

  /**
   * Main generation method
   */
  async generateCode(request: CodeGenerationRequest): Promise<GenerationResult> {
    const maxRetries = 3;
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxRetries) {
      try {
        elizaLogger.info(`Starting code generation for: ${request.projectName} (attempt ${attempt + 1}/${maxRetries})`);
        
        return await this.generateCodeInternal(request);
      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        elizaLogger.warn(`Generation attempt ${attempt} failed: ${lastError.message}`);
        
        // Check if this is a timeout error
        if (this.isTimeoutError(lastError)) {
          elizaLogger.info('Detected timeout error, will use chunked generation strategy on retry');
        }
        
        // Clean up sandbox if it was created
        if (this.sandboxId) {
          try {
            await this.e2bService?.killSandbox(this.sandboxId);
          } catch (cleanupError) {
            elizaLogger.warn('Failed to cleanup sandbox:', cleanupError);
          }
          this.sandboxId = undefined;
        }
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
          elizaLogger.info(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    throw new Error(`Code generation failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Check if an error is related to timeouts
   */
  private isTimeoutError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('timeout') || 
           message.includes('timed out') || 
           message.includes('request timeout') ||
           message.includes('connection timeout') ||
           message.includes('response timeout') ||
           message.includes('aborted') ||
           message.includes('network timeout');
  }

  /**
   * Get timeout configuration from environment
   */
  private getTimeoutConfig(): { timeout: number; maxRetries: number; requestTimeout: number } {
    return {
      timeout: parseInt(this.runtime.getSetting('OPENAI_TIMEOUT') || '300000'),
      maxRetries: parseInt(this.runtime.getSetting('OPENAI_MAX_RETRIES') || '3'),
      requestTimeout: parseInt(this.runtime.getSetting('OPENAI_REQUEST_TIMEOUT') || '600000'),
    };
  }

  /**
   * Generate code with timeout handling and chunked generation fallback
   */
  private async generateCodeWithTimeout(prompt: string, maxTokens: number = 8000, timeoutMs?: number): Promise<string> {
    const config = this.getTimeoutConfig();
    const actualTimeout = timeoutMs || config.timeout;
    
    try {
      // Try with normal generation first
      elizaLogger.info(`Attempting code generation with ${actualTimeout}ms timeout (configurable via OPENAI_TIMEOUT)`);
      
      const promise = this.runtime.useModel('TEXT_LARGE', {
        prompt,
        maxTokens,
        temperature: 0.7,
      });
      
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Code generation timeout after ${actualTimeout}ms`)), actualTimeout);
      });
      
      // Race between generation and timeout
      const result = await Promise.race([promise, timeoutPromise]);
      elizaLogger.info('Code generation completed successfully');
      return result as string;
      
    } catch (error) {
      if (this.isTimeoutError(error as Error)) {
        elizaLogger.warn('Generation timed out, attempting chunked generation');
        return await this.generateCodeInChunks(prompt, maxTokens);
      }
      throw error;
    }
  }

  /**
   * Generate code in smaller chunks to avoid timeouts
   */
  private async generateCodeInChunks(originalPrompt: string, maxTokens: number): Promise<string> {
    elizaLogger.info('Starting chunked code generation to avoid timeouts');
    
    // Break the generation into smaller, focused chunks
    const chunks = [
      {
        name: 'Core Structure',
        prompt: `${originalPrompt}

Focus ONLY on creating the basic project structure and main plugin/agent file:
1. package.json with dependencies
2. src/index.ts - Main entry point with plugin exports
3. Basic TypeScript configuration

Keep it minimal but functional. Generate only these 3 files.`,
        maxTokens: 2000,
      },
      {
        name: 'Services and Actions',
        prompt: `${originalPrompt}

Focus ONLY on the core functionality:
1. src/services/main.ts - Core service implementation
2. src/actions/core.ts - Main action implementations
3. src/providers/context.ts - Context providers

Generate functional implementations with proper ElizaOS patterns.`,
        maxTokens: 3000,
      },
      {
        name: 'Documentation and Tests',
        prompt: `${originalPrompt}

Focus ONLY on documentation and testing:
1. README.md - Complete setup and usage instructions
2. src/__tests__/integration.test.ts - Basic tests
3. character.json - Character configuration (if agent type)

Make the documentation comprehensive and tests functional.`,
        maxTokens: 2000,
      },
    ];

    let combinedCode = '';
    
    for (const chunk of chunks) {
      try {
        elizaLogger.info(`Generating chunk: ${chunk.name}`);
        
        const chunkResult = await this.runtime.useModel('TEXT_LARGE', {
          prompt: chunk.prompt,
          maxTokens: chunk.maxTokens,
          temperature: 0.7,
        });
        
        combinedCode += `\n\n# ${chunk.name}\n\n${chunkResult}\n\n`;
        elizaLogger.info(`Completed chunk: ${chunk.name} (${(chunkResult as string).length} chars)`);
        
        // Small delay between chunks to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        elizaLogger.error(`Failed to generate chunk ${chunk.name}:`, error);
        // Continue with other chunks even if one fails
        combinedCode += `\n\n# ${chunk.name} - FAILED\n\nError: ${(error as Error).message}\n\n`;
      }
    }
    
    elizaLogger.info(`Chunked generation completed. Total length: ${combinedCode.length} chars`);
    return combinedCode;
  }

  private async generateCodeInternal(request: CodeGenerationRequest): Promise<GenerationResult> {
    try {
      elizaLogger.info('Starting internal code generation for:', request.projectName);

      // Step 1: Start sandbox with Claude Code
      this.sandboxId = await this.e2bService!.createSandbox({
        template: 'claude-code-nodejs',
        metadata: {
          PROJECT_NAME: request.projectName,
          PROJECT_TYPE: request.targetType,
        },
      });

      // Step 2: Get E2B service for direct execution
      const e2bService = this.runtime.getService('e2b');
      if (!e2bService) {
        throw new Error('E2B service not available');
      }

      // Step 3: Research
      const research = await this.performResearch(request);

      // Step 4: Generate PRD
      const prd = await this.generatePRD(request, research);

      // Step 5: Set up project structure
      const projectPath = `/workspace/${request.projectName}`;
      
      // Create project directory and basic structure
      await e2bService.executeCode(`
import os
import json

# Create project directory structure
project_path = "${projectPath}"
os.makedirs(project_path, exist_ok=True)
os.makedirs(f"{project_path}/src", exist_ok=True)
os.makedirs(f"{project_path}/src/actions", exist_ok=True)
os.makedirs(f"{project_path}/src/providers", exist_ok=True)
os.makedirs(f"{project_path}/src/services", exist_ok=True)
os.makedirs(f"{project_path}/src/__tests__", exist_ok=True)

# Create package.json
package_json = {
    "name": "${request.projectName}",
    "version": "1.0.0",
    "description": "${request.description.replace(/"/g, '\\"')}",
    "type": "module",
    "main": "dist/index.js",
    "scripts": {
        "build": "bun run build.ts",
        "dev": "bun run build.ts --watch",
        "test": "bun test"
    },
    "dependencies": {
        "@elizaos/core": "workspace:*"
    }
}

with open(f"{project_path}/package.json", "w") as f:
    json.dump(package_json, f, indent=2)

print(f"Project structure created at {project_path}")
`, 'python');

      // Step 6: Generate code using AI model
      const codeGenerationPrompt = `
Generate a complete, production-ready ElizaOS ${request.targetType} for:

Project: ${request.projectName}
Description: ${request.description}

Requirements:
${request.requirements.map(r => `- ${r}`).join('\n')}

APIs to integrate:
${request.apis.map(api => `- ${api}`).join('\n')}

Test scenarios:
${request.testScenarios?.map(scenario => `- ${scenario}`).join('\n') || '- Basic functionality test'}

Research context:
${prd}

Create complete files with full implementations:
1. src/index.ts - Main plugin/agent entry point
2. src/services/main.ts - Core service implementation
3. src/actions/core.ts - Action implementations
4. src/providers/context.ts - Provider implementations
5. src/__tests__/integration.test.ts - Integration tests
6. README.md - Complete documentation
7. character.json - Character configuration (if agent)

Requirements:
- Use real API keys from environment variables
- Include proper error handling
- Follow ElizaOS patterns and conventions
- Create production-ready code with no stubs
- Include comprehensive tests
- Proper TypeScript types
`;

      const generatedCode = await this.generateCodeWithTimeout(codeGenerationPrompt, 8000); // Uses OPENAI_TIMEOUT from env

      // Step 7: Parse and create the generated files
      await this.createGeneratedFiles(e2bService, projectPath, generatedCode as string, request);

      // Step 7-9: QA Loop
      let qaAttempts = 0;
      let qaResult: QAResult;

      do {
        qaResult = await this.performQA(projectPath);

        if (!qaResult.passed && qaAttempts < 3) {
          // Fix issues using AI model and E2B service
          const fixPrompt = `Fix the following issues in the project at ${projectPath}:
${qaResult.details.join('\n')}

Provide complete file contents for any files that need to be modified.
Use the format:
File: path/to/file.ts
\`\`\`typescript
// complete file content here
\`\`\`

Focus on fixing:
- Lint errors
- Type errors  
- Build failures
- Test failures
- Security issues`;

          const fixResponse = await this.generateCodeWithTimeout(fixPrompt, 4000, 120000); // Shorter timeout for fixes

          if (fixResponse) {
            // Parse and apply fixes
            const fixes = this.parseGeneratedCode(fixResponse as string, request);
            
            for (const fix of fixes) {
              const fullPath = `${projectPath}/${fix.path}`;
              
              // Apply fix using E2B service
              await e2bService.executeCode(`
import os
import base64

# Ensure directory exists
file_path = "${fullPath}"
dir_path = os.path.dirname(file_path)
os.makedirs(dir_path, exist_ok=True)

# Decode and write fixed file content
content_b64 = "${Buffer.from(fix.content).toString('base64')}"
content = base64.b64decode(content_b64).decode('utf-8')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Fixed file: {file_path}")
`, 'python');
            }
          }
        }

        qaAttempts++;
      } while (!qaResult.passed && qaAttempts < 3);

      if (!qaResult.passed) {
        throw new Error('QA failed after 3 attempts: ' + qaResult.details.join(', '));
      }

      // Step 10: Handle secrets if needed
      if (request.apis.length > 0 && this.secretsManager) {
        const missingSecrets = await this.checkMissingSecrets(request.apis);
        if (missingSecrets.length > 0) {
          // Request secrets through callback
          await this.requestSecrets(missingSecrets);
        }
      }

      // Step 11-14: Final validation
      await this.validateProject(projectPath, request);

      // Step 15: Publish to GitHub
      let githubUrl: string | undefined;
      if (this.githubService && request.githubRepo) {
        githubUrl = await this.publishToGitHub(projectPath, request.githubRepo);
      }

      // Step 16: Collect generated files
      const files = await this.collectGeneratedFiles(projectPath);

      // Step 17: Start agent if applicable
      let agentId: string | undefined;
      if (request.targetType === 'agent') {
        agentId = await this.startAgent(projectPath);
      }

      return {
        success: true,
        projectPath,
        githubUrl,
        agentId,
        files,
        executionResults: {
          testsPass: qaResult.testsFailed === 0,
          lintPass: qaResult.lintErrors === 0,
          typesPass: qaResult.typeErrors === 0,
          buildPass: qaResult.buildSuccess,
          securityPass: qaResult.securityIssues.length === 0,
        },
      };
    } catch (error) {
      elizaLogger.error('Code generation error:', error);
      return {
        success: false,
        errors: [(error as Error).message],
      };
    } finally {
      // Cleanup
      if (this.sandboxId && this.e2bService) {
        await this.e2bService.killSandbox(this.sandboxId);
      }
    }
  }

  // Helper methods
  private extractCodeExamples(text: string): string[] {
    const codeBlocks = text.match(/```[\s\S]*?```/g) || [];
    return codeBlocks.map((block) => block.replace(/```\w*\n?|```/g, '').trim());
  }

  private extractBestPractices(text: string): string[] {
    const practices: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (line.match(/best practice|should|recommend|important/i)) {
        practices.push(line.trim());
      }
    }

    return practices.slice(0, 5); // Top 5 practices
  }

  private async searchSimilarProjects(request: CodeGenerationRequest): Promise<any[]> {
    // Search for similar plugins/projects in the codebase
    const searchTerms = [request.targetType, ...request.apis, ...request.requirements.slice(0, 3)];

    const results = [];

    for (const term of searchTerms) {
      try {
        // This would use actual code search in production
        const searchPrompt = `Find ElizaOS ${request.targetType} projects similar to: ${term}`;
        const response = await this.runtime.useModel(ModelType.TEXT_SMALL, {
          prompt: searchPrompt,
          maxTokens: 500,
        });

        results.push({
          name: term,
          description: (response as any)?.text || 'No description available',
          relevantCode: [],
          patterns: ['service-based', 'action-provider', 'plugin-architecture'],
        });
      } catch (error) {
        elizaLogger.warn('Search error:', error);
      }
    }

    return results;
  }

  private async getElizaContext(targetType: string): Promise<any> {
    // Get relevant ElizaOS patterns for the target type
    const contextMap = {
      plugin: {
        coreTypes: ['Plugin', 'Action', 'Provider', 'Service', 'IAgentRuntime'],
        patterns: ['service registration', 'action handlers', 'provider implementation'],
        conventions: ['TypeScript', 'vitest testing', 'proper exports'],
      },
      agent: {
        coreTypes: ['Character', 'Agent', 'Memory', 'State', 'IAgentRuntime'],
        patterns: ['character configuration', 'message processing', 'memory management'],
        conventions: ['character.json', 'plugin configuration', 'environment variables'],
      },
      workflow: {
        coreTypes: ['Task', 'TaskWorker', 'ActionContext', 'WorkingMemory'],
        patterns: ['task orchestration', 'step execution', 'context passing'],
        conventions: ['task workers', 'async execution', 'error handling'],
      },
      mcp: {
        coreTypes: ['Tool', 'Resource', 'Transport', 'Protocol'],
        patterns: ['MCP server', 'tool registration', 'resource management'],
        conventions: ['JSON-RPC', 'stdio transport', 'capability negotiation'],
      },
      'full-stack': {
        coreTypes: ['Plugin', 'Route', 'WebSocket', 'Database', 'UI Components'],
        patterns: ['API routes', 'WebSocket handling', 'React components'],
        conventions: ['Next.js', 'Tailwind CSS', 'shadcn/ui'],
      },
    };

    return (contextMap as any)[targetType] || contextMap.plugin;
  }

  private countErrors(output: string, errorType: string): number {
    const regex = new RegExp(errorType, 'gi');
    const matches = output.match(regex);
    return matches ? matches.length : 0;
  }

  private extractSecurityIssues(output: string): string[] {
    const issues: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.match(/security|vulnerability|exposed|leak|unsafe/i)) {
        issues.push(line.trim());
      }
    }

    return issues;
  }

  private async checkMissingSecrets(apis: string[]): Promise<string[]> {
    // Check which API keys are missing
    const missing: string[] = [];

    for (const api of apis) {
      const key = `${api.toUpperCase()}_API_KEY`;
      if (!this.runtime.getSetting(key)) {
        missing.push(key);
      }
    }

    return missing;
  }

  private async requestSecrets(secrets: string[]): Promise<void> {
    // Use forms to request secrets
    if (!this.formsService) return;

    const form = await this.formsService.createForm({
      name: 'API Key Configuration',
      description: 'Please provide the required API keys',
      steps: [
        {
          id: 'api-keys',
          name: 'API Keys',
          fields: secrets.map((secret) => ({
            id: secret.toLowerCase(),
            name: secret.toLowerCase(),
            type: 'text',
            label: secret,
            description: `Enter your ${secret}`,
            required: true,
            secret: true,
          })),
        },
      ],
    });

    // The form will handle collection through normal conversation
    elizaLogger.info('Created secrets form:', form.id);
  }

  private async validateProject(
    projectPath: string,
    request: CodeGenerationRequest
  ): Promise<void> {
    // Get E2B service for direct execution
    const e2bService = this.runtime.getService('e2b');
    if (!e2bService) {
      throw new Error('E2B service not available for validation');
    }

    // Use AI model for validation
    const validationPrompt = `Validate that the project at ${projectPath} meets all these requirements:
${request.requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Also verify:
- All tests actually test the requirements
- No stub/fake code exists
- All APIs are properly integrated
- Security best practices are followed
- Code is production-ready

Provide a detailed validation report with any issues found.`;

    const validationResponse = await this.generateCodeWithTimeout(validationPrompt, 2000, 60000); // 1 minute timeout for validation

    // Also check files exist and have content
    const fileCheckResult = await e2bService.executeCode(`
import os
import json

project_path = "${projectPath}"
validation_report = {
    "files_exist": [],
    "files_missing": [],
    "empty_files": [],
    "total_files": 0,
    "total_size": 0
}

# Check for essential files
essential_files = [
    "package.json",
    "src/index.ts",
    "README.md"
]

for file_path in essential_files:
    full_path = os.path.join(project_path, file_path)
    if os.path.exists(full_path):
        validation_report["files_exist"].append(file_path)
        size = os.path.getsize(full_path)
        validation_report["total_size"] += size
        if size == 0:
            validation_report["empty_files"].append(file_path)
    else:
        validation_report["files_missing"].append(file_path)

# Count all files
for root, dirs, files in os.walk(project_path):
    for file in files:
        validation_report["total_files"] += 1

print("VALIDATION_REPORT:", json.dumps(validation_report))
`, 'python');

    const reportMatch = fileCheckResult.text?.match(/VALIDATION_REPORT:\s*({.*})/);
    const report = reportMatch ? JSON.parse(reportMatch[1]) : null;

    if (report) {
      if (report.files_missing.length > 0) {
        throw new Error(`Project validation failed: Missing essential files: ${report.files_missing.join(', ')}`);
      }
      
      if (report.empty_files.length > 0) {
        throw new Error(`Project validation failed: Empty files found: ${report.empty_files.join(', ')}`);
      }

      if (report.total_files === 0) {
        throw new Error('Project validation failed: No files generated');
      }

      elizaLogger.info('Project validation passed', {
        filesGenerated: report.total_files,
        totalSize: report.total_size,
      });
    }

    // Check AI validation response for issues
    if (validationResponse && (validationResponse as string).toLowerCase().includes('failed')) {
      throw new Error('Project validation failed: AI review found issues');
    }
  }

  private async publishToGitHub(projectPath: string, repoName: string): Promise<string> {
    if (!this.githubService) {
      throw new Error('GitHub service not available');
    }

    // Get E2B service for direct execution
    const e2bService = this.runtime.getService('e2b');
    if (!e2bService) {
      throw new Error('E2B service not available for GitHub publishing');
    }

    // Create repo and push code
    const repo = await this.githubService.createRepository(repoName, true); // private

    // Initialize git, add all files, commit, and push using E2B service
    await e2bService.executeCode(`
import subprocess
import os

os.chdir("${projectPath}")

# Initialize git repository
subprocess.run(["git", "init"], check=True)

# Configure git user (use a default for automated commits)
subprocess.run(["git", "config", "user.name", "ElizaOS AutoCoder"], check=True)
subprocess.run(["git", "config", "user.email", "autocoder@elizaos.com"], check=True)

# Add all files
subprocess.run(["git", "add", "."], check=True)

# Create initial commit
subprocess.run(["git", "commit", "-m", "Initial commit - Generated by ElizaOS AutoCoder"], check=True)

# Add remote and push
subprocess.run(["git", "remote", "add", "origin", "${repo.clone_url}"], check=True)
subprocess.run(["git", "branch", "-M", "main"], check=True)

# Set up authentication using GitHub token
auth_url = "${repo.clone_url}".replace("https://", f"https://${process.env.GITHUB_TOKEN || 'token'}@")
subprocess.run(["git", "remote", "set-url", "origin", auth_url], check=True)

# Push to GitHub
result = subprocess.run(["git", "push", "-u", "origin", "main"], 
                       capture_output=True, text=True)

print("Git push result:", result.returncode)
if result.returncode == 0:
    print("Successfully pushed to GitHub!")
else:
    print("Git push failed:", result.stderr)
`, 'python');

    return repo.html_url;
  }

  private async collectGeneratedFiles(projectPath: string): Promise<GenerationFile[]> {
    // Get E2B service for direct execution
    const e2bService = this.runtime.getService('e2b');
    if (!e2bService) {
      throw new Error('E2B service not available for file collection');
    }

    // Get list of all generated files using E2B service
    const listFilesResult = await e2bService.executeCode(`
import os
import json
import base64

def collect_files(directory):
    files = []
    
    for root, dirs, filenames in os.walk(directory):
        # Skip hidden directories and node_modules
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'node_modules']
        
        for filename in filenames:
            # Skip hidden files and common build artifacts
            if filename.startswith('.') or filename.endswith(('.log', '.tmp')):
                continue
                
            full_path = os.path.join(root, filename)
            relative_path = os.path.relpath(full_path, directory)
            
            try:
                # Read file content
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # Encode content in base64 to handle special characters
                content_b64 = base64.b64encode(content.encode('utf-8')).decode('ascii')
                
                files.append({
                    'path': relative_path,
                    'content_b64': content_b64,
                    'size': len(content)
                })
            except Exception as e:
                print(f"Error reading {relative_path}: {e}")
    
    return files

project_path = "${projectPath}"
collected_files = collect_files(project_path)

print("COLLECTED_FILES_JSON:", json.dumps(collected_files))
print(f"Total files collected: {len(collected_files)}")
`, 'python');

    const files: GenerationFile[] = [];
    
    try {
      // Parse the file listing to extract files and contents
      const jsonMatch = listFilesResult.text?.match(/COLLECTED_FILES_JSON:\s*(\[.*\])/s);
      
      if (jsonMatch) {
        const filesData = JSON.parse(jsonMatch[1]);
        
        for (const fileData of filesData) {
          // Decode base64 content
          const content = Buffer.from(fileData.content_b64, 'base64').toString('utf-8');
          
          files.push({
            path: fileData.path,
            content: content,
          });
        }
      }
    } catch (error) {
      elizaLogger.warn('Error parsing generated files:', error);
    }

    elizaLogger.info(`Collected ${files.length} generated files`);
    return files;
  }

  /**
   * Parse AI-generated code and create files in E2B sandbox
   */
  private async createGeneratedFiles(
    e2bService: any,
    projectPath: string,
    generatedCode: string,
    request: CodeGenerationRequest
  ): Promise<void> {
    elizaLogger.info('Creating generated files from AI code');

    // Parse the generated code to extract file contents
    const files = this.parseGeneratedCode(generatedCode, request);

    for (const file of files) {
      const fullPath = `${projectPath}/${file.path}`;
      
      // Create file using E2B service
      await e2bService.executeCode(`
import os
import base64

# Ensure directory exists
file_path = "${fullPath}"
dir_path = os.path.dirname(file_path)
os.makedirs(dir_path, exist_ok=True)

# Decode and write file content
content_b64 = "${Buffer.from(file.content).toString('base64')}"
content = base64.b64decode(content_b64).decode('utf-8')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Created file: {file_path}")
`, 'python');
    }

    elizaLogger.info(`Created ${files.length} files in project`);
  }

  /**
   * Parse AI-generated code response to extract individual files
   */
  private parseGeneratedCode(generatedCode: string, request?: CodeGenerationRequest): GenerationFile[] {
    const files: GenerationFile[] = [];
    
    // Enhanced file pattern matching for multiple formats
    const patterns = [
      // Standard format: File: path/to/file.ext
      /(?:File|Path|Filename):\s*([^\n]+)\n```(?:typescript|javascript|json|md|yaml|yml|txt|py|sh|bash)?\n?((?:(?!```).|\n)*?)```/gi,
      
      // Alternative format: ## File: path/to/file.ext
      /##\s*(?:File|Path|Filename):\s*([^\n]+)\n```(?:typescript|javascript|json|md|yaml|yml|txt|py|sh|bash)?\n?((?:(?!```).|\n)*?)```/gi,
      
      // Direct code blocks with file comments: // File: path/to/file.ext
      /\/\/\s*(?:File|Path|Filename):\s*([^\n]+)\n```(?:typescript|javascript|json|md|yaml|yml|txt|py|sh|bash)?\n?((?:(?!```).|\n)*?)```/gi,
      
      // Markdown-style headers with code blocks
      /###?\s*([^\n]*\.(?:ts|js|json|md|yaml|yml|txt|py|sh|bash))\s*\n```(?:typescript|javascript|json|md|yaml|yml|txt|py|sh|bash)?\n?((?:(?!```).|\n)*?)```/gi,
      
      // Simple pattern without code blocks
      /(?:File|Path|Filename):\s*([^\n]+)\n((?:(?!(?:File|Path|Filename):).|\n)*?)(?=(?:File|Path|Filename):|$)/gi
    ];
    
    // Try each pattern to extract files
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(generatedCode)) !== null) {
        const filePath = match[1].trim().replace(/^["']|["']$/g, ''); // Remove quotes
        const content = match[2].trim();
        
        // Skip empty files and duplicates
        if (content && filePath && !files.some(f => f.path === filePath)) {
          files.push({
            path: filePath,
            content: content
          });
        }
      }
      // Reset regex state for next pattern
      pattern.lastIndex = 0;
    }

    // Patterns above already handle all file detection scenarios

    // If no files found in structured format, try to infer from context
    if (files.length === 0 && request) {
      elizaLogger.warn('No structured files found, creating basic project structure');
      
      // Create basic files based on project type
      if (request.targetType === 'plugin') {
        files.push({
          path: 'src/index.ts',
          content: this.generateBasicPluginCode(request)
        });
      } else if (request.targetType === 'agent') {
        files.push({
          path: 'character.json',
          content: this.generateBasicCharacterConfig(request)
        });
        files.push({
          path: 'src/index.ts',
          content: this.generateBasicAgentCode(request)
        });
      }
    }

    return files;
  }

  /**
   * Generate basic plugin code if AI doesn't provide structured output
   */
  private generateBasicPluginCode(request: CodeGenerationRequest): string {
    return `import { Plugin, Action, Provider, Service } from '@elizaos/core';

// ${request.description}
export const ${request.projectName.replace(/-/g, '')}Plugin: Plugin = {
  name: '${request.projectName}',
  description: '${request.description}',
  
  actions: [
    // TODO: Implement actions for:
    ${request.requirements.map(req => `    // - ${req}`).join('\n')}
  ],
  
  providers: [
    // TODO: Implement providers for:
    ${request.apis.map(api => `    // - ${api}`).join('\n')}
  ],
  
  services: [
    // TODO: Implement services
  ],
  
  init: async (config, runtime) => {
    // Plugin initialization
    console.log('${request.projectName} plugin initialized');
  }
};

export default ${request.projectName.replace(/-/g, '')}Plugin;
`;
  }

  /**
   * Generate basic character configuration if AI doesn't provide structured output
   */
  private generateBasicCharacterConfig(request: CodeGenerationRequest): string {
    return JSON.stringify({
      name: request.projectName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      bio: [request.description],
      system: `You are an agent that ${request.description}. You have the following capabilities: ${request.requirements.join(', ')}.`,
      messageExamples: [
        [
          { name: 'user', content: { text: 'Hello' } },
          { name: request.projectName, content: { text: 'Hello! I can help you with ' + request.description } }
        ]
      ],
      plugins: ['@elizaos/plugin-sql', request.projectName]
    }, null, 2);
  }

  /**
   * Generate basic agent code if AI doesn't provide structured output
   */
  private generateBasicAgentCode(request: CodeGenerationRequest): string {
    return `import { createAgent } from '@elizaos/core';
import character from '../character.json';

// ${request.description}
const agent = createAgent({
  character,
  plugins: [
    // Add required plugins here
  ]
});

export default agent;
`;
  }

  private async startAgent(projectPath: string): Promise<string> {
    // Get E2B service for direct execution
    const e2bService = this.runtime.getService('e2b');
    if (!e2bService) {
      throw new Error('E2B service not available');
    }

    // Start the agent using E2B service directly
    const startResult = await e2bService.executeCode(`
import subprocess
import json
import os

# Change to project directory
os.chdir("${projectPath}")

# Check if character.json exists (agent project)
if os.path.exists("character.json"):
    # Start as agent
    result = subprocess.run(["elizaos", "start", "--character", "character.json"], 
                          capture_output=True, text=True, timeout=30)
else:
    # Start as plugin project
    result = subprocess.run(["elizaos", "start"], 
                          capture_output=True, text=True, timeout=30)

print("STDOUT:", result.stdout)
print("STDERR:", result.stderr)
print("Return code:", result.returncode)

# Try to extract agent ID from output
import re
agent_id_match = re.search(r'agent[Id]*:\s*([a-f0-9-]+)', result.stdout, re.IGNORECASE)
if agent_id_match:
    print("AGENT_ID:", agent_id_match.group(1))
else:
    print("AGENT_ID: unknown")
`, 'python');

    if (startResult.error) {
      throw new Error('Failed to start agent: ' + startResult.error.value);
    }

    // Extract agent ID from output
    const agentIdMatch = startResult.text?.match(/AGENT_ID:\s*([a-f0-9-]+)/i);
    return agentIdMatch ? agentIdMatch[1] : 'unknown';
  }
}
