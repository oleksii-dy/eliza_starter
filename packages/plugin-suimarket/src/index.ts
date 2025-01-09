import { Plugin } from '@elizaos/core';
import { getPrice } from './actions/getPrice';
import { birdEyeProvider } from './providers/birdEyeProvider';
import { suiWalletProvider } from "./providers/suiWalletProvider";
import { coingeckoProvider} from "./providers/coingeckoProvider";
import { bestTrader } from "./actions/bestTrader";
import { topLoser } from "./actions/topLoser";
import { topGainer} from "./actions/topGainer";
import { transferToken } from "./actions/transfer";

const suimarketPlugin: Plugin = {
  name: 'coingecko',
  description: "everything about marketdata from coingecko",
  actions: [getPrice, topLoser, topGainer, bestTrader, transferToken],
  evaluators: [],
  providers: [birdEyeProvider, coingeckoProvider, suiWalletProvider]
};

export default suimarketPlugin;
export {suimarketPlugin as suimarketPlugin };
