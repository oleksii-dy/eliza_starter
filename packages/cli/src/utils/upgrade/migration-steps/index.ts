/**
 * MIGRATION STEPS MAIN EXPORTS
 *
 * Responsibilities:
 * - Export all migration step handler classes
 * - Provide clean interface for migration orchestration
 * - Main entry point for step-based migration
 */

// Export main step executor
export { MigrationStepExecutor } from './step-executor.js';

// Export specialized step handlers
export { FileStructureSteps } from './file-structure.js';
export { ConfigurationSteps } from './configuration.js';
export { TestingSteps } from './testing.js';
export { DocumentationSteps } from './documentation.js';
export {
  AIImportResolutionStep,
  aiImportResolutionStep,
  runAIImportResolution,
} from './ai-import-resolution.js';
export {
  CheckpointMigrationStep,
  checkpointMigrationStep,
  runCheckpointMigration,
} from './checkpoint-migration.js';
export {
  AITestMigrationStep,
  runAITestMigration,
  validateAITestMigration,
} from './ai-test-migration.js';
export {
  SelfValidatingValidationStep,
  createSelfValidatingValidationStep,
  runSelfValidatingValidation,
  validateSelfValidatingValidation,
} from './self-validating-validation-step.js';
export {
  IntelligentCacheStep,
  createIntelligentCacheStep,
  runIntelligentCaching,
  intelligentCacheStep,
} from './intelligent-cache-step.js';
export {
  AIManualOverrideStep,
  createAIManualOverrideStep,
  runAIManualOverride,
  aiManualOverrideStep,
} from './ai-manual-override-step.js';
export {
  PredictivePreviewStep,
  createPredictivePreviewStep,
  runPredictivePreview,
  validatePredictivePreview,
  predictivePreviewStep,
} from './predictive-preview-step.js';

// Re-export for backward compatibility
export * from './step-executor.js';
export * from './file-structure.js';
export * from './configuration.js';
export * from './testing.js';
export * from './documentation.js';
export * from './ai-import-resolution.js';
export * from './checkpoint-migration.js';
export * from './ai-test-migration.js';
export * from './self-validating-validation-step.js';
export * from './intelligent-cache-step.js';
export * from './ai-manual-override-step.js';
export * from './predictive-preview-step.js';
