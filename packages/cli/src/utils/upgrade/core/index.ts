// Core module exports for structured migration
export { StructuredMigrator } from './structured-migrator.js';
export { MigrationOrchestrator } from './migration-orchestrator.js';
export { ValidationEngine } from './validation-engine.js';
export { ErrorAnalyzer } from './error-analyzer.js';
export { ClaudeIntegration } from './claude-integration.js';
export { RepositoryManager } from './repository-manager.js';
export { EnvironmentManager } from './environment-manager.js';
export { FileOperations } from './file-operations.js';
export { TestManager } from './test-manager.js';
export { QuantumCheckpointManager } from './quantum-checkpoint-manager.js';
export { ConvergenceMonitor } from './convergence-monitor.js';
export { TimelineManager } from './timeline-manager.js';
export {
  AIImportResolver,
  AIStrategy,
  ValidationContext,
  type ImportIssue,
  type ResolvedImport,
  type ImportNode,
  type ImportGraph,
} from './ai-import-resolver.js';
export {
  ImportGraphAnalyzer,
  type DependencyAnalysis,
  type CircularDependency,
  type MissingImport,
  type PerformanceIssue,
  type BreakPoint,
  type Recommendation,
} from './import-graph-analyzer.js';

// Self-Validating Validation Suite (Task 006)
export {
  SelfValidatingValidator,
  AIMetaValidator,
  ValidationRuleGenerator,
  CoverageTracker,
  ValidationLearningSystem,
  ValidationPerformanceMonitor,
} from './self-validating-validator.js';
export type {
  ValidationIssue,
  ValidationTestCase,
  ValidationRule,
  ValidationResult,
  RuleValidation,
  ValidationTestResult,
  CoverageMetrics,
} from './self-validating-validator.js';

// Intelligent Caching with Validation (Task 008)
export {
  ValidatedCache,
  AITransformationValidator,
  CorruptionDetector,
  CachePredictor,
  CacheStorage,
  InvalidTransformationError,
  CacheCorruptionError,
  createValidatedCache,
} from './validated-cache.js';
export type {
  Transformation,
  TransformationType,
  TransformationMetadata,
  CacheEntry,
  CacheEntryMetadata,
  UsagePattern,
  CachePrediction,
  CorruptionAnalysis,
  CorruptionType,
  ValidatedCacheConfig,
} from './validated-cache.js';

// ElizaOS Pattern Integration (Task 008 Enhancement)
export { ElizaOSPatternIntegrator } from './elizaos-pattern-integrator.js';
export type {
  ElizaOSPattern,
  PatternCollection,
  PatternValidationResult,
} from './elizaos-pattern-integrator.js';

// AI Manual Override System (Task 009)
export { AIManualAssistant } from './ai-manual-assistant.js';
export type {
  AIManualAssistantConfig,
  OverrideContext,
  Suggestion,
  UserChoice,
  ValidationResult as ManualOverrideValidationResult,
  LearnedPattern,
  SuggestionStats,
  InterventionStats,
} from './ai-manual-assistant.js';

// Predictive Preview Mode (Task 010)
export { PredictivePreview } from './predictive-preview.js';
export type {
  PredictivePreviewConfig,
  MigrationPath,
  PredictedTransformation,
  PathResource,
  AIStrategy as PredictiveAIStrategy,
  PredictedOutcome,
  SimulationResult,
  SimulationIssue,
  EdgeCase,
  SimulationMetrics,
  Preview,
  PathProbability,
  ProbabilityFactor,
  TimelineVisualization,
  TimelineEvent,
  DecisionPoint,
  DecisionOption,
  TimelineBranch,
  PreviewMetadata,
} from './predictive-preview.js';

// Export utility functions individually (no class to export)
export * from './migration-utilities.js';

// Re-export types that might be needed by external modules
export type {
  MigrationResult,
  MigratorOptions,
  MigrationContext,
  MigrationStep,
  StepResult,
  FileAnalysis,
  VerificationResult,
  SDKMigrationOptions,
} from '../types.js';
