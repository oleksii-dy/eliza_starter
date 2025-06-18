import type { 
  IAgentRuntime, 
  Memory, 
  UUID, 
  Character, 
  Content 
} from '@elizaos/core';

export interface ScenarioActor {
  id: string;
  name: string;
  role: 'tester' | 'subject' | 'participant';
  character?: Character;
  systemPrompt?: string;
  script?: ScenarioScript;
  runtime?: IAgentRuntime;
}

export interface ScenarioScript {
  steps: ScriptStep[];
  personality?: string;
  goals?: string[];
  triggers?: ScriptTrigger[];
}

export interface ScriptStep {
  id?: string;
  type: 'message' | 'wait' | 'react' | 'assert' | 'action';
  content?: string;
  waitTime?: number;
  reaction?: string;
  assertion?: Assertion;
  actionName?: string;
  actionParams?: Record<string, any>;
  trigger?: string;
  condition?: string;
}

export interface ScriptTrigger {
  on: 'message_received' | 'keyword' | 'timer' | 'custom';
  condition: string;
  response: ScriptStep[];
}

export interface Assertion {
  type: 'contains' | 'regex' | 'count' | 'timing' | 'custom';
  value: any;
  description: string;
}

export interface ScenarioSetup {
  roomType?: 'group' | 'dm' | 'public';
  roomName?: string;
  context?: string;
  initialMessages?: Message[];
  environment?: Record<string, any>;
}

export interface ScenarioExecution {
  maxDuration?: number;
  maxSteps?: number;
  timeout?: number;
  stopConditions?: StopCondition[];
}

export interface StopCondition {
  type: 'message_count' | 'time_elapsed' | 'keyword' | 'custom';
  value: any;
  description: string;
}

export interface ScenarioVerification {
  rules: VerificationRule[];
  expectedOutcomes?: ExpectedOutcome[];
  groundTruth?: GroundTruth;
}

export interface VerificationRule {
  id: string;
  type: 'llm' | 'regex' | 'contains' | 'count' | 'timing' | 'custom' | 'action_taken' | 'response_quality';
  description: string;
  config: VerificationConfig;
  weight?: number;
}

export interface VerificationConfig {
  criteria?: string;
  pattern?: string;
  expectedValue?: any;
  threshold?: number;
  llmPrompt?: string;
  customFunction?: string;
}

export interface ExpectedOutcome {
  actorId: string;
  outcome: string;
  verification: VerificationRule;
}

export interface GroundTruth {
  correctAnswer?: any;
  expectedBehavior?: string;
  successCriteria?: string[];
}

export interface BenchmarkCriteria {
  maxDuration?: number;
  maxSteps?: number;
  maxTokens?: number;
  maxMemoryUsage?: number;
  targetAccuracy?: number;
  customMetrics?: string[];
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  actors: ScenarioActor[];
  setup: ScenarioSetup;
  execution: ScenarioExecution;
  verification: ScenarioVerification;
  benchmarks: BenchmarkCriteria;
  metadata?: Record<string, any>;
}

export interface ScenarioResult {
  scenarioId: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  passed: boolean;
  score?: number;
  metrics: ScenarioMetrics;
  verificationResults: VerificationResult[];
  transcript: ScenarioMessage[];
  errors?: string[];
  warnings?: string[];
}

export interface ScenarioMetrics {
  duration: number;
  messageCount: number;
  stepCount: number;
  tokenUsage: TokenUsage;
  memoryUsage: MemoryUsage;
  actionCounts: Record<string, number>;
  responseLatency: LatencyMetrics;
  customMetrics?: Record<string, any>;
}

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
  cost?: number;
}

export interface MemoryUsage {
  peak: number;
  average: number;
  memoryOperations: number;
}

export interface LatencyMetrics {
  min: number;
  max: number;
  average: number;
  p95: number;
}

export interface VerificationResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  score?: number;
  confidence?: number;
  reason: string;
  evidence?: any;
  executionTime?: number;
}

export interface ScenarioMessage {
  id: string;
  timestamp: number;
  actorId: string;
  actorName: string;
  content: Content;
  roomId: string;
  messageType: 'incoming' | 'outgoing' | 'system';
  metadata?: Record<string, any>;
}

export interface ScenarioRunOptions {
  scenarios?: string[];
  filter?: string;
  benchmark?: boolean;
  verbose?: boolean;
  outputFormat?: 'json' | 'text' | 'html';
  outputFile?: string;
  parallel?: boolean;
  maxConcurrency?: number;
}

export interface ScenarioSuite {
  name: string;
  description?: string;
  scenarios: Scenario[];
  globalSetup?: ScenarioSetup;
  globalTeardown?: (() => Promise<void>);
}

export interface ScenarioContext {
  scenario: Scenario;
  actors: Map<string, ScenarioActor>;
  roomId: UUID;
  worldId: UUID;
  startTime: number;
  transcript: ScenarioMessage[];
  metrics: Partial<ScenarioMetrics>;
  state: Record<string, any>;
}

export interface BenchmarkReport {
  scenarioId: string;
  scenarioName: string;
  timestamp: number;
  metrics: ScenarioMetrics;
  performance: PerformanceScore;
  comparison?: BaselineComparison;
  artifacts?: string[];
}

export interface PerformanceScore {
  overall: number;
  speed: number;
  accuracy: number;
  efficiency: number;
  reliability: number;
}

export interface BaselineComparison {
  baselineVersion: string;
  improvement: number;
  regression: string[];
  improvements: string[];
}

export interface ScenarioError extends Error {
  scenarioId: string;
  actorId?: string;
  step?: string;
  context?: Record<string, any>;
}

export interface ScenarioProgressCallback {
  (progress: {
    scenarioId: string;
    phase: 'setup' | 'execution' | 'verification' | 'teardown';
    step: number;
    totalSteps: number;
    message?: string;
  }): void;
}

export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: number;
  metadata?: Record<string, any>;
}