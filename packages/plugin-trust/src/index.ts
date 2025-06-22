import type { IAgentRuntime, Plugin, UUID } from '@elizaos/core';
import { Service, logger } from '@elizaos/core';
import { evaluateTrustAction } from './actions/evaluateTrust';
import { recordTrustInteractionAction } from './actions/recordTrustInteraction';
import { requestElevationAction } from './actions/requestElevation';
import { updateRoleAction } from './actions/roles';
import { updateSettingsAction } from './actions/settings';
import { TrustDatabase } from './database/TrustDatabase';
import { reflectionEvaluator } from './evaluators/reflection';
import { trustChangeEvaluator } from './evaluators/trustChangeEvaluator';
import { CoreTrustProvider } from './providers/CoreTrustProvider';
import { roleProvider } from './providers/roles';
import { securityStatusProvider } from './providers/securityStatus';
import { settingsProvider } from './providers/settings';
import { trustProfileProvider } from './providers/trustProfile';
import * as schema from './schema';
import { TrustService } from './services/TrustService';
import { tests as e2eTests } from './tests';
import type {
  TrustRequirements
} from './types/trust';

// Export types
export type {
  AccessDecision, AccessRequest, ElevationRequest,
  ElevationResult, Permission,
  PermissionContext, PermissionDecision
} from './types/permissions';
export * from './types/security';
export * from './types/trust';

// Export services
export { TrustService };

// Export middleware
  export {
    TrustMiddleware, getHighRiskActions, getTrustRequirement,
    requiresElevatedTrust, updateTrustRequirement
  } from './middleware';

// Export evaluators
export * from './evaluators/index';

// Export integrations for other plugins
export * from './integrations/index';

// Service wrapper for the database
export class TrustDatabaseServiceWrapper extends Service {
  static serviceName = 'trust-database';
  public capabilityDescription = 'Trust database management';
  private trustDatabase: TrustDatabase;

  constructor(runtime: IAgentRuntime) {
    super();
    this.trustDatabase = new TrustDatabase();
  }

  static async start(runtime: IAgentRuntime): Promise<TrustDatabaseServiceWrapper> {
    const service = new TrustDatabaseServiceWrapper(runtime);
    try {
      await service.trustDatabase.initialize(runtime);
    } catch (error) {
      // If initialization fails, log but don't throw - tables might already exist
      logger.warn('Trust database initialization warning:', error);
    }
    return service;
  }

  async stop(): Promise<void> {
    await this.trustDatabase.stop();
  }
}

// Service wrapper for trust engine
export class TrustServiceWrapper extends Service {
  static serviceName = 'trust';
  public capabilityDescription = 'Comprehensive trust and security management';
  private trustService: TrustService | null = null;

  static async start(runtime: IAgentRuntime): Promise<TrustServiceWrapper> {
    const wrapper = new TrustServiceWrapper();
    const service = await TrustService.start(runtime);
    wrapper.trustService = service as TrustService;
    return wrapper;
  }

  async stop(): Promise<void> {
    if (this.trustService) {
      await this.trustService.stop();
    }
  }

  // Delegate all public methods to the wrapped service
  getTrustScore(entityId: UUID, evaluatorId?: UUID) {
    if (!this.trustService) throw new Error('Trust service not initialized');
    return this.trustService.getTrustScore(entityId as UUID, evaluatorId as UUID);
  }

  updateTrust(entityId: UUID, type: any, impact: number, metadata?: Record<string, any>) {
    if (!this.trustService) throw new Error('Trust service not initialized');
    return this.trustService.updateTrust(entityId as UUID, type, impact, metadata);
  }

  checkPermission(entityId: UUID, action: string, resource: string, context?: any) {
    if (!this.trustService) throw new Error('Trust service not initialized');
    return this.trustService.checkPermission(entityId as UUID, action as UUID, resource as UUID, context);
  }

  detectThreats(content: string, entityId: UUID, context?: any) {
    if (!this.trustService) throw new Error('Trust service not initialized');
    return this.trustService.detectThreats(content as UUID, entityId as UUID, context);
  }

  assessThreatLevel(entityId: UUID, context?: any) {
    if (!this.trustService) throw new Error('Trust service not initialized');
    return this.trustService.assessThreatLevel(entityId as UUID, context);
  }

  getTrustHistory(entityId: UUID, days?: number) {
    if (!this.trustService) throw new Error('Trust service not initialized');
    return this.trustService.getTrustHistory(entityId as UUID, days);
  }

  evaluateTrustRequirements(entityId: UUID, requirements: TrustRequirements, context?: any) {
    if (!this.trustService) throw new Error('Trust service not initialized');
    return this.trustService.evaluateTrustRequirements(entityId as UUID, requirements, context);
  }

  recordMemory(message: any) {
    if (!this.trustService) throw new Error('Trust service not initialized');
    return this.trustService.recordMemory(message);
  }

  recordAction(entityId: UUID, action: string, result: 'success' | 'failure', metadata?: any) {
    if (!this.trustService) throw new Error('Trust service not initialized');
    return this.trustService.recordAction(entityId as UUID, action as UUID, result, metadata);
  }

  getTrustRecommendations(entityId: UUID) {
    if (!this.trustService) throw new Error('Trust service not initialized');
    return this.trustService.getTrustRecommendations(entityId as UUID);
  }

  meetsTrustThreshold(entityId: UUID, threshold: number) {
    if (!this.trustService) throw new Error('Trust service not initialized');
    return this.trustService.meetsTrustThreshold(entityId as UUID, threshold);
  }

  updateTrustSemantic(entityId: UUID, interaction: string, context?: any) {
    if (!this.trustService) throw new Error('Trust service not initialized');
    return this.trustService.updateTrustSemantic(entityId as UUID, interaction as UUID, context);
  }

  detectThreatsLLM(content: string, entityId: UUID, context?: any) {
    if (!this.trustService) throw new Error('Trust service not initialized');
    return this.trustService.detectThreatsLLM(content as UUID, entityId as UUID, context);
  }

  recordEvidence(entityId: UUID, description: string, context?: any) {
    if (!this.trustService) throw new Error('Trust service not initialized');
    return this.trustService.recordEvidence(entityId as UUID, description as UUID, context);
  }

  // Expose trustEngine for tests that need direct access
  get trustEngine() {
    if (!this.trustService) throw new Error('Trust service not initialized');
    return (this.trustService as any).trustEngine;
  }

  // Add calculateTrust method for tests
  async calculateTrust(entityId: UUID, context: any) {
    if (!this.trustService) throw new Error('Trust service not initialized');
    return this.trustEngine.calculateTrust(entityId, context);
  }
}

// Plugin definition
const trustPlugin: Plugin = {
  name: 'trust',
  description: 'Comprehensive trust and security system for AI agents',
  
  config: {
    defaultTrust: 50,
    trustDecayRate: 0.01,
    trustGrowthRate: 0.05,
    minimumInteractions: 5,
    threatDetectionThreshold: 0.7,
    elevationRequestTimeout: 3600000, // 1 hour
  },

  init: async (config: Record<string, string>, runtime: IAgentRuntime) => {
    logger.info('Initializing trust plugin...');
    
    // Initialize services
    await runtime.registerService(TrustDatabaseServiceWrapper);
    await runtime.registerService(TrustServiceWrapper);
    
    // Initialize core trust provider for @elizaos/core integration
    const trustService = runtime.getService('trust') as TrustServiceWrapper;
    if (trustService) {
      const provider = new CoreTrustProvider(runtime);
      await provider.initialize();
    }
    
    logger.info('Trust plugin initialized successfully');
  },

  services: [TrustDatabaseServiceWrapper, TrustServiceWrapper],

  actions: [
    updateRoleAction,
    updateSettingsAction,
    recordTrustInteractionAction,
    evaluateTrustAction,
    requestElevationAction,
  ],

  providers: [
    roleProvider,
    settingsProvider,
    trustProfileProvider,
    securityStatusProvider,
  ],

  evaluators: [
    reflectionEvaluator,
    trustChangeEvaluator,
  ],

  tests: [{
    name: 'trust-plugin-tests',
    tests: e2eTests
  }],

  schema,
};

export default trustPlugin;
