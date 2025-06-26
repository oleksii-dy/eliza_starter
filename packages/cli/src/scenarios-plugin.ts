/**
 * ElizaOS Scenarios Plugin
 * Integrates standalone scenario files into the plugin system for CLI execution
 */

import type { Plugin } from '@elizaos/core';
import { logger, asUUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * Scenarios Plugin - Makes standalone scenarios available to CLI
 *
 * Note: Using 'actors' instead of 'characters' to match ScenarioRunner expectations
 */
export const scenariosPlugin: Plugin = {
  name: '@elizaos/scenarios',
  description: 'Built-in scenarios for testing and benchmarking ElizaOS agents',

  // Convert standalone scenarios to expected format
  scenarios: [
    {
      id: asUUID(uuidv4()),
      name: 'Abstract Workflow Planning',
      description:
        "Test the agent's ability to break down complex abstract problems into actionable workflows",
      category: 'functionality' as const,
      tags: ['workflow', 'planning', 'problem-solving', 'abstraction'],

      // Character definitions using plugin scenario format
      characters: [
        {
          id: asUUID(uuidv4()),
          name: 'Planning Agent',
          role: 'subject' as const,
          plugins: [], // Uses the main agent being tested
          bio: 'I am a strategic planning agent specializing in breaking down complex projects into actionable workflows.',
        },
      ],

      script: {
        steps: [
          {
            type: 'message' as const,
            content:
              'We need to launch a new product in 6 months. The product is a mobile app for connecting local food producers with consumers. Can you help us create a comprehensive launch plan?',
          },
          {
            type: 'wait' as const,
            duration: 2000,
          },
        ],
        goals: ['get comprehensive plan', 'understand priorities', 'optimize resource allocation'],
      },

      setup: {
        roomType: 'dm',
        roomName: 'Strategy Planning Session',
        context:
          'You are helping plan the launch of a new mobile app for connecting local food producers with consumers. Provide a strategic, well-structured approach.',
        environment: {
          projectContext: 'mobile app launch',
          timeline: '6 months',
          budget: '$500k',
          teamSize: 8,
        },
      },

      verification: {
        rules: [
          {
            id: 'broke-down-into-phases',
            type: 'llm' as const,
            description: 'Agent broke down the project into logical phases/stages',
            config: {
              successCriteria:
                'The agent organized the project into logical phases such as planning, development, testing, marketing, and launch',
              weight: 3,
            },
          },
          {
            id: 'identified-key-tasks',
            type: 'llm' as const,
            description: 'Agent identified specific, actionable tasks',
            config: {
              successCriteria:
                'The agent provided specific, actionable tasks for different aspects like app development, user acquisition, producer onboarding, etc.',
              weight: 3,
            },
          },
          {
            id: 'addressed-dependencies',
            type: 'llm' as const,
            description: 'Agent identified task dependencies and bottlenecks',
            config: {
              successCriteria:
                'The agent identified critical dependencies between tasks and potential bottlenecks that could delay the project',
              weight: 2,
            },
          },
          {
            id: 'provided-timeline',
            type: 'llm' as const,
            description: 'Agent provided realistic timeline estimates',
            config: {
              successCriteria:
                'The agent provided timeline estimates for different phases that seem realistic for a 6-month project',
              weight: 2,
            },
          },
          {
            id: 'considered-resources',
            type: 'llm' as const,
            description: 'Agent considered resource allocation and budget constraints',
            config: {
              successCriteria:
                'The agent addressed resource allocation considering the $500k budget and 8-person team',
              weight: 2,
            },
          },
          {
            id: 'industry-awareness',
            type: 'llm' as const,
            description: 'Agent showed understanding of the specific industry/domain',
            config: {
              successCriteria:
                'The agent demonstrated understanding of food/agriculture marketplace dynamics and mobile app development',
              weight: 2,
            },
          },
          {
            id: 'risk-mitigation',
            type: 'llm' as const,
            description: 'Agent identified risks and mitigation strategies',
            config: {
              successCriteria:
                'The agent identified potential risks and suggested mitigation strategies',
              weight: 1,
            },
          },
          {
            id: 'structured-response',
            type: 'llm' as const,
            description: 'Responses were well-structured and organized',
            config: {
              successCriteria:
                'The planning responses were well-organized with clear sections, bullet points, or logical flow',
              weight: 1,
            },
          },
        ],
        groundTruth: {
          expectedBehavior:
            'Agent should create a comprehensive, realistic project plan with clear phases and dependencies',
          successCriteria: [
            'Break down into logical phases',
            'Identify specific actionable tasks',
            'Address dependencies and bottlenecks',
            'Provide realistic timelines',
            'Consider resource constraints',
            'Show domain understanding',
          ],
        },
      },
    },

    // Simple test scenario - enhanced for debugging
    {
      id: asUUID(uuidv4()),
      name: 'Simple Test',
      description: 'Basic functionality test with real agent interaction',
      category: 'functionality' as const,
      tags: ['test', 'basic'],

      characters: [
        {
          id: asUUID(uuidv4()),
          name: 'TestUser',
          role: 'observer' as const,
          plugins: [],
          bio: 'I am a test user who sends messages to the agent.',
        },
        {
          id: asUUID(uuidv4()),
          name: 'TestAgent',
          role: 'subject' as const,
          plugins: [],
          bio: 'I am a simple test agent used to verify basic functionality.',
        },
      ],

      script: {
        steps: [
          {
            type: 'message' as const,
            from: 'TestUser',
            content: 'Hello, can you respond to confirm you are working?',
          },
          {
            type: 'wait' as const,
            duration: 3000,
          },
        ],
      },

      setup: {
        roomType: 'dm',
        context: 'Simple test scenario with user and agent interaction',
      },

      verification: {
        rules: [
          {
            id: 'responds',
            type: 'llm' as const,
            description: 'Agent responds to simple message',
            config: {
              successCriteria:
                'Agent should provide any response to the greeting within the conversation transcript',
              weight: 1,
            },
          },
          {
            id: 'transcript-has-messages',
            type: 'llm' as const,
            description: 'Conversation transcript contains messages',
            config: {
              successCriteria:
                'The conversation transcript should have at least 2 messages (user message and agent response)',
              weight: 1,
            },
          },
        ],
      },
    },

    {
      id: asUUID(uuidv4()),
      name: 'Plugin Configuration System Test',
      description:
        'Comprehensive plugin configuration test with services, actions, providers, and evaluators',
      category: 'functionality' as const,
      tags: ['plugins', 'configuration', 'services', 'actions', 'providers'],

      characters: [
        {
          id: asUUID(uuidv4()),
          name: 'PluginTestAgent',
          role: 'subject' as const,
          plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-message-handling'],
          bio: 'I am a plugin configuration test agent specializing in testing service dependencies and plugin lifecycle management.',
          system: `You are a test agent designed to validate plugin configuration functionality. You can:
1. Test database connections and queries
2. Validate authentication services
3. Check system performance and statistics
4. Execute actions that depend on multiple services
5. Report on plugin configuration status

When asked to test plugins, you should interact with the various services and actions available to you.`,
        },
      ],

      script: {
        steps: [
          {
            type: 'message' as const,
            from: 'PluginTestAgent',
            content:
              'I am initializing plugin configuration system testing. Let me verify all services are running correctly.',
          },
          {
            type: 'wait' as const,
            duration: 2000,
          },
          {
            type: 'message' as const,
            from: 'PluginTestAgent',
            content:
              'Now testing database service integration. Please query the database for user data.',
          },
          {
            type: 'wait' as const,
            duration: 3000,
          },
          {
            type: 'message' as const,
            from: 'PluginTestAgent',
            content:
              'Testing authentication service and system statistics gathering. Validating service dependencies.',
          },
          {
            type: 'wait' as const,
            duration: 2000,
          },
        ],
      },

      setup: {
        roomType: 'dm',
        context:
          'Testing comprehensive plugin configuration system with real services, actions, providers, and evaluators',
        environment: {
          DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
          DATABASE_API_KEY: 'test-api-key-12345',
          plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-message-handling'],
        },
      },

      verification: {
        rules: [
          {
            id: 'services-initialized',
            type: 'llm' as const,
            description: 'All required services initialized successfully',
            config: {
              successCriteria:
                'Agent should have successfully initialized database and authentication services with proper configuration',
              weight: 3,
            },
          },
          {
            id: 'actions-functional',
            type: 'llm' as const,
            description: 'Plugin actions execute correctly with service dependencies',
            config: {
              successCriteria:
                'Database query actions should execute successfully with authentication validation',
              weight: 3,
            },
          },
          {
            id: 'providers-working',
            type: 'llm' as const,
            description: 'Providers gather system statistics from services',
            config: {
              successCriteria:
                'System statistics provider should return real-time data from running services',
              weight: 2,
            },
          },
          {
            id: 'evaluators-active',
            type: 'llm' as const,
            description: 'Performance evaluators collect metrics',
            config: {
              successCriteria:
                'Performance evaluator should log service metrics and system performance data',
              weight: 2,
            },
          },
          {
            id: 'env-var-validation',
            type: 'llm' as const,
            description: 'Environment variable validation works correctly',
            config: {
              successCriteria:
                'System should properly validate required environment variables and handle missing variables gracefully',
              weight: 2,
            },
          },
          {
            id: 'hot-swap-capability',
            type: 'llm' as const,
            description: 'Plugin components can be enabled/disabled dynamically',
            config: {
              successCriteria:
                'System should support dynamic enabling and disabling of plugin components without restart',
              weight: 2,
            },
          },
          {
            id: 'service-communication',
            type: 'llm' as const,
            description: 'Services communicate properly across plugin boundaries',
            config: {
              successCriteria:
                'Multiple services from different plugins should work together seamlessly',
              weight: 2,
            },
          },
        ],
        groundTruth: {
          expectedBehavior:
            'Agent should demonstrate comprehensive plugin configuration system functionality',
          successCriteria: [
            'Initialize multiple services successfully',
            'Execute actions with service dependencies',
            'Gather system statistics from providers',
            'Log performance metrics from evaluators',
            'Validate environment variables',
            'Support dynamic component management',
            'Enable cross-plugin service communication',
          ],
        },
      },
    },

    {
      id: asUUID(uuidv4()),
      name: 'Production Plugin Configuration System Test',
      description:
        'Production-ready comprehensive plugin configuration test with real-world scenarios',
      category: 'performance' as const,
      tags: ['plugins', 'production', 'configuration', 'integration', 'performance'],

      characters: [
        {
          id: asUUID(uuidv4()),
          name: 'ProductionTestAgent',
          role: 'subject' as const,
          plugins: [
            '@elizaos/plugin-sql',
            '@elizaos/plugin-message-handling',
            '@elizaos/plugin-research',
            '@elizaos/plugin-web-search',
          ],
          bio: 'I am a production test agent specializing in comprehensive plugin configuration systems under realistic load conditions.',
          system: `You are a production-grade test agent designed to validate plugin configuration functionality under real-world conditions. You specialize in:

1. High-volume service integration testing
2. Performance monitoring and optimization
3. Resource management and cleanup
4. Error handling and recovery
5. Cross-plugin communication validation
6. Production environment simulation

When testing production systems, you should validate not just functionality but also performance, scalability, and error resilience.`,
        },
      ],

      script: {
        steps: [
          {
            type: 'message' as const,
            from: 'ProductionTestAgent',
            content:
              'Initiating production-grade plugin configuration system test. Beginning comprehensive service validation and performance benchmarking.',
          },
          {
            type: 'wait' as const,
            duration: 2000,
          },
          {
            type: 'message' as const,
            from: 'ProductionTestAgent',
            content:
              'Testing high-volume database operations with concurrent connections. Simulating production load patterns.',
          },
          {
            type: 'wait' as const,
            duration: 3000,
          },
          {
            type: 'message' as const,
            from: 'ProductionTestAgent',
            content:
              'Validating cross-plugin service communication under load. Testing research and web search plugin integration.',
          },
          {
            type: 'wait' as const,
            duration: 2000,
          },
          {
            type: 'message' as const,
            from: 'ProductionTestAgent',
            content:
              'Executing error recovery scenarios and resource cleanup validation. Testing system resilience.',
          },
          {
            type: 'wait' as const,
            duration: 2000,
          },
        ],
      },

      setup: {
        roomType: 'dm',
        context:
          'Production-grade testing of plugin configuration systems with real-world load simulation and comprehensive validation',
        environment: {
          DATABASE_URL: 'postgresql://production:prod@localhost:5432/proddb',
          DATABASE_API_KEY: 'prod-api-key-67890',
          RESEARCH_API_KEY: 'research-key-123',
          WEB_SEARCH_API_KEY: 'search-key-456',
          MAX_CONCURRENT_OPERATIONS: '50',
          PERFORMANCE_THRESHOLD_MS: '500',
          plugins: [
            '@elizaos/plugin-sql',
            '@elizaos/plugin-message-handling',
            '@elizaos/plugin-research',
            '@elizaos/plugin-web-search',
          ],
        },
      },

      verification: {
        rules: [
          {
            id: 'production-service-startup',
            type: 'llm' as const,
            description: 'All production services start successfully under load',
            config: {
              successCriteria:
                'All required services should initialize successfully and handle concurrent startup operations',
              weight: 3,
            },
          },
          {
            id: 'high-volume-operations',
            type: 'llm' as const,
            description: 'System handles high-volume operations efficiently',
            config: {
              successCriteria:
                'Database and API operations should complete within performance thresholds under simulated load',
              weight: 3,
            },
          },
          {
            id: 'cross-plugin-integration',
            type: 'llm' as const,
            description: 'Multiple plugins work together seamlessly in production',
            config: {
              successCriteria:
                'Research and web search plugins should integrate properly with database and messaging systems',
              weight: 3,
            },
          },
          {
            id: 'error-recovery',
            type: 'llm' as const,
            description: 'System recovers gracefully from errors and failures',
            config: {
              successCriteria:
                'System should handle service failures, network timeouts, and resource constraints gracefully',
              weight: 2,
            },
          },
          {
            id: 'resource-management',
            type: 'llm' as const,
            description: 'Proper resource cleanup and memory management',
            config: {
              successCriteria:
                'System should properly clean up resources, close connections, and manage memory under load',
              weight: 2,
            },
          },
          {
            id: 'performance-metrics',
            type: 'llm' as const,
            description: 'Performance metrics meet production standards',
            config: {
              successCriteria:
                'Response times, throughput, and resource usage should meet or exceed production performance requirements',
              weight: 2,
            },
          },
          {
            id: 'configuration-validation',
            type: 'llm' as const,
            description: 'Production configuration is validated and secure',
            config: {
              successCriteria:
                'Environment variables, API keys, and configuration settings should be properly validated and secured',
              weight: 2,
            },
          },
          {
            id: 'monitoring-alerting',
            type: 'llm' as const,
            description: 'Monitoring and alerting systems function correctly',
            config: {
              successCriteria:
                'System should provide comprehensive monitoring data and trigger appropriate alerts for production issues',
              weight: 1,
            },
          },
        ],
        groundTruth: {
          expectedBehavior:
            'Agent should demonstrate production-ready plugin configuration system functionality under realistic conditions',
          successCriteria: [
            'Handle high-volume concurrent operations',
            'Maintain performance under load',
            'Integrate multiple complex plugins seamlessly',
            'Recover gracefully from errors and failures',
            'Manage resources efficiently',
            'Meet production performance benchmarks',
            'Validate production configuration securely',
            'Provide comprehensive monitoring and alerting',
          ],
        },
      },
    },

    {
      id: asUUID(uuidv4()),
      name: 'GitHub Todo Workflow Integration',
      description:
        'Advanced cross-plugin workflow integration with GitHub API, todo management, and complex task orchestration',
      category: 'integration' as const,
      tags: ['github', 'workflow', 'integration', 'external-api', 'todo', 'automation'],

      characters: [
        {
          id: asUUID(uuidv4()),
          name: 'GitHubWorkflowAgent',
          role: 'subject' as const,
          plugins: [
            '@elizaos/plugin-github',
            '@elizaos/plugin-todo',
            '@elizaos/plugin-web-search',
            '@elizaos/plugin-planning',
          ],
          bio: 'I am an advanced GitHub workflow agent specializing in API integration, task management, and automated workflow orchestration.',
          system: `You are an advanced GitHub workflow automation agent. You excel at:

1. GitHub API integration and repository management
2. Issue and pull request automation
3. Todo list management and task prioritization
4. Cross-repository workflow coordination
5. Code review and quality assurance automation
6. Project planning and milestone tracking
7. Team collaboration and notification management

When working with GitHub workflows, you should demonstrate:
- Proper API authentication and error handling
- Efficient task batching and parallel processing
- Intelligent priority assessment and task routing
- Integration with planning and todo management systems
- Real-time status updates and progress tracking`,
        },
        {
          id: asUUID(uuidv4()),
          name: 'ProjectManager',
          role: 'observer' as const,
          plugins: [],
          bio: 'I am a project manager who assigns tasks and monitors workflow progress.',
        },
      ],

      script: {
        steps: [
          {
            type: 'message' as const,
            from: 'ProjectManager',
            content:
              'We have a new feature request: "Add user authentication to the mobile app". Please create a comprehensive GitHub workflow including issues, milestones, and todo items across our repositories.',
          },
          {
            type: 'wait' as const,
            duration: 3000,
          },
          {
            type: 'message' as const,
            from: 'ProjectManager',
            content:
              'Also check our existing open issues and pull requests. Prioritize the authentication work and coordinate with any related tasks.',
          },
          {
            type: 'wait' as const,
            duration: 4000,
          },
          {
            type: 'message' as const,
            from: 'ProjectManager',
            content:
              'Set up automated code review assignments and ensure proper labeling for this authentication feature across all affected repositories.',
          },
          {
            type: 'wait' as const,
            duration: 3000,
          },
          {
            type: 'message' as const,
            from: 'ProjectManager',
            content:
              'Finally, create a status dashboard showing progress across all related tasks and generate a summary for the team.',
          },
          {
            type: 'wait' as const,
            duration: 2000,
          },
        ],
      },

      setup: {
        roomType: 'dm',
        context:
          'Advanced GitHub workflow automation testing with real repository management and cross-plugin integration',
        environment: {
          GITHUB_TOKEN: 'github_token_placeholder',
          GITHUB_OWNER: 'test-org',
          GITHUB_REPO: 'mobile-app',
          RELATED_REPOS: 'backend-api,frontend-web,shared-components',
          PROJECT_BOARD_ID: '12345',
          TEAM_MEMBERS: 'alice,bob,charlie,diana',
          plugins: [
            '@elizaos/plugin-github',
            '@elizaos/plugin-todo',
            '@elizaos/plugin-web-search',
            '@elizaos/plugin-planning',
          ],
        },
      },

      verification: {
        rules: [
          {
            id: 'github-api-integration',
            type: 'llm' as const,
            description: 'Successful GitHub API authentication and basic operations',
            config: {
              successCriteria:
                'Agent should demonstrate successful GitHub API authentication and perform basic repository operations like listing repos, issues, or PRs',
              weight: 3,
            },
          },
          {
            id: 'issue-creation-workflow',
            type: 'llm' as const,
            description: 'Complex issue creation with proper metadata',
            config: {
              successCriteria:
                'Agent should create well-structured GitHub issues with appropriate labels, milestones, assignees, and descriptions for the authentication feature',
              weight: 3,
            },
          },
          {
            id: 'cross-repository-coordination',
            type: 'llm' as const,
            description: 'Coordination across multiple repositories',
            config: {
              successCriteria:
                'Agent should demonstrate ability to manage tasks across multiple related repositories (mobile-app, backend-api, frontend-web)',
              weight: 3,
            },
          },
          {
            id: 'todo-integration',
            type: 'llm' as const,
            description: 'Integration with todo management system',
            config: {
              successCriteria:
                'Agent should create and organize todo items that correspond to GitHub issues and track progress across the workflow',
              weight: 2,
            },
          },
          {
            id: 'automated-workflow-setup',
            type: 'llm' as const,
            description: 'Automated workflow and process setup',
            config: {
              successCriteria:
                'Agent should set up automated processes like code review assignments, labeling systems, and status tracking',
              weight: 2,
            },
          },
          {
            id: 'planning-integration',
            type: 'llm' as const,
            description: 'Integration with planning and project management',
            config: {
              successCriteria:
                'Agent should demonstrate integration with planning systems to break down the authentication feature into actionable tasks and timelines',
              weight: 2,
            },
          },
          {
            id: 'status-reporting',
            type: 'llm' as const,
            description: 'Status tracking and progress reporting',
            config: {
              successCriteria:
                'Agent should provide comprehensive status updates and progress summaries across all related GitHub activities',
              weight: 2,
            },
          },
          {
            id: 'error-handling-resilience',
            type: 'llm' as const,
            description: 'Robust error handling for external API calls',
            config: {
              successCriteria:
                'Agent should handle GitHub API rate limits, authentication errors, and network issues gracefully with appropriate fallbacks',
              weight: 2,
            },
          },
          {
            id: 'workflow-orchestration',
            type: 'llm' as const,
            description: 'Complex workflow orchestration across plugins',
            config: {
              successCriteria:
                'Agent should orchestrate complex workflows involving multiple plugins (GitHub, todo, planning, web-search) working together seamlessly',
              weight: 1,
            },
          },
        ],
        groundTruth: {
          expectedBehavior:
            'Agent should demonstrate advanced GitHub workflow automation with cross-plugin integration and real-world complexity management',
          successCriteria: [
            'Authenticate and interact with GitHub API successfully',
            'Create comprehensive issue workflows with proper metadata',
            'Coordinate tasks across multiple repositories',
            'Integrate with todo and planning management systems',
            'Set up automated workflow processes',
            'Provide real-time status tracking and reporting',
            'Handle external API errors and edge cases gracefully',
            'Orchestrate complex multi-plugin workflows efficiently',
          ],
        },
      },
    },
  ],

  init: async (_config, _runtime) => {
    logger.info('🧪 ElizaOS Scenarios Plugin initialized');
    logger.info(`Available scenarios: ${scenariosPlugin.scenarios?.length || 0}`);

    // Log each scenario for debugging
    scenariosPlugin.scenarios?.forEach((scenario) => {
      logger.info(`  📋 ${scenario.name} (${scenario.id})`);
    });
  },
};

export default scenariosPlugin;
