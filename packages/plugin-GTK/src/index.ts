import type { Plugin } from '@elizaos/core';

// Import the actions
import { placeOrderAction } from './actions/placeOrder';
import { closeOrderAction } from './actions/closeOrder';
import { cancelOrderAction } from './actions/cancelOrder';
import { getInterestRateAction } from './actions/getInterestRate';
import { getTradesAction } from './actions/getTrades';
import { getTradeAction } from './actions/getTrade';
import { getTopMatchAction } from './actions/getTopMatch';
import { getPnlAction } from './actions/getPnl';

// Import the service
import { GTKService } from './service';

// Export all the modules
export * from './actions';
export * from './service';
export * from './constants';

/**
 * The GTK plugin definition
 */
export const gtkPlugin: Plugin = {
  name: 'gtk',
  description: 'GTK margin trading platform integration plugin',
  providers: [],
  evaluators: [],
  services: [GTKService],
  actions: [
    placeOrderAction, 
    closeOrderAction, 
    cancelOrderAction, 
    getInterestRateAction, 
    getTradesAction, 
    getTradeAction, 
    getTopMatchAction, 
    getPnlAction
  ],
};

export default gtkPlugin;
