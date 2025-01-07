import { Plugin } from '@elizaos/core';
import { getPrice } from './actions/getPrice';
import { birdEyeProvider } from './providers/birdEyeProvider';
import { bestTrader } from "./actions/bestTrader";
import { topLoser } from "./actions/topLoser";
import { topGainer} from "./actions/topGainer";

const suimarketPlugin: Plugin = {
  name: 'coingecko',
  description: "everything about marketdata from coingecko",
  actions: [getPrice, topLoser, topGainer, bestTrader],
  evaluators: [],
  providers: [birdEyeProvider]
};

export default suimarketPlugin;
export {suimarketPlugin as suimarketPlugin };
