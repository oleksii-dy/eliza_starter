import type { TestSuite } from '@elizaos/core';

// Export all E2E test suites for the robot plugin
import robotRuntimeTests from './robot-runtime';
import robotControlTests from './robot-control';
import visionRuntimeTests from './vision-runtime';
import visionBasicTests from './vision-basic';
import screenVisionTests from './screen-vision';
import visionAutonomyTests from './vision-autonomy';

// Combine all test suites
export const testSuites: TestSuite[] = [
  robotRuntimeTests,
  robotControlTests,
  visionRuntimeTests,
  visionBasicTests,
  screenVisionTests,
  visionAutonomyTests,
];

// Default export for ElizaOS test runner
export default testSuites;
