import type { Scenario, ScenarioActor } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Scenario Proctor Agent - A privileged agent that manages API keys and credentials
 * for real-world scenario testing. This agent has access to all production API keys
 * and securely distributes them to testee agents during scenario execution.
 */

export interface ProctorCredentials {
  // Core AI Services
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  
  // Development & Code Hosting
  GITHUB_TOKEN?: string;
  E2B_API_KEY?: string;
  VERCEL_TOKEN?: string;
  NETLIFY_TOKEN?: string;
  
  // Cloud Storage & Infrastructure
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_S3_BUCKET?: string;
  AWS_REGION?: string;
  
  // Communication Platforms
  DISCORD_BOT_TOKEN?: string;
  SLACK_BOT_TOKEN?: string;
  TELEGRAM_BOT_TOKEN?: string;
  
  // Monitoring & Analytics
  DATADOG_API_KEY?: string;
  MIXPANEL_TOKEN?: string;
  
  // Additional Services
  STRIPE_API_KEY?: string;
  SENDGRID_API_KEY?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
}

export interface CredentialRequest {
  agentId: string;
  scenarioId: string;
  servicesRequested: string[];
  purpose: string;
  estimatedUsage?: {
    apiCalls?: number;
    duration?: number;
    costEstimate?: number;
  };
}

export interface CredentialGrant {
  requestId: string;
  agentId: string;
  credentials: Partial<ProctorCredentials>;
  expiresAt: number;
  usageRestrictions: {
    maxApiCalls?: number;
    allowedEndpoints?: string[];
    rateLimitPerMinute?: number;
  };
}

export const proctorAgentActor: ScenarioActor = {
  id: 'scenario-proctor-agent' as any,
  name: 'Scenario Proctor Agent',
  role: 'evaluator',
  bio: 'A privileged security agent responsible for managing API credentials and monitoring scenario execution in real-world testing environments',
  system: `You are the Scenario Proctor Agent, a highly privileged security agent responsible for managing real API credentials during scenario testing. Your core responsibilities:

## CREDENTIAL MANAGEMENT
1. **Secure Storage**: All production API keys are stored securely in your secrets manager
2. **Dynamic Distribution**: Provide credentials to testee agents on-demand based on scenario requirements
3. **Access Control**: Enforce least-privilege access - only provide credentials that agents actually need
4. **Time-based Expiration**: All credential grants have time limits and automatic expiration
5. **Usage Monitoring**: Track API usage, costs, and rate limits for all distributed credentials

## SECURITY PROTOCOLS
1. **Audit Logging**: Maintain detailed logs of all credential requests and grants
2. **Anomaly Detection**: Monitor for unusual usage patterns or security violations
3. **Automatic Revocation**: Immediately revoke credentials if misuse is detected
4. **Rate Limiting**: Enforce API rate limits to prevent abuse or unexpected costs
5. **Sandboxing**: Ensure all code execution happens in secure, isolated environments

## SCENARIO COORDINATION
1. **Environment Setup**: Initialize test environments with required services and configurations
2. **Agent Orchestration**: Coordinate between multiple agents in complex scenarios
3. **Resource Management**: Track and clean up created resources (files, repositories, deployments)
4. **Progress Monitoring**: Oversee scenario execution and intervene if issues arise
5. **Results Validation**: Verify that scenarios achieve their intended outcomes

## AVAILABLE SERVICES
You have access to credentials for these services:
- **AI Models**: OpenAI (GPT-4, embeddings), Anthropic (Claude)
- **Development**: GitHub (repos, issues, PRs), E2B (sandboxes), Vercel/Netlify (deployments)
- **Storage**: AWS S3 (file storage), AWS Lambda (serverless functions)
- **Communication**: Discord, Slack, Telegram (bots and webhooks)
- **Monitoring**: DataDog (metrics), Mixpanel (analytics)
- **Payments**: Stripe (payment processing)
- **Notifications**: SendGrid (email), Twilio (SMS)

## CREDENTIAL REQUEST PROTOCOL
When agents request credentials:
1. Validate the agent's identity and scenario context
2. Review the requested services and justify the need
3. Estimate usage and potential costs
4. Grant minimal necessary permissions with time limits
5. Provide clear usage guidelines and restrictions
6. Monitor usage throughout the scenario

## EMERGENCY PROCEDURES
1. **Cost Overrun**: Immediately revoke credentials if costs exceed thresholds
2. **Security Breach**: Revoke all credentials and alert security team
3. **Rate Limit Violation**: Temporarily suspend access and investigate
4. **Scenario Failure**: Clean up resources and prepare detailed incident report

## COMMUNICATION STYLE
- Professional and security-focused
- Provide clear explanations of security decisions
- Helpful but cautious when granting access
- Detailed logging and reporting
- Proactive monitoring and alerts

When testee agents request credentials, always:
1. Ask for specific justification of the services needed
2. Provide credentials with appropriate restrictions
3. Set clear expiration times
4. Monitor usage throughout the scenario
5. Clean up and revoke access when complete

Your goal is to enable comprehensive real-world testing while maintaining the highest security standards and preventing any misuse of production credentials.`,
  plugins: [
    '@elizaos/plugin-secrets-manager',
    '@elizaos/plugin-plugin-manager', 
    '@elizaos/plugin-tasks',
    '@elizaos/plugin-sql',
    '@elizaos/plugin-github',
    '@elizaos/plugin-aws',
  ],
  settings: {
    securityLevel: 'maximum',
    auditLogging: true,
    costMonitoring: true,
    automaticCleanup: true,
    credentialRotation: 'daily',
  },
  script: {
    steps: [
      {
        type: 'action',
        actionName: 'INITIALIZE_PROCTOR_ENVIRONMENT',
        actionParams: {
          securityMode: 'strict',
          auditingEnabled: true,
          costThresholds: {
            perScenario: 50, // $50 per scenario
            perAgent: 20,   // $20 per agent
            perHour: 10,    // $10 per hour
          },
          rateLimits: {
            openai: 1000,   // 1000 requests per hour
            github: 5000,   // 5000 requests per hour
            aws: 500,       // 500 requests per hour
          },
        },
        description: 'Initialize secure proctor environment with monitoring and limits',
      },
      {
        type: 'action',
        actionName: 'LOAD_PRODUCTION_CREDENTIALS',
        actionParams: {
          source: 'secrets-manager',
          validateAll: true,
          testConnections: true,
        },
        description: 'Load and validate all production API credentials',
      },
      {
        type: 'action',
        actionName: 'CREATE_SECURE_WORKSPACE',
        actionParams: {
          workspaceId: 'real-world-scenarios',
          isolationLevel: 'high',
          networkRestrictions: true,
          resourceLimits: {
            memory: '4GB',
            storage: '50GB', 
            networkBandwidth: '1Gbps',
          },
        },
        description: 'Create secure workspace for scenario execution',
      },
      {
        type: 'message',
        content: `🔐 Scenario Proctor Agent initialized and ready for real-world testing.

**Security Status**: All production credentials loaded and validated
**Monitoring**: Active cost tracking and usage monitoring enabled  
**Environment**: Secure workspace created with resource isolation
**Available Services**: OpenAI, GitHub, AWS, Discord, Slack, and more

I am ready to securely manage credentials for comprehensive scenario testing. 
Testee agents may now request access to specific services with proper justification.

**Usage Guidelines**:
- All credential requests require scenario context and justification
- Credentials are time-limited and automatically revoked after scenario completion
- Usage is monitored in real-time with automatic cost and rate limit enforcement
- Any security violations result in immediate credential revocation

Ready to begin real-world scenario execution with full security oversight.`,
      },
    ],
  },
};

export const proctorAgentScenario: Scenario = {
  id: uuidv4() as any,
  name: 'Scenario Proctor Agent Initialization',
  description: 'Initialize the privileged proctor agent responsible for managing real API credentials during scenario testing',
  category: 'security-infrastructure',
  tags: ['proctor', 'security', 'credentials', 'real-world', 'infrastructure'],
  
  actors: [proctorAgentActor],
  
  setup: {
    roomType: 'dm',
    roomName: 'Proctor Agent Control Room',
    context: 'Secure environment for credential management and scenario oversight',
    environment: {
      SECURITY_MODE: 'strict',
      AUDIT_LOGGING: 'enabled',
      COST_MONITORING: 'enabled',
      REAL_API_MODE: 'true',
    },
  },
  
  execution: {
    maxDuration: 60000, // 1 minute for initialization
    maxSteps: 10,
    realApiCallsExpected: true,
    stopConditions: [
      {
        type: 'custom',
        value: 'proctor_agent_ready',
        description: 'Stop when proctor agent is fully initialized and ready',
      },
    ],
  },
  
  verification: {
    rules: [
      {
        id: 'proctor-initialization' as any,
        type: 'api-verification' as const,
        description: 'Proctor agent successfully initialized with all required credentials',
        config: {
          successCriteria: 'Proctor environment initialized, credentials loaded, and monitoring systems active',
          priority: 'high',
          category: 'initialization',
        },
      },
      {
        id: 'credential-validation' as any,
        type: 'api-verification' as const,
        description: 'All production API credentials validated and accessible',
        config: {
          successCriteria: 'All required API credentials successfully validated with test connections',
          priority: 'high',
          category: 'security',
        },
      },
      {
        id: 'security-controls' as any,
        type: 'llm' as const,
        description: 'Security controls and monitoring systems are active',
        config: {
          successCriteria: 'Cost monitoring, rate limiting, audit logging, and automatic cleanup systems are operational',
          priority: 'high',
          category: 'security',
        },
      },
      {
        id: 'workspace-isolation' as any,
        type: 'llm' as const,
        description: 'Secure workspace created with proper isolation',
        config: {
          successCriteria: 'Isolated workspace created with resource limits and network restrictions',
          priority: 'medium',
          category: 'infrastructure',
        },
      },
    ],
    expectedOutcomes: [
      {
        actorId: 'scenario-proctor-agent' as any,
        outcome: 'Proctor agent ready to manage real-world scenario testing',
        verification: {
          id: 'proctor-readiness' as any,
          type: 'api-verification' as const,
          description: 'Proctor agent fully operational and ready for scenario management',
          config: {
            successCriteria: 'Proctor agent initialized with all security controls, monitoring systems, and credential management capabilities active',
          },
        },
      },
    ],
  },
  
  benchmarks: {
    maxDuration: 60000, // 1 minute
    maxSteps: 10,
    targetAccuracy: 1.0, // Must be 100% successful
    customMetrics: [
      {
        name: 'credential_validation_success_rate',
        target: 1.0,
        threshold: 0.95,
      },
      {
        name: 'security_controls_activation_time',
        target: 30000, // 30 seconds
        threshold: 60000, // 60 seconds max
      },
      {
        name: 'workspace_creation_time',
        target: 15000, // 15 seconds
        threshold: 30000, // 30 seconds max
      },
    ],
  },
  
  metadata: {
    complexity: 'high',
    plugins_required: ['secrets-manager', 'plugin-manager', 'tasks', 'sql', 'github', 'aws'],
    environment_requirements: [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY', 
      'GITHUB_TOKEN',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'E2B_API_KEY',
    ],
    estimated_duration: '1 minute',
    security_level: 'maximum',
    real_api_usage: true,
    success_indicators: [
      'All credentials successfully loaded and validated',
      'Security monitoring systems activated',
      'Secure workspace created with proper isolation',
      'Proctor agent ready to manage scenario execution',
    ],
    failure_indicators: [
      'Credential validation failures',
      'Security system initialization failures', 
      'Workspace creation issues',
      'Monitoring system failures',
    ],
  },
};

export default proctorAgentScenario;