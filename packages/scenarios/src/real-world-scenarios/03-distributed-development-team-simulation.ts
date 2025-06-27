import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Distributed Development Team Simulation Scenario
 * 
 * This scenario simulates a complete distributed development team working on a real project:
 * 1. Product Manager creates requirements and manages project roadmap
 * 2. Lead Developer coordinates team and performs code reviews
 * 3. Multiple Developer agents work on different features in parallel
 * 4. QA Engineer creates automated tests and reports bugs
 * 5. DevOps Engineer manages CI/CD and deployment infrastructure
 * 6. All agents use real Git workflows, GitHub API, and production tools
 * 7. Complete project delivered with working application and full documentation
 * 
 * This demonstrates realistic team collaboration patterns using actual development tools.
 */

export const distributedDevelopmentTeamSimulationScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Distributed Development Team Simulation',
  description: 'Multi-agent development team collaborating on a real project using production Git workflows, code reviews, CI/CD, and team coordination',
  category: 'real-world-collaboration',
  tags: [
    'team-collaboration',
    'distributed-development',
    'git-workflows',
    'code-review',
    'ci-cd',
    'project-management',
    'quality-assurance',
    'devops',
    'agile-development',
    'real-github',
    'production-tools',
    'multi-agent'
  ],

  actors: [
    {
      id: 'product-manager-agent' as any,
      name: 'Product Manager Agent',
      role: 'assistant',
      bio: 'Experienced product manager responsible for requirements, roadmap planning, and stakeholder communication',
      system: `You are a Product Manager Agent leading a distributed development team. Your responsibilities:

## PRODUCT MANAGEMENT DUTIES
1. **Requirements Gathering**: Define clear, actionable user stories and acceptance criteria
2. **Project Planning**: Create roadmap, prioritize features, manage sprint planning
3. **Stakeholder Communication**: Regular updates, demo coordination, feedback collection
4. **Quality Gates**: Ensure deliverables meet business requirements and user needs
5. **Risk Management**: Identify blockers, dependencies, and mitigation strategies

## PROJECT SPECIFICATION
You are leading development of **"DevCollab Pro"** - A collaboration platform for distributed development teams.

**Core Features to Implement:**
- Real-time code collaboration with live editing
- Integrated video chat and screen sharing
- Project management with task tracking
- Code review workflows with inline comments
- Automated testing and deployment pipelines
- Team analytics and productivity insights

**Success Criteria:**
- Fully functional web application deployed to production
- Complete test coverage (>90%)
- Comprehensive documentation for users and developers
- Scalable architecture supporting 100+ concurrent users
- Sub-3 second load times and 99.9% uptime

## TEAM COORDINATION
- **Daily Standups**: Coordinate team progress and remove blockers
- **Sprint Planning**: Define sprint goals and assign work
- **Code Reviews**: Ensure quality standards and knowledge sharing
- **Demos**: Regular stakeholder demonstrations of progress
- **Retrospectives**: Continuous improvement of team processes

Your leadership ensures the team delivers high-quality software that provides real business value.`,
      plugins: [
        '@elizaos/plugin-github',
        '@elizaos/plugin-tasks',
        '@elizaos/plugin-planning',
        '@elizaos/plugin-slack',
      ],
      script: {
        steps: [
          {
            type: 'message',
            content: 'Hello team! I am the Product Manager for our DevCollab Pro project. I will be creating comprehensive requirements, managing our GitHub repository, and coordinating our development sprint. Let me start by setting up our project infrastructure.',
            description: 'Introduce product management role',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'action',
            actionName: 'CREATE_PROJECT_REPOSITORY',
            actionParams: {
              name: 'devcollab-pro',
              description: 'Real-time collaboration platform for distributed development teams',
              topics: ['collaboration', 'development-tools', 'real-time', 'team-productivity'],
              template: 'fullstack-typescript',
              protection_rules: {
                main_branch: true,
                required_reviews: 2,
                dismiss_stale_reviews: true,
                require_code_owner_reviews: true,
              },
            },
            description: 'Create GitHub repository with branch protection rules',
          },
          {
            type: 'wait',
            waitTime: 2000,
          },
          {
            type: 'action',
            actionName: 'CREATE_PROJECT_REQUIREMENTS',
            actionParams: {
              epic_stories: [
                {
                  title: 'Real-Time Code Collaboration',
                  description: 'Users can collaborate on code in real-time with live cursor tracking',
                  acceptance_criteria: [
                    'Multiple users can edit the same file simultaneously',
                    'Live cursor positions and selections are visible',
                    'Conflict resolution handles simultaneous edits',
                    'Changes are saved automatically with version history',
                  ],
                  priority: 'high',
                  story_points: 13,
                },
                {
                  title: 'Integrated Communication',
                  description: 'Team members can communicate via chat, voice, and video',
                  acceptance_criteria: [
                    'Text chat with code syntax highlighting',
                    'Voice calls with screen sharing capability',
                    'Video conferencing for up to 8 participants',
                    'Integration with code editor for context-aware discussions',
                  ],
                  priority: 'high',
                  story_points: 8,
                },
                {
                  title: 'Project Management Integration',
                  description: 'Built-in project management with GitHub integration',
                  acceptance_criteria: [
                    'Kanban board synced with GitHub issues',
                    'Sprint planning and velocity tracking',
                    'Burndown charts and progress reporting',
                    'Time tracking and productivity analytics',
                  ],
                  priority: 'medium',
                  story_points: 8,
                },
                {
                  title: 'Advanced Code Review',
                  description: 'Enhanced code review experience with AI assistance',
                  acceptance_criteria: [
                    'Inline commenting with suggestion mode',
                    'AI-powered code analysis and recommendations',
                    'Review assignment based on expertise and availability',
                    'Merge conflict prevention and resolution',
                  ],
                  priority: 'medium',
                  story_points: 13,
                },
              ],
              technical_requirements: {
                frontend: 'React 18 with TypeScript',
                backend: 'Node.js with Express and Socket.io',
                database: 'PostgreSQL with Redis for real-time data',
                deployment: 'Docker containers on AWS ECS',
                monitoring: 'DataDog for performance and error tracking',
              },
            },
            description: 'Create detailed user stories and technical requirements',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'action',
            actionName: 'SETUP_GITHUB_ISSUES',
            actionParams: {
              create_issues_from_stories: true,
              labels: ['epic', 'user-story', 'task', 'bug', 'enhancement'],
              milestones: [
                {
                  title: 'Sprint 1 - Core Foundation',
                  description: 'Basic collaboration features and infrastructure',
                  due_date: '2024-02-15',
                },
                {
                  title: 'Sprint 2 - Advanced Features',
                  description: 'Enhanced collaboration and project management',
                  due_date: '2024-03-01',
                },
              ],
              project_board: {
                columns: ['Backlog', 'Sprint Ready', 'In Progress', 'Review', 'Done'],
                automation: true,
              },
            },
            description: 'Set up GitHub issues and project board from requirements',
          },
          {
            type: 'wait',
            waitTime: 2000,
          },
          {
            type: 'message',
            content: '📋 **Project Setup Complete!**\n\n✅ **DevCollab Pro Repository Created**\n- Branch protection rules configured\n- Issue templates and labels set up\n- Project board with automation ready\n\n✅ **Requirements Documented**\n- 4 major epics with detailed acceptance criteria\n- 42 story points planned across 2 sprints\n- Technical architecture defined\n\n**Team**: Ready to assign tasks and begin Sprint 1! All developers can now start working on their assigned features.',
          },
        ],
      },
    },
    {
      id: 'lead-developer-agent' as any,
      name: 'Lead Developer Agent',
      role: 'subject',
      bio: 'Senior software engineer responsible for technical leadership, architecture decisions, and code review coordination',
      system: `You are a Lead Developer Agent responsible for technical leadership and code quality. Your duties:

## TECHNICAL LEADERSHIP
1. **Architecture Design**: Define technical architecture and coding standards
2. **Code Review**: Review all pull requests for quality, security, and best practices
3. **Mentoring**: Guide junior developers and share knowledge
4. **Technical Decisions**: Make technology choices and resolve technical conflicts
5. **Quality Assurance**: Ensure code meets production standards

## CODE REVIEW STANDARDS
- **Security**: No vulnerabilities, proper input validation, secure coding practices
- **Performance**: Efficient algorithms, proper caching, optimized database queries
- **Maintainability**: Clean code, proper documentation, modular design
- **Testing**: Comprehensive test coverage, meaningful test cases
- **Standards**: Consistent coding style, proper error handling, logging

## DEVELOPMENT COORDINATION
- Assign features to team members based on expertise
- Coordinate integration between different components
- Resolve merge conflicts and technical blockers
- Ensure architectural consistency across the codebase
- Manage technical debt and refactoring priorities

## TEAM COLLABORATION
- Conduct daily technical standup meetings
- Review and approve all pull requests
- Provide technical guidance and mentoring
- Coordinate with QA on testing strategies
- Work with DevOps on deployment and infrastructure

Focus on delivering high-quality, scalable code while fostering team collaboration and knowledge sharing.`,
      plugins: [
        '@elizaos/plugin-github',
        '@elizaos/plugin-e2b',
        '@elizaos/plugin-autocoder',
        '@elizaos/plugin-planning',
      ],
      script: {
        steps: [
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: 'Technical Lead here! I see our project requirements are ready. Let me set up the technical foundation and coordinate feature assignments with the development team.',
          },
          {
            type: 'wait',
            waitTime: 2000,
          },
          {
            type: 'action',
            actionName: 'SETUP_PROJECT_ARCHITECTURE',
            actionParams: {
              architecture: {
                frontend: {
                  framework: 'React 18',
                  language: 'TypeScript',
                  state_management: 'Redux Toolkit',
                  ui_library: 'Material-UI',
                  bundler: 'Vite',
                },
                backend: {
                  runtime: 'Node.js',
                  framework: 'Express',
                  language: 'TypeScript',
                  realtime: 'Socket.io',
                  auth: 'JWT with refresh tokens',
                },
                database: {
                  primary: 'PostgreSQL',
                  cache: 'Redis',
                  orm: 'Prisma',
                  migrations: 'Prisma Migrate',
                },
                infrastructure: {
                  containers: 'Docker',
                  orchestration: 'AWS ECS',
                  cdn: 'CloudFront',
                  monitoring: 'DataDog',
                },
              },
              development_setup: {
                package_manager: 'pnpm',
                linting: 'ESLint + Prettier',
                testing: 'Jest + React Testing Library',
                e2e_testing: 'Playwright',
                husky_hooks: true,
              },
            },
            description: 'Define and document technical architecture',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'action',
            actionName: 'CREATE_DEVELOPMENT_BRANCHES',
            actionParams: {
              branch_strategy: 'git-flow',
              branches: [
                'develop',
                'feature/real-time-collaboration',
                'feature/integrated-communication',
                'feature/project-management',
                'feature/code-review-enhancement',
              ],
              protection_rules: {
                develop: {
                  required_reviews: 1,
                  dismiss_stale_reviews: true,
                  require_up_to_date: true,
                },
                main: {
                  required_reviews: 2,
                  require_code_owner_reviews: true,
                  require_status_checks: true,
                },
              },
            },
            description: 'Create feature branches and configure protection rules',
          },
          {
            type: 'wait',
            waitTime: 2000,
          },
          {
            type: 'action',
            actionName: 'ASSIGN_DEVELOPMENT_TASKS',
            actionParams: {
              assignments: [
                {
                  developer: 'frontend-developer-agent',
                  feature: 'real-time-collaboration',
                  tasks: [
                    'Implement collaborative code editor',
                    'Add live cursor tracking',
                    'Build conflict resolution UI',
                  ],
                },
                {
                  developer: 'backend-developer-agent',
                  feature: 'integrated-communication',
                  tasks: [
                    'Build Socket.io real-time infrastructure',
                    'Implement chat and video call APIs',
                    'Create room management system',
                  ],
                },
                {
                  developer: 'fullstack-developer-agent',
                  feature: 'project-management',
                  tasks: [
                    'Build Kanban board component',
                    'Integrate with GitHub Issues API',
                    'Implement analytics dashboard',
                  ],
                },
              ],
            },
            description: 'Assign features to development team members',
          },
          {
            type: 'wait',
            waitTime: 1000,
          },
          {
            type: 'message',
            content: '🏗️ **Technical Foundation Ready!**\n\n**Architecture Defined:**\n- React 18 + TypeScript frontend\n- Node.js + Socket.io backend\n- PostgreSQL + Redis data layer\n- Docker + AWS ECS deployment\n\n**Development Environment:**\n- Feature branches created\n- Branch protection rules configured\n- Development tools and standards set\n\n**Team Assignments:**\n- Real-time collaboration → Frontend Developer\n- Communication features → Backend Developer\n- Project management → Fullstack Developer\n\n**Ready for development!** All team members can now start implementing their assigned features.',
          },
        ],
      },
    },
    {
      id: 'frontend-developer-agent' as any,
      name: 'Frontend Developer Agent',
      role: 'assistant',
      bio: 'Skilled frontend developer specializing in React, TypeScript, and real-time user interfaces',
      system: `You are a Frontend Developer Agent specializing in React and real-time interfaces. Your focus:

## FRONTEND EXPERTISE
1. **React Development**: Modern React patterns, hooks, and performance optimization
2. **TypeScript**: Type-safe development with advanced TypeScript features
3. **Real-Time UI**: WebSocket integration, live updates, collaborative features
4. **State Management**: Redux Toolkit, React Query, and efficient state handling
5. **UI/UX**: Responsive design, accessibility, and user experience optimization

## ASSIGNED FEATURE: Real-Time Code Collaboration
**Tasks:**
- Implement collaborative code editor with Monaco Editor
- Add live cursor tracking and user presence indicators
- Build conflict resolution UI for simultaneous edits
- Create version history and change tracking
- Implement auto-save and offline sync capabilities

## DEVELOPMENT APPROACH
- Write comprehensive unit and integration tests
- Follow React best practices and performance guidelines
- Ensure accessibility compliance (WCAG 2.1 AA)
- Implement proper error handling and loading states
- Use TypeScript for type safety and better developer experience

## COLLABORATION
- Create pull requests with detailed descriptions
- Respond to code review feedback promptly
- Coordinate with backend team on API contracts
- Share progress updates in daily standups
- Document component APIs and usage examples

Focus on creating a smooth, responsive user experience for real-time collaboration.`,
      plugins: [
        '@elizaos/plugin-github',
        '@elizaos/plugin-e2b',
        '@elizaos/plugin-autocoder',
      ],
      script: {
        steps: [
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'message',
            content: 'Frontend Developer ready! I\'ll work on the real-time code collaboration feature. Starting with the collaborative editor implementation.',
          },
          {
            type: 'wait',
            waitTime: 2000,
          },
          {
            type: 'action',
            actionName: 'CREATE_FEATURE_BRANCH',
            actionParams: {
              branch: 'feature/real-time-collaboration',
              base: 'develop',
            },
            description: 'Create feature branch for real-time collaboration',
          },
          {
            type: 'wait',
            waitTime: 1000,
          },
          {
            type: 'action',
            actionName: 'IMPLEMENT_COLLABORATIVE_EDITOR',
            actionParams: {
              editor: 'monaco-editor',
              features: [
                'live-cursor-tracking',
                'real-time-sync',
                'conflict-resolution',
                'version-history',
                'user-presence',
              ],
              websocket_integration: true,
              testing: 'comprehensive',
            },
            description: 'Implement collaborative code editor with real-time features',
          },
          {
            type: 'wait',
            waitTime: 15000,
          },
          {
            type: 'action',
            actionName: 'CREATE_PULL_REQUEST',
            actionParams: {
              title: 'feat: Implement real-time collaborative code editor',
              description: `## Features Implemented
- Monaco Editor integration with collaborative capabilities
- Live cursor tracking and user presence indicators
- Real-time text synchronization using operational transforms
- Conflict resolution UI for simultaneous edits
- Version history with rollback capabilities
- Auto-save and offline sync support

## Testing
- Unit tests for all editor components (95% coverage)
- Integration tests for real-time sync functionality
- E2E tests for multi-user collaboration scenarios

## Screenshots
[Include editor screenshots and demo GIFs]

## Breaking Changes
None

## Checklist
- [x] Code follows project style guidelines
- [x] Self-review completed
- [x] Tests added and passing
- [x] Documentation updated`,
              base: 'develop',
              reviewers: ['lead-developer-agent'],
            },
            description: 'Create pull request for real-time collaboration feature',
          },
        ],
      },
    },
    {
      id: 'backend-developer-agent' as any,
      name: 'Backend Developer Agent',
      role: 'assistant',
      bio: 'Expert backend developer focused on Node.js, real-time systems, and scalable API development',
      system: `You are a Backend Developer Agent specializing in Node.js and real-time systems. Your expertise:

## BACKEND DEVELOPMENT
1. **API Design**: RESTful APIs, GraphQL, and real-time WebSocket endpoints
2. **Database Management**: PostgreSQL optimization, Redis caching, data modeling
3. **Real-Time Systems**: Socket.io, WebRTC, message queues, and event streaming
4. **Security**: Authentication, authorization, input validation, and security best practices
5. **Performance**: Caching strategies, query optimization, and load balancing

## ASSIGNED FEATURE: Integrated Communication
**Tasks:**
- Build Socket.io infrastructure for real-time communication
- Implement chat system with message history and file sharing
- Create video call and screen sharing APIs using WebRTC
- Build room management system for team collaboration
- Implement notification system for mentions and alerts

## TECHNICAL REQUIREMENTS
- Scalable WebSocket architecture supporting 1000+ concurrent connections
- Secure authentication and authorization for all endpoints
- Rate limiting and abuse prevention mechanisms
- Comprehensive API documentation and testing
- Performance monitoring and error handling

## COLLABORATION
- Design API contracts with frontend team
- Coordinate with DevOps on infrastructure requirements
- Provide technical documentation and examples
- Participate in code reviews and technical discussions
- Monitor system performance and optimize bottlenecks

Focus on building robust, scalable backend systems that support seamless real-time collaboration.`,
      plugins: [
        '@elizaos/plugin-github',
        '@elizaos/plugin-e2b',
        '@elizaos/plugin-autocoder',
        '@elizaos/plugin-sql',
      ],
      script: {
        steps: [
          {
            type: 'wait',
            waitTime: 10000,
          },
          {
            type: 'message',
            content: 'Backend Developer here! I\'ll handle the integrated communication features. Starting with the Socket.io infrastructure and real-time messaging system.',
          },
          {
            type: 'wait',
            waitTime: 2000,
          },
          {
            type: 'action',
            actionName: 'CREATE_FEATURE_BRANCH',
            actionParams: {
              branch: 'feature/integrated-communication',
              base: 'develop',
            },
            description: 'Create feature branch for communication features',
          },
          {
            type: 'wait',
            waitTime: 1000,
          },
          {
            type: 'action',
            actionName: 'IMPLEMENT_REALTIME_INFRASTRUCTURE',
            actionParams: {
              websocket_server: 'socket.io',
              features: [
                'room-based-messaging',
                'private-direct-messages',
                'file-sharing-support',
                'video-call-signaling',
                'presence-tracking',
              ],
              scaling: {
                redis_adapter: true,
                load_balancing: true,
                horizontal_scaling: true,
              },
              security: {
                rate_limiting: true,
                message_encryption: true,
                auth_middleware: true,
              },
            },
            description: 'Implement Socket.io infrastructure with scaling and security',
          },
          {
            type: 'wait',
            waitTime: 12000,
          },
          {
            type: 'action',
            actionName: 'BUILD_COMMUNICATION_APIS',
            actionParams: {
              apis: [
                {
                  endpoint: '/api/chat',
                  methods: ['GET', 'POST', 'DELETE'],
                  features: ['message-history', 'search', 'moderation'],
                },
                {
                  endpoint: '/api/rooms',
                  methods: ['GET', 'POST', 'PUT', 'DELETE'],
                  features: ['room-management', 'permissions', 'settings'],
                },
                {
                  endpoint: '/api/calls',
                  methods: ['POST', 'PUT', 'DELETE'],
                  features: ['webrtc-signaling', 'recording', 'analytics'],
                },
              ],
              testing: {
                unit_tests: true,
                integration_tests: true,
                load_tests: true,
                security_tests: true,
              },
            },
            description: 'Build comprehensive communication APIs',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'action',
            actionName: 'CREATE_PULL_REQUEST',
            actionParams: {
              title: 'feat: Implement integrated communication system',
              description: `## Features Implemented
- Socket.io infrastructure with Redis adapter for scaling
- Real-time messaging with room-based and direct message support
- File sharing capabilities with secure upload/download
- WebRTC signaling server for video calls and screen sharing
- User presence tracking and online status indicators
- Comprehensive rate limiting and security measures

## API Endpoints
- \`/api/chat\` - Message management and history
- \`/api/rooms\` - Room creation and management
- \`/api/calls\` - Video call and WebRTC signaling
- \`/api/presence\` - User online status and activity

## Performance
- Supports 1000+ concurrent WebSocket connections
- Redis-based message queuing for reliability
- Horizontal scaling support with load balancer compatibility
- Sub-100ms message delivery latency

## Testing
- Unit tests for all API endpoints (98% coverage)
- Integration tests for WebSocket functionality
- Load tests demonstrating 1000+ concurrent users
- Security tests for authentication and authorization

## Documentation
- Complete API documentation with examples
- WebSocket event documentation
- Deployment and scaling guide`,
              base: 'develop',
              reviewers: ['lead-developer-agent'],
            },
            description: 'Create pull request for communication system',
          },
        ],
      },
    },
    {
      id: 'fullstack-developer-agent' as any,
      name: 'Fullstack Developer Agent',
      role: 'assistant',
      bio: 'Versatile fullstack developer capable of working across the entire technology stack',
      system: `You are a Fullstack Developer Agent with expertise across frontend, backend, and integration. Your capabilities:

## FULLSTACK DEVELOPMENT
1. **Frontend**: React, TypeScript, state management, and responsive design
2. **Backend**: Node.js, APIs, databases, and server-side logic
3. **Integration**: Connecting systems, third-party APIs, and data flow
4. **DevOps**: CI/CD, deployment, monitoring, and infrastructure as code
5. **Database**: Schema design, optimization, and data migrations

## ASSIGNED FEATURE: Project Management Integration
**Tasks:**
- Build Kanban board component with drag-and-drop functionality
- Integrate with GitHub Issues API for issue management
- Implement sprint planning and velocity tracking
- Create analytics dashboard with charts and metrics
- Build time tracking and productivity reporting features

## INTEGRATION REQUIREMENTS
- Bidirectional sync with GitHub Issues and Projects
- Real-time updates across team members
- Data visualization with charts and reporting
- Export capabilities for project reports
- Mobile-responsive design for on-the-go access

## TECHNICAL APPROACH
- Component-based architecture for reusability
- Efficient state management for complex data flows
- Optimistic updates for better user experience
- Comprehensive error handling and data validation
- Performance optimization for large datasets

Focus on creating seamless integration between project management and development workflows.`,
      plugins: [
        '@elizaos/plugin-github',
        '@elizaos/plugin-e2b',
        '@elizaos/plugin-autocoder',
        '@elizaos/plugin-sql',
        '@elizaos/plugin-planning',
      ],
      script: {
        steps: [
          {
            type: 'wait',
            waitTime: 12000,
          },
          {
            type: 'message',
            content: 'Fullstack Developer ready! I\'ll work on the project management integration, including the Kanban board and GitHub integration.',
          },
          {
            type: 'wait',
            waitTime: 2000,
          },
          {
            type: 'action',
            actionName: 'CREATE_FEATURE_BRANCH',
            actionParams: {
              branch: 'feature/project-management',
              base: 'develop',
            },
            description: 'Create feature branch for project management features',
          },
          {
            type: 'wait',
            waitTime: 1000,
          },
          {
            type: 'action',
            actionName: 'IMPLEMENT_PROJECT_MANAGEMENT',
            actionParams: {
              components: [
                {
                  name: 'KanbanBoard',
                  features: ['drag-drop', 'real-time-sync', 'filtering', 'search'],
                },
                {
                  name: 'SprintPlanning',
                  features: ['velocity-tracking', 'burndown-charts', 'capacity-planning'],
                },
                {
                  name: 'AnalyticsDashboard',
                  features: ['team-metrics', 'productivity-insights', 'custom-reports'],
                },
              ],
              github_integration: {
                issues_sync: true,
                labels_sync: true,
                milestones_sync: true,
                assignees_sync: true,
              },
              analytics: {
                time_tracking: true,
                velocity_calculation: true,
                burndown_charts: true,
                team_performance: true,
              },
            },
            description: 'Implement comprehensive project management features',
          },
          {
            type: 'wait',
            waitTime: 18000,
          },
          {
            type: 'action',
            actionName: 'CREATE_PULL_REQUEST',
            actionParams: {
              title: 'feat: Implement project management integration',
              description: `## Features Implemented
- Interactive Kanban board with drag-and-drop functionality
- Bidirectional GitHub Issues integration with real-time sync
- Sprint planning tools with velocity tracking and capacity planning
- Analytics dashboard with team metrics and productivity insights
- Time tracking system with detailed reporting capabilities
- Burndown charts and progress visualization

## Components Added
- \`KanbanBoard\` - Interactive project board with real-time updates
- \`SprintPlanning\` - Comprehensive sprint management tools
- \`AnalyticsDashboard\` - Data visualization and reporting
- \`TimeTracker\` - Individual and team time tracking
- \`VelocityChart\` - Sprint velocity and trend analysis

## GitHub Integration
- Two-way sync with GitHub Issues
- Automatic label and milestone management
- Assignee synchronization and notifications
- Custom field mapping for enhanced project data

## Analytics Features
- Team productivity metrics and trends
- Individual developer performance insights
- Sprint velocity and predictive planning
- Custom report generation and export
- Real-time dashboard updates

## Testing
- Unit tests for all components (94% coverage)
- Integration tests for GitHub API functionality
- E2E tests for complete project management workflows
- Performance tests for large project datasets`,
              base: 'develop',
              reviewers: ['lead-developer-agent'],
            },
            description: 'Create pull request for project management integration',
          },
        ],
      },
    },
    {
      id: 'qa-engineer-agent' as any,
      name: 'QA Engineer Agent',
      role: 'observer',
      bio: 'Quality assurance engineer focused on automated testing, bug detection, and quality standards',
      system: `You are a QA Engineer Agent responsible for ensuring product quality through comprehensive testing. Your focus:

## QUALITY ASSURANCE RESPONSIBILITIES
1. **Test Strategy**: Design comprehensive testing strategies and test plans
2. **Automated Testing**: Create and maintain automated test suites
3. **Bug Detection**: Identify, document, and track defects
4. **Performance Testing**: Load testing and performance validation
5. **Security Testing**: Vulnerability assessment and security compliance

## TESTING APPROACH
- **Unit Testing**: Verify individual component functionality
- **Integration Testing**: Validate component interactions
- **E2E Testing**: Complete user workflow validation
- **Performance Testing**: Load, stress, and scalability testing
- **Security Testing**: Authentication, authorization, and vulnerability scanning
- **Accessibility Testing**: WCAG compliance and usability validation

## QUALITY METRICS
- Test coverage targets (>90% for critical paths)
- Bug detection and resolution time tracking
- Performance benchmarks and SLA compliance
- Security vulnerability assessment scores
- User experience and accessibility compliance ratings

Monitor all development work and ensure quality standards are maintained throughout the project lifecycle.`,
      plugins: [
        '@elizaos/plugin-github',
        '@elizaos/plugin-e2b',
        '@elizaos/plugin-tasks',
      ],
      script: {
        steps: [
          {
            type: 'wait',
            waitTime: 20000,
          },
          {
            type: 'message',
            content: 'QA Engineer monitoring development progress. I\'ll create comprehensive test suites and quality validation as features are completed.',
          },
          {
            type: 'wait',
            waitTime: 60000, // Wait for development to progress
          },
          {
            type: 'action',
            actionName: 'CREATE_COMPREHENSIVE_TEST_SUITE',
            actionParams: {
              test_types: [
                'unit-tests',
                'integration-tests',
                'e2e-tests',
                'performance-tests',
                'security-tests',
                'accessibility-tests',
              ],
              coverage_targets: {
                unit: 95,
                integration: 90,
                e2e: 85,
              },
            },
            description: 'Create comprehensive test suite for all features',
          },
        ],
      },
    },
    {
      id: 'devops-engineer-agent' as any,
      name: 'DevOps Engineer Agent',
      role: 'observer',
      bio: 'DevOps engineer responsible for CI/CD, infrastructure, deployment, and operational excellence',
      system: `You are a DevOps Engineer Agent responsible for infrastructure, deployment, and operational excellence. Your duties:

## DEVOPS RESPONSIBILITIES
1. **CI/CD Pipelines**: Automated build, test, and deployment workflows
2. **Infrastructure**: Cloud infrastructure provisioning and management
3. **Monitoring**: Application and infrastructure monitoring and alerting
4. **Security**: Security scanning, compliance, and best practices
5. **Performance**: Optimization, scaling, and capacity planning

## INFRASTRUCTURE SETUP
- **Containerization**: Docker containers for consistent deployments
- **Orchestration**: AWS ECS for container orchestration
- **CI/CD**: GitHub Actions for automated pipelines
- **Monitoring**: DataDog for performance and error tracking
- **Security**: Automated security scanning and compliance checks

## DEPLOYMENT STRATEGY
- Blue-green deployment for zero-downtime releases
- Automated rollback capabilities
- Environment-specific configurations
- Database migration automation
- Performance and health monitoring

Focus on reliable, scalable, and secure deployment processes that enable rapid development velocity.`,
      plugins: [
        '@elizaos/plugin-github',
        '@elizaos/plugin-aws',
        '@elizaos/plugin-tasks',
      ],
      script: {
        steps: [
          {
            type: 'wait',
            waitTime: 15000,
          },
          {
            type: 'message',
            content: 'DevOps Engineer standing by. I\'ll set up CI/CD pipelines and deployment infrastructure as the codebase develops.',
          },
          {
            type: 'wait',
            waitTime: 120000, // Wait for more development
          },
          {
            type: 'action',
            actionName: 'SETUP_CI_CD_PIPELINE',
            actionParams: {
              platform: 'github-actions',
              stages: ['test', 'build', 'security-scan', 'deploy'],
              environments: ['staging', 'production'],
              monitoring: 'datadog',
            },
            description: 'Set up comprehensive CI/CD pipeline',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'group',
    roomName: 'DevCollab Pro Development Team',
    context: 'Distributed development team collaborating on real project using production tools and workflows',
    environment: {
      REAL_API_MODE: 'true',
      TEAM_COLLABORATION: 'enabled',
      GIT_WORKFLOWS: 'production',
      CODE_REVIEW_REQUIRED: 'true',
      CI_CD_ENABLED: 'true',
    },
  },

  execution: {
    maxDuration: 3600000, // 60 minutes for complete development cycle
    maxSteps: 150,
    realApiCallsExpected: true,
    stopConditions: [
      {
        type: 'custom',
        value: 'all_features_merged_and_deployed',
        description: 'Stop when all features are developed, reviewed, and deployed',
      },
      {
        type: 'keyword',
        value: 'project_deployment_complete',
        description: 'Stop when project is fully deployed and operational',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: 'project-repository-created' as any,
        type: 'api-verification' as const,
        description: 'GitHub repository was created with proper structure and protection rules',
        config: {
          successCriteria: 'Repository created with branch protection, issues, and project board configured',
          priority: 'high',
          category: 'infrastructure',
        },
      },
      {
        id: 'requirements-documented' as any,
        type: 'llm' as const,
        description: 'Comprehensive requirements and user stories were created',
        config: {
          successCriteria: 'Detailed epics, user stories, and acceptance criteria documented in GitHub issues',
          priority: 'high',
          category: 'planning',
        },
      },
      {
        id: 'technical-architecture-defined' as any,
        type: 'llm' as const,
        description: 'Technical architecture and development standards were established',
        config: {
          successCriteria: 'Complete technical architecture documented with coding standards and tooling',
          priority: 'high',
          category: 'architecture',
        },
      },
      {
        id: 'feature-branches-created' as any,
        type: 'api-verification' as const,
        description: 'Feature branches were created for parallel development',
        config: {
          successCriteria: 'Multiple feature branches created with appropriate protection rules',
          priority: 'high',
          category: 'development',
        },
      },
      {
        id: 'real-time-collaboration-implemented' as any,
        type: 'code' as const,
        description: 'Real-time collaboration features were implemented with comprehensive testing',
        config: {
          successCriteria: 'Collaborative editor with live cursors, conflict resolution, and version history',
          priority: 'high',
          category: 'features',
        },
      },
      {
        id: 'communication-system-built' as any,
        type: 'code' as const,
        description: 'Integrated communication system with chat and video capabilities',
        config: {
          successCriteria: 'Socket.io infrastructure with messaging, file sharing, and WebRTC support',
          priority: 'high',
          category: 'features',
        },
      },
      {
        id: 'project-management-integrated' as any,
        type: 'code' as const,
        description: 'Project management features with GitHub integration',
        config: {
          successCriteria: 'Kanban board, sprint planning, and analytics with GitHub Issues sync',
          priority: 'high',
          category: 'features',
        },
      },
      {
        id: 'pull-requests-created' as any,
        type: 'api-verification' as const,
        description: 'Pull requests were created for all feature implementations',
        config: {
          successCriteria: 'Multiple pull requests with detailed descriptions and proper review assignments',
          priority: 'high',
          category: 'collaboration',
        },
      },
      {
        id: 'code-reviews-conducted' as any,
        type: 'llm' as const,
        description: 'Code reviews were conducted following quality standards',
        config: {
          successCriteria: 'Lead developer reviewed all pull requests with constructive feedback',
          priority: 'high',
          category: 'quality',
        },
      },
      {
        id: 'comprehensive-testing-implemented' as any,
        type: 'code' as const,
        description: 'Comprehensive testing suite with high coverage',
        config: {
          successCriteria: 'Unit, integration, and E2E tests with >90% coverage',
          priority: 'high',
          category: 'quality',
        },
      },
      {
        id: 'ci-cd-pipeline-configured' as any,
        type: 'api-verification' as const,
        description: 'CI/CD pipeline was configured for automated deployment',
        config: {
          successCriteria: 'GitHub Actions workflow with testing, security scanning, and deployment',
          priority: 'high',
          category: 'automation',
        },
      },
      {
        id: 'team-collaboration-demonstrated' as any,
        type: 'llm' as const,
        description: 'Effective team collaboration and coordination was demonstrated',
        config: {
          successCriteria: 'Multiple agents coordinated effectively using real development workflows',
          priority: 'high',
          category: 'collaboration',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: 'product-manager-agent' as any,
        outcome: 'Successfully managed project requirements and team coordination',
        verification: {
          id: 'product-management-success' as any,
          type: 'llm' as const,
          description: 'Product management provided clear requirements and effective team coordination',
          config: {
            successCriteria: 'Requirements documented, project tracked, and team coordinated effectively',
          },
        },
      },
      {
        actorId: 'lead-developer-agent' as any,
        outcome: 'Provided technical leadership and ensured code quality',
        verification: {
          id: 'technical-leadership-success' as any,
          type: 'llm' as const,
          description: 'Technical leadership guided architecture and maintained code quality',
          config: {
            successCriteria: 'Architecture defined, code reviews conducted, and quality standards maintained',
          },
        },
      },
      {
        actorId: 'frontend-developer-agent' as any,
        outcome: 'Successfully implemented real-time collaboration features',
        verification: {
          id: 'frontend-development-success' as any,
          type: 'code' as const,
          description: 'Frontend developer delivered functional real-time collaboration features',
          config: {
            successCriteria: 'Collaborative editor with live features and comprehensive testing',
          },
        },
      },
      {
        actorId: 'backend-developer-agent' as any,
        outcome: 'Built scalable communication infrastructure',
        verification: {
          id: 'backend-development-success' as any,
          type: 'code' as const,
          description: 'Backend developer created robust communication system',
          config: {
            successCriteria: 'Socket.io infrastructure with messaging, video, and scaling capabilities',
          },
        },
      },
      {
        actorId: 'fullstack-developer-agent' as any,
        outcome: 'Delivered integrated project management features',
        verification: {
          id: 'fullstack-development-success' as any,
          type: 'code' as const,
          description: 'Fullstack developer integrated project management with GitHub',
          config: {
            successCriteria: 'Kanban board, GitHub integration, and analytics dashboard',
          },
        },
      },
    ],
  },

  benchmarks: {
    maxDuration: 3600000, // 60 minutes
    maxSteps: 150,
    maxTokens: 800000,
    targetAccuracy: 0.9,
    customMetrics: [
      {
        name: 'team_collaboration_efficiency',
        target: 0.9,
        threshold: 0.8,
      },
      {
        name: 'pull_request_review_time',
        target: 300000, // 5 minutes
        threshold: 600000, // 10 minutes max
      },
      {
        name: 'feature_implementation_success_rate',
        target: 1.0,
        threshold: 0.85,
      },
      {
        name: 'code_quality_score',
        target: 0.95,
        threshold: 0.85,
      },
      {
        name: 'test_coverage_percentage',
        target: 95,
        threshold: 85,
      },
      {
        name: 'deployment_success_rate',
        target: 1.0,
        threshold: 0.95,
      },
    ],
  },

  expectations: {
    messagePatterns: [
      {
        pattern: 'project.*repository.*created',
        flags: 'i',
      },
      {
        pattern: 'requirements.*documented|user.*stories',
        flags: 'i',
      },
      {
        pattern: 'feature.*branch.*created',
        flags: 'i',
      },
      {
        pattern: 'pull.*request.*created',
        flags: 'i',
      },
      {
        pattern: 'code.*review|technical.*feedback',
        flags: 'i',
      },
      {
        pattern: 'deployment.*complete|project.*operational',
        flags: 'i',
      },
    ],
    responseTime: {
      max: 30000, // 30 seconds max response time
    },
    actionCalls: [
      'CREATE_PROJECT_REPOSITORY',
      'CREATE_PROJECT_REQUIREMENTS',
      'SETUP_GITHUB_ISSUES',
      'SETUP_PROJECT_ARCHITECTURE',
      'CREATE_DEVELOPMENT_BRANCHES',
      'ASSIGN_DEVELOPMENT_TASKS',
      'CREATE_FEATURE_BRANCH',
      'IMPLEMENT_COLLABORATIVE_EDITOR',
      'IMPLEMENT_REALTIME_INFRASTRUCTURE',
      'BUILD_COMMUNICATION_APIS',
      'IMPLEMENT_PROJECT_MANAGEMENT',
      'CREATE_PULL_REQUEST',
      'CREATE_COMPREHENSIVE_TEST_SUITE',
      'SETUP_CI_CD_PIPELINE',
    ],
  },

  metadata: {
    complexity: 'very-high',
    plugins_required: [
      'github',
      'e2b',
      'autocoder',
      'sql',
      'planning',
      'tasks',
      'aws',
      'slack',
    ],
    environment_requirements: [
      'GITHUB_TOKEN',
      'E2B_API_KEY',
      'DATABASE_URL',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
    ],
    estimated_duration: '45-60 minutes',
    estimated_cost: '$15-30',
    real_api_usage: true,
    team_collaboration: true,
    git_workflows: true,
    success_indicators: [
      'Project repository created with proper structure',
      'Comprehensive requirements and user stories documented',
      'Technical architecture and development standards defined',
      'Multiple feature branches with parallel development',
      'Real-time collaboration features implemented',
      'Communication system with chat and video capabilities',
      'Project management integration with GitHub',
      'Pull requests created with proper review process',
      'Comprehensive testing suite with high coverage',
      'CI/CD pipeline configured and operational',
      'Effective team collaboration demonstrated',
    ],
    failure_indicators: [
      'Repository creation or setup failures',
      'Requirements documentation incomplete',
      'Architecture definition issues',
      'Feature implementation failures',
      'Pull request creation problems',
      'Code review process breakdowns',
      'Testing implementation issues',
      'CI/CD pipeline configuration failures',
      'Team coordination breakdowns',
    ],
  },
};

export default distributedDevelopmentTeamSimulationScenario;