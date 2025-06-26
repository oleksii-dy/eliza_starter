import { type Plugin } from '@elizaos/core';
import { DummyTokenDataService } from './tokenData/service';
import { DummyLpService } from './lp/service';
import { DummyWalletService } from './wallet/service';
import { dummyServicesScenariosSuite } from './e2e/scenarios';
import { serviceInterfaceTestSuite } from './tests/service-interface.test';
import { serviceDiscoveryTestSuite } from './tests/service-discovery.test';
import { DummyMessageService } from './messaging/service';
import { DummyPostService } from './posting/service';
import { DummySwapService } from './swap/service';
import { DummyTokenCreationService } from './tokenCreation/service';

export const dummyServicesPlugin: Plugin = {
  name: 'dummy-services',
  description: 'Comprehensive dummy services and interface testing plugin for ElizaOS development.',
  services: [
    DummyTokenDataService,
    DummyLpService,
    DummyWalletService,
    DummyMessageService,
    DummyPostService,
    DummySwapService,
    DummyTokenCreationService,
  ],
  tests: [serviceInterfaceTestSuite, serviceDiscoveryTestSuite, dummyServicesScenariosSuite],
  init: async (_runtime) => {
    console.log('Dummy Services Plugin Initialized');
    console.log('This plugin provides:');
    console.log('  - Dummy implementations of standard ElizaOS service interfaces');
    console.log('  - Interface compliance testing for service implementations');
    console.log('  - Generic service discovery and testing by service type');
    console.log('  - End-to-end scenario testing for service interactions');
    console.log('  - Mock database adapter for isolated testing');
  },
};

export default dummyServicesPlugin;

// Export services for direct use
export {
  DummyTokenDataService,
  DummyLpService,
  DummyWalletService,
  DummyMessageService,
  DummyPostService,
  DummySwapService,
  DummyTokenCreationService,
};

// Export test suites
export { serviceInterfaceTestSuite, serviceDiscoveryTestSuite, dummyServicesScenariosSuite };

// Export mock database plugin
export { mockDatabasePlugin, MockDatabaseAdapter } from './database';
