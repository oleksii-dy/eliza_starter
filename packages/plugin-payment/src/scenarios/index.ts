// Export all payment scenarios
import paymentBasicFlowScenario from './60-payment-basic-flow';
import paymentTrustExemptionsScenario from './61-payment-trust-exemptions';
import paymentConfirmationFlowScenario from './62-payment-confirmation-flow';
import paymentInsufficientFundsScenario from './63-payment-insufficient-funds';
import paymentMultiCurrencyScenario from './64-payment-multi-currency';
import paymentMultiAgentScenario from './65-payment-multi-agent';
import paymentRealIntegrationScenario, { paymentConfirmationScenario } from './66-payment-real-integration';
import crossmintIntegrationScenario from './67-payment-crossmint-integration';

// Export as array for plugin
export const scenarios = [
  paymentBasicFlowScenario,
  paymentTrustExemptionsScenario,
  paymentConfirmationFlowScenario,
  paymentInsufficientFundsScenario,
  paymentMultiCurrencyScenario,
  paymentMultiAgentScenario,
  paymentRealIntegrationScenario,
  paymentConfirmationScenario,
  crossmintIntegrationScenario,
];

export {
  paymentBasicFlowScenario,
  paymentTrustExemptionsScenario,
  paymentConfirmationFlowScenario,
  paymentInsufficientFundsScenario,
  paymentMultiCurrencyScenario,
  paymentMultiAgentScenario,
  paymentRealIntegrationScenario,
  paymentConfirmationScenario,
  crossmintIntegrationScenario,
};
