import type { Scenario } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Intelligent Task Automation Hub Scenario
 * 
 * This scenario demonstrates comprehensive task automation capabilities where an AI agent:
 * 1. Creates scheduled cron jobs for automated reporting and data processing
 * 2. Sets up real webhooks for GitHub, Slack, and Discord event handling
 * 3. Implements trigger-based workflows that respond to file uploads and events
 * 4. Creates monitoring and alerting systems with real-time dashboards
 * 5. Integrates multiple services for end-to-end automation
 * 6. Generates usage analytics and optimization recommendations
 * 
 * The scenario uses real APIs for GitHub, Slack, Discord, AWS Lambda, and various webhook services.
 */

export const intelligentTaskAutomationHubScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Intelligent Task Automation Hub',
  description: 'Comprehensive task automation system with cron jobs, webhooks, triggers, and real-time monitoring using production APIs',
  category: 'real-world-automation',
  tags: [
    'task-automation',
    'cron-jobs',
    'webhooks',
    'event-triggers',
    'monitoring',
    'real-time',
    'github-integration',
    'slack-integration',
    'discord-integration',
    'aws-lambda',
    'serverless',
    'alerting',
    'analytics',
    'workflow-automation'
  ],

  actors: [
    {
      id: 'automation-orchestrator-agent' as any,
      name: 'Automation Orchestrator Agent',
      role: 'subject',
      bio: 'An expert automation engineer specializing in creating intelligent task automation systems with real-time monitoring and event-driven workflows',
      system: `You are an Automation Orchestrator Agent with deep expertise in task automation, webhook management, and event-driven architectures. Your mission is to create a comprehensive automation hub that handles scheduled tasks, real-time events, and intelligent workflows.

## CORE AUTOMATION CAPABILITIES
1. **Cron Job Management**: Create, schedule, and monitor recurring tasks
2. **Webhook Integration**: Set up real-time event listeners for multiple platforms
3. **Event-Driven Workflows**: Build trigger-based automation chains
4. **Real-Time Monitoring**: Implement dashboards and alerting systems
5. **Cross-Platform Integration**: Connect GitHub, Slack, Discord, AWS, and more
6. **Analytics & Optimization**: Track performance and suggest improvements

## AUTOMATION REQUIREMENTS
Create a **Multi-Service Automation Hub** with these components:

### 📅 **Scheduled Tasks (Cron Jobs)**
- Daily report generation and distribution
- Weekly repository analytics and health checks
- Monthly performance and cost analysis
- Automated backup and cleanup operations
- Security scanning and compliance checks

### 🔗 **Webhook Integrations**
- GitHub: PR creation, issue updates, release notifications
- Slack: Message reactions, channel mentions, file uploads
- Discord: Server events, role changes, message moderation
- AWS: S3 uploads, Lambda completions, CloudWatch alerts

### ⚡ **Event-Driven Workflows**
- File upload → Processing → Notification chain
- Code commit → Testing → Deployment → Notification
- Issue creation → Assignment → Status tracking → Resolution
- Performance alert → Investigation → Auto-remediation → Report

### 📊 **Monitoring & Analytics**
- Real-time dashboard with live metrics
- Performance tracking and SLA monitoring
- Cost analysis and resource optimization
- Error detection and automatic alerting
- Usage patterns and trend analysis

## TECHNICAL ARCHITECTURE
- **Serverless Functions**: AWS Lambda for event processing
- **Task Scheduler**: GitHub Actions for cron jobs
- **Message Queues**: AWS SQS for reliable event handling
- **Database**: PostgreSQL for state and analytics storage
- **Monitoring**: CloudWatch and custom dashboards
- **Notifications**: Multi-channel (Slack, Discord, Email)

## DELIVERABLES
1. **Active Cron Jobs**: Scheduled tasks running and generating reports
2. **Functional Webhooks**: Real-time event handlers responding to platform events
3. **Working Workflows**: End-to-end automation chains processing events
4. **Live Dashboard**: Real-time monitoring with metrics and alerts
5. **Analytics System**: Usage tracking and performance optimization
6. **Documentation**: Complete setup guides and troubleshooting docs
7. **Health Monitoring**: Automated system health checks and alerts

## QUALITY STANDARDS
- All automations must be production-ready and fault-tolerant
- Implement proper error handling and retry mechanisms
- Ensure secure credential management and access control
- Provide comprehensive logging and audit trails
- Maintain high availability (>99.5% uptime)
- Optimize for cost efficiency and performance

Focus on creating real business value through intelligent automation that reduces manual effort and improves operational efficiency.`,
      plugins: [
        '@elizaos/plugin-tasks',
        '@elizaos/plugin-github',
        '@elizaos/plugin-slack', 
        '@elizaos/plugin-discord',
        '@elizaos/plugin-aws',
        '@elizaos/plugin-sql',
        '@elizaos/plugin-secrets-manager',
      ],
      script: {
        steps: [
          {
            type: 'message',
            content: 'Hello! I am ready to create a comprehensive task automation hub with real cron jobs, webhooks, and event-driven workflows. I need access to GitHub, Slack, Discord, AWS, and database services to build a production-ready automation system. Please provide the necessary credentials for this automation infrastructure project.',
            description: 'Request credentials from proctor agent',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'action',
            actionName: 'INITIALIZE_AUTOMATION_INFRASTRUCTURE',
            actionParams: {
              components: [
                'task-scheduler',
                'webhook-manager',
                'event-processor',
                'monitoring-system',
                'analytics-engine',
              ],
              platforms: ['github', 'slack', 'discord', 'aws'],
              database: 'postgresql',
              monitoring: 'cloudwatch',
            },
            description: 'Initialize automation infrastructure components',
          },
          {
            type: 'wait',
            waitTime: 4000,
          },
          {
            type: 'action',
            actionName: 'CREATE_CRON_JOB_SCHEDULER',
            actionParams: {
              scheduler: 'github-actions',
              jobs: [
                {
                  name: 'daily-repository-report',
                  schedule: '0 9 * * *', // 9 AM daily
                  action: 'generate-repo-analytics',
                  targets: ['slack-general', 'discord-dev-channel'],
                },
                {
                  name: 'weekly-health-check',
                  schedule: '0 10 * * 1', // 10 AM Mondays
                  action: 'system-health-analysis',
                  targets: ['slack-ops', 'email-alerts'],
                },
                {
                  name: 'monthly-cost-analysis',
                  schedule: '0 8 1 * *', // 8 AM first of month
                  action: 'cost-optimization-report',
                  targets: ['slack-finance', 'email-management'],
                },
                {
                  name: 'security-scan',
                  schedule: '0 2 * * *', // 2 AM daily
                  action: 'security-vulnerability-scan',
                  targets: ['slack-security', 'discord-alerts'],
                },
              ],
            },
            description: 'Create scheduled cron jobs for automated reporting',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'action',
            actionName: 'SETUP_GITHUB_WEBHOOKS',
            actionParams: {
              repository: 'automation-hub-demo',
              webhooks: [
                {
                  event: 'pull_request',
                  action: 'opened',
                  handler: 'notify-reviewers',
                  targets: ['slack-dev-team', 'discord-code-review'],
                },
                {
                  event: 'issues',
                  action: 'opened',
                  handler: 'auto-assign-and-label',
                  targets: ['slack-support', 'project-management'],
                },
                {
                  event: 'release',
                  action: 'published',
                  handler: 'deployment-notification',
                  targets: ['slack-announcements', 'discord-releases'],
                },
                {
                  event: 'push',
                  action: 'main-branch',
                  handler: 'trigger-ci-cd',
                  targets: ['slack-deployments', 'monitoring-dashboard'],
                },
              ],
              endpoint: 'aws-lambda-webhook-processor',
            },
            description: 'Set up GitHub webhooks for real-time event handling',
          },
          {
            type: 'wait',
            waitTime: 4000,
          },
          {
            type: 'action',
            actionName: 'CONFIGURE_SLACK_WEBHOOKS',
            actionParams: {
              workspace: 'automation-hub-workspace',
              webhooks: [
                {
                  event: 'message',
                  trigger: 'mention @automation-bot',
                  handler: 'process-automation-request',
                  response: 'interactive-workflow',
                },
                {
                  event: 'file_shared',
                  trigger: 'channel #data-uploads',
                  handler: 'process-uploaded-file',
                  workflow: 'file-analysis-pipeline',
                },
                {
                  event: 'reaction_added',
                  trigger: 'emoji :rocket:',
                  handler: 'trigger-deployment',
                  confirmation: 'required',
                },
                {
                  event: 'channel_created',
                  handler: 'setup-channel-automation',
                  actions: ['welcome-message', 'configure-integrations'],
                },
              ],
            },
            description: 'Configure Slack webhooks for team collaboration automation',
          },
          {
            type: 'wait',
            waitTime: 4000,
          },
          {
            type: 'action',
            actionName: 'SETUP_DISCORD_WEBHOOKS',
            actionParams: {
              server: 'automation-hub-server',
              webhooks: [
                {
                  event: 'message',
                  trigger: 'command !deploy',
                  handler: 'deployment-automation',
                  permissions: 'role:developer',
                },
                {
                  event: 'member_join',
                  handler: 'onboarding-automation',
                  actions: ['assign-roles', 'send-welcome', 'setup-channels'],
                },
                {
                  event: 'voice_state_update',
                  trigger: 'join #standup-room',
                  handler: 'record-standup-attendance',
                  analytics: 'team-engagement',
                },
                {
                  event: 'message_delete',
                  handler: 'moderation-logging',
                  targets: ['admin-logs', 'audit-trail'],
                },
              ],
            },
            description: 'Set up Discord webhooks for community and team management',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'action',
            actionName: 'CREATE_EVENT_DRIVEN_WORKFLOWS',
            actionParams: {
              workflows: [
                {
                  name: 'file-processing-pipeline',
                  trigger: 's3-upload',
                  steps: [
                    'validate-file-format',
                    'extract-metadata',
                    'process-content',
                    'generate-summary',
                    'notify-stakeholders',
                    'update-database',
                  ],
                  error_handling: 'retry-with-backoff',
                  notifications: ['slack-data-team', 'email-processor'],
                },
                {
                  name: 'code-quality-pipeline',
                  trigger: 'github-pr-opened',
                  steps: [
                    'run-automated-tests',
                    'security-scan',
                    'performance-analysis',
                    'code-review-assignment',
                    'quality-gate-check',
                  ],
                  success_actions: ['slack-approval-notification'],
                  failure_actions: ['block-merge', 'notify-author'],
                },
                {
                  name: 'incident-response-workflow',
                  trigger: 'monitoring-alert',
                  steps: [
                    'assess-severity',
                    'notify-on-call-team',
                    'create-incident-ticket',
                    'escalate-if-critical',
                    'track-resolution-time',
                  ],
                  escalation: 'manager-notification',
                  sla: '15-minutes',
                },
                {
                  name: 'deployment-automation',
                  trigger: 'approval-received',
                  steps: [
                    'backup-current-version',
                    'deploy-to-staging',
                    'run-smoke-tests',
                    'deploy-to-production',
                    'verify-deployment',
                    'update-status-page',
                  ],
                  rollback_on_failure: true,
                  notifications: ['slack-ops', 'discord-deployments'],
                },
              ],
            },
            description: 'Create sophisticated event-driven automation workflows',
          },
          {
            type: 'wait',
            waitTime: 6000,
          },
          {
            type: 'action',
            actionName: 'DEPLOY_SERVERLESS_FUNCTIONS',
            actionParams: {
              platform: 'aws-lambda',
              functions: [
                {
                  name: 'webhook-processor',
                  runtime: 'nodejs18',
                  memory: '512MB',
                  timeout: '30s',
                  handler: 'process-incoming-webhooks',
                  environment: {
                    DATABASE_URL: 'postgresql-connection',
                    SLACK_TOKEN: 'encrypted',
                    DISCORD_TOKEN: 'encrypted',
                  },
                },
                {
                  name: 'cron-job-executor',
                  runtime: 'python3.9',
                  memory: '1GB',
                  timeout: '300s',
                  handler: 'execute-scheduled-tasks',
                  schedule: 'event-bridge-rules',
                },
                {
                  name: 'analytics-processor',
                  runtime: 'nodejs18',
                  memory: '2GB',
                  timeout: '900s',
                  handler: 'process-analytics-data',
                  triggers: ['s3-events', 'sqs-messages'],
                },
                {
                  name: 'alert-manager',
                  runtime: 'python3.9',
                  memory: '256MB',
                  timeout: '60s',
                  handler: 'manage-alerts-and-notifications',
                  integrations: ['cloudwatch', 'sns', 'slack'],
                },
              ],
            },
            description: 'Deploy serverless functions for automation processing',
          },
          {
            type: 'wait',
            waitTime: 8000,
          },
          {
            type: 'action',
            actionName: 'CREATE_MONITORING_DASHBOARD',
            actionParams: {
              platform: 'aws-cloudwatch',
              dashboards: [
                {
                  name: 'automation-hub-overview',
                  widgets: [
                    'active-cron-jobs-count',
                    'webhook-success-rate',
                    'workflow-execution-times',
                    'error-rate-by-service',
                    'cost-per-automation',
                    'sla-compliance-metrics',
                  ],
                  refresh_interval: '1-minute',
                  alerts: ['error-threshold', 'cost-threshold'],
                },
                {
                  name: 'performance-analytics',
                  widgets: [
                    'throughput-metrics',
                    'latency-percentiles',
                    'resource-utilization',
                    'concurrent-executions',
                  ],
                  timeframe: '24-hours',
                },
                {
                  name: 'business-metrics',
                  widgets: [
                    'automation-success-rate',
                    'manual-tasks-eliminated',
                    'time-savings-achieved',
                    'roi-calculations',
                  ],
                  reporting: 'weekly-summary',
                },
              ],
              alerting: {
                channels: ['slack-ops', 'email-alerts', 'discord-alerts'],
                thresholds: {
                  error_rate: '5%',
                  response_time: '10s',
                  cost_increase: '20%',
                },
              },
            },
            description: 'Create comprehensive monitoring dashboards with real-time metrics',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'action',
            actionName: 'IMPLEMENT_ANALYTICS_SYSTEM',
            actionParams: {
              analytics: [
                {
                  type: 'usage-tracking',
                  metrics: [
                    'automation-executions-per-day',
                    'most-triggered-workflows',
                    'peak-usage-hours',
                    'service-utilization-patterns',
                  ],
                  storage: 'postgresql-timeseries',
                },
                {
                  type: 'performance-analysis',
                  metrics: [
                    'average-execution-time-by-workflow',
                    'success-failure-ratios',
                    'bottleneck-identification',
                    'resource-consumption-trends',
                  ],
                  optimization: 'auto-recommendations',
                },
                {
                  type: 'cost-analysis',
                  metrics: [
                    'cost-per-automation-type',
                    'roi-by-workflow',
                    'resource-cost-optimization',
                    'budget-variance-tracking',
                  ],
                  reporting: 'monthly-executive-summary',
                },
                {
                  type: 'business-intelligence',
                  metrics: [
                    'manual-effort-reduction',
                    'error-prevention-savings',
                    'team-productivity-gains',
                    'sla-improvement-metrics',
                  ],
                  visualization: 'executive-dashboards',
                },
              ],
            },
            description: 'Implement comprehensive analytics and business intelligence system',
          },
          {
            type: 'wait',
            waitTime: 4000,
          },
          {
            type: 'action',
            actionName: 'GENERATE_OPTIMIZATION_RECOMMENDATIONS',
            actionParams: {
              analysis_period: '7-days',
              optimization_areas: [
                'workflow-efficiency',
                'cost-reduction',
                'error-rate-improvement',
                'resource-utilization',
                'sla-compliance',
              ],
              recommendation_types: [
                'immediate-actions',
                'short-term-improvements',
                'long-term-strategic-changes',
              ],
              output_format: 'actionable-report',
            },
            description: 'Generate AI-powered optimization recommendations',
          },
          {
            type: 'wait',
            waitTime: 3000,
          },
          {
            type: 'action',
            actionName: 'TEST_ALL_AUTOMATIONS',
            actionParams: {
              test_suite: [
                'cron-job-execution-test',
                'webhook-response-test',
                'workflow-end-to-end-test',
                'error-handling-test',
                'performance-load-test',
                'security-penetration-test',
              ],
              test_data: 'realistic-production-scenarios',
              validation: 'comprehensive',
            },
            description: 'Execute comprehensive testing of all automation systems',
          },
          {
            type: 'wait',
            waitTime: 5000,
          },
          {
            type: 'message',
            content: `🤖 **Intelligent Task Automation Hub - DEPLOYMENT COMPLETE**

**Status**: All automation systems are now operational and monitoring real events

## 🎯 **Automation Systems Active:**

### ⏰ **Scheduled Tasks (Cron Jobs)**
- ✅ **Daily Repository Reports**: 9 AM daily → Slack #general, Discord #dev
- ✅ **Weekly Health Checks**: 10 AM Mondays → Slack #ops, Email alerts
- ✅ **Monthly Cost Analysis**: 8 AM monthly → Slack #finance, Management
- ✅ **Security Scans**: 2 AM daily → Slack #security, Discord #alerts

### 🔗 **Real-Time Webhooks**
- ✅ **GitHub**: PR/Issue/Release events → Multi-channel notifications
- ✅ **Slack**: @mentions, file uploads, reactions → Automated responses
- ✅ **Discord**: Commands, member events, voice → Smart automation
- ✅ **AWS**: S3 uploads, Lambda events → Processing workflows

### ⚡ **Event-Driven Workflows**
- ✅ **File Processing Pipeline**: Upload → Process → Notify → Store
- ✅ **Code Quality Pipeline**: PR → Test → Scan → Review → Gate
- ✅ **Incident Response**: Alert → Assess → Notify → Escalate → Track
- ✅ **Deployment Automation**: Approve → Deploy → Test → Verify → Update

### 📊 **Live Monitoring & Analytics**
- ✅ **Real-Time Dashboard**: CloudWatch with 1-minute refresh
- ✅ **Performance Metrics**: Throughput, latency, error rates
- ✅ **Business Intelligence**: ROI, productivity gains, cost analysis
- ✅ **Intelligent Alerts**: Multi-channel with smart escalation

## 🚀 **Serverless Infrastructure**
- **4 Lambda Functions**: Webhook processor, cron executor, analytics, alerts
- **Auto-Scaling**: Handles 1000+ concurrent requests
- **High Availability**: 99.9% uptime with automatic failover
- **Cost Optimized**: Pay-per-use with intelligent resource scaling

## 📈 **Current Performance**
- **Automation Success Rate**: 99.5%
- **Average Response Time**: <2 seconds
- **Cost Efficiency**: $0.10 per 1000 automations
- **Manual Effort Reduction**: 85% for routine tasks

## 🎉 **Business Impact**
- **Time Savings**: 20+ hours/week of manual work eliminated
- **Error Reduction**: 95% fewer human errors in routine tasks
- **Team Productivity**: 30% increase in development velocity
- **Cost Savings**: $5,000/month in operational efficiency

## 🔧 **Available Commands**
- \`!deploy [service]\` - Trigger deployment workflows
- \`@automation-bot help\` - Get automation assistance
- \`!status\` - Check system health and metrics
- \`!optimize\` - Get performance recommendations

**All systems are now self-monitoring and will automatically optimize based on usage patterns. The automation hub is ready to handle production workloads with intelligent scaling and proactive maintenance.**`,
          },
        ],
      },
    },
    {
      id: 'infrastructure-monitor-agent' as any,
      name: 'Infrastructure Monitor Agent',
      role: 'observer',
      bio: 'Specialized agent responsible for monitoring automation infrastructure health, performance, and cost optimization',
      system: `You are an Infrastructure Monitor Agent responsible for overseeing the automation hub's operational health. Your responsibilities:

**MONITORING AREAS:**
1. **System Health**: Monitor all automation components for availability and performance
2. **Performance Metrics**: Track execution times, success rates, and resource utilization
3. **Cost Analysis**: Monitor spending and identify optimization opportunities
4. **Security Compliance**: Ensure all automations follow security best practices
5. **SLA Monitoring**: Track service level agreement compliance

**ALERTING CRITERIA:**
- Error rate exceeds 5%
- Response time exceeds 10 seconds
- Cost increases beyond 20% threshold
- Security violations detected
- SLA breaches identified

**OPTIMIZATION RECOMMENDATIONS:**
- Resource scaling suggestions
- Cost reduction opportunities
- Performance improvement areas
- Security enhancement recommendations

Monitor all automation systems and provide real-time feedback on operational status.`,
      plugins: [
        '@elizaos/plugin-aws',
        '@elizaos/plugin-tasks',
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
            content: 'Infrastructure Monitor Agent activated. Monitoring automation hub deployment and will provide real-time health and performance updates throughout the scenario.',
          },
          {
            type: 'wait',
            waitTime: 60000, // Monitor for 1 minute
          },
          {
            type: 'action',
            actionName: 'MONITOR_SYSTEM_HEALTH',
            actionParams: {
              components: ['cron-jobs', 'webhooks', 'workflows', 'serverless-functions'],
              metrics: ['availability', 'performance', 'cost', 'security'],
              alerting: true,
            },
            description: 'Monitor system health and generate status report',
          },
        ],
      },
    },
  ],

  setup: {
    roomType: 'group',
    roomName: 'Automation Hub Command Center',
    context: 'Real-world task automation with cron jobs, webhooks, and event-driven workflows',
    environment: {
      REAL_API_MODE: 'true',
      AUTOMATION_MODE: 'production',
      MONITORING: 'enabled',
      ANALYTICS: 'enabled',
      COST_TRACKING: 'enabled',
    },
  },

  execution: {
    maxDuration: 1800000, // 30 minutes for complete automation setup
    maxSteps: 80,
    realApiCallsExpected: true,
    stopConditions: [
      {
        type: 'custom',
        value: 'automation_hub_operational',
        description: 'Stop when all automation systems are deployed and operational',
      },
      {
        type: 'keyword',
        value: 'DEPLOYMENT COMPLETE',
        description: 'Stop when orchestrator declares deployment completion',
      },
    ],
  },

  verification: {
    rules: [
      {
        id: 'cron-jobs-created' as any,
        type: 'api-verification' as const,
        description: 'Scheduled cron jobs were successfully created and are executing',
        config: {
          successCriteria: 'Multiple cron jobs created with proper schedules and targeting configured',
          priority: 'high',
          category: 'scheduling',
        },
      },
      {
        id: 'github-webhooks-configured' as any,
        type: 'api-verification' as const,
        description: 'GitHub webhooks were configured and are responding to events',
        config: {
          successCriteria: 'Webhooks configured for PR, issue, release, and push events with proper handlers',
          priority: 'high',
          category: 'integration',
        },
      },
      {
        id: 'slack-webhooks-configured' as any,
        type: 'api-verification' as const,
        description: 'Slack webhooks were configured for team collaboration automation',
        config: {
          successCriteria: 'Slack webhooks configured for messages, file uploads, reactions, and channel events',
          priority: 'high',
          category: 'integration',
        },
      },
      {
        id: 'discord-webhooks-configured' as any,
        type: 'api-verification' as const,
        description: 'Discord webhooks were configured for community management',
        config: {
          successCriteria: 'Discord webhooks configured for commands, member events, and moderation',
          priority: 'high',
          category: 'integration',
        },
      },
      {
        id: 'event-workflows-created' as any,
        type: 'llm' as const,
        description: 'Complex event-driven workflows were implemented with proper error handling',
        config: {
          successCriteria: 'Multi-step workflows created for file processing, code quality, incident response, and deployment',
          priority: 'high',
          category: 'automation',
        },
      },
      {
        id: 'serverless-functions-deployed' as any,
        type: 'api-verification' as const,
        description: 'Serverless functions were deployed to handle automation processing',
        config: {
          successCriteria: 'Lambda functions deployed for webhook processing, cron execution, analytics, and alerting',
          priority: 'high',
          category: 'infrastructure',
        },
      },
      {
        id: 'monitoring-dashboard-active' as any,
        type: 'api-verification' as const,
        description: 'Real-time monitoring dashboard was created with comprehensive metrics',
        config: {
          successCriteria: 'CloudWatch dashboards with automation metrics, alerts, and business intelligence',
          priority: 'high',
          category: 'monitoring',
        },
      },
      {
        id: 'analytics-system-operational' as any,
        type: 'llm' as const,
        description: 'Analytics system is tracking usage, performance, and business metrics',
        config: {
          successCriteria: 'Comprehensive analytics tracking automation usage, performance, cost, and business impact',
          priority: 'medium',
          category: 'analytics',
        },
      },
      {
        id: 'optimization-recommendations-generated' as any,
        type: 'llm' as const,
        description: 'AI-powered optimization recommendations were generated',
        config: {
          successCriteria: 'Actionable recommendations provided for efficiency, cost, and performance improvements',
          priority: 'medium',
          category: 'optimization',
        },
      },
      {
        id: 'automation-testing-completed' as any,
        type: 'llm' as const,
        description: 'Comprehensive testing was performed on all automation systems',
        config: {
          successCriteria: 'All automation components tested for functionality, performance, and security',
          priority: 'high',
          category: 'quality',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: 'automation-orchestrator-agent' as any,
        outcome: 'Successfully deployed comprehensive automation hub with real-time capabilities',
        verification: {
          id: 'automation-hub-success' as any,
          type: 'api-verification' as const,
          description: 'Complete automation infrastructure operational with monitoring and analytics',
          config: {
            successCriteria: 'All automation systems deployed, tested, and operational with real-time monitoring',
          },
        },
      },
      {
        actorId: 'infrastructure-monitor-agent' as any,
        outcome: 'Confirmed operational health and performance of automation systems',
        verification: {
          id: 'monitoring-validation' as any,
          type: 'llm' as const,
          description: 'Infrastructure monitoring confirms system health and performance',
          config: {
            successCriteria: 'Monitoring systems active with healthy metrics and performance indicators',
          },
        },
      },
    ],
  },

  benchmarks: {
    maxDuration: 1800000, // 30 minutes
    maxSteps: 80,
    maxTokens: 300000,
    targetAccuracy: 0.95,
    customMetrics: [
      {
        name: 'automation_deployment_time',
        target: 1200000, // 20 minutes target
        threshold: 1800000, // 30 minutes maximum
      },
      {
        name: 'webhook_success_rate',
        target: 0.98,
        threshold: 0.95,
      },
      {
        name: 'cron_job_success_rate',
        target: 1.0,
        threshold: 0.95,
      },
      {
        name: 'workflow_execution_success_rate',
        target: 0.95,
        threshold: 0.90,
      },
      {
        name: 'monitoring_system_coverage',
        target: 1.0,
        threshold: 0.90,
      },
      {
        name: 'cost_efficiency_score',
        target: 0.9,
        threshold: 0.8,
      },
    ],
  },

  expectations: {
    messagePatterns: [
      {
        pattern: 'cron.*jobs?.*created',
        flags: 'i',
      },
      {
        pattern: 'webhook.*configured.*github|slack|discord',
        flags: 'i',
      },
      {
        pattern: 'workflow.*event.*driven',
        flags: 'i',
      },
      {
        pattern: 'serverless.*functions?.*deployed',
        flags: 'i',
      },
      {
        pattern: 'monitoring.*dashboard.*active',
        flags: 'i',
      },
      {
        pattern: 'DEPLOYMENT COMPLETE',
        flags: 'i',
      },
    ],
    responseTime: {
      max: 20000, // 20 seconds max response time
    },
    actionCalls: [
      'INITIALIZE_AUTOMATION_INFRASTRUCTURE',
      'CREATE_CRON_JOB_SCHEDULER',
      'SETUP_GITHUB_WEBHOOKS',
      'CONFIGURE_SLACK_WEBHOOKS',
      'SETUP_DISCORD_WEBHOOKS',
      'CREATE_EVENT_DRIVEN_WORKFLOWS',
      'DEPLOY_SERVERLESS_FUNCTIONS',
      'CREATE_MONITORING_DASHBOARD',
      'IMPLEMENT_ANALYTICS_SYSTEM',
      'GENERATE_OPTIMIZATION_RECOMMENDATIONS',
      'TEST_ALL_AUTOMATIONS',
      'MONITOR_SYSTEM_HEALTH',
    ],
  },

  metadata: {
    complexity: 'very-high',
    plugins_required: [
      'tasks',
      'github',
      'slack',
      'discord',
      'aws',
      'sql',
      'secrets-manager',
    ],
    environment_requirements: [
      'GITHUB_TOKEN',
      'SLACK_BOT_TOKEN',
      'DISCORD_BOT_TOKEN',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'DATABASE_URL',
    ],
    estimated_duration: '20-30 minutes',
    estimated_cost: '$5-15',
    real_api_usage: true,
    automation_creation: true,
    real_time_monitoring: true,
    success_indicators: [
      'Multiple cron jobs executing on schedule',
      'Webhooks responding to real platform events',
      'Event-driven workflows processing triggers',
      'Serverless functions handling automation logic',
      'Real-time monitoring dashboard operational',
      'Analytics system tracking business metrics',
      'Optimization recommendations generated',
      'Comprehensive testing validated all systems',
    ],
    failure_indicators: [
      'Cron job creation or scheduling failures',
      'Webhook configuration issues',
      'Workflow execution failures',
      'Serverless deployment problems',
      'Monitoring system setup issues',
      'Analytics implementation failures',
      'Testing failures or incomplete coverage',
    ],
  },
};

export default intelligentTaskAutomationHubScenario;