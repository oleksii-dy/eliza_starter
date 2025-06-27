import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Comprehensive scenario testing GitHub issue resolution with E2B sandbox execution and autocoder
 * This scenario demonstrates a complete workflow:
 * 1. Main agent fetches GitHub issue from elizaOS/eliza repo
 * 2. Spawns a coder agent in E2B container with CLI and autocoder
 * 3. Coder agent clones repo, works on issue, submits PR
 * 4. Main agent reviews PR, provides feedback through GitHub comments
 * 5. Agents coordinate through GitHub comments and direct communication
 * 6. Cycle continues until quality PR is achieved and merged
 * 7. Sandbox cleanup and session completion
 */
export const githubE2bAutocoderCollaborationScenario: Scenario = {
  id: uuidv4() as any,
  name: 'GitHub Issue Resolution with E2B Sandbox and Autocoder',
  description:
    'Complex multi-agent scenario where a main agent orchestrates GitHub issue resolution by spawning a specialized coder agent in an E2B container equipped with ElizaOS CLI and autocoder capabilities. The agents collaborate through GitHub comments and real-time communication to achieve high-quality issue resolution.',
  category: 'advanced-integration',
  tags: [
    'github',
    'e2b',
    'autocoder',
    'multi-agent',
    'collaboration',
    'code-review',
    'sandbox',
    'container',
    'pr-workflow',
    'issue-resolution',
  ],

  actors: [
    {
      id: 'main-orchestrator' as any,
      name: 'GitHub Issue Orchestrator',
      role: 'subject',
      bio: 'An experienced project coordinator who manages GitHub issues and oversees code development workflows',
      system: `You are a senior project coordinator responsible for managing GitHub issues and orchestrating development workflows. Your key responsibilities:

1. ISSUE MANAGEMENT:
   - Fetch and analyze GitHub issues from the elizaOS/eliza repository
   - Understand issue requirements, complexity, and acceptance criteria
   - Prioritize and assign issues to appropriate specialists

2. AGENT COORDINATION:
   - Spawn specialized coder agents in E2B sandbox environments
   - Maintain communication channels with sandbox agents
   - Coordinate work between multiple agents when needed

3. CODE REVIEW & QUALITY ASSURANCE:
   - Review all pull requests submitted by coder agents
   - Provide detailed, constructive feedback through GitHub comments
   - Enforce coding standards, security practices, and architectural principles
   - Ensure comprehensive testing and documentation

4. FEEDBACK LOOP MANAGEMENT:
   - Engage in iterative review cycles until code quality meets standards
   - Be critical but constructive in reviews - prioritize:
     * Code correctness and functionality
     * Security and error handling
     * Performance and scalability
     * Maintainability and readability
     * Test coverage and documentation
   - Refuse to approve PRs that don't meet quality standards

5. PROJECT COMPLETION:
   - Only approve and merge PRs when they fully resolve the issue
   - Ensure proper cleanup of sandbox environments
   - Document lessons learned and process improvements

COMMUNICATION STYLE:
- Be professional but encouraging
- Provide specific, actionable feedback
- Ask clarifying questions when requirements are unclear
- Acknowledge good work while pointing out areas for improvement
- Use GitHub comments for formal review feedback
- Use direct communication for coordination and urgent issues

QUALITY STANDARDS:
- Zero tolerance for security vulnerabilities
- All code must include appropriate error handling
- Tests are required for new functionality
- Documentation must be updated for user-facing changes
- Code must follow project conventions and style guidelines`,
      plugins: ['@elizaos/plugin-github', '@elizaos/plugin-e2b', '@elizaos/plugin-autocoder'],
      script: {
        steps: [
          {
            type: 'action',
            actionName: 'FETCH_GITHUB_ISSUES',
            actionParams: {
              owner: 'elizaOS',
              repo: 'eliza',
              state: 'open',
              labels: ['good first issue', 'bug', 'enhancement'],
              limit: 5,
            },
            description: 'Fetch open issues from elizaOS/eliza repository',
          },
          {
            type: 'wait',
            waitTime: 2000,
          },
          {
            type: 'action',
            actionName: 'CREATE_SANDBOX',
            actionParams: {
              template: 'elizaos-dev',
              timeout: '30 minutes',
              metadata: {
                purpose: 'github-issue-resolution',
                repository: 'elizaOS/eliza',
              },
            },
            description: 'Create E2B sandbox with ElizaOS development environment',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content:
              'I have set up a development environment and identified several GitHub issues that need attention. Let me coordinate with a specialized coder agent to work on these issues.',
          },
        ],
      },
    },
    {
      id: 'e2b-coder-agent' as any,
      name: 'Sandbox Development Agent',
      role: 'assistant',
      bio: 'A skilled software engineer who works exclusively in secure sandbox environments to implement solutions for GitHub issues',
      system: `You are a skilled software engineer operating in a secure E2B sandbox environment equipped with:
- ElizaOS CLI and development tools
- Git version control
- Full repository access
- Autocoder capabilities for intelligent code generation

Your core responsibilities:

1. DEVELOPMENT WORKFLOW:
   - Clone the assigned GitHub repository
   - Analyze the assigned issue thoroughly
   - Implement comprehensive solutions following project conventions
   - Write appropriate tests for your changes
   - Create detailed pull requests with proper documentation

2. CODE QUALITY STANDARDS:
   - Follow existing code patterns and architectural principles
   - Implement proper error handling and input validation
   - Ensure your code is secure and performant
   - Write clean, maintainable, and well-documented code
   - Include comprehensive tests for new functionality

3. COLLABORATION & COMMUNICATION:
   - Respond to review feedback professionally and promptly
   - Ask clarifying questions when requirements are unclear
   - Keep the main agent informed of progress and blockers
   - Update GitHub issues and PRs with detailed progress updates

4. CONTINUOUS IMPROVEMENT:
   - Learn from feedback and apply lessons to future work
   - Suggest improvements to development processes
   - Stay updated with project conventions and best practices

TOOLS & ENVIRONMENT:
- You have access to the full ElizaOS codebase in your sandbox
- Use 'elizaos' CLI commands for project operations
- Use Git for version control operations
- Leverage autocoder for intelligent code generation when appropriate
- All file operations should be performed within the sandbox

COMMUNICATION STYLE:
- Be proactive in providing updates
- Ask questions when unclear about requirements
- Provide detailed explanations of your implementation approach
- Accept feedback gracefully and implement changes promptly
- Document your work thoroughly for future reference`,
      plugins: [
        '@elizaos/plugin-github',
        '@elizaos/plugin-e2b',
        '@elizaos/plugin-autocoder',
        '@elizaos/plugin-shell',
      ],
      script: {
        steps: [
          {
            type: 'wait',
            waitTime: 8000,
            description: 'Wait for sandbox setup and coordination from main agent',
          },
          {
            type: 'message',
            content:
              'Sandbox environment is ready! I have ElizaOS CLI, Git, and autocoder available. Please assign me a GitHub issue to work on.',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'action',
            actionName: 'EXECUTE_CODE',
            actionParams: {
              code: `import os
import subprocess

# Check sandbox environment
print("=== Sandbox Environment Status ===")
print(f"Working directory: {os.getcwd()}")
print(f"Available commands:")
subprocess.run(['which', 'git'], capture_output=False)
subprocess.run(['which', 'elizaos'], capture_output=False)
subprocess.run(['which', 'node'], capture_output=False)
subprocess.run(['which', 'bun'], capture_output=False)

# Check Git configuration
print("\\n=== Git Configuration ===")
subprocess.run(['git', '--version'], capture_output=False)
subprocess.run(['git', 'config', '--list'], capture_output=False)

print("\\nSandbox environment ready for development work!")`,
              language: 'python',
            },
            description: 'Verify sandbox environment setup',
          },
        ],
      },
    },
    {
      id: 'pr-reviewer-agent' as any,
      name: 'Quality Assurance Reviewer',
      role: 'assistant',
      bio: 'A meticulous code reviewer focused on maintaining high quality standards and security best practices',
      system: `You are a senior code reviewer and quality assurance specialist. Your role is to ensure all code meets the highest standards before being merged. You work closely with the main orchestrator to provide detailed technical reviews.

REVIEW RESPONSIBILITIES:
1. Conduct thorough code reviews for security, performance, and maintainability
2. Verify test coverage and quality
3. Check adherence to project conventions and coding standards
4. Validate that the implementation fully addresses the GitHub issue
5. Ensure proper documentation and comments

QUALITY CRITERIA:
- Security: No vulnerabilities, proper input validation, secure coding practices
- Functionality: Code works as intended and handles edge cases
- Performance: Efficient algorithms and resource usage
- Maintainability: Clean, readable code with proper abstraction
- Testing: Comprehensive test coverage with meaningful test cases
- Documentation: Clear comments, updated docs, proper commit messages

REVIEW PROCESS:
- Provide specific, actionable feedback
- Include code suggestions when possible
- Highlight both strengths and areas for improvement
- Request changes when quality standards are not met
- Approve only when all criteria are satisfied

Be thorough but constructive in your reviews. The goal is to ship high-quality code that the entire team can be proud of.`,
      plugins: ['@elizaos/plugin-github', '@elizaos/plugin-autocoder'],
      script: {
        steps: [
          {
            type: 'wait',
            waitTime: 15000,
            description: 'Wait for development work to begin',
          },
          {
            type: 'message',
            content:
              'I am ready to conduct thorough code reviews. I will evaluate all pull requests for security, performance, maintainability, and adherence to project standards.',
          },
        ],
      },
    },
    {
      id: 'user-stakeholder' as any,
      name: 'Product Stakeholder',
      role: 'observer',
      bio: 'A product manager who monitors the development process and ensures user requirements are met',
      system: `You are a product manager observing the development process. You represent user interests and ensure that solutions meet real-world requirements.

RESPONSIBILITIES:
- Monitor issue resolution progress
- Provide user perspective on proposed solutions
- Validate that implementations solve the actual user problem
- Suggest improvements from a usability standpoint
- Ensure proper communication with stakeholders

INTERACTION STYLE:
- Ask clarifying questions about user impact
- Provide feedback on user experience considerations
- Validate that solutions address root causes, not just symptoms
- Ensure documentation is user-friendly and complete`,
      plugins: ['@elizaos/plugin-github'],
      script: {
        steps: [
          {
            type: 'wait',
            waitTime: 20000,
          },
          {
            type: 'message',
            content:
              'I am monitoring this development workflow to ensure we are delivering real value to our users. Please keep me informed of progress and any decisions that might impact user experience.',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'group',
    roomName: 'GitHub Issue Resolution Workspace',
    context:
      'Collaborative development environment for resolving GitHub issues with automated workflows and quality assurance',
    environment: {
      GITHUB_TOKEN: '${GITHUB_TOKEN}',
      E2B_API_KEY: '${E2B_API_KEY}',
      ELIZAOS_REPO_URL: 'https://github.com/elizaOS/eliza.git',
      DEVELOPMENT_MODE: 'true',
      QUALITY_GATE_ENABLED: 'true',
    },
  },

  execution: {
    maxDuration: 900000, // 15 minutes for complete workflow
    maxSteps: 50,
    stopConditions: [
      {
        type: 'custom',
        value: 'pr_merged_and_sandbox_cleaned',
        description: 'Stop when PR is successfully merged and sandbox is cleaned up',
      },
      {
        type: 'keyword',
        value: 'workflow_completed',
        description: 'Stop when orchestrator declares workflow completion',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: 'github-issue-fetched' as any,
        type: 'llm' as const,
        description: 'GitHub issues were successfully fetched from the elizaOS repository',
        config: {
          successCriteria:
            'The main agent successfully retrieved GitHub issues from the elizaOS/eliza repository and identified suitable issues for resolution',
          priority: 'high',
          category: 'integration',
        },
      },
      {
        id: 'sandbox-environment-created' as any,
        type: 'llm' as const,
        description: 'E2B sandbox with ElizaOS development environment was successfully created',
        config: {
          successCriteria:
            'A secure E2B sandbox was created with all necessary development tools including ElizaOS CLI, Git, and autocoder capabilities',
          priority: 'high',
          category: 'infrastructure',
        },
      },
      {
        id: 'agent-communication-established' as any,
        type: 'llm' as const,
        description: 'Communication channels between main agent and sandbox agent were established',
        config: {
          successCriteria:
            'The main orchestrator successfully communicated with the coder agent in the sandbox environment and coordinated task assignment',
          priority: 'high',
          category: 'coordination',
        },
      },
      {
        id: 'repository-cloned-in-sandbox' as any,
        type: 'llm' as const,
        description: 'GitHub repository was successfully cloned in the sandbox environment',
        config: {
          successCriteria:
            'The coder agent successfully cloned the elizaOS/eliza repository in the sandbox and verified the development environment',
          priority: 'high',
          category: 'development',
        },
      },
      {
        id: 'issue-analysis-completed' as any,
        type: 'llm' as const,
        description: 'Assigned GitHub issue was thoroughly analyzed by the coder agent',
        config: {
          successCriteria:
            'The coder agent demonstrated understanding of the GitHub issue requirements, scope, and acceptance criteria',
          priority: 'high',
          category: 'analysis',
        },
      },
      {
        id: 'code-implementation-started' as any,
        type: 'llm' as const,
        description: 'Code implementation work began with proper development practices',
        config: {
          successCriteria:
            'The coder agent began implementing a solution using appropriate development practices, tools, and methodologies',
          priority: 'high',
          category: 'development',
        },
      },
      {
        id: 'pull-request-created' as any,
        type: 'llm' as const,
        description: 'A pull request was created with the proposed solution',
        config: {
          successCriteria:
            'The coder agent successfully created a pull request with a comprehensive description, proper commit messages, and the implemented solution',
          priority: 'high',
          category: 'collaboration',
        },
      },
      {
        id: 'code-review-initiated' as any,
        type: 'llm' as const,
        description: 'Code review process was initiated by the main agent or reviewer',
        config: {
          successCriteria:
            'A thorough code review was initiated with detailed feedback on the proposed changes, covering security, performance, and code quality',
          priority: 'high',
          category: 'quality-assurance',
        },
      },
      {
        id: 'feedback-loop-functioning' as any,
        type: 'llm' as const,
        description: 'Iterative feedback and improvement cycle was established',
        config: {
          successCriteria:
            'Agents engaged in multiple rounds of feedback, code improvements, and quality refinements through GitHub comments and direct communication',
          priority: 'medium',
          category: 'collaboration',
        },
      },
      {
        id: 'quality-standards-enforced' as any,
        type: 'llm' as const,
        description: 'High quality standards were maintained throughout the review process',
        config: {
          successCriteria:
            'The review process demonstrated enforcement of coding standards, security practices, testing requirements, and documentation standards',
          priority: 'high',
          category: 'quality-assurance',
        },
      },
      {
        id: 'github-communication-used' as any,
        type: 'llm' as const,
        description: 'GitHub comments were used for formal communication and feedback',
        config: {
          successCriteria:
            'Agents effectively used GitHub comments for code review feedback, issue discussions, and formal project communication',
          priority: 'medium',
          category: 'collaboration',
        },
      },
      {
        id: 'direct-coordination-maintained' as any,
        type: 'llm' as const,
        description:
          'Direct agent-to-agent coordination was maintained for real-time collaboration',
        config: {
          successCriteria:
            'Agents maintained direct communication channels for immediate coordination, urgent issues, and workflow management',
          priority: 'medium',
          category: 'coordination',
        },
      },
      {
        id: 'workflow-completion-achieved' as any,
        type: 'llm' as const,
        description: 'Complete workflow from issue identification to resolution was achieved',
        config: {
          successCriteria:
            'The entire workflow from GitHub issue identification through code implementation, review, and completion was successfully demonstrated',
          priority: 'high',
          category: 'integration',
        },
      },
      {
        id: 'sandbox-lifecycle-managed' as any,
        type: 'llm' as const,
        description: 'Sandbox environment lifecycle was properly managed',
        config: {
          successCriteria:
            'The E2B sandbox environment was created, utilized effectively for development work, and properly cleaned up after completion',
          priority: 'medium',
          category: 'infrastructure',
        },
      },
      {
        id: 'autocoder-integration-demonstrated' as any,
        type: 'llm' as const,
        description: 'Autocoder capabilities were effectively leveraged for development',
        config: {
          successCriteria:
            'The autocoder plugin was used effectively to assist with code generation, analysis, or development workflow automation',
          priority: 'medium',
          category: 'tooling',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: 'main-orchestrator',
        outcome: 'Successfully orchestrated the complete GitHub issue resolution workflow',
        verification: {
          id: 'orchestration-success' as any,
          type: 'llm' as const,
          description:
            'Main agent demonstrated effective project coordination and quality management',
          config: {
            successCriteria:
              'The main orchestrator successfully managed all aspects of the workflow from issue identification to final resolution with quality assurance',
          },
        },
      },
      {
        actorId: 'e2b-coder-agent',
        outcome: 'Delivered high-quality code solution within sandbox environment',
        verification: {
          id: 'development-success' as any,
          type: 'llm' as const,
          description: 'Coder agent delivered working solution with proper development practices',
          config: {
            successCriteria:
              'The coder agent successfully implemented a working solution that addresses the GitHub issue while following best practices',
          },
        },
      },
      {
        actorId: 'pr-reviewer-agent',
        outcome: 'Provided thorough and constructive code review feedback',
        verification: {
          id: 'review-quality' as any,
          type: 'llm' as const,
          description:
            'Reviewer provided detailed, actionable feedback maintaining quality standards',
          config: {
            successCriteria:
              'The reviewer conducted thorough code reviews with specific, actionable feedback that improved code quality',
          },
        },
      },
      {
        actorId: 'user-stakeholder',
        outcome: 'Validated that user requirements and product goals were met',
        verification: {
          id: 'stakeholder-validation' as any,
          type: 'llm' as const,
          description: 'Product stakeholder confirmed user value and requirement satisfaction',
          config: {
            successCriteria:
              'The stakeholder validated that the solution addresses real user needs and meets product requirements',
          },
        },
      },
    ],
  },

  benchmarks: {
    maxDuration: 900000, // 15 minutes
    maxSteps: 50,
    maxTokens: 100000,
    targetAccuracy: 0.9,
    customMetrics: [
      {
        name: 'issue_resolution_time',
        target: 600000, // 10 minutes target
        threshold: 900000, // 15 minutes maximum
      },
      {
        name: 'code_review_cycles',
        target: 2, // Target 2 review cycles
        threshold: 4, // Maximum 4 review cycles
      },
      {
        name: 'sandbox_utilization_efficiency',
        target: 0.8, // 80% efficient use of sandbox time
        threshold: 0.6, // Minimum 60% efficiency
      },
      {
        name: 'github_api_calls',
        threshold: 50, // Maximum 50 GitHub API calls
      },
      {
        name: 'agent_coordination_effectiveness',
        target: 0.9, // 90% effective coordination
        threshold: 0.7, // Minimum 70% effectiveness
      },
    ],
  },

  expectations: {
    messagePatterns: [
      {
        pattern: 'github.*issue.*fetch',
        flags: 'i',
      },
      {
        pattern: 'sandbox.*create.*environment',
        flags: 'i',
      },
      {
        pattern: 'clone.*repository',
        flags: 'i',
      },
      {
        pattern: 'pull.*request.*create',
        flags: 'i',
      },
      {
        pattern: 'code.*review.*feedback',
        flags: 'i',
      },
      {
        pattern: 'workflow.*complete',
        flags: 'i',
      },
    ],
    responseTime: {
      max: 10000, // 10 seconds max response time
    },
    actionCalls: [
      'FETCH_GITHUB_ISSUES',
      'CREATE_SANDBOX',
      'EXECUTE_CODE',
      'MANAGE_SANDBOX',
      'CREATE_PULL_REQUEST',
      'ADD_GITHUB_COMMENT',
      'AUTO_CODE_ISSUE',
    ],
  },

  metadata: {
    complexity: 'high',
    plugins_required: ['github', 'e2b', 'autocoder', 'shell'],
    environment_requirements: ['GITHUB_TOKEN', 'E2B_API_KEY'],
    estimated_duration: '10-15 minutes',
    success_indicators: [
      'GitHub issue successfully identified and assigned',
      'E2B sandbox created with development environment',
      'Repository cloned and development work initiated',
      'Pull request created with working solution',
      'Code review cycle completed with quality feedback',
      'Workflow completed with satisfied stakeholder',
      'Sandbox properly cleaned up',
    ],
    failure_indicators: [
      'Unable to fetch GitHub issues',
      'Sandbox creation or setup failures',
      'Repository cloning issues',
      'Code implementation failures',
      'Communication breakdowns between agents',
      'Quality standards not maintained',
      'Workflow abandonment before completion',
    ],
  },
};

export default githubE2bAutocoderCollaborationScenario;
