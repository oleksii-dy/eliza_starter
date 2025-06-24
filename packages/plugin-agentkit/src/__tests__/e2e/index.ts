import agentkitTestSuite from './agentkit.test';
import { AgentKitUserScenariosTestSuite } from './user-scenarios.test';
import { CustodialWalletTestSuite } from './custodial-wallet.test';

export const testSuites = [
  agentkitTestSuite,
  AgentKitUserScenariosTestSuite,
  CustodialWalletTestSuite,
];

export default testSuites;
