/**
 * E2E Test Suite Exports
 *
 * This file exports all E2E test suites for the ElizaOS test runner.
 */

import projectTestSuite from './project.ts';
import starterTestSuite from './starter-plugin.ts';
import naturalLanguageTestSuite from './natural-language.ts';

// Export test suites for the test runner to discover
export const testSuites = [projectTestSuite, starterTestSuite, naturalLanguageTestSuite];

export default testSuites;
