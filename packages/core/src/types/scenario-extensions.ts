/**
 * Extended scenario types for testing file system, Git, and API operations
 * Required for comprehensive bulk plugin update testing
 */

// Base interface for extended scenario steps
export interface ExtendedScenarioStepBase {
  id?: string;
  description?: string;
  timeout?: number;
  critical?: boolean; // Fail scenario if this step fails
}

// File system operation testing
export interface FileSystemStep extends ExtendedScenarioStepBase {
  type: 'file_operation';
  operation: 'read' | 'write' | 'create' | 'delete' | 'copy' | 'move' | 'exists' | 'mkdir';
  path: string;
  content?: string;
  expectedContent?: string;
  permissions?: string;
  backup?: boolean;
  validateJson?: boolean;
  encoding?: 'utf8' | 'binary';
}

// Git operation testing
export interface GitStep extends ExtendedScenarioStepBase {
  type: 'git_operation';
  operation: 'clone' | 'checkout' | 'branch' | 'commit' | 'push' | 'pull' | 'status' | 'diff';
  repository?: string;
  branch?: string;
  commitMessage?: string;
  remote?: string;
  workingDirectory: string;
  expectedFiles?: string[];
  expectedBranches?: string[];
  expectedCommits?: number;
}

// API call testing
export interface ApiStep extends ExtendedScenarioStepBase {
  type: 'api_call';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  expectedStatus: number;
  expectedResponse?: any;
  timeout?: number;
  retries?: number;
  mock?: {
    enabled: boolean;
    response: any;
    delay?: number;
  };
}

// External command execution testing
export interface CommandStep extends ExtendedScenarioStepBase {
  type: 'command';
  command: string;
  args: string[];
  expectedExitCode: number;
  expectedOutput?: string | RegExp;
  expectedError?: string | RegExp;
  workingDirectory?: string;
  timeout?: number;
  environment?: Record<string, string>;
}

// Bulk operation testing
export interface BulkOperationStep extends ExtendedScenarioStepBase {
  type: 'bulk_operation';
  operation: string;
  targets: string[];
  parallelism?: number;
  failureStrategy: 'stop_on_first' | 'continue_all' | 'stop_on_threshold';
  failureThreshold?: number;
  progressTracking?: boolean;
  batchSize?: number;
  timeout?: number;
}

// Validation step for complex checks
export interface ValidationStep extends ExtendedScenarioStepBase {
  type: 'validation';
  checks: ValidationCheck[];
  failOnAny?: boolean;
}

export interface ValidationCheck {
  name: string;
  type: 'file_exists' | 'file_content' | 'git_status' | 'package_json' | 'custom';
  target?: string;
  expected?: any;
  validator?: (actual: any) => boolean | Promise<boolean>;
}

// Extended scenario configuration
export interface ExtendedScenarioSetup {
  sandbox?: {
    enabled: boolean;
    tempDirectory?: string;
    cleanupStrategy: 'always' | 'on_success' | 'never';
    allowedOperations: string[];
    gitConfig?: {
      name: string;
      email: string;
    };
  };
  github?: {
    token?: string;
    organization?: string;
    mockApi?: boolean;
  };
  filesystem?: {
    allowedPaths: string[];
    restrictToTemp?: boolean;
  };
}

// Union type for all extended steps
export type ExtendedScenarioStep =
  | FileSystemStep
  | GitStep
  | ApiStep
  | CommandStep
  | BulkOperationStep
  | ValidationStep;

// Extended scenario with new capabilities
export interface ExtendedScenario {
  id: string;
  name: string;
  description: string;
  category: 'bulk_operations' | 'file_system' | 'git' | 'api' | 'integration';
  tags: string[];
  setup: ExtendedScenarioSetup;
  steps: ExtendedScenarioStep[];
  cleanup?: ExtendedScenarioStep[];
  verification: {
    rules: ValidationCheck[];
  };
  metadata?: {
    timeout?: number;
    retries?: number;
    parallel?: boolean;
  };
}
