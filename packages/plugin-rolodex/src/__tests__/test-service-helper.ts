import { RolodexService } from '../services/RolodexService';
import type { IAgentRuntime } from '../core-types';

/**
 * Helper to create service instances for testing
 * Works around the readonly property issue in Service base class
 */
export function createRolodexService(runtime: IAgentRuntime): RolodexService {
  const service = Object.create(RolodexService.prototype);
  service.runtime = runtime;
  service.databaseReady = true; // Skip initialization for tests
  return service;
}

// Legacy compatibility - map old service names to RolodexService
export const createEntityService = createRolodexService;
export const createRelationshipService = createRolodexService;
export const createFollowUpService = createRolodexService; 