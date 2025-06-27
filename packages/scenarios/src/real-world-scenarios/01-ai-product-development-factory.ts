import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * AI Product Development Factory Scenario
 * 
 * This scenario demonstrates a complete product development lifecycle where an AI agent:
 * 1. Analyzes market requirements and creates product specifications
 * 2. Generates a full-stack web application using autocoder
 * 3. Sets up CI/CD pipeline with automated testing
 * 4. Deploys to production with monitoring
 * 5. Creates comprehensive documentation and marketing materials
 * 6. Uploads all artifacts to cloud storage with public download links
 * 
 * The scenario uses real APIs for GitHub, Vercel, OpenAI, AWS S3, and E2B.
 */

export const aiProductDevelopmentFactoryScenario: Scenario = {
  id: uuidv4() as any,
  name: 'AI Product Development Factory',
  description: 'Complete AI-powered product development from conception to deployment with real API integrations, artifact creation, and public distribution',
  category: 'real-world-production',
  tags: [
    'product-development',
    'full-stack',
    'deployment', 
    'ci-cd',
    'documentation',
    'marketing',
    'artifact-storage',
    'real-apis',
    'e2b',
    'github',
    'vercel',
    'aws',
    's3'
  ],

  actors: [
    {
      id: 'product-development-agent' as any,
      name: 'AI Product Development Agent',
      role: 'subject',
      bio: 'An expert AI software engineer and product manager capable of creating complete applications from conception to production deployment',
      system: `You are an AI Product Development Agent with expertise in full-stack development, product management, and deployment automation. Your mission is to create a complete, production-ready web application with all supporting materials.

## CORE CAPABILITIES
1. **Product Strategy**: Market analysis, requirement gathering, feature specification
2. **Full-Stack Development**: Frontend (React/Next.js), Backend (Node.js/Python), Database design
3. **DevOps & Deployment**: CI/CD pipelines, containerization, cloud deployment
4. **Documentation**: Technical docs, user guides, API documentation
5. **Marketing**: Landing pages, feature descriptions, promotional materials
6. **Quality Assurance**: Testing strategies, performance optimization, security

## DEVELOPMENT WORKFLOW
1. **Requirements Analysis**: Create detailed product specifications and user stories
2. **Architecture Design**: System architecture, database schema, API design
3. **Implementation**: Write complete application code using best practices
4. **Testing**: Unit tests, integration tests, end-to-end testing
5. **Deployment**: Production deployment with monitoring and analytics
6. **Documentation**: Complete technical and user documentation
7. **Marketing**: Create promotional materials and landing pages
8. **Distribution**: Package and upload all artifacts for public access

## AVAILABLE TOOLS & SERVICES
- **Development**: E2B sandbox for secure code execution
- **Code Hosting**: GitHub for version control and CI/CD
- **Deployment**: Vercel for production hosting
- **Storage**: AWS S3 for artifact storage and distribution
- **AI Services**: OpenAI for intelligent code generation and content creation
- **Autocoder**: Advanced code generation and project scaffolding

## PRODUCT REQUIREMENTS
Create a **Task Management & Productivity Dashboard** with these features:
- User authentication and profile management
- Task creation, editing, and organization
- Project collaboration and team management
- Real-time notifications and updates
- Analytics and productivity insights
- Mobile-responsive design
- REST API for third-party integrations

## QUALITY STANDARDS
- Production-ready code with comprehensive error handling
- Responsive design working on all devices
- Complete test coverage (>80%)
- Security best practices implemented
- Performance optimized (<3s load time)
- Accessible design (WCAG 2.1 AA compliance)
- Complete documentation for users and developers

## DELIVERABLES
1. **Working Application**: Deployed and accessible production app
2. **Source Code**: Complete repository with all source files
3. **Documentation**: User guide, developer docs, API reference
4. **Marketing Materials**: Landing page, feature descriptions, screenshots
5. **Deployment Guide**: Step-by-step deployment instructions
6. **Test Reports**: Test coverage and performance analysis
7. **Public Artifacts**: All materials packaged and publicly downloadable

When creating the product, focus on delivering real business value and demonstrating the complete capabilities of modern AI-assisted development workflows.`,
      plugins: [
        '@elizaos/plugin-github',
        '@elizaos/plugin-e2b', 
        '@elizaos/plugin-autocoder',
        '@elizaos/plugin-aws',
        '@elizaos/plugin-tasks',
        '@elizaos/plugin-sql',
      ],
      script: {
        steps: [
          {
            type: 'message',
            content: 'Hello! I am ready to create a complete AI product development workflow. I need access to GitHub, E2B, Vercel, AWS S3, and OpenAI to create a production-ready Task Management Dashboard. Please provide the necessary credentials for this comprehensive development project.',
            description: 'Request credentials from proctor agent',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'action',
            actionName: 'CREATE_SANDBOX',
            actionParams: {
              template: 'fullstack-development',
              timeout: '45 minutes',
              resources: {
                cpu: '4 cores',
                memory: '8GB',
                storage: '20GB',
              },
              tools: ['git', 'node', 'python', 'docker', 'elizaos'],
              metadata: {
                purpose: 'ai-product-development',
                project: 'task-management-dashboard',
                expectedArtifacts: ['source-code', 'documentation', 'deployments'],
              },
            },
            description: 'Create E2B development sandbox with full-stack tools',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'action',
            actionName: 'ANALYZE_MARKET_REQUIREMENTS',
            actionParams: {
              industry: 'productivity-software',
              targetAudience: 'small-to-medium businesses',
              competitorAnalysis: true,
              featurePrioritization: true,
            },
            description: 'Analyze market requirements for task management solutions',
          },
          {
            type: 'wait',
            waitTime: 4000,
          },
          {
            type: 'action',
            actionName: 'GENERATE_PRODUCT_SPECIFICATIONS',
            actionParams: {
              productName: 'TaskFlow Pro',
              productType: 'web-application',
              features: [
                'user-authentication',
                'task-management',
                'team-collaboration', 
                'real-time-updates',
                'analytics-dashboard',
                'mobile-responsive',
                'api-integrations',
              ],
              technicalRequirements: {
                frontend: 'Next.js with TypeScript',
                backend: 'Node.js with Express',
                database: 'PostgreSQL',
                authentication: 'Auth0 or custom JWT',
                deployment: 'Vercel',
                storage: 'AWS S3',
              },
            },
            description: 'Generate detailed product specifications and technical requirements',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'action',
            actionName: 'CREATE_GITHUB_REPOSITORY',
            actionParams: {
              name: 'taskflow-pro',
              description: 'AI-generated Task Management & Productivity Dashboard',
              private: false,
              template: 'fullstack-nextjs',
              topics: ['task-management', 'productivity', 'ai-generated', 'nextjs', 'typescript'],
              license: 'MIT',
            },
            description: 'Create GitHub repository for the project',
          },
          {
            type: 'wait',
            waitTime: 2000,
          },
          {
            type: 'action',
            actionName: 'GENERATE_APPLICATION_CODE',
            actionParams: {
              projectStructure: {
                frontend: 'Next.js 14 with TypeScript',
                backend: 'API routes with Prisma ORM',
                database: 'PostgreSQL schema',
                authentication: 'NextAuth.js',
                styling: 'Tailwind CSS',
                components: 'Radix UI primitives',
              },
              features: [
                'user-registration-login',
                'dashboard-overview',
                'task-crud-operations', 
                'project-management',
                'team-collaboration',
                'real-time-notifications',
                'analytics-reporting',
                'mobile-responsive-design',
                'dark-light-themes',
                'search-and-filtering',
              ],
              codeQuality: {
                typescript: 'strict',
                eslint: 'recommended',
                prettier: 'enabled',
                testing: 'jest-react-testing-library',
                coverage: '>80%',
              },
            },
            description: 'Generate complete application codebase using autocoder',
          },
          {
            type: 'wait',
            waitTime: 15000,
          },
          {
            type: 'action',
            actionName: 'IMPLEMENT_TESTING_SUITE',
            actionParams: {
              testTypes: [
                'unit-tests',
                'integration-tests', 
                'e2e-tests',
                'api-tests',
                'performance-tests',
              ],
              frameworks: ['Jest', 'React Testing Library', 'Playwright', 'Supertest'],
              coverage: {
                statements: 85,
                branches: 80,
                functions: 85,
                lines: 85,
              },
            },
            description: 'Implement comprehensive testing suite',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'action',
            actionName: 'SETUP_CI_CD_PIPELINE',
            actionParams: {
              platform: 'github-actions',
              workflows: [
                'automated-testing',
                'code-quality-checks',
                'security-scanning',
                'performance-testing',
                'automated-deployment',
              ],
              deploymentTargets: {
                staging: 'vercel-preview',
                production: 'vercel-production',
              },
              notifications: {
                slack: false,
                email: true,
              },
            },
            description: 'Set up CI/CD pipeline with GitHub Actions and Vercel',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'action',
            actionName: 'DEPLOY_TO_PRODUCTION',
            actionParams: {
              platform: 'vercel',
              environment: 'production',
              customDomain: false,
              environmentVariables: {
                DATABASE_URL: 'production-postgresql',
                NEXTAUTH_SECRET: 'auto-generated',
                NEXTAUTH_URL: 'auto-from-vercel',
              },
              monitoring: {
                analytics: 'vercel-analytics',
                errors: 'sentry',
                performance: 'web-vitals',
              },
            },
            description: 'Deploy application to Vercel production environment',
          },
          {
            type: 'wait',
            waitTime: 10000,
          },
          {
            type: 'action',
            actionName: 'GENERATE_DOCUMENTATION',
            actionParams: {
              documentTypes: [
                'user-guide',
                'developer-documentation',
                'api-reference',
                'deployment-guide',
                'troubleshooting-guide',
              ],
              format: 'markdown',
              includeScreenshots: true,
              includeCodeExamples: true,
              includeVideoWalkthrough: false,
            },
            description: 'Generate comprehensive project documentation',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'action',
            actionName: 'CREATE_MARKETING_MATERIALS',
            actionParams: {
              materials: [
                'landing-page',
                'feature-overview',
                'screenshots-gallery',
                'demo-video-script',
                'press-release',
                'social-media-content',
              ],
              brandIdentity: {
                colors: ['#3B82F6', '#1E293B', '#F8FAFC'],
                typography: 'Inter, system-ui',
                tone: 'professional, modern, accessible',
              },
            },
            description: 'Create marketing materials and promotional content',
          },
          {
            type: 'wait',
            waitTime: 4000,
          },
          {
            type: 'action',
            actionName: 'PACKAGE_ARTIFACTS',
            actionParams: {
              artifacts: [
                'source-code-repository',
                'deployed-application-url',
                'documentation-site',
                'marketing-materials',
                'test-reports',
                'performance-metrics',
                'deployment-instructions',
              ],
              packaging: {
                format: 'zip',
                includeReadme: true,
                includeLicenses: true,
                includeChangelog: true,
              },
            },
            description: 'Package all artifacts for distribution',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'action',
            actionName: 'UPLOAD_TO_S3',
            actionParams: {
              bucket: 'eliza-scenario-artifacts',
              prefix: 'ai-product-factory/taskflow-pro/',
              artifacts: [
                'complete-source-code.zip',
                'documentation-bundle.zip',
                'marketing-materials.zip',
                'deployment-guide.pdf',
                'test-coverage-report.html',
                'performance-analysis.json',
              ],
              publicAccess: true,
              expirationDays: 30,
              metadata: {
                scenario: 'ai-product-development-factory',
                product: 'taskflow-pro',
                version: '1.0.0',
                created: 'auto-timestamp',
              },
            },
            description: 'Upload all artifacts to AWS S3 with public access',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'message',
            content: `🎉 **AI Product Development Factory - COMPLETED**

**Product**: TaskFlow Pro - Task Management & Productivity Dashboard
**Status**: Successfully deployed and all artifacts created

## 📋 Deliverables Summary:

### 🚀 **Live Application**
- **Production URL**: [Auto-generated Vercel URL]
- **Status**: ✅ Deployed and operational
- **Features**: Full task management, team collaboration, analytics

### 📁 **Source Code** 
- **Repository**: https://github.com/[username]/taskflow-pro
- **Technology**: Next.js 14, TypeScript, PostgreSQL, Tailwind CSS
- **Test Coverage**: 85%+ across all modules

### 📖 **Documentation**
- **User Guide**: Complete step-by-step instructions
- **Developer Docs**: API reference, setup guide, architecture
- **Deployment Guide**: Production deployment instructions

### 🎨 **Marketing Materials**
- **Landing Page**: Professional product showcase
- **Feature Gallery**: Screenshots and feature descriptions
- **Promotional Content**: Social media ready assets

### 📊 **Quality Reports**
- **Test Coverage**: 85%+ statement coverage
- **Performance**: <3s load time, optimized Core Web Vitals
- **Security**: No critical vulnerabilities detected
- **Accessibility**: WCAG 2.1 AA compliant

### 📦 **Public Downloads**
All artifacts are now available for public download:
- **Complete Source Code**: [S3 download link]
- **Documentation Bundle**: [S3 download link] 
- **Marketing Materials**: [S3 download link]
- **Deployment Guide**: [S3 download link]
- **Test Reports**: [S3 download link]

**Total Development Time**: ~30 minutes
**Lines of Code**: ~15,000+ (estimated)
**Files Created**: 200+ (components, pages, tests, docs)

This demonstrates the complete AI-powered product development lifecycle from market analysis to production deployment with real API integrations and public artifact distribution.`,
          },
        ],
      },
    },
    {
      id: 'proctor-agent-supervisor' as any,
      name: 'Proctor Agent',
      role: 'evaluator',
      bio: 'Security and oversight agent managing API credentials and monitoring the development process',
      system: `You are the Proctor Agent supervising this real-world product development scenario. Your responsibilities:

1. **Credential Management**: Provide secure access to GitHub, E2B, Vercel, AWS, and OpenAI APIs
2. **Progress Monitoring**: Track development progress and resource usage
3. **Quality Assurance**: Verify deliverables meet production standards
4. **Cost Management**: Monitor API usage and cloud resource costs
5. **Security Oversight**: Ensure all operations follow security best practices

**Available Credentials for Distribution**:
- GitHub Token (repo creation, CI/CD)
- E2B API Key (sandbox environments)
- Vercel Token (deployment)
- AWS Access Keys (S3 storage)
- OpenAI API Key (AI assistance)

**Security Requirements**:
- All credentials time-limited to scenario duration
- Monitor for unusual usage patterns
- Automatic cleanup of created resources
- Audit logging of all API calls

When the development agent requests credentials, validate the request and provide appropriate access with usage restrictions.`,
      plugins: [
        '@elizaos/plugin-secrets-manager',
        '@elizaos/plugin-plugin-manager',
        '@elizaos/plugin-github',
        '@elizaos/plugin-aws',
        '@elizaos/plugin-tasks',
      ],
      script: {
        steps: [
          {
            type: 'wait',
            waitTime: 2000,
          },
          {
            type: 'message',
            content: `🔐 **Proctor Agent Ready for AI Product Development Factory**

I have validated and prepared secure access to all required services:

**✅ Available Services:**
- **GitHub**: Repository creation, CI/CD, code hosting
- **E2B**: Secure sandbox environments for development
- **Vercel**: Production deployment and hosting
- **AWS S3**: Artifact storage and public distribution
- **OpenAI**: AI-powered code generation and assistance

**🛡️ Security Controls Active:**
- Time-limited credentials (45-minute scenario duration)
- Usage monitoring and cost tracking
- Automatic resource cleanup
- Audit logging for all operations

**📊 Resource Limits:**
- E2B Sandbox: 45 minutes, 8GB RAM, 20GB storage
- GitHub: 100 API calls per hour
- AWS S3: 50MB storage limit
- OpenAI: 50,000 tokens per request

Ready to provide secure credential access for the product development scenario. Please specify which services you need for your development workflow.`,
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'action',
            actionName: 'GRANT_DEVELOPMENT_CREDENTIALS',
            actionParams: {
              agentId: 'product-development-agent',
              services: ['github', 'e2b', 'vercel', 'aws-s3', 'openai'],
              duration: '45 minutes',
              restrictions: {
                github: 'public repos only, max 5 repositories',
                e2b: 'single sandbox, 8GB RAM limit',
                vercel: 'hobby plan deployments only',
                aws: 'S3 read/write, 50MB storage limit',
                openai: 'GPT-4 access, 50k tokens per request',
              },
            },
            description: 'Grant time-limited credentials for product development',
          },
          {
            type: 'wait',
            waitTime: 120000, // Monitor for 2 minutes
          },
          {
            type: 'action',
            actionName: 'MONITOR_DEVELOPMENT_PROGRESS',
            actionParams: {
              checkInterval: '5 minutes',
              metrics: [
                'api-usage-rates',
                'resource-consumption',
                'cost-accumulation',
                'security-violations',
                'progress-milestones',
              ],
            },
            description: 'Monitor development progress and resource usage',
          },
        ],
      },
    },
    {
      id: 'quality-assurance-validator' as any,
      name: 'Quality Assurance Validator',
      role: 'observer',
      bio: 'Independent validator ensuring the developed product meets production quality standards',
      system: `You are a Quality Assurance Validator responsible for verifying that the AI-generated product meets professional production standards.

**Validation Criteria:**

1. **Functionality**: All core features work as specified
2. **Code Quality**: Clean, maintainable, well-documented code
3. **Security**: No critical vulnerabilities, secure coding practices
4. **Performance**: Fast load times, optimized resource usage
5. **Accessibility**: WCAG 2.1 AA compliance
6. **Mobile Responsiveness**: Works on all device sizes
7. **Testing**: Comprehensive test coverage (>80%)
8. **Documentation**: Complete user and developer documentation
9. **Deployment**: Successful production deployment
10. **Artifacts**: All deliverables properly packaged and accessible

**Validation Process:**
- Test the deployed application functionality
- Review source code for quality and security
- Verify documentation completeness and accuracy
- Test mobile responsiveness and accessibility
- Validate artifact downloads and completeness
- Provide detailed quality assessment report

Your role is to ensure the product demonstrates genuine business value and production readiness.`,
      plugins: ['@elizaos/plugin-github', '@elizaos/plugin-aws'],
      script: {
        steps: [
          {
            type: 'wait',
            waitTime: 30000, // Wait for development to progress
          },
          {
            type: 'message',
            content: 'Quality Assurance Validator standing by. I will validate the completed product against production standards including functionality, security, performance, accessibility, and documentation quality. Ready to conduct comprehensive testing once the application is deployed.',
          },
          {
            type: 'wait',
            waitTime: 300000, // Wait 5 minutes for development
          },
          {
            type: 'action',
            actionName: 'VALIDATE_DEPLOYED_APPLICATION',
            actionParams: {
              validationSuite: [
                'functional-testing',
                'security-scanning',
                'performance-analysis',
                'accessibility-audit',
                'mobile-responsiveness',
                'code-quality-review',
              ],
              reportFormat: 'detailed',
            },
            description: 'Validate the deployed application against quality standards',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'group',
    roomName: 'AI Product Development Factory',
    context: 'Real-world product development from conception to deployment with artifact distribution',
    environment: {
      REAL_API_MODE: 'true',
      DEVELOPMENT_MODE: 'production',
      ARTIFACT_STORAGE: 'aws-s3',
      DEPLOYMENT_TARGET: 'vercel',
      QUALITY_GATES: 'enabled',
    },
  },

  execution: {
    maxDuration: 2700000, // 45 minutes for complete development cycle
    maxSteps: 100,
    realApiCallsExpected: true,
    stopConditions: [
      {
        type: 'custom',
        value: 'product_deployed_and_artifacts_uploaded',
        description: 'Stop when product is deployed and all artifacts are publicly available',
      },
      {
        type: 'keyword',
        value: 'AI Product Development Factory - COMPLETED',
        description: 'Stop when development agent declares completion',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: 'product-specification-created' as any,
        type: 'llm' as const,
        description: 'Comprehensive product specifications were created based on market analysis',
        config: {
          successCriteria: 'Detailed product requirements, technical specifications, and feature list were generated',
          priority: 'high',
          category: 'planning',
        },
      },
      {
        id: 'github-repository-created' as any,
        type: 'api-verification' as const,
        description: 'GitHub repository was successfully created with proper structure',
        config: {
          successCriteria: 'Repository created with appropriate name, description, license, and initial structure',
          priority: 'high',
          category: 'infrastructure',
        },
      },
      {
        id: 'application-code-generated' as any,
        type: 'code' as const,
        description: 'Complete application codebase was generated with modern technologies',
        config: {
          successCriteria: 'Full-stack application code generated with Next.js, TypeScript, and all required features',
          priority: 'high',
          category: 'development',
        },
      },
      {
        id: 'testing-suite-implemented' as any,
        type: 'code' as const,
        description: 'Comprehensive testing suite with high coverage was implemented',
        config: {
          successCriteria: 'Unit, integration, and e2e tests implemented with >80% coverage',
          priority: 'high',
          category: 'quality',
        },
      },
      {
        id: 'ci-cd-pipeline-configured' as any,
        type: 'api-verification' as const,
        description: 'CI/CD pipeline was configured for automated testing and deployment',
        config: {
          successCriteria: 'GitHub Actions workflow configured for testing, building, and deployment',
          priority: 'high',
          category: 'automation',
        },
      },
      {
        id: 'production-deployment-successful' as any,
        type: 'api-verification' as const,
        description: 'Application was successfully deployed to production environment',
        config: {
          successCriteria: 'Application deployed to Vercel and accessible via public URL',
          priority: 'high',
          category: 'deployment',
        },
      },
      {
        id: 'documentation-generated' as any,
        type: 'llm' as const,
        description: 'Comprehensive documentation was created for users and developers',
        config: {
          successCriteria: 'Complete user guide, developer documentation, and API reference created',
          priority: 'high',
          category: 'documentation',
        },
      },
      {
        id: 'marketing-materials-created' as any,
        type: 'llm' as const,
        description: 'Professional marketing materials and promotional content were created',
        config: {
          successCriteria: 'Landing page, feature descriptions, and promotional materials created',
          priority: 'medium',
          category: 'marketing',
        },
      },
      {
        id: 'artifacts-packaged-and-uploaded' as any,
        type: 'storage-verification' as const,
        description: 'All project artifacts were packaged and uploaded to public storage',
        config: {
          successCriteria: 'Source code, documentation, and materials uploaded to S3 with public access',
          priority: 'high',
          category: 'distribution',
        },
      },
      {
        id: 'quality-standards-met' as any,
        type: 'llm' as const,
        description: 'Product meets professional quality standards for production use',
        config: {
          successCriteria: 'Application demonstrates production readiness with security, performance, and accessibility',
          priority: 'high',
          category: 'quality',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: 'product-development-agent' as any,
        outcome: 'Successfully created and deployed a complete production-ready application',
        verification: {
          id: 'complete-product-delivery' as any,
          type: 'llm' as const,
          description: 'Complete product development lifecycle from conception to public distribution',
          config: {
            successCriteria: 'Functional application deployed with comprehensive documentation and publicly accessible artifacts',
          },
        },
      },
      {
        actorId: 'proctor-agent-supervisor' as any,
        outcome: 'Successfully managed secure API access and monitored development process',
        verification: {
          id: 'security-oversight-success' as any,
          type: 'api-verification' as const,
          description: 'Secure credential management and oversight throughout development',
          config: {
            successCriteria: 'All credentials managed securely with proper monitoring and resource cleanup',
          },
        },
      },
      {
        actorId: 'quality-assurance-validator' as any,
        outcome: 'Validated product meets production quality standards',
        verification: {
          id: 'quality-validation-passed' as any,
          type: 'llm' as const,
          description: 'Independent validation confirms production readiness',
          config: {
            successCriteria: 'Product passes all quality gates for functionality, security, and performance',
          },
        },
      },
    ],
  },

  benchmarks: {
    maxDuration: 2700000, // 45 minutes
    maxSteps: 100,
    maxTokens: 500000,
    targetAccuracy: 0.9,
    customMetrics: [
      {
        name: 'development_cycle_time',
        target: 1800000, // 30 minutes target
        threshold: 2700000, // 45 minutes maximum
      },
      {
        name: 'test_coverage_percentage',
        target: 85,
        threshold: 80,
      },
      {
        name: 'deployment_success_rate',
        target: 1.0,
        threshold: 0.95,
      },
      {
        name: 'artifact_upload_success_rate',
        target: 1.0,
        threshold: 0.95,
      },
      {
        name: 'api_cost_efficiency',
        target: 25, // Target $25 total cost
        threshold: 50, // Maximum $50 cost
      },
      {
        name: 'code_quality_score',
        target: 0.9,
        threshold: 0.8,
      },
    ],
  },

  expectations: {
    messagePatterns: [
      {
        pattern: 'product.*specifications?.*created',
        flags: 'i',
      },
      {
        pattern: 'repository.*created.*github',
        flags: 'i',
      },
      {
        pattern: 'application.*code.*generated',
        flags: 'i',
      },
      {
        pattern: 'deployed.*production.*vercel',
        flags: 'i',
      },
      {
        pattern: 'artifacts.*uploaded.*s3',
        flags: 'i',
      },
      {
        pattern: 'AI Product Development Factory.*COMPLETED',
        flags: 'i',
      },
    ],
    responseTime: {
      max: 30000, // 30 seconds max response time
    },
    actionCalls: [
      'CREATE_SANDBOX',
      'ANALYZE_MARKET_REQUIREMENTS',
      'GENERATE_PRODUCT_SPECIFICATIONS',
      'CREATE_GITHUB_REPOSITORY',
      'GENERATE_APPLICATION_CODE',
      'IMPLEMENT_TESTING_SUITE',
      'SETUP_CI_CD_PIPELINE',
      'DEPLOY_TO_PRODUCTION',
      'GENERATE_DOCUMENTATION',
      'CREATE_MARKETING_MATERIALS',
      'PACKAGE_ARTIFACTS',
      'UPLOAD_TO_S3',
      'GRANT_DEVELOPMENT_CREDENTIALS',
      'MONITOR_DEVELOPMENT_PROGRESS',
      'VALIDATE_DEPLOYED_APPLICATION',
    ],
  },

  metadata: {
    complexity: 'very-high',
    plugins_required: [
      'github',
      'e2b',
      'autocoder',
      'aws',
      'tasks',
      'sql',
      'secrets-manager',
      'plugin-manager',
    ],
    environment_requirements: [
      'GITHUB_TOKEN',
      'E2B_API_KEY',
      'VERCEL_TOKEN',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'OPENAI_API_KEY',
    ],
    estimated_duration: '30-45 minutes',
    estimated_cost: '$10-25',
    real_api_usage: true,
    artifact_creation: true,
    public_distribution: true,
    success_indicators: [
      'Complete application deployed and accessible',
      'Source code repository created with full implementation',
      'Comprehensive testing suite with high coverage',
      'Production-ready CI/CD pipeline configured',
      'Complete documentation and marketing materials',
      'All artifacts packaged and publicly downloadable',
      'Quality validation passed for production standards',
    ],
    failure_indicators: [
      'Sandbox creation or setup failures',
      'Repository creation issues',
      'Code generation failures',
      'Deployment failures',
      'Testing implementation issues',
      'Documentation generation problems',
      'Artifact upload failures',
      'Quality validation failures',
    ],
  },
};

export default aiProductDevelopmentFactoryScenario;