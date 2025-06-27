import type { Scenario, ScenarioSuite } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * AutoCoder Swarm Coordination scenarios
 * Tests multi-agent coordination through GitHub for complex project development
 */

export const autocoderSwarmMicroserviceProject: Scenario = {
  id: 'autocoder-swarm-microservice-project',
  name: 'AutoCoder Swarm Microservice Development',
  description: 'Test swarm coordination for developing a complete microservice with multiple specialized agents',
  category: 'autocoder-swarm',
  tags: ['autocoder', 'swarm', 'microservice', 'coordination', 'multi-agent'],
  
  actors: [
    {
      id: uuidv4(),
      name: 'ProjectManager',
      role: 'subject',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning', '@elizaos/plugin-github'],
      personality: {
        traits: ['organized', 'strategic', 'communicative'],
        systemPrompt: 'You are a project manager coordinating a swarm of AutoCoder agents to build a microservice. Delegate tasks effectively and ensure coordination.',
      },
    },
    {
      id: uuidv4(),
      name: 'ArchitectAgent',
      role: 'assistant',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning'],
      personality: {
        traits: ['systematic', 'detail-oriented', 'strategic'],
        systemPrompt: 'You are a software architect agent specializing in designing microservice architectures and API specifications.',
      },
    },
    {
      id: uuidv4(),
      name: 'BackendAgent',
      role: 'assistant',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning'],
      personality: {
        traits: ['technical', 'precise', 'efficient'],
        systemPrompt: 'You are a backend development agent specializing in Node.js/TypeScript microservices, databases, and APIs.',
      },
    },
    {
      id: uuidv4(),
      name: 'TestingAgent',
      role: 'assistant',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning'],
      personality: {
        traits: ['thorough', 'methodical', 'quality-focused'],
        systemPrompt: 'You are a testing agent specializing in comprehensive test suites, integration tests, and quality assurance.',
      },
    },
    {
      id: uuidv4(),
      name: 'DevOpsAgent',
      role: 'assistant',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning'],
      personality: {
        traits: ['systematic', 'automation-focused', 'reliable'],
        systemPrompt: 'You are a DevOps agent specializing in containerization, CI/CD pipelines, and deployment configurations.',
      },
    },
    {
      id: uuidv4(),
      name: 'ProductOwner',
      role: 'observer',
    },
  ],

  setup: {
    roomType: 'group',
    roomName: 'Microservice Development Team',
    context: 'Swarm of AutoCoder agents collaborating to build a user authentication microservice',
    initialMessages: [
      {
        id: uuidv4(),
        content: `We need to build a user authentication microservice with the following requirements:

**Core Features:**
- User registration and login
- JWT token generation and validation
- Password hashing and security
- Rate limiting and security measures
- User profile management
- Email verification

**Technical Requirements:**
- Node.js/TypeScript
- PostgreSQL database
- REST API with OpenAPI spec
- Docker containerization
- Comprehensive test suite
- CI/CD pipeline configuration

**Deliverables:**
- Architecture design document
- Complete implementation
- Test suite with >90% coverage
- Docker configuration
- CI/CD pipeline
- API documentation

Please coordinate as a swarm to deliver this project. ProjectManager should assign tasks and ensure coordination.`,
        sender: 'ProductOwner',
        timestamp: Date.now(),
      },
    ],
  },

  execution: {
    maxDuration: 1800000, // 30 minutes
    maxSteps: 100,
    timeout: 300000, // 5 minute timeout per step
    realApiCallsExpected: true,
  },

  verification: {
    rules: [
      {
        id: 'task-delegation',
        type: 'llm-evaluation',
        description: 'Verify project manager delegated tasks effectively',
        config: {
          successCriteria: [
            'ProjectManager assigned specific tasks to each agent',
            'Clear role definitions and responsibilities',
            'Proper sequencing of dependent tasks',
            'Regular coordination and status updates',
          ],
          requiredKeywords: ['assign', 'task', 'delegate', 'coordinate', 'status'],
          llmEnhancement: true,
        },
      },
      {
        id: 'architecture-design',
        type: 'llm-evaluation',
        description: 'Verify comprehensive architecture was designed',
        config: {
          successCriteria: [
            'ArchitectAgent created detailed system design',
            'Includes database schema design',
            'Defines API endpoints and contracts',
            'Addresses security and scalability concerns',
          ],
          requiredKeywords: ['architecture', 'design', 'schema', 'API', 'security'],
          llmEnhancement: true,
        },
      },
      {
        id: 'backend-implementation',
        type: 'llm-evaluation',
        description: 'Verify backend implementation was completed',
        config: {
          successCriteria: [
            'BackendAgent implemented core authentication logic',
            'Proper TypeScript interfaces and types',
            'Database integration and migrations',
            'Security best practices implemented',
          ],
          requiredKeywords: ['authentication', 'TypeScript', 'database', 'JWT', 'bcrypt'],
          llmEnhancement: true,
        },
      },
      {
        id: 'comprehensive-testing',
        type: 'llm-evaluation',
        description: 'Verify comprehensive test suite was created',
        config: {
          successCriteria: [
            'TestingAgent created unit and integration tests',
            'Tests cover all major functionality',
            'Includes security and edge case testing',
            'Proper test organization and structure',
          ],
          requiredKeywords: ['test', 'unit', 'integration', 'coverage', 'security'],
          llmEnhancement: true,
        },
      },
      {
        id: 'devops-configuration',
        type: 'llm-evaluation',
        description: 'Verify DevOps configurations were created',
        config: {
          successCriteria: [
            'DevOpsAgent created Docker configuration',
            'CI/CD pipeline configuration provided',
            'Environment-specific configurations',
            'Deployment and monitoring setup',
          ],
          requiredKeywords: ['Docker', 'CI/CD', 'pipeline', 'deployment', 'environment'],
          llmEnhancement: true,
        },
      },
      {
        id: 'github-coordination',
        type: 'storage-verification',
        description: 'Verify GitHub coordination was used',
        config: {
          expectedValue: 'GitHub coordination session created',
          category: 'github-coordination',
        },
      },
      {
        id: 'multiple-artifacts-created',
        type: 'storage-verification',
        description: 'Verify multiple code artifacts were stored',
        config: {
          expectedValue: 'multiple artifacts stored across different types',
          category: 'artifact-storage',
          minMessages: 10, // Should have architecture docs, code, tests, configs
        },
      },
    ],
  },

  benchmarks: {
    maxDuration: 1800000,
    maxSteps: 100,
    targetAccuracy: 0.8,
    customMetrics: [
      {
        name: 'swarm_coordination_effectiveness',
        threshold: 0.85,
        target: 'effective multi-agent coordination',
      },
      {
        name: 'project_completeness',
        threshold: 0.8,
        target: 'comprehensive microservice implementation',
      },
      {
        name: 'code_quality_across_agents',
        threshold: 0.8,
        target: 'consistent high-quality code from all agents',
      },
      {
        name: 'deliverable_completeness',
        threshold: 0.75,
        target: 'all required deliverables produced',
      },
    ],
  },
};

export const autocoderSwarmBugTriageProject: Scenario = {
  id: 'autocoder-swarm-bug-triage',
  name: 'AutoCoder Swarm Bug Triage and Resolution',
  description: 'Test swarm coordination for complex bug investigation and resolution across a large codebase',
  category: 'autocoder-swarm',
  tags: ['autocoder', 'swarm', 'debugging', 'triage', 'investigation'],
  
  actors: [
    {
      id: uuidv4(),
      name: 'TriageManager',
      role: 'subject',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning', '@elizaos/plugin-github'],
      personality: {
        traits: ['analytical', 'systematic', 'communicative'],
        systemPrompt: 'You are a triage manager coordinating a swarm of debugging agents to investigate and resolve complex bugs.',
      },
    },
    {
      id: uuidv4(),
      name: 'InvestigatorAgent',
      role: 'assistant',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning'],
      personality: {
        traits: ['analytical', 'thorough', 'detective-like'],
        systemPrompt: 'You are an investigation agent specializing in analyzing bug reports, reproducing issues, and identifying root causes.',
      },
    },
    {
      id: uuidv4(),
      name: 'CodeAnalyzerAgent',
      role: 'assistant',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning'],
      personality: {
        traits: ['detail-oriented', 'technical', 'pattern-focused'],
        systemPrompt: 'You are a code analysis agent specializing in static analysis, code review, and identifying problematic patterns.',
      },
    },
    {
      id: uuidv4(),
      name: 'FixerAgent',
      role: 'assistant',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning'],
      personality: {
        traits: ['solution-oriented', 'careful', 'thorough'],
        systemPrompt: 'You are a bug fixing agent specializing in implementing safe, comprehensive fixes with proper testing.',
      },
    },
    {
      id: uuidv4(),
      name: 'ValidatorAgent',
      role: 'assistant',
      plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-planning'],
      personality: {
        traits: ['meticulous', 'thorough', 'quality-focused'],
        systemPrompt: 'You are a validation agent specializing in testing fixes, ensuring no regressions, and validating solutions.',
      },
    },
    {
      id: uuidv4(),
      name: 'BugReporter',
      role: 'observer',
    },
  ],

  setup: {
    roomType: 'group',
    roomName: 'Bug Triage Team',
    context: 'Swarm investigating and fixing a complex performance and memory leak issue',
    initialMessages: [
      {
        id: uuidv4(),
        content: `We have a critical production issue that needs immediate investigation and resolution:

**Bug Report:**
- **Severity:** Critical (Production Impact)
- **Symptoms:** Memory usage gradually increases over time, eventually causing OOM crashes
- **Affected Service:** User data processing microservice
- **Environment:** Production (Node.js 18, PostgreSQL 14, Redis 6)
- **Timeline:** Started appearing after last deploy (3 days ago)

**Observable Issues:**
1. Memory usage increases by ~50MB every hour during peak traffic
2. Database connection pool occasionally exhausts
3. Redis connections sometimes hang
4. API response times degrade over time
5. Service restarts every 6-8 hours due to memory limits

**Recent Changes:**
- Added new user analytics pipeline
- Updated database ORM to latest version
- Implemented new caching layer
- Modified bulk data processing jobs

**Initial Investigation Needed:**
1. Identify root cause of memory leak
2. Determine if it's related to recent changes
3. Analyze database and Redis connection patterns
4. Review code for potential memory leaks
5. Create comprehensive fix with testing
6. Validate fix doesn't introduce regressions

Please coordinate as a swarm to investigate and resolve this critical issue.`,
        sender: 'BugReporter',
        timestamp: Date.now(),
      },
    ],
  },

  execution: {
    maxDuration: 1200000, // 20 minutes
    maxSteps: 80,
    timeout: 180000, // 3 minute timeout per step
    realApiCallsExpected: true,
  },

  verification: {
    rules: [
      {
        id: 'systematic-investigation',
        type: 'llm-evaluation',
        description: 'Verify systematic investigation approach',
        config: {
          successCriteria: [
            'TriageManager coordinated investigation strategy',
            'InvestigatorAgent analyzed symptoms and timeline',
            'Clear investigation plan with priorities',
            'Systematic approach to isolating root cause',
          ],
          requiredKeywords: ['investigate', 'analyze', 'timeline', 'symptoms', 'priority'],
          llmEnhancement: true,
        },
      },
      {
        id: 'code-analysis-performed',
        type: 'llm-evaluation',
        description: 'Verify comprehensive code analysis',
        config: {
          successCriteria: [
            'CodeAnalyzerAgent reviewed recent changes',
            'Identified potential memory leak patterns',
            'Analyzed database and Redis usage patterns',
            'Examined connection handling and cleanup',
          ],
          requiredKeywords: ['memory leak', 'connection', 'cleanup', 'pattern', 'analysis'],
          llmEnhancement: true,
        },
      },
      {
        id: 'root-cause-identification',
        type: 'llm-evaluation',
        description: 'Verify root cause was identified',
        config: {
          successCriteria: [
            'Identified specific cause of memory leak',
            'Explained relationship to recent changes',
            'Provided evidence supporting the diagnosis',
            'Assessed impact and urgency properly',
          ],
          requiredKeywords: ['root cause', 'identified', 'evidence', 'diagnosis'],
          llmEnhancement: true,
        },
      },
      {
        id: 'comprehensive-fix-implemented',
        type: 'llm-evaluation',
        description: 'Verify comprehensive fix was implemented',
        config: {
          successCriteria: [
            'FixerAgent provided complete solution',
            'Fix addresses root cause effectively',
            'Includes proper error handling and cleanup',
            'Considers performance and scalability impact',
          ],
          requiredKeywords: ['fix', 'solution', 'cleanup', 'error handling'],
          llmEnhancement: true,
        },
      },
      {
        id: 'validation-and-testing',
        type: 'llm-evaluation',
        description: 'Verify fix validation and testing',
        config: {
          successCriteria: [
            'ValidatorAgent created comprehensive test plan',
            'Tests verify fix resolves the issue',
            'Regression testing to ensure no new issues',
            'Performance impact assessment included',
          ],
          requiredKeywords: ['test', 'validate', 'regression', 'performance'],
          llmEnhancement: true,
        },
      },
      {
        id: 'coordination-artifacts',
        type: 'storage-verification',
        description: 'Verify coordination artifacts were created',
        config: {
          expectedValue: 'investigation and fix artifacts stored',
          category: 'artifact-storage',
          minMessages: 6, // Investigation report, analysis, fix, tests, etc.
        },
      },
    ],
  },

  benchmarks: {
    maxDuration: 1200000,
    maxSteps: 80,
    targetAccuracy: 0.85,
    customMetrics: [
      {
        name: 'investigation_thoroughness',
        threshold: 0.9,
        target: 'comprehensive investigation of the issue',
      },
      {
        name: 'root_cause_accuracy',
        threshold: 0.85,
        target: 'accurate identification of root cause',
      },
      {
        name: 'fix_quality',
        threshold: 0.8,
        target: 'high-quality, comprehensive fix',
      },
      {
        name: 'swarm_coordination_efficiency',
        threshold: 0.8,
        target: 'efficient coordination between specialized agents',
      },
    ],
  },
};

export const autocoderSwarmCoordinationSuite: ScenarioSuite = {
  name: 'AutoCoder Swarm Coordination Suite',
  description: 'Comprehensive tests for multi-agent swarm coordination in complex development scenarios',
  scenarios: [
    autocoderSwarmMicroserviceProject,
    autocoderSwarmBugTriageProject,
  ],
};