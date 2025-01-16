import { Plugin } from "@elizaos/core";
// import getLatestPriceUpdatesAction from "./actions/actionGetLatestPriceUpdates";
import getPriceFeedsAction from "./actions/actionGetPriceFeeds";
const actions = [
  // getLatestPriceUpdatesAction,
  getPriceFeedsAction,
];


const pythDataPlugin: Plugin = {
  name: "pyth-data",
  description: "Pyth Data Plugin for price feeds and market data",
  actions: actions,
  evaluators: []
};

// Export for both CommonJS and ESM
export { pythDataPlugin };
export default pythDataPlugin;
