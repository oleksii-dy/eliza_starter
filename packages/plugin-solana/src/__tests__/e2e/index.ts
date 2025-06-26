// Export all e2e test suites
export { lpManagerScenariosSuite } from '../../e2e/scenarios.js';
export { realTokenTestsSuite } from '../../e2e/real-token-tests.js';
export { walletBalanceTestSuite } from '../../e2e/wallet-balance-tests.js';

// Default export as array
import { lpManagerScenariosSuite } from '../../e2e/scenarios.js';
import { realTokenTestsSuite } from '../../e2e/real-token-tests.js';
import { walletBalanceTestSuite } from '../../e2e/wallet-balance-tests.js';

export const testSuites = [lpManagerScenariosSuite, realTokenTestsSuite, walletBalanceTestSuite];

export default testSuites;
