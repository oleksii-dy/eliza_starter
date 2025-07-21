import { clankerPlugin } from './plugin';

// Export the plugin as default
export default clankerPlugin;

// Export the plugin by name
export { clankerPlugin };

// Export services for direct use if needed
export { ClankerService, WalletService } from './services';

// Export actions for direct use if needed
export {
  tokenDeployAction,
  tokenInfoAction,
  liquidityManagementAction,
  tokenSwapAction,
  balanceCheckAction,
} from './actions';

// Export providers
export { tokenContextProvider, marketDataProvider } from './providers';

// Export evaluators
export { tradeSuccessEvaluator } from './evaluators';

// Export types
export * from './types';

// Export utilities if needed
export * from './utils/errors';
export * from './utils/format';
export * from './utils/transactions';