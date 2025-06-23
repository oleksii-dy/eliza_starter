// Export all payment scenarios
import paymentBasicFlowScenario from './60-payment-basic-flow';
import paymentTrustExemptionsScenario from './61-payment-trust-exemptions';
import paymentConfirmationFlowScenario from './62-payment-confirmation-flow';
import paymentInsufficientFundsScenario from './63-payment-insufficient-funds';
import paymentMultiCurrencyScenario from './64-payment-multi-currency';
import paymentMultiAgentScenario from './65-payment-multi-agent';
import paymentRealIntegrationScenario from './66-payment-real-integration';
import crossmintIntegrationScenario from './67-payment-crossmint-integration';
import paymentSendRealMoneyScenario from './70-payment-send-real-money';
import paymentReceiveTransactionScenario from './71-payment-receive-transaction';
import paymentRequestScenario from './72-payment-request';
import polymarketBetsScenario from './73-polymarket-bets';
import polymarketBetPlacementScenario from './74-polymarket-bet-placement';
import uniswapSwapScenario from './75-uniswap-swap';
import coinbaseAgentKitScenario from './76-coinbase-agentkit';
import crossmintNFTScenario from './77-crossmint-nft';
import defiYieldScenario from './78-defi-yield';
import multiChainBridgeScenario from './79-multi-chain-bridge';

// Export as array for plugin
export const scenarios = [
  paymentBasicFlowScenario,
  paymentTrustExemptionsScenario,
  paymentConfirmationFlowScenario,
  paymentInsufficientFundsScenario,
  paymentMultiCurrencyScenario,
  paymentMultiAgentScenario,
  paymentRealIntegrationScenario,
  crossmintIntegrationScenario,
  paymentSendRealMoneyScenario,
  paymentReceiveTransactionScenario,
  paymentRequestScenario,
  polymarketBetsScenario,
  polymarketBetPlacementScenario,
  uniswapSwapScenario,
  coinbaseAgentKitScenario,
  crossmintNFTScenario,
  defiYieldScenario,
  multiChainBridgeScenario,
];

export default scenarios;
