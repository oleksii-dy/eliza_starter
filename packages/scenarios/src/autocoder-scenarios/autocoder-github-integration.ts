import type { Scenario, ScenarioSuite } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * AutoCoder GitHub Integration scenarios
 * Tests GitHub coordination, repository management, and artifact upload capabilities
 */

export const autocoderGitHubRepositorySetup: Scenario = {
  id: 'autocoder-github-repository-setup',
  name: 'AutoCoder GitHub Repository Setup',
  description: 'Test AutoCoder ability to set up and organize GitHub repositories for artifact storage',
  category: 'autocoder-github',
  tags: ['autocoder', 'github', 'repository', 'setup', 'organization'],
  
  actors: [
    {
      id: uuidv4(),
      name: 'AutoCoder',
      role: 'subject',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning', '@elizaos/plugin-github'],
      personality: {
        traits: ['organized', 'systematic', 'detail-oriented'],
        systemPrompt: 'You are an AutoCoder agent specializing in GitHub integration and repository management for artifact storage.',
      },
    },
    {
      id: uuidv4(),
      name: 'DevOpsEngineer',
      role: 'observer',
    },
  ],

  setup: {
    roomType: 'dm',
    context: 'AutoCoder is setting up GitHub integration for a new project',
    initialMessages: [
      {
        id: uuidv4(),
        content: `Initialize GitHub integration for our new project. I need you to:

1. Set up the GitHub coordinator for the elizaos-artifacts organization
2. Verify all required artifact repositories are available
3. Create a coordination session for a new project called "user-dashboard"
4. Test artifact upload functionality by creating and uploading a sample TypeScript component
5. Demonstrate the repository structure and organization

Make sure all GitHub integrations are working properly and artifacts are being stored correctly.`,
        sender: 'DevOpsEngineer',
        timestamp: Date.now(),
      },
    ],
  },

  execution: {
    maxDuration: 300000, // 5 minutes
    maxSteps: 25,
    timeout: 60000,
    realApiCallsExpected: true,
  },

  verification: {
    rules: [
      {
        id: 'github-coordinator-initialized',
        type: 'llm-evaluation',
        description: 'Verify GitHub coordinator was properly initialized',
        config: {
          successCriteria: [
            'GitHub coordinator connected to elizaos-artifacts organization',
            'Authentication verified successfully',
            'Artifact repositories initialized and accessible',
            'Connection status confirmed',
          ],
          requiredKeywords: ['GitHub', 'coordinator', 'initialized', 'connected', 'authenticated'],
          llmEnhancement: true,
        },
      },
      {
        id: 'repository-verification',
        type: 'llm-evaluation',
        description: 'Verify artifact repositories are properly set up',
        config: {
          successCriteria: [
            'Code artifacts repository available',
            'Documentation artifacts repository available',
            'Scenario artifacts repository available',
            'All repositories properly configured',
          ],
          requiredKeywords: ['repository', 'artifacts', 'code', 'documentation', 'available'],
          llmEnhancement: true,
        },
      },
      {
        id: 'coordination-session-created',
        type: 'storage-verification',
        description: 'Verify coordination session was created',
        config: {
          expectedValue: 'coordination session created for user-dashboard project',
          category: 'github-coordination',
        },
      },
      {
        id: 'artifact-upload-tested',
        type: 'llm-evaluation',
        description: 'Verify artifact upload functionality was tested',
        config: {
          successCriteria: [
            'Created sample TypeScript component',
            'Successfully uploaded artifact to GitHub',
            'Verified artifact accessibility in repository',
            'Confirmed proper file organization',
          ],
          requiredKeywords: ['uploaded', 'artifact', 'GitHub', 'TypeScript', 'component'],
          llmEnhancement: true,
        },
      },
    ],
  },

  benchmarks: {
    maxDuration: 300000,
    maxSteps: 25,
    targetAccuracy: 0.9,
    customMetrics: [
      {
        name: 'github_integration_success',
        threshold: 0.95,
        target: 'successful GitHub integration setup',
      },
      {
        name: 'repository_organization_quality',
        threshold: 0.9,
        target: 'well-organized repository structure',
      },
      {
        name: 'artifact_upload_reliability',
        threshold: 0.9,
        target: 'reliable artifact upload functionality',
      },
    ],
  },
};

export const autocoderGitHubCollaboration: Scenario = {
  id: 'autocoder-github-collaboration',
  name: 'AutoCoder GitHub Collaboration Workflow',
  description: 'Test AutoCoder ability to collaborate through GitHub branches and pull requests',
  category: 'autocoder-github',
  tags: ['autocoder', 'github', 'collaboration', 'branches', 'pull-requests'],
  
  actors: [
    {
      id: uuidv4(),
      name: 'LeadAgent',
      role: 'subject',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning', '@elizaos/plugin-github'],
      personality: {
        traits: ['collaborative', 'organized', 'strategic'],
        systemPrompt: 'You are a lead AutoCoder agent coordinating development work through GitHub collaboration.',
      },
    },
    {
      id: uuidv4(),
      name: 'DeveloperAgent',
      role: 'assistant',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning', '@elizaos/plugin-github'],
      personality: {
        traits: ['technical', 'precise', 'collaborative'],
        systemPrompt: 'You are a developer AutoCoder agent working on feature implementation through GitHub workflows.',
      },
    },
    {
      id: uuidv4(),
      name: 'ReviewerAgent',
      role: 'assistant',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning', '@elizaos/plugin-github'],
      personality: {
        traits: ['analytical', 'thorough', 'quality-focused'],
        systemPrompt: 'You are a reviewer AutoCoder agent focusing on code quality and best practices.',
      },
    },
    {
      id: uuidv4(),
      name: 'ProjectManager',
      role: 'observer',
    },
  ],

  setup: {
    roomType: 'group',
    roomName: 'GitHub Collaboration Team',
    context: 'Multiple AutoCoder agents collaborating on a feature through GitHub',
    initialMessages: [
      {
        id: uuidv4(),
        content: `We need to implement a new feature: "User Profile Management System" using GitHub collaboration workflow.

**Requirements:**
- User profile model with validation
- CRUD operations for profile management
- Profile image upload functionality
- Privacy settings management
- Audit trail for profile changes

**GitHub Workflow:**
1. LeadAgent: Create coordination session and assign branches
2. DeveloperAgent: Implement core functionality on assigned branch
3. ReviewerAgent: Review implementation and suggest improvements
4. All: Coordinate through GitHub commits and pull requests

Please demonstrate the complete GitHub collaboration workflow with proper branch management, commits, and pull request creation.`,
        sender: 'ProjectManager',
        timestamp: Date.now(),
      },
    ],
  },

  execution: {
    maxDuration: 900000, // 15 minutes
    maxSteps: 60,
    timeout: 120000,
    realApiCallsExpected: true,
  },

  verification: {
    rules: [
      {
        id: 'coordination-session-established',
        type: 'llm-evaluation',
        description: 'Verify coordination session was established',
        config: {
          successCriteria: [
            'LeadAgent created GitHub coordination session',
            'Project repository created for collaboration',
            'Session properly configured for multi-agent work',
            'Clear project structure established',
          ],
          requiredKeywords: ['coordination', 'session', 'created', 'repository', 'project'],
          llmEnhancement: true,
        },
      },
      {
        id: 'branch-assignment',
        type: 'llm-evaluation',
        description: 'Verify proper branch assignment and management',
        config: {
          successCriteria: [
            'Each agent assigned to specific branches',
            'Branch names follow proper conventions',
            'Clear role-based branch organization',
            'Proper branch creation from main branch',
          ],
          requiredKeywords: ['branch', 'assigned', 'agent', 'role', 'created'],
          llmEnhancement: true,
        },
      },
      {
        id: 'feature-implementation',
        type: 'llm-evaluation',
        description: 'Verify feature was properly implemented',
        config: {
          successCriteria: [
            'DeveloperAgent implemented user profile model',
            'CRUD operations created with proper validation',
            'Image upload functionality included',
            'Privacy settings management implemented',
          ],
          requiredKeywords: ['profile', 'model', 'CRUD', 'validation', 'upload', 'privacy'],
          llmEnhancement: true,
        },
      },
      {
        id: 'github-commits',
        type: 'llm-evaluation',
        description: 'Verify proper GitHub commit workflow',
        config: {
          successCriteria: [
            'Multiple commits made to appropriate branches',
            'Commit messages are descriptive and meaningful',
            'Code changes properly organized across commits',
            'Commit history demonstrates collaborative workflow',
          ],
          requiredKeywords: ['commit', 'branch', 'message', 'workflow', 'changes'],
          llmEnhancement: true,
        },
      },
      {
        id: 'pull-request-creation',
        type: 'llm-evaluation',
        description: 'Verify pull request workflow',
        config: {
          successCriteria: [
            'Pull requests created for feature branches',
            'PR descriptions include proper details',
            'Code review process demonstrated',
            'Collaboration through PR discussions',
          ],
          requiredKeywords: ['pull request', 'PR', 'review', 'description', 'discussion'],
          llmEnhancement: true,
        },
      },
      {
        id: 'github-artifacts-stored',
        type: 'storage-verification',
        description: 'Verify artifacts were stored in GitHub',
        config: {
          expectedValue: 'multiple artifacts uploaded to GitHub repositories',
          category: 'github-coordination',
          minMessages: 5, // Multiple commits and uploads
        },
      },
    ],
  },

  benchmarks: {
    maxDuration: 900000,
    maxSteps: 60,
    targetAccuracy: 0.8,
    customMetrics: [
      {
        name: 'collaboration_workflow_completeness',
        threshold: 0.85,
        target: 'complete GitHub collaboration workflow',
      },
      {
        name: 'git_best_practices_adherence',
        threshold: 0.8,
        target: 'adherence to Git best practices',
      },
      {
        name: 'multi_agent_coordination_quality',
        threshold: 0.8,
        target: 'effective multi-agent coordination through GitHub',
      },
      {
        name: 'feature_implementation_quality',
        threshold: 0.8,
        target: 'high-quality feature implementation',
      },
    ],
  },
};

export const autocoderGitHubArtifactOrganization: Scenario = {
  id: 'autocoder-github-artifact-organization',
  name: 'AutoCoder GitHub Artifact Organization',
  description: 'Test AutoCoder ability to organize and categorize artifacts across multiple GitHub repositories',
  category: 'autocoder-github',
  tags: ['autocoder', 'github', 'artifacts', 'organization', 'categorization'],
  
  actors: [
    {
      id: uuidv4(),
      name: 'AutoCoder',
      role: 'subject',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning', '@elizaos/plugin-github'],
      personality: {
        traits: ['organized', 'systematic', 'detail-oriented'],
        systemPrompt: 'You are an AutoCoder agent specializing in artifact organization and GitHub repository management.',
      },
    },
    {
      id: uuidv4(),
      name: 'ArchitectureManager',
      role: 'observer',
    },
  ],

  setup: {
    roomType: 'dm',
    context: 'AutoCoder is organizing diverse artifacts across appropriate GitHub repositories',
    initialMessages: [
      {
        id: uuidv4(),
        content: `I need you to create and organize a diverse set of artifacts for our microservices architecture project. Create the following and ensure they're properly organized in the appropriate GitHub repositories:

**Code Artifacts:**
1. User service API implementation (TypeScript)
2. Authentication middleware (TypeScript)
3. Database migration scripts (SQL)
4. Docker configuration files

**Documentation Artifacts:**
5. API documentation (Markdown)
6. Architecture decision records (Markdown)
7. Deployment guide (Markdown)

**Test Artifacts:**
8. Integration test suite (TypeScript)
9. Performance test scenarios (TypeScript)

**Configuration Artifacts:**
10. CI/CD pipeline configuration (YAML)
11. Kubernetes deployment manifests (YAML)

**Scenario Artifacts:**
12. Load testing scenarios (TypeScript)

Please create all these artifacts and ensure they're uploaded to the correct repositories with proper categorization, metadata, and organization.`,
        sender: 'ArchitectureManager',
        timestamp: Date.now(),
      },
    ],
  },

  execution: {
    maxDuration: 720000, // 12 minutes
    maxSteps: 50,
    timeout: 120000,
    realApiCallsExpected: true,
  },

  verification: {
    rules: [
      {
        id: 'diverse-artifacts-created',
        type: 'llm-evaluation',
        description: 'Verify diverse set of artifacts were created',
        config: {
          successCriteria: [
            'Created TypeScript code artifacts',
            'Created SQL database artifacts',
            'Created Markdown documentation',
            'Created YAML configuration files',
            'Created Docker and Kubernetes configs',
          ],
          requiredKeywords: ['TypeScript', 'SQL', 'Markdown', 'YAML', 'Docker', 'Kubernetes'],
          llmEnhancement: true,
        },
      },
      {
        id: 'proper-repository-categorization',
        type: 'llm-evaluation',
        description: 'Verify artifacts were categorized to correct repositories',
        config: {
          successCriteria: [
            'Code artifacts sent to code repository',
            'Documentation sent to documentation repository',
            'Test artifacts properly categorized',
            'Scenarios sent to scenarios repository',
          ],
          requiredKeywords: ['repository', 'code', 'documentation', 'test', 'scenarios'],
          llmEnhancement: true,
        },
      },
      {
        id: 'comprehensive-metadata',
        type: 'llm-evaluation',
        description: 'Verify comprehensive metadata for all artifacts',
        config: {
          successCriteria: [
            'Each artifact has descriptive metadata',
            'Proper language detection applied',
            'Meaningful tags for categorization',
            'Project context included in metadata',
          ],
          requiredKeywords: ['metadata', 'tags', 'language', 'description'],
          llmEnhancement: true,
        },
      },
      {
        id: 'github-organization-quality',
        type: 'llm-evaluation',
        description: 'Verify high-quality GitHub organization',
        config: {
          successCriteria: [
            'Files organized with proper paths',
            'Consistent naming conventions used',
            'Logical grouping of related artifacts',
            'Clear separation of concerns',
          ],
          requiredKeywords: ['organization', 'paths', 'naming', 'grouping'],
          llmEnhancement: true,
        },
      },
      {
        id: 'multiple-repository-uploads',
        type: 'storage-verification',
        description: 'Verify uploads to multiple GitHub repositories',
        config: {
          expectedValue: 'artifacts uploaded to multiple repository types',
          category: 'github-coordination',
          minMessages: 10, // Should have at least 10 different artifacts
        },
      },
    ],
  },

  benchmarks: {
    maxDuration: 720000,
    maxSteps: 50,
    targetAccuracy: 0.85,
    customMetrics: [
      {
        name: 'artifact_diversity_completeness',
        threshold: 0.9,
        target: 'complete set of diverse artifacts created',
      },
      {
        name: 'repository_categorization_accuracy',
        threshold: 0.95,
        target: 'accurate categorization across repositories',
      },
      {
        name: 'github_organization_quality',
        threshold: 0.85,
        target: 'high-quality GitHub organization and structure',
      },
      {
        name: 'metadata_comprehensiveness',
        threshold: 0.8,
        target: 'comprehensive and useful metadata',
      },
    ],
  },
};

export const autocoderGitHubIntegrationSuite: ScenarioSuite = {
  name: 'AutoCoder GitHub Integration Suite',
  description: 'Comprehensive tests for GitHub integration, collaboration, and artifact management',
  scenarios: [
    autocoderGitHubRepositorySetup,
    autocoderGitHubCollaboration,
    autocoderGitHubArtifactOrganization,
  ],
};