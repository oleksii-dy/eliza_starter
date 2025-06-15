import { z } from 'zod';

// SPARC Phase Types
export const SPARCPhase = z.enum([
  'Research',
  'Specification', 
  'Pseudocode',
  'Architecture',
  'Refinement',
  'Completion'
]);

export type SPARCPhase = z.infer<typeof SPARCPhase>;

// GitHub Integration Types
export const GitHubIssue = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.enum(['open', 'closed']),
  html_url: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  labels: z.array(z.object({
    name: z.string(),
    color: z.string()
  })),
  assignees: z.array(z.object({
    login: z.string(),
    id: z.number()
  }))
});

export type GitHubIssue = z.infer<typeof GitHubIssue>;

export const GitHubPullRequest = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.enum(['open', 'closed', 'merged']),
  html_url: z.string(),
  head: z.object({
    ref: z.string(),
    sha: z.string()
  }),
  base: z.object({
    ref: z.string(),
    sha: z.string()
  }),
  created_at: z.string(),
  updated_at: z.string(),
  changed_files: z.number().optional()
});

export type GitHubPullRequest = z.infer<typeof GitHubPullRequest>;

// SPARC Specification Types
export const SPARCSpecification = z.object({
  title: z.string(),
  issueNumber: z.number().optional(),
  phase: SPARCPhase,
  problemStatement: z.string(),
  userStory: z.string(),
  businessValue: z.string(),
  pseudocode: z.string().optional(),
  architecture: z.object({
    components: z.array(z.string()),
    dataFlow: z.string(),
    apiContracts: z.string(),
    schemaChanges: z.string()
  }).optional(),
  implementationSteps: z.array(z.object({
    name: z.string(),
    description: z.string(),
    testType: z.enum(['unit', 'integration', 'e2e']).default('unit'),
    estimatedHours: z.number().default(4),
    dependencies: z.array(z.string()).default([])
  })),
  acceptanceCriteria: z.array(z.string()),
  performanceTargets: z.array(z.string()).optional(),
  securityConsiderations: z.array(z.string()).optional(),
  openQuestions: z.array(z.string()).default([]),
  riskAssessment: z.array(z.string()).default([])
});

export type SPARCSpecification = z.infer<typeof SPARCSpecification>;

// TDD Cycle Types
export const TDDCycleResult = z.object({
  step: z.string(),
  phase: z.enum(['red', 'green', 'refactor']),
  testCase: z.string(),
  implementation: z.string(),
  coverage: z.number().min(0).max(100),
  qualityScore: z.number().min(0).max(100),
  duration: z.number().min(0), // milliseconds
  success: z.boolean()
});

export type TDDCycleResult = z.infer<typeof TDDCycleResult>;

// Quality Gate Types
export const QualityGateResult = z.object({
  name: z.string(),
  phase: SPARCPhase,
  score: z.number().min(0).max(1),
  threshold: z.number().min(0).max(1),
  passed: z.boolean(),
  details: z.string(),
  blocking: z.boolean().default(false)
});

export type QualityGateResult = z.infer<typeof QualityGateResult>;

// Agent Task Types
export const AgentTask = z.object({
  id: z.string(),
  agentType: z.enum(['architect', 'tdd', 'security', 'devops', 'documentation', 'code', 'review']),
  task: z.string(),
  input: z.any(),
  dependencies: z.array(z.string()).default([]),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']).default('pending'),
  result: z.any().optional(),
  startTime: z.number().optional(),
  endTime: z.number().optional()
});

export type AgentTask = z.infer<typeof AgentTask>;

// Coordination State Types
export const CoordinationState = z.object({
  agentAssignments: z.map(z.string(), AgentTask),
  memoryBank: z.object({
    calibrationValues: z.map(z.string(), z.any()),
    testFailures: z.map(z.string(), z.any()),
    dependencies: z.map(z.string(), z.any()),
    progressTracker: z.map(z.string(), z.any())
  }),
  currentPhase: SPARCPhase,
  activeProject: z.string().optional()
});

export type CoordinationState = z.infer<typeof CoordinationState>;

// Development Workflow Types
export const WorkflowDefinition = z.object({
  name: z.string(),
  description: z.string(),
  phases: z.array(z.object({
    phase: SPARCPhase,
    tasks: z.array(AgentTask),
    qualityGates: z.array(QualityGateResult)
  })),
  parallel: z.boolean().default(false),
  timeout: z.number().default(3600000) // 1 hour default
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinition>;

// Feature Capture Types
export const FeatureCaptureRequest = z.object({
  description: z.string().min(10).max(1000),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  type: z.enum(['feature', 'bug', 'enhancement', 'refactor']).default('feature'),
  labels: z.array(z.string()).default([]),
  assignees: z.array(z.string()).default([])
});

export type FeatureCaptureRequest = z.infer<typeof FeatureCaptureRequest>;

// Implementation Result Types
export const ImplementationResult = z.object({
  pullRequest: GitHubPullRequest,
  implementation: z.array(TDDCycleResult),
  sparcPhase: SPARCPhase,
  qualityGates: z.array(QualityGateResult),
  coverage: z.number().min(0).max(100),
  nextAction: z.string()
});

export type ImplementationResult = z.infer<typeof ImplementationResult>;

// Review Result Types
export const ReviewResult = z.object({
  overallScore: z.number().min(0).max(1),
  sparcCompliance: z.boolean(),
  categories: z.object({
    security: QualityGateResult,
    testQuality: QualityGateResult,
    architecture: QualityGateResult,
    performance: QualityGateResult
  }),
  criticalIssues: z.array(z.string()),
  suggestions: z.array(z.string()),
  autoFixedIssues: z.array(z.string()),
  readyToMerge: z.boolean(),
  blockers: z.array(z.string())
});

export type ReviewResult = z.infer<typeof ReviewResult>;

// Command Input Types
export const CaptureFeatureInput = z.object({
  description: z.string(),
  options: FeatureCaptureRequest.partial().optional()
});

export const ImplementFeatureInput = z.object({
  issueUrl: z.string().url()
});

export const ReviewPRInput = z.object({
  prUrl: z.string().url()
});

export const EvalPromptInput = z.object({
  promptId: z.string()
});

export const ShipReportInput = z.object({
  days: z.number().min(1).max(90).default(7)
});

export type CaptureFeatureInput = z.infer<typeof CaptureFeatureInput>;
export type ImplementFeatureInput = z.infer<typeof ImplementFeatureInput>;
export type ReviewPRInput = z.infer<typeof ReviewPRInput>;
export type EvalPromptInput = z.infer<typeof EvalPromptInput>;
export type ShipReportInput = z.infer<typeof ShipReportInput>;

// Configuration Types
export const ElizaDevConfig = z.object({
  github: z.object({
    token: z.string(),
    owner: z.string(),
    repo: z.string(),
    webhookSecret: z.string().optional()
  }),
  sparc: z.object({
    defaultCoverage: z.number().min(0).max(100).default(95),
    qualityThreshold: z.number().min(0).max(1).default(0.9),
    maxRetries: z.number().min(1).max(10).default(3)
  }),
  agents: z.object({
    maxConcurrent: z.number().min(1).max(20).default(5),
    timeout: z.number().min(1000).max(600000).default(300000) // 5 minutes
  })
});

export type ElizaDevConfig = z.infer<typeof ElizaDevConfig>;