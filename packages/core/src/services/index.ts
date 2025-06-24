/**
 * Core Services Index
 *
 * Exports all core services for ElizaOS
 */

export { CrossPluginIntegrationService } from './CrossPluginIntegrationService';
export { UniversalWalletService } from './UniversalWalletService';

export type {
  OAuthVerificationWorkflowRequest,
  OAuthVerificationWorkflowResult,
  PaymentRiskAssessmentRequest,
  PaymentRiskAssessmentResult,
  CrossPlatformIdentityConsolidationRequest,
  CrossPlatformIdentityConsolidationResult,
} from './CrossPluginIntegrationService';
