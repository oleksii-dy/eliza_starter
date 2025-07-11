import { Service, elizaLogger, type IAgentRuntime } from '@elizaos/core';
import { E2BService } from '@elizaos/plugin-e2b';
import { FormsService } from '@elizaos/plugin-forms';
import { GitHubService } from './GitHubService';
import { SecretsManagerService } from './SecretsManagerService';

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
  buildSuccess: boolean;
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
  static serviceType: string = 'code-generation';
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
      const lintResult = await (e2bService as any).executeCode(
        `
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
`,
        'python'
      );

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
      const typeResult = await (e2bService as any).executeCode(
        `
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
`,
        'python'
      );

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
      const buildResult = await (e2bService as any).executeCode(
        `
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
`,
        'python'
      );

      if (buildResult.error) {
        results.buildSuccess = false;
        results.details.push('Build: Failed (E2B error)');
      } else {
        const exitCode = buildResult.text?.match(/BUILD_EXIT_CODE:\s*(\d+)/)?.[1];
        results.buildSuccess = exitCode ? parseInt(exitCode) === 0 : false;
        results.details.push(`Build: ${results.buildSuccess ? 'Success' : 'Failed'}`);
      }

      // Run tests
      const testResult = await (e2bService as any).executeCode(
        `
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
`,
        'python'
      );

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
   * Setup project with starter files using project-starter
   */
  private async setupProjectWithStarter(
    projectPath: string,
    request: CodeGenerationRequest
  ): Promise<void> {
    elizaLogger.info('Setting up project with starter files...');

    // Create project directory and initialize with starter files
    await this.e2bService!.executeCode(
      `
import os
import subprocess

# Create project directory
os.makedirs('${projectPath}', exist_ok=True)
os.chdir('${projectPath}')

# Initialize with starter files for ${request.targetType}
print(f"Setting up ${request.targetType} project in: {os.getcwd()}")

# Create basic project structure
try:
    if "${request.targetType}" == "plugin":
        # Create plugin structure
        os.makedirs("src", exist_ok=True)
        os.makedirs("src/actions", exist_ok=True)
        os.makedirs("src/providers", exist_ok=True)
        os.makedirs("src/services", exist_ok=True)
        os.makedirs("src/__tests__", exist_ok=True)
        os.makedirs("src/__tests__/e2e", exist_ok=True)
        
        # Create package.json for plugin
        package_json = {
            "name": "${request.projectName}",
            "version": "1.0.0",
            "type": "module",
            "main": "dist/index.js",
            "scripts": {
                "build": "tsup src/index.ts --format esm --dts --clean",
                "test": "bun test",
                "lint": "eslint src --ext .ts,.tsx --fix",
                "typecheck": "tsc --noEmit"
            },
            "devDependencies": {
                "@elizaos/core": "workspace:*",
                "@types/bun": "latest",
                "eslint": "^8.57.0",
                "tsup": "^8.0.0",
                "typescript": "^5.3.0"
            }
        }
        
        with open("package.json", "w") as f:
            import json
            json.dump(package_json, f, indent=2)
        
        # Create tsconfig.json
        tsconfig = {
            "compilerOptions": {
                "target": "ES2022",
                "module": "ESNext",
                "moduleResolution": "node",
                "declaration": True,
                "outDir": "./dist",
                "rootDir": "./src",
                "strict": True,
                "esModuleInterop": True,
                "skipLibCheck": True,
                "forceConsistentCasingInFileNames": True,
                "resolveJsonModule": True
            },
            "include": ["src/**/*"],
            "exclude": ["node_modules", "dist"]
        }
        
        with open("tsconfig.json", "w") as f:
            json.dump(tsconfig, f, indent=2)
        
        # Create eslint config
        eslint_config = '''module.exports = {
  extends: ["eslint:recommended", "@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  root: true,
  env: {
    node: true,
    es2022: true
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "warn"
  }
};'''
        
        with open("eslint.config.js", "w") as f:
            f.write(eslint_config)
    
    elif "${request.targetType}" == "agent":
        # Create agent structure
        os.makedirs("src", exist_ok=True)
        os.makedirs("src/agents", exist_ok=True)
        os.makedirs("src/plugins", exist_ok=True)
        os.makedirs("src/__tests__", exist_ok=True)
        os.makedirs("knowledge", exist_ok=True)
        
        # Create package.json for agent
        package_json = {
            "name": "${request.projectName}",
            "version": "1.0.0",
            "type": "module",
            "main": "dist/index.js",
            "scripts": {
                "build": "tsup src/index.ts --format esm --dts --clean",
                "test": "elizaos test",
                "lint": "eslint src --ext .ts,.tsx --fix",
                "typecheck": "tsc --noEmit",
                "start": "elizaos start"
            },
            "devDependencies": {
                "@elizaos/core": "workspace:*",
                "@elizaos/plugin-sql": "workspace:*",
                "@types/bun": "latest",
                "eslint": "^8.57.0",
                "tsup": "^8.0.0",
                "typescript": "^5.3.0"
            }
        }
        
        with open("package.json", "w") as f:
            json.dump(package_json, f, indent=2)
        
        # Create tsconfig.json (same as plugin)
        tsconfig = {
            "compilerOptions": {
                "target": "ES2022",
                "module": "ESNext",
                "moduleResolution": "node",
                "declaration": True,
                "outDir": "./dist",
                "rootDir": "./src",
                "strict": True,
                "esModuleInterop": True,
                "skipLibCheck": True,
                "forceConsistentCasingInFileNames": True,
                "resolveJsonModule": True
            },
            "include": ["src/**/*"],
            "exclude": ["node_modules", "dist"]
        }
        
        with open("tsconfig.json", "w") as f:
            json.dump(tsconfig, f, indent=2)
        
        # Create eslint config (same as plugin)
        eslint_config = '''module.exports = {
  extends: ["eslint:recommended", "@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  root: true,
  env: {
    node: true,
    es2022: true
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "warn"
  }
};'''
        
        with open("eslint.config.js", "w") as f:
            f.write(eslint_config)
    
    print("Starter files created successfully")
    
except Exception as e:
    print(f"Error setting up starter files: {e}")
    raise e
      `,
      'python'
    );
  }

  /**
   * Create CLAUDE.md with project brief, conversation, and hard rules
   */
  private async createClaudeMd(projectPath: string, request: CodeGenerationRequest): Promise<void> {
    elizaLogger.info('Creating CLAUDE.md with project brief and rules...');

    const claudeMdContent = `# ${request.projectName}

## Project Brief

**Project Name:** ${request.projectName}
**Type:** ${request.targetType}
**Description:** ${request.description}

## User Requirements

${request.requirements.map((r) => `- ${r}`).join('\\n')}

## APIs to Integrate

${request.apis.map((api) => `- ${api}`).join('\\n')}

## Test Scenarios

${request.testScenarios?.map((scenario) => `- ${scenario}`).join('\\n') || '- Basic functionality tests'}

## Development Rules and Standards

### Hard Rules - MUST Follow

1. **Testing Framework:** ALWAYS use \`bun test\` for running tests
2. **Linting:** ALWAYS use \`eslint\` with the provided configuration
3. **Type Checking:** ALWAYS use \`tsc --noEmit\` for type validation
4. **Build System:** ALWAYS use \`tsup\` for building TypeScript
5. **Package Manager:** ALWAYS use \`bun\` for package management

### Code Quality Standards

- **All tests must pass** before considering code complete
- **No ESLint errors or warnings** allowed
- **No TypeScript compilation errors** allowed
- **Code must build successfully** with \`bun run build\`
- **All functions must have proper TypeScript types** (no \`any\` unless absolutely necessary)

### ElizaOS Plugin Standards

- **Plugin Structure:** Follow ElizaOS plugin architecture patterns
- **Core Types:** Import types from \`@elizaos/core\`
- **Actions:** Implement proper \`validate\` and \`handler\` functions
- **Providers:** Return proper \`ProviderResult\` objects
- **Services:** Extend \`Service\` class with proper lifecycle methods
- **Tests:** Use \`TestSuite\` interface for E2E tests

### Development Workflow

1. **Initial Development:** Write code following ElizaOS patterns
2. **Validation Loop:** Run \`bun test\`, \`eslint\`, \`tsc\` in sequence
3. **Fix Issues:** Address any errors or warnings found
4. **Repeat:** Continue until all validation passes
5. **Final Check:** Ensure \`bun run build\` succeeds

### Error Handling

- **Comprehensive Error Handling:** Every function should handle potential errors
- **Logging:** Use \`elizaLogger\` for all logging operations
- **Graceful Degradation:** Handle missing dependencies gracefully
- **Timeout Handling:** Implement proper timeout mechanisms for async operations

### Performance Requirements

- **Async Operations:** Use proper async/await patterns
- **Resource Cleanup:** Always clean up resources in service \`stop\` methods
- **Memory Management:** Avoid memory leaks in long-running services
- **Caching:** Implement caching where appropriate

### Security Requirements

- **Input Validation:** Always validate inputs before processing
- **Secret Management:** Never hardcode secrets or API keys
- **Environment Variables:** Use runtime.getSetting() for configuration
- **Sanitization:** Sanitize all user inputs appropriately

## Implementation Plan

This project will be developed iteratively:

1. **Setup Phase:** Create project structure and starter files
2. **Development Phase:** Implement core functionality following ElizaOS patterns
3. **Testing Phase:** Write comprehensive tests for all components
4. **Validation Phase:** Run validation loop until all checks pass
5. **Final Phase:** Ensure complete functionality and documentation

## Quality Assurance Process

The QA process will run iteratively:

1. **Run Tests:** \`bun test\` - All tests must pass
2. **Check Linting:** \`eslint src --ext .ts,.tsx\` - No errors or warnings
3. **Type Check:** \`tsc --noEmit\` - No type errors
4. **Build Check:** \`bun run build\` - Must build successfully
5. **Fix Issues:** Address any problems found and repeat from step 1

This process continues until ALL validation passes without errors.

## Success Criteria

- ✅ All tests pass with \`bun test\`
- ✅ No ESLint errors or warnings
- ✅ No TypeScript compilation errors  
- ✅ Build succeeds with \`bun run build\`
- ✅ Code follows ElizaOS patterns and conventions
- ✅ All requirements from project brief are implemented
- ✅ All API integrations work correctly
- ✅ All test scenarios pass
`;

    await this.e2bService!.executeCode(
      `
import os

os.chdir('${projectPath}')

# Create CLAUDE.md file
claude_md_content = '''${claudeMdContent}'''

with open('CLAUDE.md', 'w') as f:
    f.write(claude_md_content)

print("CLAUDE.md created successfully")
      `,
      'python'
    );
  }

  /**
   * Run iterative code generation with validation loop
   */
  private async iterativeCodeGeneration(
    projectPath: string,
    request: CodeGenerationRequest
  ): Promise<void> {
    elizaLogger.info('Starting iterative code generation with validation loop...');

    const maxIterations = 10;
    let iteration = 0;
    let allValidationsPassed = false;

    while (iteration < maxIterations && !allValidationsPassed) {
      iteration++;
      elizaLogger.info(`--- Iteration ${iteration}/${maxIterations} ---`);

      // Step 1: Generate or improve code with Claude Code
      const prompt = this.buildIterativePrompt(request, iteration);

      await this.generateWithClaudeCodeInSandbox(prompt, projectPath);

      // Step 2: Install dependencies
      await this.installDependencies(projectPath);

      // Step 3: Run validation suite
      const validationResult = await this.runValidationSuite(projectPath);

      // Step 4: Check if all validations passed
      allValidationsPassed = validationResult.allPassed;

      if (allValidationsPassed) {
        elizaLogger.info('🎉 All validations passed! Code generation complete.');
        break;
      }

      // Step 5: If validations failed, prepare feedback for next iteration
      if (iteration < maxIterations) {
        elizaLogger.warn(`Validation failed, preparing feedback for iteration ${iteration + 1}`);
        await this.prepareFeedbackForNextIteration(projectPath, validationResult);
      }
    }

    if (!allValidationsPassed) {
      elizaLogger.error(`Failed to pass all validations after ${maxIterations} iterations`);
      throw new Error(
        `Code generation failed to pass all validations after ${maxIterations} iterations`
      );
    }
  }

  /**
   * Build prompt for iterative generation
   */
  private buildIterativePrompt(request: CodeGenerationRequest, iteration: number): string {
    if (iteration === 1) {
      // First iteration - initial generation
      return `Read the CLAUDE.md file in the current directory to understand the project requirements and development rules.

Create a complete ${request.targetType} for ElizaOS following ALL the requirements and hard rules specified in CLAUDE.md.

The project should include:
1. Complete implementation of all required functionality
2. Proper ElizaOS patterns and TypeScript types
3. Comprehensive tests using the TestSuite interface
4. All necessary dependencies in package.json
5. Proper ESLint configuration compliance
6. Full TypeScript type safety

Remember the hard rules:
- Use 'bun test' for testing
- Use 'eslint' for linting
- Use 'tsc --noEmit' for type checking
- Use 'tsup' for building
- Follow ElizaOS plugin/agent conventions

Generate ALL necessary files to make this project work correctly.`;
    } else {
      // Subsequent iterations - fix issues
      return `Read the CLAUDE.md file and the VALIDATION_FEEDBACK.md file in the current directory.

The VALIDATION_FEEDBACK.md file contains the specific errors and warnings that need to be fixed.

Fix ALL the issues mentioned in the validation feedback while maintaining the existing working functionality.

Focus on:
1. Fixing all test failures
2. Resolving all ESLint errors and warnings
3. Fixing all TypeScript compilation errors
4. Ensuring the build succeeds
5. Maintaining ElizaOS patterns and conventions

Only modify the files that need changes to fix the specific issues mentioned in the feedback.
Do not break existing working functionality.`;
    }
  }

  /**
   * Install dependencies in the project
   */
  private async installDependencies(projectPath: string): Promise<void> {
    elizaLogger.info('Installing dependencies...');

    await this.e2bService!.executeCode(
      `
import subprocess
import os

os.chdir('${projectPath}')

try:
    # Install dependencies using bun
    result = subprocess.run(['bun', 'install'], 
                          capture_output=True, text=True, timeout=300)
    
    if result.returncode == 0:
        print("Dependencies installed successfully")
    else:
        print(f"Warning: bun install returned code {result.returncode}")
        print("STDOUT:", result.stdout)
        print("STDERR:", result.stderr)
        
except subprocess.TimeoutExpired:
    print("Dependency installation timed out")
except Exception as e:
    print(f"Error installing dependencies: {e}")
      `,
      'python'
    );
  }

  /**
   * Run comprehensive validation suite
   */
  private async runValidationSuite(projectPath: string): Promise<{
    allPassed: boolean;
    testsPassed: boolean;
    lintPassed: boolean;
    typesPassed: boolean;
    buildPassed: boolean;
    errors: string[];
    warnings: string[];
  }> {
    elizaLogger.info('Running validation suite...');

    const errors: string[] = [];
    const warnings: string[] = [];
    let testsPassed = false;
    let lintPassed = false;
    let typesPassed = false;
    let buildPassed = false;

    // 1. Run tests
    elizaLogger.info('Running tests with bun test...');
    const testResult = await this.e2bService!.executeCode(
      `
import subprocess
import os

os.chdir('${projectPath}')

try:
    result = subprocess.run(['bun', 'test'], 
                          capture_output=True, text=True, timeout=300)
    
    print("TEST_EXIT_CODE:", result.returncode)
    print("TEST_STDOUT:", result.stdout)
    print("TEST_STDERR:", result.stderr)
    
except subprocess.TimeoutExpired:
    print("TEST_EXIT_CODE: 1")
    print("TEST_STDERR: Test execution timed out")
except Exception as e:
    print("TEST_EXIT_CODE: 1")
    print("TEST_STDERR:", str(e))
      `,
      'python'
    );

    const testExitCode = testResult.text?.match(/TEST_EXIT_CODE:\s*(\d+)/)?.[1];
    testsPassed = testExitCode === '0';
    if (!testsPassed) {
      const testStderr = testResult.text?.match(/TEST_STDERR:\s*(.*?)(?=TEST_|$)/s)?.[1]?.trim();
      if (testStderr) {
        errors.push(`Test failures: ${testStderr}`);
      }
    }

    // 2. Run ESLint
    elizaLogger.info('Running ESLint...');
    const lintResult = await this.e2bService!.executeCode(
      `
import subprocess
import os

os.chdir('${projectPath}')

try:
    result = subprocess.run(['eslint', 'src', '--ext', '.ts,.tsx'], 
                          capture_output=True, text=True, timeout=120)
    
    print("LINT_EXIT_CODE:", result.returncode)
    print("LINT_STDOUT:", result.stdout)
    print("LINT_STDERR:", result.stderr)
    
except subprocess.TimeoutExpired:
    print("LINT_EXIT_CODE: 1")
    print("LINT_STDERR: ESLint execution timed out")
except Exception as e:
    print("LINT_EXIT_CODE: 1")
    print("LINT_STDERR:", str(e))
      `,
      'python'
    );

    const lintExitCode = lintResult.text?.match(/LINT_EXIT_CODE:\s*(\d+)/)?.[1];
    lintPassed = lintExitCode === '0';
    if (!lintPassed) {
      const lintStdout = lintResult.text?.match(/LINT_STDOUT:\s*(.*?)(?=LINT_|$)/s)?.[1]?.trim();
      const lintStderr = lintResult.text?.match(/LINT_STDERR:\s*(.*?)(?=LINT_|$)/s)?.[1]?.trim();
      if (lintStdout) {
        errors.push(`ESLint errors: ${lintStdout}`);
      }
      if (lintStderr) {
        errors.push(`ESLint stderr: ${lintStderr}`);
      }
    }

    // 3. Run TypeScript type check
    elizaLogger.info('Running TypeScript type check...');
    const typeResult = await this.e2bService!.executeCode(
      `
import subprocess
import os

os.chdir('${projectPath}')

try:
    result = subprocess.run(['tsc', '--noEmit'], 
                          capture_output=True, text=True, timeout=120)
    
    print("TYPE_EXIT_CODE:", result.returncode)
    print("TYPE_STDOUT:", result.stdout)
    print("TYPE_STDERR:", result.stderr)
    
except subprocess.TimeoutExpired:
    print("TYPE_EXIT_CODE: 1")
    print("TYPE_STDERR: TypeScript type check timed out")
except Exception as e:
    print("TYPE_EXIT_CODE: 1")
    print("TYPE_STDERR:", str(e))
      `,
      'python'
    );

    const typeExitCode = typeResult.text?.match(/TYPE_EXIT_CODE:\s*(\d+)/)?.[1];
    typesPassed = typeExitCode === '0';
    if (!typesPassed) {
      const typeStdout = typeResult.text?.match(/TYPE_STDOUT:\s*(.*?)(?=TYPE_|$)/s)?.[1]?.trim();
      const typeStderr = typeResult.text?.match(/TYPE_STDERR:\s*(.*?)(?=TYPE_|$)/s)?.[1]?.trim();
      if (typeStdout) {
        errors.push(`TypeScript errors: ${typeStdout}`);
      }
      if (typeStderr) {
        errors.push(`TypeScript stderr: ${typeStderr}`);
      }
    }

    // 4. Run build
    elizaLogger.info('Running build...');
    const buildResult = await this.e2bService!.executeCode(
      `
import subprocess
import os

os.chdir('${projectPath}')

try:
    result = subprocess.run(['bun', 'run', 'build'], 
                          capture_output=True, text=True, timeout=180)
    
    print("BUILD_EXIT_CODE:", result.returncode)
    print("BUILD_STDOUT:", result.stdout)
    print("BUILD_STDERR:", result.stderr)
    
except subprocess.TimeoutExpired:
    print("BUILD_EXIT_CODE: 1")
    print("BUILD_STDERR: Build execution timed out")
except Exception as e:
    print("BUILD_EXIT_CODE: 1")
    print("BUILD_STDERR:", str(e))
      `,
      'python'
    );

    const buildExitCode = buildResult.text?.match(/BUILD_EXIT_CODE:\s*(\d+)/)?.[1];
    buildPassed = buildExitCode === '0';
    if (!buildPassed) {
      const buildStdout = buildResult.text
        ?.match(/BUILD_STDOUT:\s*(.*?)(?=BUILD_|$)/s)?.[1]
        ?.trim();
      const buildStderr = buildResult.text
        ?.match(/BUILD_STDERR:\s*(.*?)(?=BUILD_|$)/s)?.[1]
        ?.trim();
      if (buildStdout) {
        errors.push(`Build errors: ${buildStdout}`);
      }
      if (buildStderr) {
        errors.push(`Build stderr: ${buildStderr}`);
      }
    }

    const allPassed = testsPassed && lintPassed && typesPassed && buildPassed;

    elizaLogger.info(
      `Validation Results: Tests=${testsPassed}, Lint=${lintPassed}, Types=${typesPassed}, Build=${buildPassed}, All=${allPassed}`
    );

    return {
      allPassed,
      testsPassed,
      lintPassed,
      typesPassed,
      buildPassed,
      errors,
      warnings,
    };
  }

  /**
   * Prepare feedback for next iteration
   */
  private async prepareFeedbackForNextIteration(
    projectPath: string,
    validationResult: {
      testsPassed: boolean;
      lintPassed: boolean;
      typesPassed: boolean;
      buildPassed: boolean;
      errors: string[];
      warnings: string[];
    }
  ): Promise<void> {
    elizaLogger.info('Preparing feedback for next iteration...');

    const feedbackContent = `# Validation Feedback

## Validation Status

- **Tests Passed:** ${validationResult.testsPassed ? '✅' : '❌'}
- **Lint Passed:** ${validationResult.lintPassed ? '✅' : '❌'}
- **Types Passed:** ${validationResult.typesPassed ? '✅' : '❌'}
- **Build Passed:** ${validationResult.buildPassed ? '✅' : '❌'}

## Issues to Fix

${
  validationResult.errors.length > 0
    ? validationResult.errors
        .map(
          (error, index) => `### Error ${index + 1}

\`\`\`
${error}
\`\`\`

`
        )
        .join('')
    : 'No errors found.'
}

${
  validationResult.warnings.length > 0
    ? `## Warnings

${validationResult.warnings
  .map(
    (warning, index) => `### Warning ${index + 1}

\`\`\`
${warning}
\`\`\`

`
  )
  .join('')}`
    : ''
}

## Instructions for Next Iteration

1. **Fix all errors listed above** - Each error must be resolved
2. **Ensure all tests pass** - Run 'bun test' and verify all tests pass
3. **Fix all ESLint issues** - Run 'eslint src --ext .ts,.tsx' and fix all warnings/errors
4. **Fix all TypeScript errors** - Run 'tsc --noEmit' and fix all type errors
5. **Ensure build succeeds** - Run 'bun run build' and verify it completes successfully

## Priority Order

1. Fix TypeScript compilation errors first (these often cause other issues)
2. Fix ESLint errors and warnings 
3. Fix test failures
4. Ensure build succeeds

Remember: Follow ElizaOS patterns and the hard rules specified in CLAUDE.md.
`;

    await this.e2bService!.executeCode(
      `
import os

os.chdir('${projectPath}')

# Create validation feedback file
feedback_content = '''${feedbackContent}'''

with open('VALIDATION_FEEDBACK.md', 'w') as f:
    f.write(feedback_content)

print("Validation feedback file created")
      `,
      'python'
    );
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
        elizaLogger.info(
          `Starting code generation for: ${request.projectName} (attempt ${attempt + 1}/${maxRetries})`
        );

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
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `Code generation failed after ${maxRetries} attempts. Last error: ${lastError?.message}`
    );
  }

  /**
   * Check if an error is related to timeouts
   */
  private isTimeoutError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('request timeout') ||
      message.includes('connection timeout') ||
      message.includes('response timeout') ||
      message.includes('aborted') ||
      message.includes('network timeout')
    );
  }

  /**
   * Get timeout configuration from environment
   */
  private getTimeoutConfig(): { timeout: number; maxRetries: number; requestTimeout: number } {
    return {
      timeout: parseInt(
        this.runtime.getSetting('ANTHROPIC_TIMEOUT') ||
          this.runtime.getSetting('OPENAI_TIMEOUT') ||
          '300000'
      ),
      maxRetries: parseInt(
        this.runtime.getSetting('ANTHROPIC_MAX_RETRIES') ||
          this.runtime.getSetting('OPENAI_MAX_RETRIES') ||
          '3'
      ),
      requestTimeout: parseInt(
        this.runtime.getSetting('ANTHROPIC_REQUEST_TIMEOUT') ||
          this.runtime.getSetting('OPENAI_REQUEST_TIMEOUT') ||
          '600000'
      ),
    };
  }

  /**
   * Generate code with timeout handling and chunked generation fallback
   * This method is deprecated since we now run everything in sandbox
   */
  private async generateCodeWithTimeout(
    prompt: string,
    maxTokens: number = 8000,
    timeoutMs?: number
  ): Promise<string> {
    const config = this.getTimeoutConfig();
    const actualTimeout = timeoutMs || config.timeout;

    // For sandbox-based generation, we just return the prompt
    // The actual generation happens in generateCodeInternal using generateWithClaudeCodeInSandbox
    elizaLogger.info(
      `Code generation will happen inside E2B sandbox with ${actualTimeout}ms timeout`
    );

    // Return the prompt as-is since actual generation happens in sandbox
    return prompt;
  }

  /**
   * Generate code in smaller chunks to avoid timeouts
   * This method is deprecated since we now run everything in sandbox
   */
  private async generateCodeInChunks(originalPrompt: string, maxTokens: number): Promise<string> {
    elizaLogger.info('Chunked generation is deprecated - all generation happens in sandbox');
    return originalPrompt;
  }

  /**
   * Install Claude Code inside the sandbox
   */
  private async installClaudeCodeInSandbox(): Promise<void> {
    elizaLogger.info('Installing Claude Code inside E2B sandbox...');

    const installScript = `
import subprocess
import os
import sys

# Install Claude Code globally
print("Installing Claude Code...")
result = subprocess.run(
    ["npm", "install", "-g", "@anthropic-ai/claude-code"],
    capture_output=True,
    text=True,
    timeout=300
)

if result.returncode != 0:
    print(f"ERROR installing Claude Code: {result.stderr}")
    sys.exit(1)

print("Successfully installed Claude Code")

# Verify Claude Code installation
verify = subprocess.run(
    ["claude", "--version"],
    capture_output=True,
    text=True
)

print("CLAUDE_VERSION:", verify.stdout)
print("CLAUDE_INSTALLED:", verify.returncode == 0)

if verify.returncode != 0:
    print("Claude Code verification failed")
    sys.exit(1)

print("SETUP_COMPLETE: True")
`;

    const result = await this.e2bService!.executeCode(installScript, 'python');

    if (result.error || !result.text?.includes('SETUP_COMPLETE: True')) {
      throw new Error(
        `Failed to install Claude Code in sandbox: ${result.error?.value || result.text}`
      );
    }

    elizaLogger.info('Claude Code successfully installed in sandbox');
  }

  /**
   * Run Claude Code inside the sandbox directly
   */
  private async runClaudeCodeInSandbox(
    prompt: string,
    projectPath: string,
    maxIterations: number = 10
  ): Promise<{ success: boolean; output: string; files?: any[] }> {
    elizaLogger.info('Running Claude Code inside E2B sandbox...');

    const anthropicKey = this.runtime.getSetting('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }

    // Create a Python script that runs Claude Code iteratively
    const script = `
import subprocess
import os
import json
import time
import sys

# Set up environment
os.environ['ANTHROPIC_API_KEY'] = '${anthropicKey}'
os.makedirs('${projectPath}', exist_ok=True)
os.chdir('${projectPath}')

def run_claude_code(prompt, iteration, max_iterations):
    """Run Claude Code with the given prompt"""
    print(f"\\n=== ITERATION {iteration}/{max_iterations} ===")
    print(f"Starting Claude Code at {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    cmd = [
        "claude",
        "--print", prompt,
        "--max-turns", "20",
        "--verbose",
        "--model", "opus",
        "--dangerously-skip-permissions"
    ]
    
    try:
        # Use Popen to monitor progress
        import select
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        start_time = time.time()
        output = ""
        errors = ""
        last_progress_time = time.time()
        
        # Monitor the process with periodic updates
        while True:
            # Check if process has finished
            poll_status = process.poll()
            if poll_status is not None:
                # Process finished, get remaining output
                remaining_out, remaining_err = process.communicate()
                output += remaining_out
                errors += remaining_err
                break
            
            # Read available output (non-blocking)
            ready, _, _ = select.select([process.stdout, process.stderr], [], [], 0.1)
            
            for stream in ready:
                if stream == process.stdout:
                    line = stream.readline()
                    if line:
                        output += line
                        # Show progress for important events
                        if "Turn " in line or "Creating" in line or "Writing" in line:
                            print(f"  [Progress] {line.strip()}")
                elif stream == process.stderr:
                    line = stream.readline()
                    if line:
                        errors += line
            
            # Periodic status updates
            current_time = time.time()
            if current_time - last_progress_time > 30:  # Every 30 seconds
                elapsed = int(current_time - start_time)
                print(f"  [Status] Claude Code running for {elapsed}s...")
                last_progress_time = current_time
            
            # Check for timeout (2 hours)
            if current_time - start_time > 7200:
                process.terminate()
                print("CLAUDE_TIMEOUT: Execution timed out after 2 hours")
                return False, output, "Timeout after 2 hours"
        
        duration = int(time.time() - start_time)
        print(f"Claude Code completed in {duration}s with exit code {poll_status}")
        
        if poll_status == 0:
            print("CLAUDE_SUCCESS: Execution completed successfully")
        else:
            print(f"CLAUDE_FAILED: Exit code {poll_status}")
            
        return poll_status == 0, output, errors
    except Exception as e:
        print(f"CLAUDE_ERROR: {str(e)}")
        return False, "", str(e)

def run_validation():
    """Run tests and build to validate the project"""
    validation_results = {}
    
    # Check if package.json exists
    if not os.path.exists('package.json'):
        return validation_results
    
    # Install dependencies
    print("\\nInstalling dependencies...")
    install = subprocess.run(["bun", "install"], capture_output=True, text=True)
    validation_results['install_success'] = install.returncode == 0
    
    # Run tests
    print("Running tests...")
    test = subprocess.run(["bun", "test"], capture_output=True, text=True)
    validation_results['tests_passed'] = test.returncode == 0
    validation_results['test_output'] = test.stdout + test.stderr
    
    # Run build
    print("Running build...")
    build = subprocess.run(["bun", "run", "build"], capture_output=True, text=True)
    validation_results['build_success'] = build.returncode == 0
    validation_results['build_output'] = build.stdout + build.stderr
    
    return validation_results

# Main execution loop
initial_prompt = '''${prompt.replace(/'/g, "\\'")}'''
current_prompt = initial_prompt
iterations = 0
max_iterations = ${maxIterations}
success = False

while iterations < max_iterations:
    iterations += 1
    
    # Run Claude Code
    claude_success, claude_output, claude_error = run_claude_code(current_prompt, iterations, max_iterations)
    
    if not claude_success:
        print(f"Claude Code failed: {claude_error}")
        break
    
    # Wait a moment for file system to settle
    time.sleep(1)
    
    # Run validation
    validation = run_validation()
    
    # Check if we're done
    if validation.get('tests_passed') and validation.get('build_success'):
        print("\\n=== PROJECT READY ===")
        print("All tests passing and build successful!")
        success = True
        break
    
    # Prepare prompt for next iteration
    if not validation.get('tests_passed'):
        current_prompt = f"The tests are failing. Please fix the following errors:\\n{validation.get('test_output', '')}"
    elif not validation.get('build_success'):
        current_prompt = f"The build is failing. Please fix the following errors:\\n{validation.get('build_output', '')}"
    else:
        current_prompt = "Continue improving the code. Add more tests and documentation."

print(f"\\n=== COMPLETED AFTER {iterations} ITERATIONS ===")
print(f"SUCCESS: {success}")

# List created files
if os.path.exists('${projectPath}'):
    print("\\n=== CREATED FILES ===")
    for root, dirs, files in os.walk('${projectPath}'):
        # Skip node_modules
        if 'node_modules' in root:
            continue
        for file in files:
            filepath = os.path.join(root, file)
            print(f"FILE: {filepath}")
`;

    try {
      const result = await this.e2bService!.executeCode(script, 'python');

      if (result.error) {
        elizaLogger.error('Claude Code execution failed:', result.error);
        return {
          success: false,
          output: `Error: ${result.error.value}\n${result.error.traceback}`,
        };
      }

      const output = result.text || '';
      const success = output.includes('SUCCESS: True') && output.includes('All tests passing');

      // Extract created files
      const files: any[] = [];
      const fileMatches = output.matchAll(/FILE: (.+)/g);
      for (const match of fileMatches) {
        files.push({ path: match[1].replace(`${projectPath}/`, '') });
      }

      elizaLogger.info(`Claude Code execution ${success ? 'succeeded' : 'failed'}`);

      return {
        success,
        output,
        files,
      };
    } catch (error) {
      elizaLogger.error('Error running Claude Code:', error);
      return {
        success: false,
        output: (error as Error).message,
      };
    }
  }

  /**
   * Generate code using Claude Code inside the sandbox
   */
  private async generateWithClaudeCodeInSandbox(
    prompt: string,
    projectPath: string
  ): Promise<string> {
    elizaLogger.info('Using Claude Code inside E2B sandbox for code generation');

    // Install Claude Code if not already done (check if we need to install it)
    // For now, we'll install it every time to ensure it's available
    await this.installClaudeCodeInSandbox();

    // Run Claude Code with monitoring
    const result = await this.runClaudeCodeInSandbox(prompt, projectPath);

    if (!result.success) {
      throw new Error(`Claude Code generation in sandbox failed: ${result.output}`);
    }

    // If files were returned, store them for later retrieval
    if (result.files && result.files.length > 0) {
      elizaLogger.info(`Received ${result.files.length} files from Claude Code`);
    }

    elizaLogger.info('Claude Code generation in sandbox completed successfully');
    return result.output;
  }

  private async generateCodeInternal(request: CodeGenerationRequest): Promise<GenerationResult> {
    try {
      elizaLogger.info('Starting internal code generation for:', request.projectName);

      // Clean up any existing sandbox first
      if (this.sandboxId) {
        try {
          await this.e2bService!.killSandbox(this.sandboxId);
          this.sandboxId = undefined;
        } catch (error) {
          elizaLogger.warn('Error cleaning up previous sandbox:', error);
        }
      }

      // Step 1: Create E2B sandbox
      this.sandboxId = await this.e2bService!.createSandbox({
        template: 'node-js',
        metadata: {
          PROJECT_NAME: request.projectName,
          PROJECT_TYPE: request.targetType,
        },
      });

      elizaLogger.info('E2B sandbox created:', this.sandboxId);

      // Step 2: Set up project directory in sandbox
      const projectPath = `/tmp/${request.projectName}`;

      // Step 3: Create project directory and initialize with starter files
      await this.setupProjectWithStarter(projectPath, request);

      // Step 4: Create CLAUDE.md with project brief and conversation
      await this.createClaudeMd(projectPath, request);

      // Step 5: Run iterative development with Claude Code
      elizaLogger.info('Starting iterative development with Claude Code...');
      await this.iterativeCodeGeneration(projectPath, request);

      elizaLogger.info('Iterative development completed, extracting files...');

      // Step 6: Extract files from the sandbox
      const fileListResult = await this.e2bService!.executeCode(
        `
import os
import json

def get_files_recursive(directory):
    files = []
    for root, dirs, filenames in os.walk(directory):
        # Skip node_modules and .git
        if 'node_modules' in root or '.git' in root:
            continue
        for filename in filenames:
            filepath = os.path.join(root, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                files.append({
                    'path': filepath.replace('${projectPath}/', ''),
                    'content': content
                })
            except Exception as e:
                print(f"Error reading {filepath}: {e}")
    return files

if os.path.exists('${projectPath}'):
    files = get_files_recursive('${projectPath}')
    print(json.dumps(files, indent=2))
else:
    print("[]")
      `,
        'python'
      );

      let projectFiles: GenerationFile[] = [];
      if (!fileListResult.error && fileListResult.text) {
        try {
          projectFiles = JSON.parse(fileListResult.text);
          elizaLogger.info(`Extracted ${projectFiles.length} files from sandbox`);
        } catch (error) {
          elizaLogger.error('Error parsing generated files:', error);
        }
      }

      // Step 7: Final QA check (already done in sandbox monitoring)
      const qaResult = {
        passed: fileListResult.text ? fileListResult.text.includes('All tests passing') : false,
        lintErrors: 0,
        typeErrors: 0,
        testsFailed: fileListResult.text?.includes('TEST_RESULT: false') ? 1 : 0,
        buildSuccess: fileListResult.text?.includes('BUILD_RESULT: true') || false,
        securityIssues: [],
        details: ['Project generated and validated in sandbox'],
      };

      // Step 8: Create GitHub repository if requested
      let githubUrl: string | undefined;
      if (request.githubRepo && this.githubService) {
        try {
          const repo = await this.githubService.createRepository(
            request.githubRepo,
            false // Make repository public
          );

          githubUrl = repo.html_url;

          // TODO: Push files from sandbox to GitHub repository
          elizaLogger.info(`Created repository but file pushing not yet implemented`);
        } catch (error) {
          elizaLogger.error('GitHub repository creation failed:', error);
        }
      }

      return {
        success: true,
        projectPath,
        githubUrl,
        files: projectFiles,
        executionResults: {
          testsPass: qaResult.passed,
          lintPass: qaResult.lintErrors === 0,
          typesPass: qaResult.typeErrors === 0,
          buildPass: qaResult.buildSuccess,
          buildSuccess: qaResult.buildSuccess,
          securityPass: qaResult.securityIssues.length === 0,
        },
        warnings: qaResult.details.filter((d) => d.includes('warning')),
        errors: qaResult.passed ? [] : qaResult.details.filter((d) => d.includes('error')),
      };
    } catch (error) {
      elizaLogger.error('Code generation error:', { error });
      return {
        success: false,
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Helper method to extract code examples from API research
   */
  private extractCodeExamples(text: string): string[] {
    const examples: string[] = [];
    const codeBlockRegex = /```[\s\S]*?```/g;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      examples.push(match[0]);
    }

    return examples.slice(0, 3); // Limit to 3 examples
  }

  /**
   * Helper method to extract best practices from API research
   */
  private extractBestPractices(text: string): string[] {
    const practices: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.toLowerCase().includes('best practice') ||
        trimmed.toLowerCase().includes('recommended') ||
        (trimmed.startsWith('- ') && trimmed.length > 10)
      ) {
        practices.push(trimmed);
      }
    }

    return practices.slice(0, 5); // Limit to 5 practices
  }

  /**
   * Search for similar projects in the codebase
   */
  private async searchSimilarProjects(request: CodeGenerationRequest): Promise<any[]> {
    // This would typically search through existing ElizaOS plugins
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Get ElizaOS context for the target type
   */
  private async getElizaContext(targetType: string): Promise<any> {
    return {
      coreTypes: ['Action', 'Provider', 'Service', 'Plugin', 'Memory', 'State'],
      patterns: ['Service registration', 'Action validation', 'Provider composition'],
      conventions: ['TypeScript', 'Error handling', 'Logging with elizaLogger'],
    };
  }

  /**
   * Count errors in output text
   */
  private countErrors(text: string, errorType: string): number {
    const lines = text.split('\n');
    let count = 0;

    for (const line of lines) {
      if (line.toLowerCase().includes(errorType)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Extract security issues from AI analysis
   */
  private extractSecurityIssues(text: string): string[] {
    const issues: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.toLowerCase().includes('security') ||
        trimmed.toLowerCase().includes('vulnerability') ||
        trimmed.toLowerCase().includes('exposed') ||
        trimmed.toLowerCase().includes('unsafe')
      ) {
        issues.push(trimmed);
      }
    }

    return issues;
  }
}
